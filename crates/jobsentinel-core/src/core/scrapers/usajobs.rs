//! USAJobs.gov Job Scraper
//!
//! Scrapes federal government jobs from the official USAJobs API.
//! Requires a free API key from https://developer.usajobs.gov/
//!
//! This is the safest and most reliable government job source since
//! it's an official public API designed for programmatic access.

use super::error::ScraperError;
use super::http_client::{
    read_json_with_limit, read_text_with_limit, scraper_client_builder,
    send_with_retry_to_resolved_url, DEFAULT_TIMEOUT_SECS,
};
use super::rate_limiter::RateLimiter;
use super::{JobScraper, ScraperResult};
use crate::core::calculate_job_hash;
use crate::core::url_security::{resolve_external_https_url_for_fetch, ResolvedExternalUrl};
use crate::core::Job;

use async_trait::async_trait;
use chrono::Utc;
use reqwest::header::{HeaderMap, HeaderValue, HOST, USER_AGENT};
use serde::Deserialize;
use std::fmt;

const BASE_URL: &str = "https://data.usajobs.gov";
const SEARCH_ENDPOINT: &str = "/api/Search";
const MAX_RESULTS_PER_PAGE: u32 = 500;

/// USAJobs API scraper for federal government positions
#[derive(Clone)]
pub struct UsaJobsScraper {
    /// API key from developer.usajobs.gov
    pub api_key: String,
    /// Email used for User-Agent header (required by API)
    pub email: String,
    /// Search keywords
    pub keywords: Option<String>,
    /// Location filter (city, state, or zip)
    pub location: Option<String>,
    /// Radius in miles from location
    pub radius: Option<u32>,
    /// Only show remote positions
    pub remote_only: bool,
    /// Minimum GS pay grade (1-15)
    pub pay_grade_min: Option<u8>,
    /// Maximum GS pay grade (1-15)
    pub pay_grade_max: Option<u8>,
    /// Only show jobs posted within N days (0-60)
    pub date_posted_days: Option<u8>,
    /// Maximum results to return
    pub limit: usize,
    /// Rate limiter for respecting USAJobs API limits
    pub rate_limiter: RateLimiter,
}

impl fmt::Debug for UsaJobsScraper {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("UsaJobsScraper")
            .field(
                "api_key",
                &if self.api_key.is_empty() {
                    "[empty]"
                } else {
                    "[REDACTED]"
                },
            )
            .field("email_configured", &!self.email.is_empty())
            .field("has_keywords", &self.keywords.is_some())
            .field("has_location", &self.location.is_some())
            .field("radius", &self.radius)
            .field("remote_only", &self.remote_only)
            .field("pay_grade_min", &self.pay_grade_min)
            .field("pay_grade_max", &self.pay_grade_max)
            .field("date_posted_days", &self.date_posted_days)
            .field("limit", &self.limit)
            .field("rate_limiter", &self.rate_limiter)
            .finish()
    }
}

impl UsaJobsScraper {
    /// Create a new USAJobs scraper with API credentials
    pub fn new(api_key: impl Into<String>, email: impl Into<String>) -> Self {
        Self {
            api_key: api_key.into(),
            email: email.into(),
            keywords: None,
            location: None,
            radius: None,
            remote_only: false,
            pay_grade_min: None,
            pay_grade_max: None,
            date_posted_days: Some(30), // Default to last 30 days
            limit: 100,
            rate_limiter: RateLimiter::shared(),
        }
    }

    /// Set search keywords
    pub fn with_keywords(mut self, keywords: impl Into<String>) -> Self {
        self.keywords = Some(keywords.into());
        self
    }

    /// Set location filter
    pub fn with_location(mut self, location: impl Into<String>, radius: Option<u32>) -> Self {
        self.location = Some(location.into());
        self.radius = radius;
        self
    }

    /// Filter to remote-only positions
    pub fn remote_only(mut self) -> Self {
        self.remote_only = true;
        self
    }

    /// Set GS pay grade range
    pub fn with_pay_grade(mut self, min: Option<u8>, max: Option<u8>) -> Self {
        self.pay_grade_min = min;
        self.pay_grade_max = max;
        self
    }

    /// Set date posted filter (0-60 days)
    pub fn posted_within_days(mut self, days: u8) -> Self {
        self.date_posted_days = Some(days.min(60));
        self
    }

    /// Set maximum results limit
    pub fn with_limit(mut self, limit: usize) -> Self {
        self.limit = limit;
        self
    }

    /// Build HTTP client with required headers
    #[cfg(test)]
    fn build_client(&self) -> Result<reqwest::Client, ScraperError> {
        self.build_client_for_target(None)
    }

    fn build_client_for_target(
        &self,
        target: Option<&ResolvedExternalUrl>,
    ) -> Result<reqwest::Client, ScraperError> {
        let mut headers = HeaderMap::new();
        headers.insert(HOST, HeaderValue::from_static("data.usajobs.gov"));
        headers.insert(
            USER_AGENT,
            HeaderValue::from_str(&self.email).map_err(|_e| {
                ScraperError::InvalidConfiguration {
                    scraper: "usajobs".to_string(),
                    message: "Invalid email for User-Agent header".to_string(),
                }
            })?,
        );
        headers.insert(
            "Authorization-Key",
            HeaderValue::from_str(&self.api_key).map_err(|_e| {
                ScraperError::InvalidConfiguration {
                    scraper: "usajobs".to_string(),
                    message: "Invalid API key".to_string(),
                }
            })?,
        );

        let mut builder = scraper_client_builder()
            .default_headers(headers)
            .timeout(std::time::Duration::from_secs(DEFAULT_TIMEOUT_SECS));

        if let Some((host, addrs)) = target.and_then(ResolvedExternalUrl::dns_override) {
            builder = builder.resolve_to_addrs(host, addrs);
        }

        builder.build().map_err(|_e| ScraperError::Generic {
            scraper: "usajobs".to_string(),
            message: "Failed to build HTTP client".to_string(),
        })
    }

    /// Build query parameters for the search API
    fn build_query_params(&self, page: u32) -> Vec<(&str, String)> {
        // Pre-allocate capacity for typical number of params (10)
        let mut params = Vec::with_capacity(10);

        if let Some(kw) = &self.keywords {
            params.push(("Keyword", kw.clone()));
        }
        if let Some(loc) = &self.location {
            params.push(("LocationName", loc.clone()));
        }
        if let Some(r) = self.radius {
            params.push(("Radius", r.to_string()));
        }
        if self.remote_only {
            params.push(("RemoteIndicator", "true".to_string()));
        }
        if let Some(g) = self.pay_grade_min {
            params.push(("PayGradeLow", g.to_string()));
        }
        if let Some(g) = self.pay_grade_max {
            params.push(("PayGradeHigh", g.to_string()));
        }
        if let Some(d) = self.date_posted_days {
            params.push(("DatePosted", d.to_string()));
        }

        // Pagination
        params.push(("Page", page.to_string()));
        let results_per_page = (self.limit as u32).clamp(1, MAX_RESULTS_PER_PAGE);
        params.push(("ResultsPerPage", results_per_page.to_string()));

        // Get full details
        params.push(("Fields", "Full".to_string()));

        params
    }

    /// Fetch jobs from USAJobs API
    async fn fetch_jobs(&self) -> ScraperResult {
        tracing::info!("Fetching jobs from USAJobs API");

        // Use rate limiter (official API, generous limit)
        self.rate_limiter.wait("usajobs", 1000).await;

        let url = format!("{}{}", BASE_URL, SEARCH_ENDPOINT);
        let target = resolve_external_https_url_for_fetch(&url)
            .await
            .map_err(|reason| ScraperError::InvalidUrl {
                url: url.clone(),
                reason,
            })?;
        let client = self.build_client_for_target(Some(&target))?;
        let params = self.build_query_params(1);

        let response = send_with_retry_to_resolved_url(&client, &target, |client| {
            client.get(&url).query(&params)
        })
        .await
        .map_err(|e| ScraperError::from_anyhow("usajobs", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let body_chars = read_text_with_limit(response, &url)
                .await
                .ok()
                .map(|body| body.chars().count());
            return Err(ScraperError::http_status(
                status.as_u16(),
                &url,
                Self::api_error_message(status.as_u16(), body_chars),
            ));
        }

        let api_response: UsaJobsResponse = read_json_with_limit(response, &url).await?;

        let total_jobs = api_response.search_result.search_result_count_all;
        tracing::info!(
            "USAJobs API returned {} total jobs (fetching up to {})",
            total_jobs,
            self.limit
        );

        let mut jobs = Vec::with_capacity(self.limit);
        for item in api_response.search_result.search_result_items {
            if let Some(job) = self.parse_job(&item) {
                jobs.push(job);
                if jobs.len() >= self.limit {
                    break;
                }
            }
        }

        tracing::info!("Parsed {} jobs from USAJobs", jobs.len());
        Ok(jobs)
    }

    fn api_error_message(status: u16, body_chars: Option<usize>) -> String {
        match body_chars {
            Some(chars) => format!("USAJobs API error: {status} (response_body_chars: {chars})"),
            None => format!("USAJobs API error: {status} (response_body_unavailable)"),
        }
    }

    /// Parse a job from API response
    fn parse_job(&self, item: &SearchResultItem) -> Option<Job> {
        let desc = &item.matched_object_descriptor;

        let title = &desc.position_title;
        if title.is_empty() {
            return None;
        }

        let url = &desc.position_uri;
        if url.is_empty() {
            return None;
        }

        // Use organization name, fall back to department
        let company = if !desc.organization_name.is_empty() {
            &desc.organization_name
        } else {
            &desc.department_name
        };

        let location = if desc.position_location_display.is_empty() {
            None
        } else {
            Some(&desc.position_location_display)
        };

        // Parse salary from remuneration array
        let (salary_min, salary_max) = self.parse_salary(&desc.position_remuneration);

        // Check if remote from location display
        let is_remote = desc
            .position_location_display
            .to_lowercase()
            .contains("remote")
            || desc
                .position_location_display
                .to_lowercase()
                .contains("telework");

        // Get job description from user area details
        let description = desc
            .user_area
            .as_ref()
            .and_then(|ua| ua.details.as_ref())
            .and_then(|d| d.job_summary.as_deref())
            .map(str::to_string);

        let hash = Self::compute_hash(company, title, location.map(|s| s as &str), url);

        Some(Job {
            id: 0,
            hash,
            title: title.clone(),
            company: company.clone(),
            url: url.clone(),
            location: location.cloned(),
            description,
            score: None,
            score_reasons: None,
            source: "usajobs".to_string(),
            remote: Some(is_remote),
            salary_min,
            salary_max,
            currency: Some("USD".to_string()),
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
        })
    }

    /// Parse salary from remuneration array
    fn parse_salary(&self, remunerations: &[Remuneration]) -> (Option<i64>, Option<i64>) {
        // Find annual salary (PA = Per Annum)
        for rem in remunerations {
            if rem.rate_interval_code == "PA" {
                let min = rem.minimum_range.parse::<i64>().ok();
                let max = rem.maximum_range.parse::<i64>().ok();
                return (min, max);
            }
        }

        // Fall back to first entry if no annual found
        if let Some(rem) = remunerations.first() {
            let min = rem.minimum_range.parse::<i64>().ok();
            let max = rem.maximum_range.parse::<i64>().ok();

            // Convert hourly to annual if needed (2080 hours/year)
            if rem.rate_interval_code == "PH" {
                return (min.map(|v| v * 2080), max.map(|v| v * 2080));
            }

            return (min, max);
        }

        (None, None)
    }

    /// Compute SHA-256 hash for deduplication
    fn compute_hash(company: &str, title: &str, location: Option<&str>, url: &str) -> String {
        calculate_job_hash(company, title, location, url)
    }
}

#[async_trait]
impl JobScraper for UsaJobsScraper {
    async fn scrape(&self) -> ScraperResult {
        self.fetch_jobs().await
    }

    fn name(&self) -> &'static str {
        "usajobs"
    }
}

// ============================================================================
// API Response Types
// ============================================================================

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
struct UsaJobsResponse {
    search_result: SearchResult,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
#[allow(dead_code)] // Fields needed for deserialization
struct SearchResult {
    search_result_count: u32,
    search_result_count_all: u32,
    search_result_items: Vec<SearchResultItem>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
#[allow(dead_code)] // Fields needed for deserialization
struct SearchResultItem {
    matched_object_id: String,
    matched_object_descriptor: JobDescriptor,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
struct JobDescriptor {
    position_title: String,
    #[serde(default)]
    position_uri: String,
    #[serde(default)]
    position_location_display: String,
    #[serde(default)]
    organization_name: String,
    #[serde(default)]
    department_name: String,
    #[serde(default)]
    position_remuneration: Vec<Remuneration>,
    user_area: Option<UserArea>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
struct Remuneration {
    #[serde(default)]
    minimum_range: String,
    #[serde(default)]
    maximum_range: String,
    #[serde(default)]
    rate_interval_code: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
struct UserArea {
    details: Option<JobDetails>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "PascalCase")]
#[allow(dead_code)] // Fields needed for deserialization
struct JobDetails {
    job_summary: Option<String>,
    major_duties: Option<String>,
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests;
