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
    pub async fn toggle_bookmark(&self, id: i64) -> Result<bool, sqlx::Error> {
        // Get current state
        let current: Option<i64> = sqlx::query_scalar("SELECT bookmarked FROM jobs WHERE id = ?")
            .bind(id)
            .fetch_optional(self.pool())
            .await?;

        let new_state = match current {
            Some(1) => 0,
            Some(0) => 1,
            None => return Err(sqlx::Error::RowNotFound),
            _ => 1,
        };

        sqlx::query("UPDATE jobs SET bookmarked = ? WHERE id = ?")
            .bind(new_state)
            .bind(id)
            .execute(self.pool())
            .await?;

        Ok(new_state == 1)
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
    pub async fn get_job_notes(&self, id: i64) -> Result<Option<String>, sqlx::Error> {
        let notes: Option<String> = sqlx::query_scalar("SELECT notes FROM jobs WHERE id = ?")
            .bind(id)
            .fetch_optional(self.pool())
            .await?
            .flatten();

        Ok(notes)
    }
}
