//! Y Combinator Work at a Startup Scraper
//!
//! Scrapes jobs from Y Combinator's job board for YC-backed startups.
//! The page uses Inertia.js: job data is embedded as JSON in a `data-page`
//! attribute on `<div id="app">`. We extract that attribute, parse the JSON,
//! and walk `props.companiesWithJobs[].jobPostings[]`.

use super::error::ScraperError;
use super::http_client::get_client;
use super::rate_limiter::RateLimiter;
use super::{location_utils, title_utils, url_utils, JobScraper, ScraperResult};
use crate::core::db::Job;

use async_trait::async_trait;
use chrono::Utc;
use scraper::{Html, Selector};
use sha2::{Digest, Sha256};

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
            rate_limiter: RateLimiter::new(),
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

        let client = get_client();
        let url = self.build_url();

        let response = client
            .get(&url)
            .header(
                "User-Agent",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) \
                 AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            )
            .header(
                "Accept",
                "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            )
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(ScraperError::http_status(
                response.status().as_u16(),
                &url,
                format!("YC Work at a Startup request failed: {}", response.status()),
            ));
        }

        let html = response.text().await?;
        let jobs = self.parse_inertia_page(&html);

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
    /// On any parse failure we log a warning and return an empty vec — this
    /// matches the existing scheduler fallback behaviour.
    fn parse_inertia_page(&self, html: &str) -> Vec<Job> {
        let payload = match Self::extract_inertia_payload(html) {
            Some(p) => p,
            None => {
                tracing::warn!("YC scraper: could not find Inertia data-page attribute");
                return vec![];
            }
        };

        let data: serde_json::Value = match serde_json::from_str(&payload) {
            Ok(v) => v,
            Err(e) => {
                tracing::warn!("YC scraper: failed to parse Inertia JSON: {}", e);
                return vec![];
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
                return vec![];
            }
        };

        let mut jobs: Vec<Job> = Vec::new();

        'companies: for company_obj in companies {
            let company_name = company_obj
                .get("company")
                .and_then(|c| c.get("name"))
                .and_then(|n| n.as_str())
                .unwrap_or("YC Startup")
                .trim()
                .to_string();

            let postings = match company_obj
                .get("jobPostings")
                .and_then(|p| p.as_array())
            {
                Some(arr) => arr,
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

                let hash =
                    Self::compute_hash(&company_name, &title, location.as_deref(), &url);

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

        jobs
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
        let cleaned = s
            .replace(['$', ',', ' '], "")
            .to_uppercase();

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
impl JobScraper for YcStartupScraper {
    async fn scrape(&self) -> ScraperResult {
        self.fetch_jobs().await
    }

    fn name(&self) -> &'static str {
        "yc_startup"
    }
}

// ---------------------------------------------------------------------------
// Helpers for building test fixtures
// ---------------------------------------------------------------------------

#[cfg(test)]
mod test_helpers {
    /// Wrap an Inertia JSON payload in minimal HTML that the scraper expects.
    ///
    /// The JSON is embedded as a double-quoted HTML attribute value.
    /// html5ever decodes `&quot;` → `"` during parsing, so we encode
    /// double-quotes before embedding so the HTML stays well-formed.
    pub fn inertia_html(payload_json: &str) -> String {
        let encoded = payload_json.replace('&', "&amp;").replace('"', "&quot;");
        format!(
            r#"<!DOCTYPE html>
<html>
<head><title>YC Jobs</title></head>
<body>
<div id="app" data-page="{encoded}"></div>
</body>
</html>"#
        )
    }

    /// Build a minimal Inertia payload JSON string with the given companies.
    ///
    /// `companies` is a list of `(company_name, Vec<(title, url_path, location)>)`.
    pub fn build_payload(companies: &[(&str, Vec<(&str, &str, Option<&str>)>)]) -> String {
        let companies_json: Vec<String> = companies
            .iter()
            .map(|(name, postings)| {
                let postings_json: Vec<String> = postings
                    .iter()
                    .map(|(title, url, location)| {
                        let loc = match location {
                            Some(l) => format!(r#""{}""#, l),
                            None => "null".to_string(),
                        };
                        format!(
                            r#"{{"title":"{title}","url":"{url}","location":{loc},"type":"Full Time","role":"eng","salaryRange":null}}"#
                        )
                    })
                    .collect();
                format!(
                    r#"{{"company":{{"name":"{name}"}},"jobPostings":[{}]}}"#,
                    postings_json.join(",")
                )
            })
            .collect();

        format!(
            r#"{{"component":"Jobs","props":{{"companiesWithJobs":[{}]}},"url":"/jobs","version":"1"}}"#,
            companies_json.join(",")
        )
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::test_helpers::{build_payload, inertia_html};
    use super::*;

    // -- URL building (unchanged behaviour) -----------------------------------

    #[test]
    fn test_build_url_basic() {
        let scraper = YcStartupScraper::new(None, false, 20);
        assert_eq!(scraper.build_url(), "https://www.ycombinator.com/jobs");
    }

    #[test]
    fn test_build_url_with_query() {
        let scraper = YcStartupScraper::new(Some("rust".to_string()), false, 10);
        assert!(scraper.build_url().contains("query=rust"));
    }

    #[test]
    fn test_build_url_remote_only() {
        let scraper = YcStartupScraper::new(None, true, 10);
        assert!(scraper.build_url().contains("remote=true"));
    }

    #[test]
    fn test_build_url_all_params() {
        let scraper = YcStartupScraper::new(Some("engineer".to_string()), true, 10);
        let url = scraper.build_url();
        assert!(url.contains("query=engineer"));
        assert!(url.contains("remote=true"));
    }

    #[test]
    fn test_build_url_special_characters() {
        let scraper = YcStartupScraper::new(Some("full stack".to_string()), false, 10);
        assert!(scraper.build_url().contains("query=full%20stack"));
    }

    // -- Metadata -------------------------------------------------------------

    #[test]
    fn test_scraper_name() {
        let scraper = YcStartupScraper::new(None, false, 10);
        assert_eq!(scraper.name(), "yc_startup");
    }

    #[test]
    fn test_new_constructor() {
        let scraper = YcStartupScraper::new(Some("rust".to_string()), true, 50);
        assert_eq!(scraper.query, Some("rust".to_string()));
        assert!(scraper.remote_only);
        assert_eq!(scraper.limit, 50);
    }

    // -- Hash -----------------------------------------------------------------

    #[test]
    fn test_compute_hash_deterministic() {
        let h1 = YcStartupScraper::compute_hash(
            "Startup Inc",
            "Founding Engineer",
            Some("San Francisco"),
            "https://ycombinator.com/companies/startup/jobs/123",
        );
        let h2 = YcStartupScraper::compute_hash(
            "Startup Inc",
            "Founding Engineer",
            Some("San Francisco"),
            "https://ycombinator.com/companies/startup/jobs/123",
        );
        assert_eq!(h1, h2);
        assert_eq!(h1.len(), 64);
    }

    #[test]
    fn test_compute_hash_different_inputs() {
        let h1 = YcStartupScraper::compute_hash(
            "Startup A",
            "Engineer",
            Some("Remote"),
            "https://ycombinator.com/jobs/1",
        );
        let h2 = YcStartupScraper::compute_hash(
            "Startup B",
            "Engineer",
            Some("Remote"),
            "https://ycombinator.com/jobs/1",
        );
        assert_ne!(h1, h2);
    }

    #[test]
    fn test_compute_hash_without_location() {
        let hash =
            YcStartupScraper::compute_hash("Startup Inc", "Engineer", None, "https://ycombinator.com/jobs/123");
        assert_eq!(hash.len(), 64);
    }

    #[test]
    fn test_compute_hash_none_location_consistency() {
        let h1 = YcStartupScraper::compute_hash("Company", "Title", None, "url");
        let h2 = YcStartupScraper::compute_hash("Company", "Title", None, "url");
        assert_eq!(h1, h2);
    }

    // -- is_remote ------------------------------------------------------------

    #[test]
    fn test_is_remote() {
        assert!(YcStartupScraper::is_remote("Remote Software Engineer", None));
        assert!(YcStartupScraper::is_remote("Engineer", Some("Remote, US")));
        assert!(YcStartupScraper::is_remote("Developer", Some("Anywhere")));
        assert!(!YcStartupScraper::is_remote("Developer", Some("San Francisco, CA")));
    }

    #[test]
    fn test_is_remote_distributed() {
        assert!(YcStartupScraper::is_remote("Engineer", Some("Distributed team")));
        assert!(YcStartupScraper::is_remote("Engineer", Some("distributed")));
    }

    #[test]
    fn test_is_remote_case_insensitive() {
        assert!(YcStartupScraper::is_remote("REMOTE Engineer", None));
        assert!(YcStartupScraper::is_remote("Engineer", Some("ANYWHERE")));
    }

    #[test]
    fn test_is_remote_distributed_keyword() {
        assert!(YcStartupScraper::is_remote("Engineer", Some("Distributed team")));
        assert!(YcStartupScraper::is_remote("Developer", Some("fully distributed")));
    }

    // -- Salary parsing -------------------------------------------------------

    #[test]
    fn test_parse_salary_range_k_format() {
        let (min, max) = YcStartupScraper::parse_salary_range("$120K - $180K");
        assert_eq!(min, Some(120_000));
        assert_eq!(max, Some(180_000));
    }

    #[test]
    fn test_parse_salary_range_full_numbers() {
        let (min, max) = YcStartupScraper::parse_salary_range("$100,000 - $150,000");
        assert_eq!(min, Some(100_000));
        assert_eq!(max, Some(150_000));
    }

    #[test]
    fn test_parse_salary_range_single_value() {
        let (min, max) = YcStartupScraper::parse_salary_range("$90K");
        assert_eq!(min, Some(90_000));
        assert_eq!(max, None);
    }

    #[test]
    fn test_parse_salary_range_empty() {
        let (min, max) = YcStartupScraper::parse_salary_range("");
        assert_eq!(min, None);
        assert_eq!(max, None);
    }

    #[test]
    fn test_parse_salary_range_unparseable() {
        let (min, max) = YcStartupScraper::parse_salary_range("Competitive");
        assert_eq!(min, None);
        assert_eq!(max, None);
    }

    // -- Inertia page parsing -------------------------------------------------

    #[test]
    fn test_parse_inertia_basic_jobs() {
        let scraper = YcStartupScraper::new(None, false, 10);
        let payload = build_payload(&[
            (
                "AI Startup Inc",
                vec![
                    (
                        "Senior Backend Engineer",
                        "/companies/ai-startup/jobs/backend-123",
                        Some("San Francisco, CA"),
                    ),
                    (
                        "Frontend Developer",
                        "/companies/ai-startup/jobs/frontend-456",
                        Some("Remote"),
                    ),
                ],
            ),
        ]);
        let html = inertia_html(&payload);
        let jobs = scraper.parse_inertia_page(&html);

        assert_eq!(jobs.len(), 2);

        assert_eq!(jobs[0].title, "Senior Backend Engineer");
        assert_eq!(jobs[0].company, "AI Startup Inc");
        assert_eq!(
            jobs[0].url,
            "https://www.ycombinator.com/companies/ai-startup/jobs/backend-123"
        );
        assert_eq!(jobs[0].source, "yc_startup");
        assert_eq!(jobs[0].remote, Some(false));

        assert_eq!(jobs[1].title, "Frontend Developer");
        assert_eq!(jobs[1].remote, Some(true));
    }

    #[test]
    fn test_parse_inertia_absolute_url_preserved() {
        let scraper = YcStartupScraper::new(None, false, 10);
        let payload = r#"{"component":"Jobs","props":{"companiesWithJobs":[{"company":{"name":"Startup"},"jobPostings":[{"title":"Platform Engineer","url":"https://www.ycombinator.com/companies/startup/jobs/123","location":null,"type":"Full Time","role":"eng","salaryRange":null}]}]},"url":"/jobs","version":"1"}"#;
        let html = inertia_html(payload);
        let jobs = scraper.parse_inertia_page(&html);

        assert_eq!(jobs.len(), 1);
        assert!(jobs[0].url.starts_with("https://"));
        // Must not double-prefix
        assert!(!jobs[0].url.contains("ycombinator.comhttps://"));
    }

    #[test]
    fn test_parse_inertia_empty_document() {
        let scraper = YcStartupScraper::new(None, false, 10);
        let jobs = scraper.parse_inertia_page("<html><body></body></html>");
        assert_eq!(jobs.len(), 0);
    }

    #[test]
    fn test_parse_inertia_no_companies_with_jobs_key() {
        let scraper = YcStartupScraper::new(None, false, 10);
        let payload = r#"{"component":"Jobs","props":{"other":[]},"url":"/jobs","version":"1"}"#;
        let html = inertia_html(payload);
        let jobs = scraper.parse_inertia_page(&html);
        assert_eq!(jobs.len(), 0);
    }

    #[test]
    fn test_parse_inertia_malformed_json_returns_empty() {
        let scraper = YcStartupScraper::new(None, false, 10);
        // data-page is present but contains garbage JSON
        let html = r#"<html><body><div id="app" data-page="not valid json at all"></div></body></html>"#;
        let jobs = scraper.parse_inertia_page(html);
        assert_eq!(jobs.len(), 0);
    }

    #[test]
    fn test_parse_inertia_skips_empty_title() {
        let scraper = YcStartupScraper::new(None, false, 10);
        let payload = build_payload(&[
            (
                "TechCorp",
                vec![
                    ("", "/companies/techcorp/jobs/1", None),
                    ("Real Engineer", "/companies/techcorp/jobs/2", None),
                ],
            ),
        ]);
        let html = inertia_html(&payload);
        let jobs = scraper.parse_inertia_page(&html);
        assert_eq!(jobs.len(), 1);
        assert_eq!(jobs[0].title, "Real Engineer");
    }

    #[test]
    fn test_parse_inertia_skips_short_title() {
        let scraper = YcStartupScraper::new(None, false, 10);
        let payload = build_payload(&[(
            "TechCorp",
            vec![("AB", "/companies/techcorp/jobs/1", None)],
        )]);
        let html = inertia_html(&payload);
        let jobs = scraper.parse_inertia_page(&html);
        assert_eq!(jobs.len(), 0);
    }

    #[test]
    fn test_parse_inertia_company_name_fallback() {
        let scraper = YcStartupScraper::new(None, false, 10);
        // company.name is missing
        let payload = r#"{"component":"Jobs","props":{"companiesWithJobs":[{"company":{},"jobPostings":[{"title":"Software Engineer","url":"/companies/x/jobs/1","location":null,"type":"Full Time","role":"eng","salaryRange":null}]}]},"url":"/jobs","version":"1"}"#;
        let html = inertia_html(payload);
        let jobs = scraper.parse_inertia_page(&html);
        assert_eq!(jobs.len(), 1);
        assert_eq!(jobs[0].company, "YC Startup");
    }

    #[test]
    fn test_parse_inertia_deduplicates_urls() {
        let scraper = YcStartupScraper::new(None, false, 10);
        let payload = build_payload(&[
            (
                "Startup",
                vec![
                    ("Engineer", "/companies/startup/jobs/123", None),
                    ("Senior Engineer", "/companies/startup/jobs/123", None),
                ],
            ),
        ]);
        let html = inertia_html(&payload);
        let jobs = scraper.parse_inertia_page(&html);
        assert_eq!(jobs.len(), 1);
    }

    #[test]
    fn test_parse_inertia_limit_respected() {
        let scraper = YcStartupScraper::new(None, false, 2);
        let payload = build_payload(&[
            (
                "Startup",
                vec![
                    ("Job 1", "/companies/s/jobs/1", None),
                    ("Job 2", "/companies/s/jobs/2", None),
                    ("Job 3", "/companies/s/jobs/3", None),
                ],
            ),
        ]);
        let html = inertia_html(&payload);
        let jobs = scraper.parse_inertia_page(&html);
        assert_eq!(jobs.len(), 2);
    }

    #[test]
    fn test_parse_inertia_remote_filter() {
        let scraper = YcStartupScraper::new(None, true, 10);
        let payload = build_payload(&[(
            "Startup",
            vec![
                ("Remote Engineer", "/companies/s/jobs/1", Some("Remote")),
                ("Onsite Engineer", "/companies/s/jobs/2", Some("San Francisco")),
            ],
        )]);
        let html = inertia_html(&payload);
        let jobs = scraper.parse_inertia_page(&html);
        assert_eq!(jobs.len(), 1);
        assert_eq!(jobs[0].remote, Some(true));
    }

    #[test]
    fn test_parse_inertia_query_filter_title() {
        let scraper = YcStartupScraper::new(Some("rust".to_string()), false, 10);
        let payload = build_payload(&[(
            "Startup",
            vec![
                ("Rust Engineer", "/companies/s/jobs/1", None),
                ("Python Developer", "/companies/s/jobs/2", None),
            ],
        )]);
        let html = inertia_html(&payload);
        let jobs = scraper.parse_inertia_page(&html);
        assert_eq!(jobs.len(), 1);
        assert!(jobs[0].title.to_lowercase().contains("rust"));
    }

    #[test]
    fn test_parse_inertia_query_filter_company() {
        let scraper = YcStartupScraper::new(Some("ai".to_string()), false, 10);
        let payload = build_payload(&[
            (
                "AI Innovations Inc",
                vec![("Software Engineer", "/companies/ai/jobs/1", None)],
            ),
            (
                "WebCorp",
                vec![("Backend Developer", "/companies/web/jobs/2", None)],
            ),
        ]);
        let html = inertia_html(&payload);
        let jobs = scraper.parse_inertia_page(&html);
        assert_eq!(jobs.len(), 1);
        assert!(jobs[0].company.to_lowercase().contains("ai"));
    }

    #[test]
    fn test_parse_inertia_query_filter_case_insensitive() {
        let scraper = YcStartupScraper::new(Some("ENGINEER".to_string()), false, 10);
        let payload = build_payload(&[(
            "Startup",
            vec![("software engineer", "/companies/s/jobs/1", None)],
        )]);
        let html = inertia_html(&payload);
        let jobs = scraper.parse_inertia_page(&html);
        assert_eq!(jobs.len(), 1);
    }

    #[test]
    fn test_parse_inertia_combined_filters() {
        let scraper = YcStartupScraper::new(Some("backend".to_string()), true, 10);
        let payload = build_payload(&[(
            "Startup",
            vec![
                (
                    "Remote Backend Engineer",
                    "/companies/s/jobs/1",
                    Some("Remote"),
                ),
                (
                    "Backend Engineer",
                    "/companies/s/jobs/2",
                    Some("San Francisco"),
                ),
                (
                    "Remote Frontend Engineer",
                    "/companies/s/jobs/3",
                    Some("Remote"),
                ),
            ],
        )]);
        let html = inertia_html(&payload);
        let jobs = scraper.parse_inertia_page(&html);
        assert_eq!(jobs.len(), 1);
        assert!(jobs[0].title.to_lowercase().contains("backend"));
        assert_eq!(jobs[0].remote, Some(true));
    }

    #[test]
    fn test_parse_inertia_multiple_companies() {
        let scraper = YcStartupScraper::new(None, false, 10);
        let payload = build_payload(&[
            (
                "Company A",
                vec![("Engineer A1", "/companies/a/jobs/1", None)],
            ),
            (
                "Company B",
                vec![("Engineer B1", "/companies/b/jobs/1", None)],
            ),
        ]);
        let html = inertia_html(&payload);
        let jobs = scraper.parse_inertia_page(&html);
        assert_eq!(jobs.len(), 2);
        assert_eq!(jobs[0].company, "Company A");
        assert_eq!(jobs[1].company, "Company B");
    }

    #[test]
    fn test_parse_inertia_salary_range_parsed() {
        let scraper = YcStartupScraper::new(None, false, 10);
        let payload = r#"{"component":"Jobs","props":{"companiesWithJobs":[{"company":{"name":"Startup"},"jobPostings":[{"title":"Senior Engineer","url":"/companies/startup/jobs/1","location":null,"type":"Full Time","role":"eng","salaryRange":"$120K - $180K"}]}]},"url":"/jobs","version":"1"}"#;
        let html = inertia_html(payload);
        let jobs = scraper.parse_inertia_page(&html);
        assert_eq!(jobs.len(), 1);
        assert_eq!(jobs[0].salary_min, Some(120_000));
        assert_eq!(jobs[0].salary_max, Some(180_000));
    }

    #[test]
    fn test_parse_inertia_null_salary_range() {
        let scraper = YcStartupScraper::new(None, false, 10);
        let payload = build_payload(&[(
            "Startup",
            vec![("Engineer", "/companies/s/jobs/1", None)],
        )]);
        let html = inertia_html(&payload);
        let jobs = scraper.parse_inertia_page(&html);
        assert_eq!(jobs.len(), 1);
        assert_eq!(jobs[0].salary_min, None);
        assert_eq!(jobs[0].salary_max, None);
    }

    #[test]
    fn test_parse_inertia_url_prefixed_with_base() {
        let scraper = YcStartupScraper::new(None, false, 10);
        let payload = build_payload(&[(
            "Startup",
            vec![(
                "Engineer",
                "/companies/mystartup/jobs/555",
                None,
            )],
        )]);
        let html = inertia_html(&payload);
        let jobs = scraper.parse_inertia_page(&html);
        assert_eq!(jobs.len(), 1);
        assert_eq!(
            jobs[0].url,
            "https://www.ycombinator.com/companies/mystartup/jobs/555"
        );
    }

    #[test]
    fn test_extract_inertia_payload_present() {
        let payload = r#"{"props":{"companiesWithJobs":[]}}"#;
        let html = inertia_html(payload);
        let extracted = YcStartupScraper::extract_inertia_payload(&html);
        assert!(extracted.is_some());
        // Should be valid JSON after extraction
        let parsed: serde_json::Value = serde_json::from_str(&extracted.unwrap()).unwrap();
        assert!(parsed.get("props").is_some());
    }

    #[test]
    fn test_extract_inertia_payload_absent() {
        let html = "<html><body><div id=\"app\"></div></body></html>";
        let extracted = YcStartupScraper::extract_inertia_payload(html);
        assert!(extracted.is_none());
    }
}
