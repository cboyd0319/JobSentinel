//! Rate Limiting for Job Board Scrapers
//!
//! Implements token bucket rate limiting to prevent IP bans and respect
//! rate limits of job boards.

use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::Mutex;

/// Rate limiter using token bucket algorithm
pub struct RateLimiter {
    buckets: Arc<Mutex<HashMap<String, TokenBucket>>>,
}

/// Token bucket for rate limiting
struct TokenBucket {
    /// Maximum tokens (requests) allowed
    capacity: u32,
    /// Current token count
    tokens: u32,
    /// Last refill time
    last_refill: Instant,
    /// Refill rate (tokens per second)
    refill_rate: f64,
}

impl RateLimiter {
    pub fn new() -> Self {
        Self {
            buckets: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Wait until request is allowed for given scraper
    ///
    /// # Arguments
    /// * `scraper_name` - Name of the scraper (e.g., "linkedin", "indeed")
    /// * `max_requests_per_hour` - Maximum requests allowed per hour
    ///
    /// # Example
    /// ```rust,no_run
    /// # use jobsentinel::core::scrapers::rate_limiter::RateLimiter;
    /// # async fn example() {
    /// let limiter = RateLimiter::new();
    ///
    /// // LinkedIn: max 100 requests/hour
    /// limiter.wait("linkedin", 100).await;
    ///
    /// // Indeed: max 500 requests/hour
    /// limiter.wait("indeed", 500).await;
    /// # }
    /// ```
    pub async fn wait(&self, scraper_name: &str, max_requests_per_hour: u32) {
        let mut buckets = self.buckets.lock().await;

        let bucket = buckets
            .entry(scraper_name.to_string())
            .or_insert_with(|| TokenBucket::new(max_requests_per_hour));

        bucket.wait_for_token().await;
    }

    /// Check if request is allowed without waiting
    pub async fn is_allowed(&self, scraper_name: &str, max_requests_per_hour: u32) -> bool {
        let mut buckets = self.buckets.lock().await;

        let bucket = buckets
            .entry(scraper_name.to_string())
            .or_insert_with(|| TokenBucket::new(max_requests_per_hour));

        bucket.refill();
        bucket.tokens > 0
    }

    /// Reset rate limiter for a scraper (useful for testing)
    pub async fn reset(&self, scraper_name: &str) {
        let mut buckets = self.buckets.lock().await;
        buckets.remove(scraper_name);
    }
}

impl Default for RateLimiter {
    fn default() -> Self {
        Self::new()
    }
}

impl TokenBucket {
    fn new(max_requests_per_hour: u32) -> Self {
        Self {
            capacity: max_requests_per_hour,
            tokens: max_requests_per_hour,
            last_refill: Instant::now(),
            refill_rate: max_requests_per_hour as f64 / 3600.0, // tokens per second
        }
    }

    /// Refill tokens based on elapsed time
    fn refill(&mut self) {
        let now = Instant::now();
        let elapsed = now.duration_since(self.last_refill).as_secs_f64();

        // Calculate tokens to add
        let tokens_to_add = (elapsed * self.refill_rate) as u32;

        if tokens_to_add > 0 {
            self.tokens = (self.tokens + tokens_to_add).min(self.capacity);
            self.last_refill = now;
        }
    }

    /// Wait until a token is available
    async fn wait_for_token(&mut self) {
        loop {
            self.refill();

            if self.tokens > 0 {
                self.tokens -= 1;
                return;
            }

            // Calculate wait time until next token
            let wait_secs = 1.0 / self.refill_rate;
            let wait_duration = Duration::from_secs_f64(wait_secs);

            tracing::debug!(
                "Rate limit reached, waiting {:?} for next token",
                wait_duration
            );

            tokio::time::sleep(wait_duration).await;
        }
    }
}

/// Scraper-specific rate limits (requests per hour)
pub mod limits {
    /// LinkedIn: 100 requests/hour (conservative to avoid detection)
    pub const LINKEDIN: u32 = 100;

    /// Indeed: 500 requests/hour (more generous, has public API)
    pub const INDEED: u32 = 500;

    /// Greenhouse: 1000 requests/hour (official API)
    pub const GREENHOUSE: u32 = 1000;

    /// Lever: 1000 requests/hour (official API)
    pub const LEVER: u32 = 1000;

    /// JobsWithGPT: 10,000 requests/hour (MCP server)
    pub const JOBSWITHGPT: u32 = 10_000;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_rate_limiter_allows_initial_requests() {
        let limiter = RateLimiter::new();

        // Should allow first request immediately
        assert!(limiter.is_allowed("test", 10).await);
        assert!(limiter.is_allowed("test", 10).await);
    }

    #[tokio::test]
    async fn test_rate_limiter_respects_limit() {
        let limiter = RateLimiter::new();

        // Exhaust all tokens (10 requests)
        for _ in 0..10 {
            limiter.wait("test", 10).await;
        }

        // Next request should be blocked
        assert!(!limiter.is_allowed("test", 10).await);
    }

    #[tokio::test]
    async fn test_token_bucket_refill() {
        let mut bucket = TokenBucket::new(3600); // 3600 requests/hour = 1/second

        // Exhaust tokens
        bucket.tokens = 0;
        bucket.last_refill = Instant::now();

        // Wait 2 seconds
        tokio::time::sleep(Duration::from_secs(2)).await;

        // Should have ~2 tokens after refill
        bucket.refill();
        assert!(bucket.tokens >= 1);
    }

    #[tokio::test]
    async fn test_rate_limiter_reset() {
        let limiter = RateLimiter::new();

        // Exhaust tokens
        for _ in 0..10 {
            limiter.wait("test", 10).await;
        }

        assert!(!limiter.is_allowed("test", 10).await);

        // Reset should restore capacity
        limiter.reset("test").await;
        assert!(limiter.is_allowed("test", 10).await);
    }

    #[tokio::test]
    async fn test_different_scrapers_independent_limits() {
        let limiter = RateLimiter::new();

        // Exhaust linkedin
        for _ in 0..10 {
            limiter.wait("linkedin", 10).await;
        }

        // Indeed should still be available
        assert!(limiter.is_allowed("indeed", 10).await);
    }
}
