use crate::{
    credentials::{CredentialKey, CredentialService},
    Config,
};
use anyhow::Result;
use jobsentinel_network::{
    send_external_http_text_with_retry, ExternalHttpRequest, ExternalTextResponse,
    MINIMAL_BROWSER_USER_AGENT, MINIMAL_WEBKIT_USER_AGENT,
};

async fn smoke_request(
    request: ExternalHttpRequest,
    context: &'static str,
) -> Result<ExternalTextResponse> {
    send_external_http_text_with_retry(request)
        .await
        .map_err(|_| anyhow::anyhow!(context))
}

fn require_success(response: ExternalTextResponse) -> Result<ExternalTextResponse> {
    if (200..300).contains(&response.status) {
        Ok(response)
    } else {
        Err(anyhow::anyhow!("HTTP {}", response.status))
    }
}

fn parse_json(response: &ExternalTextResponse) -> Result<serde_json::Value> {
    Ok(serde_json::from_str(&response.body)?)
}

pub(super) async fn test_greenhouse() -> Result<serde_json::Value> {
    // Test with a known company (Cloudflare has a public Greenhouse board)
    let url = "https://boards-api.greenhouse.io/v1/boards/cloudflare/jobs";
    let response = require_success(
        smoke_request(
            ExternalHttpRequest::get(url),
            "Greenhouse smoke test request failed",
        )
        .await?,
    )?;
    let json = parse_json(&response)?;
    let job_count = json
        .get("jobs")
        .and_then(|j| j.as_array())
        .map(|a| a.len())
        .unwrap_or(0);

    Ok(serde_json::json!({
        "status": response.status,
        "jobs_found": job_count,
        "api_version": "v1"
    }))
}

pub(super) async fn test_lever() -> Result<serde_json::Value> {
    // Test with a known company
    let url = "https://api.lever.co/v0/postings/netflix?mode=json";
    let response = require_success(
        smoke_request(
            ExternalHttpRequest::get(url),
            "Lever smoke test request failed",
        )
        .await?,
    )?;
    let json = parse_json(&response)?;
    let job_count = json.as_array().map(|a| a.len()).unwrap_or(0);

    Ok(serde_json::json!({
        "status": response.status,
        "jobs_found": job_count,
        "api_version": "v0"
    }))
}

pub(super) async fn test_indeed() -> Result<serde_json::Value> {
    let url = "https://www.indeed.com/jobs?q=customer+support&l=remote";
    let response = require_success(
        smoke_request(
            ExternalHttpRequest::get(url).user_agent(MINIMAL_BROWSER_USER_AGENT),
            "Indeed smoke test request failed",
        )
        .await?,
    )?;
    let html = response.body;
    let has_jobs = html.contains("job_seen_beacon") || html.contains("jobsearch-SerpJobCard");

    Ok(serde_json::json!({
        "status": response.status,
        "selectors_found": has_jobs,
        "html_size_kb": html.len() / 1024
    }))
}

pub(super) async fn test_remoteok() -> Result<serde_json::Value> {
    let url = "https://remoteok.com/api";
    let response = require_success(
        smoke_request(
            ExternalHttpRequest::get(url).without_retries(),
            "RemoteOK smoke test request failed",
        )
        .await?,
    )?;
    let json = parse_json(&response)?;
    // First element is legal notice, rest are jobs
    let job_count = json
        .as_array()
        .map(|a| a.len().saturating_sub(1))
        .unwrap_or(0);

    Ok(serde_json::json!({
        "status": response.status,
        "jobs_found": job_count
    }))
}

pub(super) async fn test_wellfound() -> Result<serde_json::Value> {
    let url = "https://wellfound.com/role/software-engineer";
    let response = require_success(
        smoke_request(
            ExternalHttpRequest::get(url).user_agent(MINIMAL_BROWSER_USER_AGENT),
            "Wellfound smoke test request failed",
        )
        .await?,
    )?;
    let html = response.body;
    let has_jobs = html.contains("StartupResult") || html.contains("startupResult");

    Ok(serde_json::json!({
        "status": response.status,
        "selectors_found": has_jobs,
        "html_size_kb": html.len() / 1024
    }))
}

pub(super) async fn test_weworkremotely() -> Result<serde_json::Value> {
    let url = "https://weworkremotely.com/categories/remote-programming-jobs.rss";
    let response = require_success(
        smoke_request(
            ExternalHttpRequest::get(url),
            "We Work Remotely smoke test request failed",
        )
        .await?,
    )?;
    let rss = response.body;
    let item_count = rss.matches("<item>").count();

    Ok(serde_json::json!({
        "status": response.status,
        "jobs_found": item_count,
        "format": "rss"
    }))
}

pub(super) async fn test_builtin() -> Result<serde_json::Value> {
    let url = "https://builtin.com/jobs/remote/dev-engineering";
    let response = require_success(
        smoke_request(
            ExternalHttpRequest::get(url).user_agent(MINIMAL_BROWSER_USER_AGENT),
            "Built In smoke test request failed",
        )
        .await?,
    )?;
    let html = response.body;
    let has_jobs = html.contains("data-id") || html.contains("job-card");

    Ok(serde_json::json!({
        "status": response.status,
        "selectors_found": has_jobs,
        "html_size_kb": html.len() / 1024
    }))
}

pub(super) async fn test_hn_hiring() -> Result<serde_json::Value> {
    // Search for most recent "Who is hiring" thread
    let url = "https://hn.algolia.com/api/v1/search_by_date";
    let response = require_success(
        smoke_request(
            ExternalHttpRequest::get(url).query([
                ("query".to_string(), "Ask HN: Who is hiring".to_string()),
                ("tags".to_string(), "story".to_string()),
                ("hitsPerPage".to_string(), "1".to_string()),
            ]),
            "HN Hiring smoke test request failed",
        )
        .await?,
    )?;
    let json = parse_json(&response)?;
    let has_hits = json
        .get("hits")
        .and_then(|h| h.as_array())
        .map(|a| !a.is_empty())
        .unwrap_or(false);

    Ok(serde_json::json!({
        "status": response.status,
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

    jobsentinel_security::validate_external_https_url(&payload.endpoint)
        .map_err(|reason| anyhow::anyhow!("Invalid JobsWithGPT endpoint: {}", reason))?;

    Ok(serde_json::json!({
        "status": "skipped",
        "reason": "Use scheduled request history for JobsWithGPT status"
    }))
}

pub(super) async fn test_dice() -> Result<serde_json::Value> {
    let url = "https://www.dice.com/jobs?q=software%20engineer&countryCode=US&radius=30&radiusUnit=mi&page=1&pageSize=20";
    let response = require_success(
        smoke_request(
            ExternalHttpRequest::get(url).user_agent(MINIMAL_BROWSER_USER_AGENT),
            "Dice smoke test request failed",
        )
        .await?,
    )?;
    let html = response.body;
    let has_jobs = html.contains("search-card") || html.contains("job-card");

    Ok(serde_json::json!({
        "status": response.status,
        "selectors_found": has_jobs,
        "html_size_kb": html.len() / 1024
    }))
}

pub(super) async fn test_yc_startup() -> Result<serde_json::Value> {
    let url = "https://www.ycombinator.com/jobs";
    let response = require_success(
        smoke_request(
            ExternalHttpRequest::get(url).user_agent(MINIMAL_BROWSER_USER_AGENT),
            "YC startup smoke test request failed",
        )
        .await?,
    )?;
    let html = response.body;
    let has_jobs = html.contains("job-listing") || html.contains("JobListing");

    Ok(serde_json::json!({
        "status": response.status,
        "selectors_found": has_jobs,
        "html_size_kb": html.len() / 1024
    }))
}

pub(super) async fn test_ziprecruiter() -> Result<serde_json::Value> {
    let url = "https://www.ziprecruiter.com/jobs-rss?search=customer+support&location=Remote";
    let response = require_success(
        smoke_request(
            ExternalHttpRequest::get(url),
            "ZipRecruiter smoke test request failed",
        )
        .await?,
    )?;
    let rss = response.body;
    let item_count = rss.matches("<item>").count();

    Ok(serde_json::json!({
        "status": response.status,
        "jobs_found": item_count,
        "format": "rss"
    }))
}

pub(super) async fn test_usajobs(
    config: &Config,
    credentials: &CredentialService,
) -> Result<serde_json::Value> {
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
    let response = require_success(
        smoke_request(
            ExternalHttpRequest::get(url)
                .without_retries()
                .header("Host", "data.usajobs.gov")
                .user_agent(&config.usajobs.email)
                .header("Authorization-Key", api_key.trim()),
            "USAJobs smoke test request failed",
        )
        .await?,
    )?;
    let json = parse_json(&response)?;
    let job_count = json
        .pointer("/SearchResult/SearchResultCount")
        .and_then(serde_json::Value::as_i64)
        .unwrap_or(0);

    Ok(serde_json::json!({
        "status": response.status,
        "jobs_found": job_count,
        "api": "usajobs"
    }))
}

pub(super) async fn test_simplyhired() -> Result<serde_json::Value> {
    let url = "https://www.simplyhired.com/search?q=customer+support&l=remote&output=rss";
    let response = require_success(
        smoke_request(
            ExternalHttpRequest::get(url)
                .user_agent(MINIMAL_WEBKIT_USER_AGENT)
                .header(
                    "Accept",
                    "application/rss+xml, application/xml, text/xml, */*",
                ),
            "SimplyHired smoke test request failed",
        )
        .await?,
    )?;
    let rss = response.body;
    let item_count = rss.matches("<item>").count();

    Ok(serde_json::json!({
        "status": response.status,
        "jobs_found": item_count,
        "format": "rss"
    }))
}

pub(super) async fn test_glassdoor() -> Result<serde_json::Value> {
    let url = "https://www.glassdoor.com/Job/jobs.htm?sc.keyword=customer+support&jobType=all";
    let response = require_success(
        smoke_request(
            ExternalHttpRequest::get(url)
                .user_agent(MINIMAL_WEBKIT_USER_AGENT)
                .header(
                    "Accept",
                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                ),
            "Glassdoor smoke test request failed",
        )
        .await?,
    )?;
    let html = response.body;
    let has_jobs = html.contains("jobListing") || html.contains("job-card");

    Ok(serde_json::json!({
        "status": response.status,
        "selectors_found": has_jobs,
        "html_size_kb": html.len() / 1024
    }))
}
