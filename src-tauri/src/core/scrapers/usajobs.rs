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
use super::{location_utils, title_utils, url_utils, JobScraper, ScraperResult};
use crate::core::db::Job;
use crate::core::url_security::{resolve_external_https_url_for_fetch, ResolvedExternalUrl};

use async_trait::async_trait;
use chrono::Utc;
use reqwest::header::{HeaderMap, HeaderValue, HOST, USER_AGENT};
use serde::Deserialize;
use sha2::{Digest, Sha256};
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
mod tests {
    use super::*;
    use reqwest::StatusCode;
    use wiremock::matchers::{method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    #[test]
    fn test_new_scraper() {
        let scraper =
            UsaJobsScraper::new("test-api-key".to_string(), "test@example.com".to_string());

        assert_eq!(scraper.api_key, "test-api-key");
        assert_eq!(scraper.email, "test@example.com");
        assert_eq!(scraper.limit, 100);
        assert_eq!(scraper.date_posted_days, Some(30));
        assert!(!scraper.remote_only);
    }

    #[test]
    fn test_debug_does_not_leak_api_key_or_email() {
        let scraper = UsaJobsScraper::new(
            "usajobs-secret-api-key".to_string(),
            "user@example.com".to_string(),
        )
        .with_keywords("private search")
        .with_location("Private City", Some(25));

        let debug_output = format!("{:?}", scraper);

        assert!(
            !debug_output.contains("usajobs-secret-api-key"),
            "USAJobs scraper Debug output must not contain API key. Got: {}",
            debug_output
        );
        assert!(
            !debug_output.contains("user@example.com"),
            "USAJobs scraper Debug output must not contain email. Got: {}",
            debug_output
        );
        assert!(
            !debug_output.contains("private search"),
            "USAJobs scraper Debug output must not contain query. Got: {}",
            debug_output
        );
        assert!(
            !debug_output.contains("Private City"),
            "USAJobs scraper Debug output must not contain location. Got: {}",
            debug_output
        );
    }

    #[tokio::test]
    async fn test_client_does_not_follow_redirects_with_authorization_key() {
        let target = MockServer::start().await;
        let source = MockServer::start().await;
        let location = format!("{}/capture", target.uri());

        Mock::given(method("GET"))
            .and(path("/api/Search"))
            .respond_with(ResponseTemplate::new(302).insert_header("Location", location))
            .mount(&source)
            .await;

        let scraper =
            UsaJobsScraper::new("secret-api-key".to_string(), "user@example.com".to_string());
        let client = scraper.build_client().expect("client should build");
        let response = client
            .get(format!("{}/api/Search", source.uri()))
            .send()
            .await
            .expect("request should complete");

        assert_eq!(response.status(), StatusCode::FOUND);
        assert!(
            target.received_requests().await.unwrap().is_empty(),
            "USAJobs client must not forward Authorization-Key across redirects"
        );
    }

    #[test]
    fn test_builder_methods() {
        let scraper = UsaJobsScraper::new("key".to_string(), "email".to_string())
            .with_keywords("public health analyst")
            .with_location("Washington, DC", Some(25))
            .remote_only()
            .with_pay_grade(Some(11), Some(14))
            .posted_within_days(7)
            .with_limit(50);

        assert_eq!(scraper.keywords, Some("public health analyst".to_string()));
        assert_eq!(scraper.location, Some("Washington, DC".to_string()));
        assert_eq!(scraper.radius, Some(25));
        assert!(scraper.remote_only);
        assert_eq!(scraper.pay_grade_min, Some(11));
        assert_eq!(scraper.pay_grade_max, Some(14));
        assert_eq!(scraper.date_posted_days, Some(7));
        assert_eq!(scraper.limit, 50);
    }

    #[test]
    fn test_date_posted_capped_at_60() {
        let scraper =
            UsaJobsScraper::new("key".to_string(), "email".to_string()).posted_within_days(100);

        assert_eq!(scraper.date_posted_days, Some(60));
    }

    #[test]
    fn test_build_query_params_minimal() {
        let scraper = UsaJobsScraper::new("key".to_string(), "email".to_string());
        let params = scraper.build_query_params(1);

        // Should have DatePosted (default 30), Page, ResultsPerPage, Fields
        assert!(params.iter().any(|(k, v)| *k == "DatePosted" && v == "30"));
        assert!(params.iter().any(|(k, v)| *k == "Page" && v == "1"));
        assert!(params
            .iter()
            .any(|(k, v)| *k == "ResultsPerPage" && v == "100"));
        assert!(params.iter().any(|(k, v)| *k == "Fields" && v == "Full"));
    }

    #[test]
    fn test_build_query_params_full() {
        let scraper = UsaJobsScraper::new("key".to_string(), "email".to_string())
            .with_keywords("program coordinator")
            .with_location("Denver, CO", Some(50))
            .remote_only()
            .with_pay_grade(Some(12), Some(15))
            .posted_within_days(14);

        let params = scraper.build_query_params(2);

        assert!(params
            .iter()
            .any(|(k, v)| *k == "Keyword" && v == "program coordinator"));
        assert!(params
            .iter()
            .any(|(k, v)| *k == "LocationName" && v == "Denver, CO"));
        assert!(params.iter().any(|(k, v)| *k == "Radius" && v == "50"));
        assert!(params
            .iter()
            .any(|(k, v)| *k == "RemoteIndicator" && v == "true"));
        assert!(params.iter().any(|(k, v)| *k == "PayGradeLow" && v == "12"));
        assert!(params
            .iter()
            .any(|(k, v)| *k == "PayGradeHigh" && v == "15"));
        assert!(params.iter().any(|(k, v)| *k == "DatePosted" && v == "14"));
        assert!(params.iter().any(|(k, v)| *k == "Page" && v == "2"));
    }

    #[test]
    fn test_compute_hash_deterministic() {
        let hash1 = UsaJobsScraper::compute_hash(
            "Department of Health and Human Services",
            "Public Health Analyst",
            Some("Washington, DC"),
            "https://www.usajobs.gov/job/123456",
        );
        let hash2 = UsaJobsScraper::compute_hash(
            "Department of Health and Human Services",
            "Public Health Analyst",
            Some("Washington, DC"),
            "https://www.usajobs.gov/job/123456",
        );

        assert_eq!(hash1, hash2);
        assert_eq!(hash1.len(), 64);
    }

    #[test]
    fn test_compute_hash_unique() {
        let hash1 = UsaJobsScraper::compute_hash(
            "City Health Department",
            "Care Coordinator",
            Some("DC"),
            "https://usajobs.gov/1",
        );
        let hash2 = UsaJobsScraper::compute_hash(
            "City Health Department",
            "Public Health Analyst",
            Some("DC"),
            "https://usajobs.gov/2",
        );

        assert_ne!(hash1, hash2);
    }

    #[test]
    fn test_parse_salary_annual() {
        let scraper = UsaJobsScraper::new("key".to_string(), "email".to_string());

        let remunerations = vec![Remuneration {
            minimum_range: "105029".to_string(),
            maximum_range: "136553".to_string(),
            rate_interval_code: "PA".to_string(),
        }];

        let (min, max) = scraper.parse_salary(&remunerations);
        assert_eq!(min, Some(105029));
        assert_eq!(max, Some(136553));
    }

    #[test]
    fn test_parse_salary_hourly_converts_to_annual() {
        let scraper = UsaJobsScraper::new("key".to_string(), "email".to_string());

        let remunerations = vec![Remuneration {
            minimum_range: "50".to_string(),
            maximum_range: "75".to_string(),
            rate_interval_code: "PH".to_string(),
        }];

        let (min, max) = scraper.parse_salary(&remunerations);
        // 50 * 2080 = 104000, 75 * 2080 = 156000
        assert_eq!(min, Some(104000));
        assert_eq!(max, Some(156000));
    }

    #[test]
    fn test_parse_salary_empty() {
        let scraper = UsaJobsScraper::new("key".to_string(), "email".to_string());

        let remunerations: Vec<Remuneration> = vec![];
        let (min, max) = scraper.parse_salary(&remunerations);

        assert_eq!(min, None);
        assert_eq!(max, None);
    }

    #[test]
    fn test_parse_salary_invalid_numbers() {
        let scraper = UsaJobsScraper::new("key".to_string(), "email".to_string());

        let remunerations = vec![Remuneration {
            minimum_range: "not-a-number".to_string(),
            maximum_range: "also-not".to_string(),
            rate_interval_code: "PA".to_string(),
        }];

        let (min, max) = scraper.parse_salary(&remunerations);
        assert_eq!(min, None);
        assert_eq!(max, None);
    }

    #[test]
    fn test_scraper_name() {
        let scraper = UsaJobsScraper::new("key".to_string(), "email".to_string());
        assert_eq!(scraper.name(), "usajobs");
    }

    #[test]
    fn test_api_error_message_does_not_echo_response_body() {
        let body =
            r#"{"error":"No results for Hidden Program Coordinator Role in Private City, CO"}"#;
        let message = UsaJobsScraper::api_error_message(400, Some(body.chars().count()));

        assert_eq!(message, "USAJobs API error: 400 (response_body_chars: 78)");
        assert!(!message.contains("Hidden Program Coordinator Role"));
        assert!(!message.contains("Private City"));
    }

    #[test]
    fn test_api_error_message_handles_unavailable_body() {
        assert_eq!(
            UsaJobsScraper::api_error_message(503, None),
            "USAJobs API error: 503 (response_body_unavailable)"
        );
    }

    #[test]
    fn test_parse_job_complete() {
        let scraper = UsaJobsScraper::new("key".to_string(), "email".to_string());

        let item = SearchResultItem {
            matched_object_id: "123456".to_string(),
            matched_object_descriptor: JobDescriptor {
                position_title: "Public Health Analyst".to_string(),
                position_uri: "https://www.usajobs.gov/job/123456".to_string(),
                position_location_display: "Washington, DC".to_string(),
                organization_name: "Centers for Medicare & Medicaid Services".to_string(),
                department_name: "Department of Health and Human Services".to_string(),
                position_remuneration: vec![Remuneration {
                    minimum_range: "100000".to_string(),
                    maximum_range: "130000".to_string(),
                    rate_interval_code: "PA".to_string(),
                }],
                user_area: Some(UserArea {
                    details: Some(JobDetails {
                        job_summary: Some("Support community health programs".to_string()),
                        major_duties: None,
                    }),
                }),
            },
        };

        let job = scraper.parse_job(&item).unwrap();

        assert_eq!(job.title, "Public Health Analyst");
        assert_eq!(job.company, "Centers for Medicare & Medicaid Services");
        assert_eq!(job.url, "https://www.usajobs.gov/job/123456");
        assert_eq!(job.location, Some("Washington, DC".to_string()));
        assert_eq!(job.salary_min, Some(100000));
        assert_eq!(job.salary_max, Some(130000));
        assert_eq!(
            job.description,
            Some("Support community health programs".to_string())
        );
        assert_eq!(job.source, "usajobs");
        assert_eq!(job.currency, Some("USD".to_string()));
    }

    #[test]
    fn test_parse_job_remote_detection() {
        let scraper = UsaJobsScraper::new("key".to_string(), "email".to_string());

        let item = SearchResultItem {
            matched_object_id: "789".to_string(),
            matched_object_descriptor: JobDescriptor {
                position_title: "Remote Program Coordinator".to_string(),
                position_uri: "https://www.usajobs.gov/job/789".to_string(),
                position_location_display: "Anywhere in the U.S. (remote job)".to_string(),
                organization_name: "Administration for Community Living".to_string(),
                department_name: "Department of Health and Human Services".to_string(),
                position_remuneration: vec![],
                user_area: None,
            },
        };

        let job = scraper.parse_job(&item).unwrap();
        assert_eq!(job.remote, Some(true));
    }

    #[test]
    fn test_parse_job_fallback_to_department() {
        let scraper = UsaJobsScraper::new("key".to_string(), "email".to_string());

        let item = SearchResultItem {
            matched_object_id: "456".to_string(),
            matched_object_descriptor: JobDescriptor {
                position_title: "Analyst".to_string(),
                position_uri: "https://www.usajobs.gov/job/456".to_string(),
                position_location_display: "Denver, CO".to_string(),
                organization_name: "".to_string(), // Empty org name
                department_name: "Department of Veterans Affairs".to_string(),
                position_remuneration: vec![],
                user_area: None,
            },
        };

        let job = scraper.parse_job(&item).unwrap();
        assert_eq!(job.company, "Department of Veterans Affairs");
    }

    #[test]
    fn test_parse_job_missing_title_returns_none() {
        let scraper = UsaJobsScraper::new("key".to_string(), "email".to_string());

        let item = SearchResultItem {
            matched_object_id: "999".to_string(),
            matched_object_descriptor: JobDescriptor {
                position_title: "".to_string(),
                position_uri: "https://www.usajobs.gov/job/999".to_string(),
                position_location_display: "DC".to_string(),
                organization_name: "Test".to_string(),
                department_name: "Test".to_string(),
                position_remuneration: vec![],
                user_area: None,
            },
        };

        assert!(scraper.parse_job(&item).is_none());
    }

    #[test]
    fn test_parse_job_missing_url_returns_none() {
        let scraper = UsaJobsScraper::new("key".to_string(), "email".to_string());

        let item = SearchResultItem {
            matched_object_id: "888".to_string(),
            matched_object_descriptor: JobDescriptor {
                position_title: "Inventory Planner".to_string(),
                position_uri: "".to_string(),
                position_location_display: "DC".to_string(),
                organization_name: "Test".to_string(),
                department_name: "Test".to_string(),
                position_remuneration: vec![],
                user_area: None,
            },
        };

        assert!(scraper.parse_job(&item).is_none());
    }

    #[test]
    fn test_results_per_page_capped() {
        let scraper = UsaJobsScraper::new("key".to_string(), "email".to_string()).with_limit(1000); // Over the max

        let params = scraper.build_query_params(1);

        // Should be capped at MAX_RESULTS_PER_PAGE (500)
        let results_param = params.iter().find(|(k, _)| *k == "ResultsPerPage");
        assert!(results_param.is_some());
        let (_, value) = results_param.unwrap();
        assert_eq!(value, "500");
    }
}
