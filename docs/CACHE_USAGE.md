# Response Cache Usage Guide

This guide demonstrates how to use the response caching system in JobSentinel scrapers.

## Overview

The response cache is a simple in-memory cache designed to reduce redundant API calls during
development and testing. It uses `tokio::sync::RwLock` for thread-safe access and provides
hit/miss statistics.

## Basic Usage

### Using `get_with_cache()`

The simplest way to use caching is with `get_with_cache()`:

```rust
use crate::core::scrapers::http_client::get_with_cache;

async fn fetch_jobs() -> Result<Vec<Job>> {
    let url = "https://api.example.com/jobs";
    
    // Automatically checks cache before making request
    let body = get_with_cache(url).await?;
    
    // Parse the response
    let jobs: Vec<Job> = serde_json::from_str(&body)?;
    Ok(jobs)
}
```

### Using `get_with_retry_cached()`

For more control, use `get_with_retry_cached()` with a boolean flag:

```rust
use crate::core::scrapers::http_client::get_with_retry_cached;

async fn fetch_with_optional_cache(url: &str, use_cache: bool) -> Result<String> {
    // Enable/disable caching based on configuration
    let body = get_with_retry_cached(url, use_cache).await?;
    Ok(body)
}
```

### Direct Cache API

For complete control, use the cache functions directly:

```rust
use crate::core::scrapers::cache;

async fn custom_fetch(url: &str) -> Result<String> {
    // Check cache first
    if let Some(cached) = cache::get_cached(url).await {
        tracing::info!("Cache hit for: {}", url);
        return Ok(cached);
    }
    
    // Cache miss - fetch from network
    let response = reqwest::get(url).await?;
    let body = response.text().await?;
    
    // Store in cache
    cache::set_cached(url, body.clone()).await;
    
    Ok(body)
}
```

## Cache Management

### View Statistics

```rust
use crate::core::scrapers::cache;

async fn print_cache_stats() {
    let stats = cache::cache_stats().await;
    
    println!("Cache Statistics:");
    println!("  Entries: {}", stats.entries);
    println!("  Hits: {}", stats.hits);
    println!("  Misses: {}", stats.misses);
    println!("  Hit Rate: {:.2}%", stats.hit_rate());
}
```

### Clear Cache

```rust
use crate::core::scrapers::cache;

async fn reset_cache() {
    cache::clear_cache().await;
    tracing::info!("Cache cleared");
}
```

### Configure Cache Duration

```rust
use crate::core::scrapers::cache;
use std::time::Duration;

async fn configure_cache() {
    // Set cache to 10 minutes
    cache::set_cache_duration(Duration::from_secs(600)).await;
    
    // Or 1 hour
    cache::set_cache_duration(Duration::from_secs(3600)).await;
    
    // Default is 5 minutes (300 seconds)
}
```

## Integration Examples

### In a Scraper Implementation

```rust
use crate::core::scrapers::{http_client, JobScraper, ScraperResult};
use crate::core::db::Job;
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
        // Use cache during development, bypass in production
        let body = if self.use_cache {
            http_client::get_with_cache(&self.url).await?
        } else {
            let response = http_client::get_with_retry(&self.url).await?;
            response.text().await?
        };
        
        // Parse and return jobs...
        Ok(vec![])
    }
    
    fn name(&self) -> &'static str {
        "CachedScraper"
    }
}
```

### Development vs Production

```rust
use crate::core::scrapers::cache;

pub struct ScraperConfig {
    pub enable_cache: bool,
}

impl ScraperConfig {
    pub fn development() -> Self {
        Self { enable_cache: true }
    }
    
    pub fn production() -> Self {
        Self { enable_cache: false }
    }
}

async fn run_scraper(config: ScraperConfig) -> Result<()> {
    if config.enable_cache {
        tracing::info!("Cache enabled for development");
    } else {
        // Clear cache in production to ensure fresh data
        cache::clear_cache().await;
        tracing::info!("Cache disabled for production");
    }
    
    // Run scrapers...
    Ok(())
}
```

### Testing with Cache

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::scrapers::cache;
    
    #[tokio::test]
    async fn test_scraper_with_cache() {
        // Ensure clean slate
        cache::clear_cache().await;
        
        // First run - should miss cache
        let jobs1 = scrape_jobs().await.unwrap();
        let stats = cache::cache_stats().await;
        assert_eq!(stats.misses, 1);
        
        // Second run - should hit cache
        let jobs2 = scrape_jobs().await.unwrap();
        let stats = cache::cache_stats().await;
        assert_eq!(stats.hits, 1);
        
        // Results should be identical
        assert_eq!(jobs1.len(), jobs2.len());
    }
}
```

## Performance Benefits

The cache is most beneficial during:

1. **Development**: Reduces API calls while testing scrapers
2. **Testing**: Speeds up test suites by avoiding network requests
3. **Rate-Limited APIs**: Prevents hitting rate limits during rapid iterations
4. **Debugging**: Ensures consistent responses while debugging parsing logic

## Limitations

- **In-Memory Only**: Cache is lost on restart
- **No Persistence**: Not suitable as a production caching layer
- **Global State**: All scrapers share the same cache
- **Simple Expiration**: Only time-based expiration, no LRU or size limits

## Best Practices

1. **Clear Cache Between Major Changes**: Use `clear_cache()` when changing scraper logic
2. **Monitor Statistics**: Check hit/miss rates to verify cache effectiveness
3. **Adjust Duration**: Set shorter durations for frequently updated data sources
4. **Disable in Production**: Use environment variables to disable caching in production
5. **Test With and Without Cache**: Ensure scrapers work correctly in both modes

## Example: Complete Workflow

```rust
use crate::core::scrapers::{cache, http_client};
use std::time::Duration;

async fn scraping_workflow() -> anyhow::Result<()> {
    // 1. Configure cache for development
    cache::set_cache_duration(Duration::from_secs(600)).await; // 10 minutes
    
    // 2. Run scraper
    let jobs = fetch_all_jobs().await?;
    tracing::info!("Fetched {} jobs", jobs.len());
    
    // 3. Check statistics
    let stats = cache::cache_stats().await;
    tracing::info!(
        "Cache: {} entries, {}/{} hits/misses ({:.1}% hit rate)",
        stats.entries,
        stats.hits,
        stats.misses,
        stats.hit_rate()
    );
    
    // 4. Force fresh data if needed
    if needs_fresh_data() {
        cache::clear_cache().await;
        let fresh_jobs = fetch_all_jobs().await?;
        tracing::info!("Fetched {} fresh jobs", fresh_jobs.len());
    }
    
    Ok(())
}

async fn fetch_all_jobs() -> anyhow::Result<Vec<Job>> {
    let urls = vec![
        "https://api.example.com/jobs",
        "https://api.another.com/jobs",
    ];
    
    let mut all_jobs = Vec::new();
    
    for url in urls {
        let body = http_client::get_with_cache(url).await?;
        let jobs: Vec<Job> = serde_json::from_str(&body)?;
        all_jobs.extend(jobs);
    }
    
    Ok(all_jobs)
}

fn needs_fresh_data() -> bool {
    // Your logic here
    false
}
```

## Troubleshooting

### Tests Failing Due to Cache State

Run tests sequentially to avoid cache interference:

```bash
cargo test core::scrapers::cache -- --test-threads=1
```

### Cache Not Working

Check that you're using the cached functions:
- ✅ `get_with_cache(url)`
- ✅ `get_with_retry_cached(url, true)`
- ❌ `get_with_retry(url)` - bypasses cache

### Stale Data

Clear the cache to force fresh requests:

```rust
cache::clear_cache().await;
```

Or reduce the cache duration:

```rust
cache::set_cache_duration(Duration::from_secs(60)).await; // 1 minute
```
