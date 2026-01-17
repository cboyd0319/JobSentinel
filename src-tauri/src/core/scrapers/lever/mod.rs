//! Lever ATS Scraper
//!
//! Scrapes jobs from Lever-powered career pages.
//! Lever is used by companies like Netflix, Shopify, IDEO, etc.

use super::http_client::get_client;
use super::{JobScraper, ScraperResult};
use crate::core::db::Job;
use async_trait::async_trait;
use chrono::Utc;
use sha2::{Digest, Sha256};

/// Lever scraper configuration
pub struct LeverScraper {
    /// List of Lever company URLs to scrape
    pub companies: Vec<LeverCompany>,
}

#[derive(Debug, Clone)]
pub struct LeverCompany {
    pub id: String,
    pub name: String,
    pub url: String,
}

impl LeverScraper {
    pub fn new(companies: Vec<LeverCompany>) -> Self {
        Self { companies }
    }

    /// Scrape a single Lever company via API
    async fn scrape_company(&self, company: &LeverCompany) -> ScraperResult {
        tracing::info!("Scraping Lever: {}", company.name);

        // Lever has a public JSON API: https://api.lever.co/v0/postings/{company_id}
        let api_url = format!("https://api.lever.co/v0/postings/{}", company.id);

        tracing::debug!("Fetching Lever API: {}", api_url);

        let client = get_client();

        let response = client.get(&api_url).send().await?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!("Lever API failed: {}", response.status()));
        }

        let json: serde_json::Value = response.json().await?;

        let jobs = if let Some(postings) = json.as_array() {
            let mut jobs = Vec::with_capacity(postings.len());
            for posting in postings {
                let title = posting["text"].as_str().unwrap_or("").to_string();
                let url = posting["hostedUrl"].as_str().unwrap_or("").to_string();
                let location = posting["categories"]["location"]
                    .as_str()
                    .map(|s| s.to_string())
                    .or_else(|| {
                        posting["categories"]["team"]
                            .as_str()
                            .map(|s| s.to_string())
                    });

                // Extract description
                let description = posting["description"]
                    .as_str()
                    .or_else(|| posting["descriptionPlain"].as_str())
                    .map(|s| s.to_string());

                // Infer remote from location or title
                let remote = Self::infer_remote(&title, location.as_deref());

                // Compute hash for deduplication
                let hash = Self::compute_hash(&company.name, &title, location.as_deref(), &url);

                if !title.is_empty() && !url.is_empty() {
                    jobs.push(Job {
                        id: 0,
                        hash,
                        title,
                        company: company.name.clone(),
                        url,
                        location,
                        description,
                        score: None,
                        score_reasons: None,
                        source: "lever".to_string(),
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
                        ghost_score: None,
                        ghost_reasons: None,
                        first_seen: None,
                        repost_count: 0,
                    });
                }
            }
            jobs
        } else {
            Vec::new()
        };

        tracing::info!("Found {} jobs from {}", jobs.len(), company.name);
        Ok(jobs)
    }

    /// Infer if job is remote from title or location
    fn infer_remote(title: &str, location: Option<&str>) -> bool {
        let title_lower = title.to_lowercase();
        let location_lower = location.map(|l| l.to_lowercase()).unwrap_or_default();

        // Check title
        if title_lower.contains("remote")
            || title_lower.contains("work from home")
            || title_lower.contains("wfh")
        {
            return true;
        }

        // Check location
        if location_lower.contains("remote")
            || location_lower.contains("anywhere")
            || location_lower.contains("worldwide")
        {
            return true;
        }

        false
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
impl JobScraper for LeverScraper {
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
        "lever"
    }
}

#[cfg(test)]
mod tests;
