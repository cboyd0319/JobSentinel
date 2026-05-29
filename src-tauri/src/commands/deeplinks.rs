//! Deep Link Generation Commands
//!
//! Tauri commands for generating job search deep links.

use crate::commands::errors::user_friendly_error;
use crate::core::deeplinks::{
    generate_all_links, generate_link_for_site, get_all_sites, DeepLink, SearchCriteria,
    SiteCategory, SiteInfo,
};
use crate::core::url_security::sanitize_url_for_logging;
use serde::{Deserialize, Serialize};
use tauri::Emitter;

/// Generate deep links for all supported sites
#[tauri::command]
#[tracing::instrument(skip(_app, criteria))]
pub async fn generate_deep_links(
    _app: tauri::AppHandle,
    criteria: SearchCriteria,
) -> Result<Vec<DeepLink>, String> {
    tracing::info!("Generating deep links for all sites");

    generate_all_links(&criteria).map_err(|e| {
        let message = user_friendly_error("Failed to generate deep links", &e);
        tracing::error!(error = %message, "Failed to generate deep links");
        message
    })
}

/// Generate deep link for a specific site
#[tauri::command]
#[tracing::instrument(skip(_app, criteria), fields(site_id = %site_id))]
pub async fn generate_deep_link(
    _app: tauri::AppHandle,
    site_id: String,
    criteria: SearchCriteria,
) -> Result<DeepLink, String> {
    tracing::info!("Generating deep link for site: {}", site_id);

    generate_link_for_site(&site_id, &criteria).map_err(|e| {
        let message = user_friendly_error("Failed to generate deep link", &e);
        tracing::error!(error = %message, site_id = %site_id, "Failed to generate deep link");
        message
    })
}

/// Get all supported job sites
#[tauri::command]
#[tracing::instrument(skip(_app))]
pub async fn get_supported_sites(_app: tauri::AppHandle) -> Result<Vec<SiteInfo>, String> {
    tracing::debug!("Fetching all supported sites");
    Ok(get_all_sites())
}

/// Get sites by category
#[tauri::command]
#[tracing::instrument(skip(_app))]
pub async fn get_sites_by_category_cmd(
    _app: tauri::AppHandle,
    category: SiteCategory,
) -> Result<Vec<SiteInfo>, String> {
    tracing::debug!("Fetching sites for category: {}", category);
    Ok(crate::core::deeplinks::get_sites_by_category(category))
}

/// Validate that a URL is safe to open in the user's browser.
/// Allows external HTTP(S) URLs while blocking localhost, private networks, and unsafe schemes.
fn validate_deep_link_url(url: &str) -> Result<(), String> {
    crate::core::url_security::validate_external_http_url(url).map(|_| ())
}

/// Open a deep link URL in the default browser
#[tauri::command]
#[tracing::instrument(skip(app))]
pub async fn open_deep_link(app: tauri::AppHandle, url: String) -> Result<(), String> {
    use tauri_plugin_shell::ShellExt;

    validate_deep_link_url(&url)?;

    let url_label = sanitize_url_for_logging(&url);
    tracing::info!(url = %url_label, "Opening deep link in browser");

    // Use tauri-plugin-shell to open URL
    let shell = app.shell();
    #[allow(deprecated)]
    shell.open(&url, None).map_err(|e| {
        let message = user_friendly_error("Failed to open URL", &e);
        tracing::error!(error = %message, url = %url_label, "Failed to open URL");
        message
    })?;

    // Emit event for analytics/tracking
    app.emit("deep-link-opened", DeepLinkOpenedEvent { url: url_label })
        .map_err(|e| user_friendly_error("Failed to emit event", e))?;

    Ok(())
}

/// Event emitted when a deep link is opened
#[derive(Debug, Clone, Serialize, Deserialize)]
struct DeepLinkOpenedEvent {
    url: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::deeplinks::RemoteType;

    #[test]
    fn test_generate_deep_links_basic() {
        let criteria = SearchCriteria {
            query: "Software Engineer".to_string(),
            location: Some("San Francisco, CA".to_string()),
            experience_level: None,
            job_type: None,
            remote_type: None,
        };

        let links = generate_all_links(&criteria).unwrap();
        assert!(!links.is_empty());
        assert!(links
            .iter()
            .any(|link| link.url.contains("Software") && link.url.contains("Engineer")));
    }

    #[test]
    fn test_search_criteria_serialization() {
        let criteria = SearchCriteria {
            query: "Rust Developer".to_string(),
            location: Some("Remote".to_string()),
            experience_level: None,
            job_type: None,
            remote_type: Some(RemoteType::Remote),
        };

        let json = serde_json::to_string(&criteria).unwrap();
        assert!(json.contains("Rust Developer"));
        assert!(json.contains("Remote"));

        let deserialized: SearchCriteria = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.query, "Rust Developer");
    }

    // ========================================================================
    // Security: deep link URL validation (CWE-601 Open Redirect)
    // ========================================================================

    #[test]
    fn test_deep_link_allows_https() {
        assert!(validate_deep_link_url("https://www.indeed.com/jobs?q=rust").is_ok());
    }

    #[test]
    fn test_deep_link_allows_http() {
        assert!(validate_deep_link_url("http://jobs.example.com/search").is_ok());
    }

    #[test]
    fn test_deep_link_blocks_file_scheme() {
        assert!(validate_deep_link_url("file:///etc/passwd").is_err());
    }

    #[test]
    fn test_deep_link_blocks_localhost() {
        assert!(validate_deep_link_url("http://localhost:3000/jobs").is_err());
        assert!(validate_deep_link_url("http://127.0.0.1/jobs").is_err());
        assert!(validate_deep_link_url("http://[::1]/jobs").is_err());
    }

    #[test]
    fn test_deep_link_blocks_private_network_urls() {
        assert!(validate_deep_link_url("http://10.0.0.5/jobs").is_err());
        assert!(validate_deep_link_url("http://172.20.0.5/jobs").is_err());
        assert!(validate_deep_link_url("http://192.168.1.5/jobs").is_err());
        assert!(validate_deep_link_url("http://169.254.1.5/jobs").is_err());
    }

    #[test]
    fn test_deep_link_blocks_javascript_scheme() {
        assert!(validate_deep_link_url("javascript:alert(1)").is_err());
    }

    #[test]
    fn test_deep_link_blocks_data_scheme() {
        assert!(validate_deep_link_url("data:text/html,<script>alert(1)</script>").is_err());
    }

    #[test]
    fn test_deep_link_rejects_invalid_url() {
        assert!(validate_deep_link_url("not a url").is_err());
    }
}
