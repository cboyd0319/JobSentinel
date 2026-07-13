//! User interaction operations
//!
//! Methods for user actions like hiding, bookmarking, and adding notes to jobs.

use super::connection::Database;
use sqlx;

impl Database {
    /// Hide a job (user dismissal)
    pub async fn hide_job(&self, id: i64) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE jobs SET hidden = 1 WHERE id = ?")
            .bind(id)
            .execute(self.pool())
            .await?;

        Ok(())
    }

    /// Unhide a job (restore to visible)
    pub async fn unhide_job(&self, id: i64) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE jobs SET hidden = 0 WHERE id = ?")
            .bind(id)
            .execute(self.pool())
            .await?;

        Ok(())
    }

    /// Toggle bookmark status for a job
    ///
    /// OPTIMIZATION: Single query with RETURNING instead of read-then-write pattern.
    /// Eliminates race condition and reduces round-trips from 2 to 1.
    pub async fn toggle_bookmark(&self, id: i64) -> Result<bool, sqlx::Error> {
        let new_state: Option<i64> = sqlx::query_scalar(
            r#"
            UPDATE jobs
            SET bookmarked = CASE WHEN bookmarked = 1 THEN 0 ELSE 1 END
            WHERE id = ?
            RETURNING bookmarked
            "#,
        )
        .bind(id)
        .fetch_optional(self.pool())
        .await?;

        match new_state {
            Some(state) => Ok(state == 1),
            None => Err(sqlx::Error::RowNotFound),
        }
    }

    /// Set bookmark status for a job
    pub async fn set_bookmark(&self, id: i64, bookmarked: bool) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE jobs SET bookmarked = ? WHERE id = ?")
            .bind(if bookmarked { 1 } else { 0 })
            .bind(id)
            .execute(self.pool())
            .await?;

        Ok(())
    }

    /// Set notes for a job
    pub async fn set_job_notes(&self, id: i64, notes: Option<&str>) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE jobs SET notes = ? WHERE id = ?")
            .bind(notes)
            .bind(id)
            .execute(self.pool())
            .await?;

        Ok(())
    }

    /// Get notes for a job
    ///
    /// NOTE: Already optimized - selects only the notes column.
    pub async fn get_job_notes(&self, id: i64) -> Result<Option<String>, sqlx::Error> {
        let notes: Option<String> = sqlx::query_scalar("SELECT notes FROM jobs WHERE id = ?")
            .bind(id)
            .fetch_optional(self.pool())
            .await?
            .flatten();

        Ok(notes)
    }
}
