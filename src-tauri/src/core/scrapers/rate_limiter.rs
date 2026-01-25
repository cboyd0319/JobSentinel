//! Rate Limiting for Job Board Scrapers
//!
//! Implements token bucket rate limiting to prevent IP bans and respect
//! rate limits of job boards.

use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::Mutex;

/// Rate limiter using token bucket algorithm
#[derive(Debug, Clone)]
pub struct RateLimiter {
    buckets: Arc<Mutex<HashMap<String, TokenBucket>>>,
}

/// Token bucket for rate limiting
#[derive(Debug)]
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
    #[must_use]
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
    #[tracing::instrument(skip(self))]
    pub async fn wait(&self, scraper_name: &str, max_requests_per_hour: u32) {
        tracing::debug!("Acquiring rate limit token for scraper");
        let mut buckets = self.buckets.lock().await;

        let bucket = buckets
            .entry(scraper_name.to_string())
            .or_insert_with(|| TokenBucket::new(max_requests_per_hour));

        bucket.wait_for_token().await;
    }

    /// Check if request is allowed without waiting
    #[must_use]
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
    #[must_use]
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
                tracing::debug!("Token consumed, {} tokens remaining", self.tokens);
                return;
            }

            // Calculate wait time until next token
            let wait_secs = 1.0 / self.refill_rate;
            let wait_duration = Duration::from_secs_f64(wait_secs);

            tracing::warn!(
                "Rate limit exhausted, waiting {:?} for token refill (refill_rate: {}/sec)",
                wait_duration,
                self.refill_rate
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

    #[tokio::test]
    async fn test_default_trait() {
        let limiter = RateLimiter::default();

        // Should work identically to RateLimiter::new()
        assert!(limiter.is_allowed("test", 10).await);
    }

    #[tokio::test]
    async fn test_token_bucket_no_refill_when_zero_elapsed() {
        let mut bucket = TokenBucket::new(3600);

        // Record initial state
        let initial_tokens = bucket.tokens;
        let initial_capacity = bucket.capacity;

        // Refill immediately (zero time elapsed)
        bucket.refill();

        // Tokens should not change (no time passed)
        assert_eq!(bucket.tokens, initial_tokens);
        assert_eq!(bucket.capacity, initial_capacity);
    }

    #[tokio::test]
    async fn test_token_bucket_caps_at_capacity() {
        let mut bucket = TokenBucket::new(100);

        // Start with fewer tokens
        bucket.tokens = 50;
        bucket.last_refill = Instant::now() - Duration::from_secs(3600); // 1 hour ago

        // Refill should cap at capacity, not exceed it
        bucket.refill();
        assert_eq!(bucket.tokens, 100);
        assert!(bucket.tokens <= bucket.capacity);
    }

    #[tokio::test]
    async fn test_wait_blocks_when_no_tokens() {
        let limiter = RateLimiter::new();

        // Use only 2 tokens capacity for fast test
        // 2 requests per hour = 1 token every 1800 seconds
        limiter.wait("slow", 2).await; // Use first token
        limiter.wait("slow", 2).await; // Use second token

        // Verify we're out of tokens
        assert!(!limiter.is_allowed("slow", 2).await);

        // Next wait should block until refill
        // Since refill_rate = 2/3600 = 0.000556 tokens/sec,
        // wait time = 1 / 0.000556 = 1800 seconds
        // This is too long for a test, so we use timeout to verify blocking behavior

        let start = Instant::now();

        // Use a short timeout to verify it blocks (doesn't complete immediately)
        let wait_result =
            tokio::time::timeout(Duration::from_millis(100), limiter.wait("slow", 2)).await;

        let elapsed = start.elapsed();

        // Verify wait timed out (proving it was blocking)
        assert!(
            wait_result.is_err(),
            "Wait should have timed out, proving it blocks when no tokens available"
        );

        // Should have waited approximately the timeout duration
        assert!(
            elapsed >= Duration::from_millis(100) && elapsed < Duration::from_millis(200),
            "Expected timeout after ~100ms, but elapsed: {:?}",
            elapsed
        );
    }

    #[tokio::test]
    async fn test_token_bucket_refill_rate_calculation() {
        let bucket = TokenBucket::new(3600);

        // 3600 requests/hour should be 1 request/second
        assert_eq!(bucket.refill_rate, 1.0);

        let bucket_slow = TokenBucket::new(100);
        // 100 requests/hour should be ~0.0278 requests/second
        assert!((bucket_slow.refill_rate - (100.0 / 3600.0)).abs() < 0.001);
    }

    #[tokio::test]
    async fn test_is_allowed_does_not_consume_token() {
        let limiter = RateLimiter::new();

        // Check if allowed (should not consume)
        assert!(limiter.is_allowed("test", 10).await);

        // Should still have full capacity for actual requests
        for _ in 0..10 {
            limiter.wait("test", 10).await;
        }

        // Now should be exhausted
        assert!(!limiter.is_allowed("test", 10).await);
    }

    #[tokio::test]
    async fn test_limits_constants_are_reasonable() {
        // Verify constants are defined and reasonable
        assert!(limits::LINKEDIN > 0);
        assert!(limits::INDEED > 0);
        assert!(limits::GREENHOUSE > 0);
        assert!(limits::LEVER > 0);
        assert!(limits::JOBSWITHGPT > 0);

        // Verify conservative LinkedIn limit
        assert!(limits::LINKEDIN < limits::INDEED);

        // Verify MCP server has highest limit
        assert!(limits::JOBSWITHGPT > limits::GREENHOUSE);
    }

    #[tokio::test]
    async fn test_multiple_wait_cycles() {
        let limiter = RateLimiter::new();

        // Use tokens
        for _ in 0..5 {
            limiter.wait("cycle", 10).await;
        }

        // Verify some consumed
        let tokens_left = {
            let buckets = limiter.buckets.lock().await;
            buckets.get("cycle").unwrap().tokens
        };
        assert_eq!(tokens_left, 5);

        // Use remaining
        for _ in 0..5 {
            limiter.wait("cycle", 10).await;
        }

        // Should be exhausted
        assert!(!limiter.is_allowed("cycle", 10).await);
    }

    #[tokio::test]
    async fn test_zero_tokens_edge_case() {
        let limiter = RateLimiter::new();

        // Exhaust all tokens
        for _ in 0..10 {
            limiter.wait("zero", 10).await;
        }

        // Manually verify bucket is at zero
        let is_zero = {
            let buckets = limiter.buckets.lock().await;
            buckets.get("zero").unwrap().tokens == 0
        };
        assert!(is_zero);

        // is_allowed should return false
        assert!(!limiter.is_allowed("zero", 10).await);
    }
}
