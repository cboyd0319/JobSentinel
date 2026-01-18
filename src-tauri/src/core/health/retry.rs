//! Retry logic with exponential backoff

use std::future::Future;
use std::time::Duration;

/// Configuration for retry behavior
#[derive(Debug, Clone)]
pub struct RetryConfig {
    /// Maximum number of retry attempts (including initial)
    pub max_attempts: u32,
    /// Initial delay before first retry (ms)
    pub initial_delay_ms: u64,
    /// Maximum delay between retries (ms)
    pub max_delay_ms: u64,
    /// Multiplier for exponential backoff
    pub backoff_multiplier: f64,
    /// HTTP status codes that trigger retry
    pub retryable_status_codes: Vec<u16>,
}

impl Default for RetryConfig {
    fn default() -> Self {
        Self {
            max_attempts: 3,
            initial_delay_ms: 1000,
            max_delay_ms: 30000,
            backoff_multiplier: 2.0,
            retryable_status_codes: vec![429, 500, 502, 503, 504],
        }
    }
}

impl RetryConfig {
    /// Get delay for a given attempt number (0-indexed)
    pub fn get_delay(&self, attempt: u32) -> Duration {
        let delay_ms =
            (self.initial_delay_ms as f64 * self.backoff_multiplier.powi(attempt as i32)) as u64;
        Duration::from_millis(delay_ms.min(self.max_delay_ms))
    }

    /// Check if an HTTP status code should trigger retry
    pub fn should_retry_status(&self, status_code: u16) -> bool {
        self.retryable_status_codes.contains(&status_code)
    }

    /// Create a config for conservative retries (longer delays)
    pub fn conservative() -> Self {
        Self {
            max_attempts: 3,
            initial_delay_ms: 2000,
            max_delay_ms: 60000,
            backoff_multiplier: 2.5,
            retryable_status_codes: vec![429, 500, 502, 503, 504],
        }
    }

    /// Create a config for aggressive retries (more attempts, shorter delays)
    pub fn aggressive() -> Self {
        Self {
            max_attempts: 5,
            initial_delay_ms: 500,
            max_delay_ms: 15000,
            backoff_multiplier: 1.5,
            retryable_status_codes: vec![429, 500, 502, 503, 504, 408],
        }
    }
}

/// Execute an async operation with retry logic
pub async fn with_retry<F, Fut, T, E>(
    config: &RetryConfig,
    scraper_name: &str,
    operation: F,
) -> Result<T, anyhow::Error>
where
    F: Fn() -> Fut,
    Fut: Future<Output = Result<T, E>>,
    E: std::error::Error + Send + Sync + 'static,
{
    let mut last_error: Option<anyhow::Error> = None;

    for attempt in 0..config.max_attempts {
        match operation().await {
            Ok(result) => {
                if attempt > 0 {
                    tracing::info!(
                        "{}: Succeeded on attempt {} after {} retries",
                        scraper_name,
                        attempt + 1,
                        attempt
                    );
                }
                return Ok(result);
            }
            Err(e) => {
                let error = anyhow::Error::from(e);
                let is_retryable = is_retryable_error(&error);

                tracing::warn!(
                    "{}: Attempt {}/{} failed: {} (retryable: {})",
                    scraper_name,
                    attempt + 1,
                    config.max_attempts,
                    error,
                    is_retryable
                );

                if !is_retryable || attempt + 1 >= config.max_attempts {
                    last_error = Some(error);
                    break;
                }

                let delay = config.get_delay(attempt);
                tracing::info!("{}: Retrying in {:?}", scraper_name, delay);
                tokio::time::sleep(delay).await;

                last_error = Some(error);
            }
        }
    }

    Err(last_error.unwrap_or_else(|| anyhow::anyhow!("Unknown error after retries")))
}

/// Check if an error is retryable based on its message
pub fn is_retryable_error(error: &anyhow::Error) -> bool {
    let msg = error.to_string().to_lowercase();

    // Network/connectivity issues - always retry
    if msg.contains("timeout")
        || msg.contains("connection")
        || msg.contains("reset")
        || msg.contains("broken pipe")
        || msg.contains("network")
    {
        return true;
    }

    // Rate limiting - always retry
    if msg.contains("429") || msg.contains("rate limit") || msg.contains("too many requests") {
        return true;
    }

    // Server errors - retry
    if msg.contains("500")
        || msg.contains("502")
        || msg.contains("503")
        || msg.contains("504")
        || msg.contains("internal server error")
        || msg.contains("bad gateway")
        || msg.contains("service unavailable")
    {
        return true;
    }

    // Temporary issues
    if msg.contains("temporary") || msg.contains("try again") {
        return true;
    }

    false
}

/// Extract HTTP status code from error message if present
pub fn extract_status_code(error: &anyhow::Error) -> Option<u16> {
    let msg = error.to_string();

    // Common patterns: "HTTP 429", "status: 503", "status code: 429"
    for pattern in ["http ", "status: ", "status code: ", "code "] {
        if let Some(idx) = msg.to_lowercase().find(pattern) {
            let start = idx + pattern.len();
            let code_str: String = msg[start..]
                .chars()
                .take_while(|c| c.is_ascii_digit())
                .collect();
            if let Ok(code) = code_str.parse::<u16>() {
                if (100..600).contains(&code) {
                    return Some(code);
                }
            }
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_retry_config_default() {
        let config = RetryConfig::default();
        assert_eq!(config.max_attempts, 3);
        assert_eq!(config.initial_delay_ms, 1000);
    }

    #[test]
    fn test_get_delay_exponential() {
        let config = RetryConfig::default();
        assert_eq!(config.get_delay(0), Duration::from_millis(1000));
        assert_eq!(config.get_delay(1), Duration::from_millis(2000));
        assert_eq!(config.get_delay(2), Duration::from_millis(4000));
    }

    #[test]
    fn test_get_delay_capped() {
        let config = RetryConfig {
            max_delay_ms: 5000,
            ..Default::default()
        };
        // After enough attempts, should be capped at max
        assert_eq!(config.get_delay(10), Duration::from_millis(5000));
    }

    #[test]
    fn test_is_retryable_error() {
        assert!(is_retryable_error(&anyhow::anyhow!("Connection timeout")));
        assert!(is_retryable_error(&anyhow::anyhow!(
            "HTTP 429 Too Many Requests"
        )));
        assert!(is_retryable_error(&anyhow::anyhow!(
            "503 Service Unavailable"
        )));
        assert!(!is_retryable_error(&anyhow::anyhow!("404 Not Found")));
        assert!(!is_retryable_error(&anyhow::anyhow!("Invalid JSON")));
    }

    #[test]
    fn test_extract_status_code() {
        assert_eq!(
            extract_status_code(&anyhow::anyhow!("HTTP 429 Too Many Requests")),
            Some(429)
        );
        assert_eq!(
            extract_status_code(&anyhow::anyhow!("status: 503")),
            Some(503)
        );
        assert_eq!(
            extract_status_code(&anyhow::anyhow!("No status code here")),
            None
        );
    }
}
