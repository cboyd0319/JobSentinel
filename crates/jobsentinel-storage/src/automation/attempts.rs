//! Candidate-controlled application assistance.
//!
//! Users explicitly enable assistance, review every application before
//! submission, and remain responsible for the target site's terms. The app
//! stops at security challenges and does not bypass site protections.

use crate::sqlite_time::parse_sqlite_datetime;
use anyhow::Result;
use chrono::{DateTime, Utc};
use jobsentinel_domain::{ApplicationAttempt, AtsPlatform, AutomationStats, AutomationStatus};
use sqlx::{sqlite::SqliteRow, Row, SqlitePool};

/// Manages application automation lifecycle and database tracking.
///
/// Handles CRUD operations for automation attempts, status updates,
/// and aggregated statistics.
///
/// # Examples
///
/// ```no_run
/// # use jobsentinel_domain::AtsPlatform;
/// # use jobsentinel_storage::automation::AutomationManager;
/// # async fn example(db: sqlx::SqlitePool) -> anyhow::Result<()> {
/// let manager = AutomationManager::new(db);
///
/// // Create new automation attempt
/// let attempt_id = manager.create_attempt("job_abc123", AtsPlatform::Greenhouse).await?;
///
/// // User reviews and approves
/// manager.approve_attempt(attempt_id).await?;
///
/// // Mark as submitted after automation completes
/// manager.mark_submitted(attempt_id).await?;
/// # Ok(())
/// # }
/// ```
pub struct AutomationManager {
    db: SqlitePool,
}

fn parse_optional_sqlite_datetime(value: Option<String>) -> Option<DateTime<Utc>> {
    value.and_then(|date| parse_sqlite_datetime(&date).ok())
}

fn attempt_from_row(row: SqliteRow) -> Result<ApplicationAttempt> {
    let submitted_at = parse_optional_sqlite_datetime(row.try_get("submitted_at")?);
    let created_at = parse_sqlite_datetime(&row.try_get::<String, _>("created_at")?)?;

    Ok(ApplicationAttempt {
        id: row.try_get("id")?,
        job_hash: row.try_get("job_hash")?,
        application_id: row.try_get("application_id")?,
        status: AutomationStatus::from_str(row.try_get("status")?),
        ats_platform: AtsPlatform::from_str(row.try_get("ats_platform")?),
        error_message: row.try_get("error_message")?,
        screenshot_path: row.try_get("screenshot_path")?,
        confirmation_screenshot_path: row.try_get("confirmation_screenshot_path")?,
        automation_duration_ms: row.try_get("automation_duration_ms")?,
        user_approved: row.try_get::<i32, _>("user_approved")? != 0,
        submitted_at,
        created_at,
    })
}

impl AutomationManager {
    /// Create a new automation manager with database connection.
    pub fn new(db: SqlitePool) -> Self {
        Self { db }
    }

    /// Create a new automation attempt for a job.
    ///
    /// Initializes a new attempt with `Pending` status and the detected ATS platform.
    /// User approval is required before submission (default behavior).
    ///
    /// # Arguments
    ///
    /// * `job_hash` - Unique identifier for the job from the jobs table
    /// * `ats_platform` - Detected ATS platform (from `AtsDetector`)
    ///
    /// # Returns
    ///
    /// Database ID of the newly created attempt.
    ///
    /// # Examples
    ///
    /// ```no_run
    /// # use jobsentinel_domain::AtsPlatform;
    /// # use jobsentinel_storage::automation::AutomationManager;
    /// # async fn example(manager: &AutomationManager) -> anyhow::Result<()> {
    /// let attempt_id = manager.create_attempt("job_xyz", AtsPlatform::Lever).await?;
    /// println!("Created attempt {}", attempt_id);
    /// # Ok(())
    /// # }
    /// ```
    pub async fn create_attempt(&self, job_hash: &str, ats_platform: AtsPlatform) -> Result<i64> {
        let result = sqlx::query(
            r#"
            INSERT INTO application_attempts (job_hash, status, ats_platform)
            VALUES (?, ?, ?)
            "#,
        )
        .bind(job_hash)
        .bind(AutomationStatus::Pending.as_str())
        .bind(ats_platform.as_str())
        .execute(&self.db)
        .await?;

        Ok(result.last_insert_rowid())
    }

    /// Retrieve an automation attempt by its database ID.
    ///
    /// # Arguments
    ///
    /// * `attempt_id` - Database ID returned from `create_attempt`
    ///
    /// # Returns
    ///
    /// Full `ApplicationAttempt` record with all fields populated.
    ///
    /// # Errors
    ///
    /// Returns error if attempt_id doesn't exist or database query fails.
    pub async fn get_attempt(&self, attempt_id: i64) -> Result<ApplicationAttempt> {
        let row = sqlx::query(
            r#"
            SELECT id, job_hash, application_id, status, ats_platform,
                   error_message, screenshot_path, confirmation_screenshot_path,
                   automation_duration_ms, user_approved, submitted_at, created_at
            FROM application_attempts
            WHERE id = ?
            "#,
        )
        .bind(attempt_id)
        .fetch_one(&self.db)
        .await?;

        attempt_from_row(row)
    }

    /// Retrieve recent automation attempts for a job, newest first.
    pub async fn get_attempts_for_job(
        &self,
        job_hash: &str,
        limit: usize,
    ) -> Result<Vec<ApplicationAttempt>> {
        let rows = sqlx::query(
            r#"
            SELECT id, job_hash, application_id, status, ats_platform,
                   error_message, screenshot_path, confirmation_screenshot_path,
                   automation_duration_ms, user_approved, submitted_at, created_at
            FROM application_attempts
            WHERE job_hash = ?
            ORDER BY created_at DESC
            LIMIT ?
            "#,
        )
        .bind(job_hash)
        .bind(limit as i64)
        .fetch_all(&self.db)
        .await?;

        rows.into_iter().map(attempt_from_row).collect()
    }

    /// Update the status of an automation attempt.
    ///
    /// Use this to transition between lifecycle states and optionally record error messages.
    ///
    /// # Arguments
    ///
    /// * `attempt_id` - Database ID of the attempt
    /// * `status` - New status to set
    /// * `error_message` - Optional error message (typically for `Failed` status)
    ///
    /// # Examples
    ///
    /// ```no_run
    /// # use jobsentinel_domain::AutomationStatus;
    /// # use jobsentinel_storage::automation::AutomationManager;
    /// # async fn example(manager: &AutomationManager) -> anyhow::Result<()> {
    /// manager.update_status(
    ///     123,
    ///     AutomationStatus::Failed,
    ///     Some("CAPTCHA detected")
    /// ).await?;
    /// # Ok(())
    /// # }
    /// ```
    pub async fn update_status(
        &self,
        attempt_id: i64,
        status: AutomationStatus,
        error_message: Option<&str>,
    ) -> Result<()> {
        sqlx::query(
            r#"
            UPDATE application_attempts
            SET status = ?, error_message = ?
            WHERE id = ?
            "#,
        )
        .bind(status.as_str())
        .bind(error_message)
        .bind(attempt_id)
        .execute(&self.db)
        .await?;

        Ok(())
    }

    /// Mark an attempt as approved by the user (human-in-the-loop).
    ///
    /// Sets `user_approved = true` and transitions status to `Pending` so the
    /// automation can proceed. This enforces the human review requirement.
    ///
    /// # Arguments
    ///
    /// * `attempt_id` - Database ID of the attempt to approve
    ///
    /// # Examples
    ///
    /// ```no_run
    /// # use jobsentinel_storage::automation::AutomationManager;
    /// # async fn example(manager: &AutomationManager) -> anyhow::Result<()> {
    /// // User reviews filled application and approves it
    /// manager.approve_attempt(123).await?;
    /// # Ok(())
    /// # }
    /// ```
    pub async fn approve_attempt(&self, attempt_id: i64) -> Result<()> {
        sqlx::query(
            r#"
            UPDATE application_attempts
            SET user_approved = 1, status = ?
            WHERE id = ?
            "#,
        )
        .bind(AutomationStatus::Pending.as_str())
        .bind(attempt_id)
        .execute(&self.db)
        .await?;

        Ok(())
    }

    /// Mark an attempt as successfully submitted.
    ///
    /// Sets status to `Submitted` and records the submission timestamp.
    /// This is the final state for successful automation.
    ///
    /// # Arguments
    ///
    /// * `attempt_id` - Database ID of the attempt
    pub async fn mark_submitted(&self, attempt_id: i64) -> Result<()> {
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            r#"
            UPDATE application_attempts
            SET status = ?, submitted_at = ?
            WHERE id = ?
            "#,
        )
        .bind(AutomationStatus::Submitted.as_str())
        .bind(&now)
        .bind(attempt_id)
        .execute(&self.db)
        .await?;

        Ok(())
    }

    /// Retrieve pending automation attempts that are ready to process.
    ///
    /// Returns attempts with `Pending` status AND `user_approved = true`,
    /// ordered by creation time (FIFO queue).
    ///
    /// # Arguments
    ///
    /// * `limit` - Maximum number of attempts to return
    ///
    /// # Returns
    ///
    /// Vector of approved attempts ready for automation, oldest first.
    pub async fn get_pending_attempts(&self, limit: usize) -> Result<Vec<ApplicationAttempt>> {
        let rows = sqlx::query(
            r#"
            SELECT id, job_hash, application_id, status, ats_platform,
                   error_message, screenshot_path, confirmation_screenshot_path,
                   automation_duration_ms, user_approved, submitted_at, created_at
            FROM application_attempts
            WHERE status = ? AND user_approved = 1
            ORDER BY created_at ASC
            LIMIT ?
            "#,
        )
        .bind(AutomationStatus::Pending.as_str())
        .bind(limit as i64)
        .fetch_all(&self.db)
        .await?;

        rows.into_iter().map(attempt_from_row).collect()
    }

    /// Calculate aggregated automation statistics.
    ///
    /// Returns counts for all attempt statuses and calculates success rate.
    ///
    /// # Performance
    ///
    /// Optimized single query using CASE expressions instead of 4 separate queries.
    /// Reduces database round-trips from 4 to 1 and enables better query planning.
    ///
    /// # Returns
    ///
    /// Statistics including total attempts, submitted count, failed count,
    /// pending count, and overall success rate percentage.
    pub async fn get_stats(&self) -> Result<AutomationStats> {
        let row = sqlx::query(
            r#"
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                SUM(CASE WHEN status = 'pending' AND user_approved = 1 THEN 1 ELSE 0 END) as pending
            FROM application_attempts
            "#,
        )
        .fetch_one(&self.db)
        .await?;

        let total: i64 = row.try_get("total")?;
        let submitted: i64 = row.try_get("submitted")?;

        Ok(AutomationStats {
            total_attempts: total,
            submitted,
            failed: row.try_get("failed")?,
            pending: row.try_get("pending")?,
            success_rate: if total > 0 {
                (submitted as f64 / total as f64) * 100.0
            } else {
                0.0
            },
        })
    }
}

#[cfg(test)]
mod row_mapper_tests {
    use super::*;

    async fn attempt_row(database: &crate::Database, created_at: &str) -> SqliteRow {
        sqlx::query(
            r#"
            SELECT 7 AS id, 'job-1' AS job_hash, NULL AS application_id,
                   'pending' AS status, 'lever' AS ats_platform,
                   NULL AS error_message, NULL AS screenshot_path,
                   NULL AS confirmation_screenshot_path,
                   NULL AS automation_duration_ms, 1 AS user_approved,
                   NULL AS submitted_at, ? AS created_at
            "#,
        )
        .bind(created_at)
        .fetch_one(database.pool())
        .await
        .unwrap()
    }

    #[tokio::test]
    async fn attempt_mapper_preserves_nullable_submission_time() {
        let database = crate::Database::connect_memory().await.unwrap();
        let row = attempt_row(&database, "2026-01-15 12:34:56").await;

        let attempt = attempt_from_row(row).unwrap();

        assert_eq!(attempt.id, 7);
        assert!(attempt.user_approved);
        assert!(attempt.submitted_at.is_none());
        assert_eq!(attempt.created_at.to_rfc3339(), "2026-01-15T12:34:56+00:00");
    }

    #[tokio::test]
    async fn attempt_mapper_rejects_malformed_required_datetime() {
        let database = crate::Database::connect_memory().await.unwrap();
        let row = attempt_row(&database, "not-a-datetime").await;

        assert!(attempt_from_row(row).is_err());
    }
}

#[cfg(test)]
mod tests;
