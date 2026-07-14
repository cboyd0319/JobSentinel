//! Rate Limiting for Job Board Scrapers
//!
//! Implements token bucket rate limiting to prevent IP bans and respect
//! rate limits of job boards.

use std::collections::HashMap;
use std::sync::{Arc, LazyLock};
use std::time::{Duration, Instant};
use tokio::sync::Mutex;

static SHARED_RATE_LIMITER: LazyLock<RateLimiter> = LazyLock::new(RateLimiter::new);

/// Rate limiter using token bucket algorithm
#[derive(Debug, Clone)]
pub(crate) struct RateLimiter {
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
    pub(crate) fn new() -> Self {
        Self {
            buckets: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Return the process-wide limiter used by production scraper instances.
    #[must_use]
    pub(crate) fn shared() -> Self {
        SHARED_RATE_LIMITER.clone()
    }

    /// Wait until request is allowed for given scraper
    ///
    /// # Arguments
    /// * `scraper_name` - Name of the scraper (e.g., "linkedin", "indeed")
    /// * `max_requests_per_hour` - Maximum requests allowed per hour
    ///
    /// The scraper owner supplies a stable source identifier and an hourly
    /// request limit for each call.
    #[tracing::instrument(skip(self))]
    pub(crate) async fn wait(&self, scraper_name: &str, max_requests_per_hour: u32) {
        tracing::debug!("Acquiring rate limit token for scraper");

        loop {
            let wait_duration = {
                let mut buckets = self.buckets.lock().await;

                let bucket = buckets
                    .entry(scraper_name.to_string())
                    .or_insert_with(|| TokenBucket::new(max_requests_per_hour));

                match bucket.try_take_token() {
                    Ok(()) => return,
                    Err(wait_duration) => wait_duration,
                }
            };

            tokio::time::sleep(wait_duration).await;
        }
    }

    /// Check if request is allowed without waiting
    #[must_use]
    #[cfg(test)]
    pub(crate) async fn is_allowed(&self, scraper_name: &str, max_requests_per_hour: u32) -> bool {
        let mut buckets = self.buckets.lock().await;

        let bucket = buckets
            .entry(scraper_name.to_string())
            .or_insert_with(|| TokenBucket::new(max_requests_per_hour));

        bucket.refill();
        bucket.tokens > 0
    }

    /// Reset rate limiter for a scraper (useful for testing)
    #[cfg(test)]
    pub(crate) async fn reset(&self, scraper_name: &str) {
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
        let capacity = max_requests_per_hour.max(1);
        Self {
            capacity,
            tokens: capacity,
            last_refill: Instant::now(),
            refill_rate: capacity as f64 / 3600.0, // tokens per second
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

    /// Try to consume a token, or return how long the caller should wait.
    fn try_take_token(&mut self) -> Result<(), Duration> {
        self.refill();

        if self.tokens > 0 {
            self.tokens -= 1;
            tracing::debug!("Token consumed, {} tokens remaining", self.tokens);
            return Ok(());
        }

        let wait_secs = 1.0 / self.refill_rate;
        let wait_duration = Duration::from_secs_f64(wait_secs);

        tracing::warn!(
            "Rate limit exhausted, waiting {:?} for token refill (refill_rate: {}/sec)",
            wait_duration,
            self.refill_rate
        );

        Err(wait_duration)
    }
}

/// Scraper-specific rate limits (requests per hour)
pub(crate) mod limits {
    /// LinkedIn: 100 requests/hour (conservative to avoid detection)
    #[cfg(test)]
    pub(crate) const LINKEDIN: u32 = 100;

    /// Indeed: 500 requests/hour (more generous, has public API)
    pub(crate) const INDEED: u32 = 500;

    /// Greenhouse: 1000 requests/hour (official API)
    pub(crate) const GREENHOUSE: u32 = 1000;

    /// Lever: 1000 requests/hour (official API)
    pub(crate) const LEVER: u32 = 1000;

    /// JobsWithGPT: 10,000 requests/hour (MCP server)
    pub(crate) const JOBSWITHGPT: u32 = 10_000;

    /// Dice: 500 requests/hour (public job board)
    pub(crate) const DICE: u32 = 500;

    /// RemoteOK: 500 requests/hour (public API)
    pub(crate) const REMOTEOK: u32 = 500;

    /// Glassdoor: 200 requests/hour (conservative due to Cloudflare)
    pub(crate) const GLASSDOOR: u32 = 200;

    /// SimplyHired: 200 requests/hour (conservative due to Cloudflare)
    pub(crate) const SIMPLYHIRED: u32 = 200;

    /// USAJobs: 1000 requests/hour (official government API)
    pub(crate) const USAJOBS: u32 = 1000;

    /// WeWorkRemotely: 300 requests/hour (RSS feed)
    pub(crate) const WEWORKREMOTELY: u32 = 300;

    /// HN Hiring: 500 requests/hour (Algolia API)
    pub(crate) const HN_HIRING: u32 = 500;

    /// YC Startup: 300 requests/hour (job board)
    pub(crate) const YC_STARTUP: u32 = 300;

    /// BuiltIn: 300 requests/hour (job board)
    pub(crate) const BUILTIN: u32 = 300;
}

#[cfg(test)]
mod tests;
