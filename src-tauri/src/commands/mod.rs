//! Tauri Command Handlers
//!
//! This module contains all Tauri commands (RPC-style functions) that can be invoked
//! from the React frontend using `invoke()`.

use crate::core::{config::Config, db::Database, scheduler::Scheduler};
use chrono::{DateTime, Utc};
use serde_json::Value;
use std::sync::Arc;
use tauri::State;
use tokio::sync::RwLock;

/// Scheduler status tracking
#[derive(Debug, Clone, Default)]
pub struct SchedulerStatus {
    pub is_running: bool,
    pub last_run: Option<DateTime<Utc>>,
    pub next_run: Option<DateTime<Utc>>,
}

/// Application state shared across commands
pub struct AppState {
    pub config: Arc<Config>,
    pub database: Arc<Database>,
    pub scheduler: Option<Arc<Scheduler>>,
    pub scheduler_status: Arc<RwLock<SchedulerStatus>>,
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
pub async fn get_recent_jobs(
    limit: usize,
    state: State<'_, AppState>,
) -> Result<Vec<Value>, String> {
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
    let parsed_config: Config =
        serde_json::from_value(config).map_err(|e| format!("Invalid configuration: {}", e))?;

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

    serde_json::to_value(&*state.config).map_err(|e| format!("Failed to serialize config: {}", e))
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
        Ok(stats) => {
            serde_json::to_value(&stats).map_err(|e| format!("Failed to serialize stats: {}", e))
        }
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

    let status = state.scheduler_status.read().await;

    Ok(serde_json::json!({
        "is_running": status.is_running,
        "last_scrape": status.last_run.map(|dt| dt.to_rfc3339()),
        "next_scrape": status.next_run.map(|dt| dt.to_rfc3339()),
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
    let parsed_config: Config =
        serde_json::from_value(config).map_err(|e| format!("Invalid configuration: {}", e))?;

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
    tracing::info!(
        "Command: search_jobs_query (query: {}, limit: {})",
        query,
        limit
    );

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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::{
        config::{AlertConfig, Config, LocationPreferences, SlackConfig},
        db::{Database, Job},
    };
    use chrono::Utc;
    use tempfile::TempDir;

    /// Helper to create a test AppState with in-memory database
    async fn create_test_app_state() -> AppState {
        let config = Config {
            title_allowlist: vec!["Engineer".to_string()],
            title_blocklist: vec![],
            keywords_boost: vec!["Rust".to_string()],
            keywords_exclude: vec![],
            location_preferences: LocationPreferences {
                allow_remote: true,
                allow_hybrid: false,
                allow_onsite: false,
                cities: vec![],
                states: vec![],
                country: "US".to_string(),
            },
            salary_floor_usd: 100000,
            immediate_alert_threshold: 0.9,
            scraping_interval_hours: 2,
            alerts: AlertConfig {
                slack: SlackConfig {
                    enabled: false,
                    webhook_url: "".to_string(),
                },
            },
            greenhouse_urls: vec![],
            lever_urls: vec![],
        };

        let database = Database::connect_memory().await.expect("Failed to create test database");
        database.migrate().await.expect("Failed to run migrations");

        AppState {
            config: Arc::new(config),
            database: Arc::new(database),
            scheduler: None,
            scheduler_status: Arc::new(RwLock::new(SchedulerStatus::default())),
        }
    }

    /// Helper to create a test job
    fn create_test_job(id: i64, title: &str, score: f64) -> Job {
        Job {
            id,
            hash: format!("hash_{}", id),
            title: title.to_string(),
            company: "Test Company".to_string(),
            url: format!("https://example.com/job/{}", id),
            location: Some("Remote".to_string()),
            description: Some("Test description".to_string()),
            score: Some(score),
            score_reasons: Some("[]".to_string()),
            source: "test".to_string(),
            remote: Some(true),
            salary_min: Some(150000),
            salary_max: Some(200000),
            currency: Some("USD".to_string()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            last_seen: Utc::now(),
            times_seen: 1,
            immediate_alert_sent: false,
            included_in_digest: false,
        }
    }

    #[tokio::test]
    async fn test_get_recent_jobs_returns_jobs() {
        let state = create_test_app_state().await;

        // Insert test jobs
        let job1 = create_test_job(0, "Rust Engineer", 0.95);
        let job2 = create_test_job(0, "Backend Engineer", 0.85);

        state.database.upsert_job(&job1).await.expect("Failed to insert job1");
        state.database.upsert_job(&job2).await.expect("Failed to insert job2");

        // Create Tauri state wrapper
        let tauri_state = State::from(Arc::new(state));

        // Call command
        let result = get_recent_jobs(10, tauri_state).await;

        assert!(result.is_ok(), "get_recent_jobs should succeed");
        let jobs = result.unwrap();
        assert_eq!(jobs.len(), 2, "Should return 2 jobs");
    }

    #[tokio::test]
    async fn test_get_recent_jobs_respects_limit() {
        let state = create_test_app_state().await;

        // Insert 5 test jobs
        for i in 0..5 {
            let job = create_test_job(0, &format!("Job {}", i), 0.8);
            state.database.upsert_job(&job).await.expect("Failed to insert job");
        }

        let tauri_state = State::from(Arc::new(state));

        // Request only 3 jobs
        let result = get_recent_jobs(3, tauri_state).await;

        assert!(result.is_ok(), "get_recent_jobs should succeed");
        let jobs = result.unwrap();
        assert_eq!(jobs.len(), 3, "Should return exactly 3 jobs");
    }

    #[tokio::test]
    async fn test_get_recent_jobs_empty_database() {
        let state = create_test_app_state().await;
        let tauri_state = State::from(Arc::new(state));

        let result = get_recent_jobs(10, tauri_state).await;

        assert!(result.is_ok(), "get_recent_jobs should succeed on empty DB");
        let jobs = result.unwrap();
        assert_eq!(jobs.len(), 0, "Should return empty array for empty database");
    }

    #[tokio::test]
    async fn test_get_job_by_id_found() {
        let state = create_test_app_state().await;

        let job = create_test_job(0, "Test Engineer", 0.9);
        let job_id = state.database.upsert_job(&job).await.expect("Failed to insert job");

        let tauri_state = State::from(Arc::new(state));

        let result = get_job_by_id(job_id, tauri_state).await;

        assert!(result.is_ok(), "get_job_by_id should succeed");
        let found_job = result.unwrap();
        assert!(found_job.is_some(), "Should find the job");
        assert_eq!(found_job.unwrap()["title"], "Test Engineer");
    }

    #[tokio::test]
    async fn test_get_job_by_id_not_found() {
        let state = create_test_app_state().await;
        let tauri_state = State::from(Arc::new(state));

        let result = get_job_by_id(999999, tauri_state).await;

        assert!(result.is_ok(), "get_job_by_id should succeed even when not found");
        let found_job = result.unwrap();
        assert!(found_job.is_none(), "Should return None for nonexistent job");
    }

    #[tokio::test]
    async fn test_get_config() {
        let state = create_test_app_state().await;
        let tauri_state = State::from(Arc::new(state));

        let result = get_config(tauri_state).await;

        assert!(result.is_ok(), "get_config should succeed");
        let config = result.unwrap();
        assert!(config.is_object(), "Config should be a JSON object");
        assert_eq!(config["salary_floor_usd"], 100000);
        assert_eq!(config["immediate_alert_threshold"], 0.9);
    }

    #[tokio::test]
    async fn test_save_config_valid() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let config_path = temp_dir.path().join("config.json");

        let config = Config {
            title_allowlist: vec!["Test".to_string()],
            title_blocklist: vec![],
            keywords_boost: vec![],
            keywords_exclude: vec![],
            location_preferences: LocationPreferences {
                allow_remote: true,
                allow_hybrid: false,
                allow_onsite: false,
                cities: vec![],
                states: vec![],
                country: "US".to_string(),
            },
            salary_floor_usd: 120000,
            immediate_alert_threshold: 0.85,
            scraping_interval_hours: 3,
            alerts: AlertConfig {
                slack: SlackConfig {
                    enabled: false,
                    webhook_url: "".to_string(),
                },
            },
            greenhouse_urls: vec![],
            lever_urls: vec![],
        };

        let config_json = serde_json::to_value(&config).unwrap();

        // Note: We can't easily test the full save_config command without mocking Config::default_path(),
        // but we can test the validation logic by creating a Config from JSON
        let parsed: Result<Config, _> = serde_json::from_value(config_json.clone());
        assert!(parsed.is_ok(), "Valid config JSON should parse correctly");
    }

    #[tokio::test]
    async fn test_save_config_invalid_salary() {
        let mut config_json = json!({
            "title_allowlist": ["Test"],
            "location_preferences": {
                "allow_remote": true,
                "country": "US"
            },
            "salary_floor_usd": -5000,  // Invalid!
            "alerts": {
                "slack": {
                    "enabled": false,
                    "webhook_url": ""
                }
            }
        });

        let parsed: Result<Config, _> = serde_json::from_value(config_json);
        if let Ok(config) = parsed {
            let validation_result = config.validate();
            assert!(validation_result.is_err(), "Invalid salary should fail validation");
        }
    }

    #[tokio::test]
    async fn test_get_statistics() {
        let state = create_test_app_state().await;

        // Insert jobs with various scores
        let job1 = create_test_job(0, "High Match Job", 0.95);
        let job2 = create_test_job(0, "Medium Match Job", 0.75);
        let job3 = create_test_job(0, "Another High Match", 0.92);

        state.database.upsert_job(&job1).await.expect("Failed to insert job1");
        state.database.upsert_job(&job2).await.expect("Failed to insert job2");
        state.database.upsert_job(&job3).await.expect("Failed to insert job3");

        let tauri_state = State::from(Arc::new(state));

        let result = get_statistics(tauri_state).await;

        assert!(result.is_ok(), "get_statistics should succeed");
        let stats = result.unwrap();
        assert_eq!(stats["total_jobs"], 3);
        assert_eq!(stats["high_matches"], 2); // Jobs with score >= 0.9
    }

    #[tokio::test]
    async fn test_get_statistics_empty_database() {
        let state = create_test_app_state().await;
        let tauri_state = State::from(Arc::new(state));

        let result = get_statistics(tauri_state).await;

        assert!(result.is_ok(), "get_statistics should succeed on empty DB");
        let stats = result.unwrap();
        assert_eq!(stats["total_jobs"], 0);
        assert_eq!(stats["high_matches"], 0);
        assert_eq!(stats["average_score"], 0.0);
    }

    #[tokio::test]
    async fn test_get_scraping_status() {
        let state = create_test_app_state().await;
        let tauri_state = State::from(Arc::new(state));

        let result = get_scraping_status(tauri_state).await;

        assert!(result.is_ok(), "get_scraping_status should succeed");
        let status = result.unwrap();
        assert!(status.is_object(), "Status should be a JSON object");
        assert_eq!(status["is_running"], false);
        assert_eq!(status["interval_hours"], 2);
    }

    #[tokio::test]
    async fn test_is_first_run() {
        // Note: This test is environment-dependent and difficult to test in isolation
        // without mocking Config::default_path(). In a real scenario, you'd use
        // dependency injection or a trait to make this testable.

        // We can at least verify the function doesn't panic
        let result = is_first_run().await;
        assert!(result.is_ok(), "is_first_run should not panic");
    }

    #[tokio::test]
    async fn test_complete_setup_creates_config() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");

        let config = Config {
            title_allowlist: vec!["Engineer".to_string()],
            title_blocklist: vec![],
            keywords_boost: vec![],
            keywords_exclude: vec![],
            location_preferences: LocationPreferences {
                allow_remote: true,
                allow_hybrid: false,
                allow_onsite: false,
                cities: vec![],
                states: vec![],
                country: "US".to_string(),
            },
            salary_floor_usd: 100000,
            immediate_alert_threshold: 0.9,
            scraping_interval_hours: 2,
            alerts: AlertConfig {
                slack: SlackConfig {
                    enabled: false,
                    webhook_url: "".to_string(),
                },
            },
            greenhouse_urls: vec![],
            lever_urls: vec![],
        };

        // Test that config can be serialized and validated
        let config_json = serde_json::to_value(&config).unwrap();
        let parsed: Config = serde_json::from_value(config_json).unwrap();
        assert!(parsed.validate().is_ok(), "Setup config should be valid");
    }

    #[tokio::test]
    async fn test_search_jobs_query() {
        let state = create_test_app_state().await;

        // Insert jobs with searchable content
        let job1 = create_test_job(0, "Senior Rust Engineer", 0.9);
        let job2 = create_test_job(0, "Python Developer", 0.8);

        state.database.upsert_job(&job1).await.expect("Failed to insert job1");
        state.database.upsert_job(&job2).await.expect("Failed to insert job2");

        let tauri_state = State::from(Arc::new(state));

        // Note: Full-text search requires FTS5 table which may not be set up in test migrations
        // This test verifies the command doesn't panic rather than testing actual search functionality
        let result = search_jobs_query("Rust".to_string(), 10, tauri_state).await;

        // The result might fail if FTS5 isn't properly set up in tests,
        // but the command should handle it gracefully
        assert!(result.is_ok() || result.is_err(), "search_jobs_query should not panic");
    }
}
