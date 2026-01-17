//! Application Tracking System (ATS) Tauri commands
//!
//! Commands for managing job applications, interviews, reminders, and ghosting detection.

use crate::commands::AppState;
use crate::core::ats::{ApplicationStatus, ApplicationTracker, ApplicationsByStatus, PendingReminder};
use crate::core::{ApplicationStats, InterviewWithJob};
use tauri::State;

/// Create a new application from a job
#[tauri::command]
pub async fn create_application(
    job_hash: String,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    tracing::info!("Command: create_application (job_hash: {})", job_hash);

    let tracker = ApplicationTracker::new(state.database.pool().clone());
    tracker
        .create_application(&job_hash)
        .await
        .map_err(|e| format!("Failed to create application: {}", e))
}

/// Get applications grouped by status (for Kanban board)
#[tauri::command]
pub async fn get_applications_kanban(
    state: State<'_, AppState>,
) -> Result<ApplicationsByStatus, String> {
    tracing::info!("Command: get_applications_kanban");

    let tracker = ApplicationTracker::new(state.database.pool().clone());
    tracker
        .get_applications_by_status()
        .await
        .map_err(|e| format!("Failed to get applications: {}", e))
}

/// Update application status
#[tauri::command]
pub async fn update_application_status(
    application_id: i64,
    status: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    tracing::info!(
        "Command: update_application_status (id: {}, status: {})",
        application_id,
        status
    );

    let tracker = ApplicationTracker::new(state.database.pool().clone());
    let new_status: ApplicationStatus = status
        .parse()
        .map_err(|e| format!("Invalid status: {}", e))?;

    tracker
        .update_status(application_id, new_status)
        .await
        .map_err(|e| format!("Failed to update status: {}", e))
}

/// Add notes to an application
#[tauri::command]
pub async fn add_application_notes(
    application_id: i64,
    notes: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    tracing::info!("Command: add_application_notes (id: {})", application_id);

    let tracker = ApplicationTracker::new(state.database.pool().clone());
    tracker
        .add_notes(application_id, &notes)
        .await
        .map_err(|e| format!("Failed to add notes: {}", e))
}

/// Get pending reminders
#[tauri::command]
pub async fn get_pending_reminders(
    state: State<'_, AppState>,
) -> Result<Vec<PendingReminder>, String> {
    tracing::info!("Command: get_pending_reminders");

    let tracker = ApplicationTracker::new(state.database.pool().clone());
    tracker
        .get_pending_reminders()
        .await
        .map_err(|e| format!("Failed to get reminders: {}", e))
}

/// Mark reminder as completed
#[tauri::command]
pub async fn complete_reminder(reminder_id: i64, state: State<'_, AppState>) -> Result<(), String> {
    tracing::info!("Command: complete_reminder (id: {})", reminder_id);

    let tracker = ApplicationTracker::new(state.database.pool().clone());
    tracker
        .complete_reminder(reminder_id)
        .await
        .map_err(|e| format!("Failed to complete reminder: {}", e))
}

/// Auto-detect ghosted applications
#[tauri::command]
pub async fn detect_ghosted_applications(state: State<'_, AppState>) -> Result<usize, String> {
    tracing::info!("Command: detect_ghosted_applications");

    let tracker = ApplicationTracker::new(state.database.pool().clone());
    tracker
        .auto_detect_ghosted()
        .await
        .map_err(|e| format!("Failed to detect ghosted: {}", e))
}

/// Get application statistics for analytics dashboard
#[tauri::command]
pub async fn get_application_stats(state: State<'_, AppState>) -> Result<ApplicationStats, String> {
    tracing::info!("Command: get_application_stats");

    let tracker = ApplicationTracker::new(state.database.pool().clone());
    tracker
        .get_application_stats()
        .await
        .map_err(|e| format!("Failed to get application stats: {}", e))
}

/// Schedule a new interview
#[tauri::command]
pub async fn schedule_interview(
    application_id: i64,
    interview_type: String,
    scheduled_at: String,
    duration_minutes: i32,
    location: Option<String>,
    interviewer_name: Option<String>,
    interviewer_title: Option<String>,
    notes: Option<String>,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    tracing::info!(
        "Command: schedule_interview (app: {}, type: {}, at: {})",
        application_id,
        interview_type,
        scheduled_at
    );

    let tracker = ApplicationTracker::new(state.database.pool().clone());
    tracker
        .schedule_interview(
            application_id,
            &interview_type,
            &scheduled_at,
            duration_minutes,
            location.as_deref(),
            interviewer_name.as_deref(),
            interviewer_title.as_deref(),
            notes.as_deref(),
        )
        .await
        .map_err(|e| format!("Failed to schedule interview: {}", e))
}

/// Get upcoming interviews
#[tauri::command]
pub async fn get_upcoming_interviews(
    state: State<'_, AppState>,
) -> Result<Vec<InterviewWithJob>, String> {
    tracing::info!("Command: get_upcoming_interviews");

    let tracker = ApplicationTracker::new(state.database.pool().clone());
    tracker
        .get_upcoming_interviews()
        .await
        .map_err(|e| format!("Failed to get interviews: {}", e))
}

/// Get past interviews (completed, last 90 days)
#[tauri::command]
pub async fn get_past_interviews(
    state: State<'_, AppState>,
) -> Result<Vec<InterviewWithJob>, String> {
    tracing::info!("Command: get_past_interviews");

    let tracker = ApplicationTracker::new(state.database.pool().clone());
    tracker
        .get_past_interviews()
        .await
        .map_err(|e| format!("Failed to get past interviews: {}", e))
}

/// Complete an interview with outcome
#[tauri::command]
pub async fn complete_interview(
    interview_id: i64,
    outcome: String,
    notes: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    tracing::info!(
        "Command: complete_interview (id: {}, outcome: {})",
        interview_id,
        outcome
    );

    let tracker = ApplicationTracker::new(state.database.pool().clone());
    tracker
        .complete_interview(interview_id, &outcome, notes.as_deref())
        .await
        .map_err(|e| format!("Failed to complete interview: {}", e))
}

/// Delete an interview
#[tauri::command]
pub async fn delete_interview(interview_id: i64, state: State<'_, AppState>) -> Result<(), String> {
    tracing::info!("Command: delete_interview (id: {})", interview_id);

    let tracker = ApplicationTracker::new(state.database.pool().clone());
    tracker
        .delete_interview(interview_id)
        .await
        .map_err(|e| format!("Failed to delete interview: {}", e))
}
