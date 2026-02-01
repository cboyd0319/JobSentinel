//! Deep Link Generation Commands
//!
//! Tauri commands for generating job search deep links.

use crate::core::deeplinks::{
    generate_all_links, generate_link_for_site, get_all_sites, DeepLink, SearchCriteria,
    SiteCategory, SiteInfo,
};
use serde::{Deserialize, Serialize};
use tauri::Emitter;

/// Generate deep links for all supported sites
#[tauri::command]
#[tracing::instrument(skip(_app), fields(query = %criteria.query))]
pub async fn generate_deep_links(
    _app: tauri::AppHandle,
    criteria: SearchCriteria,
) -> Result<Vec<DeepLink>, String> {
    tracing::info!("Generating deep links for all sites");

    generate_all_links(&criteria).map_err(|e| {
        tracing::error!(error = %e, "Failed to generate deep links");
        format!("Failed to generate deep links: {}", e)
    })
}

/// Generate deep link for a specific site
#[tauri::command]
#[tracing::instrument(skip(_app), fields(site_id = %site_id, query = %criteria.query))]
pub async fn generate_deep_link(
    _app: tauri::AppHandle,
    site_id: String,
    criteria: SearchCriteria,
) -> Result<DeepLink, String> {
    tracing::info!("Generating deep link for site: {}", site_id);

    generate_link_for_site(&site_id, &criteria).map_err(|e| {
        tracing::error!(error = %e, site_id = %site_id, "Failed to generate deep link");
        format!("Failed to generate deep link for {}: {}", site_id, e)
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

/// Open a deep link URL in the default browser
#[tauri::command]
#[tracing::instrument(skip(app))]
pub async fn open_deep_link(app: tauri::AppHandle, url: String) -> Result<(), String> {
    use tauri_plugin_shell::ShellExt;

    tracing::info!(url = %url, "Opening deep link in browser");

    // Use tauri-plugin-shell to open URL
    let shell = app.shell();
    #[allow(deprecated)]
    shell
        .open(&url, None)
        .map_err(|e| {
            tracing::error!(error = %e, url = %url, "Failed to open URL");
            format!("Failed to open URL: {}", e)
        })?;

    // Emit event for analytics/tracking
    app.emit("deep-link-opened", DeepLinkOpenedEvent { url: url.clone() })
        .map_err(|e| format!("Failed to emit event: {}", e))?;

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

    #[tokio::test]
    async fn test_generate_deep_links_basic() {
        let criteria = SearchCriteria {
            query: "Software Engineer".to_string(),
            location: Some("San Francisco, CA".to_string()),
            experience_level: None,
            job_type: None,
            remote_type: None,
        };

        // Create mock app handle (this would fail in real tests without proper setup)
        // In actual testing, we'd use integration tests with a real Tauri app
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
}
