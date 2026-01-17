//! Reminder management for applications

use super::tracker::ApplicationTracker;
use super::types::*;
use anyhow::Result;
use chrono::{DateTime, Utc};

impl ApplicationTracker {
    /// Set a reminder for an application
    pub async fn set_reminder(
        &self,
        application_id: i64,
        reminder_type: &str,
        reminder_time: DateTime<Utc>,
        message: &str,
    ) -> Result<()> {
        let reminder_time_str = reminder_time.to_rfc3339();

        sqlx::query!(
            "INSERT INTO application_reminders (application_id, reminder_type, reminder_time, message)
             VALUES (?, ?, ?, ?)",
            application_id,
            reminder_type,
            reminder_time_str,
            message
        )
        .execute(&self.db)
        .await?;

        // Log reminder set event
        self.log_event(
            application_id,
            "reminder_set",
            serde_json::json!({
                "type": reminder_type,
                "time": reminder_time_str,
                "message": message
            }),
        )
        .await?;

        Ok(())
    }

    /// Get pending reminders
    pub async fn get_pending_reminders(&self) -> Result<Vec<PendingReminder>> {
        let now = Utc::now().to_rfc3339();

        let reminders = sqlx::query_as!(
            PendingReminder,
            r#"
            SELECT
                r.id as "id!: i64",
                r.application_id as "application_id!: i64",
                r.reminder_type,
                r.reminder_time,
                r.message,
                a.job_hash,
                j.title as job_title,
                j.company
            FROM application_reminders r
            JOIN applications a ON r.application_id = a.id
            JOIN jobs j ON a.job_hash = j.hash
            WHERE r.completed = 0 AND r.reminder_time <= ?
            ORDER BY r.reminder_time ASC
            "#,
            now
        )
        .fetch_all(&self.db)
        .await?;

        Ok(reminders)
    }

    /// Mark reminder as completed
    pub async fn complete_reminder(&self, reminder_id: i64) -> Result<()> {
        let now = Utc::now().to_rfc3339();

        sqlx::query!(
            "UPDATE application_reminders SET completed = 1, completed_at = ? WHERE id = ?",
            now,
            reminder_id
        )
        .execute(&self.db)
        .await?;

        Ok(())
    }
}
