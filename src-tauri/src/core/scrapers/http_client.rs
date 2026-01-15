//! Shared HTTP Client for Scrapers
//!
//! Provides a reusable HTTP client with consistent configuration
//! for all job board scrapers. This improves performance by reusing
//! connection pools instead of creating new clients per request.

use anyhow::Result;
use std::time::Duration;

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
                tracing::error!("Failed to create optimized HTTP client: {}. Using fallback.", e);
                reqwest::Client::builder()
                    .timeout(Duration::from_secs(DEFAULT_TIMEOUT_SECS))
                    .build()
                    .unwrap_or_else(|_| {
                        // Absolute fallback - default client with no customization
                        tracing::error!("Fallback HTTP client creation also failed. Using default client.");
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
    fn test_create_custom_client() {
        let client = create_custom_client("TestAgent/1.0", 10);
        assert!(client.is_ok());
    }

    #[test]
    fn test_default_constants() {
        assert!(!DEFAULT_USER_AGENT.is_empty());
        // DEFAULT_TIMEOUT_SECS is a const, so this is a compile-time check
        const _: () = assert!(DEFAULT_TIMEOUT_SECS > 0);
    }
}
