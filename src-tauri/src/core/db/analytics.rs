//! Analytics and statistics operations
//!
//! Methods for retrieving database statistics and metrics.

use super::connection::Database;
use super::types::{GhostStatistics, Statistics};
use sqlx;

impl Database {
    /// Get statistics
    ///
    /// OPTIMIZATION: Batched into single query instead of 4 separate queries.
    /// Reduces round-trips and enables SQLite to optimize execution plan.
    pub async fn get_statistics(&self) -> Result<Statistics, sqlx::Error> {
        let row = sqlx::query(
            r#"
            SELECT
                COUNT(*) as total_jobs,
                SUM(CASE WHEN score >= 0.9 THEN 1 ELSE 0 END) as high_matches,
                AVG(CASE WHEN score IS NOT NULL THEN score END) as average_score,
                SUM(CASE WHEN DATE(created_at) = DATE('now') THEN 1 ELSE 0 END) as jobs_today
            FROM jobs
            "#,
        )
        .fetch_one(self.pool())
        .await?;

        use sqlx::Row;
        Ok(Statistics {
            total_jobs: row.try_get("total_jobs")?,
            high_matches: row.try_get("high_matches")?,
            average_score: row.try_get("average_score").unwrap_or(0.0),
            jobs_today: row.try_get("jobs_today")?,
        })
    }

    /// Count open jobs per company (for company behavior analysis)
    pub async fn count_company_open_jobs(&self, company: &str) -> Result<i64, sqlx::Error> {
        // OPTIMIZATION: Uses idx_jobs_company for fast lookup
        // WHERE clause reordered to use index efficiently (company first, then hidden)
        let count: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM jobs WHERE company = ? AND hidden = 0")
                .bind(company)
                .fetch_one(self.pool())
                .await?;

        Ok(count)
    }

    /// Get ghost detection statistics
    ///
    /// OPTIMIZATION: Batched 4 job queries into single query, repost count separate.
    /// Reduces round-trips from 5 to 2.
    pub async fn get_ghost_statistics(&self) -> Result<GhostStatistics, sqlx::Error> {
        // Batch ghost score stats into single query
        let row = sqlx::query(
            r#"
            SELECT
                SUM(CASE WHEN ghost_score IS NOT NULL THEN 1 ELSE 0 END) as total_analyzed,
                SUM(CASE WHEN ghost_score >= 0.5 THEN 1 ELSE 0 END) as likely_ghosts,
                SUM(CASE WHEN ghost_score >= 0.3 AND ghost_score < 0.5 THEN 1 ELSE 0 END) as warnings,
                AVG(CASE WHEN ghost_score IS NOT NULL THEN ghost_score END) as avg_ghost_score
            FROM jobs
            "#,
        )
        .fetch_one(self.pool())
        .await?;

        // Separate query for repost count (different table)
        let total_reposts: i64 =
            sqlx::query_scalar("SELECT COALESCE(SUM(repost_count), 0) FROM job_repost_history")
                .fetch_one(self.pool())
                .await?;

        use sqlx::Row;
        Ok(GhostStatistics {
            total_analyzed: row.try_get("total_analyzed")?,
            likely_ghosts: row.try_get("likely_ghosts")?,
            warnings: row.try_get("warnings")?,
            avg_ghost_score: row.try_get("avg_ghost_score").unwrap_or(0.0),
            total_reposts,
        })
    }
}
