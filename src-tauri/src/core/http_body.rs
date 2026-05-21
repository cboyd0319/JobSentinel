//! Bounded HTTP response body readers for external fetches.

use crate::core::url_security::sanitize_url_for_logging;
use serde::de::DeserializeOwned;
use thiserror::Error;

/// Default maximum decoded HTTP response body size for scraper and import fetches.
pub const DEFAULT_MAX_HTTP_BODY_BYTES: usize = 16 * 1024 * 1024;

#[derive(Debug, Error)]
pub enum HttpBodyReadError {
    #[error("HTTP response body from {url} exceeded {max_bytes} byte limit")]
    ResponseTooLarge { url: String, max_bytes: usize },

    #[error("Failed to read HTTP response body from {url}: {source}")]
    Read {
        url: String,
        #[source]
        source: reqwest::Error,
    },

    #[error("Failed to parse JSON response from {url}: {source}")]
    Json {
        url: String,
        #[source]
        source: serde_json::Error,
    },
}

fn sanitized_url(url: &str) -> String {
    sanitize_url_for_logging(url)
}

/// Read a response body as text while enforcing a decoded byte limit.
pub async fn read_text_with_limit(
    mut response: reqwest::Response,
    url: &str,
) -> Result<String, HttpBodyReadError> {
    read_text_with_custom_limit(&mut response, url, DEFAULT_MAX_HTTP_BODY_BYTES).await
}

async fn read_text_with_custom_limit(
    response: &mut reqwest::Response,
    url: &str,
    max_bytes: usize,
) -> Result<String, HttpBodyReadError> {
    let url = sanitized_url(url);

    if let Some(content_length) = response.content_length() {
        if content_length > max_bytes as u64 {
            return Err(HttpBodyReadError::ResponseTooLarge { url, max_bytes });
        }
    }

    let mut body = Vec::new();

    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|source| HttpBodyReadError::Read {
            url: url.clone(),
            source,
        })?
    {
        if body.len().saturating_add(chunk.len()) > max_bytes {
            return Err(HttpBodyReadError::ResponseTooLarge { url, max_bytes });
        }

        body.extend_from_slice(&chunk);
    }

    match String::from_utf8(body) {
        Ok(text) => Ok(text),
        Err(error) => Ok(String::from_utf8_lossy(&error.into_bytes()).into_owned()),
    }
}

/// Read and parse a JSON response while enforcing a decoded byte limit.
pub async fn read_json_with_limit<T>(
    response: reqwest::Response,
    url: &str,
) -> Result<T, HttpBodyReadError>
where
    T: DeserializeOwned,
{
    let url_label = sanitized_url(url);
    let body = read_text_with_limit(response, url).await?;

    serde_json::from_str(&body).map_err(|source| HttpBodyReadError::Json {
        url: url_label,
        source,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use wiremock::matchers::{method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    #[tokio::test]
    async fn read_text_with_limit_accepts_body_under_limit() {
        let server = MockServer::start().await;
        let url = format!("{}/small", server.uri());

        Mock::given(method("GET"))
            .and(path("/small"))
            .respond_with(ResponseTemplate::new(200).set_body_string("small body"))
            .mount(&server)
            .await;

        let mut response = reqwest::Client::new()
            .get(&url)
            .send()
            .await
            .expect("request should succeed");

        let body = read_text_with_custom_limit(&mut response, &url, 32)
            .await
            .expect("body under limit should read");

        assert_eq!(body, "small body");
    }

    #[tokio::test]
    async fn read_text_with_limit_rejects_body_over_limit() {
        let server = MockServer::start().await;
        let url = format!("{}/large", server.uri());

        Mock::given(method("GET"))
            .and(path("/large"))
            .respond_with(ResponseTemplate::new(200).set_body_string("too large"))
            .mount(&server)
            .await;

        let mut response = reqwest::Client::new()
            .get(&url)
            .send()
            .await
            .expect("request should succeed");

        let error = read_text_with_custom_limit(&mut response, &url, 4)
            .await
            .expect_err("body over limit should fail");

        assert!(matches!(
            error,
            HttpBodyReadError::ResponseTooLarge { max_bytes: 4, .. }
        ));
    }

    #[tokio::test]
    async fn read_text_with_limit_rejects_content_length_over_limit() {
        let server = MockServer::start().await;
        let url = format!("{}/declared-large", server.uri());

        Mock::given(method("GET"))
            .and(path("/declared-large"))
            .respond_with(
                ResponseTemplate::new(200)
                    .insert_header("content-length", "4096")
                    .set_body_string("x".repeat(4096)),
            )
            .mount(&server)
            .await;

        let mut response = reqwest::Client::new()
            .get(&url)
            .send()
            .await
            .expect("request should succeed");

        let error = read_text_with_custom_limit(&mut response, &url, 128)
            .await
            .expect_err("declared body over limit should fail");

        assert!(matches!(
            error,
            HttpBodyReadError::ResponseTooLarge { max_bytes: 128, .. }
        ));
    }

    #[tokio::test]
    async fn read_json_with_limit_parses_json() {
        let server = MockServer::start().await;
        let url = format!("{}/json", server.uri());

        Mock::given(method("GET"))
            .and(path("/json"))
            .respond_with(ResponseTemplate::new(200).set_body_string(r#"{"ok":true}"#))
            .mount(&server)
            .await;

        let response = reqwest::Client::new()
            .get(&url)
            .send()
            .await
            .expect("request should succeed");

        let parsed: serde_json::Value = read_json_with_limit(response, &url)
            .await
            .expect("json should parse");

        assert_eq!(parsed["ok"], true);
    }
}
