//! Utility functions for market intelligence

use super::MarketIntelligence;

impl MarketIntelligence {
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
