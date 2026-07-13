use std::time::Duration;

use super::{BASE_DELAY_SECS, MAX_RETRY_AFTER_DELAY_SECS};

pub(super) fn is_retryable_status(status: reqwest::StatusCode) -> bool {
    status == reqwest::StatusCode::TOO_MANY_REQUESTS || status.is_server_error()
}

pub(super) fn is_retryable_request_error(error: &reqwest::Error) -> bool {
    error.is_timeout() || error.is_connect()
}

pub(super) fn bounded_retry_after_secs(seconds: u64) -> u64 {
    seconds.min(MAX_RETRY_AFTER_DELAY_SECS)
}

/// Calculate backoff delay with respect to Retry-After header
///
/// Implements exponential backoff: 1s, 2s, 4s, 8s
/// If the server provides a Retry-After header, uses that instead
///
/// # Arguments
///
/// * `response` - The HTTP response to check for Retry-After header
/// * `attempt` - Current attempt number (0-indexed)
///
/// # Returns
///
/// Duration to wait before the next retry
pub(super) fn calculate_backoff_delay(
    response: Option<&reqwest::Response>,
    attempt: u32,
) -> Duration {
    // Check for Retry-After header
    if let Some(response) = response {
        if let Some(retry_after) = response.headers().get(reqwest::header::RETRY_AFTER) {
            if let Ok(retry_after_str) = retry_after.to_str() {
                // Try parsing as seconds (integer)
                if let Ok(seconds) = retry_after_str.parse::<u64>() {
                    let bounded_seconds = bounded_retry_after_secs(seconds);
                    if seconds > MAX_RETRY_AFTER_DELAY_SECS {
                        tracing::warn!(
                            "Retry-After header value {}s exceeds scraper retry cap; using {}s",
                            seconds,
                            bounded_seconds
                        );
                    } else {
                        tracing::debug!("Using Retry-After header value: {}s", seconds);
                    }
                    return Duration::from_secs(bounded_seconds);
                }
                // Could also parse HTTP date format here, but most rate limiters use seconds
            }
        }
    }

    // Exponential backoff: 2^attempt * BASE_DELAY_SECS
    // attempt 0: 1s, attempt 1: 2s, attempt 2: 4s, attempt 3: 8s
    let delay_secs = BASE_DELAY_SECS * 2_u64.pow(attempt);
    Duration::from_secs(delay_secs)
}
