//! SimplyHired Job Scraper
//!
//! Scrapes jobs from SimplyHired using their RSS feed.
//!
//! Note: SimplyHired has Cloudflare protection on their main site,
//! but RSS feeds may work. Falls back gracefully if blocked.

use super::http_client::get_client;
use super::{location_utils, title_utils, url_utils, JobScraper, ScraperResult};
use crate::core::db::Job;
use anyhow::Result;
use async_trait::async_trait;
use chrono::Utc;
use sha2::{Digest, Sha256};

/// SimplyHired job scraper using RSS feeds
#[derive(Debug, Clone)]
pub struct SimplyHiredScraper {
    /// Search query (e.g., "rust developer")
    pub query: String,
    /// Location filter (e.g., "remote" or "san francisco")
    pub location: Option<String>,
    /// Maximum results to return
    pub limit: usize,
}

impl SimplyHiredScraper {
    pub fn new(query: impl Into<String>, location: Option<String>, limit: usize) -> Self {
        Self {
            query: query.into(),
            location,
            limit,
        }
    }

    /// Fetch jobs from SimplyHired RSS feed
    async fn fetch_jobs(&self) -> ScraperResult {
        tracing::info!("Fetching jobs from SimplyHired for: {}", self.query);

        let client = get_client();

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

        let response = client
            .get(&url)
            .header(
                "User-Agent",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            )
            .header(
                "Accept",
                "application/rss+xml, application/xml, text/xml, */*",
            )
            .send()
            .await?;

        let status = response.status();
        if !status.is_success() {
            if status.as_u16() == 403 || status.as_u16() == 503 {
                tracing::warn!(
                    "SimplyHired returned {} - likely Cloudflare blocked",
                    status
                );
                return Ok(vec![]); // Return empty instead of error
            }
            return Err(anyhow::anyhow!("SimplyHired RSS failed: {}", status));
        }

        let body = response.text().await?;

        // Check for Cloudflare challenge page
        if body.contains("cf-browser-verification") || body.contains("Checking your browser") {
            tracing::warn!("SimplyHired: Cloudflare challenge detected, skipping");
            return Ok(vec![]);
        }

        // Parse RSS XML
        self.parse_rss(&body)
    }

    /// Parse RSS feed XML
    fn parse_rss(&self, xml: &str) -> Result<Vec<Job>> {
        let mut jobs = Vec::with_capacity(self.limit);

        // Simple XML parsing for RSS items
        // Using string manipulation since we don't need a full XML parser
        for item in xml.split("<item>").skip(1) {
            if let Some(job) = self.parse_item(item)? {
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
    fn parse_item(&self, item: &str) -> Result<Option<Job>> {
        // Extract title
        let title = match Self::extract_tag(item, "title") {
            Some(t) if !t.is_empty() => Self::decode_html_entities(&t),
            _ => return Ok(None),
        };

        // Extract link
        let url = match Self::extract_tag(item, "link") {
            Some(u) if !u.is_empty() => u,
            _ => return Ok(None),
        };

        // Extract description
        let description = Self::extract_tag(item, "description")
            .map(|d| Self::decode_html_entities(&Self::strip_html_tags(&d)));

        // Extract company from title or description
        let company = self
            .extract_company(&title, description.as_deref())
            .unwrap_or_else(|| "Unknown".to_string());

        // Extract location
        let location = Self::extract_tag(item, "georss:point")
            .or_else(|| Self::extract_location_from_description(description.as_deref()));

        let hash = Self::compute_hash(&company, &title, location.as_deref(), &url);
        let remote = self.is_remote_job(&self.query, location.as_deref());

        Ok(Some(Job {
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
        }))
    }

    /// Extract XML tag content
    fn extract_tag(content: &str, tag: &str) -> Option<String> {
        let start_tag = format!("<{}>", tag);
        let end_tag = format!("</{}>", tag);

        let start = content.find(&start_tag)? + start_tag.len();
        let end = content[start..].find(&end_tag)?;

        Some(content[start..start + end].trim().to_string())
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

    #[test]
    fn test_scraper_name() {
        let scraper = SimplyHiredScraper::new("rust".to_string(), None, 10);
        assert_eq!(scraper.name(), "simplyhired");
    }

    #[test]
    fn test_decode_html_entities() {
        assert_eq!(
            SimplyHiredScraper::decode_html_entities("Software &amp; Engineering"),
            "Software & Engineering"
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

        let company = scraper.extract_company("Software Engineer - Acme Corp", None);
        assert_eq!(company, Some("Acme Corp".to_string()));

        let company = scraper.extract_company("Developer at TechStartup", None);
        assert_eq!(company, Some("TechStartup".to_string()));
    }

    #[test]
    fn test_is_remote_job() {
        let scraper = SimplyHiredScraper::new("remote rust developer".to_string(), None, 10);
        assert_eq!(
            scraper.is_remote_job("remote rust developer", None),
            Some(true)
        );

        let scraper = SimplyHiredScraper::new("rust developer".to_string(), None, 10);
        assert_eq!(
            scraper.is_remote_job("rust developer", Some("Remote")),
            Some(true)
        );
        assert_eq!(
            scraper.is_remote_job("rust developer", Some("San Francisco")),
            None
        );
    }

    #[test]
    fn test_compute_hash_deterministic() {
        let hash1 = SimplyHiredScraper::compute_hash(
            "Company",
            "Engineer",
            Some("NYC"),
            "https://simplyhired.com/job/123",
        );
        let hash2 = SimplyHiredScraper::compute_hash(
            "Company",
            "Engineer",
            Some("NYC"),
            "https://simplyhired.com/job/123",
        );
        assert_eq!(hash1, hash2);
        assert_eq!(hash1.len(), 64);
    }

    #[test]
    fn test_extract_tag() {
        let xml = "<title>Software Engineer</title><link>https://example.com</link>";
        assert_eq!(
            SimplyHiredScraper::extract_tag(xml, "title"),
            Some("Software Engineer".to_string())
        );
        assert_eq!(
            SimplyHiredScraper::extract_tag(xml, "link"),
            Some("https://example.com".to_string())
        );
        assert_eq!(SimplyHiredScraper::extract_tag(xml, "missing"), None);
    }
}
