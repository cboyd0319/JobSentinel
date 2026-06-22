//! Glassdoor Job Scraper
//!
//! Scrapes jobs from Glassdoor using their public job search.
//!
//! Note: Glassdoor has strong Cloudflare protection. This scraper
//! attempts to fetch jobs using their JSON API endpoints and falls
//! back gracefully if blocked.

use super::error::ScraperError;
#[cfg(test)]
use super::http_client::send_with_retry_to_test_url;
use super::http_client::{read_text_with_limit, send_with_retry};
use super::rate_limiter::RateLimiter;
use super::{JobScraper, ScraperResult};
use crate::core::calculate_job_hash;
use crate::core::db::Job;

use async_trait::async_trait;
use chrono::Utc;
use scraper::{Html, Selector as HtmlSelector};

/// Glassdoor job scraper
#[derive(Debug, Clone)]
pub struct GlassdoorScraper {
    /// Search query (e.g., "office manager")
    pub query: String,
    /// Location filter (e.g., "San Francisco, CA")
    pub location: Option<String>,
    /// Maximum results to return
    pub limit: usize,
    /// Rate limiter for respecting Glassdoor's request limits
    pub rate_limiter: RateLimiter,
}

impl GlassdoorScraper {
    pub fn new(query: impl Into<String>, location: Option<String>, limit: usize) -> Self {
        Self {
            query: query.into(),
            location,
            limit,
            rate_limiter: RateLimiter::shared(),
        }
    }

    /// Fetch jobs from Glassdoor
    async fn fetch_jobs(&self) -> ScraperResult {
        tracing::info!(
            query_chars = self.query.chars().count(),
            has_location = self.location.is_some(),
            limit = self.limit,
            "Fetching jobs from Glassdoor"
        );

        // Use rate limiter (conservative due to Cloudflare protection)
        self.rate_limiter.wait("glassdoor", 200).await;

        // Build search URL - Glassdoor uses query parameters
        let query_encoded = urlencoding::encode(&self.query);
        let location_param = self
            .location
            .as_ref()
            .map(|l| format!("&locT=C&locId=0&locKeyword={}", urlencoding::encode(l)))
            .unwrap_or_default();

        // Try the JSON API endpoint first
        let api_url = format!(
            "https://www.glassdoor.com/Job/jobs.htm?sc.keyword={}{}&jobType=all",
            query_encoded, location_param
        );

        self.fetch_jobs_from_url(api_url).await
    }

    async fn fetch_jobs_from_url(&self, api_url: String) -> ScraperResult {
        let response = send_with_retry(&api_url, |client| Self::build_request(client, &api_url))
            .await
            .map_err(|e| ScraperError::from_anyhow("glassdoor", e))?;

        self.parse_response(api_url, response).await
    }

    #[cfg(test)]
    async fn fetch_jobs_from_test_url(&self, api_url: String) -> ScraperResult {
        let response =
            send_with_retry_to_test_url(&api_url, |client| Self::build_request(client, &api_url))
                .await
                .map_err(|e| ScraperError::from_anyhow("glassdoor", e))?;

        self.parse_response(api_url, response).await
    }

    fn build_request(client: &reqwest::Client, api_url: &str) -> reqwest::RequestBuilder {
        client
            .get(api_url)
            .header("User-Agent", super::http_client::DEFAULT_USER_AGENT)
            .header(
                "Accept",
                "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            )
            .header("Accept-Language", "en-US,en;q=0.5")
            .header("Connection", "keep-alive")
            .header("Upgrade-Insecure-Requests", "1")
    }

    async fn parse_response(&self, api_url: String, response: reqwest::Response) -> ScraperResult {
        let status = response.status();
        if !status.is_success() {
            if status.as_u16() == 403 || status.as_u16() == 503 {
                tracing::warn!("Glassdoor returned {} - likely Cloudflare blocked", status);
                return Err(ScraperError::BotProtection {
                    url: api_url,
                    protection_type: "Cloudflare".to_string(),
                });
            }
            return Err(ScraperError::http_status(
                status.as_u16(),
                &api_url,
                format!("Glassdoor request failed: {}", status),
            ));
        }

        let body = read_text_with_limit(response, &api_url).await?;

        if Self::is_bot_protection_page(&body) {
            tracing::warn!("Glassdoor: Cloudflare challenge detected, skipping");
            return Err(ScraperError::BotProtection {
                url: api_url,
                protection_type: "Cloudflare".to_string(),
            });
        }

        // Try to extract JSON data from the page
        self.parse_html(&body)
    }

    fn is_bot_protection_page(body: &str) -> bool {
        let body_lower = body.to_ascii_lowercase();
        [
            "cf-browser-verification",
            "checking your browser",
            "cf_chl_opt",
            "verify you are human",
            "access to this page has been denied",
            "attention required",
            "enable javascript and cookies to continue",
            "unusual traffic",
            "captcha",
        ]
        .iter()
        .any(|marker| body_lower.contains(marker))
    }

    /// Parse HTML response and extract job data
    fn parse_html(&self, html: &str) -> Result<Vec<Job>, ScraperError> {
        let mut jobs = Vec::with_capacity(self.limit);

        // Look for JSON-LD structured data (Schema.org JobPosting)
        if let Some(json_ld_jobs) = self.extract_json_ld(html)? {
            jobs.extend(json_ld_jobs);
        }

        // Also try to find embedded __NEXT_DATA__ or similar
        if jobs.is_empty() {
            if let Some(embedded_jobs) = self.extract_embedded_json(html)? {
                jobs.extend(embedded_jobs);
            }
        }

        // Limit results
        jobs.truncate(self.limit);

        tracing::info!("Found {} jobs from Glassdoor", jobs.len());
        Ok(jobs)
    }

    /// Extract jobs from JSON-LD structured data
    fn extract_json_ld(&self, html: &str) -> Result<Option<Vec<Job>>, ScraperError> {
        let document = Html::parse_document(html);
        let selector = HtmlSelector::parse("script[type='application/ld+json']").map_err(|_| {
            ScraperError::Generic {
                scraper: "glassdoor".to_string(),
                message: "Internal JSON-LD selector failed".to_string(),
            }
        })?;

        for script in document.select(&selector) {
            let json_str = script.inner_html();
            if let Ok(data) = serde_json::from_str::<serde_json::Value>(json_str.trim()) {
                if let Some(jobs) = self.parse_json_ld_data(&data) {
                    return Ok(Some(jobs));
                }
            }
        }
        Ok(None)
    }

    /// Parse JSON-LD JobPosting data
    fn parse_json_ld_data(&self, data: &serde_json::Value) -> Option<Vec<Job>> {
        let mut jobs = Vec::with_capacity(self.limit.min(20));

        // Handle array of job postings
        if let Some(arr) = data.as_array() {
            for item in arr {
                if item["@type"] == "JobPosting" {
                    if let Some(job) = self.json_ld_to_job(item) {
                        jobs.push(job);
                    }
                }
            }
        }

        // Handle single job posting
        if data["@type"] == "JobPosting" {
            if let Some(job) = self.json_ld_to_job(data) {
                jobs.push(job);
            }
        }

        // Handle ItemList containing job postings
        if data["@type"] == "ItemList" {
            if let Some(items) = data["itemListElement"].as_array() {
                for item in items {
                    let job_data = if item["@type"] == "JobPosting" {
                        item
                    } else {
                        &item["item"]
                    };
                    if let Some(job) = self.json_ld_to_job(job_data) {
                        jobs.push(job);
                    }
                }
            }
        }

        if jobs.is_empty() {
            None
        } else {
            Some(jobs)
        }
    }

    /// Convert JSON-LD JobPosting to Job struct
    fn json_ld_to_job(&self, data: &serde_json::Value) -> Option<Job> {
        let title = data["title"].as_str()?.to_string();
        let url = data["url"].as_str()?.to_string();

        let company = data["hiringOrganization"]["name"]
            .as_str()
            .unwrap_or("Unknown")
            .to_string();

        let location = data["jobLocation"]["address"]["addressLocality"]
            .as_str()
            .or_else(|| data["jobLocation"]["address"]["name"].as_str())
            .map(String::from);

        let description = data["description"].as_str().map(|d| {
            // Strip HTML if present
            Self::strip_html(d)
        });

        // Extract salary if available
        let (salary_min, salary_max) = self.extract_salary(data);

        let is_remote = self.is_remote(location.as_deref());
        let hash = Self::compute_hash(&company, &title, location.as_deref(), &url);

        Some(Job {
            id: 0,
            hash,
            title,
            company,
            url,
            location,
            description,
            score: None,
            score_reasons: None,
            source: "glassdoor".to_string(),
            remote: is_remote,
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

    /// Extract embedded JSON data from Next.js or similar frameworks
    fn extract_embedded_json(&self, html: &str) -> Result<Option<Vec<Job>>, ScraperError> {
        // Look for __NEXT_DATA__ pattern
        if let Some(start) = html.find("__NEXT_DATA__") {
            if let Some(json_start) = html[start..].find('{') {
                let remaining = &html[start + json_start..];
                if let Some(script_end) = remaining.find("</script>") {
                    let json_str = &remaining[..script_end];
                    if let Ok(data) = serde_json::from_str::<serde_json::Value>(json_str) {
                        return Ok(self.parse_next_data(&data));
                    }
                }
            }
        }

        // Look for window.__PRELOADED_STATE__ pattern
        if let Some(start) = html.find("__PRELOADED_STATE__") {
            if let Some(json_start) = html[start..].find('=') {
                let remaining = &html[start + json_start + 1..].trim_start();
                if let Some(end) = remaining.find("</script>") {
                    // Trim trailing semicolon if present
                    let json_str = remaining[..end].trim().trim_end_matches(';');
                    if let Ok(data) = serde_json::from_str::<serde_json::Value>(json_str) {
                        return Ok(self.parse_preloaded_state(&data));
                    }
                }
            }
        }

        Ok(None)
    }

    /// Parse Next.js __NEXT_DATA__ structure
    fn parse_next_data(&self, data: &serde_json::Value) -> Option<Vec<Job>> {
        // Navigate to jobs array - structure varies by page
        let jobs_data = data["props"]["pageProps"]["jobs"]
            .as_array()
            .or_else(|| data["props"]["pageProps"]["jobListings"].as_array())
            .or_else(|| data["props"]["initialData"]["jobs"].as_array())?;

        let jobs: Vec<Job> = jobs_data
            .iter()
            .filter_map(|j| self.parse_job_object(j))
            .collect();

        if jobs.is_empty() {
            None
        } else {
            Some(jobs)
        }
    }

    /// Parse __PRELOADED_STATE__ structure
    fn parse_preloaded_state(&self, data: &serde_json::Value) -> Option<Vec<Job>> {
        // Try common state paths
        let jobs_data = data["jobs"]["entities"]
            .as_object()
            .map(|o| o.values().cloned().collect::<Vec<_>>())
            .or_else(|| data["jobListings"].as_array().cloned())?;

        let jobs: Vec<Job> = jobs_data
            .iter()
            .filter_map(|j| self.parse_job_object(j))
            .collect();

        if jobs.is_empty() {
            None
        } else {
            Some(jobs)
        }
    }

    /// Parse a generic job object from embedded JSON
    fn parse_job_object(&self, data: &serde_json::Value) -> Option<Job> {
        // Try various field names used by Glassdoor
        let title = data["jobTitle"]
            .as_str()
            .or_else(|| data["title"].as_str())
            .or_else(|| data["job_title"].as_str())?
            .to_string();

        let company = data["employer"]["name"]
            .as_str()
            .or_else(|| data["employerName"].as_str())
            .or_else(|| data["company"].as_str())
            .unwrap_or("Unknown")
            .to_string();

        let url = data["jobViewUrl"]
            .as_str()
            .or_else(|| data["url"].as_str())
            .or_else(|| data["link"].as_str())
            .map(|u| {
                if u.starts_with("http") {
                    u.to_string()
                } else {
                    format!("https://www.glassdoor.com{}", u)
                }
            })?;

        let location = data["location"]
            .as_str()
            .or_else(|| data["locationName"].as_str())
            .map(String::from);

        let description = data["description"]
            .as_str()
            .or_else(|| data["jobDescription"].as_str())
            .map(Self::strip_html);

        let (salary_min, salary_max) = self.extract_salary(data);

        let is_remote = self.is_remote(location.as_deref());
        let hash = Self::compute_hash(&company, &title, location.as_deref(), &url);

        Some(Job {
            id: 0,
            hash,
            title,
            company,
            url,
            location,
            description,
            score: None,
            score_reasons: None,
            source: "glassdoor".to_string(),
            remote: is_remote,
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

    /// Extract salary information from job data
    fn extract_salary(&self, data: &serde_json::Value) -> (Option<i64>, Option<i64>) {
        // Try Schema.org baseSalary format
        if let Some(base_salary) = data.get("baseSalary") {
            let min = base_salary["value"]["minValue"]
                .as_f64()
                .or_else(|| base_salary["value"]["value"].as_f64())
                .map(|v| v as i64);

            let max = base_salary["value"]["maxValue"]
                .as_f64()
                .or_else(|| base_salary["value"]["value"].as_f64())
                .map(|v| v as i64);

            if min.is_some() || max.is_some() {
                return (min, max);
            }
        }

        // Try Glassdoor-specific salary fields
        let min = data["salaryRange"]["min"]
            .as_f64()
            .or_else(|| data["payEstimate"]["min"].as_f64())
            .or_else(|| data["salary"]["min"].as_f64())
            .map(|v| v as i64);

        let max = data["salaryRange"]["max"]
            .as_f64()
            .or_else(|| data["payEstimate"]["max"].as_f64())
            .or_else(|| data["salary"]["max"].as_f64())
            .map(|v| v as i64);

        (min, max)
    }

    /// Check if job appears to be remote based on location
    #[allow(clippy::single_option_map)]
    fn is_remote(&self, location: Option<&str>) -> Option<bool> {
        location.map(|l| {
            let lower = l.to_lowercase();
            lower.contains("remote")
                || lower.contains("anywhere")
                || lower.contains("work from home")
        })
    }

    /// Strip HTML tags from text
    fn strip_html(html: &str) -> String {
        let mut result = String::new();
        let mut in_tag = false;

        for c in html.chars() {
            match c {
                '<' => in_tag = true,
                '>' => in_tag = false,
                _ if !in_tag => result.push(c),
                _ => {}
            }
        }

        // Clean up whitespace
        result.split_whitespace().collect::<Vec<_>>().join(" ")
    }

    /// Compute SHA-256 hash for deduplication
    fn compute_hash(company: &str, title: &str, location: Option<&str>, url: &str) -> String {
        calculate_job_hash(company, title, location, url)
    }
}

#[async_trait]
impl JobScraper for GlassdoorScraper {
    async fn scrape(&self) -> ScraperResult {
        self.fetch_jobs().await
    }

    fn name(&self) -> &'static str {
        "glassdoor"
    }
}

#[cfg(test)]
mod tests;
