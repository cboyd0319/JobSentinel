//! Scoring configuration Tauri commands
//!
//! Commands for managing user-configurable scoring weights.

use crate::commands::AppState;
use crate::core::scoring::{load_scoring_config, reset_scoring_config, save_scoring_config, ScoringConfig};
use tauri::State;

/// Get current scoring configuration
#[tauri::command]
pub async fn get_scoring_config(state: State<'_, AppState>) -> Result<ScoringConfig, String> {
    tracing::info!("Command: get_scoring_config");

    load_scoring_config(state.database.pool())
        .await
        .map_err(|e| {
            tracing::error!("Failed to load scoring config: {}", e);
            e
        })
}

/// Update scoring configuration
///
/// Validates that weights sum to approximately 1.0 before saving.
#[tauri::command]
pub async fn update_scoring_config(
    config: ScoringConfig,
    state: State<'_, AppState>,
) -> Result<(), String> {
    tracing::info!("Command: update_scoring_config");

    // Validate config
    config.validate().map_err(|e| {
        tracing::error!("Invalid scoring config: {}", e);
        e
    })?;

    // Save to database
    save_scoring_config(state.database.pool(), &config)
        .await
        .map_err(|e| {
            tracing::error!("Failed to save scoring config: {}", e);
            e
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
pub async fn reset_scoring_config_cmd(state: State<'_, AppState>) -> Result<ScoringConfig, String> {
    tracing::info!("Command: reset_scoring_config");

    reset_scoring_config(state.database.pool())
        .await
        .map_err(|e| {
            tracing::error!("Failed to reset scoring config: {}", e);
            e
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
pub async fn validate_scoring_config(config: ScoringConfig) -> Result<bool, String> {
    tracing::info!("Command: validate_scoring_config");

    match config.validate() {
        Ok(()) => Ok(true),
        Err(e) => {
            tracing::warn!("Scoring config validation failed: {}", e);
            Err(e)
        }
    }
}
