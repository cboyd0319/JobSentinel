//! Utility functions for market intelligence

use super::MarketIntelligence;

impl MarketIntelligence {
    /// Normalize location names to standardized formats
    pub(super) fn normalize_location(&self, location: &str) -> String {
        let lower = location.to_lowercase();
        if lower.contains("san francisco") || lower.contains("sf") {
            "san francisco, ca".to_string()
        } else if lower.contains("new york") || lower.contains("nyc") {
            "new york, ny".to_string()
        } else if lower.contains("remote") {
            "remote".to_string()
        } else {
            lower
        }
    }

    /// Parse location into city and state components
    pub(super) fn parse_location(&self, location: &str) -> (Option<String>, Option<String>) {
        let parts: Vec<&str> = location.split(',').map(|s| s.trim()).collect();
        if parts.len() >= 2 {
            (Some(parts[0].to_string()), Some(parts[1].to_string()))
        } else {
            (Some(location.to_string()), None)
        }
    }
}
