//! Cache management commands
//!
//! Expose cache statistics and management endpoints to frontend

use crate::core::scoring::{clear_score_cache, score_cache_stats, ScoreCacheStats};

/// Get scoring cache statistics
///
/// Returns hit/miss counts, entry count, and hit rate
#[tauri::command]
pub async fn get_score_cache_stats() -> Result<ScoreCacheStats, ()> {
    Ok(score_cache_stats().await)
}

/// Clear all cached scores
///
/// Useful for testing or when forcing fresh scoring
#[tauri::command]
pub async fn clear_scoring_cache() -> Result<(), ()> {
    clear_score_cache().await;
    Ok(())
}

/// Get overall cache health
///
/// Returns statistics about cache performance
#[tauri::command]
pub async fn get_cache_health() -> Result<serde_json::Value, ()> {
    let score_stats = score_cache_stats().await;

    Ok(serde_json::json!({
        "score_cache": {
            "hits": score_stats.hits,
            "misses": score_stats.misses,
            "entries": score_stats.entries,
            "hit_rate": score_stats.hit_rate,
        },
        "status": "healthy",
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_get_score_cache_stats() {
        // Should not fail even with empty cache
        let result = get_score_cache_stats().await;
        assert!(result.is_ok());

        let stats = result.unwrap();
        assert!(stats.hit_rate >= 0.0 && stats.hit_rate <= 100.0);
    }

    #[tokio::test]
    async fn test_clear_scoring_cache() {
        let result = clear_scoring_cache().await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn test_get_cache_health() {
        let result = get_cache_health().await;
        assert!(result.is_ok());

        let health = result.unwrap();
        assert_eq!(health["status"], "healthy");
        assert!(health["score_cache"]["entries"].is_number());
    }
}
