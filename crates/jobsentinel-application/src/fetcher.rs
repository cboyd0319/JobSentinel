//! HTTP fetcher for job pages
//!
//! Single-page fetcher with proper User-Agent and timeout handling.

use super::types::{ImportError, ImportResult};
use jobsentinel_network::{
    fetch_external_https_text_with_user_agent, ExternalFetchError, FULL_BROWSER_USER_AGENT,
};
use jobsentinel_security::sanitize_url_for_logging;
use std::time::Duration;

/// Timeout for HTTP requests (30 seconds)
const HTTP_TIMEOUT: Duration = Duration::from_secs(30);

/// Fetch a single job page HTML content
///
/// This performs a single HTTP GET request with:
/// - Realistic User-Agent header (identifies as browser)
/// - 30-second timeout
/// - HTTPS enforcement
/// - Redirects disabled to avoid fetching a different trust boundary
/// - No cookies or authentication (user-initiated, public page)
pub(super) async fn fetch_job_page(url: &str) -> ImportResult<String> {
    tracing::info!(url = %sanitize_url_for_logging(url), "Fetching job page");

    let response =
        fetch_external_https_text_with_user_agent(url, HTTP_TIMEOUT, Some(FULL_BROWSER_USER_AGENT))
            .await
            .map_err(map_fetch_error)?;

    if (300..400).contains(&response.status) {
        return Err(ImportError::RedirectBlocked {
            location: response
                .redirect_location
                .unwrap_or_else(|| "unknown".to_string()),
        });
    }
    if !(200..300).contains(&response.status) {
        return Err(ImportError::HttpStatus(response.status));
    }

    tracing::debug!(
        html_length = response.body.len(),
        "Successfully fetched job page HTML"
    );

    Ok(response.body)
}

fn map_fetch_error(error: ExternalFetchError) -> ImportError {
    match error {
        ExternalFetchError::InvalidTarget(message) => ImportError::InvalidUrl(message),
        ExternalFetchError::Timeout => ImportError::Timeout,
        ExternalFetchError::Body(error) => ImportError::HttpBodyRead(error),
        ExternalFetchError::Client | ExternalFetchError::Request => ImportError::HttpRequest,
    }
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
    async fn test_blocks_plaintext_http_urls_before_fetch() {
        let result = fetch_job_page("http://example.com/jobs").await;
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

        let result = fetch_job_page("http://127.0.0.1.nip.io/internal").await;
        assert!(matches!(result, Err(ImportError::InvalidUrl(_))));
    }
}
