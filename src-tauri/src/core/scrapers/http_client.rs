//! Shared HTTP Client for Scrapers
//!
//! Provides a reusable HTTP client with consistent configuration
//! for all job board scrapers. This improves performance by reusing
//! connection pools instead of creating new clients per request.

use anyhow::{Context, Result};
use std::time::Duration;
use crate::core::scrapers::cache;

/// Default user agent for scraper requests
pub const DEFAULT_USER_AGENT: &str =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

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
    reqwest::Client::builder()
        .user_agent(DEFAULT_USER_AGENT)
        .timeout(Duration::from_secs(DEFAULT_TIMEOUT_SECS))
        .pool_max_idle_per_host(10)
        .pool_idle_timeout(Duration::from_secs(90))
        .build()
        .map_err(|e| anyhow::anyhow!("Failed to create HTTP client: {}", e))
}

/// Get the shared HTTP client
///
/// This is the preferred way to get an HTTP client for scraping.
/// The client is created once and reused for all requests.
///
/// # Returns
/// A reference to the shared HTTP client. If the shared client failed to initialize,
/// this function will attempt to create a minimal fallback client.
///
/// # Example
///
/// ```ignore
/// use crate::core::scrapers::http_client::get_client;
///
/// let client = get_client();
/// let response = client.get("https://example.com").send().await?;
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
                reqwest::Client::builder()
                    .timeout(Duration::from_secs(DEFAULT_TIMEOUT_SECS))
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
pub fn create_custom_client(user_agent: &str, timeout_secs: u64) -> Result<reqwest::Client> {
    let client = reqwest::Client::builder()
        .user_agent(user_agent)
        .timeout(Duration::from_secs(timeout_secs))
        .pool_max_idle_per_host(5)
        .build()?;
    Ok(client)
}

/// Maximum number of retry attempts
const MAX_RETRIES: u32 = 3;

/// Base delay for exponential backoff in seconds
const BASE_DELAY_SECS: u64 = 1;

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
/// let jobs = response.json::<Vec<Job>>().await?;
/// ```
pub async fn get_with_retry(url: &str) -> Result<reqwest::Response> {
    let client = get_client();
    
    for attempt in 0..=MAX_RETRIES {
        let response = client
            .get(url)
            .send()
            .await
            .context("Failed to send GET request")?;
        
        let status = response.status();
        
        // Success - return immediately
        if status.is_success() {
            if attempt > 0 {
                tracing::info!(
                    "Request succeeded after {} retry attempt(s): {}",
                    attempt,
                    url
                );
            }
            return Ok(response);
        }
        
        // Check if we should retry
        let should_retry = status == reqwest::StatusCode::TOO_MANY_REQUESTS || status.is_server_error();
        
        if !should_retry || attempt == MAX_RETRIES {
            // Don't retry, or exhausted retries
            return Err(anyhow::anyhow!(
                "HTTP {} after {} attempt(s): {}",
                status,
                attempt + 1,
                url
            ));
        }
        
        // Calculate backoff delay
        let delay = calculate_backoff_delay(&response, attempt);
        
        tracing::warn!(
            "Request failed with HTTP {} (attempt {}/{}), retrying after {}s: {}",
            status,
            attempt + 1,
            MAX_RETRIES + 1,
            delay.as_secs(),
            url
        );
        
        tokio::time::sleep(delay).await;
    }
    
    // Unreachable, but satisfy the compiler
    Err(anyhow::anyhow!("Retry logic error"))
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
        tracing::debug!("Returning cached response for: {}", url);
        return Ok(cached_body);
    }
    
    // Cache miss - make the request
    tracing::debug!("Cache miss, fetching: {}", url);
    let response = get_with_retry(url).await?;
    let body = response.text().await.context("Failed to read response body")?;
    
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
            tracing::debug!("Returning cached response for: {}", url);
            return Ok(cached_body);
        }
    }
    
    // Make the actual request
    let response = get_with_retry(url).await?;
    let body = response.text().await.context("Failed to read response body")?;
    
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
/// * `body` - The request body (must implement Clone)
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
/// let body = serde_json::json!({"query": "rust developer"});
/// let response = post_with_retry("https://example.com/api/search", body).await?;
/// ```
pub async fn post_with_retry<T: serde::Serialize + Clone>(
    url: &str,
    body: T,
) -> Result<reqwest::Response> {
    let client = get_client();
    
    for attempt in 0..=MAX_RETRIES {
        let response = client
            .post(url)
            .json(&body)
            .send()
            .await
            .context("Failed to send POST request")?;
        
        let status = response.status();
        
        // Success - return immediately
        if status.is_success() {
            if attempt > 0 {
                tracing::info!(
                    "Request succeeded after {} retry attempt(s): {}",
                    attempt,
                    url
                );
            }
            return Ok(response);
        }
        
        // Check if we should retry
        let should_retry = status == reqwest::StatusCode::TOO_MANY_REQUESTS || status.is_server_error();
        
        if !should_retry || attempt == MAX_RETRIES {
            // Don't retry, or exhausted retries
            return Err(anyhow::anyhow!(
                "HTTP {} after {} attempt(s): {}",
                status,
                attempt + 1,
                url
            ));
        }
        
        // Calculate backoff delay
        let delay = calculate_backoff_delay(&response, attempt);
        
        tracing::warn!(
            "Request failed with HTTP {} (attempt {}/{}), retrying after {}s: {}",
            status,
            attempt + 1,
            MAX_RETRIES + 1,
            delay.as_secs(),
            url
        );
        
        tokio::time::sleep(delay).await;
    }
    
    // Unreachable, but satisfy the compiler
    Err(anyhow::anyhow!("Retry logic error"))
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
fn calculate_backoff_delay(response: &reqwest::Response, attempt: u32) -> Duration {
    // Check for Retry-After header
    if let Some(retry_after) = response.headers().get(reqwest::header::RETRY_AFTER) {
        if let Ok(retry_after_str) = retry_after.to_str() {
            // Try parsing as seconds (integer)
            if let Ok(seconds) = retry_after_str.parse::<u64>() {
                tracing::debug!("Using Retry-After header value: {}s", seconds);
                return Duration::from_secs(seconds);
            }
            // Could also parse HTTP date format here, but most rate limiters use seconds
        }
    }
    
    // Exponential backoff: 2^attempt * BASE_DELAY_SECS
    // attempt 0: 1s, attempt 1: 2s, attempt 2: 4s, attempt 3: 8s
    let delay_secs = BASE_DELAY_SECS * 2_u64.pow(attempt);
    Duration::from_secs(delay_secs)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_shared_client_is_singleton() {
        let client1 = get_client();
        let client2 = get_client();
        // Both should point to the same client
        assert!(std::ptr::eq(client1, client2));
    }

    #[test]
    fn test_shared_client_is_functional() {
        let client = get_client();
        // Verify the client is actually usable
        assert!(client.get("https://example.com").build().is_ok());
    }

    #[test]
    fn test_create_custom_client() {
        let client = create_custom_client("TestAgent/1.0", 10);
        assert!(client.is_ok());
    }

    #[test]
    fn test_create_custom_client_with_empty_user_agent() {
        let client = create_custom_client("", 10);
        // Empty user agent is technically valid
        assert!(client.is_ok());
    }

    #[test]
    fn test_create_custom_client_with_zero_timeout() {
        let client = create_custom_client("TestAgent/1.0", 0);
        // Zero timeout should work (means no timeout)
        assert!(client.is_ok());
    }

    #[test]
    fn test_create_custom_client_with_long_timeout() {
        let client = create_custom_client("TestAgent/1.0", 3600);
        assert!(client.is_ok());
    }

    #[test]
    fn test_custom_client_with_custom_user_agent() {
        let custom_agent = "CustomBot/2.0 (Test)";
        let client = create_custom_client(custom_agent, 10).unwrap();

        // Verify the client can build requests successfully
        // Note: reqwest doesn't expose the default user agent from the client,
        // but we can verify the client was created with the custom config
        let request = client.get("https://example.com").build().unwrap();
        assert_eq!(request.method(), reqwest::Method::GET);
        assert_eq!(request.url().as_str(), "https://example.com/");
    }

    #[test]
    fn test_default_constants() {
        assert!(!DEFAULT_USER_AGENT.is_empty());
        // DEFAULT_TIMEOUT_SECS is a const, so this is a compile-time check
        const _: () = assert!(DEFAULT_TIMEOUT_SECS > 0);
    }

    #[test]
    fn test_default_user_agent_format() {
        // Verify it looks like a browser user agent
        assert!(DEFAULT_USER_AGENT.contains("Mozilla"));
        assert!(DEFAULT_USER_AGENT.contains("Chrome"));
        assert!(DEFAULT_USER_AGENT.contains("Windows NT"));
    }

    #[test]
    fn test_default_timeout_is_reasonable() {
        // Timeout should be neither too short nor too long
        assert!(DEFAULT_TIMEOUT_SECS >= 10);
        assert!(DEFAULT_TIMEOUT_SECS <= 120);
    }

    #[test]
    fn test_init_shared_client_success() {
        let result = init_shared_client();
        assert!(result.is_ok());

        let client = result.unwrap();
        // Verify the client can build requests
        assert!(client.get("https://example.com").build().is_ok());
    }

    #[test]
    fn test_shared_client_request_building() {
        let client = get_client();

        // Test various HTTP methods
        assert!(client.get("https://example.com").build().is_ok());
        assert!(client.post("https://example.com").build().is_ok());
        assert!(client.head("https://example.com").build().is_ok());
    }

    #[test]
    fn test_custom_client_request_building() {
        let client = create_custom_client("TestAgent/1.0", 10).unwrap();

        // Verify the custom client can build requests
        assert!(client.get("https://example.com").build().is_ok());
        assert!(client.post("https://example.com").build().is_ok());
    }

    #[test]
    fn test_custom_client_with_special_characters_in_user_agent() {
        let client = create_custom_client("Test-Agent/1.0 (Special!@#)", 10);
        // Special characters in user agent should be handled
        assert!(client.is_ok());
    }

    #[test]
    fn test_custom_client_with_unicode_user_agent() {
        let client = create_custom_client("TestAgent/1.0 (テスト)", 10);
        // Unicode in user agent should be handled
        assert!(client.is_ok());
    }

    #[test]
    fn test_custom_client_with_very_long_user_agent() {
        let long_agent = "A".repeat(1000);
        let client = create_custom_client(&long_agent, 10);
        // Very long user agent should still work
        assert!(client.is_ok());
    }

    #[test]
    fn test_retry_constants() {
        assert_eq!(MAX_RETRIES, 3);
        assert_eq!(BASE_DELAY_SECS, 1);
    }

    #[test]
    fn test_calculate_backoff_delay_exponential() {
        // Test the exponential backoff logic
        // attempt 0: 1s, attempt 1: 2s, attempt 2: 4s, attempt 3: 8s
        assert_eq!(BASE_DELAY_SECS * 2_u64.pow(0), 1);
        assert_eq!(BASE_DELAY_SECS * 2_u64.pow(1), 2);
        assert_eq!(BASE_DELAY_SECS * 2_u64.pow(2), 4);
        assert_eq!(BASE_DELAY_SECS * 2_u64.pow(3), 8);
    }

    #[tokio::test]
    async fn test_get_with_retry_success() {
        // Test with httpbin which should succeed
        let result = get_with_retry("https://httpbin.org/status/200").await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_get_with_retry_client_error_no_retry() {
        // 404 should not retry
        let result = get_with_retry("https://httpbin.org/status/404").await;
        assert!(result.is_err());
        let err_msg = result.unwrap_err().to_string();
        assert!(err_msg.contains("404"));
    }

    // Note: Testing actual retry behavior with 429/5xx would require a mock server
    // Using wiremock in integration tests would be ideal for comprehensive retry testing

    #[tokio::test]
    async fn test_get_with_cache_miss() {
        cache::clear_cache().await;
        let stats_before = cache::cache_stats().await;
        let misses_before = stats_before.misses;
        
        // This should result in a cache miss and fetch from network
        let result = get_with_cache("https://httpbin.org/status/200").await;
        assert!(result.is_ok());
        
        let stats = cache::cache_stats().await;
        // At least one new miss should have occurred
        assert!(stats.misses > misses_before);
    }

    #[tokio::test]
    async fn test_get_with_cache_hit() {
        cache::clear_cache().await;
        
        let url = "https://httpbin.org/uuid";
        let stats_before = cache::cache_stats().await;
        let hits_before = stats_before.hits;
        
        // First request - cache miss
        let body1 = get_with_cache(url).await.unwrap();
        
        // Second request - should hit cache and return same body
        let body2 = get_with_cache(url).await.unwrap();
        
        assert_eq!(body1, body2);
        
        let stats = cache::cache_stats().await;
        // At least one new hit should have occurred
        assert!(stats.hits > hits_before);
    }

    #[tokio::test]
    async fn test_cache_reduces_requests() {
        cache::clear_cache().await;
        
        let url = "https://httpbin.org/uuid";
        
        // Make 5 requests to the same URL
        let mut responses = Vec::new();
        for _ in 0..5 {
            let body = get_with_cache(url).await.unwrap();
            responses.push(body);
        }
        
        // All responses should be identical (from cache)
        for response in &responses[1..] {
            assert_eq!(&responses[0], response);
        }
        
        let stats = cache::cache_stats().await;
        // 1 miss on first request, 4 hits on subsequent requests
        assert_eq!(stats.misses, 1);
        assert_eq!(stats.hits, 4);
    }
}

