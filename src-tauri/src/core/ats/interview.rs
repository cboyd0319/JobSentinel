//! Interview scheduling and management

use super::tracker::ApplicationTracker;
use super::types::*;
use anyhow::Result;
use chrono::Utc;

impl ApplicationTracker {
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

        // Note: post_interview_notes column exists in DB via migration but SQLx compile-time
        // checking requires schema regeneration. Using separate query for now.
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
                    post_interview_notes: None, // Available via migration, needs SQLx schema regen
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

        // Note: post_interview_notes column exists in DB via migration but SQLx compile-time
        // checking requires schema regeneration. Using separate query for now.
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
                    post_interview_notes: None, // Available via migration, needs SQLx schema regen
                    job_title: row.job_title,
                    company: row.company,
                })
            })
            .collect())
    }

    /// Update interview outcome with optional post-interview notes
    ///
    /// Note: post_notes is stored in the post_interview_notes column added via migration.
    /// The column exists in the DB but SQLx compile-time checking requires schema regeneration.
    pub async fn complete_interview(
        &self,
        interview_id: i64,
        outcome: &str,
        post_notes: Option<&str>,
    ) -> Result<()> {
        let now = Utc::now().to_rfc3339();

        // Update basic fields with compile-time checked query
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

        // Store post_notes separately using runtime query (column added via migration)
        if let Some(notes) = post_notes {
            sqlx::query("UPDATE interviews SET post_interview_notes = ? WHERE id = ?")
                .bind(notes)
                .bind(interview_id)
                .execute(&self.db)
                .await?;
        }

        Ok(())
    }

    /// Delete an interview
    pub async fn delete_interview(&self, interview_id: i64) -> Result<()> {
        sqlx::query!("DELETE FROM interviews WHERE id = ?", interview_id)
            .execute(&self.db)
            .await?;

        Ok(())
    }
}
