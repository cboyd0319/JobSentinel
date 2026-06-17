//! Smoke tests for scraper connectivity and functionality

use crate::core::{
    credentials::{CredentialKey, CredentialService},
    http_body::{read_json_with_limit, read_text_with_limit},
    scrapers::{
        http_client::scraper_client_builder,
        rate_limiter::{limits, RateLimiter},
    },
    url_security::validate_external_http_url_for_fetch,
    Config, Database,
};
use anyhow::Result;
use std::time::{Duration, Instant};

use super::types::{SmokeTestResult, SmokeTestType};

const SMOKE_TEST_SCRAPERS: &[&str] = &[
    "greenhouse",
    "lever",
    "indeed",
    "remoteok",
    "wellfound",
    "weworkremotely",
    "builtin",
    "hn_hiring",
    "jobswithgpt",
    "dice",
    "yc_startup",
    "ziprecruiter",
    "usajobs",
    "simplyhired",
    "glassdoor",
];
const SOURCE_CHECK_RATE_LIMITED: &str =
    "This source is asking JobSentinel to wait before checking again.";
const SOURCE_CHECK_REJECTED: &str =
    "This source rejected the check. Review saved connection settings or try later.";
const SOURCE_CHECK_BAD_RESPONSE: &str =
    "This source returned an unexpected response. Try again later.";
const SOURCE_CHECK_NETWORK_ERROR: &str =
    "JobSentinel could not reach this source. Check your internet connection or try again later.";
const SOURCE_CHECK_READ_ERROR: &str =
    "JobSentinel could not read this source response. Try again later.";
const SOURCE_CHECK_DEFAULT_ERROR: &str =
    "This source check could not finish. Try again later or save a safe support report.";

#[must_use]
pub fn smoke_test_scrapers() -> &'static [&'static str] {
    SMOKE_TEST_SCRAPERS
}

#[must_use]
pub fn is_known_scraper_name(scraper_name: &str) -> bool {
    SMOKE_TEST_SCRAPERS.contains(&scraper_name)
}

fn sanitized_request_error(context: &'static str, error: reqwest::Error) -> anyhow::Error {
    anyhow::anyhow!("{}: {}", context, error.without_url())
}

fn source_check_error_message(error: &anyhow::Error) -> String {
    let text = error.to_string().to_ascii_lowercase();

    if text.contains("http 429") || text.contains("rate limit") {
        return SOURCE_CHECK_RATE_LIMITED.to_string();
    }

    if text.contains("http 401") || text.contains("http 403") || text.contains("auth") {
        return SOURCE_CHECK_REJECTED.to_string();
    }

    if text.contains("http ") {
        return SOURCE_CHECK_BAD_RESPONSE.to_string();
    }

    if text.contains("timeout")
        || text.contains("timed out")
        || text.contains("connect")
        || text.contains("network")
        || text.contains("dns")
        || text.contains("request")
    {
        return SOURCE_CHECK_NETWORK_ERROR.to_string();
    }

    if text.contains("parse")
        || text.contains("json")
        || text.contains("body")
        || text.contains("response")
    {
        return SOURCE_CHECK_READ_ERROR.to_string();
    }

    SOURCE_CHECK_DEFAULT_ERROR.to_string()
}

fn validate_smoke_details(scraper_name: &str, details: &serde_json::Value) -> Result<()> {
    if details
        .get("status")
        .and_then(serde_json::Value::as_str)
        .is_some_and(|status| status == "skipped")
    {
        return Ok(());
    }

    if details
        .get("selectors_found")
        .and_then(serde_json::Value::as_bool)
        .is_some_and(|selectors_found| !selectors_found)
    {
        return Err(anyhow::anyhow!(
            "{} source check did not find expected job selectors",
            scraper_name
        ));
    }

    if details
        .get("jobs_found")
        .and_then(serde_json::Value::as_i64)
        .is_some_and(|jobs_found| jobs_found <= 0)
    {
        return Err(anyhow::anyhow!(
            "{} source check did not find any jobs",
            scraper_name
        ));
    }

    Ok(())
}

fn smoke_rate_limit(scraper_name: &str) -> u32 {
    match scraper_name {
        "greenhouse" => limits::GREENHOUSE,
        "lever" => limits::LEVER,
        "indeed" => limits::INDEED,
        "remoteok" => limits::REMOTEOK,
        "wellfound" => 200,
        "weworkremotely" => limits::WEWORKREMOTELY,
        "builtin" => limits::BUILTIN,
        "hn_hiring" => limits::HN_HIRING,
        "jobswithgpt" => limits::JOBSWITHGPT,
        "dice" => limits::DICE,
        "yc_startup" => limits::YC_STARTUP,
        "ziprecruiter" => 300,
        "usajobs" => limits::USAJOBS,
        "simplyhired" => limits::SIMPLYHIRED,
        "glassdoor" => limits::GLASSDOOR,
        _ => 60,
    }
}

fn smoke_client(user_agent: Option<&str>) -> Result<reqwest::Client> {
    let mut builder = scraper_client_builder().timeout(Duration::from_secs(10));
    if let Some(user_agent) = user_agent {
        builder = builder.user_agent(user_agent);
    }
    Ok(builder.build()?)
}

/// Run a connectivity smoke test for a specific scraper
pub async fn run_smoke_test(
    db: &Database,
    config: &Config,
    scraper_name: &str,
) -> Result<SmokeTestResult> {
    let credentials = CredentialService::compatibility_keyring();
    run_smoke_test_with_credentials(db, config, scraper_name, &credentials).await
}

/// Run a connectivity smoke test with an explicit credential provider.
pub async fn run_smoke_test_with_credentials(
    db: &Database,
    config: &Config,
    scraper_name: &str,
    credentials: &CredentialService,
) -> Result<SmokeTestResult> {
    let start = Instant::now();
    RateLimiter::shared()
        .wait(scraper_name, smoke_rate_limit(scraper_name))
        .await;

    let result = match scraper_name {
        "greenhouse" => test_greenhouse().await,
        "lever" => test_lever().await,
        "indeed" => test_indeed().await,
        "remoteok" => test_remoteok().await,
        "wellfound" => test_wellfound().await,
        "weworkremotely" => test_weworkremotely().await,
        "builtin" => test_builtin().await,
        "hn_hiring" => test_hn_hiring().await,
        "jobswithgpt" => test_jobswithgpt(config).await,
        "dice" => test_dice().await,
        "yc_startup" => test_yc_startup().await,
        "ziprecruiter" => test_ziprecruiter().await,
        "usajobs" => test_usajobs(config, credentials).await,
        "simplyhired" => test_simplyhired().await,
        "glassdoor" => test_glassdoor().await,
        _ => Err(anyhow::anyhow!("Unknown scraper")),
    };

    let duration_ms = start.elapsed().as_millis() as i64;

    let smoke_result = match result.and_then(|details| {
        validate_smoke_details(scraper_name, &details)?;
        Ok(details)
    }) {
        Ok(details) => SmokeTestResult {
            scraper_name: scraper_name.to_string(),
            test_type: SmokeTestType::Connectivity,
            passed: true,
            duration_ms,
            details: Some(details),
            error: None,
        },
        Err(e) => SmokeTestResult {
            scraper_name: scraper_name.to_string(),
            test_type: SmokeTestType::Connectivity,
            passed: false,
            duration_ms,
            details: None,
            error: Some(source_check_error_message(&e)),
        },
    };

    // Record the test result
    record_smoke_test(db, &smoke_result).await?;

    Ok(smoke_result)
}

/// Run smoke tests for all enabled scrapers
pub async fn run_all_smoke_tests(db: &Database, config: &Config) -> Result<Vec<SmokeTestResult>> {
    let credentials = CredentialService::compatibility_keyring();
    run_all_smoke_tests_with_credentials(db, config, &credentials).await
}

/// Run smoke tests for all enabled scrapers with an explicit credential provider.
pub async fn run_all_smoke_tests_with_credentials(
    db: &Database,
    config: &Config,
    credentials: &CredentialService,
) -> Result<Vec<SmokeTestResult>> {
    let mut results = Vec::new();

    for scraper in SMOKE_TEST_SCRAPERS {
        let result = run_smoke_test_with_credentials(db, config, scraper, credentials).await?;
        results.push(result);
    }

    Ok(results)
}

/// Record a smoke test result in the database
async fn record_smoke_test(db: &Database, result: &SmokeTestResult) -> Result<()> {
    let test_type = result.test_type.as_str();
    let status = if result.passed { "pass" } else { "fail" };
    let details = result
        .details
        .as_ref()
        .map(|d| serde_json::to_string(d).unwrap_or_default());

    sqlx::query!(
        r#"
        INSERT INTO scraper_smoke_tests (scraper_name, test_type, duration_ms, status, details, error_message)
        VALUES (?, ?, ?, ?, ?, ?)
        "#,
        result.scraper_name,
        test_type,
        result.duration_ms,
        status,
        details,
        result.error,
    )
    .execute(db.pool())
    .await?;

    Ok(())
}

// Individual scraper tests

async fn test_greenhouse() -> Result<serde_json::Value> {
    // Test with a known company (Cloudflare has a public Greenhouse board)
    let url = "https://boards-api.greenhouse.io/v1/boards/cloudflare/jobs";
    let client = smoke_client(None)?;

    let resp = client
        .get(url)
        .send()
        .await
        .map_err(|e| sanitized_request_error("Greenhouse smoke test request failed", e))?;
    let status = resp.status();

    if !status.is_success() {
        return Err(anyhow::anyhow!("HTTP {}", status));
    }

    let json: serde_json::Value = read_json_with_limit(resp, url).await?;
    let job_count = json
        .get("jobs")
        .and_then(|j| j.as_array())
        .map(|a| a.len())
        .unwrap_or(0);

    Ok(serde_json::json!({
        "status": status.as_u16(),
        "jobs_found": job_count,
        "api_version": "v1"
    }))
}

async fn test_lever() -> Result<serde_json::Value> {
    // Test with a known company
    let url = "https://api.lever.co/v0/postings/netflix?mode=json";
    let client = smoke_client(None)?;

    let resp = client
        .get(url)
        .send()
        .await
        .map_err(|e| sanitized_request_error("Lever smoke test request failed", e))?;
    let status = resp.status();

    if !status.is_success() {
        return Err(anyhow::anyhow!("HTTP {}", status));
    }

    let json: serde_json::Value = read_json_with_limit(resp, url).await?;
    let job_count = json.as_array().map(|a| a.len()).unwrap_or(0);

    Ok(serde_json::json!({
        "status": status.as_u16(),
        "jobs_found": job_count,
        "api_version": "v0"
    }))
}

async fn test_indeed() -> Result<serde_json::Value> {
    let url = "https://www.indeed.com/jobs?q=customer+support&l=remote";
    let client = smoke_client(Some(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    ))?;

    let resp = client
        .get(url)
        .send()
        .await
        .map_err(|e| sanitized_request_error("Indeed smoke test request failed", e))?;
    let status = resp.status();

    if !status.is_success() {
        return Err(anyhow::anyhow!("HTTP {}", status));
    }

    let html = read_text_with_limit(resp, url).await?;
    let has_jobs = html.contains("job_seen_beacon") || html.contains("jobsearch-SerpJobCard");

    Ok(serde_json::json!({
        "status": status.as_u16(),
        "selectors_found": has_jobs,
        "html_size_kb": html.len() / 1024
    }))
}

async fn test_remoteok() -> Result<serde_json::Value> {
    let url = "https://remoteok.com/api";
    let client = smoke_client(None)?;

    let resp = client
        .get(url)
        .send()
        .await
        .map_err(|e| sanitized_request_error("RemoteOK smoke test request failed", e))?;
    let status = resp.status();

    if !status.is_success() {
        return Err(anyhow::anyhow!("HTTP {}", status));
    }

    let json: serde_json::Value = read_json_with_limit(resp, url).await?;
    // First element is legal notice, rest are jobs
    let job_count = json
        .as_array()
        .map(|a| a.len().saturating_sub(1))
        .unwrap_or(0);

    Ok(serde_json::json!({
        "status": status.as_u16(),
        "jobs_found": job_count
    }))
}

async fn test_wellfound() -> Result<serde_json::Value> {
    let url = "https://wellfound.com/role/software-engineer";
    let client = smoke_client(Some(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    ))?;

    let resp = client
        .get(url)
        .send()
        .await
        .map_err(|e| sanitized_request_error("Wellfound smoke test request failed", e))?;
    let status = resp.status();

    if !status.is_success() {
        return Err(anyhow::anyhow!("HTTP {}", status));
    }

    let html = read_text_with_limit(resp, url).await?;
    let has_jobs = html.contains("StartupResult") || html.contains("startupResult");

    Ok(serde_json::json!({
        "status": status.as_u16(),
        "selectors_found": has_jobs,
        "html_size_kb": html.len() / 1024
    }))
}

async fn test_weworkremotely() -> Result<serde_json::Value> {
    let url = "https://weworkremotely.com/categories/remote-programming-jobs.rss";
    let client = smoke_client(None)?;

    let resp =
        client.get(url).send().await.map_err(|e| {
            sanitized_request_error("We Work Remotely smoke test request failed", e)
        })?;
    let status = resp.status();

    if !status.is_success() {
        return Err(anyhow::anyhow!("HTTP {}", status));
    }

    let rss = read_text_with_limit(resp, url).await?;
    let item_count = rss.matches("<item>").count();

    Ok(serde_json::json!({
        "status": status.as_u16(),
        "jobs_found": item_count,
        "format": "rss"
    }))
}

async fn test_builtin() -> Result<serde_json::Value> {
    let url = "https://builtin.com/jobs/remote/dev-engineering";
    let client = smoke_client(Some(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    ))?;

    let resp = client
        .get(url)
        .send()
        .await
        .map_err(|e| sanitized_request_error("Built In smoke test request failed", e))?;
    let status = resp.status();

    if !status.is_success() {
        return Err(anyhow::anyhow!("HTTP {}", status));
    }

    let html = read_text_with_limit(resp, url).await?;
    let has_jobs = html.contains("data-id") || html.contains("job-card");

    Ok(serde_json::json!({
        "status": status.as_u16(),
        "selectors_found": has_jobs,
        "html_size_kb": html.len() / 1024
    }))
}

async fn test_hn_hiring() -> Result<serde_json::Value> {
    // Search for most recent "Who is hiring" thread
    let url = "https://hn.algolia.com/api/v1/search_by_date";
    let client = smoke_client(None)?;

    let resp = client
        .get(url)
        .query(&[
            ("query", "Ask HN: Who is hiring"),
            ("tags", "story"),
            ("hitsPerPage", "1"),
        ])
        .send()
        .await
        .map_err(|e| sanitized_request_error("HN Hiring smoke test request failed", e))?;

    let status = resp.status();

    if !status.is_success() {
        return Err(anyhow::anyhow!("HTTP {}", status));
    }

    let json: serde_json::Value = read_json_with_limit(resp, url).await?;
    let has_hits = json
        .get("hits")
        .and_then(|h| h.as_array())
        .map(|a| !a.is_empty())
        .unwrap_or(false);

    Ok(serde_json::json!({
        "status": status.as_u16(),
        "found_hiring_thread": has_hits,
        "api": "algolia"
    }))
}

async fn test_jobswithgpt(config: &Config) -> Result<serde_json::Value> {
    let Some(payload) = config.jobswithgpt_payload_preview() else {
        return Ok(serde_json::json!({
            "status": "skipped",
            "reason": "JobsWithGPT endpoint and reviewed payload not configured"
        }));
    };

    if !config.jobswithgpt_payload_approved() {
        return Ok(serde_json::json!({
            "status": "skipped",
            "reason": "JobsWithGPT payload has not been reviewed and approved",
            "title_count": payload.titles.len(),
            "has_location": payload.location.is_some(),
            "remote_only": payload.remote_only,
            "limit": payload.limit
        }));
    }

    let endpoint = validate_external_http_url_for_fetch(&payload.endpoint)
        .await
        .map_err(|reason| anyhow::anyhow!("Invalid JobsWithGPT endpoint: {}", reason))?;

    // Just verify the endpoint is reachable
    let client = smoke_client(None)?;

    let resp = client.get(endpoint.as_str()).send().await;

    match resp {
        Ok(r) => Ok(serde_json::json!({
            "status": r.status().as_u16(),
            "reachable": true
        })),
        Err(e) if e.is_connect() => Ok(serde_json::json!({
            "status": "unreachable",
            "error": SOURCE_CHECK_NETWORK_ERROR
        })),
        Err(e) => Err(sanitized_request_error(
            "JobsWithGPT smoke test request failed",
            e,
        )),
    }
}

async fn test_dice() -> Result<serde_json::Value> {
    let url = "https://www.dice.com/jobs?q=software%20engineer&countryCode=US&radius=30&radiusUnit=mi&page=1&pageSize=20";
    let client = smoke_client(Some(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    ))?;

    let resp = client
        .get(url)
        .send()
        .await
        .map_err(|e| sanitized_request_error("Dice smoke test request failed", e))?;
    let status = resp.status();

    if !status.is_success() {
        return Err(anyhow::anyhow!("HTTP {}", status));
    }

    let html = read_text_with_limit(resp, url).await?;
    let has_jobs = html.contains("search-card") || html.contains("job-card");

    Ok(serde_json::json!({
        "status": status.as_u16(),
        "selectors_found": has_jobs,
        "html_size_kb": html.len() / 1024
    }))
}

async fn test_yc_startup() -> Result<serde_json::Value> {
    let url = "https://www.ycombinator.com/jobs";
    let client = smoke_client(Some(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    ))?;

    let resp = client
        .get(url)
        .send()
        .await
        .map_err(|e| sanitized_request_error("YC startup smoke test request failed", e))?;
    let status = resp.status();

    if !status.is_success() {
        return Err(anyhow::anyhow!("HTTP {}", status));
    }

    let html = read_text_with_limit(resp, url).await?;
    let has_jobs = html.contains("job-listing") || html.contains("JobListing");

    Ok(serde_json::json!({
        "status": status.as_u16(),
        "selectors_found": has_jobs,
        "html_size_kb": html.len() / 1024
    }))
}

async fn test_ziprecruiter() -> Result<serde_json::Value> {
    let url = "https://www.ziprecruiter.com/jobs-rss?search=customer+support&location=Remote";
    let client = smoke_client(None)?;

    let resp = client
        .get(url)
        .send()
        .await
        .map_err(|e| sanitized_request_error("ZipRecruiter smoke test request failed", e))?;
    let status = resp.status();

    if !status.is_success() {
        return Err(anyhow::anyhow!("HTTP {}", status));
    }

    let rss = read_text_with_limit(resp, url).await?;
    let item_count = rss.matches("<item>").count();

    Ok(serde_json::json!({
        "status": status.as_u16(),
        "jobs_found": item_count,
        "format": "rss"
    }))
}

async fn test_usajobs(
    config: &Config,
    credentials: &CredentialService,
) -> Result<serde_json::Value> {
    if !config.usajobs.enabled {
        return Ok(serde_json::json!({
            "status": "skipped",
            "reason": "USAJobs scraping not enabled"
        }));
    }

    if config.usajobs.email.is_empty() {
        return Ok(serde_json::json!({
            "status": "skipped",
            "reason": "USAJobs email not configured"
        }));
    }

    let api_key = match credentials
        .retrieve(CredentialKey::UsaJobsApiKey)
        .await
        .map_err(|_| anyhow::anyhow!("USAJobs API key could not be read from secure storage"))?
    {
        Some(api_key) if !api_key.trim().is_empty() => api_key,
        _ => {
            return Ok(serde_json::json!({
                "status": "skipped",
                "reason": "USAJobs API key not saved"
            }));
        }
    };

    let url = "https://data.usajobs.gov/api/Search?Keyword=software&ResultsPerPage=1";
    let client = smoke_client(None)?;

    let resp = client
        .get(url)
        .header("Host", "data.usajobs.gov")
        .header("User-Agent", &config.usajobs.email)
        .header("Authorization-Key", api_key.trim())
        .send()
        .await
        .map_err(|e| sanitized_request_error("USAJobs smoke test request failed", e))?;
    let status = resp.status();

    if !status.is_success() {
        return Err(anyhow::anyhow!("HTTP {}", status));
    }

    let json: serde_json::Value = read_json_with_limit(resp, url).await?;
    let job_count = json
        .pointer("/SearchResult/SearchResultCount")
        .and_then(serde_json::Value::as_i64)
        .unwrap_or(0);

    Ok(serde_json::json!({
        "status": status.as_u16(),
        "jobs_found": job_count,
        "api": "usajobs"
    }))
}

async fn test_simplyhired() -> Result<serde_json::Value> {
    let url = "https://www.simplyhired.com/search?q=customer+support&l=remote&output=rss";
    let client = smoke_client(Some(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    ))?;

    let resp = client
        .get(url)
        .header(
            "Accept",
            "application/rss+xml, application/xml, text/xml, */*",
        )
        .send()
        .await
        .map_err(|e| sanitized_request_error("SimplyHired smoke test request failed", e))?;
    let status = resp.status();

    if !status.is_success() {
        return Err(anyhow::anyhow!("HTTP {}", status));
    }

    let rss = read_text_with_limit(resp, url).await?;
    let item_count = rss.matches("<item>").count();

    Ok(serde_json::json!({
        "status": status.as_u16(),
        "jobs_found": item_count,
        "format": "rss"
    }))
}

async fn test_glassdoor() -> Result<serde_json::Value> {
    let url = "https://www.glassdoor.com/Job/jobs.htm?sc.keyword=customer+support&jobType=all";
    let client = smoke_client(Some(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    ))?;

    let resp = client
        .get(url)
        .header(
            "Accept",
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        )
        .send()
        .await
        .map_err(|e| sanitized_request_error("Glassdoor smoke test request failed", e))?;
    let status = resp.status();

    if !status.is_success() {
        return Err(anyhow::anyhow!("HTTP {}", status));
    }

    let html = read_text_with_limit(resp, url).await?;
    let has_jobs = html.contains("jobListing") || html.contains("job-card");

    Ok(serde_json::json!({
        "status": status.as_u16(),
        "selectors_found": has_jobs,
        "html_size_kb": html.len() / 1024
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use reqwest::StatusCode;
    use wiremock::matchers::{method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    #[tokio::test]
    async fn smoke_client_does_not_follow_redirects() {
        let target = MockServer::start().await;
        let source = MockServer::start().await;
        let location = format!("{}/capture", target.uri());

        Mock::given(method("GET"))
            .and(path("/private"))
            .respond_with(ResponseTemplate::new(302).insert_header("Location", location))
            .mount(&source)
            .await;

        let client = smoke_client(None).expect("smoke client should build");
        let response = client
            .get(format!("{}/private", source.uri()))
            .header("Authorization-Key", "secret-token")
            .send()
            .await
            .expect("request should complete");

        assert_eq!(response.status(), StatusCode::FOUND);
        assert!(
            target.received_requests().await.unwrap().is_empty(),
            "smoke client must not forward credentialed requests across redirects"
        );
    }

    #[test]
    fn validate_smoke_details_allows_skipped_sources() {
        let details = serde_json::json!({
            "status": "skipped",
            "reason": "source disabled"
        });

        validate_smoke_details("usajobs", &details).expect("skipped checks are neutral");
    }

    #[test]
    fn validate_smoke_details_rejects_missing_selectors() {
        let details = serde_json::json!({
            "status": 200,
            "selectors_found": false,
            "html_size_kb": 12
        });

        let error = validate_smoke_details("glassdoor", &details).unwrap_err();
        assert!(error.to_string().contains("expected job selectors"));
    }

    #[test]
    fn validate_smoke_details_rejects_empty_job_counts() {
        let details = serde_json::json!({
            "status": 200,
            "jobs_found": 0,
            "format": "rss"
        });

        let error = validate_smoke_details("simplyhired", &details).unwrap_err();
        assert!(error.to_string().contains("did not find any jobs"));
    }

    #[test]
    fn source_check_error_message_hides_raw_urls_and_tokens() {
        let error = anyhow::anyhow!(
            "JobsWithGPT smoke test request failed: error sending request for url https://example.test/jobs?token=secret"
        );
        let message = source_check_error_message(&error);

        assert_eq!(message, SOURCE_CHECK_NETWORK_ERROR);
        assert!(!message.contains("https://"));
        assert!(!message.contains("token"));
        assert!(!message.contains("secret"));
        assert!(!message.contains("JobsWithGPT"));
    }

    #[test]
    fn source_check_error_message_keeps_status_actionable_without_provider_detail() {
        let cases = [
            (
                anyhow::anyhow!("HTTP 429 Too Many Requests"),
                SOURCE_CHECK_RATE_LIMITED,
            ),
            (anyhow::anyhow!("HTTP 403 Forbidden"), SOURCE_CHECK_REJECTED),
            (
                anyhow::anyhow!("HTTP 500 Internal Server Error"),
                SOURCE_CHECK_BAD_RESPONSE,
            ),
            (
                anyhow::anyhow!("Failed to parse JSON response from https://example.test/private"),
                SOURCE_CHECK_READ_ERROR,
            ),
        ];

        for (error, expected) in cases {
            let message = source_check_error_message(&error);
            assert_eq!(message, expected);
            assert!(!message.contains("https://"));
            assert!(!message.contains("Forbidden"));
            assert!(!message.contains("Internal Server Error"));
        }
    }
}
