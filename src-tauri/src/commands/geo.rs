//! IP Geolocation Commands
//!
//! Tauri commands for detecting user location from IP address.

use crate::core::geo::{detect_location as core_detect_location, LocationInfo};

/// Detect location from IP address
///
/// Uses free ip-api.com service to auto-suggest location during setup.
/// Should be called once and cached to avoid rate limits (45 req/min).
///
/// # Returns
/// - `Ok(LocationInfo)` - Detected location with city, region, country, timezone
/// - `Err(String)` - Error message if detection fails
///
/// # Privacy
/// - Only calls external API when user opens setup wizard
/// - No tracking or data storage on external servers
/// - User can override/ignore the suggestion
#[tauri::command]
pub async fn detect_location() -> Result<LocationInfo, String> {
    core_detect_location()
        .await
        .map_err(|e| format!("Failed to detect location: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    #[ignore] // Requires network
    async fn test_detect_location_command() {
        let result = detect_location().await;
        assert!(result.is_ok(), "Failed: {:?}", result);
    }
}
