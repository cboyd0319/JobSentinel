//! Greenhouse ATS Scraper
//!
//! Scrapes jobs from Greenhouse-powered career pages.
//! Greenhouse is used by companies like Cloudflare, Stripe, Figma, etc.

use super::{JobScraper, ScraperResult};
use crate::core::db::Job;
use anyhow::{Context, Result};
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
        let client = reqwest::Client::builder()
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
            .timeout(std::time::Duration::from_secs(30))
            .build()?;

        let response = client.get(&company.url).send().await?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!("HTTP {}: {}", response.status(), company.url));
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
                e.value()
                    .attr("href")
                    .map(|href| {
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
        let company_id = company.url
            .trim_end_matches('/')
            .split('/')
            .last()
            .ok_or_else(|| anyhow::anyhow!("Invalid Greenhouse URL"))?;

        let api_url = format!("https://boards-api.greenhouse.io/v1/boards/{}/jobs", company_id);

        tracing::debug!("Fetching Greenhouse API: {}", api_url);

        let client = reqwest::Client::builder()
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
            .timeout(std::time::Duration::from_secs(30))
            .build()?;

        let response = client.get(&api_url).send().await?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!("Greenhouse API failed: {}", response.status()));
        }

        let json: serde_json::Value = response.json().await?;

        let mut jobs = Vec::new();

        if let Some(jobs_array) = json["jobs"].as_array() {
            for job_data in jobs_array {
                let title = job_data["title"].as_str().unwrap_or("").to_string();
                let job_id = job_data["id"].as_i64().unwrap_or(0);
                let url = format!("https://boards.greenhouse.io/{}/jobs/{}", company_id, job_id);
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
    fn test_compute_hash() {
        let hash1 = GreenhouseScraper::compute_hash("Cloudflare", "Security Engineer", Some("Remote"), "https://example.com/1");
        let hash2 = GreenhouseScraper::compute_hash("Cloudflare", "Security Engineer", Some("Remote"), "https://example.com/1");
        let hash3 = GreenhouseScraper::compute_hash("Cloudflare", "Security Engineer", Some("Hybrid"), "https://example.com/1");

        assert_eq!(hash1, hash2); // Same job = same hash
        assert_ne!(hash1, hash3); // Different location = different hash
    }
}
