//! Wellfound (AngelList Talent) Job Scraper
//!
//! Scrapes startup jobs from Wellfound (formerly AngelList Talent).
//! Wellfound is the premier platform for startup job listings.

use super::http_client::get_client;
use super::{JobScraper, ScraperResult};
use crate::core::db::Job;
use anyhow::Result;
use async_trait::async_trait;
use chrono::Utc;
use scraper::{Html, Selector};
use sha2::{Digest, Sha256};

/// Wellfound job scraper
pub struct WellfoundScraper {
    /// Job role to search for (e.g., "software-engineer")
    pub role: String,
    /// Location filter (e.g., "united-states")
    pub location: Option<String>,
    /// Remote filter
    pub remote_only: bool,
    /// Maximum results to return
    pub limit: usize,
}

impl WellfoundScraper {
    pub fn new(role: String, location: Option<String>, remote_only: bool, limit: usize) -> Self {
        Self {
            role,
            location,
            remote_only,
            limit,
        }
    }

    /// Build the search URL
    fn build_url(&self) -> String {
        let mut url = format!("https://wellfound.com/role/r/{}", self.role);

        if self.remote_only {
            url.push_str("/remote");
        } else if let Some(ref loc) = self.location {
            url.push_str(&format!("/l/{}", loc));
        }

        url
    }

    /// Fetch and parse jobs from Wellfound
    async fn fetch_jobs(&self) -> ScraperResult {
        tracing::info!("Fetching jobs from Wellfound");

        let client = get_client();
        let url = self.build_url();

        let response = client
            .get(&url)
            .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
            .header("Accept", "text/html,application/xhtml+xml")
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!("Wellfound request failed: {}", response.status()));
        }

        let html = response.text().await?;
        let jobs = self.parse_html(&html)?;

        tracing::info!("Found {} jobs from Wellfound", jobs.len());
        Ok(jobs)
    }

    /// Parse HTML to extract job listings
    fn parse_html(&self, html: &str) -> Result<Vec<Job>> {
        let document = Html::parse_document(html);
        let mut jobs = Vec::new();

        // Wellfound uses data attributes and dynamic content
        // These selectors are based on their typical HTML structure
        let job_selector =
            Selector::parse("[data-test='StartupResult'], .styles_component__XXXXX")
                .or_else(|_| Selector::parse("div"))
                .expect("fallback selector 'div' is valid CSS");

        let title_selector = Selector::parse("[data-test='JobTitle'], .job-title")
            .or_else(|_| Selector::parse("h2"))
            .expect("fallback selector 'h2' is valid CSS");

        let company_selector =
            Selector::parse("[data-test='CompanyName'], .startup-name")
                .or_else(|_| Selector::parse("h3"))
                .expect("fallback selector 'h3' is valid CSS");

        let link_selector = Selector::parse("a[href*='/jobs/']")
            .or_else(|_| Selector::parse("a"))
            .expect("fallback selector 'a' is valid CSS");

        for job_element in document.select(&job_selector).take(self.limit) {
            let title = job_element
                .select(&title_selector)
                .next()
                .map(|el| el.text().collect::<String>().trim().to_string())
                .unwrap_or_default();

            let company = job_element
                .select(&company_selector)
                .next()
                .map(|el| el.text().collect::<String>().trim().to_string())
                .unwrap_or_else(|| "Unknown Startup".to_string());

            let url = job_element
                .select(&link_selector)
                .next()
                .and_then(|el| el.value().attr("href"))
                .map(|href| {
                    if href.starts_with("http") {
                        href.to_string()
                    } else {
                        format!("https://wellfound.com{}", href)
                    }
                })
                .unwrap_or_default();

            if title.is_empty() || url.is_empty() {
                continue;
            }

            let hash = Self::compute_hash(&company, &title, None, &url);

            jobs.push(Job {
                id: 0,
                hash,
                title,
                company,
                url,
                location: self.location.clone(),
                description: None,
                score: None,
                score_reasons: None,
                source: "wellfound".to_string(),
                remote: Some(self.remote_only),
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
impl JobScraper for WellfoundScraper {
    async fn scrape(&self) -> ScraperResult {
        self.fetch_jobs().await
    }

    fn name(&self) -> &'static str {
        "wellfound"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_url_basic() {
        let scraper = WellfoundScraper::new(
            "software-engineer".to_string(),
            None,
            false,
            10,
        );
        assert_eq!(
            scraper.build_url(),
            "https://wellfound.com/role/r/software-engineer"
        );
    }

    #[test]
    fn test_build_url_with_location() {
        let scraper = WellfoundScraper::new(
            "software-engineer".to_string(),
            Some("san-francisco".to_string()),
            false,
            10,
        );
        assert_eq!(
            scraper.build_url(),
            "https://wellfound.com/role/r/software-engineer/l/san-francisco"
        );
    }

    #[test]
    fn test_build_url_remote() {
        let scraper = WellfoundScraper::new(
            "software-engineer".to_string(),
            None,
            true,
            10,
        );
        assert_eq!(
            scraper.build_url(),
            "https://wellfound.com/role/r/software-engineer/remote"
        );
    }

    #[test]
    fn test_scraper_name() {
        let scraper = WellfoundScraper::new("engineer".to_string(), None, false, 10);
        assert_eq!(scraper.name(), "wellfound");
    }

    #[test]
    fn test_compute_hash_deterministic() {
        let hash1 = WellfoundScraper::compute_hash(
            "TechStartup",
            "Full Stack Engineer",
            Some("Remote"),
            "https://wellfound.com/jobs/123",
        );
        let hash2 = WellfoundScraper::compute_hash(
            "TechStartup",
            "Full Stack Engineer",
            Some("Remote"),
            "https://wellfound.com/jobs/123",
        );

        assert_eq!(hash1, hash2);
        assert_eq!(hash1.len(), 64);
    }
}
