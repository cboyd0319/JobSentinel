//! Ghost job detection Tauri commands (v1.4)
//!
//! Commands for identifying and filtering ghost/fake job postings.

use crate::commands::AppState;
use serde_json::Value;
use tauri::State;

/// Get jobs flagged as potential ghost jobs
///
/// Returns jobs with ghost_score >= threshold (default 0.5)
#[tauri::command]
pub async fn get_ghost_jobs(
    threshold: Option<f64>,
    limit: Option<i64>,
    state: State<'_, AppState>,
) -> Result<Vec<Value>, String> {
    let threshold = threshold.unwrap_or(0.5);
    let limit = limit.unwrap_or(100);
    tracing::info!(
        "Command: get_ghost_jobs (threshold: {}, limit: {})",
        threshold,
        limit
    );

    match state.database.get_ghost_jobs(threshold, limit).await {
        Ok(jobs) => {
            let jobs_json: Vec<Value> = jobs
                .into_iter()
                .filter_map(|job| serde_json::to_value(&job).ok())
                .collect();
            Ok(jobs_json)
        }
        Err(e) => {
            tracing::error!("Failed to get ghost jobs: {}", e);
            Err(format!("Database error: {}", e))
        }
    }
}

/// Get ghost detection statistics
///
/// Returns counts of jobs by ghost score ranges and top reasons
#[tauri::command]
pub async fn get_ghost_statistics(state: State<'_, AppState>) -> Result<Value, String> {
    tracing::info!("Command: get_ghost_statistics");

    match state.database.get_ghost_statistics().await {
        Ok(stats) => serde_json::to_value(&stats)
            .map_err(|e| format!("Failed to serialize ghost statistics: {}", e)),
        Err(e) => {
            tracing::error!("Failed to get ghost statistics: {}", e);
            Err(format!("Database error: {}", e))
        }
    }
}

/// Get recent jobs with optional ghost filtering
///
/// When `exclude_ghost` is true, jobs with ghost_score >= 0.5 are excluded.
#[tauri::command]
pub async fn get_recent_jobs_filtered(
    limit: i64,
    exclude_ghost: bool,
    state: State<'_, AppState>,
) -> Result<Vec<Value>, String> {
    tracing::info!(
        "Command: get_recent_jobs_filtered (limit: {}, exclude_ghost: {})",
        limit,
        exclude_ghost
    );

    // Convert bool to max_ghost_score: exclude ghosts means max score of 0.5
    let max_ghost_score = if exclude_ghost { Some(0.5) } else { None };

    match state
        .database
        .get_recent_jobs_filtered(limit, max_ghost_score)
        .await
    {
        Ok(jobs) => {
            let jobs_json: Vec<Value> = jobs
                .into_iter()
                .filter_map(|job| serde_json::to_value(&job).ok())
                .collect();
            Ok(jobs_json)
        }
        Err(e) => {
            tracing::error!("Failed to get filtered jobs: {}", e);
            Err(format!("Database error: {}", e))
        }
    }
}
