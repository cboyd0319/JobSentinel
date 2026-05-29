//! Configuration Tauri commands
//!
//! Commands for saving, retrieving, and validating app configuration.

use crate::commands::errors::user_friendly_error;
use crate::commands::AppState;
use crate::core::config::{Config, EmailConfig};
use crate::core::credentials::{CredentialKey, CredentialStore};
use crate::core::db::Database;
use crate::core::logging::path_label_for_logging;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fmt;
use tauri::State;

/// Email configuration for testing (matches frontend interface)
#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct TestEmailConfig {
    pub smtp_server: String,
    pub smtp_port: u16,
    pub smtp_username: String,
    pub smtp_password: String,
    pub from_email: String,
    pub to_emails: Vec<String>,
    #[serde(default = "default_starttls")]
    pub use_starttls: bool,
}

impl fmt::Debug for TestEmailConfig {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("TestEmailConfig")
            .field("smtp_server", &self.smtp_server)
            .field("smtp_port", &self.smtp_port)
            .field("smtp_username", &self.smtp_username)
            .field(
                "smtp_password",
                &if self.smtp_password.is_empty() {
                    "[empty]"
                } else {
                    "[REDACTED]"
                },
            )
            .field("from_email", &self.from_email)
            .field("to_emails", &self.to_emails)
            .field("use_starttls", &self.use_starttls)
            .finish()
    }
}

fn default_starttls() -> bool {
    true
}

fn get_stored_credential_for_test(key: CredentialKey, label: &str) -> Result<String, String> {
    match CredentialStore::retrieve(key) {
        Ok(Some(value)) if !value.is_empty() => Ok(value),
        Ok(_) => Err(format!("{label} credential is required")),
        Err(e) => {
            let message = user_friendly_error("Stored credential unavailable", &e);
            tracing::error!(
                credential = label,
                error = %message,
                "Stored credential unavailable"
            );
            Err(format!("{label} credential is unavailable"))
        }
    }
}

fn resolve_slack_webhook_for_test(webhook_url: String) -> Result<String, String> {
    let webhook_url = webhook_url.trim().to_string();
    if !webhook_url.is_empty() {
        return Ok(webhook_url);
    }

    get_stored_credential_for_test(CredentialKey::SlackWebhook, "Slack webhook")
}

fn resolve_smtp_password_for_test(smtp_password: String) -> Result<String, String> {
    if !smtp_password.is_empty() {
        return Ok(smtp_password);
    }

    get_stored_credential_for_test(CredentialKey::SmtpPassword, "SMTP password")
}

/// Save user configuration
#[tauri::command]
pub async fn save_config(config: Value, _state: State<'_, AppState>) -> Result<(), String> {
    tracing::info!("Command: save_config");

    // Parse config from JSON
    let parsed_config: Config = serde_json::from_value(config)
        .map_err(|e| user_friendly_error("Invalid configuration", e))?;

    // Save to file
    let config_path = Config::default_path();
    parsed_config.save(&config_path).map_err(|e| {
        let message = user_friendly_error("Failed to save configuration", &e);
        tracing::error!(
            config_path = %path_label_for_logging(&config_path),
            error = %message,
            "Failed to save configuration"
        );
        message
    })?;

    tracing::info!("Configuration saved successfully");
    Ok(())
}

/// Get user configuration
#[tauri::command]
pub async fn get_config(state: State<'_, AppState>) -> Result<Value, String> {
    tracing::info!("Command: get_config");

    serde_json::to_value(&*state.config)
        .map_err(|e| user_friendly_error("Failed to serialize config", e))
}

/// Validate Slack webhook URL
#[tauri::command]
pub async fn validate_slack_webhook(webhook_url: String) -> Result<bool, String> {
    tracing::info!("Command: validate_slack_webhook");
    let webhook_url = resolve_slack_webhook_for_test(webhook_url)?;

    match crate::core::notify::slack::validate_webhook(&webhook_url).await {
        Ok(valid) => Ok(valid),
        Err(e) => {
            let message = user_friendly_error("Validation failed", &e);
            tracing::error!(error = %message, "Webhook validation failed");
            Err(message)
        }
    }
}

/// Check if first-run setup is complete
#[tauri::command]
pub async fn is_first_run() -> Result<bool, String> {
    tracing::info!("Command: is_first_run");

    // Check if configuration file exists
    let config_path = Config::default_path();
    let first_run = !config_path.exists();

    tracing::info!("First run: {}", first_run);
    Ok(first_run)
}

/// Complete first-run setup
#[tauri::command]
pub async fn complete_setup(config: Value) -> Result<(), String> {
    tracing::info!("Command: complete_setup");

    // Parse config from JSON
    let parsed_config: Config = serde_json::from_value(config)
        .map_err(|e| user_friendly_error("Invalid configuration", e))?;

    // Ensure config directory exists
    let config_path = Config::default_path();
    if let Some(parent) = config_path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| {
            let message = user_friendly_error("Failed to create configuration directory", &e);
            tracing::error!(
                config_dir = %path_label_for_logging(parent),
                error = %message,
                "Failed to create configuration directory"
            );
            message
        })?;
    }

    // Save configuration
    parsed_config.save(&config_path).map_err(|e| {
        let message = user_friendly_error("Failed to save configuration", &e);
        tracing::error!(
            config_path = %path_label_for_logging(&config_path),
            error = %message,
            "Failed to save setup configuration"
        );
        message
    })?;

    // Initialize database
    let db_path = Database::default_path();
    let database = Database::connect(&db_path).await.map_err(|e| {
        let message = user_friendly_error("Failed to initialize database", &e);
        tracing::error!(
            db_path = %path_label_for_logging(&db_path),
            error = %message,
            "Failed to connect to setup database"
        );
        message
    })?;

    database.migrate().await.map_err(|e| {
        let message = user_friendly_error("Failed to initialize database", &e);
        tracing::error!(error = %message, "Failed to migrate setup database");
        message
    })?;

    tracing::info!("Setup complete");
    Ok(())
}

/// Test email notification configuration by sending a test email
#[tauri::command]
pub async fn test_email_notification(email_config: TestEmailConfig) -> Result<(), String> {
    tracing::info!("Command: test_email_notification");
    let smtp_password = resolve_smtp_password_for_test(email_config.smtp_password)?;

    // Convert to EmailConfig for the validate function
    let config = EmailConfig {
        enabled: true,
        smtp_server: email_config.smtp_server,
        smtp_port: email_config.smtp_port,
        smtp_username: email_config.smtp_username,
        smtp_password,
        from_email: email_config.from_email,
        to_emails: email_config.to_emails,
        use_starttls: email_config.use_starttls,
    };

    crate::core::notify::email::validate_email_config(&config)
        .await
        .map_err(|e| user_friendly_error("Failed to send test email", &e))?;

    tracing::info!("Test email sent successfully");
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_email_config_debug_does_not_leak_password() {
        let config = TestEmailConfig {
            smtp_server: "smtp.example.com".to_string(),
            smtp_port: 587,
            smtp_username: "user@example.com".to_string(),
            smtp_password: "smtp-secret-password".to_string(),
            from_email: "from@example.com".to_string(),
            to_emails: vec!["to@example.com".to_string()],
            use_starttls: true,
        };

        let debug_output = format!("{:?}", config);

        assert!(
            !debug_output.contains("smtp-secret-password"),
            "TestEmailConfig Debug output must not contain password. Got: {}",
            debug_output
        );
    }

    #[test]
    fn test_command_error_formatter_omits_raw_paths() {
        let msg = user_friendly_error(
            "Failed to initialize database",
            "sqlite:///Users/alice/.config/jobsentinel/jobs.db?mode=rwc: unable to open database file",
        );

        assert!(!msg.contains("/Users/alice"), "path leaked: {msg}");
        assert!(!msg.contains("jobs.db"), "database file leaked: {msg}");
        assert!(!msg.contains("sqlite:"), "database URL leaked: {msg}");
        assert!(msg.contains("Failed to initialize database"));
    }

    #[test]
    fn test_email_error_formatter_omits_smtp_details() {
        let msg = user_friendly_error(
            "Failed to send test email",
            "smtp://user@example.com:smtp-secret-password@smtp.example.com:587 authentication failed",
        );

        assert!(
            !msg.contains("smtp-secret-password"),
            "password leaked: {msg}"
        );
        assert!(!msg.contains("user@example.com"), "username leaked: {msg}");
        assert!(!msg.contains("smtp.example.com"), "server leaked: {msg}");
        assert!(!msg.contains("smtp://"), "smtp URL leaked: {msg}");
        assert!(msg.contains("Failed to send test email"));
    }

    #[test]
    fn test_webhook_error_formatter_omits_webhook_details() {
        let msg = user_friendly_error(
            "Validation failed",
            "https://hooks.slack.com/services/T00/B00/secret-token request failed",
        );

        assert!(!msg.contains("secret-token"), "token leaked: {msg}");
        assert!(!msg.contains("hooks.slack.com"), "host leaked: {msg}");
        assert!(!msg.contains("/services/"), "path leaked: {msg}");
        assert!(!msg.contains("https://"), "URL leaked: {msg}");
        assert!(msg.contains("Validation failed"));
    }
}
