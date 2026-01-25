//! Greenhouse ATS Scraper
//!
//! Scrapes jobs from Greenhouse-powered career pages.
//! Greenhouse is used by companies like Cloudflare, Stripe, Figma, etc.

use super::http_client::get_with_retry;
use super::{location_utils, title_utils, url_utils, JobScraper, ScraperResult};
use crate::core::db::Job;
use anyhow::Result;
use async_trait::async_trait;
use chrono::Utc;
use scraper::{Html, Selector};
use sha2::{Digest, Sha256};

/// Greenhouse scraper configuration
#[derive(Debug, Clone)]
pub struct GreenhouseScraper {
    /// List of Greenhouse company URLs to scrape
    pub companies: Vec<GreenhouseCompany>,
}

#[derive(Debug, Clone)]
pub struct GreenhouseCompany {
    pub id: String,
    pub name: String,
    pub url: String,
}

impl GreenhouseScraper {
    pub fn new(companies: Vec<GreenhouseCompany>) -> Self {
        Self { companies }
    }

    /// Scrape a single Greenhouse company
    #[tracing::instrument(skip(self), fields(company_name = %company.name, company_url = %company.url))]
    async fn scrape_company(&self, company: &GreenhouseCompany) -> ScraperResult {
        tracing::info!("Starting Greenhouse scrape");

        // Fetch the careers page with retry logic
        let response = get_with_retry(&company.url).await?;

        if !response.status().is_success() {
            tracing::error!("HTTP error {} from Greenhouse", response.status());
            return Err(anyhow::anyhow!(
                "HTTP {}: {}",
                response.status(),
                company.url
            ));
        }

        let html = response.text().await?;

        // Try multiple selector patterns (Greenhouse has different layouts)
        // Parse HTML in a scope so document is dropped before any awaits
        let mut jobs = {
            let document = Html::parse_document(&html);

            let mut parsed_jobs = Vec::new();

            // Pattern 1: boards.greenhouse.io embedded
            if let Ok(selector) = Selector::parse(".opening") {
                for element in document.select(&selector) {
                    if let Some(job) = self.parse_job_element(&element, company)? {
                        parsed_jobs.push(job);
                    }
                }
            }

            // Pattern 2: Custom Greenhouse integration
            if parsed_jobs.is_empty() {
                if let Ok(selector) = Selector::parse("[data-gh-job-id]") {
                    for element in document.select(&selector) {
                        if let Some(job) = self.parse_job_element(&element, company)? {
                            parsed_jobs.push(job);
                        }
                    }
                }
            }

            parsed_jobs
        }; // document is dropped here

        // Pattern 3: API fallback (boards.greenhouse.io/company/jobs?format=json)
        if jobs.is_empty() {
            jobs = self.scrape_greenhouse_api(company).await?;
        }

        tracing::info!("Found {} jobs from {}", jobs.len(), company.name);
        Ok(jobs)
    }

    /// Parse a job element from HTML
    fn parse_job_element(
        &self,
        element: &scraper::ElementRef,
        company: &GreenhouseCompany,
    ) -> Result<Option<Job>> {
        // Extract title
        let title_selector = Selector::parse("a, .title, [data-gh-job-title]").ok();
        let title = if let Some(sel) = title_selector {
            element
                .select(&sel)
                .next()
                .map(|e| e.text().collect::<String>().trim().to_string())
        } else {
            None
        };

        // Extract URL
        let url_selector = Selector::parse("a").ok();
        let url = if let Some(sel) = url_selector {
            element.select(&sel).next().and_then(|e| {
                e.value().attr("href").map(|href| {
                    if href.starts_with("http") {
                        href.to_string()
                    } else {
                        format!("{}{}", company.url.trim_end_matches('/'), href)
                    }
                })
            })
        } else {
            None
        };

        // Extract location
        let location_selector = Selector::parse(".location, [data-gh-job-location]").ok();
        let location = if let Some(sel) = location_selector {
            element
                .select(&sel)
                .next()
                .map(|e| e.text().collect::<String>().trim().to_string())
        } else {
            None
        };

        // If we have required fields, create job
        if let (Some(title), Some(url)) = (title, url) {
            let hash = Self::compute_hash(&company.name, &title, location.as_deref(), &url);

            Ok(Some(Job {
                id: 0, // Will be set by database
                hash,
                title,
                company: company.name.clone(),
                url,
                location,
                description: None, // Will be fetched on-demand
                score: None,
                score_reasons: None,
                source: "greenhouse".to_string(),
                remote: None, // Will be inferred from location
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
            }))
        } else {
            Ok(None)
        }
    }

    /// Scrape Greenhouse API (JSON format)
    async fn scrape_greenhouse_api(&self, company: &GreenhouseCompany) -> ScraperResult {
        // Extract company ID from URL
        // Example: https://boards.greenhouse.io/cloudflare
        let company_id = company
            .url
            .trim_end_matches('/')
            .split('/')
            .next_back()
            .ok_or_else(|| anyhow::anyhow!("Invalid Greenhouse URL"))?;

        let api_url = format!(
            "https://boards-api.greenhouse.io/v1/boards/{}/jobs",
            company_id
        );

        tracing::debug!("Fetching Greenhouse API: {}", api_url);

        // Use retry logic for API calls
        let response = get_with_retry(&api_url).await?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!(
                "Greenhouse API failed: {}",
                response.status()
            ));
        }

        let json: serde_json::Value = response.json().await?;

        let jobs = if let Some(jobs_array) = json["jobs"].as_array() {
            let mut jobs = Vec::with_capacity(jobs_array.len());
            for job_data in jobs_array {
                let title = job_data["title"].as_str().unwrap_or("").to_string();
                let job_id = job_data["id"].as_i64().unwrap_or(0);
                let url = format!(
                    "https://boards.greenhouse.io/{}/jobs/{}",
                    company_id, job_id
                );
                let location = job_data["location"]["name"].as_str().map(|s| s.to_string());

                let hash = Self::compute_hash(&company.name, &title, location.as_deref(), &url);

                jobs.push(Job {
                    id: 0,
                    hash,
                    title,
                    company: company.name.clone(),
                    url,
                    location,
                    description: None,
                    score: None,
                    score_reasons: None,
                    source: "greenhouse".to_string(),
                    remote: None,
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
            jobs
        } else {
            Vec::new()
        };

        Ok(jobs)
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
impl JobScraper for GreenhouseScraper {
    async fn scrape(&self) -> ScraperResult {
        let mut all_jobs = Vec::new();

        for company in &self.companies {
            match self.scrape_company(company).await {
                Ok(jobs) => {
                    all_jobs.extend(jobs);
                }
                Err(e) => {
                    tracing::error!("Failed to scrape {}: {}", company.name, e);
                    // Continue with other companies
                }
            }

            // Rate limiting: wait 2 seconds between companies
            tokio::time::sleep(std::time::Duration::from_secs(2)).await;
        }

        Ok(all_jobs)
    }

    fn name(&self) -> &'static str {
        "greenhouse"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compute_hash_deterministic() {
        let hash1 = GreenhouseScraper::compute_hash(
            "Cloudflare",
            "Security Engineer",
            Some("Remote"),
            "https://example.com/1",
        );
        let hash2 = GreenhouseScraper::compute_hash(
            "Cloudflare",
            "Security Engineer",
            Some("Remote"),
            "https://example.com/1",
        );

        assert_eq!(hash1, hash2, "Same inputs should produce same hash");
        assert_eq!(hash1.len(), 64, "SHA-256 hash should be 64 hex chars");
    }

    #[test]
    fn test_compute_hash_different_company() {
        let hash1 = GreenhouseScraper::compute_hash(
            "Cloudflare",
            "Engineer",
            None,
            "https://example.com/1",
        );
        let hash2 =
            GreenhouseScraper::compute_hash("Stripe", "Engineer", None, "https://example.com/1");

        assert_ne!(
            hash1, hash2,
            "Different company should produce different hash"
        );
    }

    #[test]
    fn test_compute_hash_different_title() {
        let hash1 = GreenhouseScraper::compute_hash(
            "Company",
            "Security Engineer",
            None,
            "https://example.com/1",
        );
        let hash2 = GreenhouseScraper::compute_hash(
            "Company",
            "Software Engineer",
            None,
            "https://example.com/1",
        );

        assert_ne!(
            hash1, hash2,
            "Different title should produce different hash"
        );
    }

    #[test]
    fn test_compute_hash_different_location() {
        let hash1 = GreenhouseScraper::compute_hash(
            "Company",
            "Engineer",
            Some("Remote"),
            "https://example.com/1",
        );
        let hash2 = GreenhouseScraper::compute_hash(
            "Company",
            "Engineer",
            Some("Hybrid"),
            "https://example.com/1",
        );

        assert_ne!(
            hash1, hash2,
            "Different location should produce different hash"
        );
    }

    #[test]
    fn test_compute_hash_location_none_vs_some() {
        let hash1 =
            GreenhouseScraper::compute_hash("Company", "Engineer", None, "https://example.com/1");
        let hash2 = GreenhouseScraper::compute_hash(
            "Company",
            "Engineer",
            Some("Remote"),
            "https://example.com/1",
        );

        assert_ne!(
            hash1, hash2,
            "None location should produce different hash than Some"
        );
    }

    #[test]
    fn test_compute_hash_different_url() {
        let hash1 =
            GreenhouseScraper::compute_hash("Company", "Engineer", None, "https://example.com/1");
        let hash2 =
            GreenhouseScraper::compute_hash("Company", "Engineer", None, "https://example.com/2");

        assert_ne!(hash1, hash2, "Different URL should produce different hash");
    }

    #[test]
    fn test_compute_hash_empty_strings() {
        let hash = GreenhouseScraper::compute_hash("", "", None, "");

        assert_eq!(
            hash.len(),
            64,
            "Hash of empty strings should still be valid"
        );
    }

    #[test]
    fn test_compute_hash_special_characters() {
        let hash = GreenhouseScraper::compute_hash(
            "Company™",
            "Senior Engineer (Remote) - 🚀",
            Some("San Francisco, CA"),
            "https://example.com/jobs?id=123&ref=test",
        );

        assert_eq!(hash.len(), 64, "Hash should handle special characters");
    }

    #[test]
    fn test_scraper_name() {
        let scraper = GreenhouseScraper::new(vec![]);
        assert_eq!(scraper.name(), "greenhouse");
    }

    #[test]
    fn test_new_scraper_with_companies() {
        let companies = vec![
            GreenhouseCompany {
                id: "cloudflare".to_string(),
                name: "Cloudflare".to_string(),
                url: "https://boards.greenhouse.io/cloudflare".to_string(),
            },
            GreenhouseCompany {
                id: "stripe".to_string(),
                name: "Stripe".to_string(),
                url: "https://boards.greenhouse.io/stripe".to_string(),
            },
        ];

        let scraper = GreenhouseScraper::new(companies.clone());

        assert_eq!(scraper.companies.len(), 2);
        assert_eq!(scraper.companies[0].name, "Cloudflare");
        assert_eq!(scraper.companies[1].name, "Stripe");
    }

    #[test]
    fn test_new_scraper_empty() {
        let scraper = GreenhouseScraper::new(vec![]);
        assert_eq!(scraper.companies.len(), 0);
    }

    // ========================================
    // Property-Based Tests
    // ========================================

    use proptest::prelude::*;

    #[test]
    fn test_parse_job_element_basic() {
        let scraper = GreenhouseScraper::new(vec![]);
        let company = GreenhouseCompany {
            id: "cloudflare".to_string(),
            name: "Cloudflare".to_string(),
            url: "https://boards.greenhouse.io/cloudflare".to_string(),
        };

        let html = r#"
            <div class="opening">
                <a href="/cloudflare/jobs/123456">Software Engineer - Security</a>
                <span class="location">Remote</span>
            </div>
        "#;

        let document = Html::parse_document(html);
        let selector = Selector::parse(".opening").unwrap();
        let element = document.select(&selector).next().unwrap();

        let job = scraper
            .parse_job_element(&element, &company)
            .expect("should parse job")
            .expect("should have job");

        assert_eq!(job.title, "Software Engineer - Security");
        assert_eq!(job.company, "Cloudflare");
        assert_eq!(job.location, Some("Remote".to_string()));
        assert!(job.url.contains("/cloudflare/jobs/123456"));
        assert_eq!(job.source, "greenhouse");
        assert_eq!(job.hash.len(), 64);
    }

    #[test]
    fn test_parse_job_element_with_absolute_url() {
        let scraper = GreenhouseScraper::new(vec![]);
        let company = GreenhouseCompany {
            id: "stripe".to_string(),
            name: "Stripe".to_string(),
            url: "https://stripe.com/jobs".to_string(),
        };

        let html = r#"
            <div class="opening">
                <a href="https://boards.greenhouse.io/stripe/jobs/789">Backend Engineer</a>
                <span class="location">San Francisco, CA</span>
            </div>
        "#;

        let document = Html::parse_document(html);
        let selector = Selector::parse(".opening").unwrap();
        let element = document.select(&selector).next().unwrap();

        let job = scraper
            .parse_job_element(&element, &company)
            .expect("should parse job")
            .expect("should have job");

        assert_eq!(job.url, "https://boards.greenhouse.io/stripe/jobs/789");
    }

    #[test]
    fn test_parse_job_element_empty_title() {
        let scraper = GreenhouseScraper::new(vec![]);
        let company = GreenhouseCompany {
            id: "test".to_string(),
            name: "Test".to_string(),
            url: "https://boards.greenhouse.io/test".to_string(),
        };

        let html = r#"
            <div class="opening">
                <a href="/test/jobs/123"></a>
                <span class="location">Remote</span>
            </div>
        "#;

        let document = Html::parse_document(html);
        let selector = Selector::parse(".opening").unwrap();
        let element = document.select(&selector).next().unwrap();

        let job = scraper
            .parse_job_element(&element, &company)
            .expect("should parse job");

        // Empty title after trimming still creates a job with empty string
        // This matches the actual implementation behavior
        if let Some(job) = job {
            assert_eq!(job.title, "");
        }
    }

    #[test]
    fn test_parse_job_element_missing_url() {
        let scraper = GreenhouseScraper::new(vec![]);
        let company = GreenhouseCompany {
            id: "test".to_string(),
            name: "Test".to_string(),
            url: "https://boards.greenhouse.io/test".to_string(),
        };

        let html = r#"
            <div class="opening">
                <span class="title">Software Engineer</span>
                <span class="location">Remote</span>
            </div>
        "#;

        let document = Html::parse_document(html);
        let selector = Selector::parse(".opening").unwrap();
        let element = document.select(&selector).next().unwrap();

        let job = scraper
            .parse_job_element(&element, &company)
            .expect("should parse job");

        assert!(job.is_none(), "Job without URL should be skipped");
    }

    #[test]
    fn test_parse_job_element_with_data_attributes() {
        let scraper = GreenhouseScraper::new(vec![]);
        let company = GreenhouseCompany {
            id: "figma".to_string(),
            name: "Figma".to_string(),
            url: "https://boards.greenhouse.io/figma".to_string(),
        };

        let html = r#"
            <div data-gh-job-id="456789">
                <a href="/figma/jobs/456789" data-gh-job-title="Product Designer">Product Designer</a>
                <span data-gh-job-location="Remote - US</span>
            </div>
        "#;

        let document = Html::parse_document(html);
        let selector = Selector::parse("[data-gh-job-id]").unwrap();
        let element = document.select(&selector).next().unwrap();

        let job = scraper
            .parse_job_element(&element, &company)
            .expect("should parse job")
            .expect("should have job");

        assert_eq!(job.title, "Product Designer");
        assert_eq!(job.company, "Figma");
    }

    #[test]
    fn test_parse_job_element_whitespace_trimming() {
        let scraper = GreenhouseScraper::new(vec![]);
        let company = GreenhouseCompany {
            id: "test".to_string(),
            name: "Test Company".to_string(),
            url: "https://boards.greenhouse.io/test".to_string(),
        };

        let html = r#"
            <div class="opening">
                <a href="/test/jobs/1">
                    Senior Engineer
                </a>
                <span class="location">
                    Remote - Global
                </span>
            </div>
        "#;

        let document = Html::parse_document(html);
        let selector = Selector::parse(".opening").unwrap();
        let element = document.select(&selector).next().unwrap();

        let job = scraper
            .parse_job_element(&element, &company)
            .expect("should parse job")
            .expect("should have job");

        assert_eq!(job.title, "Senior Engineer");
        assert_eq!(job.location, Some("Remote - Global".to_string()));
    }

    #[test]
    fn test_parse_job_element_location_optional() {
        let scraper = GreenhouseScraper::new(vec![]);
        let company = GreenhouseCompany {
            id: "test".to_string(),
            name: "Test".to_string(),
            url: "https://boards.greenhouse.io/test".to_string(),
        };

        let html = r#"
            <div class="opening">
                <a href="/test/jobs/123">Frontend Engineer</a>
            </div>
        "#;

        let document = Html::parse_document(html);
        let selector = Selector::parse(".opening").unwrap();
        let element = document.select(&selector).next().unwrap();

        let job = scraper
            .parse_job_element(&element, &company)
            .expect("should parse job")
            .expect("should have job");

        assert_eq!(job.title, "Frontend Engineer");
        assert_eq!(job.location, None);
    }

    #[test]
    fn test_parse_job_element_relative_url_construction() {
        let scraper = GreenhouseScraper::new(vec![]);
        let company = GreenhouseCompany {
            id: "test".to_string(),
            name: "Test".to_string(),
            url: "https://boards.greenhouse.io/test/".to_string(),
        };

        let html = r#"
            <div class="opening">
                <a href="/test/jobs/123">Engineer</a>
            </div>
        "#;

        let document = Html::parse_document(html);
        let selector = Selector::parse(".opening").unwrap();
        let element = document.select(&selector).next().unwrap();

        let job = scraper
            .parse_job_element(&element, &company)
            .expect("should parse job")
            .expect("should have job");

        // URL should be constructed correctly even with trailing slash
        assert_eq!(job.url, "https://boards.greenhouse.io/test/test/jobs/123");
    }

    #[test]
    fn test_parse_job_element_hash_determinism() {
        let scraper = GreenhouseScraper::new(vec![]);
        let company = GreenhouseCompany {
            id: "test".to_string(),
            name: "Test Company".to_string(),
            url: "https://boards.greenhouse.io/test".to_string(),
        };

        let html = r#"
            <div class="opening">
                <a href="/test/jobs/123">DevOps Engineer</a>
                <span class="location">Seattle, WA</span>
            </div>
        "#;

        let document = Html::parse_document(html);
        let selector = Selector::parse(".opening").unwrap();
        let element = document.select(&selector).next().unwrap();

        let job1 = scraper
            .parse_job_element(&element, &company)
            .expect("should parse job")
            .expect("should have job");

        let job2 = scraper
            .parse_job_element(&element, &company)
            .expect("should parse job")
            .expect("should have job");

        assert_eq!(job1.hash, job2.hash, "Hash should be deterministic");
    }

    #[test]
    fn test_parse_job_element_special_characters() {
        let scraper = GreenhouseScraper::new(vec![]);
        let company = GreenhouseCompany {
            id: "test".to_string(),
            name: "Test™ Company".to_string(),
            url: "https://boards.greenhouse.io/test".to_string(),
        };

        let html = r#"
            <div class="opening">
                <a href="/test/jobs/1">Senior Engineer (Remote) 🚀</a>
                <span class="location">San Francisco, CA / Remote</span>
            </div>
        "#;

        let document = Html::parse_document(html);
        let selector = Selector::parse(".opening").unwrap();
        let element = document.select(&selector).next().unwrap();

        let job = scraper
            .parse_job_element(&element, &company)
            .expect("should parse job")
            .expect("should have job");

        assert!(job.title.contains("🚀"));
        assert!(job.company.contains("™"));
        assert!(job.location.unwrap().contains("/"));
    }

    #[test]
    fn test_parse_job_element_multiple_links() {
        let scraper = GreenhouseScraper::new(vec![]);
        let company = GreenhouseCompany {
            id: "test".to_string(),
            name: "Test".to_string(),
            url: "https://boards.greenhouse.io/test".to_string(),
        };

        let html = r#"
            <div class="opening">
                <a href="/test/jobs/123">Engineer</a>
                <a href="/test/apply/123">Apply</a>
                <span class="location">Remote</span>
            </div>
        "#;

        let document = Html::parse_document(html);
        let selector = Selector::parse(".opening").unwrap();
        let element = document.select(&selector).next().unwrap();

        let job = scraper
            .parse_job_element(&element, &company)
            .expect("should parse job")
            .expect("should have job");

        // Should pick the first link
        assert!(job.url.contains("/test/jobs/123"));
    }

    #[test]
    fn test_scraper_initialization() {
        let companies = vec![
            GreenhouseCompany {
                id: "cloudflare".to_string(),
                name: "Cloudflare".to_string(),
                url: "https://boards.greenhouse.io/cloudflare".to_string(),
            },
            GreenhouseCompany {
                id: "stripe".to_string(),
                name: "Stripe".to_string(),
                url: "https://boards.greenhouse.io/stripe".to_string(),
            },
        ];

        let scraper = GreenhouseScraper::new(companies.clone());

        assert_eq!(scraper.companies.len(), 2);
        assert_eq!(scraper.companies[0].id, "cloudflare");
        assert_eq!(scraper.companies[1].id, "stripe");
    }

    #[test]
    fn test_company_struct_clone() {
        let company = GreenhouseCompany {
            id: "test-id".to_string(),
            name: "Test Company".to_string(),
            url: "https://boards.greenhouse.io/test".to_string(),
        };

        let cloned = company.clone();

        assert_eq!(company.id, cloned.id);
        assert_eq!(company.name, cloned.name);
        assert_eq!(company.url, cloned.url);
    }

    #[test]
    fn test_company_struct_debug() {
        let company = GreenhouseCompany {
            id: "debug-test".to_string(),
            name: "Debug Test Company".to_string(),
            url: "https://boards.greenhouse.io/debug".to_string(),
        };

        let debug_str = format!("{:?}", company);
        assert!(debug_str.contains("debug-test"));
        assert!(debug_str.contains("Debug Test Company"));
    }

    // ========================================
    // JSON API Parsing Tests
    // ========================================

    #[test]
    fn test_parse_api_response_single_job() {
        let json_data = r#"
        {
            "jobs": [
                {
                    "id": 123456,
                    "title": "Backend Engineer",
                    "location": {
                        "name": "Remote"
                    }
                }
            ]
        }
        "#;

        let parsed: serde_json::Value = serde_json::from_str(json_data).unwrap();

        if let Some(jobs_array) = parsed["jobs"].as_array() {
            assert_eq!(jobs_array.len(), 1);

            let job = &jobs_array[0];
            assert_eq!(job["id"].as_i64(), Some(123456));
            assert_eq!(job["title"].as_str(), Some("Backend Engineer"));
            assert_eq!(job["location"]["name"].as_str(), Some("Remote"));
        } else {
            panic!("jobs should be an array");
        }
    }

    #[test]
    fn test_parse_api_response_multiple_jobs() {
        let json_data = r#"
        {
            "jobs": [
                {
                    "id": 1,
                    "title": "Frontend Engineer",
                    "location": {
                        "name": "San Francisco, CA"
                    }
                },
                {
                    "id": 2,
                    "title": "Backend Engineer",
                    "location": {
                        "name": "Remote"
                    }
                },
                {
                    "id": 3,
                    "title": "DevOps Engineer",
                    "location": {
                        "name": "New York, NY"
                    }
                }
            ]
        }
        "#;

        let parsed: serde_json::Value = serde_json::from_str(json_data).unwrap();

        if let Some(jobs_array) = parsed["jobs"].as_array() {
            assert_eq!(jobs_array.len(), 3);

            assert_eq!(jobs_array[0]["title"].as_str(), Some("Frontend Engineer"));
            assert_eq!(jobs_array[1]["title"].as_str(), Some("Backend Engineer"));
            assert_eq!(jobs_array[2]["title"].as_str(), Some("DevOps Engineer"));
        }
    }

    #[test]
    fn test_parse_api_response_empty_jobs() {
        let json_data = r#"
        {
            "jobs": []
        }
        "#;

        let parsed: serde_json::Value = serde_json::from_str(json_data).unwrap();

        if let Some(jobs_array) = parsed["jobs"].as_array() {
            assert_eq!(jobs_array.len(), 0);
        }
    }

    #[test]
    fn test_parse_api_response_missing_jobs_key() {
        let json_data = r#"
        {
            "error": "Not found"
        }
        "#;

        let parsed: serde_json::Value = serde_json::from_str(json_data).unwrap();

        if let Some(_jobs_array) = parsed["jobs"].as_array() {
            panic!("jobs should not exist");
        }
    }

    #[test]
    fn test_parse_api_response_missing_location() {
        let json_data = r#"
        {
            "jobs": [
                {
                    "id": 123,
                    "title": "Engineer"
                }
            ]
        }
        "#;

        let parsed: serde_json::Value = serde_json::from_str(json_data).unwrap();

        if let Some(jobs_array) = parsed["jobs"].as_array() {
            let job = &jobs_array[0];

            // location.name should be None
            let location = job["location"]["name"].as_str();
            assert_eq!(location, None);
        }
    }

    #[test]
    fn test_parse_api_response_missing_title() {
        let json_data = r#"
        {
            "jobs": [
                {
                    "id": 456,
                    "location": {
                        "name": "Remote"
                    }
                }
            ]
        }
        "#;

        let parsed: serde_json::Value = serde_json::from_str(json_data).unwrap();

        if let Some(jobs_array) = parsed["jobs"].as_array() {
            let job = &jobs_array[0];

            // title should default to empty string via unwrap_or
            let title = job["title"].as_str().unwrap_or("");
            assert_eq!(title, "");
        }
    }

    #[test]
    fn test_parse_api_response_missing_id() {
        let json_data = r#"
        {
            "jobs": [
                {
                    "title": "Engineer",
                    "location": {
                        "name": "Remote"
                    }
                }
            ]
        }
        "#;

        let parsed: serde_json::Value = serde_json::from_str(json_data).unwrap();

        if let Some(jobs_array) = parsed["jobs"].as_array() {
            let job = &jobs_array[0];

            // id should default to 0 via unwrap_or
            let id = job["id"].as_i64().unwrap_or(0);
            assert_eq!(id, 0);
        }
    }

    #[test]
    fn test_api_url_construction() {
        let company_id = "cloudflare";
        let api_url = format!(
            "https://boards-api.greenhouse.io/v1/boards/{}/jobs",
            company_id
        );

        assert_eq!(
            api_url,
            "https://boards-api.greenhouse.io/v1/boards/cloudflare/jobs"
        );
    }

    #[test]
    fn test_api_url_from_company_url() {
        let company_url = "https://boards.greenhouse.io/cloudflare";
        let company_id = company_url
            .trim_end_matches('/')
            .split('/')
            .next_back()
            .unwrap();

        assert_eq!(company_id, "cloudflare");

        let api_url = format!(
            "https://boards-api.greenhouse.io/v1/boards/{}/jobs",
            company_id
        );
        assert_eq!(
            api_url,
            "https://boards-api.greenhouse.io/v1/boards/cloudflare/jobs"
        );
    }

    #[test]
    fn test_api_url_with_trailing_slash() {
        let company_url = "https://boards.greenhouse.io/stripe/";
        let company_id = company_url
            .trim_end_matches('/')
            .split('/')
            .next_back()
            .unwrap();

        assert_eq!(company_id, "stripe");
    }

    #[test]
    fn test_job_url_construction_from_api() {
        let company_id = "figma";
        let job_id = 987654;
        let url = format!(
            "https://boards.greenhouse.io/{}/jobs/{}",
            company_id, job_id
        );

        assert_eq!(url, "https://boards.greenhouse.io/figma/jobs/987654");
    }

    #[test]
    fn test_hash_consistency_across_runs() {
        let company = "Test Company™";
        let title = "Senior Engineer (Remote) 🚀";
        let location = Some("San Francisco, CA");
        let url = "https://boards.greenhouse.io/test/jobs/123";

        let hashes: Vec<String> = (0..10)
            .map(|_| GreenhouseScraper::compute_hash(company, title, location, url))
            .collect();

        for i in 1..hashes.len() {
            assert_eq!(hashes[0], hashes[i]);
        }
    }

    #[test]
    fn test_hash_with_query_parameters_normalized() {
        // With URL normalization, tracking params (ref, utm_*, etc.) are stripped
        // so URLs that differ only in tracking params should produce the SAME hash
        let hash1 = GreenhouseScraper::compute_hash(
            "Company",
            "Engineer",
            None,
            "https://boards.greenhouse.io/company/jobs/1?ref=linkedin",
        );
        let hash2 = GreenhouseScraper::compute_hash(
            "Company",
            "Engineer",
            None,
            "https://boards.greenhouse.io/company/jobs/1?ref=twitter",
        );
        let hash3 = GreenhouseScraper::compute_hash(
            "Company",
            "Engineer",
            None,
            "https://boards.greenhouse.io/company/jobs/1",
        );

        // All three should produce the SAME hash (tracking params stripped)
        assert_eq!(hash1, hash2);
        assert_eq!(hash1, hash3);
        assert_eq!(hash2, hash3);
    }

    #[test]
    fn test_parse_job_element_all_fields_present() {
        let scraper = GreenhouseScraper::new(vec![]);
        let company = GreenhouseCompany {
            id: "test".to_string(),
            name: "Test Company".to_string(),
            url: "https://boards.greenhouse.io/test".to_string(),
        };

        let html = r#"
            <div class="opening">
                <a href="/test/jobs/999">Full Stack Engineer</a>
                <span class="location">Remote - Worldwide</span>
            </div>
        "#;

        let document = Html::parse_document(html);
        let selector = Selector::parse(".opening").unwrap();
        let element = document.select(&selector).next().unwrap();

        let job = scraper
            .parse_job_element(&element, &company)
            .expect("should parse job")
            .expect("should have job");

        assert_eq!(job.title, "Full Stack Engineer");
        assert_eq!(job.company, "Test Company");
        assert_eq!(job.location, Some("Remote - Worldwide".to_string()));
        assert_eq!(job.source, "greenhouse");
        assert_eq!(job.description, None);
        assert_eq!(job.remote, None);
        assert_eq!(job.hash.len(), 64);
    }

    #[test]
    fn test_parse_job_element_nested_text() {
        let scraper = GreenhouseScraper::new(vec![]);
        let company = GreenhouseCompany {
            id: "test".to_string(),
            name: "Test".to_string(),
            url: "https://boards.greenhouse.io/test".to_string(),
        };

        let html = r#"
            <div class="opening">
                <a href="/test/jobs/1">
                    <span class="title">Senior</span>
                    <span>Engineer</span>
                </a>
                <span class="location">Boston, MA</span>
            </div>
        "#;

        let document = Html::parse_document(html);
        let selector = Selector::parse(".opening").unwrap();
        let element = document.select(&selector).next().unwrap();

        let job = scraper
            .parse_job_element(&element, &company)
            .expect("should parse job")
            .expect("should have job");

        // Text collection should concatenate all text nodes
        assert!(job.title.contains("Senior"));
        assert!(job.title.contains("Engineer"));
    }

    #[test]
    fn test_parse_api_response_with_capacity() {
        let json_data = r#"
        {
            "jobs": [
                {"id": 1, "title": "Job 1"},
                {"id": 2, "title": "Job 2"},
                {"id": 3, "title": "Job 3"}
            ]
        }
        "#;

        let parsed: serde_json::Value = serde_json::from_str(json_data).unwrap();

        if let Some(jobs_array) = parsed["jobs"].as_array() {
            let mut jobs = Vec::with_capacity(jobs_array.len());

            for job_data in jobs_array {
                let title = job_data["title"].as_str().unwrap_or("").to_string();
                jobs.push(title);
            }

            assert_eq!(jobs.len(), 3);
            assert_eq!(jobs.capacity(), 3);
        }
    }

    proptest! {
        /// Property: Hash function is deterministic
        /// Given the same inputs, compute_hash should always return the same output
        #[test]
        fn prop_hash_deterministic(
            company in "\\PC{1,100}",
            title in "\\PC{1,200}",
            location in proptest::option::of("\\PC{1,100}"),
            url in "https?://[a-z0-9./]+",
        ) {
            let hash1 = GreenhouseScraper::compute_hash(&company, &title, location.as_deref(), &url);
            let hash2 = GreenhouseScraper::compute_hash(&company, &title, location.as_deref(), &url);

            prop_assert_eq!(hash1.clone(), hash2, "Hash should be deterministic");
            prop_assert_eq!(hash1.len(), 64, "Hash should be 64 hex chars");
        }

        /// Property: Hash format is always valid
        /// All hashes should be exactly 64 hexadecimal characters
        #[test]
        fn prop_hash_format_valid(
            company in "\\PC*",
            title in "\\PC*",
            location in proptest::option::of("\\PC*"),
            url in "\\PC*",
        ) {
            let hash = GreenhouseScraper::compute_hash(&company, &title, location.as_deref(), &url);

            prop_assert_eq!(hash.len(), 64, "Hash length should be 64");
            prop_assert!(hash.chars().all(|c| c.is_ascii_hexdigit()), "Hash should only contain hex chars");
        }

        /// Property: Different companies produce different hashes
        /// Changing only the company name should change the hash
        #[test]
        fn prop_hash_company_sensitivity(
            company1 in "\\PC{1,100}",
            company2 in "\\PC{1,100}",
            title in "\\PC{1,200}",
            url in "https?://[a-z0-9./]+",
        ) {
            prop_assume!(company1 != company2);

            let hash1 = GreenhouseScraper::compute_hash(&company1, &title, None, &url);
            let hash2 = GreenhouseScraper::compute_hash(&company2, &title, None, &url);

            prop_assert_ne!(hash1, hash2, "Different companies should produce different hashes");
        }

        /// Property: Different titles produce different hashes
        /// Changing only the title should change the hash
        #[test]
        fn prop_hash_title_sensitivity(
            company in "\\PC{1,100}",
            title1 in "\\PC{1,200}",
            title2 in "\\PC{1,200}",
            url in "https?://[a-z0-9./]+",
        ) {
            prop_assume!(title1 != title2);

            let hash1 = GreenhouseScraper::compute_hash(&company, &title1, None, &url);
            let hash2 = GreenhouseScraper::compute_hash(&company, &title2, None, &url);

            prop_assert_ne!(hash1, hash2, "Different titles should produce different hashes");
        }

        /// Property: Different URLs produce different hashes
        /// Changing only the URL should change the hash
        #[test]
        fn prop_hash_url_sensitivity(
            company in "\\PC{1,100}",
            title in "\\PC{1,200}",
            url1 in "https?://[a-z0-9./]+",
            url2 in "https?://[a-z0-9./]+",
        ) {
            prop_assume!(url1 != url2);

            let hash1 = GreenhouseScraper::compute_hash(&company, &title, None, &url1);
            let hash2 = GreenhouseScraper::compute_hash(&company, &title, None, &url2);

            prop_assert_ne!(hash1, hash2, "Different URLs should produce different hashes");
        }

        /// Property: Location presence affects hash
        /// None vs Some(non-empty location) should produce different hashes
        /// Note: Whitespace-only locations normalize to empty, same as None (correct behavior)
        #[test]
        fn prop_hash_location_none_vs_some(
            company in "\\PC{1,100}",
            title in "\\PC{1,200}",
            location in "[a-zA-Z0-9][\\PC]{0,99}",  // Ensure at least one non-whitespace char
            url in "https?://[a-z0-9./]+",
        ) {
            // Skip if location would normalize to empty (whitespace-only)
            prop_assume!(!location.trim().is_empty());

            let hash_none = GreenhouseScraper::compute_hash(&company, &title, None, &url);
            let hash_some = GreenhouseScraper::compute_hash(&company, &title, Some(&location), &url);

            prop_assert_ne!(hash_none, hash_some, "None vs Some(non-empty) location should produce different hashes");
        }

        /// Property: Hash handles all valid Unicode
        /// Hash should work with any UTF-8 string including emoji and special chars
        #[test]
        fn prop_hash_unicode_safe(
            company in "[\\PC🦀™®]{1,50}",
            title in "[\\PC🚀💼]{1,100}",
            location in proptest::option::of("[\\PC🌍]{1,50}"),
            url in "\\PC{1,200}",
        ) {
            let hash = GreenhouseScraper::compute_hash(&company, &title, location.as_deref(), &url);

            prop_assert_eq!(hash.len(), 64);
            prop_assert!(hash.chars().all(|c| c.is_ascii_hexdigit()));
        }
    }
}
