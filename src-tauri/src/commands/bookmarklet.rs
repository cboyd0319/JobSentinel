//! Bookmarklet server commands
//!
//! Tauri commands for managing a local HTTP server that receives job data
//! from a browser bookmarklet. This allows users to import jobs from any
//! website by clicking a bookmark while viewing a job posting.

use crate::commands::{errors::user_friendly_error, AppState};
use serde::{Deserialize, Serialize};
use tauri::State;

/// Bookmarklet configuration returned to frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BookmarkletConfigResponse {
    pub port: u16,
    pub enabled: bool,
}

/// Get current bookmarklet configuration
#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn get_bookmarklet_config(
    state: State<'_, AppState>,
) -> Result<BookmarkletConfigResponse, String> {
    tracing::debug!("Getting bookmarklet configuration");

    let server_guard = state.bookmarklet_server.read().await;
    let config = server_guard.config().clone();
    let enabled = server_guard.is_running();

    Ok(BookmarkletConfigResponse {
        port: config.port,
        enabled,
    })
}

/// Start the bookmarklet server
#[tauri::command]
#[tracing::instrument(skip(state), fields(port))]
pub async fn start_bookmarklet_server(
    state: State<'_, AppState>,
    port: u16,
) -> Result<(), String> {
    tracing::info!(port = port, "Starting bookmarklet server");

    let mut server_guard = state.bookmarklet_server.write().await;

    if server_guard.is_running() {
        return Err("Bookmarklet server is already running".to_string());
    }

    // Update config with new port
    let mut config = server_guard.config().clone();
    config.port = port;

    // Start the server
    server_guard
        .start(config, state.database.clone())
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "Failed to start bookmarklet server");
            user_friendly_error("Failed to start bookmarklet server", e)
        })?;

    tracing::info!(port = port, "Bookmarklet server started successfully");
    Ok(())
}

/// Stop the bookmarklet server
#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn stop_bookmarklet_server(state: State<'_, AppState>) -> Result<(), String> {
    tracing::info!("Stopping bookmarklet server");

    let mut server_guard = state.bookmarklet_server.write().await;

    if !server_guard.is_running() {
        return Err("Bookmarklet server is not running".to_string());
    }

    server_guard.stop().await.map_err(|e| {
        tracing::error!(error = %e, "Failed to stop bookmarklet server");
        user_friendly_error("Failed to stop bookmarklet server", e)
    })?;

    tracing::info!("Bookmarklet server stopped successfully");
    Ok(())
}

/// Set bookmarklet server port (only when server is stopped)
#[tauri::command]
#[tracing::instrument(skip(state), fields(port))]
pub async fn set_bookmarklet_port(state: State<'_, AppState>, port: u16) -> Result<(), String> {
    tracing::debug!(port = port, "Setting bookmarklet port");

    let mut server_guard = state.bookmarklet_server.write().await;

    if server_guard.is_running() {
        return Err(
            "Cannot change port while server is running. Stop the server first.".to_string(),
        );
    }

    let mut config = server_guard.config().clone();
    config.port = port;
    server_guard.set_config(config);

    tracing::info!(port = port, "Bookmarklet port updated");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_bookmarklet_config_serialization() {
        let config = BookmarkletConfigResponse {
            port: 4321,
            enabled: true,
        };

        let json = serde_json::to_string(&config).unwrap();
        assert!(json.contains("4321"));
        assert!(json.contains("true"));

        let deserialized: BookmarkletConfigResponse = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.port, 4321);
        assert!(deserialized.enabled);
    }
}
