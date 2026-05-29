//! IP Geolocation Commands
//!
//! Tauri commands for detecting user location from IP address.

use crate::commands::errors::user_friendly_error;
use crate::core::geo::{detect_location as core_detect_location, LocationInfo};

/// Detect location from IP address
///
/// Uses FreeIPAPI over HTTPS to suggest location after explicit user action.
/// Frontend callers should cache results to avoid repeated provider calls.
///
/// # Returns
/// - `Ok(LocationInfo)` - Detected location with city, region, country, timezone
/// - `Err(String)` - Error message if detection fails
///
/// # Privacy
/// - Calls external IP geolocation only when user requests detection
/// - Sends the public IP address visible to that provider
/// - User can override/ignore the suggestion
#[tauri::command]
pub async fn detect_location() -> Result<LocationInfo, String> {
    core_detect_location()
        .await
        .map_err(|e| user_friendly_error("Failed to detect location", e))
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
