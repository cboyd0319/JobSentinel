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

    /// Auto-refresh configuration
    #[serde(default)]
    pub auto_refresh: AutoRefreshConfig,

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

    /// LinkedIn scraper configuration
    #[serde(default)]
    pub linkedin: LinkedInConfig,

    /// Indeed scraper configuration
    #[serde(default)]
    pub indeed: IndeedConfig,
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

/// Auto-refresh configuration for the frontend
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AutoRefreshConfig {
    /// Enable automatic job refresh
    #[serde(default)]
    pub enabled: bool,

    /// Refresh interval in minutes (default: 30)
    #[serde(default = "default_auto_refresh_interval")]
    pub interval_minutes: u32,
}

fn default_auto_refresh_interval() -> u32 {
    30
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AlertConfig {
    #[serde(default)]
    pub slack: SlackConfig,

    #[serde(default)]
    pub email: EmailConfig,

    #[serde(default)]
    pub discord: DiscordConfig,

    #[serde(default)]
    pub telegram: TelegramConfig,

    #[serde(default)]
    pub teams: TeamsConfig,

    #[serde(default)]
    pub desktop: DesktopConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SlackConfig {
    pub enabled: bool,

    #[serde(default)]
    pub webhook_url: String,
}

/// Email notification configuration
///
/// # Security Warning
///
/// The `smtp_password` field is stored in plaintext in the config file.
/// For improved security, consider:
///
/// 1. Using app-specific passwords (e.g., Gmail's app passwords)
/// 2. Restricting config file permissions (chmod 600)
/// 3. Using OAuth2 authentication (planned for v2.0)
///
/// Future versions will use OS keyring for secure credential storage:
/// - macOS: Keychain
/// - Windows: Credential Manager
/// - Linux: Secret Service API (libsecret)
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct EmailConfig {
    #[serde(default)]
    pub enabled: bool,

    /// SMTP server hostname (e.g., "smtp.gmail.com")
    #[serde(default)]
    pub smtp_server: String,

    /// SMTP port (typically 587 for STARTTLS, 465 for SSL)
    #[serde(default = "default_smtp_port")]
    pub smtp_port: u16,

    /// SMTP username/email
    #[serde(default)]
    pub smtp_username: String,

    /// SMTP password or app-specific password
    ///
    /// **Security Note**: This is stored in plaintext. Use app-specific passwords
    /// and restrict config file permissions. Keyring storage planned for v2.0.
    #[serde(default)]
    pub smtp_password: String,

    /// Email address to send from
    #[serde(default)]
    pub from_email: String,

    /// Email address(es) to send to
    #[serde(default)]
    pub to_emails: Vec<String>,

    /// Use STARTTLS (true for port 587, false for port 465)
    #[serde(default = "default_use_starttls")]
    pub use_starttls: bool,
}

fn default_smtp_port() -> u16 {
    587
}

fn default_use_starttls() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct DiscordConfig {
    #[serde(default)]
    pub enabled: bool,

    /// Discord webhook URL
    #[serde(default)]
    pub webhook_url: String,

    /// Optional: Discord user ID to mention in notifications
    #[serde(default)]
    pub user_id_to_mention: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct TelegramConfig {
    #[serde(default)]
    pub enabled: bool,

    /// Telegram Bot API token
    #[serde(default)]
    pub bot_token: String,

    /// Telegram chat ID to send messages to
    #[serde(default)]
    pub chat_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct TeamsConfig {
    #[serde(default)]
    pub enabled: bool,

    /// Microsoft Teams webhook URL
    #[serde(default)]
    pub webhook_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct DesktopConfig {
    #[serde(default = "default_desktop_enabled")]
    pub enabled: bool,

    /// Show desktop notifications even if app is focused
    #[serde(default)]
    pub show_when_focused: bool,

    /// Play sound with notifications
    #[serde(default = "default_play_sound")]
    pub play_sound: bool,
}

fn default_desktop_enabled() -> bool {
    true
}

fn default_play_sound() -> bool {
    true
}

/// LinkedIn scraper configuration
///
/// LinkedIn requires authentication via session cookie. Users must manually
/// extract this from their browser after logging in.
///
/// # Security Note
/// The session cookie provides full access to your LinkedIn account.
/// Keep your config file secure (chmod 600).
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct LinkedInConfig {
    /// Enable LinkedIn job scraping
    #[serde(default)]
    pub enabled: bool,

    /// LinkedIn session cookie (li_at value)
    /// Get this from browser DevTools: Application → Cookies → li_at
    #[serde(default)]
    pub session_cookie: String,

    /// Search query (job title, keywords)
    /// Example: "software engineer", "rust developer"
    #[serde(default)]
    pub query: String,

    /// Location filter
    /// Example: "San Francisco Bay Area", "Remote", "United States"
    #[serde(default)]
    pub location: String,

    /// Search only for remote jobs
    #[serde(default)]
    pub remote_only: bool,

    /// Maximum results to return (default: 50, max: 100)
    #[serde(default = "default_linkedin_limit")]
    pub limit: usize,
}

fn default_linkedin_limit() -> usize {
    50
}

/// Indeed scraper configuration
///
/// Indeed uses public search pages. No authentication required, but
/// aggressive scraping may trigger rate limiting.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct IndeedConfig {
    /// Enable Indeed job scraping
    #[serde(default)]
    pub enabled: bool,

    /// Search query (job title, keywords)
    /// Example: "software engineer", "security analyst"
    #[serde(default)]
    pub query: String,

    /// Location filter (city, state, zip, or "remote")
    /// Example: "San Francisco, CA", "Remote", "94105"
    #[serde(default)]
    pub location: String,

    /// Search radius in miles (default: 25)
    #[serde(default = "default_indeed_radius")]
    pub radius: u32,

    /// Maximum results to return (default: 50)
    #[serde(default = "default_indeed_limit")]
    pub limit: usize,
}

fn default_indeed_radius() -> u32 {
    25
}

fn default_indeed_limit() -> usize {
    50
}

impl Config {
    /// Load configuration from file
    pub fn load(path: &Path) -> Result<Self, Box<dyn std::error::Error>> {
        let content = std::fs::read_to_string(path)?;
        let config: Config = serde_json::from_str(&content)?;

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

        // Validate Email configuration if enabled
        if self.alerts.email.enabled {
            if self.alerts.email.smtp_server.is_empty() {
                return Err("SMTP server is required when email alerts are enabled".into());
            }
            if self.alerts.email.smtp_server.len() > 100 {
                return Err("SMTP server name too long (max: 100 chars)".into());
            }
            if self.alerts.email.smtp_username.is_empty() {
                return Err("SMTP username is required when email alerts are enabled".into());
            }
            if self.alerts.email.smtp_password.is_empty() {
                return Err("SMTP password is required when email alerts are enabled".into());
            }
            if self.alerts.email.from_email.is_empty() {
                return Err("From email address is required when email alerts are enabled".into());
            }
            if !self.alerts.email.from_email.contains('@') {
                return Err("Invalid from email format".into());
            }
            if self.alerts.email.to_emails.is_empty() {
                return Err("At least one recipient email is required when email alerts are enabled".into());
            }
            for email in &self.alerts.email.to_emails {
                if email.is_empty() {
                    return Err("Recipient email cannot be empty".into());
                }
                if !email.contains('@') {
                    return Err(format!("Invalid recipient email format: {}", email).into());
                }
                if email.len() > 100 {
                    return Err("Recipient email too long (max: 100 chars)".into());
                }
            }
        }

        // Validate Discord webhook if enabled
        if self.alerts.discord.enabled {
            if self.alerts.discord.webhook_url.is_empty() {
                return Err("Discord webhook URL is required when Discord alerts are enabled".into());
            }
            if self.alerts.discord.webhook_url.len() > MAX_WEBHOOK_URL_LENGTH {
                return Err(format!(
                    "Discord webhook URL too long (max: {} chars)",
                    MAX_WEBHOOK_URL_LENGTH
                )
                .into());
            }
            if !self.alerts.discord.webhook_url.starts_with("https://discord.com/api/webhooks/")
                && !self.alerts.discord.webhook_url.starts_with("https://discordapp.com/api/webhooks/")
            {
                return Err("Invalid Discord webhook URL format".into());
            }
        }

        // Validate Telegram configuration if enabled
        if self.alerts.telegram.enabled {
            if self.alerts.telegram.bot_token.is_empty() {
                return Err("Telegram bot token is required when Telegram alerts are enabled".into());
            }
            if self.alerts.telegram.bot_token.len() > 100 {
                return Err("Telegram bot token too long (max: 100 chars)".into());
            }
            if self.alerts.telegram.chat_id.is_empty() {
                return Err("Telegram chat ID is required when Telegram alerts are enabled".into());
            }
            if self.alerts.telegram.chat_id.len() > 50 {
                return Err("Telegram chat ID too long (max: 50 chars)".into());
            }
        }

        // Validate Teams webhook if enabled
        if self.alerts.teams.enabled {
            if self.alerts.teams.webhook_url.is_empty() {
                return Err("Teams webhook URL is required when Teams alerts are enabled".into());
            }
            if self.alerts.teams.webhook_url.len() > MAX_WEBHOOK_URL_LENGTH {
                return Err(format!(
                    "Teams webhook URL too long (max: {} chars)",
                    MAX_WEBHOOK_URL_LENGTH
                )
                .into());
            }
            // Teams webhooks can be either outlook.office.com or outlook.office365.com
            if !self.alerts.teams.webhook_url.starts_with("https://outlook.office.com/webhook/")
                && !self.alerts.teams.webhook_url.starts_with("https://outlook.office365.com/webhook/")
            {
                return Err("Invalid Teams webhook URL format".into());
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

        // Validate LinkedIn configuration if enabled
        if self.linkedin.enabled {
            if self.linkedin.session_cookie.is_empty() {
                return Err("LinkedIn session cookie is required when LinkedIn is enabled".into());
            }
            if self.linkedin.session_cookie.len() > 500 {
                return Err("LinkedIn session cookie too long (max: 500 chars)".into());
            }
            if self.linkedin.query.is_empty() {
                return Err("LinkedIn search query is required when LinkedIn is enabled".into());
            }
            if self.linkedin.query.len() > 200 {
                return Err("LinkedIn search query too long (max: 200 chars)".into());
            }
            if self.linkedin.location.len() > 100 {
                return Err("LinkedIn location too long (max: 100 chars)".into());
            }
            if self.linkedin.limit > 100 {
                return Err("LinkedIn result limit cannot exceed 100".into());
            }
            if self.linkedin.limit == 0 {
                return Err("LinkedIn result limit must be at least 1".into());
            }
        }

        // Validate Indeed configuration if enabled
        if self.indeed.enabled {
            if self.indeed.query.is_empty() {
                return Err("Indeed search query is required when Indeed is enabled".into());
            }
            if self.indeed.query.len() > 200 {
                return Err("Indeed search query too long (max: 200 chars)".into());
            }
            if self.indeed.location.len() > 100 {
                return Err("Indeed location too long (max: 100 chars)".into());
            }
            if self.indeed.radius > 100 {
                return Err("Indeed search radius cannot exceed 100 miles".into());
            }
            if self.indeed.limit > 100 {
                return Err("Indeed result limit cannot exceed 100".into());
            }
            if self.indeed.limit == 0 {
                return Err("Indeed result limit must be at least 1".into());
            }
        }

        Ok(())
    }

    /// Get default configuration file path
    pub fn default_path() -> PathBuf {
        crate::platforms::get_config_dir().join("config.json")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    /// Helper function to create a valid test config
    fn create_valid_config() -> Config {
        Config {
            title_allowlist: vec!["Security Engineer".to_string()],
            title_blocklist: vec!["Manager".to_string()],
            keywords_boost: vec!["Rust".to_string(), "Kubernetes".to_string()],
            keywords_exclude: vec!["sales".to_string()],
            location_preferences: LocationPreferences {
                allow_remote: true,
                allow_hybrid: false,
                allow_onsite: false,
                cities: vec!["San Francisco".to_string()],
                states: vec!["CA".to_string()],
                country: "US".to_string(),
            },
            salary_floor_usd: 150000,
            immediate_alert_threshold: 0.9,
            scraping_interval_hours: 2,
            alerts: AlertConfig {
                slack: SlackConfig {
                    enabled: true,
                    webhook_url: "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX".to_string(),
                },
                email: EmailConfig::default(),
                discord: DiscordConfig::default(),
                telegram: TelegramConfig::default(),
                teams: TeamsConfig::default(),
                desktop: DesktopConfig::default(),
            },
            greenhouse_urls: vec!["https://boards.greenhouse.io/cloudflare".to_string()],
            lever_urls: vec!["https://jobs.lever.co/netflix".to_string()],
            linkedin: LinkedInConfig::default(),
            indeed: IndeedConfig::default(),
        }
    }

    #[test]
    fn test_valid_config_passes_validation() {
        let config = create_valid_config();
        assert!(config.validate().is_ok(), "Valid config should pass validation");
    }

    #[test]
    fn test_negative_salary_floor_fails() {
        let mut config = create_valid_config();
        config.salary_floor_usd = -1000;

        let result = config.validate();
        assert!(result.is_err(), "Negative salary should fail validation");
        assert!(result.unwrap_err().to_string().contains("negative"));
    }

    #[test]
    fn test_excessive_salary_floor_fails() {
        let mut config = create_valid_config();
        config.salary_floor_usd = 15_000_000; // Over $10M limit

        let result = config.validate();
        assert!(result.is_err(), "Excessive salary should fail validation");
        assert!(result.unwrap_err().to_string().contains("exceeds reasonable limit"));
    }

    #[test]
    fn test_salary_floor_at_boundary_passes() {
        let mut config = create_valid_config();
        config.salary_floor_usd = 10_000_000; // Exactly $10M

        assert!(config.validate().is_ok(), "Salary at $10M boundary should pass");
    }

    #[test]
    fn test_zero_salary_floor_passes() {
        let mut config = create_valid_config();
        config.salary_floor_usd = 0;

        assert!(config.validate().is_ok(), "Zero salary floor should pass");
    }

    #[test]
    fn test_alert_threshold_too_low_fails() {
        let mut config = create_valid_config();
        config.immediate_alert_threshold = -0.1;

        let result = config.validate();
        assert!(result.is_err(), "Alert threshold < 0.0 should fail");
        assert!(result.unwrap_err().to_string().contains("between 0.0 and 1.0"));
    }

    #[test]
    fn test_alert_threshold_too_high_fails() {
        let mut config = create_valid_config();
        config.immediate_alert_threshold = 1.5;

        let result = config.validate();
        assert!(result.is_err(), "Alert threshold > 1.0 should fail");
        assert!(result.unwrap_err().to_string().contains("between 0.0 and 1.0"));
    }

    #[test]
    fn test_alert_threshold_at_boundaries_passes() {
        let mut config = create_valid_config();

        // Test lower boundary
        config.immediate_alert_threshold = 0.0;
        assert!(config.validate().is_ok(), "Alert threshold 0.0 should pass");

        // Test upper boundary
        config.immediate_alert_threshold = 1.0;
        assert!(config.validate().is_ok(), "Alert threshold 1.0 should pass");
    }

    #[test]
    fn test_scraping_interval_too_low_fails() {
        let mut config = create_valid_config();
        config.scraping_interval_hours = 0;

        let result = config.validate();
        assert!(result.is_err(), "Scraping interval < 1 hour should fail");
        assert!(result.unwrap_err().to_string().contains("at least 1 hour"));
    }

    #[test]
    fn test_scraping_interval_too_high_fails() {
        let mut config = create_valid_config();
        config.scraping_interval_hours = 169; // Over 1 week

        let result = config.validate();
        assert!(result.is_err(), "Scraping interval > 168 hours should fail");
        assert!(result.unwrap_err().to_string().contains("cannot exceed 168 hours"));
    }

    #[test]
    fn test_scraping_interval_at_boundaries_passes() {
        let mut config = create_valid_config();

        // Test lower boundary
        config.scraping_interval_hours = 1;
        assert!(config.validate().is_ok(), "Scraping interval 1 hour should pass");

        // Test upper boundary
        config.scraping_interval_hours = 168;
        assert!(config.validate().is_ok(), "Scraping interval 168 hours should pass");
    }

    #[test]
    fn test_empty_title_in_allowlist_fails() {
        let mut config = create_valid_config();
        config.title_allowlist = vec!["Valid Title".to_string(), "".to_string()];

        let result = config.validate();
        assert!(result.is_err(), "Empty title in allowlist should fail");
        assert!(result.unwrap_err().to_string().contains("empty strings"));
    }

    #[test]
    fn test_title_too_long_fails() {
        let mut config = create_valid_config();
        config.title_allowlist = vec!["a".repeat(201)]; // Over 200 char limit

        let result = config.validate();
        assert!(result.is_err(), "Title > 200 chars should fail");
        assert!(result.unwrap_err().to_string().contains("Title too long"));
    }

    #[test]
    fn test_too_many_titles_in_allowlist_fails() {
        let mut config = create_valid_config();
        config.title_allowlist = (0..501).map(|i| format!("Title {}", i)).collect();

        let result = config.validate();
        assert!(result.is_err(), "More than 500 titles should fail");
        assert!(result.unwrap_err().to_string().contains("Too many title allowlist"));
    }

    #[test]
    fn test_title_blocklist_too_long_fails() {
        let mut config = create_valid_config();
        config.title_blocklist = vec!["b".repeat(201)];

        let result = config.validate();
        assert!(result.is_err(), "Blocklist title > 200 chars should fail");
        assert!(result.unwrap_err().to_string().contains("Title too long"));
    }

    #[test]
    fn test_too_many_titles_in_blocklist_fails() {
        let mut config = create_valid_config();
        config.title_blocklist = (0..501).map(|i| format!("Block {}", i)).collect();

        let result = config.validate();
        assert!(result.is_err(), "More than 500 blocked titles should fail");
        assert!(result.unwrap_err().to_string().contains("Too many title blocklist"));
    }

    #[test]
    fn test_empty_keyword_in_boost_fails() {
        let mut config = create_valid_config();
        config.keywords_boost = vec!["Rust".to_string(), "".to_string()];

        let result = config.validate();
        assert!(result.is_err(), "Empty keyword in boost should fail");
        assert!(result.unwrap_err().to_string().contains("Keywords boost cannot contain empty"));
    }

    #[test]
    fn test_keyword_boost_too_long_fails() {
        let mut config = create_valid_config();
        config.keywords_boost = vec!["k".repeat(101)]; // Over 100 char limit

        let result = config.validate();
        assert!(result.is_err(), "Keyword > 100 chars should fail");
        assert!(result.unwrap_err().to_string().contains("Keyword too long"));
    }

    #[test]
    fn test_too_many_keywords_boost_fails() {
        let mut config = create_valid_config();
        config.keywords_boost = (0..501).map(|i| format!("Keyword{}", i)).collect();

        let result = config.validate();
        assert!(result.is_err(), "More than 500 boost keywords should fail");
        assert!(result.unwrap_err().to_string().contains("Too many keywords boost"));
    }

    #[test]
    fn test_empty_keyword_in_exclude_fails() {
        let mut config = create_valid_config();
        config.keywords_exclude = vec!["sales".to_string(), "".to_string()];

        let result = config.validate();
        assert!(result.is_err(), "Empty keyword in exclude should fail");
        assert!(result.unwrap_err().to_string().contains("Keywords exclude cannot contain empty"));
    }

    #[test]
    fn test_keyword_exclude_too_long_fails() {
        let mut config = create_valid_config();
        config.keywords_exclude = vec!["x".repeat(101)];

        let result = config.validate();
        assert!(result.is_err(), "Exclude keyword > 100 chars should fail");
        assert!(result.unwrap_err().to_string().contains("Keyword too long"));
    }

    #[test]
    fn test_too_many_keywords_exclude_fails() {
        let mut config = create_valid_config();
        config.keywords_exclude = (0..501).map(|i| format!("Exclude{}", i)).collect();

        let result = config.validate();
        assert!(result.is_err(), "More than 500 exclude keywords should fail");
        assert!(result.unwrap_err().to_string().contains("Too many keywords exclude"));
    }

    #[test]
    fn test_city_name_too_long_fails() {
        let mut config = create_valid_config();
        config.location_preferences.cities = vec!["c".repeat(101)]; // Over 100 char limit

        let result = config.validate();
        assert!(result.is_err(), "City name > 100 chars should fail");
        assert!(result.unwrap_err().to_string().contains("City name too long"));
    }

    #[test]
    fn test_too_many_cities_fails() {
        let mut config = create_valid_config();
        config.location_preferences.cities = (0..501).map(|i| format!("City{}", i)).collect();

        let result = config.validate();
        assert!(result.is_err(), "More than 500 cities should fail");
        assert!(result.unwrap_err().to_string().contains("Too many cities"));
    }

    #[test]
    fn test_state_name_too_long_fails() {
        let mut config = create_valid_config();
        config.location_preferences.states = vec!["s".repeat(51)]; // Over 50 char limit

        let result = config.validate();
        assert!(result.is_err(), "State name > 50 chars should fail");
        assert!(result.unwrap_err().to_string().contains("State name too long"));
    }

    #[test]
    fn test_too_many_states_fails() {
        let mut config = create_valid_config();
        config.location_preferences.states = (0..501).map(|i| format!("ST{}", i)).collect();

        let result = config.validate();
        assert!(result.is_err(), "More than 500 states should fail");
        assert!(result.unwrap_err().to_string().contains("Too many states"));
    }

    #[test]
    fn test_country_name_too_long_fails() {
        let mut config = create_valid_config();
        config.location_preferences.country = "c".repeat(51); // Over 50 char limit

        let result = config.validate();
        assert!(result.is_err(), "Country name > 50 chars should fail");
        assert!(result.unwrap_err().to_string().contains("Country name too long"));
    }

    #[test]
    fn test_slack_enabled_but_empty_webhook_fails() {
        let mut config = create_valid_config();
        config.alerts.slack.enabled = true;
        config.alerts.slack.webhook_url = "".to_string();

        let result = config.validate();
        assert!(result.is_err(), "Empty webhook URL when Slack enabled should fail");
        assert!(result.unwrap_err().to_string().contains("webhook URL is required"));
    }

    #[test]
    fn test_slack_disabled_with_empty_webhook_passes() {
        let mut config = create_valid_config();
        config.alerts.slack.enabled = false;
        config.alerts.slack.webhook_url = "".to_string();

        assert!(config.validate().is_ok(), "Empty webhook URL when Slack disabled should pass");
    }

    #[test]
    fn test_invalid_slack_webhook_format_fails() {
        let mut config = create_valid_config();
        config.alerts.slack.webhook_url = "https://evil.com/webhook".to_string();

        let result = config.validate();
        assert!(result.is_err(), "Invalid Slack webhook format should fail");
        assert!(result.unwrap_err().to_string().contains("Invalid Slack webhook URL format"));
    }

    #[test]
    fn test_slack_webhook_too_long_fails() {
        let mut config = create_valid_config();
        config.alerts.slack.webhook_url = format!("https://hooks.slack.com/services/{}", "X".repeat(500));

        let result = config.validate();
        assert!(result.is_err(), "Webhook URL > 500 chars should fail");
        assert!(result.unwrap_err().to_string().contains("Webhook URL too long"));
    }

    #[test]
    fn test_empty_greenhouse_url_fails() {
        let mut config = create_valid_config();
        config.greenhouse_urls = vec!["".to_string()];

        let result = config.validate();
        assert!(result.is_err(), "Empty Greenhouse URL should fail");
        assert!(result.unwrap_err().to_string().contains("Greenhouse URLs cannot be empty"));
    }

    #[test]
    fn test_invalid_greenhouse_url_prefix_fails() {
        let mut config = create_valid_config();
        config.greenhouse_urls = vec!["https://wrongsite.com/company".to_string()];

        let result = config.validate();
        assert!(result.is_err(), "Invalid Greenhouse URL prefix should fail");
        assert!(result.unwrap_err().to_string().contains("Invalid Greenhouse URL format"));
    }

    #[test]
    fn test_greenhouse_url_too_long_fails() {
        let mut config = create_valid_config();
        config.greenhouse_urls = vec![format!("https://boards.greenhouse.io/{}", "x".repeat(500))];

        let result = config.validate();
        assert!(result.is_err(), "Greenhouse URL > 500 chars should fail");
        assert!(result.unwrap_err().to_string().contains("Greenhouse URL too long"));
    }

    #[test]
    fn test_too_many_greenhouse_urls_fails() {
        let mut config = create_valid_config();
        config.greenhouse_urls = (0..101)
            .map(|i| format!("https://boards.greenhouse.io/company{}", i))
            .collect();

        let result = config.validate();
        assert!(result.is_err(), "More than 100 Greenhouse URLs should fail");
        assert!(result.unwrap_err().to_string().contains("Too many Greenhouse URLs"));
    }

    #[test]
    fn test_empty_lever_url_fails() {
        let mut config = create_valid_config();
        config.lever_urls = vec!["".to_string()];

        let result = config.validate();
        assert!(result.is_err(), "Empty Lever URL should fail");
        assert!(result.unwrap_err().to_string().contains("Lever URLs cannot be empty"));
    }

    #[test]
    fn test_invalid_lever_url_prefix_fails() {
        let mut config = create_valid_config();
        config.lever_urls = vec!["https://wrongsite.com/company".to_string()];

        let result = config.validate();
        assert!(result.is_err(), "Invalid Lever URL prefix should fail");
        assert!(result.unwrap_err().to_string().contains("Invalid Lever URL format"));
    }

    #[test]
    fn test_lever_url_too_long_fails() {
        let mut config = create_valid_config();
        config.lever_urls = vec![format!("https://jobs.lever.co/{}", "y".repeat(500))];

        let result = config.validate();
        assert!(result.is_err(), "Lever URL > 500 chars should fail");
        assert!(result.unwrap_err().to_string().contains("Lever URL too long"));
    }

    #[test]
    fn test_too_many_lever_urls_fails() {
        let mut config = create_valid_config();
        config.lever_urls = (0..101)
            .map(|i| format!("https://jobs.lever.co/company{}", i))
            .collect();

        let result = config.validate();
        assert!(result.is_err(), "More than 100 Lever URLs should fail");
        assert!(result.unwrap_err().to_string().contains("Too many Lever URLs"));
    }

    #[test]
    fn test_save_and_load_config_roundtrip() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let config_path = temp_dir.path().join("config.json");

        let original_config = create_valid_config();

        // Save config
        original_config.save(&config_path).expect("Failed to save config");

        // Verify file exists
        assert!(config_path.exists(), "Config file should exist after save");

        // Load config back
        let loaded_config = Config::load(&config_path).expect("Failed to load config");

        // Verify key fields match
        assert_eq!(loaded_config.title_allowlist, original_config.title_allowlist);
        assert_eq!(loaded_config.salary_floor_usd, original_config.salary_floor_usd);
        assert_eq!(loaded_config.immediate_alert_threshold, original_config.immediate_alert_threshold);
        assert_eq!(loaded_config.greenhouse_urls, original_config.greenhouse_urls);
    }

    #[test]
    fn test_save_creates_parent_directories() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let config_path = temp_dir.path().join("nested").join("dirs").join("config.json");

        let config = create_valid_config();

        // Save should create nested directories
        config.save(&config_path).expect("Failed to save config to nested path");

        assert!(config_path.exists(), "Config file should exist in nested directories");
    }

    #[test]
    fn test_load_invalid_json_fails() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let config_path = temp_dir.path().join("invalid.json");

        // Write invalid JSON
        fs::write(&config_path, "{ this is not valid JSON }").expect("Failed to write file");

        let result = Config::load(&config_path);
        assert!(result.is_err(), "Loading invalid JSON should fail");
    }

    #[test]
    fn test_load_nonexistent_file_fails() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let config_path = temp_dir.path().join("nonexistent.json");

        let result = Config::load(&config_path);
        assert!(result.is_err(), "Loading nonexistent file should fail");
    }

    #[test]
    fn test_save_invalid_config_fails() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let config_path = temp_dir.path().join("config.json");

        let mut config = create_valid_config();
        config.salary_floor_usd = -1000; // Make it invalid

        let result = config.save(&config_path);
        assert!(result.is_err(), "Saving invalid config should fail");
    }

    #[test]
    fn test_default_values() {
        // Test that default functions return expected values
        assert_eq!(default_immediate_threshold(), 0.9);
        assert_eq!(default_scraping_interval(), 2);
        assert_eq!(default_country(), "US");
    }

    // ========================================
    // Property-Based Tests
    // ========================================
    // NOTE: Temporarily disabled due to proptest macro compatibility issues
    // TODO: Fix proptest integration after upgrading to compatible version

    /*
    use proptest::prelude::*;

    proptest! {
        /// Property: Valid salary range always passes validation
        #[test]
        fn prop_valid_salary_passes(
            salary in 0i64..=10_000_000i64,
        ) {
            let mut config = create_valid_config();
            config.salary_floor_usd = salary;

            prop_assert!(config.validate().is_ok());
        }

        /// Property: Negative salary always fails validation
        #[test]
        fn prop_negative_salary_fails(
            salary in i64::MIN..-1i64,
        ) {
            let mut config = create_valid_config();
            config.salary_floor_usd = salary;

            prop_assert!(config.validate().is_err());
        }

        /// Property: Salary above $10M fails validation
        #[test]
        fn prop_excessive_salary_fails(
            salary in 10_000_001i64..=i64::MAX,
        ) {
            let mut config = create_valid_config();
            config.salary_floor_usd = salary;

            prop_assert!(config.validate().is_err());
        }

        /// Property: Alert threshold in range [0.0, 1.0] passes validation
        #[test]
        fn prop_valid_threshold_passes(
            threshold in 0.0f64..=1.0f64,
        ) {
            let mut config = create_valid_config();
            config.immediate_alert_threshold = threshold;

            prop_assert!(config.validate().is_ok());
        }

        /// Property: Alert threshold outside [0.0, 1.0] fails validation
        #[test]
        fn prop_invalid_threshold_fails(
            threshold in prop::num::f64::ANY,
        ) {
            prop_assume!(threshold < 0.0 || threshold > 1.0);
            prop_assume!(!threshold.is_nan());

            let mut config = create_valid_config();
            config.immediate_alert_threshold = threshold;

            prop_assert!(config.validate().is_err());
        }

        /// Property: Scraping interval in range [1, 168] hours passes
        #[test]
        fn prop_valid_interval_passes(
            interval in 1u64..=168u64,
        ) {
            let mut config = create_valid_config();
            config.scraping_interval_hours = interval;

            prop_assert!(config.validate().is_ok());
        }

        /// Property: Scraping interval of 0 hours fails
        #[test]
        fn prop_zero_interval_fails() {
            let mut config = create_valid_config();
            config.scraping_interval_hours = 0;

            prop_assert!(config.validate().is_err());
        }

        /// Property: Scraping interval over 168 hours fails
        #[test]
        fn prop_excessive_interval_fails(
            interval in 169u64..=1000u64,
        ) {
            let mut config = create_valid_config();
            config.scraping_interval_hours = interval;

            prop_assert!(config.validate().is_err());
        }

        /// Property: Title allowlist with valid strings passes
        #[test]
        fn prop_valid_title_allowlist_passes(
            titles in proptest::collection::vec("[a-zA-Z ]{1,200}", 1..100),
        ) {
            let mut config = create_valid_config();
            config.title_allowlist = titles;

            prop_assert!(config.validate().is_ok());
        }

        /// Property: Title allowlist with empty strings fails
        #[test]
        fn prop_empty_title_in_allowlist_fails(
            prefix in proptest::collection::vec("[a-zA-Z ]{1,50}", 0..5),
            suffix in proptest::collection::vec("[a-zA-Z ]{1,50}", 0..5),
        ) {
            let mut config = create_valid_config();
            let mut titles = prefix;
            titles.push("".to_string()); // Add empty string
            titles.extend(suffix);
            config.title_allowlist = titles;

            prop_assert!(config.validate().is_err());
        }

        /// Property: Excessive title allowlist size fails
        #[test]
        fn prop_excessive_title_allowlist_fails(
            titles in proptest::collection::vec("[a-zA-Z]{1,50}", 501..600),
        ) {
            let mut config = create_valid_config();
            config.title_allowlist = titles;

            prop_assert!(config.validate().is_err());
        }

        /// Property: Title longer than 200 chars fails
        #[test]
        fn prop_long_title_fails(
            title in "[a-zA-Z ]{201,500}",
        ) {
            let mut config = create_valid_config();
            config.title_allowlist = vec![title];

            prop_assert!(config.validate().is_err());
        }

        /// Property: Keywords boost with valid strings passes
        #[test]
        fn prop_valid_keywords_boost_passes(
            keywords in proptest::collection::vec("[a-zA-Z]{1,100}", 1..100),
        ) {
            let mut config = create_valid_config();
            config.keywords_boost = keywords;

            prop_assert!(config.validate().is_ok());
        }

        /// Property: Empty keyword in boost list fails
        #[test]
        fn prop_empty_keyword_fails(
            prefix in proptest::collection::vec("[a-zA-Z]{1,50}", 0..5),
        ) {
            let mut config = create_valid_config();
            let mut keywords = prefix;
            keywords.push("".to_string());
            config.keywords_boost = keywords;

            prop_assert!(config.validate().is_err());
        }

        /// Property: Webhook URL validation is length-bounded
        #[test]
        fn prop_webhook_url_length_bounded(
            url in "https://hooks\\.slack\\.com/services/[A-Z0-9]{1,480}",
        ) {
            let config = create_valid_config();

            // URL length should be validated (max 500 chars)
            prop_assert!(url.len() <= 500);
        }

        /// Property: Country code validation accepts valid strings
        #[test]
        fn prop_country_code_valid(
            country in "[A-Z]{2}",
        ) {
            let mut config = create_valid_config();
            config.location_preferences.country = country.clone();

            prop_assert!(config.validate().is_ok());
            prop_assert_eq!(config.location_preferences.country, country);
        }

        /// Property: City names with valid length pass
        #[test]
        fn prop_city_names_valid(
            cities in proptest::collection::vec("[a-zA-Z ]{1,100}", 0..50),
        ) {
            let mut config = create_valid_config();
            config.location_preferences.cities = cities;

            prop_assert!(config.validate().is_ok());
        }

        /// Property: Boolean location preferences are always valid
        #[test]
        fn prop_location_booleans_always_valid(
            allow_remote in proptest::bool::ANY,
            allow_hybrid in proptest::bool::ANY,
            allow_onsite in proptest::bool::ANY,
        ) {
            let mut config = create_valid_config();
            config.location_preferences.allow_remote = allow_remote;
            config.location_preferences.allow_hybrid = allow_hybrid;
            config.location_preferences.allow_onsite = allow_onsite;

            prop_assert!(config.validate().is_ok());
        }
    }
    */
}
