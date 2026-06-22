//! Shared HTTP Client for Scrapers
//!
//! Provides a reusable HTTP client with consistent configuration
//! for all job board scrapers. This improves performance by reusing
//! connection pools instead of creating new clients per request.

use crate::core::scrapers::cache;
use crate::core::url_security::{
    resolve_external_http_url_for_fetch, sanitize_url_for_logging, ResolvedExternalUrl,
};
use anyhow::{Context, Result};
use reqwest::redirect::Policy;
use std::time::Duration;

pub use crate::core::http_body::{
    read_json_with_limit, read_text_with_limit, DEFAULT_MAX_HTTP_BODY_BYTES,
};

/// Default user agent for scraper requests
pub const DEFAULT_USER_AGENT: &str =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/// Default request timeout in seconds
pub const DEFAULT_TIMEOUT_SECS: u64 = 30;

/// Shared HTTP client for all scrapers
///
/// This client is lazily initialized and reuses connections across requests.
/// Using a shared client provides:
/// - Connection pooling (reuse TCP connections)
/// - Consistent configuration (timeouts, user-agent)
/// - Better performance (no per-request client creation overhead)
///
/// # Safety
/// Uses OnceCell with fallible initialization to avoid panics on startup.
/// If client creation fails, get_client() will attempt to create a fallback client.
static SHARED_CLIENT: once_cell::sync::OnceCell<reqwest::Client> = once_cell::sync::OnceCell::new();

/// Initialize the shared HTTP client
fn init_shared_client() -> Result<reqwest::Client> {
    default_scraper_client_builder()
        .build()
        .map_err(|e| anyhow::anyhow!("Failed to create HTTP client: {}", e))
}

fn default_scraper_client_builder() -> reqwest::ClientBuilder {
    scraper_client_builder()
        .user_agent(DEFAULT_USER_AGENT)
        .timeout(Duration::from_secs(DEFAULT_TIMEOUT_SECS))
        .pool_max_idle_per_host(10)
        .pool_idle_timeout(Duration::from_secs(90))
}

fn build_client_for_resolved_target(target: &ResolvedExternalUrl) -> Result<reqwest::Client> {
    let mut builder = default_scraper_client_builder();

    if let Some((host, addrs)) = target.dns_override() {
        builder = builder.resolve_to_addrs(host, addrs);
    }

    builder
        .build()
        .map_err(|e| anyhow::anyhow!("Failed to create HTTP client: {}", e))
}

/// Get the shared HTTP client
///
/// This returns the shared client used by retry helpers. Prefer
/// [`send_with_retry`] for normal scraper requests so retry behavior stays
/// consistent across adapters.
///
/// # Returns
/// A reference to the shared HTTP client. If the shared client failed to initialize,
/// this function will attempt to create a minimal fallback client.
///
/// # Example
///
/// ```ignore
/// use crate::core::scrapers::http_client::send_with_retry;
///
/// let response = send_with_retry("https://example.com", |client| {
///     client.get("https://example.com")
/// }).await?;
/// ```
pub fn get_client() -> &'static reqwest::Client {
    SHARED_CLIENT.get_or_init(|| {
        match init_shared_client() {
            Ok(client) => client,
            Err(e) => {
                // Log error and create minimal fallback client
                tracing::error!(
                    "Failed to create optimized HTTP client: {}. Using fallback.",
                    e
                );
                default_scraper_client_builder()
                    .build()
                    .unwrap_or_else(|_| {
                        // Absolute fallback - default client with no customization
                        tracing::error!(
                            "Fallback HTTP client creation also failed. Using default client."
                        );
                        reqwest::Client::new()
                    })
            }
        }
    })
}

/// Create a custom HTTP client with specific configuration
///
/// Use this when you need different settings from the default shared client.
///
/// # Arguments
///
/// * `user_agent` - Custom user agent string
/// * `timeout_secs` - Request timeout in seconds
///
/// # Example
///
/// ```ignore
/// let client = create_custom_client("CustomAgent/1.0", 60)?;
/// ```
#[must_use = "this constructs a new HTTP client"]
pub fn create_custom_client(user_agent: &str, timeout_secs: u64) -> Result<reqwest::Client> {
    let client = scraper_client_builder()
        .user_agent(user_agent)
        .timeout(Duration::from_secs(timeout_secs))
        .pool_max_idle_per_host(5)
        .build()?;
    Ok(client)
}

pub(crate) fn scraper_client_builder() -> reqwest::ClientBuilder {
    reqwest::Client::builder().redirect(Policy::none())
}

/// Maximum number of retry attempts
const MAX_RETRIES: u32 = 3;

/// Base delay for exponential backoff in seconds
const BASE_DELAY_SECS: u64 = 1;

/// Maximum delay accepted from Retry-After headers.
const MAX_RETRY_AFTER_DELAY_SECS: u64 = 60;

/// HTTP GET with automatic retry logic and exponential backoff
///
/// Retries on:
/// - 429 (Too Many Requests / Rate Limited)
/// - 5xx (Server Errors)
///
/// Uses exponential backoff: 1s, 2s, 4s, 8s (max 3 retries)
/// Respects `Retry-After` header if present
///
/// # Arguments
///
/// * `url` - The URL to fetch
///
/// # Returns
///
/// The HTTP response if successful after retries
///
/// # Example
///
/// ```ignore
/// use crate::core::scrapers::http_client::get_with_retry;
///
/// let response = get_with_retry("https://example.com/api/jobs").await?;
/// let jobs = read_json_with_limit::<Vec<Job>>(response, "https://example.com/api/jobs").await?;
/// ```
#[must_use = "this returns the HTTP response"]
pub async fn get_with_retry(url: &str) -> Result<reqwest::Response> {
    let response = send_with_retry(url, |client| client.get(url)).await?;
    let status = response.status();

    if status.is_success() {
        return Ok(response);
    }

    Err(anyhow::anyhow!(
        "HTTP {}: {}",
        status,
        sanitize_url_for_logging(url)
    ))
}

/// Send a scraper request through the shared client with retry behavior.
///
/// The builder closure runs once per attempt so callers can keep custom
/// headers, query parameters, or JSON bodies without bypassing shared retry
/// handling.
pub async fn send_with_retry<F>(url: &str, build_request: F) -> Result<reqwest::Response>
where
    F: FnMut(&reqwest::Client) -> reqwest::RequestBuilder,
{
    let target = resolve_retry_target(url).await?;
    let resolved_client = if target.dns_override().is_some() {
        Some(build_client_for_resolved_target(&target)?)
    } else {
        None
    };
    if let Some(client) = resolved_client.as_ref() {
        send_with_retry_to_resolved_url(client, &target, build_request).await
    } else {
        send_with_retry_to_resolved_url(get_client(), &target, build_request).await
    }
}

/// Send a scraper request to an already validated and resolved external URL.
///
/// Callers that build custom clients should use this after applying
/// [`ResolvedExternalUrl::dns_override`] to the client builder. The request
/// built on each retry must keep the same scheme, host, port, and path as the
/// resolved target; query parameters may differ because some scrapers attach
/// parameters through `RequestBuilder::query`.
pub(crate) async fn send_with_retry_to_resolved_url<F>(
    client: &reqwest::Client,
    target: &ResolvedExternalUrl,
    mut build_request: F,
) -> Result<reqwest::Response>
where
    F: FnMut(&reqwest::Client) -> reqwest::RequestBuilder,
{
    let log_url = sanitize_url_for_logging(target.as_str());

    for attempt in 0..=MAX_RETRIES {
        let request = match build_request(client).build() {
            Ok(request) => request,
            Err(error) => {
                return Err(error).with_context(|| format!("Failed to build request: {log_url}"));
            }
        };

        ensure_request_matches_target(request.url(), target.url())?;

        let response = match client.execute(request).await {
            Ok(response) => response,
            Err(error) => {
                let should_retry = is_retryable_request_error(&error);
                if !should_retry || attempt == MAX_RETRIES {
                    return Err(error)
                        .with_context(|| format!("Failed to send request: {log_url}"));
                }

                let delay = calculate_backoff_delay(None, attempt);
                tracing::warn!(
                    "Request send failed (attempt {}/{}), retrying after {}s: {}",
                    attempt + 1,
                    MAX_RETRIES + 1,
                    delay.as_secs(),
                    log_url
                );
                tokio::time::sleep(delay).await;
                continue;
            }
        };

        let status = response.status();

        if status.is_success() {
            if attempt > 0 {
                tracing::info!(
                    "Request succeeded after {} retry attempt(s): {}",
                    attempt,
                    log_url
                );
            }
            return Ok(response);
        }

        if !is_retryable_status(status) || attempt == MAX_RETRIES {
            return Ok(response);
        }

        let delay = calculate_backoff_delay(Some(&response), attempt);

        tracing::warn!(
            "Request failed with HTTP {} (attempt {}/{}), retrying after {}s: {}",
            status,
            attempt + 1,
            MAX_RETRIES + 1,
            delay.as_secs(),
            log_url
        );

        tokio::time::sleep(delay).await;
    }

    Err(anyhow::anyhow!("Retry logic error"))
}

async fn resolve_retry_target(url: &str) -> Result<ResolvedExternalUrl> {
    resolve_external_http_url_for_fetch(url)
        .await
        .map_err(|reason| anyhow::anyhow!("Blocked scraper request URL: {reason}"))
}

fn ensure_request_matches_target(actual: &url::Url, expected: &url::Url) -> Result<()> {
    let same_target = actual.scheme() == expected.scheme()
        && actual.host_str() == expected.host_str()
        && actual.port_or_known_default() == expected.port_or_known_default()
        && actual.path() == expected.path();

    if same_target {
        return Ok(());
    }

    Err(anyhow::anyhow!(
        "Request builder changed the validated scraper request target"
    ))
}

#[cfg(test)]
pub(crate) async fn send_with_retry_to_test_url<F>(
    url: &str,
    build_request: F,
) -> Result<reqwest::Response>
where
    F: FnMut(&reqwest::Client) -> reqwest::RequestBuilder,
{
    let target = ResolvedExternalUrl::from_parts_for_test(
        url::Url::parse(url).context("test URL should parse")?,
        None,
        Vec::new(),
    );

    send_with_retry_to_resolved_url(get_client(), &target, build_request).await
}

/// HTTP GET with cache support
///
/// Checks the cache first before making an HTTP request.
/// If a fresh cached response exists, returns it immediately.
/// Otherwise, makes the request and caches the successful response.
///
/// # Arguments
///
/// * `url` - The URL to fetch
///
/// # Returns
///
/// The response body as a String
///
/// # Example
///
/// ```ignore
/// use crate::core::scrapers::http_client::get_with_cache;
///
/// let body = get_with_cache("https://example.com/api/jobs").await?;
/// ```
pub async fn get_with_cache(url: &str) -> Result<String> {
    // Check cache first
    if let Some(cached_body) = cache::get_cached(url).await {
        tracing::debug!(url = %sanitize_url_for_logging(url), "Returning cached response");
        return Ok(cached_body);
    }

    // Cache miss - make the request
    tracing::debug!(url = %sanitize_url_for_logging(url), "Cache miss, fetching");
    let response = get_with_retry(url).await?;
    let body = read_text_with_limit(response, url)
        .await
        .context("Failed to read response body")?;

    // Cache the successful response
    cache::set_cached(url, body.clone()).await;

    Ok(body)
}

/// HTTP GET with retry logic and optional caching
///
/// This is an enhanced version of `get_with_retry` that optionally uses caching.
/// When `use_cache` is true, it checks the cache before making requests.
/// Returns the response body as a String.
///
/// # Arguments
///
/// * `url` - The URL to fetch
/// * `use_cache` - Whether to use response caching
///
/// # Returns
///
/// The response body as a String
///
/// # Example
///
/// ```ignore
/// use crate::core::scrapers::http_client::get_with_retry_cached;
///
/// // With caching
/// let body = get_with_retry_cached("https://example.com/api/jobs", true).await?;
///
/// // Without caching
/// let body = get_with_retry_cached("https://example.com/api/jobs", false).await?;
/// ```
pub async fn get_with_retry_cached(url: &str, use_cache: bool) -> Result<String> {
    if use_cache {
        // Check cache first
        if let Some(cached_body) = cache::get_cached(url).await {
            tracing::debug!(url = %sanitize_url_for_logging(url), "Returning cached response");
            return Ok(cached_body);
        }
    }

    // Make the actual request
    let response = get_with_retry(url).await?;
    let body = read_text_with_limit(response, url)
        .await
        .context("Failed to read response body")?;

    // Cache successful responses if caching is enabled
    if use_cache {
        cache::set_cached(url, body.clone()).await;
    }

    Ok(body)
}

/// HTTP POST with automatic retry logic and exponential backoff
///
/// Retries on:
/// - 429 (Too Many Requests / Rate Limited)
/// - 5xx (Server Errors)
///
/// Uses exponential backoff: 1s, 2s, 4s, 8s (max 3 retries)
/// Respects `Retry-After` header if present
///
/// # Arguments
///
/// * `url` - The URL to post to
/// * `body` - The request body
///
/// # Returns
///
/// The HTTP response if successful after retries
///
/// # Example
///
/// ```ignore
/// use crate::core::scrapers::http_client::post_with_retry;
///
/// let body = serde_json::json!({"query": "care coordinator"});
/// let response = post_with_retry("https://example.com/api/search", body).await?;
/// ```
pub async fn post_with_retry<T: serde::Serialize + Send + Sync>(
    url: &str,
    body: T,
) -> Result<reqwest::Response> {
    let response = send_with_retry(url, |client| client.post(url).json(&body)).await?;
    let status = response.status();

    if status.is_success() {
        return Ok(response);
    }

    Err(anyhow::anyhow!(
        "HTTP {}: {}",
        status,
        sanitize_url_for_logging(url)
    ))
}

fn is_retryable_status(status: reqwest::StatusCode) -> bool {
    status == reqwest::StatusCode::TOO_MANY_REQUESTS || status.is_server_error()
}

fn is_retryable_request_error(error: &reqwest::Error) -> bool {
    error.is_timeout() || error.is_connect()
}

fn bounded_retry_after_secs(seconds: u64) -> u64 {
    seconds.min(MAX_RETRY_AFTER_DELAY_SECS)
}

/// Calculate backoff delay with respect to Retry-After header
///
/// Implements exponential backoff: 1s, 2s, 4s, 8s
/// If the server provides a Retry-After header, uses that instead
///
/// # Arguments
///
/// * `response` - The HTTP response to check for Retry-After header
/// * `attempt` - Current attempt number (0-indexed)
///
/// # Returns
///
/// Duration to wait before the next retry
fn calculate_backoff_delay(response: Option<&reqwest::Response>, attempt: u32) -> Duration {
    // Check for Retry-After header
    if let Some(response) = response {
        if let Some(retry_after) = response.headers().get(reqwest::header::RETRY_AFTER) {
            if let Ok(retry_after_str) = retry_after.to_str() {
                // Try parsing as seconds (integer)
                if let Ok(seconds) = retry_after_str.parse::<u64>() {
                    let bounded_seconds = bounded_retry_after_secs(seconds);
                    if seconds > MAX_RETRY_AFTER_DELAY_SECS {
                        tracing::warn!(
                            "Retry-After header value {}s exceeds scraper retry cap; using {}s",
                            seconds,
                            bounded_seconds
                        );
                    } else {
                        tracing::debug!("Using Retry-After header value: {}s", seconds);
                    }
                    return Duration::from_secs(bounded_seconds);
                }
                // Could also parse HTTP date format here, but most rate limiters use seconds
            }
        }
    }

    // Exponential backoff: 2^attempt * BASE_DELAY_SECS
    // attempt 0: 1s, attempt 1: 2s, attempt 2: 4s, attempt 3: 8s
    let delay_secs = BASE_DELAY_SECS * 2_u64.pow(attempt);
    Duration::from_secs(delay_secs)
}

#[cfg(test)]
mod tests;
