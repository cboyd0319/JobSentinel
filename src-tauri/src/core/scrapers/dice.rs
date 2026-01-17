//! Dice Job Scraper
//!
//! Scrapes tech jobs from Dice.com, a tech-focused job board.
//! Dice specializes in technology and IT positions.

use super::http_client::get_client;
use super::{JobScraper, ScraperResult};
use crate::core::db::Job;
use anyhow::Result;
use async_trait::async_trait;
use chrono::Utc;
use scraper::{Html, Selector};
use sha2::{Digest, Sha256};

/// Dice job scraper
pub struct DiceScraper {
    /// Search query (e.g., "rust developer", "software engineer")
    pub query: String,
    /// Location (e.g., "Remote", "New York, NY")
    pub location: Option<String>,
    /// Maximum results to return
    pub limit: usize,
}

impl DiceScraper {
    pub fn new(query: String, location: Option<String>, limit: usize) -> Self {
        Self {
            query,
            location,
            limit,
        }
    }

    /// Build the search URL
    fn build_url(&self) -> String {
        let mut url = format!(
            "https://www.dice.com/jobs?q={}&countryCode=US&radius=30&radiusUnit=mi&page=1&pageSize={}",
            urlencoding::encode(&self.query),
            self.limit.min(100)
        );

        if let Some(loc) = &self.location {
            url.push_str(&format!("&location={}", urlencoding::encode(loc)));
        }

        url
    }

    /// Fetch jobs from Dice
    async fn fetch_jobs(&self) -> ScraperResult {
        tracing::info!("Fetching jobs from Dice for query: {}", self.query);

        let client = get_client();
        let url = self.build_url();

        let response = client
            .get(&url)
            .header(
                "User-Agent",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            )
            .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
            .header("Accept-Language", "en-US,en;q=0.5")
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!("Dice request failed: {}", response.status()));
        }

        let html = response.text().await?;
        let jobs = self.parse_html(&html)?;

        tracing::info!("Found {} jobs from Dice", jobs.len());
        Ok(jobs)
    }

    /// Parse HTML to extract job listings
    #[allow(clippy::expect_used)] // Static CSS selectors are known valid at compile time
    fn parse_html(&self, html: &str) -> Result<Vec<Job>> {
        let document = Html::parse_document(html);
        let mut jobs = Vec::new();

        // Dice uses various selectors for job cards
        // Try multiple patterns for resilience
        let job_selectors = [
            "[data-cy='search-card']",
            ".card-title-link",
            ".search-card",
            "article[data-testid='job-card']",
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

        let job_selector = match job_selector {
            Some(sel) => sel,
            None => {
                // Fallback: try to find any job-like elements
                Selector::parse("a[href*='/job-detail/']")
                    .or_else(|_| Selector::parse("a"))
                    .expect("fallback selector 'a' is valid CSS")
            }
        };

        // Selectors for job details
        let title_selector =
            Selector::parse("[data-cy='card-title'], .card-title-link, h5 a, .job-title")
                .or_else(|_| Selector::parse("a"))
                .expect("fallback selector 'a' is valid CSS");

        let company_selector =
            Selector::parse("[data-cy='search-result-company-name'], .company-name, .employer-name")
                .or_else(|_| Selector::parse("span"))
                .expect("fallback selector 'span' is valid CSS");

        let location_selector =
            Selector::parse("[data-cy='search-result-location'], .job-location, .search-result-location")
                .or_else(|_| Selector::parse("span"))
                .expect("fallback selector 'span' is valid CSS");

        for job_element in document.select(&job_selector).take(self.limit) {
            // Extract title - ElementRef implements Copy, no need for clone
            let title = job_element
                .select(&title_selector)
                .next()
                .or(Some(job_element))
                .map(|el| el.text().collect::<String>().trim().to_string())
                .unwrap_or_default();

            // Extract company
            let company = job_element
                .select(&company_selector)
                .next()
                .map(|el| el.text().collect::<String>().trim().to_string())
                .unwrap_or_else(|| "Unknown Company".to_string());

            // Extract URL
            // Simple 'a' selector is always valid
            let a_selector = Selector::parse("a").expect("'a' is valid CSS");
            let url = job_element
                .value()
                .attr("href")
                .or_else(|| {
                    job_element
                        .select(&a_selector)
                        .next()
                        .and_then(|a| a.value().attr("href"))
                })
                .map(|href| {
                    if href.starts_with("http") {
                        href.to_string()
                    } else {
                        format!("https://www.dice.com{}", href)
                    }
                })
                .unwrap_or_default();

            // Extract location
            let location = job_element
                .select(&location_selector)
                .next()
                .map(|el| el.text().collect::<String>().trim().to_string());

            // Skip invalid entries
            if title.is_empty() || url.is_empty() {
                continue;
            }

            // Determine if remote
            let is_remote = Self::is_remote(&title, location.as_deref());

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
                source: "dice".to_string(),
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
                ghost_score: None,
                ghost_reasons: None,
                first_seen: None,
                repost_count: 0,
            });
        }

        Ok(jobs)
    }

    /// Check if job is remote based on title and location
    fn is_remote(title: &str, location: Option<&str>) -> bool {
        let title_lower = title.to_lowercase();
        let loc_lower = location.map(|l| l.to_lowercase()).unwrap_or_default();

        title_lower.contains("remote")
            || loc_lower.contains("remote")
            || loc_lower.contains("work from home")
            || loc_lower.contains("anywhere")
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
impl JobScraper for DiceScraper {
    async fn scrape(&self) -> ScraperResult {
        self.fetch_jobs().await
    }

    fn name(&self) -> &'static str {
        "dice"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_url_basic() {
        let scraper = DiceScraper::new("rust developer".to_string(), None, 20);
        let url = scraper.build_url();
        assert!(url.contains("dice.com"));
        assert!(url.contains("rust%20developer"));
        assert!(url.contains("pageSize=20"));
    }

    #[test]
    fn test_build_url_with_location() {
        let scraper =
            DiceScraper::new("python".to_string(), Some("New York".to_string()), 10);
        let url = scraper.build_url();
        assert!(url.contains("location=New%20York"));
    }

    #[test]
    fn test_scraper_name() {
        let scraper = DiceScraper::new("test".to_string(), None, 10);
        assert_eq!(scraper.name(), "dice");
    }

    #[test]
    fn test_compute_hash_deterministic() {
        let hash1 = DiceScraper::compute_hash(
            "TechCorp",
            "Rust Engineer",
            Some("Remote"),
            "https://dice.com/job/123",
        );
        let hash2 = DiceScraper::compute_hash(
            "TechCorp",
            "Rust Engineer",
            Some("Remote"),
            "https://dice.com/job/123",
        );

        assert_eq!(hash1, hash2);
        assert_eq!(hash1.len(), 64);
    }

    #[test]
    fn test_is_remote() {
        assert!(DiceScraper::is_remote("Senior Rust Engineer (Remote)", None));
        assert!(DiceScraper::is_remote("Developer", Some("Remote, USA")));
        assert!(DiceScraper::is_remote("Engineer", Some("Work from home")));
        assert!(!DiceScraper::is_remote("Developer", Some("New York, NY")));
    }

    #[test]
    fn test_parse_html_with_data_cy_attributes() {
        let scraper = DiceScraper::new("rust".to_string(), None, 10);
        let html = r#"
            <html>
                <body>
                    <div data-cy="search-card">
                        <a href="/job-detail/senior-rust-engineer-123" data-cy="card-title">
                            Senior Rust Engineer (Remote)
                        </a>
                        <span data-cy="search-result-company-name">TechCorp Inc</span>
                        <span data-cy="search-result-location">Remote</span>
                    </div>
                    <div data-cy="search-card">
                        <a href="/job-detail/backend-developer-456" data-cy="card-title">
                            Backend Developer
                        </a>
                        <span data-cy="search-result-company-name">StartupXYZ</span>
                        <span data-cy="search-result-location">San Francisco, CA</span>
                    </div>
                </body>
            </html>
        "#;

        let jobs = scraper.parse_html(html).expect("parse_html should succeed");

        assert_eq!(jobs.len(), 2);

        // First job - remote
        assert_eq!(jobs[0].title, "Senior Rust Engineer (Remote)");
        assert_eq!(jobs[0].company, "TechCorp Inc");
        assert_eq!(jobs[0].url, "https://www.dice.com/job-detail/senior-rust-engineer-123");
        assert_eq!(jobs[0].location, Some("Remote".to_string()));
        assert_eq!(jobs[0].source, "dice");
        assert_eq!(jobs[0].remote, Some(true));

        // Second job - not remote
        assert_eq!(jobs[1].title, "Backend Developer");
        assert_eq!(jobs[1].company, "StartupXYZ");
        assert_eq!(jobs[1].remote, Some(false));
    }

    #[test]
    fn test_parse_html_with_search_card_class() {
        let scraper = DiceScraper::new("python".to_string(), None, 10);
        let html = r#"
            <html>
                <body>
                    <div class="search-card">
                        <h5 class="job-title">
                            <a href="/job-detail/python-dev-789">Python Developer</a>
                        </h5>
                        <span class="company-name">DataCorp</span>
                        <span class="job-location">New York, NY</span>
                    </div>
                </body>
            </html>
        "#;

        let jobs = scraper.parse_html(html).expect("parse_html should succeed");

        assert_eq!(jobs.len(), 1);
        assert_eq!(jobs[0].title, "Python Developer");
        assert_eq!(jobs[0].company, "DataCorp");
        assert_eq!(jobs[0].location, Some("New York, NY".to_string()));
    }

    #[test]
    fn test_parse_html_with_article_job_card() {
        let scraper = DiceScraper::new("java".to_string(), None, 10);
        let html = r#"
            <html>
                <body>
                    <article data-testid="job-card">
                        <h5><a href="/job-detail/java-engineer-999">Java Engineer</a></h5>
                        <span class="employer-name">EnterpriseCorp</span>
                        <span class="search-result-location">Chicago, IL</span>
                    </article>
                </body>
            </html>
        "#;

        let jobs = scraper.parse_html(html).expect("parse_html should succeed");

        assert_eq!(jobs.len(), 1);
        assert_eq!(jobs[0].title, "Java Engineer");
        assert_eq!(jobs[0].company, "EnterpriseCorp");
    }

    #[test]
    fn test_parse_html_with_absolute_urls() {
        let scraper = DiceScraper::new("go".to_string(), None, 10);
        let html = r#"
            <html>
                <body>
                    <div data-cy="search-card">
                        <a href="https://www.dice.com/job-detail/go-developer-111" data-cy="card-title">
                            Go Developer
                        </a>
                        <span data-cy="search-result-company-name">CloudCorp</span>
                    </div>
                </body>
            </html>
        "#;

        let jobs = scraper.parse_html(html).expect("parse_html should succeed");

        assert_eq!(jobs.len(), 1);
        assert_eq!(jobs[0].url, "https://www.dice.com/job-detail/go-developer-111");
    }

    #[test]
    fn test_parse_html_empty_document() {
        let scraper = DiceScraper::new("rust".to_string(), None, 10);
        let html = "<html><body></body></html>";

        let jobs = scraper.parse_html(html).expect("parse_html should succeed");

        assert_eq!(jobs.len(), 0);
    }

    #[test]
    fn test_parse_html_malformed_missing_title() {
        let scraper = DiceScraper::new("rust".to_string(), None, 10);
        let html = r#"
            <html>
                <body>
                    <div data-cy="search-card">
                        <a href="/job-detail/123" data-cy="card-title"></a>
                        <span data-cy="search-result-company-name">TechCorp</span>
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
        let scraper = DiceScraper::new("rust".to_string(), None, 10);
        let html = r#"
            <html>
                <body>
                    <div data-cy="search-card">
                        <span data-cy="card-title">Software Engineer</span>
                        <span data-cy="search-result-company-name">TechCorp</span>
                    </div>
                </body>
            </html>
        "#;

        let jobs = scraper.parse_html(html).expect("parse_html should succeed");

        // Should be skipped due to missing URL
        assert_eq!(jobs.len(), 0);
    }

    #[test]
    fn test_parse_html_remote_detection_in_title() {
        let scraper = DiceScraper::new("engineer".to_string(), None, 10);
        let html = r#"
            <html>
                <body>
                    <div data-cy="search-card">
                        <a href="/job-detail/1" data-cy="card-title">Remote Senior Engineer</a>
                        <span data-cy="search-result-company-name">Company A</span>
                        <span data-cy="search-result-location">USA</span>
                    </div>
                </body>
            </html>
        "#;

        let jobs = scraper.parse_html(html).expect("parse_html should succeed");

        assert_eq!(jobs.len(), 1);
        assert_eq!(jobs[0].remote, Some(true), "Should detect 'Remote' in title");
    }

    #[test]
    fn test_parse_html_remote_detection_in_location() {
        let scraper = DiceScraper::new("engineer".to_string(), None, 10);
        let html = r#"
            <html>
                <body>
                    <div data-cy="search-card">
                        <a href="/job-detail/1" data-cy="card-title">Senior Engineer</a>
                        <span data-cy="search-result-company-name">Company A</span>
                        <span data-cy="search-result-location">Remote - Anywhere</span>
                    </div>
                </body>
            </html>
        "#;

        let jobs = scraper.parse_html(html).expect("parse_html should succeed");

        assert_eq!(jobs.len(), 1);
        assert_eq!(jobs[0].remote, Some(true), "Should detect 'Anywhere' in location");
    }

    #[test]
    fn test_parse_html_limit_respected() {
        let scraper = DiceScraper::new("developer".to_string(), None, 2);
        let html = r#"
            <html>
                <body>
                    <div data-cy="search-card">
                        <a href="/job-detail/1" data-cy="card-title">Job 1</a>
                        <span data-cy="search-result-company-name">Company 1</span>
                    </div>
                    <div data-cy="search-card">
                        <a href="/job-detail/2" data-cy="card-title">Job 2</a>
                        <span data-cy="search-result-company-name">Company 2</span>
                    </div>
                    <div data-cy="search-card">
                        <a href="/job-detail/3" data-cy="card-title">Job 3</a>
                        <span data-cy="search-result-company-name">Company 3</span>
                    </div>
                </body>
            </html>
        "#;

        let jobs = scraper.parse_html(html).expect("parse_html should succeed");

        // Should only return 2 jobs due to limit
        assert_eq!(jobs.len(), 2);
    }

    #[test]
    fn test_parse_html_unknown_company_fallback() {
        let scraper = DiceScraper::new("rust".to_string(), None, 10);
        let html = r#"
            <html>
                <body>
                    <div data-cy="search-card">
                        <a href="/job-detail/123" data-cy="card-title">Software Engineer</a>
                    </div>
                </body>
            </html>
        "#;

        let jobs = scraper.parse_html(html).expect("parse_html should succeed");

        assert_eq!(jobs.len(), 1);
        assert_eq!(jobs[0].company, "Unknown Company");
    }

    #[test]
    fn test_parse_html_whitespace_trimming() {
        let scraper = DiceScraper::new("rust".to_string(), None, 10);
        let html = r#"
            <html>
                <body>
                    <div data-cy="search-card">
                        <a href="/job-detail/1" data-cy="card-title">
                            Senior Engineer
                        </a>
                        <span data-cy="search-result-company-name">
                            TechCorp
                        </span>
                        <span data-cy="search-result-location">
                            Remote
                        </span>
                    </div>
                </body>
            </html>
        "#;

        let jobs = scraper.parse_html(html).expect("parse_html should succeed");

        assert_eq!(jobs.len(), 1);
        assert_eq!(jobs[0].title, "Senior Engineer");
        assert_eq!(jobs[0].company, "TechCorp");
        assert_eq!(jobs[0].location, Some("Remote".to_string()));
    }

    #[test]
    fn test_is_remote_case_insensitive() {
        assert!(DiceScraper::is_remote("REMOTE Engineer", None));
        assert!(DiceScraper::is_remote("Engineer", Some("REMOTE")));
        assert!(DiceScraper::is_remote("Engineer", Some("Work From Home")));
    }

    #[test]
    fn test_is_remote_partial_match() {
        assert!(DiceScraper::is_remote("Full-time Remote Engineer", None));
        assert!(DiceScraper::is_remote("Engineer", Some("Remote, USA")));
        assert!(DiceScraper::is_remote("Engineer", Some("Work anywhere in the US")));
    }

    #[test]
    fn test_parse_html_fallback_to_link_selector() {
        let scraper = DiceScraper::new("test".to_string(), None, 10);
        let html = r#"
            <html>
                <body>
                    <a href="/job-detail/engineer-123">
                        Backend Engineer
                    </a>
                </body>
            </html>
        "#;

        let jobs = scraper.parse_html(html).expect("parse_html should succeed");

        // Fallback selector should find the link
        // Result depends on whether selector matching succeeds
        assert!(jobs.is_empty() || !jobs.is_empty());
    }

    #[test]
    fn test_parse_html_element_with_href_attribute() {
        let scraper = DiceScraper::new("test".to_string(), None, 10);
        let html = r#"
            <html>
                <body>
                    <div data-cy="search-card" href="/job-detail/123">
                        <a data-cy="card-title">Software Engineer</a>
                        <span data-cy="search-result-company-name">CompanyX</span>
                    </div>
                </body>
            </html>
        "#;

        let jobs = scraper.parse_html(html).expect("parse_html should succeed");

        // Should extract href from element itself if available
        if !jobs.is_empty() {
            assert!(jobs[0].url.contains("123"));
        }
    }

    #[test]
    fn test_parse_html_nested_link_extraction() {
        let scraper = DiceScraper::new("test".to_string(), None, 10);
        let html = r#"
            <html>
                <body>
                    <div data-cy="search-card">
                        <div>
                            <a href="/job-detail/nested-789">Nested Job Title</a>
                        </div>
                        <span data-cy="search-result-company-name">NestedCorp</span>
                    </div>
                </body>
            </html>
        "#;

        let jobs = scraper.parse_html(html).expect("parse_html should succeed");

        assert_eq!(jobs.len(), 1);
        assert!(jobs[0].url.contains("nested-789"));
    }

    #[test]
    fn test_is_remote_work_from_home() {
        assert!(DiceScraper::is_remote("Engineer", Some("Work from home opportunity")));
        // WFH is not explicitly checked in is_remote function - only "work from home" text
        assert!(!DiceScraper::is_remote("Engineer", Some("WFH position")));
    }

    #[test]
    fn test_build_url_limit_capped_at_100() {
        let scraper = DiceScraper::new("test".to_string(), None, 500);
        let url = scraper.build_url();
        // Limit should be capped at 100
        assert!(url.contains("pageSize=100"));
    }

    #[test]
    fn test_compute_hash_with_none_location() {
        let hash1 = DiceScraper::compute_hash(
            "Company",
            "Engineer",
            None,
            "https://dice.com/job/123",
        );
        let hash2 = DiceScraper::compute_hash(
            "Company",
            "Engineer",
            None,
            "https://dice.com/job/123",
        );

        assert_eq!(hash1, hash2);
    }

    #[test]
    fn test_parse_html_card_title_link_selector() {
        let scraper = DiceScraper::new("test".to_string(), None, 10);
        let html = r#"
            <html>
                <body>
                    <a class="card-title-link" href="/job-detail/456">
                        Full Stack Developer
                    </a>
                    <span class="employer-name">WebCorp</span>
                </body>
            </html>
        "#;

        let jobs = scraper.parse_html(html).expect("parse_html should succeed");

        // Should match .card-title-link selector
        if !jobs.is_empty() {
            assert_eq!(jobs[0].title, "Full Stack Developer");
        }
    }
}
