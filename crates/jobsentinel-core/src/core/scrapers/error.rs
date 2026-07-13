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
                let _ = url;
                "Could not connect to this job source. Check your internet connection and try again."
                    .to_string()
            }
            Self::HttpStatus { .. } => {
                "This job source could not respond right now. Try again later.".to_string()
            }
            Self::RateLimit { scraper, .. } => {
                format!("{scraper} asked JobSentinel to slow down. Try again later.")
            }
            Self::ParseError { .. } => {
                "JobSentinel could not read this job source. The site may have changed."
                    .to_string()
            }
            Self::Authentication { scraper, .. } => {
                format!("{scraper} needs sign-in or access details. Review the source settings.")
            }
            Self::SessionExpired { scraper, .. } => {
                format!("Sign in to {scraper} again, then try again.")
            }
            Self::CaptchaDetected { .. } => {
                "This site asked for a human check. Open it in your browser, complete the check, then try again.".to_string()
            }
            Self::BotProtection { .. } => {
                "This site is limiting checks. Open it yourself, or try again later.".to_string()
            }
            Self::Timeout { .. } => {
                "This took too long. Check your internet connection, or try again later."
                    .to_string()
            }
            Self::NoResults { scraper, .. } => {
                format!("No jobs found on {scraper}. Try changing your search words or filters.")
            }
            _ => {
                "JobSentinel could not check this job source. Try again, or save a safe support report if it keeps happening.".to_string()
            }
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
mod tests;
