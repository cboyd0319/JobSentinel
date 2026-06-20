# Response Cache Usage Guide

This guide documents the response cache used by scraper HTTP helpers.

## Purpose

The response cache is an in-memory helper for repeated scraper requests during a
single app or test process. It reduces redundant calls, keeps parser iterations
faster, and records hit/miss counts.

The cache is not durable storage. It is cleared when the process exits.

## APIs

Use the scraper HTTP client helpers instead of calling `reqwest` directly from
scraper code.

### `get_with_cache`

`get_with_cache(url)` checks the shared response cache first. On a cache miss it
uses the retrying HTTP client, reads the response body, stores successful
responses, and returns the body.

```rust
use crate::core::scrapers::http_client::get_with_cache;

async fn fetch_jobs() -> anyhow::Result<Vec<Job>> {
    let body = get_with_cache("https://api.example.com/jobs").await?;
    let jobs = serde_json::from_str(&body)?;
    Ok(jobs)
}
```

### `get_with_retry_cached`

`get_with_retry_cached(url, use_cache)` lets adapter code choose whether a
specific request should use the cache while keeping the retrying HTTP client in
both paths.

```rust
use crate::core::scrapers::http_client::get_with_retry_cached;

async fn fetch_jobs(url: &str, use_cache: bool) -> anyhow::Result<Vec<Job>> {
    let body = get_with_retry_cached(url, use_cache).await?;
    let jobs = serde_json::from_str(&body)?;
    Ok(jobs)
}
```

### Direct Cache API

Use `cache::get_cached` and `cache::set_cached` only when adapter code already
owns a retrying fetch path. Keep fetches routed through `get_with_retry` or
`send_with_retry`, and sanitize URL values before logging.

```rust
use crate::core::scrapers::{cache, http_client, read_text_with_limit};
use crate::core::url_security::sanitize_url_for_logging;

async fn custom_fetch(url: &str) -> anyhow::Result<String> {
    if let Some(cached) = cache::get_cached(url).await {
        tracing::debug!(url = %sanitize_url_for_logging(url), "Using cached response");
        return Ok(cached);
    }

    let response = http_client::get_with_retry(url).await?;
    let body = read_text_with_limit(response, url).await?;
    cache::set_cached(url, body.clone()).await;
    Ok(body)
}
```

## Cache Management

### View Statistics

```rust
use crate::core::scrapers::cache;

async fn log_cache_stats() {
    let stats = cache::cache_stats().await;

    tracing::info!(
        entries = stats.entries,
        hits = stats.hits,
        misses = stats.misses,
        hit_rate = stats.hit_rate(),
        "Scraper response cache stats"
    );
}
```

### Clear Cache

```rust
use crate::core::scrapers::cache;

async fn reset_cache() {
    cache::clear_cache().await;
}
```

### Configure Cache Duration

```rust
use crate::core::scrapers::cache;
use std::time::Duration;

async fn configure_cache() {
    cache::set_cache_duration(Duration::from_secs(600)).await;
}
```

The default duration is five minutes.

## Adapter Pattern

```rust
use crate::core::db::Job;
use crate::core::scrapers::{http_client, JobScraper, ScraperResult};
use async_trait::async_trait;

pub struct CachedScraper {
    url: String,
    use_cache: bool,
}

impl CachedScraper {
    pub fn new(url: String, use_cache: bool) -> Self {
        Self { url, use_cache }
    }
}

#[async_trait]
impl JobScraper for CachedScraper {
    async fn scrape(&self) -> ScraperResult {
        let body = http_client::get_with_retry_cached(&self.url, self.use_cache).await?;
        let jobs: Vec<Job> = serde_json::from_str(&body).unwrap_or_default();
        Ok(jobs)
    }

    fn name(&self) -> &'static str {
        "CachedScraper"
    }
}
```

Prefer source-specific freshness decisions over a blanket development versus
production switch. Some sources are safe to cache briefly; others need fresh
requests for each run. Keep rate limits and user-triggered refresh behavior in
mind when choosing `use_cache`.

## Testing

The cache is global process state. Cache tests should clear state before each
case and serialize access when several tests mutate cache statistics or cache
duration.

```rust
use crate::core::scrapers::cache;
use once_cell::sync::Lazy;
use tokio::sync::Mutex;

static CACHE_TEST_LOCK: Lazy<Mutex<()>> = Lazy::new(|| Mutex::new(()));

#[tokio::test]
async fn scraper_uses_cache_on_second_fetch() {
    let _guard = CACHE_TEST_LOCK.lock().await;
    cache::clear_cache().await;

    let jobs1 = scrape_jobs().await.unwrap();
    let jobs2 = scrape_jobs().await.unwrap();
    let stats = cache::cache_stats().await;

    assert_eq!(jobs1.len(), jobs2.len());
    assert_eq!(stats.hits, 1);
}
```

For the cache module itself, run:

```bash
cd src-tauri && cargo test cache --lib -- --test-threads=1
```

## Limitations

- In-memory only: cache entries are lost on restart.
- No persistence: do not use it as a durable job store.
- Shared state: all scraper cache helpers use the same process-level cache.
- Time-based expiration: there is no LRU eviction or size cap.
- Raw URL keys: URLs are used as cache keys internally; log output must stay
  sanitized.

## Checklist

- Use `get_with_cache(url)` for normal cached GET requests.
- Use `get_with_retry_cached(url, use_cache)` when cache use is source-specific.
- Use `get_with_retry(url)` when a request must bypass cache.
- Do not call `reqwest::get` directly from scraper adapters.
- Do not log raw scraper URLs, search queries, locations, credentials, query
  strings, or fragments.
- Clear cache state in tests that assert cache statistics.
