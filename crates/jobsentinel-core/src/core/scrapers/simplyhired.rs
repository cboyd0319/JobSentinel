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
use super::{JobScraper, ScraperResult};
use crate::core::calculate_job_hash;
use crate::core::Job;

use async_trait::async_trait;
use chrono::Utc;

/// SimplyHired job scraper using RSS feeds
#[derive(Debug, Clone)]
pub(crate) struct SimplyHiredScraper {
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
    pub(crate) fn new(query: impl Into<String>, location: Option<String>, limit: usize) -> Self {
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
        calculate_job_hash(company, title, location, url)
    }
}

#[async_trait]
impl JobScraper for SimplyHiredScraper {
    async fn scrape(&self) -> ScraperResult {
        self.fetch_jobs().await
    }

    #[cfg(test)]
    fn name(&self) -> &'static str {
        "simplyhired"
    }
}

#[cfg(test)]
mod tests;
