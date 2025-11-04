//! Configuration Management
//!
//! Handles loading, validating, and saving user preferences.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;

/// User configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    /// Job titles to match (e.g., "Security Engineer")
    pub title_allowlist: Vec<String>,

    /// Job titles to exclude (e.g., "Manager", "Intern")
    #[serde(default)]
    pub title_blocklist: Vec<String>,

    /// Keywords to boost score
    #[serde(default)]
    pub keywords_boost: Vec<String>,

    /// Keywords to auto-reject
    #[serde(default)]
    pub keywords_exclude: Vec<String>,

    /// Location preferences
    pub location_preferences: LocationPreferences,

    /// Minimum salary in USD
    pub salary_floor_usd: i64,

    /// Immediate alert threshold (0.0 - 1.0)
    #[serde(default = "default_immediate_threshold")]
    pub immediate_alert_threshold: f64,

    /// Scraping interval in hours
    #[serde(default = "default_scraping_interval")]
    pub scraping_interval_hours: u64,

    /// Alert configuration
    pub alerts: AlertConfig,
}

fn default_immediate_threshold() -> f64 {
    0.9
}

fn default_scraping_interval() -> u64 {
    2
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocationPreferences {
    pub allow_remote: bool,

    #[serde(default)]
    pub allow_hybrid: bool,

    #[serde(default)]
    pub allow_onsite: bool,

    #[serde(default)]
    pub cities: Vec<String>,

    #[serde(default)]
    pub states: Vec<String>,

    #[serde(default)]
    pub country: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertConfig {
    pub slack: SlackConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SlackConfig {
    pub enabled: bool,

    #[serde(default)]
    pub webhook_url: String,
}

impl Config {
    /// Load configuration from file
    pub fn load(path: &PathBuf) -> Result<Self, Box<dyn std::error::Error>> {
        let content = std::fs::read_to_string(path)?;
        let config: Config = serde_json::from_str(&content)?;
        Ok(config)
    }

    /// Save configuration to file
    pub fn save(&self, path: &PathBuf) -> Result<(), Box<dyn std::error::Error>> {
        let content = serde_json::to_string_pretty(self)?;
        std::fs::write(path, content)?;
        Ok(())
    }

    /// Get default configuration file path
    pub fn default_path() -> PathBuf {
        crate::platforms::get_config_dir().join("config.json")
    }
}
