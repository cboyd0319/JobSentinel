//! Y Combinator Work at a Startup Scraper
//!
//! Scrapes jobs from Y Combinator's job board for YC-backed startups.
//! Features curated startup positions from YC portfolio companies.

use super::http_client::get_client;
use super::{JobScraper, ScraperResult};
use crate::core::db::Job;
use anyhow::Result;
use async_trait::async_trait;
use chrono::Utc;
use scraper::{Html, Selector};
use sha2::{Digest, Sha256};

/// Y Combinator Work at a Startup scraper
pub struct YcStartupScraper {
    /// Optional keyword filter
    pub query: Option<String>,
    /// Filter for remote jobs only
    pub remote_only: bool,
    /// Maximum results to return
    pub limit: usize,
}

impl YcStartupScraper {
    pub fn new(query: Option<String>, remote_only: bool, limit: usize) -> Self {
        Self {
            query,
            remote_only,
            limit,
        }
    }

    /// Build the search URL
    fn build_url(&self) -> String {
        let mut url = "https://www.ycombinator.com/jobs".to_string();

        let mut params = vec![];
        if let Some(q) = &self.query {
            params.push(format!("query={}", urlencoding::encode(q)));
        }
        if self.remote_only {
            params.push("remote=true".to_string());
        }

        if !params.is_empty() {
            url.push('?');
            url.push_str(&params.join("&"));
        }

        url
    }

    /// Fetch jobs from YC
    async fn fetch_jobs(&self) -> ScraperResult {
        tracing::info!("Fetching jobs from Y Combinator Work at a Startup");

        let client = get_client();
        let url = self.build_url();

        let response = client
            .get(&url)
            .header(
                "User-Agent",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            )
            .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!(
                "YC Work at a Startup request failed: {}",
                response.status()
            ));
        }

        let html = response.text().await?;
        let jobs = self.parse_html(&html)?;

        tracing::info!("Found {} jobs from YC Work at a Startup", jobs.len());
        Ok(jobs)
    }

    /// Parse HTML to extract job listings
    fn parse_html(&self, html: &str) -> Result<Vec<Job>> {
        let document = Html::parse_document(html);
        let mut jobs = Vec::new();

        // YC job board selectors - try multiple patterns
        let job_selectors = [
            ".job-listing",
            "[class*='JobListing']",
            "[class*='job-card']",
            "div[class*='_jobListing']",
            "a[href*='/companies/'][href*='/jobs/']",
        ];

        let mut job_selector = None;
        for selector_str in job_selectors {
            if let Ok(sel) = Selector::parse(selector_str) {
                if document.select(&sel).next().is_some() {
                    job_selector = Some(sel);
                    break;
                }
            }
        }

        // If no specific job selector found, try to find job links
        let job_selector = job_selector.unwrap_or_else(|| {
            Selector::parse("a[href*='/jobs/']").unwrap_or_else(|_| Selector::parse("a").unwrap())
        });

        // Selectors for job details
        let title_selector = Selector::parse(
            "[class*='jobTitle'], [class*='title'], h3, h4, .role-title",
        )
        .unwrap_or_else(|_| Selector::parse("span").unwrap());

        let company_selector = Selector::parse(
            "[class*='companyName'], [class*='company'], .startup-name",
        )
        .unwrap_or_else(|_| Selector::parse("span").unwrap());

        let location_selector =
            Selector::parse("[class*='location'], [class*='Location'], .job-location")
                .unwrap_or_else(|_| Selector::parse("span").unwrap());

        let link_selector = Selector::parse("a[href*='/jobs/'], a[href*='/companies/']")
            .unwrap_or_else(|_| Selector::parse("a").unwrap());

        for job_element in document.select(&job_selector).take(self.limit * 2) {
            // Extract title
            let title = job_element
                .select(&title_selector)
                .next()
                .map(|el| el.text().collect::<String>().trim().to_string())
                .or_else(|| {
                    // Try to get text from the element itself
                    let text = job_element.text().collect::<String>();
                    let lines: Vec<&str> = text.lines().map(|l| l.trim()).filter(|l| !l.is_empty()).collect();
                    lines.first().map(|s| s.to_string())
                })
                .unwrap_or_default();

            // Extract company
            let company = job_element
                .select(&company_selector)
                .next()
                .map(|el| el.text().collect::<String>().trim().to_string())
                .unwrap_or_else(|| "YC Startup".to_string());

            // Extract URL
            let url = job_element
                .select(&link_selector)
                .next()
                .and_then(|a| a.value().attr("href"))
                .or_else(|| job_element.value().attr("href"))
                .map(|href| {
                    if href.starts_with("http") {
                        href.to_string()
                    } else {
                        format!("https://www.ycombinator.com{}", href)
                    }
                })
                .unwrap_or_default();

            // Extract location
            let location = job_element
                .select(&location_selector)
                .next()
                .map(|el| el.text().collect::<String>().trim().to_string());

            // Skip invalid entries
            if title.is_empty() || url.is_empty() || title.len() < 3 {
                continue;
            }

            // Skip if we already have this URL
            if jobs.iter().any(|j: &Job| j.url == url) {
                continue;
            }

            // Determine if remote
            let is_remote = Self::is_remote(&title, location.as_deref());

            // Apply remote filter if enabled
            if self.remote_only && !is_remote {
                continue;
            }

            // Apply query filter if set
            if let Some(q) = &self.query {
                let q_lower = q.to_lowercase();
                let title_lower = title.to_lowercase();
                let company_lower = company.to_lowercase();
                if !title_lower.contains(&q_lower) && !company_lower.contains(&q_lower) {
                    continue;
                }
            }

            let hash = Self::compute_hash(&company, &title, location.as_deref(), &url);

            jobs.push(Job {
                id: 0,
                hash,
                title,
                company,
                url,
                location,
                description: None,
                score: None,
                score_reasons: None,
                source: "yc_startup".to_string(),
                remote: Some(is_remote),
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

            if jobs.len() >= self.limit {
                break;
            }
        }

        Ok(jobs)
    }

    /// Check if job is remote
    fn is_remote(title: &str, location: Option<&str>) -> bool {
        let title_lower = title.to_lowercase();
        let loc_lower = location.map(|l| l.to_lowercase()).unwrap_or_default();

        title_lower.contains("remote")
            || loc_lower.contains("remote")
            || loc_lower.contains("anywhere")
            || loc_lower.contains("distributed")
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
impl JobScraper for YcStartupScraper {
    async fn scrape(&self) -> ScraperResult {
        self.fetch_jobs().await
    }

    fn name(&self) -> &'static str {
        "yc_startup"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_url_basic() {
        let scraper = YcStartupScraper::new(None, false, 20);
        let url = scraper.build_url();
        assert_eq!(url, "https://www.ycombinator.com/jobs");
    }

    #[test]
    fn test_build_url_with_query() {
        let scraper = YcStartupScraper::new(Some("rust".to_string()), false, 10);
        let url = scraper.build_url();
        assert!(url.contains("query=rust"));
    }

    #[test]
    fn test_build_url_remote_only() {
        let scraper = YcStartupScraper::new(None, true, 10);
        let url = scraper.build_url();
        assert!(url.contains("remote=true"));
    }

    #[test]
    fn test_build_url_all_params() {
        let scraper = YcStartupScraper::new(Some("engineer".to_string()), true, 10);
        let url = scraper.build_url();
        assert!(url.contains("query=engineer"));
        assert!(url.contains("remote=true"));
    }

    #[test]
    fn test_scraper_name() {
        let scraper = YcStartupScraper::new(None, false, 10);
        assert_eq!(scraper.name(), "yc_startup");
    }

    #[test]
    fn test_compute_hash_deterministic() {
        let hash1 = YcStartupScraper::compute_hash(
            "Startup Inc",
            "Founding Engineer",
            Some("San Francisco"),
            "https://ycombinator.com/companies/startup/jobs/123",
        );
        let hash2 = YcStartupScraper::compute_hash(
            "Startup Inc",
            "Founding Engineer",
            Some("San Francisco"),
            "https://ycombinator.com/companies/startup/jobs/123",
        );

        assert_eq!(hash1, hash2);
        assert_eq!(hash1.len(), 64);
    }

    #[test]
    fn test_is_remote() {
        assert!(YcStartupScraper::is_remote("Remote Software Engineer", None));
        assert!(YcStartupScraper::is_remote("Engineer", Some("Remote, US")));
        assert!(YcStartupScraper::is_remote("Developer", Some("Anywhere")));
        assert!(!YcStartupScraper::is_remote(
            "Developer",
            Some("San Francisco, CA")
        ));
    }
}
