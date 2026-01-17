//! Core application tracking functionality

use super::types::*;
use anyhow::Result;
use chrono::Utc;
use serde_json::Value as JsonValue;
use sqlx::SqlitePool;

/// Application tracker manager
pub struct ApplicationTracker {
    pub(super) db: SqlitePool,
}

impl ApplicationTracker {
    pub fn new(db: SqlitePool) -> Self {
        Self { db }
    }

    /// Create new application
    pub async fn create_application(&self, job_hash: &str) -> Result<i64> {
        let result = sqlx::query!(
            "INSERT INTO applications (job_hash, status) VALUES (?, 'to_apply')",
            job_hash
        )
        .execute(&self.db)
        .await?;

        Ok(result.last_insert_rowid())
    }

    /// Get application by ID
    pub async fn get_application(&self, application_id: i64) -> Result<Application> {
        let row = sqlx::query!(
            r#"
            SELECT id, job_hash, status, applied_at, last_contact, next_followup,
                   notes, recruiter_name, recruiter_email, recruiter_phone,
                   salary_expectation, created_at, updated_at
            FROM applications
            WHERE id = ?
            "#,
            application_id
        )
        .fetch_one(&self.db)
        .await?;

        Ok(Application {
            id: row.id,
            job_hash: row.job_hash,
            status: row.status.parse()?,
            applied_at: row.applied_at.and_then(|s| parse_sqlite_datetime(&s).ok()),
            last_contact: row
                .last_contact
                .and_then(|s| parse_sqlite_datetime(&s).ok()),
            next_followup: row
                .next_followup
                .and_then(|s| parse_sqlite_datetime(&s).ok()),
            notes: row.notes,
            recruiter_name: row.recruiter_name,
            recruiter_email: row.recruiter_email,
            recruiter_phone: row.recruiter_phone,
            salary_expectation: row.salary_expectation,
            created_at: parse_sqlite_datetime(&row.created_at)?,
            updated_at: parse_sqlite_datetime(&row.updated_at)?,
        })
    }

    /// Update application status
    pub async fn update_status(
        &self,
        application_id: i64,
        new_status: ApplicationStatus,
    ) -> Result<()> {
        // Get current status for event log
        let current_app = self.get_application(application_id).await?;
        let current_status = current_app.status;

        // Update status and timestamp
        let now = Utc::now().to_rfc3339();
        let status_str = new_status.to_string();

        sqlx::query!(
            "UPDATE applications SET status = ?, updated_at = ? WHERE id = ?",
            status_str,
            now,
            application_id
        )
        .execute(&self.db)
        .await?;

        // If transitioning to "applied", set applied_at timestamp
        if new_status == ApplicationStatus::Applied && current_status != ApplicationStatus::Applied
        {
            sqlx::query!(
                "UPDATE applications SET applied_at = ? WHERE id = ?",
                now,
                application_id
            )
            .execute(&self.db)
            .await?;
        }

        // Log status change event
        self.log_event(
            application_id,
            "status_change",
            serde_json::json!({
                "from": current_status.to_string(),
                "to": new_status.to_string()
            }),
        )
        .await?;

        // Auto-set reminders based on new status
        self.auto_set_reminders(application_id, new_status).await?;

        Ok(())
    }

    /// Log an event in the application timeline
    pub(super) async fn log_event(
        &self,
        application_id: i64,
        event_type: &str,
        event_data: JsonValue,
    ) -> Result<()> {
        let event_data_str = event_data.to_string();

        sqlx::query!(
            "INSERT INTO application_events (application_id, event_type, event_data) VALUES (?, ?, ?)",
            application_id,
            event_type,
            event_data_str
        )
        .execute(&self.db)
        .await?;

        Ok(())
    }

    /// Auto-set reminders based on status transitions
    pub(super) async fn auto_set_reminders(
        &self,
        application_id: i64,
        status: ApplicationStatus,
    ) -> Result<()> {
        use chrono::Duration;

        match status {
            ApplicationStatus::Applied => {
                // Set reminder to follow up in 1 week if no response
                let followup_time = Utc::now() + Duration::days(7);
                self.set_reminder(
                    application_id,
                    "follow_up",
                    followup_time,
                    "Follow up on application if no response",
                )
                .await?;
            }
            ApplicationStatus::PhoneInterview
            | ApplicationStatus::TechnicalInterview
            | ApplicationStatus::OnsiteInterview => {
                // Set reminder to send thank-you email after interview
                let thank_you_time = Utc::now() + Duration::hours(24);
                self.set_reminder(
                    application_id,
                    "follow_up",
                    thank_you_time,
                    "Send thank-you email after interview",
                )
                .await?;
            }
            ApplicationStatus::OfferReceived => {
                // No auto-reminder, user decides when to respond
            }
            _ => {}
        }

        Ok(())
    }

    /// Get all applications grouped by status (for Kanban board)
    pub async fn get_applications_by_status(&self) -> Result<ApplicationsByStatus> {
        let apps = sqlx::query_as!(
            ApplicationWithJob,
            r#"
            SELECT
                a.id,
                a.job_hash,
                a.status,
                a.applied_at,
                a.last_contact,
                a.notes,
                j.title as job_title,
                j.company,
                j.score as "score!: f64"
            FROM applications a
            JOIN jobs j ON a.job_hash = j.hash
            ORDER BY a.updated_at DESC
            "#
        )
        .fetch_all(&self.db)
        .await?;

        let mut result = ApplicationsByStatus::default();

        for app in apps {
            let status = app.status.parse()?;
            match status {
                ApplicationStatus::ToApply => result.to_apply.push(app),
                ApplicationStatus::Applied => result.applied.push(app),
                ApplicationStatus::ScreeningCall => result.screening_call.push(app),
                ApplicationStatus::PhoneInterview => result.phone_interview.push(app),
                ApplicationStatus::TechnicalInterview => result.technical_interview.push(app),
                ApplicationStatus::OnsiteInterview => result.onsite_interview.push(app),
                ApplicationStatus::OfferReceived => result.offer_received.push(app),
                ApplicationStatus::OfferAccepted => result.offer_accepted.push(app),
                ApplicationStatus::OfferRejected => result.offer_rejected.push(app),
                ApplicationStatus::Rejected => result.rejected.push(app),
                ApplicationStatus::Ghosted => result.ghosted.push(app),
                ApplicationStatus::Withdrawn => result.withdrawn.push(app),
            }
        }

        Ok(result)
    }

    /// Mark application as ghosted if no contact in 2+ weeks
    pub async fn auto_detect_ghosted(&self) -> Result<usize> {
        use chrono::Duration;

        let two_weeks_ago = (Utc::now() - Duration::days(14)).to_rfc3339();

        let result = sqlx::query!(
            r#"
            UPDATE applications
            SET status = 'ghosted', updated_at = datetime('now')
            WHERE status IN ('applied', 'phone_interview', 'technical_interview', 'onsite_interview')
              AND (last_contact IS NULL OR last_contact < ?)
            "#,
            two_weeks_ago
        )
        .execute(&self.db)
        .await?;

        Ok(result.rows_affected() as usize)
    }

    /// Update contact timestamp
    pub async fn update_last_contact(&self, application_id: i64) -> Result<()> {
        let now = Utc::now().to_rfc3339();

        sqlx::query!(
            "UPDATE applications SET last_contact = ?, updated_at = ? WHERE id = ?",
            now,
            now,
            application_id
        )
        .execute(&self.db)
        .await?;

        Ok(())
    }

    /// Add notes to application
    pub async fn add_notes(&self, application_id: i64, notes: &str) -> Result<()> {
        sqlx::query!(
            "UPDATE applications SET notes = ?, updated_at = datetime('now') WHERE id = ?",
            notes,
            application_id
        )
        .execute(&self.db)
        .await?;

        // Log note added event
        self.log_event(
            application_id,
            "note_added",
            serde_json::json!({"notes": notes}),
        )
        .await?;

        Ok(())
    }

    /// Get application statistics for analytics
    pub async fn get_application_stats(&self) -> Result<ApplicationStats> {
        // Get counts by status
        let status_counts = sqlx::query!(
            r#"
            SELECT
                status,
                COUNT(*) as count
            FROM applications
            GROUP BY status
            "#
        )
        .fetch_all(&self.db)
        .await?;

        let mut stats = ApplicationStats::default();
        for row in status_counts {
            let count = row.count as i32;
            match row.status.as_str() {
                "to_apply" => stats.by_status.to_apply = count,
                "applied" => stats.by_status.applied = count,
                "screening_call" => stats.by_status.screening_call = count,
                "phone_interview" => stats.by_status.phone_interview = count,
                "technical_interview" => stats.by_status.technical_interview = count,
                "onsite_interview" => stats.by_status.onsite_interview = count,
                "offer_received" => stats.by_status.offer_received = count,
                "offer_accepted" => stats.by_status.offer_accepted = count,
                "offer_rejected" => stats.by_status.offer_rejected = count,
                "rejected" => stats.by_status.rejected = count,
                "ghosted" => stats.by_status.ghosted = count,
                "withdrawn" => stats.by_status.withdrawn = count,
                _ => {}
            }
        }

        // Calculate totals
        stats.total = stats.by_status.to_apply
            + stats.by_status.applied
            + stats.by_status.screening_call
            + stats.by_status.phone_interview
            + stats.by_status.technical_interview
            + stats.by_status.onsite_interview
            + stats.by_status.offer_received
            + stats.by_status.offer_accepted
            + stats.by_status.offer_rejected
            + stats.by_status.rejected
            + stats.by_status.ghosted
            + stats.by_status.withdrawn;

        // Calculate response rate (moved past applied / total applied)
        let total_applied = stats.by_status.applied
            + stats.by_status.screening_call
            + stats.by_status.phone_interview
            + stats.by_status.technical_interview
            + stats.by_status.onsite_interview
            + stats.by_status.offer_received
            + stats.by_status.offer_accepted
            + stats.by_status.offer_rejected
            + stats.by_status.rejected
            + stats.by_status.ghosted;

        let got_response = stats.by_status.screening_call
            + stats.by_status.phone_interview
            + stats.by_status.technical_interview
            + stats.by_status.onsite_interview
            + stats.by_status.offer_received
            + stats.by_status.offer_accepted
            + stats.by_status.offer_rejected
            + stats.by_status.rejected;

        if total_applied > 0 {
            stats.response_rate = (got_response as f64 / total_applied as f64) * 100.0;
        }

        // Calculate offer rate (offers / total applied)
        let total_offers = stats.by_status.offer_received
            + stats.by_status.offer_accepted
            + stats.by_status.offer_rejected;

        if total_applied > 0 {
            stats.offer_rate = (total_offers as f64 / total_applied as f64) * 100.0;
        }

        // Get applications by week for the last 12 weeks
        let weekly_data = sqlx::query!(
            r#"
            SELECT
                strftime('%Y-%W', applied_at) as week,
                COUNT(*) as count
            FROM applications
            WHERE applied_at IS NOT NULL
              AND applied_at >= datetime('now', '-12 weeks')
            GROUP BY week
            ORDER BY week ASC
            "#
        )
        .fetch_all(&self.db)
        .await?;

        stats.weekly_applications = weekly_data
            .into_iter()
            .filter_map(|row| {
                row.week.map(|w| WeeklyData {
                    week: w,
                    count: row.count as i32,
                })
            })
            .collect();

        Ok(stats)
    }
}
