//! Resume matching Tauri commands
//!
//! Commands for resume upload, skill extraction, and job-resume matching.

use crate::commands::AppState;
use crate::core::resume::{MatchResult, MatchResultWithJob, Resume, ResumeMatcher, UserSkill};
use tauri::State;

/// Upload and parse a resume
#[tauri::command]
pub async fn upload_resume(
    name: String,
    file_path: String,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    tracing::info!(
        "Command: upload_resume (name: {}, path: {})",
        name,
        file_path
    );

    let matcher = ResumeMatcher::new(state.database.pool().clone());
    matcher
        .upload_resume(&name, &file_path)
        .await
        .map_err(|e| format!("Failed to upload resume: {}", e))
}

/// Get active resume
#[tauri::command]
pub async fn get_active_resume(state: State<'_, AppState>) -> Result<Option<Resume>, String> {
    tracing::info!("Command: get_active_resume");

    let matcher = ResumeMatcher::new(state.database.pool().clone());
    matcher
        .get_active_resume()
        .await
        .map_err(|e| format!("Failed to get resume: {}", e))
}

/// Set active resume
#[tauri::command]
pub async fn set_active_resume(resume_id: i64, state: State<'_, AppState>) -> Result<(), String> {
    tracing::info!("Command: set_active_resume (id: {})", resume_id);

    let matcher = ResumeMatcher::new(state.database.pool().clone());
    matcher
        .set_active_resume(resume_id)
        .await
        .map_err(|e| format!("Failed to set active resume: {}", e))
}

/// Get user skills from active resume
#[tauri::command]
pub async fn get_user_skills(
    resume_id: i64,
    state: State<'_, AppState>,
) -> Result<Vec<UserSkill>, String> {
    tracing::info!("Command: get_user_skills (resume_id: {})", resume_id);

    let matcher = ResumeMatcher::new(state.database.pool().clone());
    matcher
        .get_user_skills(resume_id)
        .await
        .map_err(|e| format!("Failed to get skills: {}", e))
}

/// Match resume to a job
#[tauri::command]
pub async fn match_resume_to_job(
    resume_id: i64,
    job_hash: String,
    state: State<'_, AppState>,
) -> Result<MatchResult, String> {
    tracing::info!(
        "Command: match_resume_to_job (resume: {}, job: {})",
        resume_id,
        job_hash
    );

    let matcher = ResumeMatcher::new(state.database.pool().clone());
    matcher
        .match_resume_to_job(resume_id, &job_hash)
        .await
        .map_err(|e| format!("Failed to match resume: {}", e))
}

/// Get existing match result
#[tauri::command]
pub async fn get_match_result(
    resume_id: i64,
    job_hash: String,
    state: State<'_, AppState>,
) -> Result<Option<MatchResult>, String> {
    tracing::info!(
        "Command: get_match_result (resume: {}, job: {})",
        resume_id,
        job_hash
    );

    let matcher = ResumeMatcher::new(state.database.pool().clone());
    matcher
        .get_match_result(resume_id, &job_hash)
        .await
        .map_err(|e| format!("Failed to get match result: {}", e))
}

/// Get recent match results for a resume
#[tauri::command]
pub async fn get_recent_matches(
    resume_id: i64,
    limit: Option<i64>,
    state: State<'_, AppState>,
) -> Result<Vec<MatchResultWithJob>, String> {
    tracing::info!(
        "Command: get_recent_matches (resume: {}, limit: {:?})",
        resume_id,
        limit
    );

    let matcher = ResumeMatcher::new(state.database.pool().clone());
    matcher
        .get_recent_matches(resume_id, limit.unwrap_or(10))
        .await
        .map_err(|e| format!("Failed to get recent matches: {}", e))
}
