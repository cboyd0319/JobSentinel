use super::{
    sanitized_request_error, smoke_client, smoke_client_for_resolved_target,
    SOURCE_CHECK_NETWORK_ERROR,
};
use crate::core::{
    credentials::{CredentialKey, CredentialService},
    http_body::{read_json_with_limit, read_text_with_limit},
    url_security::resolve_external_https_url_for_fetch,
    Config,
};
use anyhow::Result;

pub(super) async fn test_greenhouse() -> Result<serde_json::Value> {
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

pub(super) async fn test_lever() -> Result<serde_json::Value> {
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

pub(super) async fn test_indeed() -> Result<serde_json::Value> {
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

pub(super) async fn test_remoteok() -> Result<serde_json::Value> {
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

pub(super) async fn test_wellfound() -> Result<serde_json::Value> {
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

pub(super) async fn test_weworkremotely() -> Result<serde_json::Value> {
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

pub(super) async fn test_builtin() -> Result<serde_json::Value> {
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

pub(super) async fn test_hn_hiring() -> Result<serde_json::Value> {
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

pub(super) async fn test_jobswithgpt(config: &Config) -> Result<serde_json::Value> {
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

    let endpoint = resolve_external_https_url_for_fetch(&payload.endpoint)
        .await
        .map_err(|reason| anyhow::anyhow!("Invalid JobsWithGPT endpoint: {}", reason))?;

    // Just verify the endpoint is reachable
    let client = smoke_client_for_resolved_target(None, &endpoint)?;

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

pub(super) async fn test_dice() -> Result<serde_json::Value> {
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

pub(super) async fn test_yc_startup() -> Result<serde_json::Value> {
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

pub(super) async fn test_ziprecruiter() -> Result<serde_json::Value> {
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

pub(super) async fn test_usajobs(
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

pub(super) async fn test_simplyhired() -> Result<serde_json::Value> {
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

pub(super) async fn test_glassdoor() -> Result<serde_json::Value> {
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
