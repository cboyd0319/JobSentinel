//! Ghost job detection database operations
//!
//! Methods for tracking and analyzing ghost/fake job postings.

use super::connection::Database;
use sqlx;

impl Database {
    /// Update ghost analysis for a job
    pub async fn update_ghost_analysis(
        &self,
        job_id: i64,
        ghost_score: f64,
        ghost_reasons: &str,
    ) -> Result<(), sqlx::Error> {
        sqlx::query(
            "UPDATE jobs SET ghost_score = ?, ghost_reasons = ?, updated_at = datetime('now') WHERE id = ?",
        )
        .bind(ghost_score)
        .bind(ghost_reasons)
        .bind(job_id)
        .execute(self.pool())
        .await?;
        Ok(())
    }

    /// Track job repost (upsert into job_repost_history)
    /// Returns the current repost count for this company+title+source combo
    pub async fn track_repost(
        &self,
        company: &str,
        title: &str,
        source: &str,
        job_hash: &str,
    ) -> Result<i64, sqlx::Error> {
        // Try to update existing entry, otherwise insert
        let result: i64 = sqlx::query_scalar(
            r#"
            INSERT INTO job_repost_history (job_hash, company, title, source, first_seen, last_seen, repost_count)
            VALUES (?, ?, ?, ?, datetime('now'), datetime('now'), 1)
            ON CONFLICT(company, title, source) DO UPDATE SET
                job_hash = excluded.job_hash,
                last_seen = datetime('now'),
                repost_count = repost_count + 1
            RETURNING repost_count
            "#,
        )
        .bind(job_hash)
        .bind(company)
        .bind(title)
        .bind(source)
        .fetch_one(self.pool())
        .await?;

        Ok(result)
    }

    /// Get repost count for a job (company+title+source combination)
    pub async fn get_repost_count(
        &self,
        company: &str,
        title: &str,
        source: &str,
    ) -> Result<i64, sqlx::Error> {
        let count: Option<i64> = sqlx::query_scalar(
            "SELECT repost_count FROM job_repost_history WHERE company = ? AND title = ? AND source = ?",
        )
        .bind(company)
        .bind(title)
        .bind(source)
        .fetch_optional(self.pool())
        .await?;

        Ok(count.unwrap_or(0))
    }

    /// Mark a job as real (user confirms it's not a ghost job)
    pub async fn mark_job_as_real(&self, job_id: i64) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            INSERT INTO ghost_feedback (job_id, user_verdict)
            VALUES (?, 'real')
            ON CONFLICT(job_id) DO UPDATE SET
                user_verdict = 'real',
                created_at = CURRENT_TIMESTAMP
            "#,
        )
        .bind(job_id)
        .execute(self.pool())
        .await?;
        Ok(())
    }

    /// Mark a job as ghost (user confirms it's a fake/ghost job)
    pub async fn mark_job_as_ghost(&self, job_id: i64) -> Result<(), sqlx::Error> {
        sqlx::query(
            r#"
            INSERT INTO ghost_feedback (job_id, user_verdict)
            VALUES (?, 'ghost')
            ON CONFLICT(job_id) DO UPDATE SET
                user_verdict = 'ghost',
                created_at = CURRENT_TIMESTAMP
            "#,
        )
        .bind(job_id)
        .execute(self.pool())
        .await?;
        Ok(())
    }

    /// Get user's verdict for a job (None if no feedback given)
    pub async fn get_ghost_feedback(&self, job_id: i64) -> Result<Option<String>, sqlx::Error> {
        let verdict: Option<String> = sqlx::query_scalar(
            "SELECT user_verdict FROM ghost_feedback WHERE job_id = ?",
        )
        .bind(job_id)
        .fetch_optional(self.pool())
        .await?;

        Ok(verdict)
    }

    /// Clear user feedback for a job
    pub async fn clear_ghost_feedback(&self, job_id: i64) -> Result<(), sqlx::Error> {
        sqlx::query("DELETE FROM ghost_feedback WHERE job_id = ?")
            .bind(job_id)
            .execute(self.pool())
            .await?;
        Ok(())
    }
}
