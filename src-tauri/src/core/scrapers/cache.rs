//! Response Cache for HTTP Requests
//!
//! Simple in-memory cache to reduce redundant API calls during development and testing.
//! Thread-safe implementation using tokio::sync::RwLock for async context.
//!
//! # Features
//! - Configurable cache duration (default: 5 minutes)
//! - Thread-safe with minimal lock contention
//! - Hit/miss statistics tracking
//! - Automatic expiration on read

use std::collections::HashMap;
use std::time::{Duration, SystemTime};
use tokio::sync::RwLock;
use once_cell::sync::Lazy;

/// Default cache duration: 5 minutes
const DEFAULT_CACHE_DURATION_SECS: u64 = 300;

/// Cached response entry with timestamp
#[derive(Clone, Debug)]
struct CacheEntry {
    body: String,
    cached_at: SystemTime,
}

impl CacheEntry {
    /// Create a new cache entry with current timestamp
    fn new(body: String) -> Self {
        Self {
            body,
            cached_at: SystemTime::now(),
        }
    }
    
    /// Check if this entry is still fresh based on the given duration
    fn is_fresh(&self, duration: Duration) -> bool {
        SystemTime::now()
            .duration_since(self.cached_at)
            .map(|elapsed| elapsed < duration)
            .unwrap_or(false)
    }
}

/// Cache statistics for monitoring
#[derive(Clone, Debug, Default)]
pub struct CacheStats {
    pub hits: u64,
    pub misses: u64,
    pub entries: usize,
}

impl CacheStats {
    /// Calculate hit rate as a percentage
    pub fn hit_rate(&self) -> f64 {
        let total = self.hits + self.misses;
        if total == 0 {
            0.0
        } else {
            (self.hits as f64 / total as f64) * 100.0
        }
    }
}

/// Global response cache instance
struct ResponseCache {
    cache: HashMap<String, CacheEntry>,
    duration: Duration,
    hits: u64,
    misses: u64,
}

impl ResponseCache {
    fn new() -> Self {
        Self {
            cache: HashMap::new(),
            duration: Duration::from_secs(DEFAULT_CACHE_DURATION_SECS),
            hits: 0,
            misses: 0,
        }
    }
    
    /// Get cached response if it exists and is fresh
    fn get(&mut self, url: &str) -> Option<String> {
        if let Some(entry) = self.cache.get(url) {
            if entry.is_fresh(self.duration) {
                self.hits += 1;
                tracing::debug!("Cache HIT for URL: {}", url);
                return Some(entry.body.clone());
            } else {
                // Entry expired, remove it
                tracing::debug!("Cache entry EXPIRED for URL: {}", url);
                self.cache.remove(url);
            }
        }
        
        self.misses += 1;
        tracing::debug!("Cache MISS for URL: {}", url);
        None
    }
    
    /// Store response in cache
    fn set(&mut self, url: String, body: String) {
        self.cache.insert(url.clone(), CacheEntry::new(body));
        tracing::debug!("Cached response for URL: {} (total entries: {})", url, self.cache.len());
    }
    
    /// Clear all cached entries
    fn clear(&mut self) {
        let count = self.cache.len();
        self.cache.clear();
        self.hits = 0;
        self.misses = 0;
        tracing::info!("Cleared {} cached entries and reset stats", count);
    }
    
    /// Get cache statistics
    fn stats(&self) -> CacheStats {
        CacheStats {
            hits: self.hits,
            misses: self.misses,
            entries: self.cache.len(),
        }
    }
    
    /// Set cache duration
    fn set_duration(&mut self, duration: Duration) {
        self.duration = duration;
        tracing::info!("Cache duration set to {:?}", duration);
    }
}

/// Global cache instance with lazy initialization
static CACHE: Lazy<RwLock<ResponseCache>> = Lazy::new(|| RwLock::new(ResponseCache::new()));

/// Get cached response if it exists and is fresh
///
/// # Arguments
///
/// * `url` - The URL to check in cache
///
/// # Returns
///
/// `Some(String)` with the cached response body if found and fresh, `None` otherwise
///
/// # Example
///
/// ```ignore
/// if let Some(cached) = get_cached("https://api.example.com/jobs").await {
///     println!("Using cached response");
/// }
/// ```
pub async fn get_cached(url: &str) -> Option<String> {
    let mut cache = CACHE.write().await;
    cache.get(url)
}

/// Store response in cache with current timestamp
///
/// # Arguments
///
/// * `url` - The URL key for this cache entry
/// * `body` - The response body to cache
///
/// # Example
///
/// ```ignore
/// let response = client.get(url).send().await?.text().await?;
/// set_cached(url, response.clone()).await;
/// ```
pub async fn set_cached(url: &str, body: String) {
    let mut cache = CACHE.write().await;
    cache.set(url.to_string(), body);
}

/// Clear all cached entries and reset statistics
///
/// Useful for testing or when you want to ensure fresh data
///
/// # Example
///
/// ```ignore
/// clear_cache().await;
/// println!("Cache cleared");
/// ```
pub async fn clear_cache() {
    let mut cache = CACHE.write().await;
    cache.clear();
}

/// Get cache statistics including hit/miss counts and entry count
///
/// # Returns
///
/// `CacheStats` with current statistics
///
/// # Example
///
/// ```ignore
/// let stats = cache_stats().await;
/// println!("Hit rate: {:.2}%", stats.hit_rate());
/// println!("Entries: {}", stats.entries);
/// ```
pub async fn cache_stats() -> CacheStats {
    let cache = CACHE.read().await;
    cache.stats()
}

/// Set cache duration
///
/// Changes how long responses are considered fresh.
/// Does not affect existing cached entries.
///
/// # Arguments
///
/// * `duration` - New cache duration
///
/// # Example
///
/// ```ignore
/// // Set cache to 10 minutes
/// set_cache_duration(Duration::from_secs(600)).await;
/// ```
pub async fn set_cache_duration(duration: Duration) {
    let mut cache = CACHE.write().await;
    cache.set_duration(duration);
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::time::sleep;

    #[tokio::test]
    async fn test_cache_miss() {
        clear_cache().await;
        
        let result = get_cached("https://example.com/test1").await;
        assert!(result.is_none());
        
        let stats = cache_stats().await;
        assert_eq!(stats.misses, 1);
        assert_eq!(stats.hits, 0);
    }

    #[tokio::test]
    async fn test_cache_hit() {
        clear_cache().await;
        
        let url = "https://example.com/test2";
        let body = "test response".to_string();
        
        // Cache the response
        set_cached(url, body.clone()).await;
        
        // Retrieve it
        let result = get_cached(url).await;
        assert_eq!(result, Some(body));
        
        let stats = cache_stats().await;
        assert_eq!(stats.hits, 1);
        assert_eq!(stats.entries, 1);
    }

    #[tokio::test]
    async fn test_cache_expiration() {
        clear_cache().await;
        
        // Set very short cache duration
        set_cache_duration(Duration::from_millis(100)).await;
        
        let url = "https://example.com/test3";
        let body = "test response".to_string();
        
        // Cache the response
        set_cached(url, body).await;
        
        // Should hit immediately
        assert!(get_cached(url).await.is_some());
        
        // Wait for expiration
        sleep(Duration::from_millis(150)).await;
        
        // Should miss now
        assert!(get_cached(url).await.is_none());
        
        // Reset to default duration for other tests
        set_cache_duration(Duration::from_secs(DEFAULT_CACHE_DURATION_SECS)).await;
    }

    #[tokio::test]
    async fn test_clear_cache() {
        clear_cache().await;
        
        // Add multiple entries
        set_cached("https://example.com/test4", "body1".to_string()).await;
        set_cached("https://example.com/test5", "body2".to_string()).await;
        set_cached("https://example.com/test6", "body3".to_string()).await;
        
        let stats = cache_stats().await;
        assert_eq!(stats.entries, 3);
        
        // Clear cache
        clear_cache().await;
        
        let stats = cache_stats().await;
        assert_eq!(stats.entries, 0);
        assert_eq!(stats.hits, 0);
        assert_eq!(stats.misses, 0);
    }

    #[tokio::test]
    async fn test_cache_stats_hit_rate() {
        clear_cache().await;
        
        let url = "https://example.com/test7";
        set_cached(url, "body".to_string()).await;
        
        // 3 hits
        get_cached(url).await;
        get_cached(url).await;
        get_cached(url).await;
        
        // 1 miss
        get_cached("https://example.com/notcached").await;
        
        let stats = cache_stats().await;
        assert_eq!(stats.hits, 3);
        assert_eq!(stats.misses, 1);
        assert_eq!(stats.hit_rate(), 75.0);
    }

    #[tokio::test]
    async fn test_cache_overwrite() {
        clear_cache().await;
        
        let url = "https://example.com/test8";
        
        // Cache first value
        set_cached(url, "first".to_string()).await;
        assert_eq!(get_cached(url).await, Some("first".to_string()));
        
        // Overwrite with second value
        set_cached(url, "second".to_string()).await;
        assert_eq!(get_cached(url).await, Some("second".to_string()));
    }

    #[tokio::test]
    async fn test_multiple_urls() {
        clear_cache().await;
        
        let url1 = "https://example.com/test9";
        let url2 = "https://example.com/test10";
        
        set_cached(url1, "body1".to_string()).await;
        set_cached(url2, "body2".to_string()).await;
        
        assert_eq!(get_cached(url1).await, Some("body1".to_string()));
        assert_eq!(get_cached(url2).await, Some("body2".to_string()));
        
        let stats = cache_stats().await;
        assert_eq!(stats.entries, 2);
    }

    #[test]
    fn test_cache_entry_creation() {
        let body = "test".to_string();
        let entry = CacheEntry::new(body.clone());
        assert_eq!(entry.body, body);
        assert!(entry.is_fresh(Duration::from_secs(10)));
    }

    #[test]
    fn test_cache_stats_zero_hit_rate() {
        let stats = CacheStats::default();
        assert_eq!(stats.hit_rate(), 0.0);
    }

    #[test]
    fn test_cache_stats_perfect_hit_rate() {
        let stats = CacheStats {
            hits: 10,
            misses: 0,
            entries: 5,
        };
        assert_eq!(stats.hit_rate(), 100.0);
    }

    #[test]
    fn test_cache_stats_calculation() {
        let stats = CacheStats {
            hits: 7,
            misses: 3,
            entries: 4,
        };
        assert_eq!(stats.hit_rate(), 70.0);
    }
}
