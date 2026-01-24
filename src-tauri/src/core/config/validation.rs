//! Configuration validation logic

use super::types::Config;

/// Validate configuration values
pub fn validate_config(config: &Config) -> Result<(), Box<dyn std::error::Error>> {
    // Define limits
    const MAX_TITLE_LENGTH: usize = 200;
    const MAX_KEYWORD_LENGTH: usize = 100;
    const MAX_ARRAY_SIZE: usize = 500;
    const MAX_CITY_LENGTH: usize = 100;
    const MAX_STATE_LENGTH: usize = 50;
    const MAX_COUNTRY_LENGTH: usize = 50;
    // Note: Webhook URLs are validated separately in notify module before keyring storage

    // Validate salary floor (must be non-negative)
    if config.salary_floor_usd < 0 {
        return Err("Salary floor cannot be negative".into());
    }

    // Validate salary is reasonable (less than $10M USD)
    if config.salary_floor_usd > 10_000_000 {
        return Err("Salary floor exceeds reasonable limit ($10M USD)".into());
    }

    // Validate immediate alert threshold (must be between 0.0 and 1.0)
    if config.immediate_alert_threshold < 0.0 || config.immediate_alert_threshold > 1.0 {
        return Err("Immediate alert threshold must be between 0.0 and 1.0".into());
    }

    // Validate scraping interval (must be at least 1 hour, max 168 hours/1 week)
    if config.scraping_interval_hours < 1 {
        return Err("Scraping interval must be at least 1 hour".into());
    }
    if config.scraping_interval_hours > 168 {
        return Err("Scraping interval cannot exceed 168 hours (1 week)".into());
    }

    // Validate title allowlist
    if config.title_allowlist.len() > MAX_ARRAY_SIZE {
        return Err(format!("Too many title allowlist entries (max: {})", MAX_ARRAY_SIZE).into());
    }
    for title in &config.title_allowlist {
        if title.is_empty() {
            return Err("Title allowlist cannot contain empty strings".into());
        }
        if title.len() > MAX_TITLE_LENGTH {
            return Err(format!("Title too long (max: {} chars)", MAX_TITLE_LENGTH).into());
        }
    }

    // Validate title blocklist
    if config.title_blocklist.len() > MAX_ARRAY_SIZE {
        return Err(format!("Too many title blocklist entries (max: {})", MAX_ARRAY_SIZE).into());
    }
    for title in &config.title_blocklist {
        if title.len() > MAX_TITLE_LENGTH {
            return Err(format!("Title too long (max: {} chars)", MAX_TITLE_LENGTH).into());
        }
    }

    // Validate keywords boost
    if config.keywords_boost.len() > MAX_ARRAY_SIZE {
        return Err(format!("Too many keywords boost entries (max: {})", MAX_ARRAY_SIZE).into());
    }
    for keyword in &config.keywords_boost {
        if keyword.is_empty() {
            return Err("Keywords boost cannot contain empty strings".into());
        }
        if keyword.len() > MAX_KEYWORD_LENGTH {
            return Err(format!("Keyword too long (max: {} chars)", MAX_KEYWORD_LENGTH).into());
        }
    }

    // Validate keywords exclude
    if config.keywords_exclude.len() > MAX_ARRAY_SIZE {
        return Err(format!(
            "Too many keywords exclude entries (max: {})",
            MAX_ARRAY_SIZE
        )
        .into());
    }
    for keyword in &config.keywords_exclude {
        if keyword.is_empty() {
            return Err("Keywords exclude cannot contain empty strings".into());
        }
        if keyword.len() > MAX_KEYWORD_LENGTH {
            return Err(format!("Keyword too long (max: {} chars)", MAX_KEYWORD_LENGTH).into());
        }
    }

    // Validate location preferences
    if config.location_preferences.cities.len() > MAX_ARRAY_SIZE {
        return Err(format!("Too many cities (max: {})", MAX_ARRAY_SIZE).into());
    }
    for city in &config.location_preferences.cities {
        if city.len() > MAX_CITY_LENGTH {
            return Err(format!("City name too long (max: {} chars)", MAX_CITY_LENGTH).into());
        }
    }

    if config.location_preferences.states.len() > MAX_ARRAY_SIZE {
        return Err(format!("Too many states (max: {})", MAX_ARRAY_SIZE).into());
    }
    for state in &config.location_preferences.states {
        if state.len() > MAX_STATE_LENGTH {
            return Err(format!("State name too long (max: {} chars)", MAX_STATE_LENGTH).into());
        }
    }

    if config.location_preferences.country.len() > MAX_COUNTRY_LENGTH {
        return Err(format!("Country name too long (max: {} chars)", MAX_COUNTRY_LENGTH).into());
    }

    // Note: Slack webhook URL is stored in OS keyring, not in config file.
    // Validation of the webhook URL happens at runtime when fetching from keyring.
    // We only validate that the Slack config section exists when enabled.
    // The actual webhook URL presence is checked when sending notifications.

    // Validate Email configuration if enabled
    // Note: SMTP password is stored in OS keyring, not in config file.
    if config.alerts.email.enabled {
        if config.alerts.email.smtp_server.is_empty() {
            return Err("SMTP server is required when email alerts are enabled".into());
        }
        if config.alerts.email.smtp_server.len() > 100 {
            return Err("SMTP server name too long (max: 100 chars)".into());
        }
        if config.alerts.email.smtp_username.is_empty() {
            return Err("SMTP username is required when email alerts are enabled".into());
        }
        // smtp_password is in keyring, validated at runtime
        if config.alerts.email.from_email.is_empty() {
            return Err("From email address is required when email alerts are enabled".into());
        }
        if !config.alerts.email.from_email.contains('@') {
            return Err("Invalid from email format".into());
        }
        if config.alerts.email.to_emails.is_empty() {
            return Err(
                "At least one recipient email is required when email alerts are enabled".into(),
            );
        }
        for email in &config.alerts.email.to_emails {
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

    // Note: Discord webhook URL is stored in OS keyring, not in config file.
    // Validation of the webhook URL happens at runtime when fetching from keyring.

    // Validate Telegram configuration if enabled
    // Note: Telegram bot token is stored in OS keyring, not in config file.
    if config.alerts.telegram.enabled {
        // bot_token is in keyring, validated at runtime
        if config.alerts.telegram.chat_id.is_empty() {
            return Err("Telegram chat ID is required when Telegram alerts are enabled".into());
        }
        if config.alerts.telegram.chat_id.len() > 50 {
            return Err("Telegram chat ID too long (max: 50 chars)".into());
        }
    }

    // Note: Teams webhook URL is stored in OS keyring, not in config file.
    // Validation of the webhook URL happens at runtime when fetching from keyring.

    // Validate Greenhouse URLs
    const MAX_COMPANY_URLS: usize = 100;
    const MAX_URL_LENGTH: usize = 500;

    if config.greenhouse_urls.len() > MAX_COMPANY_URLS {
        return Err(format!("Too many Greenhouse URLs (max: {})", MAX_COMPANY_URLS).into());
    }
    for url in &config.greenhouse_urls {
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
    if config.lever_urls.len() > MAX_COMPANY_URLS {
        return Err(format!("Too many Lever URLs (max: {})", MAX_COMPANY_URLS).into());
    }
    for url in &config.lever_urls {
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
    if config.linkedin.enabled {
        if config.linkedin.session_cookie.is_empty() {
            return Err("LinkedIn session cookie is required when LinkedIn is enabled".into());
        }
        if config.linkedin.session_cookie.len() > 500 {
            return Err("LinkedIn session cookie too long (max: 500 chars)".into());
        }
        if config.linkedin.query.is_empty() {
            return Err("LinkedIn search query is required when LinkedIn is enabled".into());
        }
        if config.linkedin.query.len() > 200 {
            return Err("LinkedIn search query too long (max: 200 chars)".into());
        }
        if config.linkedin.location.len() > 100 {
            return Err("LinkedIn location too long (max: 100 chars)".into());
        }
        if config.linkedin.limit > 100 {
            return Err("LinkedIn result limit cannot exceed 100".into());
        }
        if config.linkedin.limit == 0 {
            return Err("LinkedIn result limit must be at least 1".into());
        }
    }

    Ok(())
}
