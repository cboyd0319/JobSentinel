//! SimplyHired Job Scraper
//!
//! Scrapes jobs from SimplyHired, a major job aggregator.
//! Uses HTML parsing since there's no public API.

use super::http_client::get_with_retry_cached;
use super::{location_utils, title_utils, url_utils, JobScraper, ScraperResult};
use crate::core::db::Job;
use anyhow::Result;
use async_trait::async_trait;
use chrono::Utc;
use scraper::{Html, Selector};
use sha2::{Digest, Sha256};

const BASE_URL: &str = "https://www.simplyhired.com";

/// SimplyHired job scraper
pub struct SimplyHiredScraper {
    /// Search query (keywords)
    pub query: String,
    /// Location filter
    pub location: Option<String>,
    /// Maximum results to return
    pub limit: usize,
    /// Number of pages to scrape (10 results per page)
    pub max_pages: usize,
}

impl SimplyHiredScraper {
    /// Create a new SimplyHired scraper
    pub fn new(query: impl Into<String>) -> Self {
        Self {
            query: query.into(),
            location: None,
            limit: 50,
            max_pages: 3,
        }
    }

    /// Set location filter
    pub fn with_location(mut self, location: impl Into<String>) -> Self {
        self.location = Some(location.into());
        self
    }

    /// Set maximum results
    pub fn with_limit(mut self, limit: usize) -> Self {
        self.limit = limit;
        self
    }

    /// Set maximum pages to scrape
    pub fn with_max_pages(mut self, pages: usize) -> Self {
        self.max_pages = pages;
        self
    }

    /// Build search URL
    fn build_url(&self, page: usize) -> String {
        let mut url = format!(
            "{}/search?q={}",
            BASE_URL,
            urlencoding::encode(&self.query)
        );

        if let Some(ref loc) = self.location {
            url.push_str(&format!("&l={}", urlencoding::encode(loc)));
        }

        if page > 1 {
            url.push_str(&format!("&pn={}", page));
        }

        url
    }

    /// Fetch and parse jobs from SimplyHired
    async fn fetch_jobs(&self) -> ScraperResult {
        tracing::info!("Fetching jobs from SimplyHired for query: {}", self.query);

        let mut all_jobs = Vec::new();

        for page in 1..=self.max_pages {
            if all_jobs.len() >= self.limit {
                break;
            }

            let url = self.build_url(page);
            tracing::debug!("Fetching SimplyHired page {}: {}", page, url);

            match get_with_retry_cached(&url, false).await {
                Ok(html) => {
                    let jobs = self.parse_page(&html)?;
                    if jobs.is_empty() {
                        tracing::debug!("No more jobs found on page {}", page);
                        break;
                    }
                    all_jobs.extend(jobs);
                }
                Err(e) => {
                    tracing::warn!("Failed to fetch SimplyHired page {}: {}", page, e);
                    break;
                }
            }

            // Rate limiting: wait between pages
            if page < self.max_pages {
                tokio::time::sleep(tokio::time::Duration::from_millis(1500)).await;
            }
        }

        // Truncate to limit
        all_jobs.truncate(self.limit);

        tracing::info!("Found {} jobs from SimplyHired", all_jobs.len());
        Ok(all_jobs)
    }

    /// Parse jobs from HTML page
    fn parse_page(&self, html: &str) -> Result<Vec<Job>> {
        let document = Html::parse_document(html);

        // SimplyHired job cards selector
        let job_selector = Selector::parse("article[data-jobkey], div.SerpJob, li.SerpJob-jobCard")
            .map_err(|_| anyhow::anyhow!("Invalid job selector"))?;

        let title_selector = Selector::parse("a.SerpJob-title, h2.jobTitle a, a[data-testid='job-title']")
            .map_err(|_| anyhow::anyhow!("Invalid title selector"))?;

        let company_selector = Selector::parse("span.SerpJob-company, span.companyName, span[data-testid='company-name']")
            .map_err(|_| anyhow::anyhow!("Invalid company selector"))?;

        let location_selector = Selector::parse("span.SerpJob-location, span.location, span[data-testid='job-location']")
            .map_err(|_| anyhow::anyhow!("Invalid location selector"))?;

        let salary_selector = Selector::parse("span.SerpJob-salary, span.salaryText, span[data-testid='job-salary']")
            .map_err(|_| anyhow::anyhow!("Invalid salary selector"))?;

        let snippet_selector = Selector::parse("p.SerpJob-snippet, div.job-snippet, span[data-testid='job-snippet']")
            .map_err(|_| anyhow::anyhow!("Invalid snippet selector"))?;

        let mut jobs = Vec::new();

        for job_el in document.select(&job_selector) {
            // Get title and URL
            let (title, url) = match job_el.select(&title_selector).next() {
                Some(el) => {
                    let title = el.text().collect::<String>().trim().to_string();
                    let href = el.value().attr("href").unwrap_or("");
                    let url = if href.starts_with("http") {
                        href.to_string()
                    } else if href.starts_with("/") {
                        format!("{}{}", BASE_URL, href)
                    } else {
                        continue;
                    };
                    (title, url)
                }
                None => continue,
            };

            if title.is_empty() || url.is_empty() {
                continue;
            }

            // Get company
            let company = job_el
                .select(&company_selector)
                .next()
                .map(|el| el.text().collect::<String>().trim().to_string())
                .unwrap_or_else(|| "Unknown".to_string());

            // Get location
            let location = job_el
                .select(&location_selector)
                .next()
                .map(|el| el.text().collect::<String>().trim().to_string())
                .filter(|s| !s.is_empty());

            // Get salary
            let salary_text = job_el
                .select(&salary_selector)
                .next()
                .map(|el| el.text().collect::<String>());

            let (salary_min, salary_max) = salary_text
                .as_ref()
                .map(|s| Self::parse_salary(s))
                .unwrap_or((None, None));

            // Get description snippet
            let description = job_el
                .select(&snippet_selector)
                .next()
                .map(|el| el.text().collect::<String>().trim().to_string())
                .filter(|s| !s.is_empty());

            // Check if remote
            let is_remote = location
                .as_ref()
                .map(|l| l.to_lowercase().contains("remote"))
                .unwrap_or(false)
                || title.to_lowercase().contains("remote");

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
                source: "simplyhired".to_string(),
                remote: Some(is_remote),
                salary_min,
                salary_max,
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
            });
        }

        Ok(jobs)
    }

    /// Parse salary string into min/max values
    fn parse_salary(salary_str: &str) -> (Option<i64>, Option<i64>) {
        let clean = salary_str
            .replace(',', "")
            .replace('$', "")
            .to_lowercase();

        // Handle ranges like "$80,000 - $120,000" or "$80K - $120K"
        if clean.contains('-') || clean.contains("to") {
            let parts: Vec<&str> = clean.split(|c| c == '-' || c == 't').collect();
            if parts.len() >= 2 {
                let min = Self::parse_salary_value(parts[0]);
                let max = Self::parse_salary_value(parts.last().unwrap_or(&""));
                return (min, max);
            }
        }

        // Single value
        let val = Self::parse_salary_value(&clean);
        (val, val)
    }

    /// Parse a single salary value
    fn parse_salary_value(s: &str) -> Option<i64> {
        let clean = s.trim()
            .replace(',', "")
            .replace('$', "")
            .replace("k", "000")
            .replace("K", "000");

        // Extract just the numbers
        let numeric: String = clean.chars()
            .filter(|c| c.is_ascii_digit())
            .collect();

        numeric.parse::<i64>().ok()
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

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_scraper() {
        let scraper = SimplyHiredScraper::new("software engineer");

        assert_eq!(scraper.query, "software engineer");
        assert_eq!(scraper.location, None);
        assert_eq!(scraper.limit, 50);
        assert_eq!(scraper.max_pages, 3);
    }

    #[test]
    fn test_builder_methods() {
        let scraper = SimplyHiredScraper::new("developer")
            .with_location("Denver, CO")
            .with_limit(100)
            .with_max_pages(5);

        assert_eq!(scraper.query, "developer");
        assert_eq!(scraper.location, Some("Denver, CO".to_string()));
        assert_eq!(scraper.limit, 100);
        assert_eq!(scraper.max_pages, 5);
    }

    #[test]
    fn test_build_url_basic() {
        let scraper = SimplyHiredScraper::new("rust developer");
        let url = scraper.build_url(1);

        assert!(url.starts_with("https://www.simplyhired.com/search?q="));
        assert!(url.contains("rust%20developer"));
        assert!(!url.contains("&pn=")); // No page param for page 1
    }

    #[test]
    fn test_build_url_with_location() {
        let scraper = SimplyHiredScraper::new("engineer")
            .with_location("San Francisco, CA");
        let url = scraper.build_url(1);

        assert!(url.contains("&l=San%20Francisco"));
    }

    #[test]
    fn test_build_url_pagination() {
        let scraper = SimplyHiredScraper::new("developer");

        let url1 = scraper.build_url(1);
        let url2 = scraper.build_url(2);
        let url3 = scraper.build_url(3);

        assert!(!url1.contains("&pn="));
        assert!(url2.contains("&pn=2"));
        assert!(url3.contains("&pn=3"));
    }

    #[test]
    fn test_parse_salary_range() {
        let (min, max) = SimplyHiredScraper::parse_salary("$80,000 - $120,000");
        assert_eq!(min, Some(80000));
        assert_eq!(max, Some(120000));
    }

    #[test]
    fn test_parse_salary_range_with_k() {
        let (min, max) = SimplyHiredScraper::parse_salary("$80K - $120K");
        assert_eq!(min, Some(80000));
        assert_eq!(max, Some(120000));
    }

    #[test]
    fn test_parse_salary_single_value() {
        let (min, max) = SimplyHiredScraper::parse_salary("$95,000");
        assert_eq!(min, Some(95000));
        assert_eq!(max, Some(95000));
    }

    #[test]
    fn test_parse_salary_hourly() {
        let (min, max) = SimplyHiredScraper::parse_salary("$45");
        assert_eq!(min, Some(45));
        assert_eq!(max, Some(45));
    }

    #[test]
    fn test_parse_salary_invalid() {
        let (min, max) = SimplyHiredScraper::parse_salary("Competitive");
        assert_eq!(min, None);
        assert_eq!(max, None);
    }

    #[test]
    fn test_parse_salary_with_to() {
        let (min, max) = SimplyHiredScraper::parse_salary("$50,000 to $75,000");
        assert_eq!(min, Some(50000));
        assert_eq!(max, Some(75000));
    }

    #[test]
    fn test_compute_hash_deterministic() {
        let hash1 = SimplyHiredScraper::compute_hash(
            "TechCorp",
            "Software Engineer",
            Some("Denver, CO"),
            "https://simplyhired.com/job/123",
        );
        let hash2 = SimplyHiredScraper::compute_hash(
            "TechCorp",
            "Software Engineer",
            Some("Denver, CO"),
            "https://simplyhired.com/job/123",
        );

        assert_eq!(hash1, hash2);
        assert_eq!(hash1.len(), 64);
    }

    #[test]
    fn test_compute_hash_unique() {
        let hash1 = SimplyHiredScraper::compute_hash(
            "CompanyA",
            "Engineer",
            Some("NYC"),
            "https://simplyhired.com/1",
        );
        let hash2 = SimplyHiredScraper::compute_hash(
            "CompanyB",
            "Engineer",
            Some("NYC"),
            "https://simplyhired.com/2",
        );

        assert_ne!(hash1, hash2);
    }

    #[test]
    fn test_scraper_name() {
        let scraper = SimplyHiredScraper::new("test");
        assert_eq!(scraper.name(), "simplyhired");
    }

    #[test]
    fn test_parse_salary_value() {
        assert_eq!(SimplyHiredScraper::parse_salary_value("$100,000"), Some(100000));
        assert_eq!(SimplyHiredScraper::parse_salary_value("100K"), Some(100000));
        assert_eq!(SimplyHiredScraper::parse_salary_value("  $85k  "), Some(85000));
        assert_eq!(SimplyHiredScraper::parse_salary_value(""), None);
        assert_eq!(SimplyHiredScraper::parse_salary_value("competitive"), None);
    }

    #[test]
    fn test_parse_page_empty_html() {
        let scraper = SimplyHiredScraper::new("test");
        let result = scraper.parse_page("<html><body></body></html>");

        assert!(result.is_ok());
        assert!(result.unwrap().is_empty());
    }
}
