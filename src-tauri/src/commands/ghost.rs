//! Ghost job detection Tauri commands (v1.4)
//!
//! Commands for identifying and filtering ghost/fake job postings.

use crate::commands::AppState;
use crate::core::ghost::GhostConfig;
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

/// Get current ghost detection configuration
#[tauri::command]
pub async fn get_ghost_config(state: State<'_, AppState>) -> Result<Value, String> {
    tracing::info!("Command: get_ghost_config");

    // Get from main config, or use default if not present
    let ghost_config = state
        .config
        .ghost_config
        .clone()
        .unwrap_or_else(GhostConfig::default);

    serde_json::to_value(&ghost_config)
        .map_err(|e| format!("Failed to serialize ghost config: {}", e))
}

/// Update ghost detection configuration
#[tauri::command]
pub async fn set_ghost_config(config: Value, _state: State<'_, AppState>) -> Result<(), String> {
    tracing::info!("Command: set_ghost_config");

    // Parse GhostConfig from JSON
    let ghost_config: GhostConfig =
        serde_json::from_value(config).map_err(|e| format!("Invalid ghost config: {}", e))?;

    // Validate ranges
    if ghost_config.stale_threshold_days < 1 {
        return Err("stale_threshold_days must be >= 1".to_string());
    }
    if ghost_config.repost_threshold < 1 {
        return Err("repost_threshold must be >= 1".to_string());
    }
    if ghost_config.min_description_length < 50 {
        return Err("min_description_length must be >= 50".to_string());
    }
    if !(0.0..=1.0).contains(&ghost_config.warning_threshold) {
        return Err("warning_threshold must be between 0.0 and 1.0".to_string());
    }
    if !(0.0..=1.0).contains(&ghost_config.hide_threshold) {
        return Err("hide_threshold must be between 0.0 and 1.0".to_string());
    }
    if ghost_config.warning_threshold >= ghost_config.hide_threshold {
        return Err("warning_threshold must be less than hide_threshold".to_string());
    }

    // Load current config
    let config_path = crate::core::config::Config::default_path();
    let mut current_config = if config_path.exists() {
        crate::core::config::Config::load(&config_path)
            .map_err(|e| format!("Failed to load config: {}", e))?
    } else {
        return Err("Configuration not initialized".to_string());
    };

    // Update ghost config
    current_config.ghost_config = Some(ghost_config);

    // Save to file
    current_config
        .save(&config_path)
        .map_err(|e| format!("Failed to save config: {}", e))?;

    tracing::info!("Ghost detection config updated successfully");
    Ok(())
}

/// Reset ghost detection configuration to defaults
#[tauri::command]
pub async fn reset_ghost_config(_state: State<'_, AppState>) -> Result<(), String> {
    tracing::info!("Command: reset_ghost_config");

    // Load current config
    let config_path = crate::core::config::Config::default_path();
    let mut current_config = if config_path.exists() {
        crate::core::config::Config::load(&config_path)
            .map_err(|e| format!("Failed to load config: {}", e))?
    } else {
        return Err("Configuration not initialized".to_string());
    };

    // Reset to default
    current_config.ghost_config = Some(GhostConfig::default());

    // Save to file
    current_config
        .save(&config_path)
        .map_err(|e| format!("Failed to save config: {}", e))?;

    tracing::info!("Ghost detection config reset to defaults");
    Ok(())
}

// ============================================================================
// User Feedback Commands
// ============================================================================

/// Mark a job as real (user confirms it's not a ghost job)
#[tauri::command]
pub async fn mark_job_as_real(job_id: i64, state: State<'_, AppState>) -> Result<(), String> {
    tracing::info!("Command: mark_job_as_real (job_id: {})", job_id);

    state.database.mark_job_as_real(job_id).await.map_err(|e| {
        tracing::error!("Failed to mark job as real: {}", e);
        format!("Database error: {}", e)
    })
}

/// Mark a job as ghost (user confirms it's a fake/ghost job)
#[tauri::command]
pub async fn mark_job_as_ghost(job_id: i64, state: State<'_, AppState>) -> Result<(), String> {
    tracing::info!("Command: mark_job_as_ghost (job_id: {})", job_id);

    state.database.mark_job_as_ghost(job_id).await.map_err(|e| {
        tracing::error!("Failed to mark job as ghost: {}", e);
        format!("Database error: {}", e)
    })
}

/// Get user's verdict for a job
///
/// Returns: "real", "ghost", or null if no feedback given
#[tauri::command]
pub async fn get_ghost_feedback(
    job_id: i64,
    state: State<'_, AppState>,
) -> Result<Option<String>, String> {
    tracing::info!("Command: get_ghost_feedback (job_id: {})", job_id);

    state
        .database
        .get_ghost_feedback(job_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to get ghost feedback: {}", e);
            format!("Database error: {}", e)
        })
}

/// Clear user feedback for a job
#[tauri::command]
pub async fn clear_ghost_feedback(job_id: i64, state: State<'_, AppState>) -> Result<(), String> {
    tracing::info!("Command: clear_ghost_feedback (job_id: {})", job_id);

    state
        .database
        .clear_ghost_feedback(job_id)
        .await
        .map_err(|e| {
            tracing::error!("Failed to clear ghost feedback: {}", e);
            format!("Database error: {}", e)
        })
}
