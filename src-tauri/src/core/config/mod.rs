//! Configuration Management
//!
//! Handles loading, validating, and saving user preferences.

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

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

    /// Greenhouse company URLs to scrape (e.g., "https://boards.greenhouse.io/cloudflare")
    #[serde(default)]
    pub greenhouse_urls: Vec<String>,

    /// Lever company URLs to scrape (e.g., "https://jobs.lever.co/netflix")
    #[serde(default)]
    pub lever_urls: Vec<String>,
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

    #[serde(default = "default_country")]
    pub country: String,
}

fn default_country() -> String {
    "US".to_string()
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
    pub fn load(path: &Path) -> Result<Self, Box<dyn std::error::Error>> {
        let content = std::fs::read_to_string(path)?;
        let mut config: Config = serde_json::from_str(&content)?;

        // Validate configuration
        config.validate()?;

        Ok(config)
    }

    /// Save configuration to file
    pub fn save(&self, path: &Path) -> Result<(), Box<dyn std::error::Error>> {
        // Validate before saving
        self.validate()?;

        let content = serde_json::to_string_pretty(self)?;

        // Ensure parent directory exists
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create config directory: {}", e))?;
        }

        std::fs::write(path, content)?;
        Ok(())
    }

    /// Validate configuration values
    fn validate(&self) -> Result<(), Box<dyn std::error::Error>> {
        // Define limits
        const MAX_TITLE_LENGTH: usize = 200;
        const MAX_KEYWORD_LENGTH: usize = 100;
        const MAX_ARRAY_SIZE: usize = 500;
        const MAX_CITY_LENGTH: usize = 100;
        const MAX_STATE_LENGTH: usize = 50;
        const MAX_COUNTRY_LENGTH: usize = 50;
        const MAX_WEBHOOK_URL_LENGTH: usize = 500;

        // Validate salary floor (must be non-negative)
        if self.salary_floor_usd < 0 {
            return Err("Salary floor cannot be negative".into());
        }

        // Validate salary is reasonable (less than $10M USD)
        if self.salary_floor_usd > 10_000_000 {
            return Err("Salary floor exceeds reasonable limit ($10M USD)".into());
        }

        // Validate immediate alert threshold (must be between 0.0 and 1.0)
        if self.immediate_alert_threshold < 0.0 || self.immediate_alert_threshold > 1.0 {
            return Err("Immediate alert threshold must be between 0.0 and 1.0".into());
        }

        // Validate scraping interval (must be at least 1 hour, max 168 hours/1 week)
        if self.scraping_interval_hours < 1 {
            return Err("Scraping interval must be at least 1 hour".into());
        }
        if self.scraping_interval_hours > 168 {
            return Err("Scraping interval cannot exceed 168 hours (1 week)".into());
        }

        // Validate title allowlist
        if self.title_allowlist.len() > MAX_ARRAY_SIZE {
            return Err(
                format!("Too many title allowlist entries (max: {})", MAX_ARRAY_SIZE).into(),
            );
        }
        for title in &self.title_allowlist {
            if title.is_empty() {
                return Err("Title allowlist cannot contain empty strings".into());
            }
            if title.len() > MAX_TITLE_LENGTH {
                return Err(format!("Title too long (max: {} chars)", MAX_TITLE_LENGTH).into());
            }
        }

        // Validate title blocklist
        if self.title_blocklist.len() > MAX_ARRAY_SIZE {
            return Err(
                format!("Too many title blocklist entries (max: {})", MAX_ARRAY_SIZE).into(),
            );
        }
        for title in &self.title_blocklist {
            if title.len() > MAX_TITLE_LENGTH {
                return Err(format!("Title too long (max: {} chars)", MAX_TITLE_LENGTH).into());
            }
        }

        // Validate keywords boost
        if self.keywords_boost.len() > MAX_ARRAY_SIZE {
            return Err(
                format!("Too many keywords boost entries (max: {})", MAX_ARRAY_SIZE).into(),
            );
        }
        for keyword in &self.keywords_boost {
            if keyword.is_empty() {
                return Err("Keywords boost cannot contain empty strings".into());
            }
            if keyword.len() > MAX_KEYWORD_LENGTH {
                return Err(format!("Keyword too long (max: {} chars)", MAX_KEYWORD_LENGTH).into());
            }
        }

        // Validate keywords exclude
        if self.keywords_exclude.len() > MAX_ARRAY_SIZE {
            return Err(format!(
                "Too many keywords exclude entries (max: {})",
                MAX_ARRAY_SIZE
            )
            .into());
        }
        for keyword in &self.keywords_exclude {
            if keyword.is_empty() {
                return Err("Keywords exclude cannot contain empty strings".into());
            }
            if keyword.len() > MAX_KEYWORD_LENGTH {
                return Err(format!("Keyword too long (max: {} chars)", MAX_KEYWORD_LENGTH).into());
            }
        }

        // Validate location preferences
        if self.location_preferences.cities.len() > MAX_ARRAY_SIZE {
            return Err(format!("Too many cities (max: {})", MAX_ARRAY_SIZE).into());
        }
        for city in &self.location_preferences.cities {
            if city.len() > MAX_CITY_LENGTH {
                return Err(format!("City name too long (max: {} chars)", MAX_CITY_LENGTH).into());
            }
        }

        if self.location_preferences.states.len() > MAX_ARRAY_SIZE {
            return Err(format!("Too many states (max: {})", MAX_ARRAY_SIZE).into());
        }
        for state in &self.location_preferences.states {
            if state.len() > MAX_STATE_LENGTH {
                return Err(
                    format!("State name too long (max: {} chars)", MAX_STATE_LENGTH).into(),
                );
            }
        }

        if self.location_preferences.country.len() > MAX_COUNTRY_LENGTH {
            return Err(
                format!("Country name too long (max: {} chars)", MAX_COUNTRY_LENGTH).into(),
            );
        }

        // Validate Slack webhook if enabled
        if self.alerts.slack.enabled {
            if self.alerts.slack.webhook_url.is_empty() {
                return Err("Slack webhook URL is required when Slack alerts are enabled".into());
            }
            if self.alerts.slack.webhook_url.len() > MAX_WEBHOOK_URL_LENGTH {
                return Err(format!(
                    "Webhook URL too long (max: {} chars)",
                    MAX_WEBHOOK_URL_LENGTH
                )
                .into());
            }
            // Validate URL format
            if !self
                .alerts
                .slack
                .webhook_url
                .starts_with("https://hooks.slack.com/services/")
            {
                return Err("Invalid Slack webhook URL format".into());
            }
        }

        // Validate Greenhouse URLs
        const MAX_COMPANY_URLS: usize = 100;
        const MAX_URL_LENGTH: usize = 500;

        if self.greenhouse_urls.len() > MAX_COMPANY_URLS {
            return Err(format!("Too many Greenhouse URLs (max: {})", MAX_COMPANY_URLS).into());
        }
        for url in &self.greenhouse_urls {
            if url.is_empty() {
                return Err("Greenhouse URLs cannot be empty".into());
            }
            if url.len() > MAX_URL_LENGTH {
                return Err(format!("Greenhouse URL too long (max: {} chars)", MAX_URL_LENGTH).into());
            }
            if !url.starts_with("https://boards.greenhouse.io/") {
                return Err(format!(
                    "Invalid Greenhouse URL format. Must start with 'https://boards.greenhouse.io/'. Got: {}",
                    url
                )
                .into());
            }
        }

        // Validate Lever URLs
        if self.lever_urls.len() > MAX_COMPANY_URLS {
            return Err(format!("Too many Lever URLs (max: {})", MAX_COMPANY_URLS).into());
        }
        for url in &self.lever_urls {
            if url.is_empty() {
                return Err("Lever URLs cannot be empty".into());
            }
            if url.len() > MAX_URL_LENGTH {
                return Err(format!("Lever URL too long (max: {} chars)", MAX_URL_LENGTH).into());
            }
            if !url.starts_with("https://jobs.lever.co/") {
                return Err(format!(
                    "Invalid Lever URL format. Must start with 'https://jobs.lever.co/'. Got: {}",
                    url
                )
                .into());
            }
        }

        Ok(())
    }

    /// Get default configuration file path
    pub fn default_path() -> PathBuf {
        crate::platforms::get_config_dir().join("config.json")
    }
}
