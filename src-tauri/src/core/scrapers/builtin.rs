//! BuiltIn Job Scraper
//!
//! Scrapes tech jobs from BuiltIn's city-specific job boards.
//! BuiltIn covers tech hubs like NYC, LA, Chicago, Austin, Boston, etc.

use super::http_client::get_client;
use super::{JobScraper, ScraperResult};
use crate::core::db::Job;
use anyhow::Result;
use async_trait::async_trait;
use chrono::Utc;
use scraper::{Html, Selector};
use sha2::{Digest, Sha256};

/// BuiltIn job scraper
pub struct BuiltInScraper {
    /// City to search (e.g., "nyc", "la", "chicago", "austin", "boston", "seattle")
    pub city: String,
    /// Job category (e.g., "dev-engineering", "data", "design")
    pub category: Option<String>,
    /// Maximum results to return
    pub limit: usize,
}

impl BuiltInScraper {
    pub fn new(city: String, category: Option<String>, limit: usize) -> Self {
        Self {
            city,
            category,
            limit,
        }
    }

    /// Build the search URL
    fn build_url(&self) -> String {
        let base = format!("https://builtin.com/{}/jobs", self.city);
        match &self.category {
            Some(cat) => format!("{}/{}", base, cat),
            None => base,
        }
    }

    /// Fetch and parse jobs from BuiltIn
    async fn fetch_jobs(&self) -> ScraperResult {
        tracing::info!("Fetching jobs from BuiltIn ({})", self.city);

        let client = get_client();
        let url = self.build_url();

        let response = client
            .get(&url)
            .header(
                "User-Agent",
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            )
            .header("Accept", "text/html,application/xhtml+xml")
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!(
                "BuiltIn request failed: {}",
                response.status()
            ));
        }

        let html = response.text().await?;
        let jobs = self.parse_html(&html)?;

        tracing::info!("Found {} jobs from BuiltIn", jobs.len());
        Ok(jobs)
    }

    /// Parse HTML to extract job listings
    fn parse_html(&self, html: &str) -> Result<Vec<Job>> {
        let document = Html::parse_document(html);
        let mut jobs = Vec::new();

        // BuiltIn uses various selectors for job cards
        let job_selector = Selector::parse("[data-id='job-card'], .job-card, article.job-listing")
            .or_else(|_| Selector::parse("article"))
            .expect("fallback selector 'article' is valid CSS");

        let title_selector = Selector::parse("[data-id='job-title'], .job-title, h2 a")
            .or_else(|_| Selector::parse("h2"))
            .expect("fallback selector 'h2' is valid CSS");

        let company_selector = Selector::parse("[data-id='company-name'], .company-name, .company")
            .or_else(|_| Selector::parse("span"))
            .expect("fallback selector 'span' is valid CSS");

        let link_selector = Selector::parse("a[href*='/job/']")
            .or_else(|_| Selector::parse("a"))
            .expect("fallback selector 'a' is valid CSS");

        let location_selector = Selector::parse(".job-location, .location")
            .or_else(|_| Selector::parse(".location"))
            .expect("fallback selector '.location' is valid CSS");

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
                .unwrap_or_else(|| "Unknown Company".to_string());

            let url = job_element
                .select(&link_selector)
                .next()
                .and_then(|el| el.value().attr("href"))
                .map(|href| {
                    if href.starts_with("http") {
                        href.to_string()
                    } else {
                        format!("https://builtin.com{}", href)
                    }
                })
                .unwrap_or_default();

            let location = job_element
                .select(&location_selector)
                .next()
                .map(|el| el.text().collect::<String>().trim().to_string());

            if title.is_empty() || url.is_empty() {
                continue;
            }

            // Determine if remote based on location text
            let remote = location
                .as_ref()
                .map(|l| {
                    let lower = l.to_lowercase();
                    lower.contains("remote") || lower.contains("anywhere")
                })
                .unwrap_or(false);

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
                source: "builtin".to_string(),
                remote: Some(remote),
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
impl JobScraper for BuiltInScraper {
    async fn scrape(&self) -> ScraperResult {
        self.fetch_jobs().await
    }

    fn name(&self) -> &'static str {
        "builtin"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_url_basic() {
        let scraper = BuiltInScraper::new("nyc".to_string(), None, 10);
        assert_eq!(scraper.build_url(), "https://builtin.com/nyc/jobs");
    }

    #[test]
    fn test_build_url_with_category() {
        let scraper =
            BuiltInScraper::new("chicago".to_string(), Some("dev-engineering".to_string()), 10);
        assert_eq!(
            scraper.build_url(),
            "https://builtin.com/chicago/jobs/dev-engineering"
        );
    }

    #[test]
    fn test_scraper_name() {
        let scraper = BuiltInScraper::new("austin".to_string(), None, 10);
        assert_eq!(scraper.name(), "builtin");
    }

    #[test]
    fn test_compute_hash_deterministic() {
        let hash1 = BuiltInScraper::compute_hash(
            "TechCorp",
            "Senior Engineer",
            Some("New York, NY"),
            "https://builtin.com/job/123",
        );
        let hash2 = BuiltInScraper::compute_hash(
            "TechCorp",
            "Senior Engineer",
            Some("New York, NY"),
            "https://builtin.com/job/123",
        );

        assert_eq!(hash1, hash2);
        assert_eq!(hash1.len(), 64);
    }

    #[test]
    fn test_parse_html_with_job_cards() {
        let scraper = BuiltInScraper::new("nyc".to_string(), None, 10);
        let html = r#"
            <html>
                <body>
                    <article class="job-listing">
                        <h2><a href="/job/senior-rust-engineer-123">Senior Rust Engineer</a></h2>
                        <span class="company-name">TechCorp Inc</span>
                        <div class="job-location">New York, NY</div>
                    </article>
                    <article class="job-listing">
                        <h2><a href="/job/frontend-developer-456">Frontend Developer (Remote)</a></h2>
                        <span class="company-name">StartupXYZ</span>
                        <div class="job-location">Remote</div>
                    </article>
                </body>
            </html>
        "#;

        let jobs = scraper.parse_html(html).expect("parse_html should succeed");

        assert_eq!(jobs.len(), 2);

        // First job
        assert_eq!(jobs[0].title, "Senior Rust Engineer");
        assert_eq!(jobs[0].company, "TechCorp Inc");
        assert_eq!(jobs[0].url, "https://builtin.com/job/senior-rust-engineer-123");
        assert_eq!(jobs[0].location, Some("New York, NY".to_string()));
        assert_eq!(jobs[0].source, "builtin");
        assert_eq!(jobs[0].remote, Some(false));

        // Second job - should detect remote
        assert_eq!(jobs[1].title, "Frontend Developer (Remote)");
        assert_eq!(jobs[1].company, "StartupXYZ");
        assert_eq!(jobs[1].remote, Some(true));
    }

    #[test]
    fn test_parse_html_with_data_id_attributes() {
        let scraper = BuiltInScraper::new("boston".to_string(), None, 10);
        let html = r#"
            <html>
                <body>
                    <div data-id="job-card">
                        <h2 data-id="job-title"><a href="/job/devops-engineer-789">DevOps Engineer</a></h2>
                        <span data-id="company-name">CloudTech</span>
                        <div class="job-location">Boston, MA</div>
                    </div>
                </body>
            </html>
        "#;

        let jobs = scraper.parse_html(html).expect("parse_html should succeed");

        assert_eq!(jobs.len(), 1);
        assert_eq!(jobs[0].title, "DevOps Engineer");
        assert_eq!(jobs[0].company, "CloudTech");
        assert_eq!(jobs[0].location, Some("Boston, MA".to_string()));
    }

    #[test]
    fn test_parse_html_with_absolute_urls() {
        let scraper = BuiltInScraper::new("chicago".to_string(), None, 10);
        let html = r#"
            <html>
                <body>
                    <article class="job-listing">
                        <h2><a href="https://external-site.com/job/123">External Job</a></h2>
                        <span class="company-name">ExternalCorp</span>
                        <div class="job-location">Chicago, IL</div>
                    </article>
                </body>
            </html>
        "#;

        let jobs = scraper.parse_html(html).expect("parse_html should succeed");

        assert_eq!(jobs.len(), 1);
        assert_eq!(jobs[0].url, "https://external-site.com/job/123");
    }

    #[test]
    fn test_parse_html_empty_document() {
        let scraper = BuiltInScraper::new("nyc".to_string(), None, 10);
        let html = "<html><body></body></html>";

        let jobs = scraper.parse_html(html).expect("parse_html should succeed");

        assert_eq!(jobs.len(), 0);
    }

    #[test]
    fn test_parse_html_malformed_missing_title() {
        let scraper = BuiltInScraper::new("nyc".to_string(), None, 10);
        let html = r#"
            <html>
                <body>
                    <article class="job-listing">
                        <h2><a href="/job/123"></a></h2>
                        <span class="company-name">TechCorp</span>
                    </article>
                </body>
            </html>
        "#;

        let jobs = scraper.parse_html(html).expect("parse_html should succeed");

        // Should be skipped due to empty title
        assert_eq!(jobs.len(), 0);
    }

    #[test]
    fn test_parse_html_malformed_missing_url() {
        let scraper = BuiltInScraper::new("nyc".to_string(), None, 10);
        let html = r#"
            <html>
                <body>
                    <article class="job-listing">
                        <h2>Software Engineer</h2>
                        <span class="company-name">TechCorp</span>
                    </article>
                </body>
            </html>
        "#;

        let jobs = scraper.parse_html(html).expect("parse_html should succeed");

        // Should be skipped due to missing URL
        assert_eq!(jobs.len(), 0);
    }

    #[test]
    fn test_parse_html_remote_detection() {
        let scraper = BuiltInScraper::new("austin".to_string(), None, 10);
        let html = r#"
            <html>
                <body>
                    <article class="job-listing">
                        <h2><a href="/job/1">Job 1</a></h2>
                        <span class="company-name">Company A</span>
                        <div class="job-location">Remote</div>
                    </article>
                    <article class="job-listing">
                        <h2><a href="/job/2">Job 2</a></h2>
                        <span class="company-name">Company B</span>
                        <div class="job-location">Work from anywhere</div>
                    </article>
                    <article class="job-listing">
                        <h2><a href="/job/3">Job 3</a></h2>
                        <span class="company-name">Company C</span>
                        <div class="job-location">Austin, TX</div>
                    </article>
                </body>
            </html>
        "#;

        let jobs = scraper.parse_html(html).expect("parse_html should succeed");

        assert_eq!(jobs.len(), 3);
        assert_eq!(jobs[0].remote, Some(true), "Should detect 'Remote'");
        assert_eq!(jobs[1].remote, Some(true), "Should detect 'anywhere'");
        assert_eq!(jobs[2].remote, Some(false), "Should not be remote");
    }

    #[test]
    fn test_parse_html_limit_respected() {
        let scraper = BuiltInScraper::new("seattle".to_string(), None, 2);
        let html = r#"
            <html>
                <body>
                    <article class="job-listing">
                        <h2><a href="/job/1">Job 1</a></h2>
                        <span class="company-name">Company 1</span>
                    </article>
                    <article class="job-listing">
                        <h2><a href="/job/2">Job 2</a></h2>
                        <span class="company-name">Company 2</span>
                    </article>
                    <article class="job-listing">
                        <h2><a href="/job/3">Job 3</a></h2>
                        <span class="company-name">Company 3</span>
                    </article>
                </body>
            </html>
        "#;

        let jobs = scraper.parse_html(html).expect("parse_html should succeed");

        // Should only return 2 jobs due to limit
        assert_eq!(jobs.len(), 2);
    }

    #[test]
    fn test_parse_html_unknown_company_fallback() {
        let scraper = BuiltInScraper::new("nyc".to_string(), None, 10);
        let html = r#"
            <html>
                <body>
                    <article class="job-listing">
                        <h2><a href="/job/123">Software Engineer</a></h2>
                    </article>
                </body>
            </html>
        "#;

        let jobs = scraper.parse_html(html).expect("parse_html should succeed");

        assert_eq!(jobs.len(), 1);
        assert_eq!(jobs[0].company, "Unknown Company");
    }

    #[test]
    fn test_parse_html_whitespace_trimming() {
        let scraper = BuiltInScraper::new("sf".to_string(), None, 10);
        let html = r#"
            <html>
                <body>
                    <article class="job-listing">
                        <h2><a href="/job/1">
                            Senior Engineer
                        </a></h2>
                        <span class="company-name">
                            TechCorp
                        </span>
                        <div class="job-location">
                            San Francisco, CA
                        </div>
                    </article>
                </body>
            </html>
        "#;

        let jobs = scraper.parse_html(html).expect("parse_html should succeed");

        assert_eq!(jobs.len(), 1);
        assert_eq!(jobs[0].title, "Senior Engineer");
        assert_eq!(jobs[0].company, "TechCorp");
        assert_eq!(jobs[0].location, Some("San Francisco, CA".to_string()));
    }
}
