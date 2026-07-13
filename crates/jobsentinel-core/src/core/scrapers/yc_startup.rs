//! Y Combinator Work at a Startup Scraper
//!
//! Scrapes jobs from Y Combinator's job board for YC-backed startups.
//! The page uses Inertia.js: job data is embedded as JSON in a `data-page`
//! attribute on `<div id="app">`. We extract that attribute, parse the JSON,
//! and walk `props.companiesWithJobs[].jobPostings[]`.

use super::error::ScraperError;
use super::http_client::{read_text_with_limit, send_with_retry};
use super::rate_limiter::RateLimiter;
use super::{JobScraper, ScraperResult};
use crate::core::calculate_job_hash;
use crate::core::Job;

use async_trait::async_trait;
use chrono::Utc;
use scraper::{Html, Selector};

const YC_BASE_URL: &str = "https://www.ycombinator.com";
const YC_JOBS_URL: &str = "https://www.ycombinator.com/jobs";

/// Y Combinator Work at a Startup scraper
#[derive(Debug, Clone)]
pub struct YcStartupScraper {
    /// Optional keyword filter
    pub query: Option<String>,
    /// Filter for remote jobs only
    pub remote_only: bool,
    /// Maximum results to return
    pub limit: usize,
    /// Rate limiter for respecting YC's request limits
    pub rate_limiter: RateLimiter,
}

impl YcStartupScraper {
    pub fn new(query: Option<String>, remote_only: bool, limit: usize) -> Self {
        Self {
            query,
            remote_only,
            limit,
            rate_limiter: RateLimiter::shared(),
        }
    }

    /// Build the search URL.
    ///
    /// Note: the Inertia page ignores query params — filtering happens
    /// client-side — but we keep the params for potential future use and
    /// so that URL-building tests remain stable.
    fn build_url(&self) -> String {
        let mut url = YC_JOBS_URL.to_string();

        let mut params = vec![];
        if let Some(q) = &self.query {
            params.push(format!("query={}", urlencoding::encode(q)));
        }
        if self.remote_only {
            params.push("remote=true".to_string());
        }

        if !params.is_empty() {
            url.push('?');
            url.push_str(&params.join("&"));
        }

        url
    }

    /// Fetch jobs from YC
    async fn fetch_jobs(&self) -> ScraperResult {
        tracing::info!("Fetching jobs from Y Combinator Work at a Startup");

        self.rate_limiter.wait("yc_startup", 300).await;

        let url = self.build_url();

        let response = send_with_retry(&url, |client| {
            client
                .get(&url)
                .header("User-Agent", super::http_client::DEFAULT_USER_AGENT)
                .header(
                    "Accept",
                    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                )
        })
        .await
        .map_err(|e| ScraperError::from_anyhow("yc_startup", e))?;

        if !response.status().is_success() {
            return Err(ScraperError::http_status(
                response.status().as_u16(),
                &url,
                format!("YC Work at a Startup request failed: {}", response.status()),
            ));
        }

        let html = read_text_with_limit(response, &url).await?;
        let jobs = self.parse_inertia_page(&html)?;

        tracing::info!("Found {} jobs from YC Work at a Startup", jobs.len());
        Ok(jobs)
    }

    /// Extract jobs from an Inertia.js page.
    ///
    /// The page has `<div id="app" data-page="...">` where the attribute value
    /// is a JSON-encoded Inertia payload. We parse that JSON and walk:
    ///
    /// ```text
    /// props.companiesWithJobs[].jobPostings[]
    ///   .title      – job title
    ///   .url        – relative path, e.g. /companies/startup/jobs/slug
    ///   .location   – string or null
    ///   .type       – e.g. "Full Time"
    ///   .role       – role category (optional, ignored)
    ///   .salaryRange – string, e.g. "$120K - $180K" (optional)
    ///
    /// props.companiesWithJobs[].company.name  – company name
    /// ```
    ///
    /// Page-shape drift is reported as a source error so health checks do not
    /// treat a broken page as a successful empty result.
    fn parse_inertia_page(&self, html: &str) -> Result<Vec<Job>, ScraperError> {
        let payload = match Self::extract_inertia_payload(html) {
            Some(p) => p,
            None => {
                tracing::warn!("YC scraper: could not find Inertia data-page attribute");
                return Err(ScraperError::SelectorNotFound {
                    url: YC_JOBS_URL.to_string(),
                    selector: "div#app[data-page]".to_string(),
                });
            }
        };

        let data: serde_json::Value = match serde_json::from_str(&payload) {
            Ok(v) => v,
            Err(_) => {
                let source =
                    std::io::Error::new(std::io::ErrorKind::InvalidData, "Invalid Inertia JSON");
                tracing::warn!("YC scraper: failed to parse Inertia JSON");
                return Err(ScraperError::ParseError {
                    format: "JSON".to_string(),
                    url: YC_JOBS_URL.to_string(),
                    source: Box::new(source),
                });
            }
        };

        // Walk props.companiesWithJobs
        let companies = match data
            .get("props")
            .and_then(|p| p.get("companiesWithJobs"))
            .and_then(|c| c.as_array())
        {
            Some(arr) => arr,
            None => {
                tracing::warn!("YC scraper: props.companiesWithJobs not found in payload");
                return Err(ScraperError::MissingField {
                    field: "props.companiesWithJobs".to_string(),
                    url: YC_JOBS_URL.to_string(),
                });
            }
        };

        let mut jobs: Vec<Job> = Vec::new();
        let mut found_job_postings_array = false;

        'companies: for company_obj in companies {
            let company_name = company_obj
                .get("company")
                .and_then(|c| c.get("name"))
                .and_then(|n| n.as_str())
                .unwrap_or("YC Startup")
                .trim()
                .to_string();

            let postings = match company_obj.get("jobPostings").and_then(|p| p.as_array()) {
                Some(arr) => {
                    found_job_postings_array = true;
                    arr
                }
                None => continue,
            };

            for posting in postings {
                let title = posting
                    .get("title")
                    .and_then(|t| t.as_str())
                    .unwrap_or("")
                    .trim()
                    .to_string();

                if title.is_empty() || title.len() < 3 {
                    continue;
                }

                let relative_url = posting
                    .get("url")
                    .and_then(|u| u.as_str())
                    .unwrap_or("")
                    .trim();

                if relative_url.is_empty() {
                    continue;
                }

                let url = if relative_url.starts_with("http") {
                    relative_url.to_string()
                } else {
                    format!("{}{}", YC_BASE_URL, relative_url)
                };

                // Deduplicate by URL
                if jobs.iter().any(|j: &Job| j.url == url) {
                    continue;
                }

                let location = posting
                    .get("location")
                    .and_then(|l| l.as_str())
                    .map(|s| s.trim().to_string())
                    .filter(|s| !s.is_empty());

                let is_remote = Self::is_remote(&title, location.as_deref());

                if self.remote_only && !is_remote {
                    continue;
                }

                if let Some(q) = &self.query {
                    let q_lower = q.to_lowercase();
                    if !title.to_lowercase().contains(&q_lower)
                        && !company_name.to_lowercase().contains(&q_lower)
                    {
                        continue;
                    }
                }

                let (salary_min, salary_max) = posting
                    .get("salaryRange")
                    .and_then(|s| s.as_str())
                    .map(Self::parse_salary_range)
                    .unwrap_or((None, None));

                let hash = Self::compute_hash(&company_name, &title, location.as_deref(), &url);

                jobs.push(Job {
                    id: 0,
                    hash,
                    title,
                    company: company_name.clone(),
                    url,
                    location,
                    description: None,
                    score: None,
                    score_reasons: None,
                    source: "yc_startup".to_string(),
                    remote: Some(is_remote),
                    salary_min,
                    salary_max,
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

                if jobs.len() >= self.limit {
                    break 'companies;
                }
            }
        }

        if !companies.is_empty() && !found_job_postings_array {
            tracing::warn!("YC scraper: companiesWithJobs items missing jobPostings arrays");
            return Err(ScraperError::MissingField {
                field: "props.companiesWithJobs[].jobPostings".to_string(),
                url: YC_JOBS_URL.to_string(),
            });
        }

        Ok(jobs)
    }

    /// Extract the raw JSON string from the `data-page` attribute on `<div id="app">`.
    fn extract_inertia_payload(html: &str) -> Option<String> {
        let document = Html::parse_document(html);
        // unwrap is safe — this is a static, known-valid selector
        #[allow(clippy::unwrap_used)]
        let selector = Selector::parse(r#"div#app[data-page]"#).unwrap();

        let element = document.select(&selector).next()?;
        let raw = element.value().attr("data-page")?;

        // html5ever (used by scraper) decodes HTML entities in attribute values
        // during parsing, so `raw` is already the unescaped JSON string.
        Some(raw.to_string())
    }

    /// Parse a salary range string like "$120K - $180K" into (min_cents, max_cents).
    ///
    /// Returns `(None, None)` if the string can't be parsed rather than failing.
    fn parse_salary_range(range: &str) -> (Option<i64>, Option<i64>) {
        // Collect all dollar amounts from the string
        let amounts: Vec<i64> = range
            .split(['-', '–', '—', '~'])
            .filter_map(|part| Self::parse_salary_amount(part.trim()))
            .collect();

        match amounts.as_slice() {
            [min, max, ..] => (Some(*min), Some(*max)),
            [single] => (Some(*single), None),
            [] => (None, None),
        }
    }

    /// Parse a single salary token like "$120K" or "$180,000" into an integer.
    fn parse_salary_amount(s: &str) -> Option<i64> {
        let cleaned = s.replace(['$', ',', ' '], "").to_uppercase();

        if cleaned.is_empty() {
            return None;
        }

        let (num_str, multiplier) = if let Some(stripped) = cleaned.strip_suffix('K') {
            (stripped, 1_000i64)
        } else if let Some(stripped) = cleaned.strip_suffix('M') {
            (stripped, 1_000_000i64)
        } else {
            (cleaned.as_str(), 1i64)
        };

        num_str
            .parse::<f64>()
            .ok()
            .map(|n| (n * multiplier as f64) as i64)
    }

    /// Check if job is remote based on title and location strings
    fn is_remote(title: &str, location: Option<&str>) -> bool {
        let title_lower = title.to_lowercase();
        let loc_lower = location.map(|l| l.to_lowercase()).unwrap_or_default();

        title_lower.contains("remote")
            || loc_lower.contains("remote")
            || loc_lower.contains("anywhere")
            || loc_lower.contains("distributed")
    }

    /// Compute SHA-256 hash for deduplication
    fn compute_hash(company: &str, title: &str, location: Option<&str>, url: &str) -> String {
        calculate_job_hash(company, title, location, url)
    }
}

#[async_trait]
impl JobScraper for YcStartupScraper {
    async fn scrape(&self) -> ScraperResult {
        self.fetch_jobs().await
    }

    #[cfg(test)]
    fn name(&self) -> &'static str {
        "yc_startup"
    }
}

#[cfg(test)]
mod tests;
