//! Tauri Command Handlers
//!
//! This module contains all Tauri commands (RPC-style functions) that can be invoked
//! from the React frontend using `invoke()`.

use crate::core::{config::Config, db::Database, scheduler::Scheduler};
use serde_json::Value;
use std::sync::Arc;
use tauri::State;

/// Application state shared across commands
pub struct AppState {
    pub config: Arc<Config>,
    pub database: Arc<Database>,
    pub scheduler: Option<Arc<Scheduler>>,
}

/// Search for jobs from all enabled sources
///
/// This triggers a full scraping cycle across Greenhouse, Lever, and JobsWithGPT.
#[tauri::command]
pub async fn search_jobs(state: State<'_, AppState>) -> Result<Value, String> {
    tracing::info!("Command: search_jobs");

    // Create scheduler instance
    let scheduler = Scheduler::new(state.config.clone(), state.database.clone());

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
pub async fn get_recent_jobs(limit: usize, state: State<'_, AppState>) -> Result<Vec<Value>, String> {
    tracing::info!("Command: get_recent_jobs (limit: {})", limit);

    match state.database.get_recent_jobs(limit as i64).await {
        Ok(jobs) => {
            let jobs_json: Vec<Value> = jobs
                .into_iter()
                .map(|job| serde_json::to_value(&job).unwrap_or_default())
                .collect();

            Ok(jobs_json)
        }
        Err(e) => {
            tracing::error!("Failed to get recent jobs: {}", e);
            Err(format!("Database error: {}", e))
        }
    }
}

/// Get job by ID
#[tauri::command]
pub async fn get_job_by_id(id: i64, state: State<'_, AppState>) -> Result<Option<Value>, String> {
    tracing::info!("Command: get_job_by_id (id: {})", id);

    match state.database.get_job_by_id(id).await {
        Ok(job) => Ok(job.map(|j| serde_json::to_value(&j).unwrap_or_default())),
        Err(e) => {
            tracing::error!("Failed to get job: {}", e);
            Err(format!("Database error: {}", e))
        }
    }
}

/// Save user configuration
#[tauri::command]
pub async fn save_config(config: Value, _state: State<'_, AppState>) -> Result<(), String> {
    tracing::info!("Command: save_config");

    // Parse config from JSON
    let parsed_config: Config = serde_json::from_value(config)
        .map_err(|e| format!("Invalid configuration: {}", e))?;

    // Save to file
    let config_path = Config::default_path();
    parsed_config
        .save(&config_path)
        .map_err(|e| format!("Failed to save config: {}", e))?;

    tracing::info!("Configuration saved successfully");
    Ok(())
}

/// Get user configuration
#[tauri::command]
pub async fn get_config(state: State<'_, AppState>) -> Result<Value, String> {
    tracing::info!("Command: get_config");

    serde_json::to_value(&*state.config)
        .map_err(|e| format!("Failed to serialize config: {}", e))
}

/// Validate Slack webhook URL
#[tauri::command]
pub async fn validate_slack_webhook(webhook_url: String) -> Result<bool, String> {
    tracing::info!("Command: validate_slack_webhook");

    match crate::core::notify::slack::validate_webhook(&webhook_url).await {
        Ok(valid) => Ok(valid),
        Err(e) => {
            tracing::error!("Webhook validation failed: {}", e);
            Err(format!("Validation failed: {}", e))
        }
    }
}

/// Get application statistics
#[tauri::command]
pub async fn get_statistics(state: State<'_, AppState>) -> Result<Value, String> {
    tracing::info!("Command: get_statistics");

    match state.database.get_statistics().await {
        Ok(stats) => serde_json::to_value(&stats)
            .map_err(|e| format!("Failed to serialize stats: {}", e)),
        Err(e) => {
            tracing::error!("Failed to get statistics: {}", e);
            Err(format!("Database error: {}", e))
        }
    }
}

/// Get scraping status
#[tauri::command]
pub async fn get_scraping_status(state: State<'_, AppState>) -> Result<Value, String> {
    tracing::info!("Command: get_scraping_status");

    // TODO: Track last run time and next run time in state
    Ok(serde_json::json!({
        "is_running": false,
        "last_run": null,
        "next_run": null,
        "interval_hours": state.config.scraping_interval_hours,
    }))
}

/// Check if first-run setup is complete
#[tauri::command]
pub async fn is_first_run() -> Result<bool, String> {
    tracing::info!("Command: is_first_run");

    // Check if configuration file exists
    let config_path = Config::default_path();
    let first_run = !config_path.exists();

    tracing::info!("First run: {}", first_run);
    Ok(first_run)
}

/// Complete first-run setup
#[tauri::command]
pub async fn complete_setup(config: Value) -> Result<(), String> {
    tracing::info!("Command: complete_setup");

    // Parse config from JSON
    let parsed_config: Config = serde_json::from_value(config)
        .map_err(|e| format!("Invalid configuration: {}", e))?;

    // Ensure config directory exists
    let config_path = Config::default_path();
    if let Some(parent) = config_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }

    // Save configuration
    parsed_config
        .save(&config_path)
        .map_err(|e| format!("Failed to save config: {}", e))?;

    // Initialize database
    let db_path = Database::default_path();
    let database = Database::connect(&db_path)
        .await
        .map_err(|e| format!("Failed to connect to database: {}", e))?;

    database
        .migrate()
        .await
        .map_err(|e| format!("Failed to migrate database: {}", e))?;

    tracing::info!("Setup complete");
    Ok(())
}

/// Search jobs with filter
#[tauri::command]
pub async fn search_jobs_query(
    query: String,
    limit: usize,
    state: State<'_, AppState>,
) -> Result<Vec<Value>, String> {
    tracing::info!("Command: search_jobs_query (query: {}, limit: {})", query, limit);

    match state.database.search_jobs(&query, limit as i64).await {
        Ok(jobs) => {
            let jobs_json: Vec<Value> = jobs
                .into_iter()
                .map(|job| serde_json::to_value(&job).unwrap_or_default())
                .collect();

            Ok(jobs_json)
        }
        Err(e) => {
            tracing::error!("Search failed: {}", e);
            Err(format!("Database error: {}", e))
        }
    }
}
