//! Application Tracking System (ATS)
//!
//! Track job applications through their entire lifecycle with Kanban board,
//! automated reminders, and comprehensive timeline tracking.

use anyhow::{anyhow, Context, Result};
use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use sqlx::SqlitePool;
use std::str::FromStr;

/// Application status in the job search pipeline
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ApplicationStatus {
    ToApply,
    Applied,
    ScreeningCall,
    PhoneInterview,
    TechnicalInterview,
    OnsiteInterview,
    OfferReceived,
    OfferAccepted,
    OfferRejected,
    Rejected,
    Ghosted,
    Withdrawn,
}

impl ApplicationStatus {
    pub fn to_string(&self) -> String {
        match self {
            Self::ToApply => "to_apply",
            Self::Applied => "applied",
            Self::ScreeningCall => "screening_call",
            Self::PhoneInterview => "phone_interview",
            Self::TechnicalInterview => "technical_interview",
            Self::OnsiteInterview => "onsite_interview",
            Self::OfferReceived => "offer_received",
            Self::OfferAccepted => "offer_accepted",
            Self::OfferRejected => "offer_rejected",
            Self::Rejected => "rejected",
            Self::Ghosted => "ghosted",
            Self::Withdrawn => "withdrawn",
        }
        .to_string()
    }

    pub fn from_str(s: &str) -> Result<Self> {
        match s {
            "to_apply" => Ok(Self::ToApply),
            "applied" => Ok(Self::Applied),
            "screening_call" => Ok(Self::ScreeningCall),
            "phone_interview" => Ok(Self::PhoneInterview),
            "technical_interview" => Ok(Self::TechnicalInterview),
            "onsite_interview" => Ok(Self::OnsiteInterview),
            "offer_received" => Ok(Self::OfferReceived),
            "offer_accepted" => Ok(Self::OfferAccepted),
            "offer_rejected" => Ok(Self::OfferRejected),
            "rejected" => Ok(Self::Rejected),
            "ghosted" => Ok(Self::Ghosted),
            "withdrawn" => Ok(Self::Withdrawn),
            _ => Err(anyhow!("Invalid status: {}", s)),
        }
    }
}

/// Application data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Application {
    pub id: i64,
    pub job_hash: String,
    pub status: ApplicationStatus,
    pub applied_at: Option<DateTime<Utc>>,
    pub last_contact: Option<DateTime<Utc>>,
    pub next_followup: Option<DateTime<Utc>>,
    pub notes: Option<String>,
    pub recruiter_name: Option<String>,
    pub recruiter_email: Option<String>,
    pub recruiter_phone: Option<String>,
    pub salary_expectation: Option<i64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Applications grouped by status for Kanban board
#[derive(Debug, Default, Serialize, Deserialize)]
pub struct ApplicationsByStatus {
    pub to_apply: Vec<ApplicationWithJob>,
    pub applied: Vec<ApplicationWithJob>,
    pub screening_call: Vec<ApplicationWithJob>,
    pub phone_interview: Vec<ApplicationWithJob>,
    pub technical_interview: Vec<ApplicationWithJob>,
    pub onsite_interview: Vec<ApplicationWithJob>,
    pub offer_received: Vec<ApplicationWithJob>,
    pub offer_accepted: Vec<ApplicationWithJob>,
    pub offer_rejected: Vec<ApplicationWithJob>,
    pub rejected: Vec<ApplicationWithJob>,
    pub ghosted: Vec<ApplicationWithJob>,
    pub withdrawn: Vec<ApplicationWithJob>,
}

/// Application with job details (for Kanban display)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApplicationWithJob {
    pub id: i64,
    pub job_hash: String,
    pub status: String,
    pub applied_at: Option<String>,
    pub last_contact: Option<String>,
    pub notes: Option<String>,
    pub job_title: String,
    pub company: String,
    pub score: f64,
}

/// Application tracker manager
pub struct ApplicationTracker {
    db: SqlitePool,
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
            status: ApplicationStatus::from_str(&row.status)?,
            applied_at: row.applied_at.and_then(|s| DateTime::parse_from_rfc3339(&s).ok().map(|dt| dt.with_timezone(&Utc))),
            last_contact: row.last_contact.and_then(|s| DateTime::parse_from_rfc3339(&s).ok().map(|dt| dt.with_timezone(&Utc))),
            next_followup: row.next_followup.and_then(|s| DateTime::parse_from_rfc3339(&s).ok().map(|dt| dt.with_timezone(&Utc))),
            notes: row.notes,
            recruiter_name: row.recruiter_name,
            recruiter_email: row.recruiter_email,
            recruiter_phone: row.recruiter_phone,
            salary_expectation: row.salary_expectation,
            created_at: DateTime::parse_from_rfc3339(&row.created_at)?.with_timezone(&Utc),
            updated_at: DateTime::parse_from_rfc3339(&row.updated_at)?.with_timezone(&Utc),
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
        if new_status == ApplicationStatus::Applied && current_status != ApplicationStatus::Applied {
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
    async fn log_event(
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
    async fn auto_set_reminders(
        &self,
        application_id: i64,
        status: ApplicationStatus,
    ) -> Result<()> {
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
            ApplicationStatus::PhoneInterview | ApplicationStatus::TechnicalInterview | ApplicationStatus::OnsiteInterview => {
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
            let status = ApplicationStatus::from_str(&app.status)?;
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

    /// Get pending reminders
    pub async fn get_pending_reminders(&self) -> Result<Vec<PendingReminder>> {
        let now = Utc::now().to_rfc3339();

        let reminders = sqlx::query_as!(
            PendingReminder,
            r#"
            SELECT
                r.id,
                r.application_id,
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

/// Pending reminder with job details
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PendingReminder {
    pub id: i64,
    pub application_id: i64,
    pub reminder_type: String,
    pub reminder_time: String,
    pub message: Option<String>,
    pub job_hash: String,
    pub job_title: String,
    pub company: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePoolOptions;
    use tempfile::tempdir;

    async fn create_test_db() -> SqlitePool {
        let dir = tempdir().unwrap();
        let db_path = dir.path().join("test.db");
        let db_url = format!("sqlite://{}?mode=rwc", db_path.display());

        let pool = SqlitePoolOptions::new()
            .connect(&db_url)
            .await
            .unwrap();

        // Run migrations
        sqlx::query(
            r#"
            CREATE TABLE jobs (
                id INTEGER PRIMARY KEY,
                hash TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL,
                company TEXT NOT NULL,
                url TEXT NOT NULL,
                score REAL NOT NULL DEFAULT 0.0,
                created_at TEXT DEFAULT (datetime('now'))
            )
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        // Run ATS migration
        let migration = include_str!("../../migrations/20251115010000_add_application_tracking.sql");
        sqlx::raw_sql(migration).execute(&pool).await.unwrap();

        pool
    }

    #[tokio::test]
    async fn test_create_application() {
        let pool = create_test_db().await;

        // Insert test job
        sqlx::query("INSERT INTO jobs (hash, title, company, url) VALUES ('test123', 'Engineer', 'TestCo', 'http://test.com')")
            .execute(&pool)
            .await
            .unwrap();

        let tracker = ApplicationTracker::new(pool);
        let app_id = tracker.create_application("test123").await.unwrap();

        assert!(app_id > 0);

        let app = tracker.get_application(app_id).await.unwrap();
        assert_eq!(app.job_hash, "test123");
        assert_eq!(app.status, ApplicationStatus::ToApply);
    }

    #[tokio::test]
    async fn test_update_status() {
        let pool = create_test_db().await;

        sqlx::query("INSERT INTO jobs (hash, title, company, url) VALUES ('test123', 'Engineer', 'TestCo', 'http://test.com')")
            .execute(&pool)
            .await
            .unwrap();

        let tracker = ApplicationTracker::new(pool);
        let app_id = tracker.create_application("test123").await.unwrap();

        // Update to applied
        tracker
            .update_status(app_id, ApplicationStatus::Applied)
            .await
            .unwrap();

        let app = tracker.get_application(app_id).await.unwrap();
        assert_eq!(app.status, ApplicationStatus::Applied);
        assert!(app.applied_at.is_some());
    }

    #[tokio::test]
    async fn test_kanban_board() {
        let pool = create_test_db().await;

        sqlx::query("INSERT INTO jobs (hash, title, company, url) VALUES ('job1', 'Engineer', 'TestCo', 'http://test.com')")
            .execute(&pool)
            .await
            .unwrap();
        sqlx::query("INSERT INTO jobs (hash, title, company, url) VALUES ('job2', 'Developer', 'AnotherCo', 'http://test2.com')")
            .execute(&pool)
            .await
            .unwrap();

        let tracker = ApplicationTracker::new(pool);

        let app1 = tracker.create_application("job1").await.unwrap();
        let app2 = tracker.create_application("job2").await.unwrap();

        tracker.update_status(app1, ApplicationStatus::Applied).await.unwrap();
        tracker.update_status(app2, ApplicationStatus::PhoneInterview).await.unwrap();

        let kanban = tracker.get_applications_by_status().await.unwrap();

        assert_eq!(kanban.applied.len(), 1);
        assert_eq!(kanban.phone_interview.len(), 1);
        assert_eq!(kanban.to_apply.len(), 0);
    }

    #[tokio::test]
    async fn test_auto_reminders() {
        let pool = create_test_db().await;

        sqlx::query("INSERT INTO jobs (hash, title, company, url) VALUES ('test123', 'Engineer', 'TestCo', 'http://test.com')")
            .execute(&pool)
            .await
            .unwrap();

        let tracker = ApplicationTracker::new(pool.clone());
        let app_id = tracker.create_application("test123").await.unwrap();

        // Update to applied (should create follow-up reminder)
        tracker.update_status(app_id, ApplicationStatus::Applied).await.unwrap();

        // Check reminder was created
        let reminders = sqlx::query!("SELECT * FROM application_reminders WHERE application_id = ?", app_id)
            .fetch_all(&pool)
            .await
            .unwrap();

        assert_eq!(reminders.len(), 1);
        assert_eq!(reminders[0].reminder_type, "follow_up");
    }
}
