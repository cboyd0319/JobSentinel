//! DNS-safe outbound target resolution.

mod body;
mod external_request;

pub use body::{
    read_json_with_limit, read_text_with_limit, HttpBodyReadError, DEFAULT_MAX_HTTP_BODY_BYTES,
};
#[cfg(any(test, feature = "test-support"))]
#[doc(hidden)]
pub use external_request::send_test_http_text_with_retry;
pub use external_request::{
    send_external_http_text_with_retry, send_external_https_text_with_retry, ExternalHttpMethod,
    ExternalHttpRequest,
};

use std::net::{IpAddr, SocketAddr};
use std::time::Duration;

use jobsentinel_security::{
    validate_external_http_url, validate_external_https_url, validate_resolved_ips,
};
use reqwest::header::LOCATION;
use thiserror::Error;
use tokio::net::lookup_host;
use url::Url;

/// Browser-compatible identity used for full HTML requests.
pub const FULL_BROWSER_USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/// Minimal browser-compatible identity used by sources that reject app identities.
pub const MINIMAL_BROWSER_USER_AGENT: &str =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

/// Minimal WebKit identity retained for feed and search source compatibility.
pub const MINIMAL_WEBKIT_USER_AGENT: &str =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

/// A validated external URL and the resolved addresses callers must pin.
#[derive(Clone, Debug)]
pub struct ResolvedExternalUrl {
    url: Url,
    dns_host: Option<String>,
    socket_addrs: Vec<SocketAddr>,
}

/// Status and bounded text returned by a DNS-pinned HTTPS GET.
#[derive(Debug)]
pub struct ExternalTextResponse {
    pub status: u16,
    pub body: String,
    pub redirect_location: Option<String>,
}

/// Failures from a policy-enforced external fetch.
#[derive(Debug, Error)]
pub enum ExternalFetchError {
    #[error("External target is not allowed")]
    InvalidTarget(String),

    #[error("Could not create the external HTTP client")]
    Client,

    #[error("External request timed out")]
    Timeout,

    #[error("External request failed")]
    Request,

    #[error("External response body read failed")]
    Body(#[from] HttpBodyReadError),
}

/// Fetch a public HTTPS resource without following an unvalidated redirect.
pub async fn fetch_external_https_text(
    url: &str,
    timeout: Duration,
) -> Result<ExternalTextResponse, String> {
    fetch_external_https_text_with_user_agent(url, timeout, None)
        .await
        .map_err(|error| error.to_string())
}

/// Fetch public HTTPS text with an optional caller identity header.
pub async fn fetch_external_https_text_with_user_agent(
    url: &str,
    timeout: Duration,
    user_agent: Option<&str>,
) -> Result<ExternalTextResponse, ExternalFetchError> {
    let target = resolve_external_https_url_for_fetch(url)
        .await
        .map_err(ExternalFetchError::InvalidTarget)?;
    fetch_resolved_external_text(&target, timeout, user_agent).await
}

/// POST a JSON payload to a public HTTPS endpoint with pinned DNS and no redirects.
pub async fn post_external_https_json<T: serde::Serialize + Sync + ?Sized>(
    url: &str,
    timeout: Duration,
    payload: &T,
) -> Result<ExternalTextResponse, ExternalFetchError> {
    let target = resolve_external_https_url_for_fetch(url)
        .await
        .map_err(ExternalFetchError::InvalidTarget)?;
    let mut builder = reqwest::Client::builder()
        .timeout(timeout)
        .redirect(reqwest::redirect::Policy::none());
    if let Some((host, addrs)) = target.dns_override() {
        builder = builder.resolve_to_addrs(host, addrs);
    }
    let client = builder.build().map_err(|_| ExternalFetchError::Client)?;
    let response = client
        .post(target.as_str())
        .json(payload)
        .send()
        .await
        .map_err(classify_request_error)?;
    bounded_text_response(response, target.as_str()).await
}

async fn fetch_resolved_external_text(
    target: &ResolvedExternalUrl,
    timeout: Duration,
    user_agent: Option<&str>,
) -> Result<ExternalTextResponse, ExternalFetchError> {
    let mut builder = reqwest::Client::builder()
        .timeout(timeout)
        .redirect(reqwest::redirect::Policy::none());
    if let Some(user_agent) = user_agent {
        builder = builder.user_agent(user_agent);
    }
    if let Some((host, addrs)) = target.dns_override() {
        builder = builder.resolve_to_addrs(host, addrs);
    }
    let client = builder.build().map_err(|_| ExternalFetchError::Client)?;
    let response = client
        .get(target.as_str())
        .send()
        .await
        .map_err(classify_request_error)?;
    bounded_text_response(response, target.as_str()).await
}

fn classify_request_error(error: reqwest::Error) -> ExternalFetchError {
    if error.is_timeout() {
        ExternalFetchError::Timeout
    } else {
        ExternalFetchError::Request
    }
}

async fn bounded_text_response(
    response: reqwest::Response,
    url_label: &str,
) -> Result<ExternalTextResponse, ExternalFetchError> {
    let status = response.status().as_u16();
    let redirect_location = response
        .headers()
        .get(LOCATION)
        .and_then(|value| value.to_str().ok())
        .map(str::to_string);
    let body = read_text_with_limit(response, url_label).await?;
    Ok(ExternalTextResponse {
        status,
        body,
        redirect_location,
    })
}

impl ResolvedExternalUrl {
    #[must_use]
    pub fn url(&self) -> &Url {
        &self.url
    }

    #[must_use]
    pub fn as_str(&self) -> &str {
        self.url.as_str()
    }

    #[must_use]
    pub fn into_url(self) -> Url {
        self.url
    }

    #[must_use]
    pub fn dns_override(&self) -> Option<(&str, &[SocketAddr])> {
        self.dns_host
            .as_deref()
            .map(|host| (host, self.socket_addrs.as_slice()))
    }

    #[cfg(any(test, feature = "test-support"))]
    #[doc(hidden)]
    #[must_use]
    pub fn from_parts_for_test(
        url: Url,
        dns_host: Option<String>,
        socket_addrs: Vec<SocketAddr>,
    ) -> Self {
        Self {
            url,
            dns_host,
            socket_addrs,
        }
    }
}

/// Validate an external HTTP URL and pin its public DNS resolution.
pub async fn resolve_external_http_url_for_fetch(url: &str) -> Result<ResolvedExternalUrl, String> {
    resolve_external_url_for_fetch(validate_external_http_url(url)?).await
}

/// Validate an external HTTPS URL and pin its public DNS resolution.
pub async fn resolve_external_https_url_for_fetch(
    url: &str,
) -> Result<ResolvedExternalUrl, String> {
    resolve_external_url_for_fetch(validate_external_https_url(url)?).await
}

/// Validate an external HTTP URL for a fetch and return its parsed form.
pub async fn validate_external_http_url_for_fetch(url: &str) -> Result<Url, String> {
    resolve_external_http_url_for_fetch(url)
        .await
        .map(ResolvedExternalUrl::into_url)
}

/// Validate an external HTTPS URL for a fetch and return its parsed form.
pub async fn validate_external_https_url_for_fetch(url: &str) -> Result<Url, String> {
    resolve_external_https_url_for_fetch(url)
        .await
        .map(ResolvedExternalUrl::into_url)
}

async fn resolve_external_url_for_fetch(parsed: Url) -> Result<ResolvedExternalUrl, String> {
    let host = parsed
        .host_str()
        .ok_or_else(|| "URL must include a host".to_string())?
        .trim_end_matches('.')
        .to_ascii_lowercase();

    if host.parse::<IpAddr>().is_ok() {
        return Ok(ResolvedExternalUrl {
            url: parsed,
            dns_host: None,
            socket_addrs: Vec::new(),
        });
    }

    let port = parsed
        .port_or_known_default()
        .ok_or_else(|| "URL must include a valid port".to_string())?;
    let socket_addrs: Vec<SocketAddr> = lookup_host((host.as_str(), port))
        .await
        .map_err(|_| "Could not verify URL host".to_string())?
        .collect();

    validate_resolved_ips(socket_addrs.iter().map(|addr| addr.ip()))?;

    Ok(ResolvedExternalUrl {
        url: parsed,
        dns_host: Some(host),
        socket_addrs,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use wiremock::matchers::{header, method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    #[tokio::test]
    async fn literal_ip_targets_do_not_need_dns_override() {
        let target = resolve_external_http_url_for_fetch("http://8.8.8.8/jobs")
            .await
            .expect("public IP literal should validate without DNS lookup");

        assert_eq!(target.as_str(), "http://8.8.8.8/jobs");
        assert!(target.dns_override().is_none());
    }

    #[tokio::test]
    async fn loopback_targets_are_rejected_before_request_construction() {
        let error = resolve_external_https_url_for_fetch("https://127.0.0.1/webhook")
            .await
            .unwrap_err();

        assert!(!error.is_empty());
    }

    #[test]
    fn domain_targets_expose_dns_override() {
        let url = Url::parse("https://example.com/jobs").unwrap();
        let addr: SocketAddr = "203.0.113.10:443".parse().unwrap();
        let target = ResolvedExternalUrl::from_parts_for_test(
            url,
            Some("example.com".to_string()),
            vec![addr],
        );
        let (host, addrs) = target
            .dns_override()
            .expect("domain should carry DNS override");

        assert_eq!(host, "example.com");
        assert_eq!(addrs, &[addr]);
        assert_eq!(target.url().as_str(), "https://example.com/jobs");
    }

    #[tokio::test]
    async fn external_fetch_pins_dns_sends_user_agent_and_blocks_redirects() {
        let server = MockServer::start().await;
        let target = ResolvedExternalUrl::from_parts_for_test(
            Url::parse(&format!(
                "http://example.com:{}/start",
                server.address().port()
            ))
            .unwrap(),
            Some("example.com".to_string()),
            vec![*server.address()],
        );
        Mock::given(method("GET"))
            .and(path("/start"))
            .and(header("user-agent", "JobSentinel-test"))
            .respond_with(
                ResponseTemplate::new(302)
                    .append_header("Location", "https://example.net/final?token=secret"),
            )
            .expect(1)
            .mount(&server)
            .await;
        Mock::given(method("GET"))
            .and(path("/final"))
            .respond_with(ResponseTemplate::new(200))
            .expect(0)
            .mount(&server)
            .await;

        let response =
            fetch_resolved_external_text(&target, Duration::from_secs(5), Some("JobSentinel-test"))
                .await
                .unwrap();

        assert_eq!(response.status, 302);
        assert_eq!(
            response.redirect_location.as_deref(),
            Some("https://example.net/final?token=secret")
        );
        server.verify().await;
    }
}
