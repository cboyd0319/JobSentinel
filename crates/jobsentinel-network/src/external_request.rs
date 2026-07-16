//! Bounded, policy-enforced request execution for source adapters.

use std::fmt;
use std::time::Duration;

use reqwest::header::RETRY_AFTER;
use serde_json::Value;

use crate::{
    bounded_text_response, classify_request_error, resolve_external_http_url_for_fetch,
    ExternalFetchError, ExternalTextResponse, ResolvedExternalUrl,
};

const MAX_RETRIES: u32 = 3;
const MAX_RETRY_AFTER_SECS: u64 = 60;

/// HTTP method supported by the bounded external request facade.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ExternalHttpMethod {
    Get,
    Post,
}

/// A provider-neutral external request. Header values and JSON bodies are never
/// included in its debug representation because they may contain credentials.
#[derive(Clone)]
pub struct ExternalHttpRequest {
    url: String,
    method: ExternalHttpMethod,
    headers: Vec<(String, String)>,
    query: Vec<(String, String)>,
    json_body: Option<Value>,
    timeout: Duration,
    user_agent: Option<String>,
    max_retries: u32,
}

impl fmt::Debug for ExternalHttpRequest {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("ExternalHttpRequest")
            .field("method", &self.method)
            .field("header_count", &self.headers.len())
            .field("query_count", &self.query.len())
            .field("has_json_body", &self.json_body.is_some())
            .field("timeout", &self.timeout)
            .field("has_user_agent", &self.user_agent.is_some())
            .field("max_retries", &self.max_retries)
            .finish_non_exhaustive()
    }
}

impl ExternalHttpRequest {
    #[must_use]
    pub fn get(url: impl Into<String>) -> Self {
        Self::new(url, ExternalHttpMethod::Get)
    }

    #[must_use]
    pub fn post(url: impl Into<String>) -> Self {
        Self::new(url, ExternalHttpMethod::Post)
    }

    fn new(url: impl Into<String>, method: ExternalHttpMethod) -> Self {
        Self {
            url: url.into(),
            method,
            headers: Vec::new(),
            query: Vec::new(),
            json_body: None,
            timeout: Duration::from_secs(30),
            user_agent: None,
            max_retries: MAX_RETRIES,
        }
    }

    #[must_use]
    pub fn header(mut self, name: impl Into<String>, value: impl Into<String>) -> Self {
        self.headers.push((name.into(), value.into()));
        self
    }

    #[must_use]
    pub fn query(mut self, query: impl IntoIterator<Item = (String, String)>) -> Self {
        self.query.extend(query);
        self
    }

    #[must_use]
    pub fn json(mut self, body: Value) -> Self {
        self.json_body = Some(body);
        self
    }

    #[must_use]
    pub const fn timeout(mut self, timeout: Duration) -> Self {
        self.timeout = timeout;
        self
    }

    #[must_use]
    pub fn user_agent(mut self, user_agent: impl Into<String>) -> Self {
        self.user_agent = Some(user_agent.into());
        self
    }

    /// Disable retries for operations that are not safe to repeat, including
    /// billable provider requests.
    #[must_use]
    pub const fn without_retries(mut self) -> Self {
        self.max_retries = 0;
        self
    }
}

/// Execute a public HTTP(S) request with DNS pinning, bounded response reads,
/// disabled redirects, and bounded retries for rate limits and server errors.
pub async fn send_external_http_text_with_retry(
    request: ExternalHttpRequest,
) -> Result<ExternalTextResponse, ExternalFetchError> {
    let target = resolve_external_http_url_for_fetch(&request.url)
        .await
        .map_err(ExternalFetchError::InvalidTarget)?;
    send_resolved_request_with_retry(&target, &request).await
}

/// Execute a public HTTPS request with the same bounded retry policy.
pub async fn send_external_https_text_with_retry(
    request: ExternalHttpRequest,
) -> Result<ExternalTextResponse, ExternalFetchError> {
    let target = crate::resolve_external_https_url_for_fetch(&request.url)
        .await
        .map_err(ExternalFetchError::InvalidTarget)?;
    send_resolved_request_with_retry(&target, &request).await
}

async fn send_resolved_request_with_retry(
    target: &ResolvedExternalUrl,
    request: &ExternalHttpRequest,
) -> Result<ExternalTextResponse, ExternalFetchError> {
    let mut client_builder = reqwest::Client::builder()
        .timeout(request.timeout)
        .redirect(reqwest::redirect::Policy::none())
        .pool_max_idle_per_host(10)
        .pool_idle_timeout(Duration::from_secs(90));
    if let Some(user_agent) = request.user_agent.as_deref() {
        client_builder = client_builder.user_agent(user_agent);
    }
    if let Some((host, addrs)) = target.dns_override() {
        client_builder = client_builder.resolve_to_addrs(host, addrs);
    }
    let client = client_builder
        .build()
        .map_err(|_| ExternalFetchError::Client)?;

    for attempt in 0..=request.max_retries {
        let mut builder = match request.method {
            ExternalHttpMethod::Get => client.get(target.as_str()),
            ExternalHttpMethod::Post => client.post(target.as_str()),
        };
        for (name, value) in &request.headers {
            let name = reqwest::header::HeaderName::from_bytes(name.as_bytes())
                .map_err(|_| ExternalFetchError::Request)?;
            let value = reqwest::header::HeaderValue::from_str(value)
                .map_err(|_| ExternalFetchError::Request)?;
            builder = builder.header(name, value);
        }
        if !request.query.is_empty() {
            builder = builder.query(&request.query);
        }
        if let Some(body) = request.json_body.as_ref() {
            builder = builder.json(body);
        }

        let response = match builder.send().await {
            Ok(response) => response,
            Err(error) => {
                let classified = classify_request_error(error);
                if attempt == request.max_retries
                    || !matches!(classified, ExternalFetchError::Request)
                {
                    return Err(classified);
                }
                tokio::time::sleep(backoff_delay(None, attempt)).await;
                continue;
            }
        };

        let status = response.status();
        if attempt == request.max_retries
            || !(status == reqwest::StatusCode::TOO_MANY_REQUESTS || status.is_server_error())
        {
            return bounded_text_response(response, target.as_str()).await;
        }

        let retry_after = response
            .headers()
            .get(RETRY_AFTER)
            .and_then(|value| value.to_str().ok())
            .and_then(|value| value.parse::<u64>().ok());
        tokio::time::sleep(backoff_delay(retry_after, attempt)).await;
    }

    Err(ExternalFetchError::Request)
}

fn backoff_delay(retry_after: Option<u64>, attempt: u32) -> Duration {
    Duration::from_secs(
        retry_after
            .map(|seconds| seconds.min(MAX_RETRY_AFTER_SECS))
            .unwrap_or_else(|| 1_u64 << attempt.min(6)),
    )
}

#[cfg(any(test, feature = "test-support"))]
#[doc(hidden)]
pub async fn send_test_http_text_with_retry(
    request: ExternalHttpRequest,
) -> Result<ExternalTextResponse, ExternalFetchError> {
    let url = url::Url::parse(&request.url).map_err(|_| ExternalFetchError::Request)?;
    let target = ResolvedExternalUrl::from_parts_for_test(url, None, Vec::new());
    send_resolved_request_with_retry(&target, &request).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use wiremock::matchers::{header, method, path, query_param};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    #[tokio::test]
    async fn request_facade_preserves_headers_query_and_bounded_body() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/jobs"))
            .and(query_param("title", "engineer"))
            .and(header("x-source", "jobs"))
            .respond_with(ResponseTemplate::new(200).set_body_string("ok"))
            .expect(1)
            .mount(&server)
            .await;

        let response = send_test_http_text_with_retry(
            ExternalHttpRequest::get(format!("{}/jobs", server.uri()))
                .query([("title".to_string(), "engineer".to_string())])
                .header("x-source", "jobs"),
        )
        .await
        .unwrap();

        assert_eq!(response.status, 200);
        assert_eq!(response.body, "ok");
        server.verify().await;
    }

    #[tokio::test]
    async fn request_facade_does_not_follow_redirects() {
        let server = MockServer::start().await;
        Mock::given(method("GET"))
            .and(path("/start"))
            .respond_with(ResponseTemplate::new(302).append_header("Location", "/target"))
            .expect(1)
            .mount(&server)
            .await;
        Mock::given(method("GET"))
            .and(path("/target"))
            .respond_with(ResponseTemplate::new(200))
            .expect(0)
            .mount(&server)
            .await;

        let response = send_test_http_text_with_retry(ExternalHttpRequest::get(format!(
            "{}/start",
            server.uri()
        )))
        .await
        .unwrap();

        assert_eq!(response.status, 302);
        server.verify().await;
    }

    #[tokio::test]
    async fn request_facade_can_disable_retries_for_non_idempotent_requests() {
        let server = MockServer::start().await;
        Mock::given(method("POST"))
            .and(path("/billable"))
            .respond_with(ResponseTemplate::new(500))
            .expect(1)
            .mount(&server)
            .await;

        let response = send_test_http_text_with_retry(
            ExternalHttpRequest::post(format!("{}/billable", server.uri())).without_retries(),
        )
        .await
        .unwrap();

        assert_eq!(response.status, 500);
        server.verify().await;
    }
}
