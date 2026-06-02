//! Tauri commands for scraper health monitoring
//!
//! Provides frontend access to scraper health metrics, run history,
//! smoke tests, and credential health.

use crate::commands::errors::user_friendly_error;
use crate::commands::limits::validate_optional_command_limit_i32;
use crate::core::health::{
    check_linkedin_cookie_health, get_all_scraper_health,
    get_expiring_credentials as fetch_expiring_credentials, get_health_summary as health_summary,
    get_latest_source_request as latest_source_request, get_scraper_configs as scraper_configs,
    get_scraper_runs as scraper_runs, is_known_scraper_name,
    run_all_smoke_tests as all_smoke_tests, run_smoke_test, set_scraper_enabled as scraper_enabled,
    CredentialHealth, HealthSummary, ScraperConfig, ScraperHealthMetrics, ScraperRun,
    SmokeTestResult, SourceRequestSummary,
};
use crate::core::{Config, Database};
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

fn health_command_error(context: &str, error: anyhow::Error) -> String {
    user_friendly_error(context, error)
}

fn validate_scraper_name(scraper_name: &str) -> Result<(), String> {
    if is_known_scraper_name(scraper_name) {
        Ok(())
    } else {
        Err("Unknown scraper".to_string())
    }
}

/// Get health metrics for all scrapers
#[tauri::command]
pub async fn get_scraper_health(
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<Vec<ScraperHealthMetrics>, String> {
    let db = db.lock().await;
    get_all_scraper_health(&db)
        .await
        .map_err(|e| health_command_error("Failed to load scraper health", e))
}

/// Get health summary statistics
#[tauri::command]
pub async fn get_health_summary(
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<HealthSummary, String> {
    let db = db.lock().await;
    health_summary(&db)
        .await
        .map_err(|e| health_command_error("Failed to load health summary", e))
}

/// Get scraper configuration
#[tauri::command]
pub async fn get_scraper_configs(
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<Vec<ScraperConfig>, String> {
    let db = db.lock().await;
    scraper_configs(&db)
        .await
        .map_err(|e| health_command_error("Failed to load scraper configuration", e))
}

/// Enable or disable a scraper
#[tauri::command]
pub async fn set_scraper_enabled(
    db: State<'_, Arc<Mutex<Database>>>,
    scraper_name: String,
    enabled: bool,
) -> Result<(), String> {
    validate_scraper_name(&scraper_name)?;
    let db = db.lock().await;
    scraper_enabled(&db, &scraper_name, enabled)
        .await
        .map_err(|e| health_command_error("Failed to update scraper configuration", e))
}

/// Get recent runs for a specific scraper
#[tauri::command]
pub async fn get_scraper_runs(
    db: State<'_, Arc<Mutex<Database>>>,
    scraper_name: String,
    limit: Option<i32>,
) -> Result<Vec<ScraperRun>, String> {
    validate_scraper_name(&scraper_name)?;
    let limit = validate_optional_command_limit_i32(limit, 20)?;
    let db = db.lock().await;
    scraper_runs(&db, &scraper_name, limit)
        .await
        .map_err(|e| health_command_error("Failed to load scraper run history", e))
}

/// Get the latest minimized request record for an optional external source.
#[tauri::command]
pub async fn get_latest_source_request(
    db: State<'_, Arc<Mutex<Database>>>,
    source: String,
) -> Result<Option<SourceRequestSummary>, String> {
    validate_scraper_name(&source)?;
    let db = db.lock().await;
    latest_source_request(&db, &source)
        .await
        .map_err(|e| health_command_error("Failed to load source request history", e))
}

/// Run a smoke test for a specific scraper
#[tauri::command]
pub async fn run_scraper_smoke_test(
    db: State<'_, Arc<Mutex<Database>>>,
    config: State<'_, Arc<Config>>,
    scraper_name: String,
) -> Result<SmokeTestResult, String> {
    validate_scraper_name(&scraper_name)?;
    let db = db.lock().await;
    run_smoke_test(&db, &config, &scraper_name)
        .await
        .map_err(|e| health_command_error("Failed to run scraper smoke test", e))
}

/// Run smoke tests for all scrapers
#[tauri::command]
pub async fn run_all_smoke_tests(
    db: State<'_, Arc<Mutex<Database>>>,
    config: State<'_, Arc<Config>>,
) -> Result<Vec<SmokeTestResult>, String> {
    let db = db.lock().await;
    all_smoke_tests(&db, &config)
        .await
        .map_err(|e| health_command_error("Failed to run scraper smoke tests", e))
}

/// Get inactive legacy LinkedIn credential status.
#[tauri::command]
pub async fn get_linkedin_cookie_health(
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<CredentialHealth, String> {
    let db = db.lock().await;
    check_linkedin_cookie_health(&db)
        .await
        .map_err(|e| health_command_error("Failed to load credential health", e))
}

/// Get all credentials that are expiring soon
#[tauri::command]
pub async fn get_expiring_credentials(
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<Vec<CredentialHealth>, String> {
    let db = db.lock().await;
    fetch_expiring_credentials(&db)
        .await
        .map_err(|e| health_command_error("Failed to load expiring credentials", e))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_scraper_name_omits_raw_input() {
        let err = validate_scraper_name("bad-scraper-with-token=secret").unwrap_err();
        assert_eq!(err, "Unknown scraper");
        assert!(!err.contains("secret"));
    }

    #[test]
    fn test_health_command_error_omits_raw_sql() {
        let msg = health_command_error(
            "Failed to load scraper health",
            anyhow::anyhow!("SELECT * FROM scraper_runs WHERE token = 'secret'"),
        );

        assert!(msg.contains("Failed to load scraper health"));
        assert!(!msg.contains("SELECT"));
        assert!(!msg.contains("secret"));
    }
}
