//! WeWorkRemotely Job Scraper
//!
//! Scrapes remote jobs from WeWorkRemotely's RSS feed.
//! WeWorkRemotely is a popular remote-only job board.

use super::http_client::get_client;
use super::{JobScraper, ScraperResult};
use crate::core::db::Job;
use anyhow::Result;
use async_trait::async_trait;
use chrono::Utc;
use sha2::{Digest, Sha256};

/// WeWorkRemotely job scraper
pub struct WeWorkRemotelyScraper {
    /// Category to search (e.g., "programming", "design", "devops")
    pub category: Option<String>,
    /// Maximum results to return
    pub limit: usize,
}

impl WeWorkRemotelyScraper {
    pub fn new(category: Option<String>, limit: usize) -> Self {
        Self { category, limit }
    }

    /// Build the RSS feed URL
    fn build_url(&self) -> String {
        match &self.category {
            Some(cat) => format!("https://weworkremotely.com/categories/{}.rss", cat),
            None => "https://weworkremotely.com/remote-jobs.rss".to_string(),
        }
    }

    /// Fetch jobs from WeWorkRemotely RSS feed
    async fn fetch_jobs(&self) -> ScraperResult {
        tracing::info!("Fetching jobs from WeWorkRemotely");

        let client = get_client();
        let url = self.build_url();

        let response = client
            .get(&url)
            .header("User-Agent", "JobSentinel/1.0")
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!(
                "WeWorkRemotely request failed: {}",
                response.status()
            ));
        }

        let xml = response.text().await?;
        let jobs = self.parse_rss(&xml)?;

        tracing::info!("Found {} jobs from WeWorkRemotely", jobs.len());
        Ok(jobs)
    }

    /// Parse RSS XML to extract job listings
    fn parse_rss(&self, xml: &str) -> Result<Vec<Job>> {
        let mut jobs = Vec::new();

        // Simple XML parsing for RSS items
        // Format: <item><title>...</title><link>...</link><description>...</description></item>
        for item in xml.split("<item>").skip(1).take(self.limit) {
            let title = Self::extract_tag(item, "title")
                .map(|t| Self::decode_html_entities(&t))
                .unwrap_or_default();

            let url = Self::extract_tag(item, "link").unwrap_or_default();

            // WeWorkRemotely titles often include company: "Company: Job Title"
            let (company, job_title) = if let Some(pos) = title.find(':') {
                let (c, t) = title.split_at(pos);
                (c.trim().to_string(), t[1..].trim().to_string())
            } else {
                ("Unknown Company".to_string(), title.clone())
            };

            if job_title.is_empty() || url.is_empty() {
                continue;
            }

            // Extract description and clean HTML
            let description = Self::extract_tag(item, "description")
                .map(|d| Self::decode_html_entities(&d))
                .map(|d| Self::strip_html_tags(&d));

            // Try to extract location from description
            let location = description
                .as_ref()
                .and_then(|d| Self::extract_location(d));

            let hash = Self::compute_hash(&company, &job_title, location.as_deref(), &url);

            jobs.push(Job {
                id: 0,
                hash,
                title: job_title,
                company,
                url,
                location,
                description,
                score: None,
                score_reasons: None,
                source: "weworkremotely".to_string(),
                remote: Some(true), // All WeWorkRemotely jobs are remote
                salary_min: None,
                salary_max: None,
                currency: None,
                created_at: Utc::now(),
                updated_at: Utc::now(),
                last_seen: Utc::now(),
                times_seen: 1,
                immediate_alert_sent: false,
                hidden: false,
                bookmarked: false,
                notes: None,
                included_in_digest: false,
            });
        }

        Ok(jobs)
    }

    /// Extract content between XML tags
    fn extract_tag(xml: &str, tag: &str) -> Option<String> {
        let start_tag = format!("<{}>", tag);
        let end_tag = format!("</{}>", tag);

        // Also handle CDATA sections
        let cdata_start = format!("<{}><![CDATA[", tag);
        let cdata_end = format!("]]></{}>", tag);

        if let (Some(start), Some(end)) = (xml.find(&cdata_start), xml.find(&cdata_end)) {
            let content_start = start + cdata_start.len();
            if content_start < end {
                return Some(xml[content_start..end].to_string());
            }
        }

        if let (Some(start), Some(end)) = (xml.find(&start_tag), xml.find(&end_tag)) {
            let content_start = start + start_tag.len();
            if content_start < end {
                return Some(xml[content_start..end].to_string());
            }
        }

        None
    }

    /// Decode HTML entities
    fn decode_html_entities(text: &str) -> String {
        text.replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&quot;", "\"")
            .replace("&#39;", "'")
            .replace("&nbsp;", " ")
    }

    /// Strip HTML tags from text
    fn strip_html_tags(html: &str) -> String {
        let mut result = String::new();
        let mut in_tag = false;

        for ch in html.chars() {
            match ch {
                '<' => in_tag = true,
                '>' => in_tag = false,
                _ if !in_tag => result.push(ch),
                _ => {}
            }
        }

        // Clean up whitespace
        result
            .split_whitespace()
            .collect::<Vec<_>>()
            .join(" ")
    }

    /// Try to extract location from description
    fn extract_location(description: &str) -> Option<String> {
        let desc_lower = description.to_lowercase();

        // Common location patterns in WWR descriptions
        if desc_lower.contains("worldwide") || desc_lower.contains("anywhere") {
            return Some("Worldwide".to_string());
        }
        if desc_lower.contains("usa only") || desc_lower.contains("us only") {
            return Some("USA".to_string());
        }
        if desc_lower.contains("europe") || desc_lower.contains("eu only") {
            return Some("Europe".to_string());
        }
        if desc_lower.contains("north america") {
            return Some("North America".to_string());
        }

        None
    }

    /// Compute SHA-256 hash for deduplication
    fn compute_hash(company: &str, title: &str, location: Option<&str>, url: &str) -> String {
        let mut hasher = Sha256::new();
        hasher.update(company.as_bytes());
        hasher.update(title.as_bytes());
        if let Some(loc) = location {
            hasher.update(loc.as_bytes());
        }
        hasher.update(url.as_bytes());
        hex::encode(hasher.finalize())
    }
}

#[async_trait]
impl JobScraper for WeWorkRemotelyScraper {
    async fn scrape(&self) -> ScraperResult {
        self.fetch_jobs().await
    }

    fn name(&self) -> &'static str {
        "weworkremotely"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_url_default() {
        let scraper = WeWorkRemotelyScraper::new(None, 10);
        assert_eq!(
            scraper.build_url(),
            "https://weworkremotely.com/remote-jobs.rss"
        );
    }

    #[test]
    fn test_build_url_with_category() {
        let scraper = WeWorkRemotelyScraper::new(Some("programming".to_string()), 10);
        assert_eq!(
            scraper.build_url(),
            "https://weworkremotely.com/categories/programming.rss"
        );
    }

    #[test]
    fn test_scraper_name() {
        let scraper = WeWorkRemotelyScraper::new(None, 10);
        assert_eq!(scraper.name(), "weworkremotely");
    }

    #[test]
    fn test_compute_hash_deterministic() {
        let hash1 = WeWorkRemotelyScraper::compute_hash(
            "Company",
            "Remote Engineer",
            Some("Worldwide"),
            "https://weworkremotely.com/job/123",
        );
        let hash2 = WeWorkRemotelyScraper::compute_hash(
            "Company",
            "Remote Engineer",
            Some("Worldwide"),
            "https://weworkremotely.com/job/123",
        );

        assert_eq!(hash1, hash2);
        assert_eq!(hash1.len(), 64);
    }

    #[test]
    fn test_extract_tag() {
        let xml = "<item><title>Test Title</title><link>http://test.com</link></item>";
        assert_eq!(
            WeWorkRemotelyScraper::extract_tag(xml, "title"),
            Some("Test Title".to_string())
        );
        assert_eq!(
            WeWorkRemotelyScraper::extract_tag(xml, "link"),
            Some("http://test.com".to_string())
        );
    }

    #[test]
    fn test_extract_tag_cdata() {
        let xml = "<item><title><![CDATA[Test Title]]></title></item>";
        assert_eq!(
            WeWorkRemotelyScraper::extract_tag(xml, "title"),
            Some("Test Title".to_string())
        );
    }

    #[test]
    fn test_decode_html_entities() {
        assert_eq!(
            WeWorkRemotelyScraper::decode_html_entities("Test &amp; Title"),
            "Test & Title"
        );
        assert_eq!(
            WeWorkRemotelyScraper::decode_html_entities("&lt;html&gt;"),
            "<html>"
        );
    }

    #[test]
    fn test_strip_html_tags() {
        assert_eq!(
            WeWorkRemotelyScraper::strip_html_tags("<p>Hello <b>World</b></p>"),
            "Hello World"
        );
    }

    #[test]
    fn test_extract_location() {
        assert_eq!(
            WeWorkRemotelyScraper::extract_location("Work from anywhere worldwide"),
            Some("Worldwide".to_string())
        );
        assert_eq!(
            WeWorkRemotelyScraper::extract_location("USA only position"),
            Some("USA".to_string())
        );
        assert_eq!(
            WeWorkRemotelyScraper::extract_location("No location info"),
            None
        );
    }
}
