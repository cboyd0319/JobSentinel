//! Tauri commands for scraper health monitoring
//!
//! Provides frontend access to scraper health metrics, run history,
//! smoke tests, and credential health.

use crate::commands::errors::user_friendly_error;
use crate::commands::limits::validate_optional_command_limit_i32;
use crate::commands::AppState;
use crate::core::health::{
    check_linkedin_cookie_health, get_all_scraper_health,
    get_expiring_credentials as fetch_expiring_credentials, get_health_summary as health_summary,
    get_latest_source_request as latest_source_request, get_scraper_configs as scraper_configs,
    get_scraper_runs as scraper_runs, is_known_scraper_name,
    run_all_smoke_tests as all_smoke_tests, run_smoke_test, set_scraper_enabled as scraper_enabled,
    CredentialHealth, HealthSummary, ScraperConfig, ScraperHealthMetrics, ScraperRun,
    SmokeTestResult, SourceRequestSummary,
};
use tauri::State;

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
    state: State<'_, AppState>,
) -> Result<Vec<ScraperHealthMetrics>, String> {
    get_all_scraper_health(&state.database)
        .await
        .map_err(|e| health_command_error("Failed to load scraper health", e))
}

/// Get health summary statistics
#[tauri::command]
pub async fn get_health_summary(state: State<'_, AppState>) -> Result<HealthSummary, String> {
    health_summary(&state.database)
        .await
        .map_err(|e| health_command_error("Failed to load health summary", e))
}

/// Get scraper configuration
#[tauri::command]
pub async fn get_scraper_configs(state: State<'_, AppState>) -> Result<Vec<ScraperConfig>, String> {
    scraper_configs(&state.database)
        .await
        .map_err(|e| health_command_error("Failed to load scraper configuration", e))
}

/// Enable or disable a scraper
#[tauri::command]
pub async fn set_scraper_enabled(
    state: State<'_, AppState>,
    scraper_name: String,
    enabled: bool,
) -> Result<(), String> {
    validate_scraper_name(&scraper_name)?;
    scraper_enabled(&state.database, &scraper_name, enabled)
        .await
        .map_err(|e| health_command_error("Failed to update scraper configuration", e))
}

/// Get recent runs for a specific scraper
#[tauri::command]
pub async fn get_scraper_runs(
    state: State<'_, AppState>,
    scraper_name: String,
    limit: Option<i32>,
) -> Result<Vec<ScraperRun>, String> {
    validate_scraper_name(&scraper_name)?;
    let limit = validate_optional_command_limit_i32(limit, 20)?;
    scraper_runs(&state.database, &scraper_name, limit)
        .await
        .map_err(|e| health_command_error("Failed to load scraper run history", e))
}

/// Get the latest minimized request record for an optional external source.
#[tauri::command]
pub async fn get_latest_source_request(
    state: State<'_, AppState>,
    source: String,
) -> Result<Option<SourceRequestSummary>, String> {
    validate_scraper_name(&source)?;
    latest_source_request(&state.database, &source)
        .await
        .map_err(|e| health_command_error("Failed to load source request history", e))
}

/// Run a smoke test for a specific scraper
#[tauri::command]
pub async fn run_scraper_smoke_test(
    state: State<'_, AppState>,
    scraper_name: String,
) -> Result<SmokeTestResult, String> {
    validate_scraper_name(&scraper_name)?;
    let config = state.config.read().await.clone();
    run_smoke_test(&state.database, &config, &scraper_name)
        .await
        .map_err(|e| health_command_error("Failed to run scraper smoke test", e))
}

/// Run smoke tests for all scrapers
#[tauri::command]
pub async fn run_all_smoke_tests(
    state: State<'_, AppState>,
) -> Result<Vec<SmokeTestResult>, String> {
    let config = state.config.read().await.clone();
    all_smoke_tests(&state.database, &config)
        .await
        .map_err(|e| health_command_error("Failed to run scraper smoke tests", e))
}

/// Get inactive legacy LinkedIn credential status.
#[tauri::command]
pub async fn get_linkedin_cookie_health(
    state: State<'_, AppState>,
) -> Result<CredentialHealth, String> {
    check_linkedin_cookie_health(&state.database)
        .await
        .map_err(|e| health_command_error("Failed to load credential health", e))
}

/// Get all credentials that are expiring soon
#[tauri::command]
pub async fn get_expiring_credentials(
    state: State<'_, AppState>,
) -> Result<Vec<CredentialHealth>, String> {
    fetch_expiring_credentials(&state.database)
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
