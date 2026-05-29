//! Scraper Error Types
//!
//! Domain-specific error types for job board scrapers with detailed context
//! for better debugging and user-friendly error messages.

use crate::core::url_security::sanitize_url_for_logging;
use std::fmt;

/// Comprehensive error type for scraper operations
#[derive(Debug)]
pub enum ScraperError {
    /// HTTP request failed
    HttpRequest { url: String, source: reqwest::Error },

    /// HTTP error status code
    HttpStatus {
        status: u16,
        url: String,
        message: String,
    },

    /// Rate limit exceeded
    RateLimit { scraper: String, message: String },

    /// Failed to parse HTML/JSON response
    ParseError {
        format: String, // "HTML", "JSON", "XML"
        url: String,
        source: Box<dyn std::error::Error + Send + Sync>,
    },

    /// Required HTML selector not found
    SelectorNotFound { url: String, selector: String },

    /// Missing required field in scraped data
    MissingField { field: String, url: String },

    /// Invalid or malformed URL
    InvalidUrl { url: String, reason: String },

    /// Authentication failure (missing or invalid credentials)
    Authentication { scraper: String, message: String },

    /// Session expired (cookie/token no longer valid)
    SessionExpired { scraper: String, message: String },

    /// CAPTCHA detected
    CaptchaDetected { url: String },

    /// Cloudflare protection or anti-bot detected
    BotProtection {
        url: String,
        protection_type: String, // "Cloudflare", "PerimeterX", "Akamai"
    },

    /// Request timeout
    Timeout { url: String, timeout_secs: u64 },

    /// Network connectivity issue
    Network { url: String, source: reqwest::Error },

    /// Invalid configuration for scraper
    InvalidConfiguration { scraper: String, message: String },

    /// Empty result set (may not be an error, but useful for logging)
    NoResults { scraper: String, query: String },

    /// Data validation failed
    ValidationError { field: String, reason: String },

    /// Feature not implemented yet
    NotImplemented { scraper: String, feature: String },

    /// Generic scraper error with context
    Generic { scraper: String, message: String },
}

impl fmt::Display for ScraperError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::HttpRequest { url, source: _ } => {
                write!(f, "HTTP request failed for {}", Self::sanitize_url(url))
            }
            Self::HttpStatus {
                status,
                url,
                message,
            } => {
                write!(
                    f,
                    "HTTP {} from {}: {}",
                    status,
                    Self::sanitize_url(url),
                    message
                )
            }
            Self::RateLimit { scraper, message } => {
                write!(f, "Rate limit exceeded for {scraper}: {message}")
            }
            Self::ParseError {
                format,
                url,
                source: _,
            } => {
                write!(
                    f,
                    "Failed to parse {} from {}",
                    format,
                    Self::sanitize_url(url)
                )
            }
            Self::SelectorNotFound { url, selector } => {
                write!(
                    f,
                    "Selector not found in {}: {}",
                    Self::sanitize_url(url),
                    selector
                )
            }
            Self::MissingField { field, url } => {
                write!(
                    f,
                    "Missing required field '{}' from {}",
                    field,
                    Self::sanitize_url(url)
                )
            }
            Self::InvalidUrl { url, reason } => {
                write!(f, "Invalid URL: {} - {}", Self::sanitize_url(url), reason)
            }
            Self::Authentication { scraper, message } => {
                write!(f, "Authentication failed for {scraper}: {message}")
            }
            Self::SessionExpired { scraper, message } => {
                write!(f, "Session expired for {scraper}: {message}")
            }
            Self::CaptchaDetected { url } => {
                write!(
                    f,
                    "CAPTCHA detected on {} - manual intervention required",
                    Self::sanitize_url(url)
                )
            }
            Self::BotProtection {
                url,
                protection_type,
            } => {
                write!(
                    f,
                    "Anti-bot protection detected on {}: {}",
                    Self::sanitize_url(url),
                    protection_type
                )
            }
            Self::Timeout { url, timeout_secs } => {
                write!(
                    f,
                    "Request timeout after {}s for {}",
                    timeout_secs,
                    Self::sanitize_url(url)
                )
            }
            Self::Network { url, source: _ } => {
                write!(f, "Network error for {}", Self::sanitize_url(url))
            }
            Self::InvalidConfiguration { scraper, message } => {
                write!(f, "Invalid configuration for {scraper}: {message}")
            }
            Self::NoResults { scraper, .. } => {
                write!(
                    f,
                    "No jobs found for {scraper} with supplied search criteria"
                )
            }
            Self::ValidationError { field, reason } => {
                write!(f, "Data validation failed for {field}: {reason}")
            }
            Self::NotImplemented { scraper, feature } => {
                write!(f, "Feature not implemented for {scraper}: {feature}")
            }
            Self::Generic { scraper, message } => {
                write!(f, "Scraper error for {scraper}: {message}")
            }
        }
    }
}

impl std::error::Error for ScraperError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::HttpRequest { source, .. } | Self::Network { source, .. } => Some(source),
            Self::ParseError { source, .. } => Some(source.as_ref()),
            _ => None,
        }
    }
}

impl ScraperError {
    /// Convert from anyhow::Error with scraper context
    ///
    /// This is a migration helper for converting anyhow errors to ScraperError.
    /// Use specific constructors (http_request, parse, etc.) when possible.
    pub fn from_anyhow(scraper: impl Into<String>, error: anyhow::Error) -> Self {
        Self::Generic {
            scraper: scraper.into(),
            message: Self::safe_anyhow_message(&error),
        }
    }

    fn safe_anyhow_message(error: &anyhow::Error) -> String {
        let message = error.to_string();

        if let Some(status) = Self::extract_http_status(&message) {
            return format!("HTTP {status}");
        }

        if message.contains("response body") || message.contains("Response body") {
            return "Job source response could not be read".to_string();
        }

        if message.contains("parse") || message.contains("JSON") {
            return "Job source response could not be parsed".to_string();
        }

        "Job source request failed".to_string()
    }

    fn extract_http_status(message: &str) -> Option<u16> {
        let status_text = message.strip_prefix("HTTP ")?;
        let status_digits: String = status_text
            .chars()
            .take_while(|ch| ch.is_ascii_digit())
            .collect();

        if status_digits.len() == 3 {
            status_digits.parse().ok()
        } else {
            None
        }
    }

    /// Create an HTTP request error with context
    pub fn http_request(url: impl Into<String>, source: reqwest::Error) -> Self {
        Self::HttpRequest {
            url: url.into(),
            source,
        }
    }

    /// Create an HTTP status error
    pub fn http_status(status: u16, url: impl Into<String>, message: impl Into<String>) -> Self {
        Self::HttpStatus {
            status,
            url: url.into(),
            message: message.into(),
        }
    }

    /// Create a rate limit error
    pub fn rate_limit(scraper: impl Into<String>, message: impl Into<String>) -> Self {
        Self::RateLimit {
            scraper: scraper.into(),
            message: message.into(),
        }
    }

    /// Create a parse error
    pub fn parse<E>(format: impl Into<String>, url: impl Into<String>, source: E) -> Self
    where
        E: std::error::Error + Send + Sync + 'static,
    {
        Self::ParseError {
            format: format.into(),
            url: url.into(),
            source: Box::new(source),
        }
    }

    /// Create a missing field error
    pub fn missing_field(field: impl Into<String>, url: impl Into<String>) -> Self {
        Self::MissingField {
            field: field.into(),
            url: url.into(),
        }
    }

    /// Create an authentication error
    pub fn authentication(scraper: impl Into<String>, message: impl Into<String>) -> Self {
        Self::Authentication {
            scraper: scraper.into(),
            message: message.into(),
        }
    }

    /// Create a session expired error
    pub fn session_expired(scraper: impl Into<String>, message: impl Into<String>) -> Self {
        Self::SessionExpired {
            scraper: scraper.into(),
            message: message.into(),
        }
    }

    /// Check if this is a transient error that can be retried
    #[must_use]
    pub fn is_retryable(&self) -> bool {
        match self {
            Self::HttpStatus { status, .. } => (*status >= 500 && *status < 600) || *status == 429,
            Self::Timeout { .. } | Self::Network { .. } => true,
            _ => false,
        }
    }

    /// Check if this error requires user intervention
    #[must_use]
    pub fn requires_user_action(&self) -> bool {
        matches!(
            self,
            Self::CaptchaDetected { .. }
                | Self::Authentication { .. }
                | Self::SessionExpired { .. }
        )
    }

    /// Get a user-friendly error message (safe to show in UI)
    #[must_use]
    pub fn user_message(&self) -> String {
        match self {
            Self::HttpRequest { url, .. } => {
                format!("Failed to connect to {}", Self::sanitize_url(url))
            }
            Self::HttpStatus { status, url, .. } => {
                format!(
                    "Server returned error {} for {}",
                    status,
                    Self::sanitize_url(url)
                )
            }
            Self::RateLimit { scraper, .. } => {
                format!(
                    "Rate limit reached for {}. Please try again later.",
                    scraper
                )
            }
            Self::ParseError { format, url, .. } => {
                format!(
                    "Failed to parse {} from {}",
                    format,
                    Self::sanitize_url(url)
                )
            }
            Self::Authentication { scraper, .. } => {
                format!(
                    "Authentication required for {}. Please check your credentials.",
                    scraper
                )
            }
            Self::SessionExpired { scraper, .. } => {
                format!("Your {} session has expired. Please log in again.", scraper)
            }
            Self::CaptchaDetected { .. } => {
                "CAPTCHA detected. Please complete the challenge in your browser.".to_string()
            }
            Self::BotProtection {
                protection_type, ..
            } => {
                format!(
                    "{} protection detected. Please try again later or use a different method.",
                    protection_type
                )
            }
            Self::Timeout { timeout_secs, .. } => {
                format!(
                    "Request timed out after {} seconds. Please check your connection.",
                    timeout_secs
                )
            }
            Self::NoResults { scraper, .. } => {
                format!(
                    "No jobs found on {}. Try adjusting your search criteria.",
                    scraper
                )
            }
            _ => self.to_string(),
        }
    }

    /// Sanitize URL for display (remove sensitive query params)
    fn sanitize_url(url: &str) -> String {
        sanitize_url_for_logging(url)
    }
}

/// Result type alias for scraper operations
pub type ScraperResult<T> = Result<T, ScraperError>;

/// Implement From trait for easy conversion from common error types
impl From<reqwest::Error> for ScraperError {
    fn from(error: reqwest::Error) -> Self {
        // Try to extract URL from the error if available
        let url = error
            .url()
            .map(|u| u.to_string())
            .unwrap_or_else(|| "unknown".to_string());

        if error.is_timeout() {
            Self::Timeout {
                url,
                timeout_secs: 30, // Default timeout
            }
        } else if error.is_connect() {
            Self::Network { url, source: error }
        } else {
            Self::HttpRequest { url, source: error }
        }
    }
}

impl From<serde_json::Error> for ScraperError {
    fn from(error: serde_json::Error) -> Self {
        Self::ParseError {
            format: "JSON".to_string(),
            url: "unknown".to_string(),
            source: Box::new(error),
        }
    }
}

impl From<crate::core::http_body::HttpBodyReadError> for ScraperError {
    fn from(error: crate::core::http_body::HttpBodyReadError) -> Self {
        match error {
            crate::core::http_body::HttpBodyReadError::ResponseTooLarge { url, max_bytes } => {
                Self::Generic {
                    scraper: "http".to_string(),
                    message: format!(
                        "Response body from {} exceeded {} byte limit",
                        Self::sanitize_url(&url),
                        max_bytes
                    ),
                }
            }
            crate::core::http_body::HttpBodyReadError::Read { url, source } => {
                Self::HttpRequest { url, source }
            }
            crate::core::http_body::HttpBodyReadError::Json { url, source } => Self::ParseError {
                format: "JSON".to_string(),
                url,
                source: Box::new(source),
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_http_request_error() {
        // Create a proper reqwest error using timeout
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_millis(1))
            .build()
            .unwrap();

        let rt = tokio::runtime::Runtime::new().unwrap();
        let reqwest_err =
            rt.block_on(async { client.get("https://example.com").send().await.unwrap_err() });

        let err = ScraperError::http_request("https://example.com", reqwest_err);
        assert!(matches!(err, ScraperError::HttpRequest { .. }));
        assert!(err.to_string().contains("example.com"));
    }

    #[test]
    fn test_rate_limit_error() {
        let err = ScraperError::rate_limit("linkedin", "100 requests per hour exceeded");
        assert!(matches!(err, ScraperError::RateLimit { .. }));
        assert!(err.to_string().contains("linkedin"));
    }

    #[test]
    fn test_is_retryable() {
        let retryable =
            ScraperError::http_status(503, "https://example.com", "Service Unavailable");
        assert!(retryable.is_retryable());

        let not_retryable = ScraperError::http_status(404, "https://example.com", "Not Found");
        assert!(!not_retryable.is_retryable());
    }

    #[test]
    fn test_requires_user_action() {
        let captcha = ScraperError::CaptchaDetected {
            url: "https://example.com".to_string(),
        };
        assert!(captcha.requires_user_action());

        let parse_error = ScraperError::parse(
            "JSON",
            "https://example.com",
            serde_json::Error::io(std::io::Error::new(std::io::ErrorKind::InvalidData, "test")),
        );
        assert!(!parse_error.requires_user_action());
    }

    #[test]
    fn test_user_message() {
        let err = ScraperError::rate_limit("linkedin", "limit exceeded");
        let msg = err.user_message();
        assert!(msg.contains("Rate limit"));
        assert!(msg.contains("linkedin"));
        assert!(!msg.contains("limit exceeded")); // Internal message hidden
    }

    #[test]
    fn test_sanitize_url() {
        let url = "https://example.com/api?token=secret123&key=abc";
        let sanitized = ScraperError::sanitize_url(url);
        assert_eq!(sanitized, "https://example.com/api");
        assert!(!sanitized.contains("secret123"));
    }

    #[test]
    fn test_display_messages_do_not_expose_raw_urls_or_queries() {
        let raw_url = "https://user:pass@example.com/jobs?token=secret123&query=security#private";

        let status = ScraperError::http_status(503, raw_url, "Service Unavailable");
        let status_text = status.to_string();
        assert!(status_text.contains("https://example.com/jobs"));
        assert!(!status_text.contains("secret123"));
        assert!(!status_text.contains("query=security"));
        assert!(!status_text.contains("user"));
        assert!(!status_text.contains("pass"));
        assert!(!status_text.contains("private"));

        let invalid = ScraperError::InvalidUrl {
            url: raw_url.to_string(),
            reason: "bad host".to_string(),
        };
        let invalid_text = invalid.to_string();
        assert!(invalid_text.contains("https://example.com/jobs"));
        assert!(!invalid_text.contains("secret123"));
        assert!(!invalid_text.contains("user"));
        assert!(!invalid_text.contains("pass"));
        assert!(!invalid_text.contains("private"));

        let no_results = ScraperError::NoResults {
            scraper: "linkedin".to_string(),
            query: "secret job search".to_string(),
        };
        let no_results_text = no_results.to_string();
        assert!(no_results_text.contains("linkedin"));
        assert!(!no_results_text.contains("secret job search"));
    }

    #[test]
    fn test_from_anyhow_does_not_expose_raw_error_details() {
        let raw_error = anyhow::anyhow!(
            "Failed to send request: https://user:pass@example.com/jobs?token=secret123&query=private#fragment"
        );

        let error = ScraperError::from_anyhow("dice", raw_error);
        let text = error.to_string();

        assert!(text.contains("Job source request failed"));
        assert!(!text.contains("example.com"));
        assert!(!text.contains("secret123"));
        assert!(!text.contains("query=private"));
        assert!(!text.contains("user"));
        assert!(!text.contains("pass"));
        assert!(!text.contains("fragment"));
    }

    #[test]
    fn test_from_anyhow_preserves_status_without_url() {
        let raw_error =
            anyhow::anyhow!("HTTP 503: https://example.com/jobs?token=secret123&query=private");

        let error = ScraperError::from_anyhow("dice", raw_error);
        let text = error.to_string();

        assert!(text.contains("HTTP 503"));
        assert!(!text.contains("example.com"));
        assert!(!text.contains("secret123"));
        assert!(!text.contains("query=private"));
    }

    #[test]
    fn test_http_body_too_large_conversion_sanitizes_url() {
        let raw_url = "https://user:pass@example.com/jobs?token=secret123&query=private#fragment";
        let source = crate::core::http_body::HttpBodyReadError::ResponseTooLarge {
            url: raw_url.to_string(),
            max_bytes: 1024,
        };

        let error = ScraperError::from(source);
        let text = error.to_string();

        assert!(text.contains("https://example.com/jobs"));
        assert!(text.contains("1024 byte limit"));
        assert!(!text.contains("secret123"));
        assert!(!text.contains("query=private"));
        assert!(!text.contains("user"));
        assert!(!text.contains("pass"));
        assert!(!text.contains("fragment"));
    }
}
