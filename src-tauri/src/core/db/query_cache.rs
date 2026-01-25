//! Query caching and performance optimization
//!
//! Provides prepared statement caching and query performance monitoring
//! for hot-path database operations.

use sqlx::sqlite::SqlitePool;
use std::sync::Arc;
use tokio::sync::RwLock;

/// Cached prepared statements for hot-path queries
///
/// SQLx already caches prepared statements internally, but this provides
/// explicit control over hot-path queries and allows for performance monitoring.
#[derive(Debug)]
pub struct QueryCache {
    pool: Arc<SqlitePool>,
    // Query execution metrics
    metrics: Arc<RwLock<QueryMetrics>>,
}

#[derive(Debug, Default)]
struct QueryMetrics {
    total_queries: u64,
    cache_hits: u64,
    cache_misses: u64,
}

impl QueryCache {
    /// Create a new query cache
    pub fn new(pool: SqlitePool) -> Self {
        Self {
            pool: Arc::new(pool),
            metrics: Arc::new(RwLock::new(QueryMetrics::default())),
        }
    }

    /// Get query execution metrics
    pub async fn metrics(&self) -> (u64, u64, u64) {
        let m = self.metrics.read().await;
        (m.total_queries, m.cache_hits, m.cache_misses)
    }

    /// Reset metrics
    pub async fn reset_metrics(&self) {
        let mut m = self.metrics.write().await;
        *m = QueryMetrics::default();
    }
}

/// Query builder hints for SQLite query planner
///
/// These hints help SQLite choose optimal query plans. Use sparingly and only
/// when you've verified with EXPLAIN QUERY PLAN that the hint improves performance.
#[allow(dead_code)]
pub struct QueryHints;

impl QueryHints {
    /// Hint to use a specific index
    ///
    /// Example: `INDEXED BY idx_jobs_hidden_score_created`
    ///
    /// WARNING: Only use when you've verified the index improves performance.
    /// SQLite's query planner is usually smarter than manual hints.
    ///
    /// # Usage
    /// ```rust
    /// let hint = QueryHints::indexed_by("idx_jobs_hidden_score_created");
    /// let query = format!("SELECT * FROM jobs {} WHERE hidden = 0", hint);
    /// ```
    pub fn indexed_by(index_name: &str) -> String {
        format!("INDEXED BY {}", index_name)
    }

    /// Hint to NOT use any index (force table scan)
    ///
    /// Example: `NOT INDEXED`
    ///
    /// Useful when you know the table is small or the index would be slower.
    pub const NOT_INDEXED: &'static str = "NOT INDEXED";
}

/// Query performance analysis helpers
pub struct QueryAnalyzer;

impl QueryAnalyzer {
    /// Analyze a query's execution plan
    ///
    /// Returns the query plan as a string for logging/debugging.
    /// Useful for understanding which indexes are being used.
    ///
    /// Example:
    /// ```rust
    /// let plan = QueryAnalyzer::explain_query_plan(
    ///     pool,
    ///     "SELECT * FROM jobs WHERE hidden = 0 ORDER BY score DESC LIMIT 10"
    /// ).await?;
    /// println!("Query plan: {}", plan);
    /// ```
    pub async fn explain_query_plan(
        pool: &SqlitePool,
        query: &str,
    ) -> Result<String, sqlx::Error> {
        let explain_query = format!("EXPLAIN QUERY PLAN {}", query);
        let rows: Vec<(i64, i64, i64, String)> =
            sqlx::query_as(&explain_query).fetch_all(pool).await?;

        let plan = rows
            .into_iter()
            .map(|(_, _, _, detail)| detail)
            .collect::<Vec<_>>()
            .join("\n");

        Ok(plan)
    }

    /// Check if a query uses an index
    ///
    /// Returns true if the query plan includes "USING INDEX".
    /// This is a quick check to ensure queries are properly indexed.
    pub async fn uses_index(pool: &SqlitePool, query: &str) -> Result<bool, sqlx::Error> {
        let plan = Self::explain_query_plan(pool, query).await?;
        Ok(plan.contains("USING INDEX") || plan.contains("USING COVERING INDEX"))
    }

    /// Benchmark a query
    ///
    /// Runs the query multiple times and returns average execution time in milliseconds.
    /// Useful for performance testing during development.
    #[cfg(test)]
    pub async fn benchmark_query(
        pool: &SqlitePool,
        query: &str,
        iterations: usize,
    ) -> Result<f64, sqlx::Error> {
        use std::time::Instant;

        let mut total_ms = 0.0;
        for _ in 0..iterations {
            let start = Instant::now();
            sqlx::query(query).fetch_all(pool).await?;
            total_ms += start.elapsed().as_secs_f64() * 1000.0;
        }

        Ok(total_ms / iterations as f64)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_query_analyzer() {
        // Test with in-memory database
        let pool = SqlitePool::connect("sqlite::memory:").await.unwrap();

        // Create a simple test table
        sqlx::query("CREATE TABLE test (id INTEGER PRIMARY KEY, value TEXT)")
            .execute(&pool)
            .await
            .unwrap();

        sqlx::query("CREATE INDEX idx_test_value ON test(value)")
            .execute(&pool)
            .await
            .unwrap();

        // Test explain query plan
        let plan = QueryAnalyzer::explain_query_plan(&pool, "SELECT * FROM test WHERE value = 'x'")
            .await
            .unwrap();

        println!("Query plan: {}", plan);
        assert!(plan.contains("SEARCH"));

        // Test index usage detection
        let uses_idx =
            QueryAnalyzer::uses_index(&pool, "SELECT * FROM test WHERE value = 'x'")
                .await
                .unwrap();
        assert!(uses_idx, "Query should use index");
    }
}
