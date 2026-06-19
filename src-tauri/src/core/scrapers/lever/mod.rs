//! Lever ATS Scraper
//!
//! Scrapes jobs from Lever-powered career pages.
//! Lever is used by companies like Netflix, Shopify, IDEO, etc.

use super::error::ScraperError;
use super::http_client::{read_json_with_limit, send_with_retry};
use super::rate_limiter::{limits, RateLimiter};
use super::{JobScraper, ScraperResult};
use crate::core::calculate_job_hash;
use crate::core::db::Job;
use crate::core::source_urls::is_safe_company_board_id;
use crate::core::url_security::sanitize_url_for_logging;
use async_trait::async_trait;
use chrono::Utc;

const COMPANY_SCRAPE_FAILED: &str =
    "Company board scrape failed; continuing with other company boards";

/// Lever scraper configuration
#[derive(Debug, Clone)]
pub struct LeverScraper {
    /// List of Lever company URLs to scrape
    pub companies: Vec<LeverCompany>,
    /// Rate limiter for respecting Lever's request limits
    pub rate_limiter: RateLimiter,
}

#[derive(Debug, Clone)]
pub struct LeverCompany {
    pub id: String,
    pub name: String,
    pub url: String,
}

impl LeverScraper {
    pub fn new(companies: Vec<LeverCompany>) -> Self {
        Self {
            companies,
            rate_limiter: RateLimiter::shared(),
        }
    }

    /// Scrape a single Lever company via API
    async fn scrape_company(&self, company: &LeverCompany) -> ScraperResult {
        tracing::info!("Scraping Lever: {}", company.name);
        if !is_safe_company_board_id(&company.id) {
            return Err(ScraperError::InvalidUrl {
                url: company.url.clone(),
                reason: "Lever company id contains unsupported characters".to_string(),
            });
        }

        // Lever has a public JSON API: https://api.lever.co/v0/postings/{company_id}
        let api_url = format!("https://api.lever.co/v0/postings/{}", company.id);

        tracing::debug!(url = %sanitize_url_for_logging(&api_url), "Fetching Lever API");

        let response = send_with_retry(&api_url, |client| client.get(&api_url))
            .await
            .map_err(|e| ScraperError::from_anyhow("lever", e))?;

        if !response.status().is_success() {
            return Err(ScraperError::http_status(
                response.status().as_u16(),
                &api_url,
                format!("Lever API failed: {}", response.status()),
            ));
        }

        let json: serde_json::Value = read_json_with_limit(response, &api_url).await?;

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
        calculate_job_hash(company, title, location, url)
    }
}

#[async_trait]
impl JobScraper for LeverScraper {
    async fn scrape(&self) -> ScraperResult {
        let mut all_jobs = Vec::new();
        let mut failed_companies = 0usize;

        for company in &self.companies {
            // Use rate limiter to respect Lever's limits
            self.rate_limiter.wait("lever", limits::LEVER).await;

            match self.scrape_company(company).await {
                Ok(jobs) => {
                    all_jobs.extend(jobs);
                }
                Err(_) => {
                    failed_companies += 1;
                    tracing::warn!(
                        source = "lever",
                        message = COMPANY_SCRAPE_FAILED,
                        "Company board scrape failed"
                    );
                    // Continue with other companies
                }
            }
        }

        if !self.companies.is_empty() && failed_companies == self.companies.len() {
            return Err(ScraperError::Generic {
                scraper: "lever".to_string(),
                message: "All configured company boards failed".to_string(),
            });
        }

        Ok(all_jobs)
    }

    fn name(&self) -> &'static str {
        "lever"
    }
}

#[cfg(test)]
mod tests;
