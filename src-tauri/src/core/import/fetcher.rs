//! HTTP fetcher for job pages
//!
//! Single-page fetcher with proper User-Agent and timeout handling.

use super::types::{ImportError, ImportResult};
use reqwest::Client;
use std::time::Duration;

/// Timeout for HTTP requests (30 seconds)
const HTTP_TIMEOUT: Duration = Duration::from_secs(30);

/// Fetch a single job page HTML content
///
/// This performs a single HTTP GET request with:
/// - Realistic User-Agent header (identifies as browser)
/// - 30-second timeout
/// - HTTPS enforcement
/// - No cookies or authentication (user-initiated, public page)
pub async fn fetch_job_page(url: &str) -> ImportResult<String> {
    // Validate URL
    let parsed_url = crate::core::url_security::validate_external_http_url(url)
        .map_err(ImportError::InvalidUrl)?;

    tracing::info!(url = %url, "Fetching job page");

    // Build HTTP client with browser-like headers
    let client = Client::builder()
        .timeout(HTTP_TIMEOUT)
        .user_agent(crate::core::scrapers::http_client::DEFAULT_USER_AGENT)
        .build()
        .map_err(ImportError::HttpError)?;

    // Fetch the page
    let response = client.get(parsed_url).send().await.map_err(|e| {
        if e.is_timeout() {
            ImportError::Timeout
        } else {
            ImportError::HttpError(e)
        }
    })?;

    // Check HTTP status
    let response = response
        .error_for_status()
        .map_err(ImportError::HttpError)?;

    // Get HTML content
    let html = response.text().await.map_err(ImportError::HttpError)?;

    tracing::debug!(
        html_length = html.len(),
        "Successfully fetched job page HTML"
    );

    Ok(html)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_invalid_url() {
        let result = fetch_job_page("not-a-url").await;
        assert!(matches!(result, Err(ImportError::InvalidUrl(_))));
    }

    #[tokio::test]
    async fn test_invalid_scheme() {
        let result = fetch_job_page("ftp://example.com").await;
        assert!(matches!(result, Err(ImportError::InvalidUrl(_))));
    }

    #[tokio::test]
    async fn test_blocks_localhost_urls_before_fetch() {
        let result = fetch_job_page("http://127.0.0.1/internal").await;
        assert!(matches!(result, Err(ImportError::InvalidUrl(_))));

        let result = fetch_job_page("http://localhost:3000/internal").await;
        assert!(matches!(result, Err(ImportError::InvalidUrl(_))));
    }

    #[tokio::test]
    async fn test_blocks_private_network_urls_before_fetch() {
        let result = fetch_job_page("http://10.0.0.5/internal").await;
        assert!(matches!(result, Err(ImportError::InvalidUrl(_))));

        let result = fetch_job_page("http://192.168.1.5/internal").await;
        assert!(matches!(result, Err(ImportError::InvalidUrl(_))));
    }

    // Note: Testing actual HTTP requests requires wiremock in integration tests
}
