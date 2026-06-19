//! Greenhouse ATS Scraper
//!
//! Scrapes jobs from Greenhouse-powered career pages.
//! Greenhouse is used by companies and organizations across many industries.

use super::error::ScraperError;
use super::http_client::{get_with_retry, read_json_with_limit, read_text_with_limit};
use super::rate_limiter::{limits, RateLimiter};
use super::{JobScraper, ScraperResult};
use crate::core::calculate_job_hash;
use crate::core::db::Job;
use crate::core::source_urls::{is_safe_company_board_id, parse_greenhouse_company_url};
use crate::core::url_security::sanitize_url_for_logging;
use async_trait::async_trait;
use chrono::Utc;
use scraper::{Html, Selector};

const COMPANY_SCRAPE_FAILED: &str =
    "Company board scrape failed; continuing with other company boards";

/// Greenhouse scraper configuration
#[derive(Debug, Clone)]
pub struct GreenhouseScraper {
    /// List of Greenhouse company URLs to scrape
    pub companies: Vec<GreenhouseCompany>,
    /// Rate limiter for respecting Greenhouse's request limits
    pub rate_limiter: RateLimiter,
}

#[derive(Debug, Clone)]
pub struct GreenhouseCompany {
    pub id: String,
    pub name: String,
    pub url: String,
}

impl GreenhouseScraper {
    pub fn new(companies: Vec<GreenhouseCompany>) -> Self {
        Self {
            companies,
            rate_limiter: RateLimiter::shared(),
        }
    }

    /// Scrape a single Greenhouse company
    #[tracing::instrument(skip(self), fields(company_name = %company.name))]
    async fn scrape_company(&self, company: &GreenhouseCompany) -> ScraperResult {
        tracing::info!("Starting Greenhouse scrape");
        let board = parse_greenhouse_company_url(&company.url).map_err(|reason| {
            ScraperError::InvalidUrl {
                url: company.url.clone(),
                reason,
            }
        })?;

        if board.id != company.id {
            return Err(ScraperError::InvalidUrl {
                url: company.url.clone(),
                reason: "Greenhouse company id does not match configured URL".to_string(),
            });
        }

        // Fetch the careers page with retry logic
        let response = get_with_retry(&board.url)
            .await
            .map_err(|e| ScraperError::from_anyhow("greenhouse", e))?;

        if !response.status().is_success() {
            tracing::error!("HTTP error {} from Greenhouse", response.status());
            return Err(ScraperError::http_status(
                response.status().as_u16(),
                &company.url,
                format!("HTTP {} from Greenhouse", response.status()),
            ));
        }

        let html = read_text_with_limit(response, &board.url).await?;

        // Try multiple selector patterns (Greenhouse has different layouts)
        // Parse HTML in a scope so document is dropped before any awaits
        let mut jobs = {
            let document = Html::parse_document(&html);

            // Pre-allocate with reasonable capacity
            let mut parsed_jobs = Vec::with_capacity(20);

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
    ) -> Result<Option<Job>, ScraperError> {
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
        if !is_safe_company_board_id(&company.id) {
            return Err(ScraperError::InvalidUrl {
                url: company.url.clone(),
                reason: "Greenhouse company id contains unsupported characters".to_string(),
            });
        }

        let company_id = company.id.as_str();

        let api_url = format!(
            "https://boards-api.greenhouse.io/v1/boards/{}/jobs",
            company_id
        );

        tracing::debug!(url = %sanitize_url_for_logging(&api_url), "Fetching Greenhouse API");

        // Use retry logic for API calls
        let response = get_with_retry(&api_url)
            .await
            .map_err(|e| ScraperError::from_anyhow("greenhouse", e))?;

        if !response.status().is_success() {
            return Err(ScraperError::http_status(
                response.status().as_u16(),
                &api_url,
                format!("Greenhouse API failed: {}", response.status()),
            ));
        }

        let json: serde_json::Value = read_json_with_limit(response, &api_url).await?;

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
        calculate_job_hash(company, title, location, url)
    }
}

#[async_trait]
impl JobScraper for GreenhouseScraper {
    async fn scrape(&self) -> ScraperResult {
        let mut all_jobs = Vec::new();
        let mut failed_companies = 0usize;

        for company in &self.companies {
            // Use rate limiter to respect Greenhouse's limits
            self.rate_limiter
                .wait("greenhouse", limits::GREENHOUSE)
                .await;

            match self.scrape_company(company).await {
                Ok(jobs) => {
                    all_jobs.extend(jobs);
                }
                Err(_) => {
                    failed_companies += 1;
                    tracing::warn!(
                        source = "greenhouse",
                        message = COMPANY_SCRAPE_FAILED,
                        "Company board scrape failed"
                    );
                    // Continue with other companies
                }
            }
        }

        if !self.companies.is_empty() && failed_companies == self.companies.len() {
            return Err(ScraperError::Generic {
                scraper: "greenhouse".to_string(),
                message: "All configured company boards failed".to_string(),
            });
        }

        Ok(all_jobs)
    }

    fn name(&self) -> &'static str {
        "greenhouse"
    }
}

#[cfg(test)]
#[path = "greenhouse_tests.rs"]
mod tests;
