//! Greenhouse ATS Scraper
//!
//! Scrapes jobs from Greenhouse-powered career pages.
//! Greenhouse is used by companies like Cloudflare, Stripe, Figma, etc.

use super::http_client::get_client;
use super::{JobScraper, ScraperResult};
use crate::core::db::Job;
use anyhow::Result;
use async_trait::async_trait;
use chrono::Utc;
use scraper::{Html, Selector};
use sha2::{Digest, Sha256};

/// Greenhouse scraper configuration
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
    async fn scrape_company(&self, company: &GreenhouseCompany) -> ScraperResult {
        tracing::info!("Scraping Greenhouse: {}", company.name);

        // Fetch the careers page
        let client = get_client();

        let response = client.get(&company.url).send().await?;

        if !response.status().is_success() {
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
                included_in_digest: false,
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

        let client = get_client();

        let response = client.get(&api_url).send().await?;

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
                    included_in_digest: false,
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
        let hash2 = GreenhouseScraper::compute_hash(
            "Stripe",
            "Engineer",
            None,
            "https://example.com/1",
        );

        assert_ne!(hash1, hash2, "Different company should produce different hash");
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

        assert_ne!(hash1, hash2, "Different title should produce different hash");
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

        assert_ne!(hash1, hash2, "Different location should produce different hash");
    }

    #[test]
    fn test_compute_hash_location_none_vs_some() {
        let hash1 = GreenhouseScraper::compute_hash(
            "Company",
            "Engineer",
            None,
            "https://example.com/1",
        );
        let hash2 = GreenhouseScraper::compute_hash(
            "Company",
            "Engineer",
            Some("Remote"),
            "https://example.com/1",
        );

        assert_ne!(hash1, hash2, "None location should produce different hash than Some");
    }

    #[test]
    fn test_compute_hash_different_url() {
        let hash1 = GreenhouseScraper::compute_hash(
            "Company",
            "Engineer",
            None,
            "https://example.com/1",
        );
        let hash2 = GreenhouseScraper::compute_hash(
            "Company",
            "Engineer",
            None,
            "https://example.com/2",
        );

        assert_ne!(hash1, hash2, "Different URL should produce different hash");
    }

    #[test]
    fn test_compute_hash_empty_strings() {
        let hash = GreenhouseScraper::compute_hash(
            "",
            "",
            None,
            "",
        );

        assert_eq!(hash.len(), 64, "Hash of empty strings should still be valid");
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
        /// None vs Some(location) should produce different hashes
        #[test]
        fn prop_hash_location_none_vs_some(
            company in "\\PC{1,100}",
            title in "\\PC{1,200}",
            location in "\\PC{1,100}",
            url in "https?://[a-z0-9./]+",
        ) {
            let hash_none = GreenhouseScraper::compute_hash(&company, &title, None, &url);
            let hash_some = GreenhouseScraper::compute_hash(&company, &title, Some(&location), &url);

            prop_assert_ne!(hash_none, hash_some, "None vs Some location should produce different hashes");
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
