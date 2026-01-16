//! Application Tracking System (ATS)
//!
//! Track job applications through their entire lifecycle with Kanban board,
//! automated reminders, and comprehensive timeline tracking.

use anyhow::{anyhow, Result};
use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use sqlx::SqlitePool;
use std::fmt;
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

impl fmt::Display for ApplicationStatus {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let s = match self {
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
        };
        write!(f, "{}", s)
    }
}

impl FromStr for ApplicationStatus {
    type Err = anyhow::Error;

    fn from_str(s: &str) -> Result<Self> {
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
            status: row.status.parse()?,
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

    /// Schedule a new interview
    pub async fn schedule_interview(
        &self,
        application_id: i64,
        interview_type: &str,
        scheduled_at: &str,
        duration_minutes: i32,
        location: Option<&str>,
        interviewer_name: Option<&str>,
        interviewer_title: Option<&str>,
        notes: Option<&str>,
    ) -> Result<i64> {
        let result = sqlx::query!(
            r#"
            INSERT INTO interviews (
                application_id, interview_type, scheduled_at, duration_minutes,
                location, interviewer_name, interviewer_title, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            "#,
            application_id,
            interview_type,
            scheduled_at,
            duration_minutes,
            location,
            interviewer_name,
            interviewer_title,
            notes
        )
        .execute(&self.db)
        .await?;

        Ok(result.last_insert_rowid())
    }

    /// Get upcoming interviews (next 30 days, not completed)
    pub async fn get_upcoming_interviews(&self) -> Result<Vec<InterviewWithJob>> {
        let interviews = sqlx::query!(
            r#"
            SELECT
                i.id,
                i.application_id,
                i.interview_type,
                i.scheduled_at,
                i.duration_minutes,
                i.location,
                i.interviewer_name,
                i.interviewer_title,
                i.notes,
                i.completed,
                i.outcome,
                j.title as job_title,
                j.company
            FROM interviews i
            JOIN applications a ON i.application_id = a.id
            JOIN jobs j ON a.job_hash = j.hash
            WHERE i.completed = 0
              AND datetime(i.scheduled_at) >= datetime('now')
              AND datetime(i.scheduled_at) <= datetime('now', '+30 days')
            ORDER BY i.scheduled_at ASC
            "#
        )
        .fetch_all(&self.db)
        .await?;

        Ok(interviews
            .into_iter()
            .filter_map(|row| {
                Some(InterviewWithJob {
                    id: row.id?,
                    application_id: row.application_id,
                    interview_type: row.interview_type.unwrap_or_else(|| "other".to_string()),
                    scheduled_at: row.scheduled_at,
                    duration_minutes: row.duration_minutes.unwrap_or(60) as i32,
                    location: row.location,
                    interviewer_name: row.interviewer_name,
                    interviewer_title: row.interviewer_title,
                    notes: row.notes,
                    completed: row.completed != 0,
                    outcome: row.outcome,
                    // TODO: Add post_interview_notes when migration is applied
                    post_interview_notes: None,
                    job_title: row.job_title,
                    company: row.company,
                })
            })
            .collect())
    }

    /// Get past interviews (completed, last 90 days)
    pub async fn get_past_interviews(&self) -> Result<Vec<InterviewWithJob>> {
        let interviews = sqlx::query!(
            r#"
            SELECT
                i.id,
                i.application_id,
                i.interview_type,
                i.scheduled_at,
                i.duration_minutes,
                i.location,
                i.interviewer_name,
                i.interviewer_title,
                i.notes,
                i.completed,
                i.outcome,
                j.title as job_title,
                j.company
            FROM interviews i
            JOIN applications a ON i.application_id = a.id
            JOIN jobs j ON a.job_hash = j.hash
            WHERE i.completed = 1
              AND datetime(i.scheduled_at) >= datetime('now', '-90 days')
            ORDER BY i.scheduled_at DESC
            "#
        )
        .fetch_all(&self.db)
        .await?;

        Ok(interviews
            .into_iter()
            .filter_map(|row| {
                Some(InterviewWithJob {
                    id: row.id?,
                    application_id: row.application_id,
                    interview_type: row.interview_type.unwrap_or_else(|| "other".to_string()),
                    scheduled_at: row.scheduled_at,
                    duration_minutes: row.duration_minutes.unwrap_or(60) as i32,
                    location: row.location,
                    interviewer_name: row.interviewer_name,
                    interviewer_title: row.interviewer_title,
                    notes: row.notes,
                    completed: row.completed != 0,
                    outcome: row.outcome,
                    // TODO: Add post_interview_notes when migration is applied
                    post_interview_notes: None,
                    job_title: row.job_title,
                    company: row.company,
                })
            })
            .collect())
    }

    /// Update interview outcome
    /// Note: post_notes parameter is currently ignored until migration is applied
    pub async fn complete_interview(
        &self,
        interview_id: i64,
        outcome: &str,
        _post_notes: Option<&str>,
    ) -> Result<()> {
        let now = Utc::now().to_rfc3339();

        // TODO: Store post_notes in post_interview_notes column when migration is applied
        sqlx::query!(
            r#"
            UPDATE interviews
            SET completed = 1, outcome = ?, updated_at = ?
            WHERE id = ?
            "#,
            outcome,
            now,
            interview_id
        )
        .execute(&self.db)
        .await?;

        Ok(())
    }

    /// Delete an interview
    pub async fn delete_interview(&self, interview_id: i64) -> Result<()> {
        sqlx::query!("DELETE FROM interviews WHERE id = ?", interview_id)
            .execute(&self.db)
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

/// Application statistics for analytics dashboard
#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct ApplicationStats {
    pub total: i32,
    pub by_status: StatusCounts,
    pub response_rate: f64,
    pub offer_rate: f64,
    pub weekly_applications: Vec<WeeklyData>,
}

/// Counts by status
#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct StatusCounts {
    pub to_apply: i32,
    pub applied: i32,
    pub screening_call: i32,
    pub phone_interview: i32,
    pub technical_interview: i32,
    pub onsite_interview: i32,
    pub offer_received: i32,
    pub offer_accepted: i32,
    pub offer_rejected: i32,
    pub rejected: i32,
    pub ghosted: i32,
    pub withdrawn: i32,
}

/// Weekly application data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WeeklyData {
    pub week: String,
    pub count: i32,
}

/// Interview types
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum InterviewType {
    Phone,
    Screening,
    Technical,
    Behavioral,
    Onsite,
    Final,
    Other,
}

impl std::fmt::Display for InterviewType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            InterviewType::Phone => write!(f, "phone"),
            InterviewType::Screening => write!(f, "screening"),
            InterviewType::Technical => write!(f, "technical"),
            InterviewType::Behavioral => write!(f, "behavioral"),
            InterviewType::Onsite => write!(f, "onsite"),
            InterviewType::Final => write!(f, "final"),
            InterviewType::Other => write!(f, "other"),
        }
    }
}

impl std::str::FromStr for InterviewType {
    type Err = anyhow::Error;

    fn from_str(s: &str) -> Result<Self> {
        match s.to_lowercase().as_str() {
            "phone" => Ok(InterviewType::Phone),
            "screening" => Ok(InterviewType::Screening),
            "technical" => Ok(InterviewType::Technical),
            "behavioral" => Ok(InterviewType::Behavioral),
            "onsite" => Ok(InterviewType::Onsite),
            "final" => Ok(InterviewType::Final),
            _ => Ok(InterviewType::Other),
        }
    }
}

/// Interview with job details (for display)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InterviewWithJob {
    pub id: i64,
    pub application_id: i64,
    pub interview_type: String,
    pub scheduled_at: String,
    pub duration_minutes: i32,
    pub location: Option<String>,
    pub interviewer_name: Option<String>,
    pub interviewer_title: Option<String>,
    pub notes: Option<String>,
    pub completed: bool,
    pub outcome: Option<String>,
    pub post_interview_notes: Option<String>,
    pub job_title: String,
    pub company: String,
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

    // ========================================
    // Unit tests (no database required)
    // ========================================

    #[test]
    fn test_application_status_display() {
        assert_eq!(ApplicationStatus::ToApply.to_string(), "to_apply");
        assert_eq!(ApplicationStatus::Applied.to_string(), "applied");
        assert_eq!(ApplicationStatus::ScreeningCall.to_string(), "screening_call");
        assert_eq!(ApplicationStatus::PhoneInterview.to_string(), "phone_interview");
        assert_eq!(ApplicationStatus::TechnicalInterview.to_string(), "technical_interview");
        assert_eq!(ApplicationStatus::OnsiteInterview.to_string(), "onsite_interview");
        assert_eq!(ApplicationStatus::OfferReceived.to_string(), "offer_received");
        assert_eq!(ApplicationStatus::OfferAccepted.to_string(), "offer_accepted");
        assert_eq!(ApplicationStatus::OfferRejected.to_string(), "offer_rejected");
        assert_eq!(ApplicationStatus::Rejected.to_string(), "rejected");
        assert_eq!(ApplicationStatus::Ghosted.to_string(), "ghosted");
        assert_eq!(ApplicationStatus::Withdrawn.to_string(), "withdrawn");
    }

    #[test]
    fn test_application_status_from_str_valid() {
        assert_eq!("to_apply".parse::<ApplicationStatus>().unwrap(), ApplicationStatus::ToApply);
        assert_eq!("applied".parse::<ApplicationStatus>().unwrap(), ApplicationStatus::Applied);
        assert_eq!("screening_call".parse::<ApplicationStatus>().unwrap(), ApplicationStatus::ScreeningCall);
        assert_eq!("phone_interview".parse::<ApplicationStatus>().unwrap(), ApplicationStatus::PhoneInterview);
        assert_eq!("technical_interview".parse::<ApplicationStatus>().unwrap(), ApplicationStatus::TechnicalInterview);
        assert_eq!("onsite_interview".parse::<ApplicationStatus>().unwrap(), ApplicationStatus::OnsiteInterview);
        assert_eq!("offer_received".parse::<ApplicationStatus>().unwrap(), ApplicationStatus::OfferReceived);
        assert_eq!("offer_accepted".parse::<ApplicationStatus>().unwrap(), ApplicationStatus::OfferAccepted);
        assert_eq!("offer_rejected".parse::<ApplicationStatus>().unwrap(), ApplicationStatus::OfferRejected);
        assert_eq!("rejected".parse::<ApplicationStatus>().unwrap(), ApplicationStatus::Rejected);
        assert_eq!("ghosted".parse::<ApplicationStatus>().unwrap(), ApplicationStatus::Ghosted);
        assert_eq!("withdrawn".parse::<ApplicationStatus>().unwrap(), ApplicationStatus::Withdrawn);
    }

    #[test]
    fn test_application_status_from_str_invalid() {
        assert!("invalid".parse::<ApplicationStatus>().is_err());
        assert!("".parse::<ApplicationStatus>().is_err());
        assert!("APPLIED".parse::<ApplicationStatus>().is_err()); // Case-sensitive
    }

    #[test]
    fn test_application_status_roundtrip() {
        let statuses = vec![
            ApplicationStatus::ToApply,
            ApplicationStatus::Applied,
            ApplicationStatus::ScreeningCall,
            ApplicationStatus::PhoneInterview,
            ApplicationStatus::TechnicalInterview,
            ApplicationStatus::OnsiteInterview,
            ApplicationStatus::OfferReceived,
            ApplicationStatus::OfferAccepted,
            ApplicationStatus::OfferRejected,
            ApplicationStatus::Rejected,
            ApplicationStatus::Ghosted,
            ApplicationStatus::Withdrawn,
        ];

        for status in statuses {
            let string = status.to_string();
            let parsed: ApplicationStatus = string.parse().unwrap();
            assert_eq!(status, parsed);
        }
    }

    #[test]
    fn test_applications_by_status_default() {
        let default = ApplicationsByStatus::default();
        assert!(default.to_apply.is_empty());
        assert!(default.applied.is_empty());
        assert!(default.screening_call.is_empty());
        assert!(default.phone_interview.is_empty());
        assert!(default.technical_interview.is_empty());
        assert!(default.onsite_interview.is_empty());
        assert!(default.offer_received.is_empty());
        assert!(default.offer_accepted.is_empty());
        assert!(default.offer_rejected.is_empty());
        assert!(default.rejected.is_empty());
        assert!(default.ghosted.is_empty());
        assert!(default.withdrawn.is_empty());
    }

    // ========================================
    // Database integration tests
    // ========================================

    async fn create_test_db() -> SqlitePool {
        // Use in-memory database with shared cache for tests
        let pool = SqlitePoolOptions::new()
            .connect("sqlite::memory:")
            .await
            .unwrap();

        // Create jobs table
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

        // Create applications table
        sqlx::query(
            r#"
            CREATE TABLE applications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_hash TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'to_apply',
                applied_at TEXT,
                last_contact TEXT,
                next_followup TEXT,
                notes TEXT,
                recruiter_name TEXT,
                recruiter_email TEXT,
                recruiter_phone TEXT,
                salary_expectation INTEGER,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (job_hash) REFERENCES jobs(hash) ON DELETE CASCADE
            )
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        // Create application_events table
        sqlx::query(
            r#"
            CREATE TABLE application_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                application_id INTEGER NOT NULL,
                event_type TEXT NOT NULL,
                event_data TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
            )
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        // Create application_reminders table
        sqlx::query(
            r#"
            CREATE TABLE application_reminders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                application_id INTEGER NOT NULL,
                reminder_type TEXT NOT NULL,
                reminder_time TEXT NOT NULL,
                message TEXT,
                completed INTEGER NOT NULL DEFAULT 0,
                completed_at TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE
            )
            "#,
        )
        .execute(&pool)
        .await
        .unwrap();

        pool
    }

    #[tokio::test]
    #[ignore = "Requires file-based database with migrations run"]
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
    #[ignore = "Requires file-based database with migrations run"]
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
    #[ignore = "Requires file-based database with migrations run"]
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
    #[ignore = "Requires file-based database with migrations run"]
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
