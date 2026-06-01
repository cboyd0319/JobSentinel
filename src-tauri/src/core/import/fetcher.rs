//! HTTP fetcher for job pages
//!
//! Single-page fetcher with proper User-Agent and timeout handling.

use super::types::{ImportError, ImportResult};
use crate::core::http_body::read_text_with_limit;
use crate::core::url_security::sanitize_url_for_logging;
use reqwest::header::LOCATION;
use reqwest::{redirect::Policy, Client};
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
pub async fn fetch_job_page(url: &str) -> ImportResult<String> {
    // Validate URL
    let parsed_url = crate::core::url_security::validate_external_http_url_for_fetch(url)
        .await
        .map_err(ImportError::InvalidUrl)?;

    tracing::info!(url = %sanitize_url_for_logging(url), "Fetching job page");

    let client = build_import_http_client().map_err(ImportError::HttpError)?;

    // Fetch the page
    let response = client.get(parsed_url).send().await.map_err(|e| {
        if e.is_timeout() {
            ImportError::Timeout
        } else {
            ImportError::HttpError(e)
        }
    })?;

    if response.status().is_redirection() {
        let location = response
            .headers()
            .get(LOCATION)
            .and_then(|value| value.to_str().ok())
            .unwrap_or("unknown")
            .to_string();

        return Err(ImportError::RedirectBlocked { location });
    }

    // Check HTTP status
    let response = response
        .error_for_status()
        .map_err(ImportError::HttpError)?;

    // Get HTML content
    let html = read_text_with_limit(response, url).await?;

    tracing::debug!(
        html_length = html.len(),
        "Successfully fetched job page HTML"
    );

    Ok(html)
}

fn build_import_http_client() -> Result<Client, reqwest::Error> {
    Client::builder()
        .redirect(Policy::none())
        .timeout(HTTP_TIMEOUT)
        .user_agent(crate::core::scrapers::http_client::DEFAULT_USER_AGENT)
        .build()
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

        let result = fetch_job_page("http://127.0.0.1.nip.io/internal").await;
        assert!(matches!(result, Err(ImportError::InvalidUrl(_))));
    }

    // Note: Testing actual HTTP requests requires wiremock in integration tests

    #[tokio::test]
    async fn test_import_client_does_not_follow_redirects() {
        use reqwest::StatusCode;
        use wiremock::matchers::{method, path};
        use wiremock::{Mock, MockServer, ResponseTemplate};

        let server = MockServer::start().await;
        let redirect_target = format!("{}/target", server.uri());

        Mock::given(method("GET"))
            .and(path("/start"))
            .respond_with(
                ResponseTemplate::new(StatusCode::FOUND.as_u16())
                    .append_header("Location", redirect_target),
            )
            .expect(1)
            .mount(&server)
            .await;

        Mock::given(method("GET"))
            .and(path("/target"))
            .respond_with(ResponseTemplate::new(StatusCode::OK.as_u16()))
            .expect(0)
            .mount(&server)
            .await;

        let response = build_import_http_client()
            .expect("client should build")
            .get(format!("{}/start", server.uri()))
            .send()
            .await
            .expect("request should return redirect response");

        assert_eq!(response.status(), StatusCode::FOUND);
        server.verify().await;
    }
}
