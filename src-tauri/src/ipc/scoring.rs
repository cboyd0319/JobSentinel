//! Scoring configuration Tauri commands
//!
//! Commands for managing user-configurable scoring weights.

use crate::application::scoring::ScoringConfig;
use crate::bootstrap::AppState;
use crate::ipc::errors::user_friendly_error;
use tauri::State;

/// Get current scoring configuration
#[tauri::command]
pub(crate) async fn get_scoring_config(
    state: State<'_, AppState>,
) -> Result<ScoringConfig, String> {
    tracing::info!("Command: get_scoring_config");

    state.database.load_scoring_config().await.map_err(|e| {
        let message = user_friendly_error("Failed to load scoring config", &e);
        tracing::error!(error = %message, "Failed to load scoring config");
        message
    })
}

/// Update scoring configuration
///
/// Validates that weights sum to approximately 1.0 before saving.
#[tauri::command]
pub(crate) async fn update_scoring_config(
    config: ScoringConfig,
    state: State<'_, AppState>,
) -> Result<(), String> {
    tracing::info!("Command: update_scoring_config");

    // Validate config
    config.validate().inspect_err(|_| {
        tracing::error!("Invalid scoring config");
    })?;

    // Save to database
    state
        .database
        .save_scoring_config(&config)
        .await
        .map_err(|e| {
            let message = user_friendly_error("Failed to save scoring config", &e);
            tracing::error!(error = %message, "Failed to save scoring config");
            message
        })?;

    tracing::info!("Scoring config updated successfully");
    Ok(())
}

/// Reset scoring configuration to defaults
///
/// Resets all weights to:
/// - Skills: 40%
/// - Salary: 25%
/// - Location: 20%
/// - Company: 10%
/// - Recency: 5%
#[tauri::command]
pub(crate) async fn reset_scoring_config_cmd(
    state: State<'_, AppState>,
) -> Result<ScoringConfig, String> {
    tracing::info!("Command: reset_scoring_config");

    state.database.reset_scoring_config().await.map_err(|e| {
        let message = user_friendly_error("Failed to reset scoring config", &e);
        tracing::error!(error = %message, "Failed to reset scoring config");
        message
    })?;

    // Return the default config
    Ok(ScoringConfig::default())
}

/// Validate scoring configuration without saving
///
/// Checks that:
/// - All weights are non-negative
/// - All weights are at most 1.0
/// - Sum of weights is approximately 1.0 (±0.01 tolerance)
#[tauri::command]
pub(crate) async fn validate_scoring_config(config: ScoringConfig) -> Result<bool, String> {
    tracing::info!("Command: validate_scoring_config");

    match config.validate() {
        Ok(()) => Ok(true),
        Err(e) => {
            tracing::warn!("Scoring config validation failed");
            Err(e)
        }
    }
}
