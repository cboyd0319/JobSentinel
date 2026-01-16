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

    #[test]
    fn test_parse_html_with_data_test_attributes() {
        let scraper = WellfoundScraper::new(
            "software-engineer".to_string(),
            None,
            true,
            10,
        );
        let html = r#"
            <html>
                <body>
                    <div data-test="StartupResult">
                        <h2 data-test="JobTitle">Senior Frontend Engineer</h2>
                        <h3 data-test="CompanyName">TechStartup Inc</h3>
                        <a href="/jobs/senior-frontend-123">View Job</a>
                    </div>
                    <div data-test="StartupResult">
                        <h2 data-test="JobTitle">Backend Developer</h2>
                        <h3 data-test="CompanyName">DataCorp</h3>
                        <a href="/jobs/backend-dev-456">Apply Now</a>
                    </div>
                </body>
            </html>
        "#;

        let jobs = scraper.parse_html(html).expect("parse_html should succeed");

        assert_eq!(jobs.len(), 2);

        // First job
        assert_eq!(jobs[0].title, "Senior Frontend Engineer");
        assert_eq!(jobs[0].company, "TechStartup Inc");
        assert_eq!(jobs[0].url, "https://wellfound.com/jobs/senior-frontend-123");
        assert_eq!(jobs[0].source, "wellfound");
        assert_eq!(jobs[0].remote, Some(true));

        // Second job
        assert_eq!(jobs[1].title, "Backend Developer");
        assert_eq!(jobs[1].company, "DataCorp");
        assert_eq!(jobs[1].url, "https://wellfound.com/jobs/backend-dev-456");
    }

    #[test]
    fn test_parse_html_with_multiple_jobs() {
        let scraper = WellfoundScraper::new(
            "engineer".to_string(),
            Some("new-york".to_string()),
            false,
            10,
        );
        let html = r#"
            <html>
                <body>
                    <div data-test="StartupResult">
                        <h2 data-test="JobTitle">Full Stack Engineer</h2>
                        <h3 data-test="CompanyName">StartupXYZ</h3>
                        <a href="/jobs/fullstack-789">Details</a>
                    </div>
                    <div data-test="StartupResult">
                        <h2 data-test="JobTitle">Platform Engineer</h2>
                        <h3 data-test="CompanyName">CloudStartup</h3>
                        <a href="/jobs/platform-456">Apply</a>
                    </div>
                </body>
            </html>
        "#;

        let jobs = scraper.parse_html(html).expect("parse_html should succeed");

        assert_eq!(jobs.len(), 2);
        assert_eq!(jobs[0].title, "Full Stack Engineer");
        assert_eq!(jobs[0].company, "StartupXYZ");
        assert_eq!(jobs[0].location, Some("new-york".to_string()));
        assert_eq!(jobs[0].remote, Some(false));
        assert_eq!(jobs[1].title, "Platform Engineer");
        assert_eq!(jobs[1].company, "CloudStartup");
    }

    #[test]
    fn test_parse_html_with_absolute_urls() {
        let scraper = WellfoundScraper::new("engineer".to_string(), None, true, 10);
        let html = r#"
            <html>
                <body>
                    <div data-test="StartupResult">
                        <h2 data-test="JobTitle">DevOps Engineer</h2>
                        <h3 data-test="CompanyName">CloudStartup</h3>
                        <a href="https://wellfound.com/jobs/devops-999">Apply</a>
                    </div>
                </body>
            </html>
        "#;

        let jobs = scraper.parse_html(html).expect("parse_html should succeed");

        assert_eq!(jobs.len(), 1);
        assert_eq!(jobs[0].url, "https://wellfound.com/jobs/devops-999");
    }

    #[test]
    fn test_parse_html_empty_document() {
        let scraper = WellfoundScraper::new("engineer".to_string(), None, false, 10);
        let html = "<html><body></body></html>";

        let jobs = scraper.parse_html(html).expect("parse_html should succeed");

        assert_eq!(jobs.len(), 0);
    }

    #[test]
    fn test_parse_html_malformed_missing_title() {
        let scraper = WellfoundScraper::new("engineer".to_string(), None, false, 10);
        let html = r#"
            <html>
                <body>
                    <div data-test="StartupResult">
                        <h2 data-test="JobTitle"></h2>
                        <h3 data-test="CompanyName">TechStartup</h3>
                        <a href="/jobs/123">View</a>
                    </div>
                </body>
            </html>
        "#;

        let jobs = scraper.parse_html(html).expect("parse_html should succeed");

        // Should be skipped due to empty title
        assert_eq!(jobs.len(), 0);
    }

    #[test]
    fn test_parse_html_malformed_missing_url() {
        let scraper = WellfoundScraper::new("engineer".to_string(), None, false, 10);
        let html = r#"
            <html>
                <body>
                    <div data-test="StartupResult">
                        <h2 data-test="JobTitle">Software Engineer</h2>
                        <h3 data-test="CompanyName">TechStartup</h3>
                    </div>
                </body>
            </html>
        "#;

        let jobs = scraper.parse_html(html).expect("parse_html should succeed");

        // Should be skipped due to missing URL
        assert_eq!(jobs.len(), 0);
    }

    #[test]
    fn test_parse_html_limit_respected() {
        let scraper = WellfoundScraper::new("developer".to_string(), None, false, 2);
        let html = r#"
            <html>
                <body>
                    <div data-test="StartupResult">
                        <h2 data-test="JobTitle">Job 1</h2>
                        <h3 data-test="CompanyName">Company 1</h3>
                        <a href="/jobs/1">Link</a>
                    </div>
                    <div data-test="StartupResult">
                        <h2 data-test="JobTitle">Job 2</h2>
                        <h3 data-test="CompanyName">Company 2</h3>
                        <a href="/jobs/2">Link</a>
                    </div>
                    <div data-test="StartupResult">
                        <h2 data-test="JobTitle">Job 3</h2>
                        <h3 data-test="CompanyName">Company 3</h3>
                        <a href="/jobs/3">Link</a>
                    </div>
                </body>
            </html>
        "#;

        let jobs = scraper.parse_html(html).expect("parse_html should succeed");

        // Should only return 2 jobs due to limit
        assert_eq!(jobs.len(), 2);
    }

    #[test]
    fn test_parse_html_unknown_startup_fallback() {
        let scraper = WellfoundScraper::new("engineer".to_string(), None, false, 10);
        let html = r#"
            <html>
                <body>
                    <div data-test="StartupResult">
                        <h2 data-test="JobTitle">Software Engineer</h2>
                        <a href="/jobs/123">Apply</a>
                    </div>
                </body>
            </html>
        "#;

        let jobs = scraper.parse_html(html).expect("parse_html should succeed");

        assert_eq!(jobs.len(), 1);
        assert_eq!(jobs[0].company, "Unknown Startup");
    }

    #[test]
    fn test_parse_html_whitespace_trimming() {
        let scraper = WellfoundScraper::new("engineer".to_string(), None, true, 10);
        let html = r#"
            <html>
                <body>
                    <div data-test="StartupResult">
                        <h2 data-test="JobTitle">
                            Senior Engineer
                        </h2>
                        <h3 data-test="CompanyName">
                            TechStartup
                        </h3>
                        <a href="/jobs/1">Apply</a>
                    </div>
                </body>
            </html>
        "#;

        let jobs = scraper.parse_html(html).expect("parse_html should succeed");

        assert_eq!(jobs.len(), 1);
        assert_eq!(jobs[0].title, "Senior Engineer");
        assert_eq!(jobs[0].company, "TechStartup");
    }

    #[test]
    fn test_parse_html_remote_flag_propagates() {
        let scraper_remote = WellfoundScraper::new("engineer".to_string(), None, true, 10);
        let scraper_not_remote = WellfoundScraper::new("engineer".to_string(), None, false, 10);

        let html = r#"
            <html>
                <body>
                    <div data-test="StartupResult">
                        <h2 data-test="JobTitle">Engineer</h2>
                        <h3 data-test="CompanyName">Startup</h3>
                        <a href="/jobs/1">Apply</a>
                    </div>
                </body>
            </html>
        "#;

        let jobs_remote = scraper_remote.parse_html(html).expect("parse_html should succeed");
        let jobs_not_remote = scraper_not_remote.parse_html(html).expect("parse_html should succeed");

        assert_eq!(jobs_remote.len(), 1);
        assert_eq!(jobs_remote[0].remote, Some(true));

        assert_eq!(jobs_not_remote.len(), 1);
        assert_eq!(jobs_not_remote[0].remote, Some(false));
    }

    #[test]
    fn test_parse_html_location_propagates() {
        let scraper = WellfoundScraper::new(
            "engineer".to_string(),
            Some("san-francisco".to_string()),
            false,
            10,
        );

        let html = r#"
            <html>
                <body>
                    <div data-test="StartupResult">
                        <h2 data-test="JobTitle">Engineer</h2>
                        <h3 data-test="CompanyName">Startup</h3>
                        <a href="/jobs/1">Apply</a>
                    </div>
                </body>
            </html>
        "#;

        let jobs = scraper.parse_html(html).expect("parse_html should succeed");

        assert_eq!(jobs.len(), 1);
        assert_eq!(jobs[0].location, Some("san-francisco".to_string()));
    }

    #[test]
    fn test_parse_html_mixed_attributes() {
        let scraper = WellfoundScraper::new("engineer".to_string(), None, false, 10);
        let html = r#"
            <html>
                <body>
                    <div data-test="StartupResult">
                        <h2 class="job-title">Platform Engineer</h2>
                        <h3 class="startup-name">NewStartup</h3>
                        <a href="/jobs/platform-123">Learn More</a>
                    </div>
                </body>
            </html>
        "#;

        let jobs = scraper.parse_html(html).expect("parse_html should succeed");

        // Should find job using mixed selectors (data-test + class)
        assert_eq!(jobs.len(), 1);
        assert_eq!(jobs[0].title, "Platform Engineer");
        assert_eq!(jobs[0].company, "NewStartup");
    }

    #[test]
    fn test_parse_html_multiple_links_picks_first() {
        let scraper = WellfoundScraper::new("engineer".to_string(), None, false, 10);
        let html = r#"
            <html>
                <body>
                    <div data-test="StartupResult">
                        <h2 data-test="JobTitle">Engineer</h2>
                        <h3 data-test="CompanyName">Startup</h3>
                        <a href="/jobs/correct-link">Apply</a>
                        <a href="/jobs/wrong-link">Share</a>
                    </div>
                </body>
            </html>
        "#;

        let jobs = scraper.parse_html(html).expect("parse_html should succeed");

        assert_eq!(jobs.len(), 1);
        assert_eq!(jobs[0].url, "https://wellfound.com/jobs/correct-link");
    }

    #[test]
    fn test_build_url_remote_takes_precedence_over_location() {
        let scraper = WellfoundScraper::new(
            "engineer".to_string(),
            Some("san-francisco".to_string()),
            true,
            10,
        );

        // When remote_only is true, location should be ignored
        assert_eq!(
            scraper.build_url(),
            "https://wellfound.com/role/r/engineer/remote"
        );
    }

    #[tokio::test]
    async fn test_scrape_calls_fetch_jobs() {
        let scraper = WellfoundScraper::new(
            "software-engineer".to_string(),
            Some("remote".to_string()),
            true,
            5,
        );

        // scrape() calls fetch_jobs() which we can't test without mocking the API
        // but we can verify the scraper is properly initialized
        assert_eq!(scraper.role, "software-engineer");
        assert_eq!(scraper.location, Some("remote".to_string()));
        assert!(scraper.remote_only);
        assert_eq!(scraper.limit, 5);
        assert_eq!(scraper.name(), "wellfound");
    }

    #[test]
    fn test_parse_html_filters_empty_title() {
        let scraper = WellfoundScraper::new("engineer".to_string(), None, false, 10);
        let html = r#"
            <html>
                <body>
                    <div data-test="StartupResult">
                        <h2 data-test="JobTitle"></h2>
                        <h3 data-test="CompanyName">Company</h3>
                        <a href="/jobs/123">Link</a>
                    </div>
                </body>
            </html>
        "#;

        let jobs = scraper.parse_html(html).expect("parse_html should succeed");
        assert_eq!(jobs.len(), 0, "Empty title should be filtered");
    }

    #[test]
    fn test_parse_html_filters_empty_url() {
        let scraper = WellfoundScraper::new("engineer".to_string(), None, false, 10);
        let html = r#"
            <html>
                <body>
                    <div data-test="StartupResult">
                        <h2 data-test="JobTitle">Engineer</h2>
                        <h3 data-test="CompanyName">Company</h3>
                    </div>
                </body>
            </html>
        "#;

        let jobs = scraper.parse_html(html).expect("parse_html should succeed");
        assert_eq!(jobs.len(), 0, "Missing URL should be filtered");
    }

    #[test]
    fn test_compute_hash_different_inputs() {
        let hash1 = WellfoundScraper::compute_hash(
            "CompanyA",
            "Engineer",
            Some("Remote"),
            "https://wellfound.com/jobs/1",
        );
        let hash2 = WellfoundScraper::compute_hash(
            "CompanyB",
            "Engineer",
            Some("Remote"),
            "https://wellfound.com/jobs/1",
        );

        assert_ne!(hash1, hash2, "Different companies should produce different hashes");
    }

    #[test]
    fn test_compute_hash_with_location_none() {
        let hash = WellfoundScraper::compute_hash(
            "Company",
            "Developer",
            None,
            "https://wellfound.com/jobs/123",
        );

        assert_eq!(hash.len(), 64);
    }

    #[test]
    fn test_parse_html_location_from_scraper_config() {
        let scraper = WellfoundScraper::new(
            "engineer".to_string(),
            Some("boston".to_string()),
            false,
            10,
        );

        let html = r#"
            <html>
                <body>
                    <div data-test="StartupResult">
                        <h2 data-test="JobTitle">Engineer</h2>
                        <h3 data-test="CompanyName">Startup</h3>
                        <a href="/jobs/1">Apply</a>
                    </div>
                </body>
            </html>
        "#;

        let jobs = scraper.parse_html(html).expect("parse_html should succeed");

        assert_eq!(jobs.len(), 1);
        // Location comes from scraper config
        assert_eq!(jobs[0].location, Some("boston".to_string()));
    }

    #[test]
    fn test_parse_html_with_no_company_uses_default() {
        let scraper = WellfoundScraper::new("engineer".to_string(), None, false, 10);
        let html = r#"
            <html>
                <body>
                    <div data-test="StartupResult">
                        <h2 data-test="JobTitle">Software Engineer</h2>
                        <a href="/jobs/123">Apply</a>
                    </div>
                </body>
            </html>
        "#;

        let jobs = scraper.parse_html(html).expect("parse_html should succeed");

        assert_eq!(jobs.len(), 1);
        assert_eq!(jobs[0].company, "Unknown Startup");
    }

    #[test]
    fn test_parse_html_source_is_wellfound() {
        let scraper = WellfoundScraper::new("engineer".to_string(), None, false, 10);
        let html = r#"
            <html>
                <body>
                    <div data-test="StartupResult">
                        <h2 data-test="JobTitle">Engineer</h2>
                        <h3 data-test="CompanyName">Startup</h3>
                        <a href="/jobs/123">Apply</a>
                    </div>
                </body>
            </html>
        "#;

        let jobs = scraper.parse_html(html).expect("parse_html should succeed");

        assert_eq!(jobs.len(), 1);
        assert_eq!(jobs[0].source, "wellfound");
    }

    #[test]
    fn test_parse_html_job_struct_fields() {
        let scraper = WellfoundScraper::new("engineer".to_string(), None, true, 10);
        let html = r#"
            <html>
                <body>
                    <div data-test="StartupResult">
                        <h2 data-test="JobTitle">Full Stack Engineer</h2>
                        <h3 data-test="CompanyName">TechStartup</h3>
                        <a href="/jobs/abc123">View Job</a>
                    </div>
                </body>
            </html>
        "#;

        let jobs = scraper.parse_html(html).expect("parse_html should succeed");

        assert_eq!(jobs.len(), 1);
        let job = &jobs[0];

        assert_eq!(job.id, 0);
        assert_eq!(job.title, "Full Stack Engineer");
        assert_eq!(job.company, "TechStartup");
        assert_eq!(job.url, "https://wellfound.com/jobs/abc123");
        assert_eq!(job.description, None);
        assert_eq!(job.score, None);
        assert_eq!(job.score_reasons, None);
        assert_eq!(job.source, "wellfound");
        assert_eq!(job.remote, Some(true));
        assert_eq!(job.salary_min, None);
        assert_eq!(job.salary_max, None);
        assert_eq!(job.currency, None);
        assert_eq!(job.times_seen, 1);
        assert!(!job.immediate_alert_sent);
        assert!(!job.hidden);
        assert!(!job.bookmarked);
        assert!(job.notes.is_none());
        assert!(!job.included_in_digest);
        assert!(!job.hash.is_empty());
    }

    #[test]
    fn test_build_url_no_location_no_remote() {
        let scraper = WellfoundScraper::new(
            "backend-engineer".to_string(),
            None,
            false,
            10,
        );

        assert_eq!(
            scraper.build_url(),
            "https://wellfound.com/role/r/backend-engineer"
        );
    }
}
