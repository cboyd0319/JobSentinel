//! Job-related Tauri commands
//!
//! Commands for job searching, retrieval, bookmarking, notes, and deduplication.

use crate::commands::errors::user_friendly_error;
use crate::commands::AppState;
use crate::core::db::DuplicateGroup;
use serde_json::Value;
use tauri::State;

/// Search for jobs from all enabled sources
///
/// This triggers a full scraping cycle across Greenhouse, Lever, and JobsWithGPT.
#[tauri::command]
pub async fn search_jobs(state: State<'_, AppState>) -> Result<Value, String> {
    tracing::info!("Command: search_jobs");

    // Create scheduler instance
    let scheduler =
        crate::core::scheduler::Scheduler::new(state.config.clone(), state.database.clone());

    // Run single scraping cycle
    match scheduler.run_scraping_cycle().await {
        Ok(result) => {
            tracing::info!("Scraping complete: {} jobs found", result.jobs_found);

            Ok(serde_json::json!({
                "success": true,
                "jobs_found": result.jobs_found,
                "jobs_new": result.jobs_new,
                "jobs_updated": result.jobs_updated,
                "high_matches": result.high_matches,
                "alerts_sent": result.alerts_sent,
                "errors": result.errors,
            }))
        }
        Err(e) => {
            tracing::error!("Search failed: {}", e);
            Err(format!("Scraping failed: {}", e))
        }
    }
}

/// Get recent jobs from database
///
/// Returns the most recent jobs, sorted by score (descending).
#[tauri::command]
pub async fn get_recent_jobs(
    limit: usize,
    state: State<'_, AppState>,
) -> Result<Vec<Value>, String> {
    tracing::info!("Command: get_recent_jobs (limit: {})", limit);

    match state.database.get_recent_jobs(limit as i64).await {
        Ok(jobs) => {
            let jobs_json: Vec<Value> = jobs
                .into_iter()
                .filter_map(|job| {
                    serde_json::to_value(&job)
                        .map_err(|e| {
                            tracing::error!("Failed to serialize job {}: {}", job.id, e);
                            e
                        })
                        .ok()
                })
                .collect();

            Ok(jobs_json)
        }
        Err(e) => {
            tracing::error!("Failed to get recent jobs: {}", e);
            Err(user_friendly_error("Failed to load jobs", e))
        }
    }
}

/// Get job by ID
#[tauri::command]
pub async fn get_job_by_id(id: i64, state: State<'_, AppState>) -> Result<Option<Value>, String> {
    tracing::info!("Command: get_job_by_id (id: {})", id);

    match state.database.get_job_by_id(id).await {
        Ok(job) => Ok(job.and_then(|j| {
            serde_json::to_value(&j)
                .map_err(|e| {
                    tracing::error!("Failed to serialize job {}: {}", j.id, e);
                    e
                })
                .ok()
        })),
        Err(e) => {
            tracing::error!("Failed to get job: {}", e);
            Err(user_friendly_error("Failed to load job details", e))
        }
    }
}

/// Search jobs with filter
#[tauri::command]
pub async fn search_jobs_query(
    query: String,
    limit: usize,
    state: State<'_, AppState>,
) -> Result<Vec<Value>, String> {
    tracing::info!(
        "Command: search_jobs_query (query: {}, limit: {})",
        query,
        limit
    );

    match state.database.search_jobs(&query, limit as i64).await {
        Ok(jobs) => {
            let jobs_json: Vec<Value> = jobs
                .into_iter()
                .filter_map(|job| {
                    serde_json::to_value(&job)
                        .map_err(|e| {
                            tracing::error!("Failed to serialize job {}: {}", job.id, e);
                            e
                        })
                        .ok()
                })
                .collect();

            Ok(jobs_json)
        }
        Err(e) => {
            tracing::error!("Search failed: {}", e);
            Err(user_friendly_error("Database operation failed", e))
        }
    }
}

/// Hide a job (mark as dismissed by user)
#[tauri::command]
pub async fn hide_job(id: i64, state: State<'_, AppState>) -> Result<(), String> {
    tracing::info!("Command: hide_job (id: {})", id);

    match state.database.hide_job(id).await {
        Ok(_) => {
            tracing::info!("Job {} hidden successfully", id);
            Ok(())
        }
        Err(e) => {
            tracing::error!("Failed to hide job: {}", e);
            Err(user_friendly_error("Database operation failed", e))
        }
    }
}

/// Unhide a job (restore to visible)
#[tauri::command]
pub async fn unhide_job(id: i64, state: State<'_, AppState>) -> Result<(), String> {
    tracing::info!("Command: unhide_job (id: {})", id);

    match state.database.unhide_job(id).await {
        Ok(_) => {
            tracing::info!("Job {} unhidden successfully", id);
            Ok(())
        }
        Err(e) => {
            tracing::error!("Failed to unhide job: {}", e);
            Err(user_friendly_error("Database operation failed", e))
        }
    }
}

/// Toggle bookmark status for a job
#[tauri::command]
pub async fn toggle_bookmark(id: i64, state: State<'_, AppState>) -> Result<bool, String> {
    tracing::info!("Command: toggle_bookmark (id: {})", id);

    match state.database.toggle_bookmark(id).await {
        Ok(new_state) => {
            tracing::info!("Job {} bookmark toggled to {}", id, new_state);
            Ok(new_state)
        }
        Err(e) => {
            tracing::error!("Failed to toggle bookmark: {}", e);
            Err(user_friendly_error("Database operation failed", e))
        }
    }
}

/// Get bookmarked jobs
#[tauri::command]
pub async fn get_bookmarked_jobs(
    limit: usize,
    state: State<'_, AppState>,
) -> Result<Vec<Value>, String> {
    tracing::info!("Command: get_bookmarked_jobs (limit: {})", limit);

    match state.database.get_bookmarked_jobs(limit as i64).await {
        Ok(jobs) => {
            let jobs_json: Vec<Value> = jobs
                .into_iter()
                .filter_map(|job| {
                    serde_json::to_value(&job)
                        .map_err(|e| {
                            tracing::error!("Failed to serialize job {}: {}", job.id, e);
                            e
                        })
                        .ok()
                })
                .collect();

            Ok(jobs_json)
        }
        Err(e) => {
            tracing::error!("Failed to get bookmarked jobs: {}", e);
            Err(user_friendly_error("Database operation failed", e))
        }
    }
}

/// Set notes for a job
#[tauri::command]
pub async fn set_job_notes(
    id: i64,
    notes: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    tracing::info!(
        "Command: set_job_notes (id: {}, has_notes: {})",
        id,
        notes.is_some()
    );

    match state.database.set_job_notes(id, notes.as_deref()).await {
        Ok(_) => {
            tracing::info!("Notes saved for job {}", id);
            Ok(())
        }
        Err(e) => {
            tracing::error!("Failed to save notes: {}", e);
            Err(user_friendly_error("Database operation failed", e))
        }
    }
}

/// Get notes for a job
#[tauri::command]
pub async fn get_job_notes(id: i64, state: State<'_, AppState>) -> Result<Option<String>, String> {
    tracing::info!("Command: get_job_notes (id: {})", id);

    match state.database.get_job_notes(id).await {
        Ok(notes) => Ok(notes),
        Err(e) => {
            tracing::error!("Failed to get notes: {}", e);
            Err(user_friendly_error("Database operation failed", e))
        }
    }
}

/// Get application statistics
#[tauri::command]
pub async fn get_statistics(state: State<'_, AppState>) -> Result<Value, String> {
    tracing::info!("Command: get_statistics");

    match state.database.get_statistics().await {
        Ok(stats) => {
            serde_json::to_value(&stats).map_err(|e| format!("Failed to serialize stats: {}", e))
        }
        Err(e) => {
            tracing::error!("Failed to get statistics: {}", e);
            Err(user_friendly_error("Database operation failed", e))
        }
    }
}

/// Get scraping status
#[tauri::command]
pub async fn get_scraping_status(state: State<'_, AppState>) -> Result<Value, String> {
    tracing::info!("Command: get_scraping_status");

    let status = state.scheduler_status.read().await;

    Ok(serde_json::json!({
        "is_running": status.is_running,
        "last_scrape": status.last_run.map(|dt| dt.to_rfc3339()),
        "next_scrape": status.next_run.map(|dt| dt.to_rfc3339()),
        "interval_hours": state.config.scraping_interval_hours,
    }))
}

/// Find duplicate job groups (same title + company from different sources)
#[tauri::command]
pub async fn find_duplicates(state: State<'_, AppState>) -> Result<Vec<DuplicateGroup>, String> {
    tracing::info!("Command: find_duplicates");

    state
        .database
        .find_duplicate_groups()
        .await
        .map_err(|e| format!("Database error: {}", e))
}

/// Merge duplicate jobs: keep primary, hide duplicates
#[tauri::command]
pub async fn merge_duplicates(
    primary_id: i64,
    duplicate_ids: Vec<i64>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    tracing::info!(
        "Command: merge_duplicates (primary: {}, duplicates: {:?})",
        primary_id,
        duplicate_ids
    );

    state
        .database
        .merge_duplicates(primary_id, &duplicate_ids)
        .await
        .map_err(|e| format!("Database error: {}", e))
}

/// Job count by source for analytics
#[derive(serde::Serialize)]
pub struct JobsBySource {
    pub source: String,
    pub count: i64,
}

/// Get job counts grouped by source
#[tauri::command]
pub async fn get_jobs_by_source(state: State<'_, AppState>) -> Result<Vec<JobsBySource>, String> {
    tracing::info!("Command: get_jobs_by_source");

    state
        .database
        .get_job_counts_by_source()
        .await
        .map(|rows| {
            rows.into_iter()
                .map(|(source, count)| JobsBySource { source, count })
                .collect()
        })
        .map_err(|e| format!("Database error: {}", e))
}

/// Salary range for analytics
#[derive(serde::Serialize)]
pub struct SalaryRange {
    pub range: String,
    pub count: i64,
}

/// Get salary distribution (jobs grouped by salary ranges)
#[tauri::command]
pub async fn get_salary_distribution(
    state: State<'_, AppState>,
) -> Result<Vec<SalaryRange>, String> {
    tracing::info!("Command: get_salary_distribution");

    state
        .database
        .get_salary_distribution()
        .await
        .map(|rows| {
            rows.into_iter()
                .map(|(range, count)| SalaryRange { range, count })
                .collect()
        })
        .map_err(|e| format!("Database error: {}", e))
}
