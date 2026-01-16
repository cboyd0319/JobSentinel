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
}
