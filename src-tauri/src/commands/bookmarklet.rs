//! Bookmarklet server commands
//!
//! Tauri commands for managing a local HTTP server that receives job data
//! from a browser bookmarklet. This allows users to import jobs from any
//! website by clicking a bookmark while viewing a job posting.

use crate::commands::{errors::user_friendly_error, AppState};
use arboard::Clipboard;
use serde::{Deserialize, Serialize};
use tauri::State;

/// Bookmarklet configuration returned to frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BookmarkletConfigResponse {
    pub port: u16,
    pub enabled: bool,
}

fn bookmarklet_copy_error() -> String {
    "Could not copy browser button. Allow clipboard access and try again.".to_string()
}

fn bookmarklet_code(port: u16, auth_token: &str) -> String {
    let token = match serde_json::to_string(auth_token) {
        Ok(value) => value,
        Err(_) => "\"\"".to_string(),
    };

    format!(
        "javascript:(function(){{var scripts=document.querySelectorAll('script[type=\"application/ld+json\"]');var job=null;scripts.forEach(function(s){{try{{var data=JSON.parse(s.textContent);if(data['@type']==='JobPosting')job=data;}}catch(e){{}}}});if(!job){{var title=document.querySelector('h1');var company=document.querySelector('[class*=\"company\"]')||document.querySelector('[class*=\"employer\"]');var desc=document.querySelector('[class*=\"description\"]')||document.querySelector('[class*=\"desc\"]');job={{title:title?title.textContent:'',company:company?company.textContent:'',description:desc?desc.textContent:'',url:window.location.href}};}}else{{job.url=window.location.href;}}fetch('http://localhost:{port}/api/bookmarklet/import',{{method:'POST',mode:'no-cors',headers:{{'Content-Type':'text/plain'}},body:JSON.stringify({{token:{token},job:job}})}}).then(function(){{alert('Sent to JobSentinel. Check saved jobs.');}}).catch(function(e){{alert('Cannot connect to JobSentinel. Turn on the import helper in Settings.');}});}})();"
    )
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

/// Copy browser import button code without exposing the import token to the renderer
#[tauri::command]
#[tracing::instrument(skip(state))]
pub async fn copy_bookmarklet_code(state: State<'_, AppState>) -> Result<(), String> {
    tracing::debug!("Copying browser import button");

    let mut server_guard = state.bookmarklet_server.write().await;
    let was_running = server_guard.is_running();
    let mut config = server_guard.config().clone();
    config.refresh_auth_token();
    let code = bookmarklet_code(config.port, &config.auth_token);

    if was_running {
        server_guard.stop().await.map_err(|e| {
            let message = user_friendly_error("Could not refresh browser button", &e);
            tracing::error!(error = %message, "Failed to stop bookmarklet server for token refresh");
            message
        })?;

        server_guard
            .start(config, state.database.clone())
            .await
            .map_err(|e| {
                let message = user_friendly_error("Could not refresh browser button", &e);
                tracing::error!(error = %message, "Failed to restart bookmarklet server after token refresh");
                message
            })?;
    } else {
        server_guard.set_config(config);
    }

    drop(server_guard);

    Clipboard::new()
        .and_then(|mut clipboard| clipboard.set_text(code))
        .map_err(|_| bookmarklet_copy_error())?;

    Ok(())
}

/// Start the bookmarklet server
#[tauri::command]
#[tracing::instrument(skip(state), fields(port))]
pub async fn start_bookmarklet_server(state: State<'_, AppState>, port: u16) -> Result<(), String> {
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
            let message = user_friendly_error("Failed to start bookmarklet server", &e);
            tracing::error!(error = %message, "Failed to start bookmarklet server");
            message
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
        let message = user_friendly_error("Failed to stop bookmarklet server", &e);
        tracing::error!(error = %message, "Failed to stop bookmarklet server");
        message
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
        assert!(!json.contains("authToken"));
        assert!(!json.contains("test-token"));

        let deserialized: BookmarkletConfigResponse = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.port, 4321);
        assert!(deserialized.enabled);
    }

    #[test]
    fn test_bookmarklet_code_includes_token_only_in_generated_button() {
        let code = bookmarklet_code(4321, "test-token");

        assert!(code.contains("http://localhost:4321/api/bookmarklet/import"));
        assert!(code.contains("mode:'no-cors'"));
        assert!(!code.contains("X-JobSentinel-Token"));
        assert!(code.contains("test-token"));
    }
}
