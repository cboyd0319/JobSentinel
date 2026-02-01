//! IP Geolocation Module
//!
//! Detects user location from IP address using free ip-api.com service.
//! Used to auto-suggest location during setup wizard.

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::time::Duration;

/// Location information detected from IP address
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocationInfo {
    /// City name (e.g., "Los Angeles")
    pub city: String,
    /// State/region name (e.g., "California")
    pub region: String,
    /// Country name (e.g., "United States")
    pub country: String,
    /// Timezone (e.g., "America/Los_Angeles")
    pub timezone: String,
}

/// Response from ip-api.com API
#[derive(Debug, Deserialize)]
struct IpApiResponse {
    status: String,
    #[serde(default)]
    city: String,
    #[serde(rename = "regionName", default)]
    region_name: String,
    #[serde(default)]
    country: String,
    #[serde(default)]
    timezone: String,
    #[serde(default)]
    message: Option<String>,
}

/// Detect location from IP address using ip-api.com
///
/// Free service with 45 requests/minute limit (no API key required).
/// Should only be called once during setup - cache result to avoid rate limits.
///
/// # Privacy
/// - Only called during setup wizard (user-initiated)
/// - No tracking, purely for convenience
/// - User can override/clear at any time
///
/// # Errors
/// Returns error if:
/// - Network request fails
/// - API returns error status
/// - Response parsing fails
pub async fn detect_location() -> Result<LocationInfo> {
    // Use free ip-api.com endpoint (no auth required)
    let url = "http://ip-api.com/json/?fields=status,message,city,regionName,country,timezone";

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .context("Failed to create HTTP client for geolocation")?;

    let response = client
        .get(url)
        .send()
        .await
        .context("Failed to fetch IP geolocation data")?;

    // Check HTTP status
    let status_code = response.status();
    if !status_code.is_success() {
        anyhow::bail!(
            "IP geolocation API returned error status: {}",
            status_code
        );
    }

    let api_response: IpApiResponse = response
        .json()
        .await
        .context("Failed to parse IP geolocation response")?;

    // Check API-level status
    if api_response.status != "success" {
        let error_msg = api_response
            .message
            .unwrap_or_else(|| "Unknown error".to_string());
        anyhow::bail!("IP geolocation API error: {}", error_msg);
    }

    // Validate we got meaningful data
    if api_response.city.is_empty() && api_response.region_name.is_empty() {
        anyhow::bail!("IP geolocation returned empty location data");
    }

    Ok(LocationInfo {
        city: api_response.city,
        region: api_response.region_name,
        country: api_response.country,
        timezone: api_response.timezone,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    #[ignore] // Ignore by default (requires network)
    async fn test_detect_location_real_api() {
        // This test requires network access and hits real API
        // Run with: cargo test --manifest-path src-tauri/Cargo.toml -- --ignored
        let result = detect_location().await;
        assert!(result.is_ok(), "Failed to detect location: {:?}", result);

        let location = result.unwrap();
        println!("Detected location: {:?}", location);

        // Basic validation - should have at least city or region
        assert!(
            !location.city.is_empty() || !location.region.is_empty(),
            "Location should have city or region"
        );
    }

    #[test]
    fn test_location_info_serialization() {
        let location = LocationInfo {
            city: "San Francisco".to_string(),
            region: "California".to_string(),
            country: "United States".to_string(),
            timezone: "America/Los_Angeles".to_string(),
        };

        let json = serde_json::to_string(&location).unwrap();
        assert!(json.contains("San Francisco"));
        assert!(json.contains("California"));

        let deserialized: LocationInfo = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.city, location.city);
        assert_eq!(deserialized.region, location.region);
    }
}
