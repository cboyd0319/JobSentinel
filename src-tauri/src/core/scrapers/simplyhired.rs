//! SimplyHired Job Scraper
//!
//! Scrapes jobs from SimplyHired using their RSS feed.
//!
//! Note: SimplyHired has Cloudflare protection on their main site,
//! but RSS feeds may work. Falls back gracefully if blocked.

use super::error::ScraperError;
#[cfg(test)]
use super::http_client::send_with_retry_to_test_url;
use super::http_client::{read_text_with_limit, send_with_retry};
use super::rate_limiter::RateLimiter;
#[cfg(test)]
use super::rss::extract_xml_tag;
use super::rss::{parse_rss_items, RssItem};
use super::{location_utils, title_utils, url_utils, JobScraper, ScraperResult};
use crate::core::db::Job;

use async_trait::async_trait;
use chrono::Utc;
use sha2::{Digest, Sha256};

/// SimplyHired job scraper using RSS feeds
#[derive(Debug, Clone)]
pub struct SimplyHiredScraper {
    /// Search query (e.g., "care coordinator")
    pub query: String,
    /// Location filter (e.g., "remote" or "san francisco")
    pub location: Option<String>,
    /// Maximum results to return
    pub limit: usize,
    /// Rate limiter for respecting SimplyHired's request limits
    pub rate_limiter: RateLimiter,
}

impl SimplyHiredScraper {
    pub fn new(query: impl Into<String>, location: Option<String>, limit: usize) -> Self {
        Self {
            query: query.into(),
            location,
            limit,
            rate_limiter: RateLimiter::shared(),
        }
    }

    /// Fetch jobs from SimplyHired RSS feed
    async fn fetch_jobs(&self) -> ScraperResult {
        tracing::info!(
            query_chars = self.query.chars().count(),
            has_location = self.location.is_some(),
            limit = self.limit,
            "Fetching jobs from SimplyHired"
        );

        // Use rate limiter (conservative due to Cloudflare protection)
        self.rate_limiter.wait("simplyhired", 200).await;

        // Build RSS feed URL
        let query_encoded = urlencoding::encode(&self.query);
        let location_param = self
            .location
            .as_ref()
            .map(|l| format!("&l={}", urlencoding::encode(l)))
            .unwrap_or_default();

        let url = format!(
            "https://www.simplyhired.com/search?q={}{}&output=rss",
            query_encoded, location_param
        );

        self.fetch_jobs_from_url(url).await
    }

    async fn fetch_jobs_from_url(&self, url: String) -> ScraperResult {
        let response = send_with_retry(&url, |client| Self::build_request(client, &url))
            .await
            .map_err(|e| ScraperError::from_anyhow("simplyhired", e))?;

        self.parse_response(url, response).await
    }

    #[cfg(test)]
    async fn fetch_jobs_from_test_url(&self, url: String) -> ScraperResult {
        let response =
            send_with_retry_to_test_url(&url, |client| Self::build_request(client, &url))
                .await
                .map_err(|e| ScraperError::from_anyhow("simplyhired", e))?;

        self.parse_response(url, response).await
    }

    fn build_request(client: &reqwest::Client, url: &str) -> reqwest::RequestBuilder {
        client
            .get(url)
            .header(
                "User-Agent",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            )
            .header(
                "Accept",
                "application/rss+xml, application/xml, text/xml, */*",
            )
    }

    async fn parse_response(&self, url: String, response: reqwest::Response) -> ScraperResult {
        let status = response.status();
        if !status.is_success() {
            if status.as_u16() == 403 || status.as_u16() == 503 {
                tracing::warn!(
                    "SimplyHired returned {} - likely Cloudflare blocked",
                    status
                );
                return Err(ScraperError::BotProtection {
                    url,
                    protection_type: "Cloudflare".to_string(),
                });
            }
            return Err(ScraperError::http_status(
                status.as_u16(),
                &url,
                format!("SimplyHired RSS failed: {}", status),
            ));
        }

        let body = read_text_with_limit(response, &url).await?;

        if Self::is_bot_protection_page(&body) {
            tracing::warn!("SimplyHired: Cloudflare challenge detected, skipping");
            return Err(ScraperError::BotProtection {
                url,
                protection_type: "Cloudflare".to_string(),
            });
        }

        if !Self::looks_like_feed(&body) {
            return Err(ScraperError::ParseError {
                format: "RSS".to_string(),
                url,
                source: Box::new(std::io::Error::new(
                    std::io::ErrorKind::InvalidData,
                    "SimplyHired response was not RSS XML",
                )),
            });
        }

        // Parse RSS XML
        self.parse_rss(&body)
    }

    /// Parse RSS feed XML
    fn parse_rss(&self, xml: &str) -> Result<Vec<Job>, ScraperError> {
        let mut jobs = Vec::with_capacity(self.limit);
        if self.limit == 0 {
            return Ok(jobs);
        }

        let items =
            parse_rss_items(xml, usize::MAX).map_err(|source| ScraperError::ParseError {
                format: "RSS".to_string(),
                url: "simplyhired:rss".to_string(),
                source,
            })?;

        for item in items {
            if let Some(job) = self.parse_item(&item) {
                jobs.push(job);
                if jobs.len() >= self.limit {
                    break;
                }
            }
        }

        tracing::info!("Found {} jobs from SimplyHired", jobs.len());
        Ok(jobs)
    }

    /// Parse a single RSS item
    fn parse_item(&self, item: &RssItem) -> Option<Job> {
        // Extract title
        let title = match item.get("title") {
            Some(t) if !t.is_empty() => Self::decode_html_entities(t),
            _ => return None,
        };

        // Extract link
        let url = match item.get("link") {
            Some(u) if !u.is_empty() => u.to_string(),
            _ => return None,
        };

        // Extract description
        let description = item
            .get("description")
            .map(|d| Self::decode_html_entities(&Self::strip_html_tags(d)));

        // Extract company from title or description
        let company = self
            .extract_company(&title, description.as_deref())
            .unwrap_or_else(|| "Unknown".to_string());

        // Extract location
        let location = item
            .get("georss:point")
            .map(String::from)
            .or_else(|| Self::extract_location_from_description(description.as_deref()));

        let hash = Self::compute_hash(&company, &title, location.as_deref(), &url);
        let remote = self.is_remote_job(&self.query, location.as_deref());

        Some(Job {
            id: 0,
            hash,
            title,
            company,
            url,
            location,
            description,
            score: None,
            score_reasons: None,
            source: "simplyhired".to_string(),
            remote,
            salary_min: None,
            salary_max: None,
            currency: Some("USD".to_string()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            last_seen: Utc::now(),
            times_seen: 1,
            immediate_alert_sent: false,
            hidden: false,
            bookmarked: false,
            notes: None,
            included_in_digest: false,
            ghost_score: None,
            ghost_reasons: None,
            first_seen: None,
            repost_count: 0,
        })
    }

    /// Extract XML tag content
    #[cfg(test)]
    fn extract_tag(content: &str, tag: &str) -> Option<String> {
        extract_xml_tag(content, tag)
    }

    fn is_bot_protection_page(body: &str) -> bool {
        let body_lower = body.to_ascii_lowercase();
        [
            "cf-browser-verification",
            "checking your browser",
            "verify you are human",
            "access to this page has been denied",
            "enable javascript and cookies to continue",
            "automation tools",
            "unusual traffic",
            "captcha",
        ]
        .iter()
        .any(|marker| body_lower.contains(marker))
    }

    fn looks_like_feed(body: &str) -> bool {
        let body_lower = body.to_ascii_lowercase();
        body_lower.contains("<rss")
            || body_lower.contains("<feed")
            || body_lower.contains("<rdf:rdf")
    }

    /// Decode HTML entities
    fn decode_html_entities(s: &str) -> String {
        s.replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&quot;", "\"")
            .replace("&#39;", "'")
            .replace("&nbsp;", " ")
    }

    /// Strip HTML tags from content
    fn strip_html_tags(html: &str) -> String {
        let mut result = String::new();
        let mut in_tag = false;

        for c in html.chars() {
            match c {
                '<' => in_tag = true,
                '>' => in_tag = false,
                _ if !in_tag => result.push(c),
                _ => {}
            }
        }

        result
    }

    /// Extract company name from title (often formatted as "Title - Company")
    fn extract_company(&self, title: &str, description: Option<&str>) -> Option<String> {
        // Try common patterns: "Title - Company" or "Title at Company"
        if let Some(pos) = title.rfind(" - ") {
            let company = title[pos + 3..].trim();
            if !company.is_empty() {
                return Some(company.to_string());
            }
        }

        if let Some(pos) = title.to_lowercase().find(" at ") {
            let company = title[pos + 4..].trim();
            if !company.is_empty() {
                return Some(company.to_string());
            }
        }

        // Try to extract from description
        if let Some(desc) = description {
            if let Some(pos) = desc.find("Company:") {
                let rest = &desc[pos + 8..];
                let end = rest
                    .find(|c: char| c == '\n' || c == '<')
                    .unwrap_or(rest.len());
                let company = rest[..end].trim();
                if !company.is_empty() {
                    return Some(company.to_string());
                }
            }
        }

        None
    }

    /// Extract location from description text
    fn extract_location_from_description(description: Option<&str>) -> Option<String> {
        let desc = description?;

        // Common patterns: "Location: City, State" or "in City, State"
        if let Some(pos) = desc.find("Location:") {
            let rest = &desc[pos + 9..];
            let end = rest
                .find(|c: char| c == '\n' || c == '<' || c == '|')
                .unwrap_or_else(|| rest.len().min(50));
            let location = rest[..end].trim();
            if !location.is_empty() {
                return Some(location.to_string());
            }
        }

        None
    }

    /// Check if job appears to be remote
    fn is_remote_job(&self, query: &str, location: Option<&str>) -> Option<bool> {
        let query_lower = query.to_lowercase();
        if query_lower.contains("remote") {
            return Some(true);
        }

        if let Some(loc) = location {
            let loc_lower = loc.to_lowercase();
            if loc_lower.contains("remote") || loc_lower.contains("anywhere") {
                return Some(true);
            }
        }

        None
    }

    /// Compute SHA-256 hash for deduplication
    fn compute_hash(company: &str, title: &str, location: Option<&str>, url: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(company.to_lowercase().as_bytes());
        hasher.update(title_utils::normalize_title(title).as_bytes());
        if let Some(loc) = location {
            hasher.update(location_utils::normalize_location(loc).as_bytes());
        }
        hasher.update(url_utils::normalize_url(url).as_bytes());
        hex::encode(hasher.finalize())
    }
}

#[async_trait]
impl JobScraper for SimplyHiredScraper {
    async fn scrape(&self) -> ScraperResult {
        self.fetch_jobs().await
    }

    fn name(&self) -> &'static str {
        "simplyhired"
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use wiremock::matchers::{method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    #[test]
    fn test_scraper_name() {
        let scraper = SimplyHiredScraper::new("care coordinator".to_string(), None, 10);
        assert_eq!(scraper.name(), "simplyhired");
    }

    #[test]
    fn test_decode_html_entities() {
        assert_eq!(
            SimplyHiredScraper::decode_html_entities("Care &amp; Support"),
            "Care & Support"
        );
        assert_eq!(
            SimplyHiredScraper::decode_html_entities("Test &lt;tag&gt;"),
            "Test <tag>"
        );
    }

    #[test]
    fn test_strip_html_tags() {
        assert_eq!(
            SimplyHiredScraper::strip_html_tags("<p>Hello <b>World</b></p>"),
            "Hello World"
        );
        assert_eq!(
            SimplyHiredScraper::strip_html_tags("No tags here"),
            "No tags here"
        );
    }

    #[test]
    fn test_extract_company_from_title() {
        let scraper = SimplyHiredScraper::new("test".to_string(), None, 10);

        let company = scraper.extract_company("Care Coordinator - Acme Health", None);
        assert_eq!(company, Some("Acme Health".to_string()));

        let company = scraper.extract_company("Inventory Manager at FreshMart", None);
        assert_eq!(company, Some("FreshMart".to_string()));
    }

    #[test]
    fn test_is_remote_job() {
        let scraper = SimplyHiredScraper::new("remote care coordinator".to_string(), None, 10);
        assert_eq!(
            scraper.is_remote_job("remote care coordinator", None),
            Some(true)
        );

        let scraper = SimplyHiredScraper::new("care coordinator".to_string(), None, 10);
        assert_eq!(
            scraper.is_remote_job("care coordinator", Some("Remote")),
            Some(true)
        );
        assert_eq!(
            scraper.is_remote_job("care coordinator", Some("San Francisco")),
            None
        );
    }

    #[test]
    fn test_compute_hash_deterministic() {
        let hash1 = SimplyHiredScraper::compute_hash(
            "Company",
            "Care Coordinator",
            Some("NYC"),
            "https://simplyhired.com/job/123",
        );
        let hash2 = SimplyHiredScraper::compute_hash(
            "Company",
            "Care Coordinator",
            Some("NYC"),
            "https://simplyhired.com/job/123",
        );
        assert_eq!(hash1, hash2);
        assert_eq!(hash1.len(), 64);
    }

    #[test]
    fn test_extract_tag() {
        let xml = "<title>Care Coordinator</title><link>https://example.com</link>";
        assert_eq!(
            SimplyHiredScraper::extract_tag(xml, "title"),
            Some("Care Coordinator".to_string())
        );
        assert_eq!(
            SimplyHiredScraper::extract_tag(xml, "link"),
            Some("https://example.com".to_string())
        );
        assert_eq!(SimplyHiredScraper::extract_tag(xml, "missing"), None);
    }

    #[test]
    fn test_parse_rss_accepts_item_attributes_and_namespaced_location() {
        let scraper = SimplyHiredScraper::new("care coordinator", None, 10);
        let rss = r#"
            <rss>
              <channel>
                <item rdf:about="https://www.simplyhired.com/job/789">
                  <title>Care Coordinator - Acme Health</title>
                  <link>https://www.simplyhired.com/job/789</link>
                  <description>&lt;p&gt;Company: Acme Health&lt;/p&gt;</description>
                  <georss:point>39.7392 -104.9903</georss:point>
                </item>
              </channel>
            </rss>
        "#;

        let jobs = scraper
            .parse_rss(rss)
            .expect("rss should parse item attributes and namespaced fields");

        assert_eq!(jobs.len(), 1);
        assert_eq!(jobs[0].title, "Care Coordinator - Acme Health");
        assert_eq!(jobs[0].company, "Acme Health");
        assert_eq!(jobs[0].location, Some("39.7392 -104.9903".to_string()));
    }

    #[tokio::test]
    async fn fetch_jobs_reports_cloudflare_status_as_bot_protection() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/rss"))
            .respond_with(ResponseTemplate::new(403).set_body_string("forbidden"))
            .mount(&server)
            .await;

        let scraper = SimplyHiredScraper::new("care coordinator", None, 10);
        let error = scraper
            .fetch_jobs_from_test_url(format!("{}/rss", server.uri()))
            .await
            .expect_err("blocked status should be source-health error");

        assert!(matches!(error, ScraperError::BotProtection { .. }));
    }

    #[tokio::test]
    async fn fetch_jobs_reports_cloudflare_challenge_as_bot_protection() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/rss"))
            .respond_with(
                ResponseTemplate::new(200).set_body_string("<html>Checking your browser</html>"),
            )
            .mount(&server)
            .await;

        let scraper = SimplyHiredScraper::new("care coordinator", None, 10);
        let error = scraper
            .fetch_jobs_from_test_url(format!("{}/rss", server.uri()))
            .await
            .expect_err("challenge page should be source-health error");

        assert!(matches!(error, ScraperError::BotProtection { .. }));
    }

    #[tokio::test]
    async fn fetch_jobs_reports_access_denied_html_as_bot_protection() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/rss"))
            .respond_with(ResponseTemplate::new(200).set_body_string(
                "<html><body>Access to this page has been denied because we believe you are using automation tools.</body></html>",
            ))
            .mount(&server)
            .await;

        let scraper = SimplyHiredScraper::new("care coordinator", None, 10);
        let error = scraper
            .fetch_jobs_from_test_url(format!("{}/rss", server.uri()))
            .await
            .expect_err("access denied page should be source-health error");

        assert!(matches!(error, ScraperError::BotProtection { .. }));
    }
}
