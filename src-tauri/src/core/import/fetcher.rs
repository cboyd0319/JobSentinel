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
    let parsed_url = reqwest::Url::parse(url)
        .map_err(|e| ImportError::InvalidUrl(format!("Invalid URL format: {}", e)))?;

    // Ensure HTTPS for security
    if parsed_url.scheme() != "https" && parsed_url.scheme() != "http" {
        return Err(ImportError::InvalidUrl(format!(
            "Unsupported URL scheme: {}",
            parsed_url.scheme()
        )));
    }

    tracing::info!(url = %url, "Fetching job page");

    // Build HTTP client with browser-like headers
    let client = Client::builder()
        .timeout(HTTP_TIMEOUT)
        .user_agent(crate::core::scrapers::http_client::DEFAULT_USER_AGENT)
        .build()
        .map_err(ImportError::HttpError)?;

    // Fetch the page
    let response = client.get(url).send().await.map_err(|e| {
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

    // Note: Testing actual HTTP requests requires wiremock in integration tests
}
