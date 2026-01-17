//! Analytics and statistics operations
//!
//! Methods for retrieving database statistics and metrics.

use super::connection::Database;
use super::types::{GhostStatistics, Statistics};
use sqlx;

impl Database {
    /// Get statistics
    pub async fn get_statistics(&self) -> Result<Statistics, sqlx::Error> {
        let total_jobs: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM jobs")
            .fetch_one(self.pool())
            .await?;

        let high_matches: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM jobs WHERE score >= 0.9")
            .fetch_one(self.pool())
            .await?;

        let average_score: Option<f64> =
            sqlx::query_scalar("SELECT AVG(score) FROM jobs WHERE score IS NOT NULL")
                .fetch_one(self.pool())
                .await?;

        let jobs_today: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM jobs WHERE DATE(created_at) = DATE('now')")
                .fetch_one(self.pool())
                .await?;

        Ok(Statistics {
            total_jobs,
            high_matches,
            average_score: average_score.unwrap_or(0.0),
            jobs_today,
        })
    }

    /// Count open jobs per company (for company behavior analysis)
    pub async fn count_company_open_jobs(&self, company: &str) -> Result<i64, sqlx::Error> {
        let count: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM jobs WHERE company = ? AND hidden = 0")
                .bind(company)
                .fetch_one(self.pool())
                .await?;

        Ok(count)
    }

    /// Get ghost detection statistics
    pub async fn get_ghost_statistics(&self) -> Result<GhostStatistics, sqlx::Error> {
        let total_analyzed: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM jobs WHERE ghost_score IS NOT NULL")
                .fetch_one(self.pool())
                .await?;

        let likely_ghosts: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM jobs WHERE ghost_score >= 0.5")
                .fetch_one(self.pool())
                .await?;

        let warnings: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM jobs WHERE ghost_score >= 0.3 AND ghost_score < 0.5",
        )
        .fetch_one(self.pool())
        .await?;

        let avg_ghost_score: Option<f64> =
            sqlx::query_scalar("SELECT AVG(ghost_score) FROM jobs WHERE ghost_score IS NOT NULL")
                .fetch_one(self.pool())
                .await?;

        let total_reposts: i64 =
            sqlx::query_scalar("SELECT COALESCE(SUM(repost_count), 0) FROM job_repost_history")
                .fetch_one(self.pool())
                .await?;

        Ok(GhostStatistics {
            total_analyzed,
            likely_ghosts,
            warnings,
            avg_ghost_score: avg_ghost_score.unwrap_or(0.0),
            total_reposts,
        })
    }
}
