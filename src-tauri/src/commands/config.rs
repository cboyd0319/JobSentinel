//! Configuration Tauri commands
//!
//! Commands for saving, retrieving, and validating app configuration.

use crate::commands::AppState;
use crate::core::config::Config;
use crate::core::db::Database;
use serde_json::Value;
use tauri::State;

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
