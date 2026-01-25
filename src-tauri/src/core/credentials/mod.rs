//! Secure Credential Storage
//!
//! Provides secure credential storage using the OS-native keyring:
//! - macOS: Keychain
//! - Windows: Credential Manager
//! - Linux: Secret Service API (libsecret)
//!
//! ## Architecture
//!
//! - **Frontend**: Uses `tauri-plugin-secure-storage` JS API (set_item, get_item, remove_item)
//! - **Backend**: Uses `keyring` crate directly for Rust access (scheduler, notify)
//!
//! Both use the same underlying keyring with consistent key naming.

use keyring::Entry;
use serde::{Deserialize, Serialize};

/// Credential keys supported by JobSentinel
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CredentialKey {
    /// SMTP password for email notifications
    SmtpPassword,
    /// Telegram bot token
    TelegramBotToken,
    /// Slack webhook URL
    SlackWebhook,
    /// Discord webhook URL
    DiscordWebhook,
    /// Microsoft Teams webhook URL
    TeamsWebhook,
    /// LinkedIn session cookie (li_at)
    LinkedInCookie,
    /// LinkedIn cookie expiry timestamp (ISO 8601 format)
    LinkedInCookieExpiry,
    /// USAJobs API key (free from developer.usajobs.gov)
    UsaJobsApiKey,
}

impl CredentialKey {
    /// Convert to storage key string
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::SmtpPassword => "jobsentinel_smtp_password",
            Self::TelegramBotToken => "jobsentinel_telegram_bot_token",
            Self::SlackWebhook => "jobsentinel_slack_webhook",
            Self::DiscordWebhook => "jobsentinel_discord_webhook",
            Self::TeamsWebhook => "jobsentinel_teams_webhook",
            Self::LinkedInCookie => "jobsentinel_linkedin_cookie",
            Self::LinkedInCookieExpiry => "jobsentinel_linkedin_cookie_expiry",
            Self::UsaJobsApiKey => "jobsentinel_usajobs_api_key",
        }
    }

    /// All credential keys for migration
    pub fn all() -> &'static [Self] {
        &[
            Self::SmtpPassword,
            Self::TelegramBotToken,
            Self::SlackWebhook,
            Self::DiscordWebhook,
            Self::TeamsWebhook,
            Self::LinkedInCookie,
            Self::LinkedInCookieExpiry,
            Self::UsaJobsApiKey,
        ]
    }

    /// Parse from string
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "smtp_password" | "jobsentinel_smtp_password" => Some(Self::SmtpPassword),
            "telegram_bot_token" | "jobsentinel_telegram_bot_token" => Some(Self::TelegramBotToken),
            "slack_webhook" | "jobsentinel_slack_webhook" => Some(Self::SlackWebhook),
            "discord_webhook" | "jobsentinel_discord_webhook" => Some(Self::DiscordWebhook),
            "teams_webhook" | "jobsentinel_teams_webhook" => Some(Self::TeamsWebhook),
            "linkedin_cookie" | "jobsentinel_linkedin_cookie" => Some(Self::LinkedInCookie),
            "linkedin_cookie_expiry" | "jobsentinel_linkedin_cookie_expiry" => {
                Some(Self::LinkedInCookieExpiry)
            }
            "usajobs_api_key" | "jobsentinel_usajobs_api_key" => Some(Self::UsaJobsApiKey),
            _ => None,
        }
    }
}

/// Service name for keyring entries
const SERVICE_NAME: &str = "JobSentinel";

/// Credential store for secure storage using OS keyring
///
/// This provides direct Rust access to credentials stored in the keyring.
/// Used by backend modules (scheduler, notify) that don't have access to Tauri's JS API.
pub struct CredentialStore;

impl CredentialStore {
    /// Store a credential in the OS keyring
    pub fn store(key: CredentialKey, value: &str) -> Result<(), String> {
        if value.is_empty() {
            return Self::delete(key);
        }

        let entry = Entry::new(SERVICE_NAME, key.as_str())
            .map_err(|e| format!("Failed to create keyring entry: {e}"))?;

        entry
            .set_password(value)
            .map_err(|e| format!("Failed to store credential '{}': {e}", key.as_str()))?;

        tracing::debug!("Stored credential: {}", key.as_str());
        Ok(())
    }

    /// Retrieve a credential from the OS keyring
    pub fn retrieve(key: CredentialKey) -> Result<Option<String>, String> {
        let entry = Entry::new(SERVICE_NAME, key.as_str())
            .map_err(|e| format!("Failed to create keyring entry: {e}"))?;

        match entry.get_password() {
            Ok(password) => Ok(Some(password)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(format!(
                "Failed to retrieve credential '{}': {e}",
                key.as_str()
            )),
        }
    }

    /// Delete a credential from the OS keyring
    pub fn delete(key: CredentialKey) -> Result<(), String> {
        let entry = Entry::new(SERVICE_NAME, key.as_str())
            .map_err(|e| format!("Failed to create keyring entry: {e}"))?;

        match entry.delete_credential() {
            Ok(()) => {
                tracing::debug!("Deleted credential: {}", key.as_str());
                Ok(())
            }
            Err(keyring::Error::NoEntry) => Ok(()), // Already deleted
            Err(e) => Err(format!(
                "Failed to delete credential '{}': {e}",
                key.as_str()
            )),
        }
    }

    /// Check if a credential exists in the OS keyring
    pub fn exists(key: CredentialKey) -> Result<bool, String> {
        Self::retrieve(key).map(|opt| opt.is_some())
    }

    /// Get status of all credentials (for diagnostics)
    pub fn list_status() -> Vec<(CredentialKey, bool)> {
        CredentialKey::all()
            .iter()
            .map(|&key| (key, Self::exists(key).unwrap_or(false)))
            .collect()
    }
}

/// Credential migration from plaintext config to secure storage
pub mod migration {
    use super::CredentialKey;
    use crate::platforms;
    use std::path::Path;

    const MIGRATION_FLAG_FILE: &str = "keyring_migrated_v1";

    /// Check if migration has already been performed
    pub fn is_migrated() -> bool {
        let flag_path = platforms::get_config_dir().join(MIGRATION_FLAG_FILE);
        flag_path.exists()
    }

    /// Mark migration as complete
    pub fn set_migrated() -> std::io::Result<()> {
        let flag_path = platforms::get_config_dir().join(MIGRATION_FLAG_FILE);
        std::fs::write(&flag_path, "1")?;
        tracing::info!("Marked keyring migration as complete");
        Ok(())
    }

    /// Extract credentials from old config JSON
    /// Returns Vec of (key, value) pairs to migrate
    pub fn extract_plaintext_credentials(
        config_path: &Path,
    ) -> Result<Vec<(CredentialKey, String)>, Box<dyn std::error::Error>> {
        if !config_path.exists() {
            return Ok(vec![]);
        }

        let content = std::fs::read_to_string(config_path)?;
        let config: serde_json::Value = serde_json::from_str(&content)?;

        let mut credentials = Vec::new();

        // Extract SMTP password
        if let Some(password) = config
            .pointer("/alerts/email/smtp_password")
            .and_then(|v| v.as_str())
            .filter(|s| !s.is_empty())
        {
            credentials.push((CredentialKey::SmtpPassword, password.to_string()));
        }

        // Extract Telegram bot token
        if let Some(token) = config
            .pointer("/alerts/telegram/bot_token")
            .and_then(|v| v.as_str())
            .filter(|s| !s.is_empty())
        {
            credentials.push((CredentialKey::TelegramBotToken, token.to_string()));
        }

        // Extract Slack webhook
        if let Some(url) = config
            .pointer("/alerts/slack/webhook_url")
            .and_then(|v| v.as_str())
            .filter(|s| !s.is_empty())
        {
            credentials.push((CredentialKey::SlackWebhook, url.to_string()));
        }

        // Extract Discord webhook
        if let Some(url) = config
            .pointer("/alerts/discord/webhook_url")
            .and_then(|v| v.as_str())
            .filter(|s| !s.is_empty())
        {
            credentials.push((CredentialKey::DiscordWebhook, url.to_string()));
        }

        // Extract Teams webhook
        if let Some(url) = config
            .pointer("/alerts/teams/webhook_url")
            .and_then(|v| v.as_str())
            .filter(|s| !s.is_empty())
        {
            credentials.push((CredentialKey::TeamsWebhook, url.to_string()));
        }

        // Extract LinkedIn cookie
        if let Some(cookie) = config
            .pointer("/linkedin/session_cookie")
            .and_then(|v| v.as_str())
            .filter(|s| !s.is_empty())
        {
            credentials.push((CredentialKey::LinkedInCookie, cookie.to_string()));
        }

        Ok(credentials)
    }

    /// Remove credentials from config file after migration
    pub fn clear_config_credentials(config_path: &Path) -> Result<(), Box<dyn std::error::Error>> {
        if !config_path.exists() {
            return Ok(());
        }

        let content = std::fs::read_to_string(config_path)?;
        let mut config: serde_json::Value = serde_json::from_str(&content)?;

        // Clear sensitive fields
        if let Some(obj) = config.pointer_mut("/alerts/email") {
            if let Some(map) = obj.as_object_mut() {
                map.remove("smtp_password");
            }
        }
        if let Some(obj) = config.pointer_mut("/alerts/telegram") {
            if let Some(map) = obj.as_object_mut() {
                map.remove("bot_token");
            }
        }
        if let Some(obj) = config.pointer_mut("/alerts/slack") {
            if let Some(map) = obj.as_object_mut() {
                map.remove("webhook_url");
            }
        }
        if let Some(obj) = config.pointer_mut("/alerts/discord") {
            if let Some(map) = obj.as_object_mut() {
                map.remove("webhook_url");
            }
        }
        if let Some(obj) = config.pointer_mut("/alerts/teams") {
            if let Some(map) = obj.as_object_mut() {
                map.remove("webhook_url");
            }
        }
        if let Some(obj) = config.pointer_mut("/linkedin") {
            if let Some(map) = obj.as_object_mut() {
                map.remove("session_cookie");
            }
        }

        std::fs::write(config_path, serde_json::to_string_pretty(&config)?)?;
        tracing::info!("Cleared plaintext credentials from config.json");

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_credential_key_roundtrip() {
        for key in CredentialKey::all() {
            let s = key.as_str();
            assert!(!s.is_empty());
            assert!(s.starts_with("jobsentinel_"));
        }
    }

    #[test]
    fn test_credential_key_from_str() {
        assert_eq!(
            CredentialKey::from_str("smtp_password"),
            Some(CredentialKey::SmtpPassword)
        );
        assert_eq!(
            CredentialKey::from_str("jobsentinel_slack_webhook"),
            Some(CredentialKey::SlackWebhook)
        );
        assert_eq!(CredentialKey::from_str("unknown_key"), None);
    }
}
