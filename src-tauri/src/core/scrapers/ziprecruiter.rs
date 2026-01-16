//! ZipRecruiter Job Scraper
//!
//! Scrapes jobs from ZipRecruiter using their RSS feed.
//! ZipRecruiter is a major job aggregator with millions of listings.

use super::http_client::get_client;
use super::{JobScraper, ScraperResult};
use crate::core::db::Job;
use anyhow::Result;
use async_trait::async_trait;
use chrono::Utc;
use sha2::{Digest, Sha256};

/// ZipRecruiter job scraper using RSS feed
pub struct ZipRecruiterScraper {
    /// Search query
    pub query: String,
    /// Location (city, state, or zip)
    pub location: Option<String>,
    /// Search radius in miles
    pub radius: Option<u32>,
    /// Maximum results to return
    pub limit: usize,
}

impl ZipRecruiterScraper {
    pub fn new(query: String, location: Option<String>, radius: Option<u32>, limit: usize) -> Self {
        Self {
            query,
            location,
            radius,
            limit,
        }
    }

    /// Build the RSS feed URL
    fn build_url(&self) -> String {
        let mut url = format!(
            "https://www.ziprecruiter.com/jobs-rss?search={}",
            urlencoding::encode(&self.query)
        );

        if let Some(loc) = &self.location {
            url.push_str(&format!("&location={}", urlencoding::encode(loc)));
        }

        if let Some(r) = self.radius {
            url.push_str(&format!("&radius={}", r));
        }

        url
    }

    /// Fetch jobs from ZipRecruiter RSS feed
    async fn fetch_jobs(&self) -> ScraperResult {
        tracing::info!("Fetching jobs from ZipRecruiter for query: {}", self.query);

        let client = get_client();
        let url = self.build_url();

        let response = client
            .get(&url)
            .header("User-Agent", "JobSentinel/1.0")
            .header("Accept", "application/rss+xml, application/xml, text/xml")
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!(
                "ZipRecruiter request failed: {}",
                response.status()
            ));
        }

        let xml = response.text().await?;
        let jobs = self.parse_rss(&xml)?;

        tracing::info!("Found {} jobs from ZipRecruiter", jobs.len());
        Ok(jobs)
    }

    /// Parse RSS XML to extract job listings
    fn parse_rss(&self, xml: &str) -> Result<Vec<Job>> {
        let mut jobs = Vec::new();

        // Parse RSS items
        for item in xml.split("<item>").skip(1).take(self.limit) {
            let title = Self::extract_tag(item, "title")
                .map(|t| Self::decode_html_entities(&t))
                .unwrap_or_default();

            let url = Self::extract_tag(item, "link").unwrap_or_default();

            // ZipRecruiter includes company in a specific tag or in description
            let company = Self::extract_tag(item, "source")
                .or_else(|| Self::extract_company_from_description(item))
                .unwrap_or_else(|| "Unknown Company".to_string());

            if title.is_empty() || url.is_empty() {
                continue;
            }

            // Extract description
            let description = Self::extract_tag(item, "description")
                .map(|d| Self::decode_html_entities(&d))
                .map(|d| Self::strip_html_tags(&d));

            // Try to extract location from description
            let location = Self::extract_location_from_description(description.as_deref());

            // Check if remote
            let is_remote = Self::is_remote(&title, location.as_deref(), description.as_deref());

            // Try to extract salary from description
            let (salary_min, salary_max) =
                Self::extract_salary(description.as_deref().unwrap_or(""));

            let hash = Self::compute_hash(&company, &title, location.as_deref(), &url);

            jobs.push(Job {
                id: 0,
                hash,
                title,
                company,
                url,
                location,
                description,
                score: None,
                score_reasons: None,
                source: "ziprecruiter".to_string(),
                remote: Some(is_remote),
                salary_min,
                salary_max,
                currency: salary_min.map(|_| "USD".to_string()),
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

        // Handle CDATA sections
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

    /// Extract company name from description
    fn extract_company_from_description(xml: &str) -> Option<String> {
        let desc = Self::extract_tag(xml, "description")?;
        let decoded = Self::decode_html_entities(&desc);

        // Common patterns: "Company: XYZ", "at XYZ", "XYZ is hiring"
        if let Some(pos) = decoded.find("Company:") {
            let rest = &decoded[pos + 8..];
            let end = rest.find(['\n', '<', '|']).unwrap_or(rest.len());
            let company = rest[..end].trim();
            if !company.is_empty() && company.len() < 100 {
                return Some(company.to_string());
            }
        }

        None
    }

    /// Extract location from description
    fn extract_location_from_description(description: Option<&str>) -> Option<String> {
        let desc = description?;
        let lower = desc.to_lowercase();

        // Check for explicit location patterns
        let patterns = [
            ("location:", 9),
            ("located in", 10),
            ("based in", 8),
        ];

        for (pattern, offset) in patterns {
            if let Some(pos) = lower.find(pattern) {
                let rest = &desc[pos + offset..];
                let end = rest
                    .find(['\n', '.', '|', '<'])
                    .unwrap_or_else(|| rest.len().min(50));
                let location = rest[..end].trim();
                if !location.is_empty() && location.len() < 100 {
                    return Some(location.to_string());
                }
            }
        }

        // Check for common city mentions
        let cities = [
            ("new york", "New York, NY"),
            ("san francisco", "San Francisco, CA"),
            ("los angeles", "Los Angeles, CA"),
            ("chicago", "Chicago, IL"),
            ("seattle", "Seattle, WA"),
            ("austin", "Austin, TX"),
            ("boston", "Boston, MA"),
            ("denver", "Denver, CO"),
            ("atlanta", "Atlanta, GA"),
            ("dallas", "Dallas, TX"),
        ];

        for (city_pattern, city_name) in cities {
            if lower.contains(city_pattern) {
                return Some(city_name.to_string());
            }
        }

        if lower.contains("remote") {
            return Some("Remote".to_string());
        }

        None
    }

    /// Check if job is remote
    fn is_remote(title: &str, location: Option<&str>, description: Option<&str>) -> bool {
        let title_lower = title.to_lowercase();
        let loc_lower = location.map(|l| l.to_lowercase()).unwrap_or_default();
        let desc_lower = description.map(|d| d.to_lowercase()).unwrap_or_default();

        title_lower.contains("remote")
            || loc_lower.contains("remote")
            || desc_lower.contains("fully remote")
            || desc_lower.contains("work from home")
            || desc_lower.contains("100% remote")
    }

    /// Extract salary range from description
    fn extract_salary(description: &str) -> (Option<i64>, Option<i64>) {
        let lower = description.to_lowercase();

        // Look for salary patterns like "$100k", "$100,000", "$100k - $150k"
        // Simple pattern matching without regex crate
        if let Some(pos) = lower.find('$') {
            let rest = &description[pos..];
            let mut chars = rest.chars().skip(1);
            let mut num_str = String::new();

            // Collect digits and separators
            for ch in chars.by_ref() {
                if ch.is_ascii_digit() || ch == ',' || ch == 'k' || ch == 'K' {
                    num_str.push(ch);
                } else {
                    break;
                }
            }

            if let Some(salary) = Self::parse_salary_string(&num_str) {
                // Check for range
                let rest_after = &rest[1 + num_str.len()..];
                if let Some(range_pos) = rest_after.find('$') {
                    let range_rest = &rest_after[range_pos + 1..];
                    let mut num_str2 = String::new();
                    for ch in range_rest.chars() {
                        if ch.is_ascii_digit() || ch == ',' || ch == 'k' || ch == 'K' {
                            num_str2.push(ch);
                        } else {
                            break;
                        }
                    }
                    if let Some(salary2) = Self::parse_salary_string(&num_str2) {
                        return (Some(salary), Some(salary2));
                    }
                }
                return (Some(salary), None);
            }
        }

        (None, None)
    }

    /// Parse salary string like "100k", "100,000" to i64
    fn parse_salary_string(s: &str) -> Option<i64> {
        let s = s.replace(',', "");
        if s.ends_with('k') || s.ends_with('K') {
            let num: i64 = s[..s.len() - 1].parse().ok()?;
            Some(num * 1000)
        } else {
            s.parse().ok()
        }
    }

    /// Decode HTML entities
    fn decode_html_entities(text: &str) -> String {
        text.replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&quot;", "\"")
            .replace("&#39;", "'")
            .replace("&nbsp;", " ")
            .replace("&#x27;", "'")
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
impl JobScraper for ZipRecruiterScraper {
    async fn scrape(&self) -> ScraperResult {
        self.fetch_jobs().await
    }

    fn name(&self) -> &'static str {
        "ziprecruiter"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_url_basic() {
        let scraper = ZipRecruiterScraper::new("software engineer".to_string(), None, None, 20);
        let url = scraper.build_url();
        assert!(url.contains("ziprecruiter.com"));
        assert!(url.contains("software%20engineer"));
    }

    #[test]
    fn test_build_url_with_location() {
        let scraper = ZipRecruiterScraper::new(
            "developer".to_string(),
            Some("Austin, TX".to_string()),
            Some(25),
            10,
        );
        let url = scraper.build_url();
        assert!(url.contains("Austin"));
        assert!(url.contains("radius=25"));
    }

    #[test]
    fn test_scraper_name() {
        let scraper = ZipRecruiterScraper::new("test".to_string(), None, None, 10);
        assert_eq!(scraper.name(), "ziprecruiter");
    }

    #[test]
    fn test_compute_hash_deterministic() {
        let hash1 = ZipRecruiterScraper::compute_hash(
            "Company",
            "Engineer",
            Some("Remote"),
            "https://ziprecruiter.com/job/123",
        );
        let hash2 = ZipRecruiterScraper::compute_hash(
            "Company",
            "Engineer",
            Some("Remote"),
            "https://ziprecruiter.com/job/123",
        );

        assert_eq!(hash1, hash2);
        assert_eq!(hash1.len(), 64);
    }

    #[test]
    fn test_extract_tag() {
        let xml = "<item><title>Test Job</title><link>http://example.com</link></item>";
        assert_eq!(
            ZipRecruiterScraper::extract_tag(xml, "title"),
            Some("Test Job".to_string())
        );
        assert_eq!(
            ZipRecruiterScraper::extract_tag(xml, "link"),
            Some("http://example.com".to_string())
        );
    }

    #[test]
    fn test_extract_tag_cdata() {
        let xml = "<item><title><![CDATA[Test Job Title]]></title></item>";
        assert_eq!(
            ZipRecruiterScraper::extract_tag(xml, "title"),
            Some("Test Job Title".to_string())
        );
    }

    #[test]
    fn test_decode_html_entities() {
        assert_eq!(
            ZipRecruiterScraper::decode_html_entities("Test &amp; Job"),
            "Test & Job"
        );
        assert_eq!(
            ZipRecruiterScraper::decode_html_entities("&lt;html&gt;"),
            "<html>"
        );
    }

    #[test]
    fn test_strip_html_tags() {
        assert_eq!(
            ZipRecruiterScraper::strip_html_tags("<p>Hello <b>World</b></p>"),
            "Hello World"
        );
    }

    #[test]
    fn test_is_remote() {
        assert!(ZipRecruiterScraper::is_remote(
            "Remote Software Engineer",
            None,
            None
        ));
        assert!(ZipRecruiterScraper::is_remote(
            "Developer",
            Some("Remote"),
            None
        ));
        assert!(ZipRecruiterScraper::is_remote(
            "Engineer",
            None,
            Some("This is a fully remote position")
        ));
        assert!(!ZipRecruiterScraper::is_remote(
            "Developer",
            Some("Austin, TX"),
            Some("On-site position")
        ));
    }

    #[test]
    fn test_parse_salary_string() {
        assert_eq!(ZipRecruiterScraper::parse_salary_string("100k"), Some(100000));
        assert_eq!(ZipRecruiterScraper::parse_salary_string("150K"), Some(150000));
        assert_eq!(
            ZipRecruiterScraper::parse_salary_string("100000"),
            Some(100000)
        );
        assert_eq!(
            ZipRecruiterScraper::parse_salary_string("100,000"),
            Some(100000)
        );
    }

    #[test]
    fn test_extract_salary() {
        let (min, max) = ZipRecruiterScraper::extract_salary("Salary: $100k - $150k per year");
        assert_eq!(min, Some(100000));
        assert_eq!(max, Some(150000));

        let (min, _) = ZipRecruiterScraper::extract_salary("Starting at $80,000");
        assert_eq!(min, Some(80000));
    }
}
