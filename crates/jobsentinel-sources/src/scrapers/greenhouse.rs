//! Greenhouse ATS Scraper
//!
//! Scrapes jobs from Greenhouse-powered career pages.
//! Greenhouse is used by companies and organizations across many industries.

use super::error::ScraperError;
use super::rate_limiter::{limits, RateLimiter};
#[cfg(test)]
use super::COMPANY_SCRAPE_FAILED;
use super::{
    collect_company_scrape_result, require_company_scrape_success, JobScraper, ScraperResult,
};
use crate::{is_safe_company_board_id, parse_greenhouse_company_url};
use async_trait::async_trait;
use chrono::Utc;
use jobsentinel_domain::{canonicalize_job_url, Job};
use jobsentinel_network::{send_external_http_text_with_retry, ExternalHttpRequest};
use jobsentinel_security::sanitize_url_for_logging;
use scraper::{Html, Selector};

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

        let api_result = self.scrape_greenhouse_api(company).await;
        let mut jobs = match api_result {
            Ok(jobs) => jobs,
            Err(error) => {
                tracing::warn!(
                    source = "greenhouse",
                    url = %sanitize_url_for_logging(&company.url),
                    "Greenhouse API scrape failed; trying hosted board HTML fallback"
                );
                if let Ok(html_jobs) = self.scrape_greenhouse_html(company, &board.url).await {
                    if !html_jobs.is_empty() {
                        return Ok(html_jobs);
                    }
                }
                return Err(error);
            }
        };

        if jobs.is_empty() {
            jobs = self.scrape_greenhouse_html(company, &board.url).await?;
        }

        tracing::info!("Found {} jobs from {}", jobs.len(), company.name);
        Ok(jobs)
    }

    async fn scrape_greenhouse_html(
        &self,
        company: &GreenhouseCompany,
        board_url: &str,
    ) -> ScraperResult {
        let response = send_external_http_text_with_retry(ExternalHttpRequest::get(board_url))
            .await
            .map_err(|error| ScraperError::from_external("greenhouse", error))?;

        if !(200..300).contains(&response.status) {
            tracing::error!("HTTP error {} from Greenhouse", response.status);
            return Err(ScraperError::http_status(
                response.status,
                board_url,
                format!("HTTP {} from Greenhouse", response.status),
            ));
        }

        let html = response.body;

        // Try multiple selector patterns (Greenhouse has different layouts)
        // Parse HTML in a scope so document is dropped before any awaits
        let jobs = {
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
            Ok(Some(Job::newly_discovered(
                title,
                company.name.clone(),
                url,
                location,
                "greenhouse",
                Utc::now(),
            )))
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
        let response = send_external_http_text_with_retry(ExternalHttpRequest::get(&api_url))
            .await
            .map_err(|error| ScraperError::from_external("greenhouse", error))?;

        if !(200..300).contains(&response.status) {
            return Err(ScraperError::http_status(
                response.status,
                &api_url,
                format!("Greenhouse API failed: {}", response.status),
            ));
        }

        let json: serde_json::Value = ScraperError::parse_json(&api_url, &response.body)?;

        let jobs = if let Some(jobs_array) = json["jobs"].as_array() {
            let mut jobs = Vec::with_capacity(jobs_array.len());
            for job_data in jobs_array {
                let title = job_data["title"].as_str().unwrap_or("").to_string();
                let job_id = job_data["id"].as_i64().unwrap_or(0);
                let url = Self::api_job_url(company_id, job_id, job_data);
                let location = job_data["location"]["name"].as_str().map(|s| s.to_string());

                jobs.push(Job::newly_discovered(
                    title,
                    company.name.clone(),
                    url,
                    location,
                    "greenhouse",
                    Utc::now(),
                ));
            }
            jobs
        } else {
            Vec::new()
        };

        Ok(jobs)
    }

    fn api_job_url(company_id: &str, job_id: i64, job_data: &serde_json::Value) -> String {
        job_data["absolute_url"]
            .as_str()
            .filter(|value| !value.is_empty())
            .and_then(|value| canonicalize_job_url(value).ok())
            .unwrap_or_else(|| {
                format!(
                    "https://job-boards.greenhouse.io/{}/jobs/{}",
                    company_id, job_id
                )
            })
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

            collect_company_scrape_result(
                self.scrape_company(company).await,
                &mut all_jobs,
                &mut failed_companies,
                "greenhouse",
            );
        }

        require_company_scrape_success(self.companies.len(), failed_companies, "greenhouse")?;

        Ok(all_jobs)
    }

    #[cfg(test)]
    fn name(&self) -> &'static str {
        "greenhouse"
    }
}

#[cfg(test)]
#[path = "greenhouse_tests.rs"]
mod tests;
