//! Shared HTTP Client for Scrapers
//!
//! Provides a reusable HTTP client with consistent configuration
//! for all job board scrapers. This improves performance by reusing
//! connection pools instead of creating new clients per request.

use crate::core::url_security::{
    resolve_external_http_url_for_fetch, sanitize_url_for_logging, ResolvedExternalUrl,
};
use anyhow::{Context, Result};
use reqwest::redirect::Policy;
use std::sync::OnceLock;
use std::time::Duration;

mod retry_policy;

#[cfg(test)]
use retry_policy::bounded_retry_after_secs;
use retry_policy::{calculate_backoff_delay, is_retryable_request_error, is_retryable_status};

pub(super) use crate::core::http_body::{read_json_with_limit, read_text_with_limit};

/// Default user agent for scraper requests
pub(crate) const DEFAULT_USER_AGENT: &str =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/// Default request timeout in seconds
pub(super) const DEFAULT_TIMEOUT_SECS: u64 = 30;

/// Shared HTTP client for all scrapers
///
/// This client is lazily initialized and reuses connections across requests.
/// Using a shared client provides:
/// - Connection pooling (reuse TCP connections)
/// - Consistent configuration (timeouts, user-agent)
/// - Better performance (no per-request client creation overhead)
///
/// # Safety
/// Uses OnceLock with fallible initialization to avoid panics on startup.
/// If client creation fails, get_client() will attempt to create a fallback client.
static SHARED_CLIENT: OnceLock<reqwest::Client> = OnceLock::new();

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
pub(super) fn get_client() -> &'static reqwest::Client {
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
#[cfg(test)]
pub(super) fn create_custom_client(user_agent: &str, timeout_secs: u64) -> Result<reqwest::Client> {
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
pub(super) async fn get_with_retry(url: &str) -> Result<reqwest::Response> {
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
pub(super) async fn send_with_retry<F>(url: &str, build_request: F) -> Result<reqwest::Response>
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

#[cfg(test)]
mod tests;
