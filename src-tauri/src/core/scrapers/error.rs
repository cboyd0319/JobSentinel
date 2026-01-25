//! Scraper Error Types
//!
//! Domain-specific error types for job board scrapers with detailed context
//! for better debugging and user-friendly error messages.

use thiserror::Error;

/// Comprehensive error type for scraper operations
#[derive(Error, Debug)]
pub enum ScraperError {
    /// HTTP request failed
    #[error("HTTP request failed for {url}: {source}")]
    HttpRequest {
        url: String,
        #[source]
        source: reqwest::Error,
    },

    /// HTTP error status code
    #[error("HTTP {status} from {url}: {message}")]
    HttpStatus {
        status: u16,
        url: String,
        message: String,
    },

    /// Rate limit exceeded
    #[error("Rate limit exceeded for {scraper}: {message}")]
    RateLimit { scraper: String, message: String },

    /// Failed to parse HTML/JSON response
    #[error("Failed to parse {format} from {url}: {source}")]
    ParseError {
        format: String, // "HTML", "JSON", "XML"
        url: String,
        #[source]
        source: Box<dyn std::error::Error + Send + Sync>,
    },

    /// Required HTML selector not found
    #[error("Selector not found in {url}: {selector}")]
    SelectorNotFound { url: String, selector: String },

    /// Missing required field in scraped data
    #[error("Missing required field '{field}' from {url}")]
    MissingField { field: String, url: String },

    /// Invalid or malformed URL
    #[error("Invalid URL: {url} - {reason}")]
    InvalidUrl { url: String, reason: String },

    /// Authentication failure (missing or invalid credentials)
    #[error("Authentication failed for {scraper}: {message}")]
    Authentication { scraper: String, message: String },

    /// Session expired (cookie/token no longer valid)
    #[error("Session expired for {scraper}: {message}")]
    SessionExpired { scraper: String, message: String },

    /// CAPTCHA detected
    #[error("CAPTCHA detected on {url} - manual intervention required")]
    CaptchaDetected { url: String },

    /// Cloudflare protection or anti-bot detected
    #[error("Anti-bot protection detected on {url}: {protection_type}")]
    BotProtection {
        url: String,
        protection_type: String, // "Cloudflare", "PerimeterX", "Akamai"
    },

    /// Request timeout
    #[error("Request timeout after {timeout_secs}s for {url}")]
    Timeout { url: String, timeout_secs: u64 },

    /// Network connectivity issue
    #[error("Network error for {url}: {source}")]
    Network {
        url: String,
        #[source]
        source: reqwest::Error,
    },

    /// Invalid configuration for scraper
    #[error("Invalid configuration for {scraper}: {message}")]
    InvalidConfiguration { scraper: String, message: String },

    /// Empty result set (may not be an error, but useful for logging)
    #[error("No jobs found for {scraper} with query: {query}")]
    NoResults { scraper: String, query: String },

    /// Data validation failed
    #[error("Data validation failed for {field}: {reason}")]
    ValidationError { field: String, reason: String },

    /// Feature not implemented yet
    #[error("Feature not implemented for {scraper}: {feature}")]
    NotImplemented { scraper: String, feature: String },

    /// Generic scraper error with context
    #[error("Scraper error for {scraper}: {message}")]
    Generic { scraper: String, message: String },
}

impl ScraperError {
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
                format!("Server returned error {} for {}", status, Self::sanitize_url(url))
            }
            Self::RateLimit { scraper, .. } => {
                format!("Rate limit reached for {}. Please try again later.", scraper)
            }
            Self::ParseError { format, url, .. } => {
                format!("Failed to parse {} from {}", format, Self::sanitize_url(url))
            }
            Self::Authentication { scraper, .. } => {
                format!("Authentication required for {}. Please check your credentials.", scraper)
            }
            Self::SessionExpired { scraper, .. } => {
                format!("Your {} session has expired. Please log in again.", scraper)
            }
            Self::CaptchaDetected { .. } => {
                "CAPTCHA detected. Please complete the challenge in your browser.".to_string()
            }
            Self::BotProtection { protection_type, .. } => {
                format!("{} protection detected. Please try again later or use a different method.", protection_type)
            }
            Self::Timeout { timeout_secs, .. } => {
                format!("Request timed out after {} seconds. Please check your connection.", timeout_secs)
            }
            Self::NoResults { scraper, .. } => {
                format!("No jobs found on {}. Try adjusting your search criteria.", scraper)
            }
            _ => self.to_string(),
        }
    }

    /// Sanitize URL for display (remove sensitive query params)
    fn sanitize_url(url: &str) -> String {
        // Remove query parameters that might contain sensitive data
        if let Some(base) = url.split('?').next() {
            base.to_string()
        } else {
            url.to_string()
        }
    }
}

/// Result type alias for scraper operations
pub type ScraperResult<T> = Result<T, ScraperError>;

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
        let reqwest_err = rt.block_on(async {
            client
                .get("https://example.com")
                .send()
                .await
                .unwrap_err()
        });

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
            serde_json::Error::io(std::io::Error::new(
                std::io::ErrorKind::InvalidData,
                "test",
            )),
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
}
