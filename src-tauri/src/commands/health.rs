//! Tauri commands for scraper health monitoring
//!
//! Provides frontend access to scraper health metrics, run history,
//! smoke tests, and credential health.

use crate::commands::errors::user_friendly_error;
use crate::commands::limits::validate_optional_command_limit_i32;
use crate::commands::AppState;
use crate::core::config::Config;
use crate::core::health::{
    check_linkedin_cookie_health, get_all_scraper_health,
    get_expiring_credentials as fetch_expiring_credentials, get_health_summary as health_summary,
    get_latest_source_request as latest_source_request, get_scraper_configs as scraper_configs,
    get_scraper_runs as scraper_runs, is_known_scraper_name,
    run_all_smoke_tests_with_credentials as all_smoke_tests,
    run_smoke_test_with_credentials as run_smoke_test, set_scraper_enabled as scraper_enabled,
    CredentialHealth, HealthSummary, ScraperConfig, ScraperHealthMetrics, ScraperRun,
    SmokeTestResult, SourceRequestSummary,
};
use crate::core::logging::path_label_for_logging;
use std::path::Path;
use tauri::State;
use tokio::sync::RwLock;

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

const DEFAULT_SCRAPER_LIMIT: usize = 50;
const DEFAULT_USAJOBS_LIMIT: usize = 100;
const DEFAULT_USAJOBS_DATE_POSTED_DAYS: u8 = 30;

fn ensure_source_limit(limit: &mut usize, default_limit: usize) {
    if *limit == 0 {
        *limit = default_limit;
    }
}

fn default_source_query(config: &Config) -> Option<String> {
    config
        .title_allowlist
        .iter()
        .chain(config.keywords_boost.iter())
        .map(|value| value.trim())
        .find(|value| !value.is_empty())
        .map(ToOwned::to_owned)
}

fn apply_config_backed_scraper_toggle(
    config: &mut Config,
    scraper_name: &str,
    enabled: bool,
) -> bool {
    match scraper_name {
        "remoteok" => {
            config.remoteok.enabled = enabled;
            ensure_source_limit(&mut config.remoteok.limit, DEFAULT_SCRAPER_LIMIT);
        }
        "weworkremotely" => {
            config.weworkremotely.enabled = enabled;
            ensure_source_limit(&mut config.weworkremotely.limit, DEFAULT_SCRAPER_LIMIT);
        }
        "builtin" => {
            config.builtin.enabled = enabled;
            ensure_source_limit(&mut config.builtin.limit, DEFAULT_SCRAPER_LIMIT);
        }
        "hn_hiring" => {
            config.hn_hiring.enabled = enabled;
            ensure_source_limit(&mut config.hn_hiring.limit, DEFAULT_SCRAPER_LIMIT);
        }
        "dice" => {
            if enabled && config.dice.query.trim().is_empty() {
                let Some(query) = default_source_query(config) else {
                    return false;
                };
                config.dice.query = query;
            }
            config.dice.enabled = enabled;
            ensure_source_limit(&mut config.dice.limit, DEFAULT_SCRAPER_LIMIT);
        }
        "yc_startup" => {
            config.yc_startup.enabled = enabled;
            ensure_source_limit(&mut config.yc_startup.limit, DEFAULT_SCRAPER_LIMIT);
        }
        "usajobs" => {
            if enabled && config.usajobs.email.trim().is_empty() {
                return false;
            }
            config.usajobs.enabled = enabled;
            if config.usajobs.date_posted_days == 0 {
                config.usajobs.date_posted_days = DEFAULT_USAJOBS_DATE_POSTED_DAYS;
            }
            ensure_source_limit(&mut config.usajobs.limit, DEFAULT_USAJOBS_LIMIT);
        }
        "simplyhired" => {
            if enabled && config.simplyhired.query.trim().is_empty() {
                let Some(query) = default_source_query(config) else {
                    return false;
                };
                config.simplyhired.query = query;
            }
            config.simplyhired.enabled = enabled;
            ensure_source_limit(&mut config.simplyhired.limit, DEFAULT_SCRAPER_LIMIT);
        }
        "glassdoor" => {
            if enabled && config.glassdoor.query.trim().is_empty() {
                let Some(query) = default_source_query(config) else {
                    return false;
                };
                config.glassdoor.query = query;
            }
            config.glassdoor.enabled = enabled;
            ensure_source_limit(&mut config.glassdoor.limit, DEFAULT_SCRAPER_LIMIT);
        }
        _ => return false,
    }

    true
}

async fn set_config_backed_scraper_enabled_in_runtime_and_path(
    scraper_name: &str,
    enabled: bool,
    runtime_config: &RwLock<Config>,
    config_path: &Path,
) -> Result<bool, String> {
    let mut next_config = {
        let config = runtime_config.read().await;
        config.clone()
    };

    if !apply_config_backed_scraper_toggle(&mut next_config, scraper_name, enabled) {
        return Ok(false);
    }

    next_config.save(config_path).map_err(|e| {
        let message = user_friendly_error("Failed to save configuration", &e);
        tracing::error!(
            config_path = %path_label_for_logging(config_path),
            error = %message,
            "Failed to save source configuration"
        );
        message
    })?;

    {
        let mut runtime_config = runtime_config.write().await;
        *runtime_config = next_config;
    }

    Ok(true)
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
    let config_path = Config::default_path();
    set_config_backed_scraper_enabled_in_runtime_and_path(
        &scraper_name,
        enabled,
        state.config.as_ref(),
        &config_path,
    )
    .await?;
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
    run_smoke_test(
        &state.database,
        &config,
        &scraper_name,
        state.credentials.as_ref(),
    )
    .await
    .map_err(|e| health_command_error("Failed to run scraper smoke test", e))
}

/// Run smoke tests for all scrapers
#[tauri::command]
pub async fn run_all_smoke_tests(
    state: State<'_, AppState>,
) -> Result<Vec<SmokeTestResult>, String> {
    let config = state.config.read().await.clone();
    all_smoke_tests(&state.database, &config, state.credentials.as_ref())
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
    use crate::core::config::{AlertConfig, AutoRefreshConfig, LocationPreferences};

    fn create_health_toggle_test_config() -> Config {
        Config {
            title_allowlist: vec!["Program Coordinator".to_string()],
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
            salary_floor_usd: 70_000,
            salary_target_usd: None,
            penalize_missing_salary: false,
            auto_refresh: AutoRefreshConfig::default(),
            bookmarklet_port: 4321,
            immediate_alert_threshold: 0.8,
            scraping_interval_hours: 2,
            alerts: AlertConfig::default(),
            greenhouse_urls: vec![],
            lever_urls: vec![],
            linkedin: Default::default(),
            remoteok: Default::default(),
            weworkremotely: Default::default(),
            builtin: Default::default(),
            hn_hiring: Default::default(),
            dice: Default::default(),
            yc_startup: Default::default(),
            usajobs: Default::default(),
            simplyhired: Default::default(),
            glassdoor: Default::default(),
            jobswithgpt_endpoint: String::new(),
            jobswithgpt_approval: Default::default(),
            ghost_config: None,
            use_resume_matching: false,
            company_whitelist: vec![],
            company_blacklist: vec![],
        }
    }

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

    #[tokio::test]
    async fn config_backed_source_toggle_updates_runtime_config_and_disk() {
        let runtime_config = RwLock::new(create_health_toggle_test_config());
        let temp_dir = tempfile::tempdir().unwrap();
        let config_path = temp_dir.path().join("config.json");

        let updated = set_config_backed_scraper_enabled_in_runtime_and_path(
            "remoteok",
            true,
            &runtime_config,
            &config_path,
        )
        .await
        .unwrap();

        assert!(updated);
        assert!(runtime_config.read().await.remoteok.enabled);
        assert!(Config::load(&config_path).unwrap().remoteok.enabled);
    }
}
