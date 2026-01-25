//! Scoring Result Cache
//!
//! Caches expensive scoring computations (skills matching, resume analysis)
//! to improve dashboard and search performance.
//!
//! # Features
//! - LRU eviction (keeps most recently used scores)
//! - Per-resume invalidation (when resume changes)
//! - Thread-safe with async RwLock
//! - Memory-bounded (max 1000 entries)

use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, SystemTime};
use tokio::sync::RwLock;

use super::JobScore;

/// Default cache duration: 10 minutes
/// Scores are relatively stable unless resume changes
const DEFAULT_CACHE_DURATION_SECS: u64 = 600;

/// Maximum number of cached entries (prevents unbounded memory growth)
const MAX_CACHE_ENTRIES: usize = 1000;

/// Cache key: combines job_hash + resume_id (if applicable)
#[derive(Clone, Debug, Hash, Eq, PartialEq)]
pub struct ScoreCacheKey {
    pub job_hash: String,
    pub resume_id: Option<i64>,
}

impl ScoreCacheKey {
    #[must_use]
    pub fn new(job_hash: impl Into<String>, resume_id: Option<i64>) -> Self {
        Self {
            job_hash: job_hash.into(),
            resume_id,
        }
    }

    /// Create key for base scoring (no resume matching)
    #[must_use]
    pub fn base(job_hash: impl Into<String>) -> Self {
        Self {
            job_hash: job_hash.into(),
            resume_id: None,
        }
    }
}

/// Cached score entry with metadata
#[derive(Clone, Debug)]
struct CacheEntry {
    score: Arc<JobScore>,
    cached_at: SystemTime,
    last_accessed: SystemTime,
}

impl CacheEntry {
    fn new(score: JobScore) -> Self {
        let now = SystemTime::now();
        Self {
            score: Arc::new(score),
            cached_at: now,
            last_accessed: now,
        }
    }

    fn is_fresh(&self, duration: Duration) -> bool {
        SystemTime::now()
            .duration_since(self.cached_at)
            .map(|elapsed| elapsed < duration)
            .unwrap_or(false)
    }

    fn touch(&mut self) {
        self.last_accessed = SystemTime::now();
    }
}

/// Scoring cache with LRU eviction
struct ScoringCache {
    cache: HashMap<ScoreCacheKey, CacheEntry>,
    duration: Duration,
    hits: u64,
    misses: u64,
}

impl ScoringCache {
    #[must_use]
    fn new() -> Self {
        Self {
            cache: HashMap::with_capacity(MAX_CACHE_ENTRIES),
            duration: Duration::from_secs(DEFAULT_CACHE_DURATION_SECS),
            hits: 0,
            misses: 0,
        }
    }

    /// Get cached score if it exists and is fresh
    fn get(&mut self, key: &ScoreCacheKey) -> Option<Arc<JobScore>> {
        if let Some(entry) = self.cache.get_mut(key) {
            if entry.is_fresh(self.duration) {
                entry.touch();
                self.hits += 1;
                tracing::debug!("Score cache HIT for job_hash={}", key.job_hash);
                return Some(Arc::clone(&entry.score));
            } else {
                // Entry expired, remove it
                tracing::debug!("Score cache entry EXPIRED for job_hash={}", key.job_hash);
                self.cache.remove(key);
            }
        }

        self.misses += 1;
        tracing::debug!("Score cache MISS for job_hash={}", key.job_hash);
        None
    }

    /// Store score in cache, evicting LRU entries if needed
    fn set(&mut self, key: ScoreCacheKey, score: JobScore) {
        // Evict if at capacity - remove least recently accessed
        if self.cache.len() >= MAX_CACHE_ENTRIES {
            if let Some(lru_key) = self.find_lru_key() {
                tracing::debug!("Evicting LRU entry: job_hash={}", lru_key.job_hash);
                self.cache.remove(&lru_key);
            }
        }

        tracing::debug!("Caching score for job_hash={}", key.job_hash);
        self.cache.insert(key, CacheEntry::new(score));
    }

    /// Find the least recently accessed key
    fn find_lru_key(&self) -> Option<ScoreCacheKey> {
        self.cache
            .iter()
            .min_by_key(|(_, entry)| entry.last_accessed)
            .map(|(key, _)| key.clone())
    }

    /// Invalidate all scores for a specific resume
    fn invalidate_resume(&mut self, resume_id: i64) {
        let to_remove: Vec<_> = self
            .cache
            .keys()
            .filter(|k| k.resume_id == Some(resume_id))
            .cloned()
            .collect();

        for key in to_remove {
            tracing::debug!(
                "Invalidating cached score for job_hash={} (resume_id={})",
                key.job_hash,
                resume_id
            );
            self.cache.remove(&key);
        }
    }

    /// Invalidate a specific job's scores
    fn invalidate_job(&mut self, job_hash: &str) {
        let to_remove: Vec<_> = self
            .cache
            .keys()
            .filter(|k| k.job_hash == job_hash)
            .cloned()
            .collect();

        for key in to_remove {
            tracing::debug!("Invalidating cached score for job_hash={}", job_hash);
            self.cache.remove(&key);
        }
    }

    /// Clear all cached entries
    fn clear(&mut self) {
        let count = self.cache.len();
        self.cache.clear();
        self.hits = 0;
        self.misses = 0;
        tracing::info!("Cleared {} cached scores and reset stats", count);
    }

    /// Get cache statistics
    #[must_use]
    fn stats(&self) -> ScoreCacheStats {
        ScoreCacheStats {
            hits: self.hits,
            misses: self.misses,
            entries: self.cache.len(),
            hit_rate: self.hit_rate(),
        }
    }

    #[must_use]
    fn hit_rate(&self) -> f64 {
        let total = self.hits + self.misses;
        if total == 0 {
            0.0
        } else {
            (self.hits as f64 / total as f64) * 100.0
        }
    }
}

/// Cache statistics
#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
pub struct ScoreCacheStats {
    pub hits: u64,
    pub misses: u64,
    pub entries: usize,
    pub hit_rate: f64,
}

/// Global cache instance
static CACHE: Lazy<RwLock<ScoringCache>> = Lazy::new(|| RwLock::new(ScoringCache::new()));

/// Get cached score if it exists and is fresh
pub async fn get_cached_score(key: &ScoreCacheKey) -> Option<Arc<JobScore>> {
    let mut cache = CACHE.write().await;
    cache.get(key)
}

/// Store score in cache
pub async fn set_cached_score(key: ScoreCacheKey, score: JobScore) {
    let mut cache = CACHE.write().await;
    cache.set(key, score);
}

/// Invalidate all scores for a specific resume
/// Call this when resume is updated
pub async fn invalidate_resume(resume_id: i64) {
    let mut cache = CACHE.write().await;
    cache.invalidate_resume(resume_id);
    tracing::info!("Invalidated all cached scores for resume_id={}", resume_id);
}

/// Invalidate all scores for a specific job
/// Call this when job is updated (e.g., description changed)
pub async fn invalidate_job(job_hash: &str) {
    let mut cache = CACHE.write().await;
    cache.invalidate_job(job_hash);
}

/// Clear all cached scores
pub async fn clear_score_cache() {
    let mut cache = CACHE.write().await;
    cache.clear();
}

/// Get cache statistics
pub async fn score_cache_stats() -> ScoreCacheStats {
    let cache = CACHE.read().await;
    cache.stats()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_cache_miss() {
        clear_score_cache().await;

        let key = ScoreCacheKey::base("test_job_1");
        let result = get_cached_score(&key).await;
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn test_cache_hit() {
        clear_score_cache().await;

        let key = ScoreCacheKey::base("test_job_2");
        let score = JobScore {
            total: 0.85,
            breakdown: crate::core::scoring::ScoreBreakdown {
                skills: 0.4,
                salary: 0.2,
                location: 0.15,
                company: 0.05,
                recency: 0.05,
            },
            reasons: vec!["High match".to_string()],
        };

        set_cached_score(key.clone(), score.clone()).await;

        let cached = get_cached_score(&key).await;
        assert!(cached.is_some());
        assert!((cached.unwrap().total - score.total).abs() < 0.001);

        let stats = score_cache_stats().await;
        assert_eq!(stats.hits, 1);
    }

    #[tokio::test]
    async fn test_invalidate_resume() {
        clear_score_cache().await;

        let resume_id = 123;
        let key = ScoreCacheKey::new("test_job_3", Some(resume_id));
        let score = JobScore {
            total: 0.75,
            breakdown: crate::core::scoring::ScoreBreakdown {
                skills: 0.3,
                salary: 0.2,
                location: 0.15,
                company: 0.05,
                recency: 0.05,
            },
            reasons: vec!["Match".to_string()],
        };

        set_cached_score(key.clone(), score).await;
        assert!(get_cached_score(&key).await.is_some());

        invalidate_resume(resume_id).await;
        assert!(get_cached_score(&key).await.is_none());
    }

    #[tokio::test]
    async fn test_invalidate_job() {
        clear_score_cache().await;

        let job_hash = "test_job_4";
        let key1 = ScoreCacheKey::base(job_hash);
        let key2 = ScoreCacheKey::new(job_hash, Some(456));

        let score = JobScore {
            total: 0.65,
            breakdown: crate::core::scoring::ScoreBreakdown {
                skills: 0.25,
                salary: 0.2,
                location: 0.1,
                company: 0.05,
                recency: 0.05,
            },
            reasons: vec!["Partial match".to_string()],
        };

        set_cached_score(key1.clone(), score.clone()).await;
        set_cached_score(key2.clone(), score).await;

        assert!(get_cached_score(&key1).await.is_some());
        assert!(get_cached_score(&key2).await.is_some());

        invalidate_job(job_hash).await;

        assert!(get_cached_score(&key1).await.is_none());
        assert!(get_cached_score(&key2).await.is_none());
    }
}
