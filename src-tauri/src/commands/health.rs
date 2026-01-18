//! Tauri commands for scraper health monitoring
//!
//! Provides frontend access to scraper health metrics, run history,
//! smoke tests, and credential health.

use crate::core::health::{
    check_linkedin_cookie_health, get_all_scraper_health,
    get_expiring_credentials as fetch_expiring_credentials, get_health_summary as health_summary,
    get_scraper_configs as scraper_configs, get_scraper_runs as scraper_runs,
    run_all_smoke_tests as all_smoke_tests, run_smoke_test, set_scraper_enabled as scraper_enabled,
    CredentialHealth, HealthSummary, ScraperConfig, ScraperHealthMetrics, ScraperRun,
    SmokeTestResult,
};
use crate::core::{Config, Database};
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

/// Get health metrics for all scrapers
#[tauri::command]
pub async fn get_scraper_health(
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<Vec<ScraperHealthMetrics>, String> {
    let db = db.lock().await;
    get_all_scraper_health(&db).await.map_err(|e| e.to_string())
}

/// Get health summary statistics
#[tauri::command]
pub async fn get_health_summary(
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<HealthSummary, String> {
    let db = db.lock().await;
    health_summary(&db).await.map_err(|e| e.to_string())
}

/// Get scraper configuration
#[tauri::command]
pub async fn get_scraper_configs(
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<Vec<ScraperConfig>, String> {
    let db = db.lock().await;
    scraper_configs(&db).await.map_err(|e| e.to_string())
}

/// Enable or disable a scraper
#[tauri::command]
pub async fn set_scraper_enabled(
    db: State<'_, Arc<Mutex<Database>>>,
    scraper_name: String,
    enabled: bool,
) -> Result<(), String> {
    let db = db.lock().await;
    scraper_enabled(&db, &scraper_name, enabled)
        .await
        .map_err(|e| e.to_string())
}

/// Get recent runs for a specific scraper
#[tauri::command]
pub async fn get_scraper_runs(
    db: State<'_, Arc<Mutex<Database>>>,
    scraper_name: String,
    limit: Option<i32>,
) -> Result<Vec<ScraperRun>, String> {
    let db = db.lock().await;
    scraper_runs(&db, &scraper_name, limit.unwrap_or(20))
        .await
        .map_err(|e| e.to_string())
}

/// Run a smoke test for a specific scraper
#[tauri::command]
pub async fn run_scraper_smoke_test(
    db: State<'_, Arc<Mutex<Database>>>,
    config: State<'_, Arc<Config>>,
    scraper_name: String,
) -> Result<SmokeTestResult, String> {
    let db = db.lock().await;
    run_smoke_test(&db, &config, &scraper_name)
        .await
        .map_err(|e| e.to_string())
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
        .map_err(|e| e.to_string())
}

/// Get LinkedIn cookie health status
#[tauri::command]
pub async fn get_linkedin_cookie_health(
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<CredentialHealth, String> {
    let db = db.lock().await;
    check_linkedin_cookie_health(&db)
        .await
        .map_err(|e| e.to_string())
}

/// Get all credentials that are expiring soon
#[tauri::command]
pub async fn get_expiring_credentials(
    db: State<'_, Arc<Mutex<Database>>>,
) -> Result<Vec<CredentialHealth>, String> {
    let db = db.lock().await;
    fetch_expiring_credentials(&db)
        .await
        .map_err(|e| e.to_string())
}
