//! Bookmarklet server commands
//!
//! Tauri commands for managing a local HTTP server that receives job data
//! from a browser bookmarklet. This allows users to import jobs from any
//! website by clicking a bookmark while viewing a job posting.

use crate::desktop::path_label_for_logging;
use crate::desktop::{
    discard_pending_bookmarklet_imports as discard_pending_bookmarklet_import_jobs,
    BookmarkletConfig, BookmarkletImportConfirmResult, PendingBookmarkletImportPreview,
};
use crate::{
    application::config::Config,
    commands::{errors::user_friendly_error, AppState},
};
use arboard::Clipboard;
use jobsentinel_application::{bookmarklet_repository, confirm_bookmarklet_imports};
use serde::{Deserialize, Serialize};
use tauri::State;

const MIN_BOOKMARKLET_PORT: u16 = 1024;
const MAX_BOOKMARKLET_PORT: u32 = u16::MAX as u32;

/// Bookmarklet configuration returned to frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub(crate) struct BookmarkletConfigResponse {
    pub port: u16,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub(crate) struct DiscardBookmarkletImportsResponse {
    pub discarded: usize,
}

fn bookmarklet_copy_error() -> String {
    "Could not copy browser button. Allow clipboard access and try again, or copy a safe support report if this keeps happening.".to_string()
}

fn validate_bookmarklet_port(port: u32) -> Result<u16, String> {
    if port < u32::from(MIN_BOOKMARKLET_PORT) || port > MAX_BOOKMARKLET_PORT {
        return Err("Choose a browser button number from 1024 to 65535.".to_string());
    }

    Ok(port as u16)
}

fn bookmarklet_code(port: u16, auth_token: &str) -> String {
    let token = match serde_json::to_string(auth_token) {
        Ok(value) => value,
        Err(_) => "\"\"".to_string(),
    };

    const TEMPLATE: &str = r#"javascript:(function(){var frame=null;function done(message){try{if(frame&&frame.parentNode){frame.parentNode.removeChild(frame);}}catch(e){}alert(message);}try{frame=document.createElement('iframe');frame.setAttribute('aria-hidden','true');frame.style.display='none';(document.documentElement||document.body).appendChild(frame);var cleanWindow=frame.contentWindow;var cleanFetch=cleanWindow.fetch.bind(cleanWindow);var cleanStringify=cleanWindow.JSON.stringify.bind(cleanWindow.JSON);var cleanParse=cleanWindow.JSON.parse.bind(cleanWindow.JSON);function norm(value){return String(value||'').replace(/\s+/g,' ').trim();}function text(el){return norm(el&&(el.innerText||el.textContent));}function visible(el){try{var rect=el.getBoundingClientRect();var style=window.getComputedStyle(el);return rect.width>0&&rect.height>0&&rect.bottom>=0&&rect.right>=0&&rect.top<=window.innerHeight&&rect.left<=window.innerWidth&&style.visibility!=='hidden'&&style.display!=='none';}catch(e){return false;}}function abs(href){try{return new cleanWindow.URL(href,window.location.href).toString();}catch(e){return '';}}function safeJobUrl(value){try{var parsed=new cleanWindow.URL(value,window.location.href);if(/(\.|^)linkedin\.com$/i.test(parsed.hostname)&&parsed.pathname.indexOf('/jobs/view/')>=0){parsed.search='';parsed.hash='';}return parsed.toString();}catch(e){return '';}}function cardFor(anchor){var node=anchor;var best=anchor;for(var i=0;i<7&&node&&node.parentElement;i++){node=node.parentElement;var value=text(node);if(value.length>text(anchor).length+10&&value.length<1400){best=node;}if(value.indexOf('\u00b7')>=0&&value.length>60){break;}}return best;}function cleanCardDetails(raw,title){var index=raw.indexOf(title);var value=index>=0?raw.slice(index+title.length):raw;value=value.replace(/^[\\s\u00b7-]+/,'');value=value.split(/You.?d be|Viewed|Saved|Promoted|Be an early applicant|Retry Premium|See the full list|1 company alumni|company alumni/i)[0];return norm(value);}function jobFromAnchor(anchor){var title=text(anchor);var url=safeJobUrl(anchor.getAttribute('href')||'');if(!title||url.indexOf('/jobs/view/')<0){return null;}var card=cardFor(anchor);var raw=text(card).slice(0,1200);var detail=cleanCardDetails(raw,title);var parts=detail.split('\u00b7').map(norm).filter(Boolean);var company=parts[0]||'';var location='';for(var i=1;i<parts.length;i++){if(/remote|hybrid|on-site|,\s*[A-Z]{2}\b|united states/i.test(parts[i])){location=parts[i];break;}}if(!company||company.length>200){return null;}return{title:title,company:company,location:location,description:raw,url:url};}function visibleLinkedInJobs(){if(!/(\.|^)linkedin\.com$/i.test(location.hostname)||location.pathname.indexOf('/jobs')!==0){return [];}var anchors=document.querySelectorAll('a[href*="/jobs/view/"]');var seen={};var visibleJobs=[];anchors.forEach(function(anchor){if(visibleJobs.length>=12||!visible(anchor)){return;}var job=jobFromAnchor(anchor);if(job&&!seen[job.url]){seen[job.url]=1;visibleJobs.push(job);}});return visibleJobs;}var visibleJobs=visibleLinkedInJobs();var payload=null;if(visibleJobs.length>0){payload={token:__TOKEN__,jobs:visibleJobs};}else{var scripts=document.querySelectorAll('script[type="application/ld+json"]');var job=null;scripts.forEach(function(s){try{var data=cleanParse(s.textContent);if(data['@type']==='JobPosting')job=data;}catch(e){}});if(!job){var title=document.querySelector('h1');var company=document.querySelector('[class*="company"]')||document.querySelector('[class*="employer"]');var desc=document.querySelector('[class*="description"]')||document.querySelector('[class*="desc"]');job={title:title?text(title):'',company:company?text(company):'',description:desc?text(desc):'',url:safeJobUrl(window.location.href)};}else{job.url=safeJobUrl(window.location.href);}payload={token:__TOKEN__,job:job};}cleanFetch('http://localhost:__PORT__/api/bookmarklet/import',{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain'},body:cleanStringify(payload)}).then(function(){done(visibleJobs.length>0?'Sent '+visibleJobs.length+' visible jobs to JobSentinel. Return to JobSentinel to review and save.':'Sent to JobSentinel. Return to JobSentinel to review and save. If missing, copy the browser button again.');}).catch(function(){done('Cannot connect to JobSentinel. Return to Settings and copy the browser button again.');});}catch(e){done('Cannot connect to JobSentinel. Return to Settings and copy the browser button again.');}})();"#;

    TEMPLATE
        .replace("__PORT__", &port.to_string())
        .replace("__TOKEN__", &token)
}

fn refreshed_bookmarklet_config_for_copy(current: &BookmarkletConfig) -> BookmarkletConfig {
    let mut config = current.clone();
    config.refresh_auth_token();
    config
}

async fn persist_bookmarklet_port(state: &AppState, port: u16) -> Result<(), String> {
    let config_path = Config::default_path();
    let mut next_config = {
        let runtime_config = state.config.read().await;
        runtime_config.clone()
    };
    next_config.bookmarklet_port = port;

    next_config.save(&config_path).map_err(|e| {
        let message = user_friendly_error("Failed to save Browser Import settings", &e);
        tracing::error!(
            config_path = %path_label_for_logging(&config_path),
            error = %message,
            "Failed to save Browser Import settings"
        );
        message
    })?;

    {
        let mut runtime_config = state.config.write().await;
        *runtime_config = next_config;
    }

    Ok(())
}

/// Get current bookmarklet configuration
#[tauri::command]
#[tracing::instrument(skip(state))]
pub(crate) async fn get_bookmarklet_config(
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
pub(crate) async fn copy_bookmarklet_code(state: State<'_, AppState>) -> Result<(), String> {
    tracing::debug!("Copying browser import button");

    let mut server_guard = state.bookmarklet_server.write().await;
    let config = refreshed_bookmarklet_config_for_copy(server_guard.config());
    let code = bookmarklet_code(config.port, &config.auth_token);

    Clipboard::new()
        .and_then(|mut clipboard| clipboard.set_text(code))
        .map_err(|_| bookmarklet_copy_error())?;

    server_guard.update_auth_token(config.auth_token, config.auth_token_expires_at);

    Ok(())
}

/// List browser imports waiting for user review.
#[tauri::command]
#[tracing::instrument(skip(state))]
pub(crate) async fn get_pending_bookmarklet_imports(
    state: State<'_, AppState>,
) -> Result<Vec<PendingBookmarkletImportPreview>, String> {
    let server_guard = state.bookmarklet_server.read().await;
    Ok(server_guard.pending_imports())
}

/// Save reviewed browser imports as durable jobs.
#[tauri::command]
#[tracing::instrument(skip(state, ids), fields(count = ids.len()))]
pub(crate) async fn confirm_pending_bookmarklet_imports(
    state: State<'_, AppState>,
    ids: Vec<String>,
) -> Result<BookmarkletImportConfirmResult, String> {
    if ids.is_empty() {
        return Err("Choose at least one job to save.".to_string());
    }

    let pending_imports = {
        let server_guard = state.bookmarklet_server.read().await;
        server_guard.pending_import_store()
    };

    confirm_bookmarklet_imports(state.database.clone(), &pending_imports, &ids).await
}

/// Remove reviewed browser imports without saving.
#[tauri::command]
#[tracing::instrument(skip(state, ids), fields(count = ids.len()))]
pub(crate) async fn discard_pending_bookmarklet_imports(
    state: State<'_, AppState>,
    ids: Vec<String>,
) -> Result<DiscardBookmarkletImportsResponse, String> {
    if ids.is_empty() {
        return Err("Choose at least one job to skip.".to_string());
    }

    let pending_imports = {
        let server_guard = state.bookmarklet_server.read().await;
        server_guard.pending_import_store()
    };
    let discarded = discard_pending_bookmarklet_import_jobs(&pending_imports, &ids);

    Ok(DiscardBookmarkletImportsResponse { discarded })
}

/// Start the bookmarklet server
#[tauri::command]
#[tracing::instrument(skip(state), fields(port))]
pub(crate) async fn start_bookmarklet_server(
    state: State<'_, AppState>,
    port: u32,
) -> Result<BookmarkletConfigResponse, String> {
    let port = validate_bookmarklet_port(port)?;
    tracing::info!(port = port, "Starting bookmarklet server");

    let mut server_guard = state.bookmarklet_server.write().await;

    if server_guard.is_running() {
        return Err("Bookmarklet server is already running".to_string());
    }

    // Update config with new port
    let mut config = server_guard.config().clone();
    config.port = port;

    // Start the server
    let selected_port = server_guard
        .start(config, bookmarklet_repository(state.database.clone()))
        .await
        .map_err(|e| {
            let message = user_friendly_error("Failed to start bookmarklet server", &e);
            tracing::error!(error = %message, "Failed to start bookmarklet server");
            message
        })?;

    if selected_port != port {
        if let Err(error) = persist_bookmarklet_port(&state, selected_port).await {
            let previous_config = BookmarkletConfig {
                port,
                ..server_guard.config().clone()
            };
            if let Err(stop_error) = server_guard.stop().await {
                tracing::error!(
                    error = %user_friendly_error("Failed to stop Browser Import", &stop_error),
                    "Failed to roll back Browser Import after settings save failure"
                );
            }
            server_guard.set_config(previous_config);
            return Err(error);
        }
    }

    tracing::info!(
        port = selected_port,
        "Bookmarklet server started successfully"
    );
    Ok(BookmarkletConfigResponse {
        port: selected_port,
        enabled: true,
    })
}

/// Stop the bookmarklet server
#[tauri::command]
#[tracing::instrument(skip(state))]
pub(crate) async fn stop_bookmarklet_server(state: State<'_, AppState>) -> Result<(), String> {
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
pub(crate) async fn set_bookmarklet_port(
    state: State<'_, AppState>,
    port: u32,
) -> Result<(), String> {
    let port = validate_bookmarklet_port(port)?;
    tracing::debug!(port = port, "Setting bookmarklet port");

    {
        let server_guard = state.bookmarklet_server.read().await;
        if server_guard.is_running() {
            return Err(
                "Cannot change port while server is running. Stop the server first.".to_string(),
            );
        }
    }

    persist_bookmarklet_port(&state, port).await?;

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
        assert!(code.contains("cleanWindow.fetch.bind(cleanWindow)"));
        assert!(code.contains("cleanWindow.JSON.stringify.bind(cleanWindow.JSON)"));
        assert!(code.contains("cleanWindow.JSON.parse"));
        assert!(code.contains("/jobs/view/"));
        assert!(code.contains("visibleJobs"));
        assert!(code.contains("parentNode.removeChild"));
        assert!(!code.contains("fetch('http://localhost"));
        assert!(!code.contains("JSON.stringify({token"));
        assert!(code.contains("Return to Settings and copy the browser button again."));
        let old_setup_label = ["import", "helper"].join(" ");
        assert!(!code.contains(&old_setup_label));
        assert!(!code.contains("X-JobSentinel-Token"));
        assert!(code.contains("test-token"));
    }

    #[test]
    fn test_bookmarklet_copy_error_has_safe_support_report_fallback() {
        let message = bookmarklet_copy_error();

        assert!(message.contains("safe support report"));
        assert!(message.contains("Allow clipboard access and try again, or copy"));
    }

    #[test]
    fn test_bookmarklet_port_validation_rejects_reserved_ports() {
        let err = validate_bookmarklet_port(80).unwrap_err();

        assert!(err.contains("1024"));
        assert!(err.contains("65535"));
    }

    #[test]
    fn test_bookmarklet_port_validation_rejects_out_of_range_ports() {
        let err = validate_bookmarklet_port(65_536).unwrap_err();

        assert!(err.contains("1024"));
        assert!(err.contains("65535"));
    }

    #[test]
    fn test_bookmarklet_port_validation_accepts_user_port_range() {
        assert_eq!(validate_bookmarklet_port(1024), Ok(1024));
        assert_eq!(validate_bookmarklet_port(4321), Ok(4321));
        assert_eq!(validate_bookmarklet_port(65535), Ok(65535));
    }

    #[test]
    fn test_refreshed_bookmarklet_config_for_copy_does_not_mutate_current() {
        let current = BookmarkletConfig {
            port: 4321,
            auth_token: "old-token".to_string(),
            auth_token_expires_at: chrono::Utc::now() + chrono::TimeDelta::minutes(5),
        };

        let refreshed = refreshed_bookmarklet_config_for_copy(&current);

        assert_eq!(current.auth_token, "old-token");
        assert_eq!(refreshed.port, current.port);
        assert_ne!(refreshed.auth_token, current.auth_token);
        assert!(refreshed.auth_token_is_current(chrono::Utc::now()));
    }
}
