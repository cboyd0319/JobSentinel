//! Smoke tests for scraper connectivity and functionality

use crate::core::{
    http_body::{read_json_with_limit, read_text_with_limit},
    url_security::validate_external_http_url,
    Config, Database,
};
use anyhow::Result;
use std::time::Instant;

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

/// Run a connectivity smoke test for a specific scraper
pub async fn run_smoke_test(
    db: &Database,
    config: &Config,
    scraper_name: &str,
) -> Result<SmokeTestResult> {
    let start = Instant::now();

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
        "usajobs" => test_usajobs(config).await,
        "simplyhired" => test_simplyhired().await,
        "glassdoor" => test_glassdoor().await,
        _ => Err(anyhow::anyhow!("Unknown scraper")),
    };

    let duration_ms = start.elapsed().as_millis() as i64;

    let smoke_result = match result {
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
            error: Some(e.to_string()),
        },
    };

    // Record the test result
    record_smoke_test(db, &smoke_result).await?;

    Ok(smoke_result)
}

/// Run smoke tests for all enabled scrapers
pub async fn run_all_smoke_tests(db: &Database, config: &Config) -> Result<Vec<SmokeTestResult>> {
    let mut results = Vec::new();

    for scraper in SMOKE_TEST_SCRAPERS {
        let result = run_smoke_test(db, config, scraper).await?;
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
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()?;

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
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()?;

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
    let url = "https://www.indeed.com/jobs?q=software+engineer&l=remote";
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .build()?;

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
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()?;

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
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .build()?;

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
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()?;

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
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .build()?;

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
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()?;

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
    // JobsWithGPT is an MCP server - check if endpoint is configured
    if config.jobswithgpt_endpoint.is_empty() {
        return Ok(serde_json::json!({
            "status": "skipped",
            "reason": "JobsWithGPT endpoint not configured"
        }));
    }

    let endpoint = validate_external_http_url(&config.jobswithgpt_endpoint)
        .map_err(|reason| anyhow::anyhow!("Invalid JobsWithGPT endpoint: {}", reason))?;

    // Just verify the endpoint is reachable
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()?;

    let resp = client.get(endpoint.as_str()).send().await;

    match resp {
        Ok(r) => Ok(serde_json::json!({
            "status": r.status().as_u16(),
            "reachable": true
        })),
        Err(e) if e.is_connect() => Ok(serde_json::json!({
            "status": "unreachable",
            "error": format!("connect error: {}", e.without_url())
        })),
        Err(e) => Err(sanitized_request_error(
            "JobsWithGPT smoke test request failed",
            e,
        )),
    }
}

async fn test_dice() -> Result<serde_json::Value> {
    let url = "https://www.dice.com/jobs?q=software%20engineer&countryCode=US&radius=30&radiusUnit=mi&page=1&pageSize=20";
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .build()?;

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
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .build()?;

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
    let url = "https://www.ziprecruiter.com/jobs-rss?search=software+engineer&location=Remote";
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()?;

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

async fn test_usajobs(config: &Config) -> Result<serde_json::Value> {
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

    if config.usajobs.api_key.is_empty() {
        return Ok(serde_json::json!({
            "status": "skipped",
            "reason": "USAJobs API key not loaded"
        }));
    }

    let url = "https://data.usajobs.gov/api/Search?Keyword=software&ResultsPerPage=1";
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()?;

    let resp = client
        .get(url)
        .header("Host", "data.usajobs.gov")
        .header("User-Agent", &config.usajobs.email)
        .header("Authorization-Key", &config.usajobs.api_key)
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
    let url = "https://www.simplyhired.com/search?q=software+engineer&l=remote&output=rss";
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36")
        .build()?;

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
    let url = "https://www.glassdoor.com/Job/jobs.htm?sc.keyword=software+engineer&jobType=all";
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .user_agent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36")
        .build()?;

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
