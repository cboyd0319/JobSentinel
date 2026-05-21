//! Secure Credential Storage
//!
//! Provides secure credential storage using the OS-native keyring:
//! - macOS: Keychain
//! - Windows: Credential Manager
//! - Linux: Secret Service API (libsecret)
//!
//! ## Architecture
//!
//! - **Frontend**: Uses Tauri credential commands (`store_credential`, `retrieve_credential`,
//!   `has_credential`, etc.)
//! - **Backend**: Uses `keyring` crate directly for Rust access (scheduler, notify)
//!
//! Both paths use the same underlying keyring with consistent key naming.

use keyring::Entry;
use serde::{Deserialize, Serialize};
use std::str::FromStr;

/// Enumeration of all credential types supported by JobSentinel.
///
/// Each variant maps to a specific keyring entry with a prefixed key name.
/// Credentials are stored securely in the OS-native keyring backend.
///
/// # Platform Support
///
/// - macOS: Keychain
/// - Windows: Credential Manager
/// - Linux: Secret Service API (libsecret)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CredentialKey {
    /// SMTP password for email notifications.
    SmtpPassword,
    /// Telegram bot token for Telegram notifications.
    TelegramBotToken,
    /// Slack webhook URL for Slack notifications.
    SlackWebhook,
    /// Discord webhook URL for Discord notifications.
    DiscordWebhook,
    /// Microsoft Teams webhook URL for Teams notifications.
    TeamsWebhook,
    /// LinkedIn session cookie (li_at) for authenticated scraping.
    LinkedInCookie,
    /// LinkedIn cookie expiry timestamp (ISO 8601 format) for proactive renewal.
    LinkedInCookieExpiry,
    /// USAJobs API key (free from developer.usajobs.gov) for API access.
    UsaJobsApiKey,
}

impl CredentialKey {
    /// Convert credential key to its storage identifier.
    ///
    /// All keys are prefixed with `jobsentinel_` for namespacing in the keyring.
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

    /// Return all credential keys (used for migration and diagnostics).
    ///
    /// # Examples
    ///
    /// ```
    /// # use jobsentinel::core::credentials::CredentialKey;
    /// for key in CredentialKey::all() {
    ///     println!("Credential: {}", key.as_str());
    /// }
    /// ```
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
}

impl FromStr for CredentialKey {
    type Err = String;

    /// Parse credential key from string.
    ///
    /// Accepts both prefixed (`jobsentinel_smtp_password`) and unprefixed
    /// (`smtp_password`) variants for backwards compatibility.
    ///
    /// # Errors
    ///
    /// Returns error if the string doesn't match any known credential key.
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "smtp_password" | "jobsentinel_smtp_password" => Ok(Self::SmtpPassword),
            "telegram_bot_token" | "jobsentinel_telegram_bot_token" => Ok(Self::TelegramBotToken),
            "slack_webhook" | "jobsentinel_slack_webhook" => Ok(Self::SlackWebhook),
            "discord_webhook" | "jobsentinel_discord_webhook" => Ok(Self::DiscordWebhook),
            "teams_webhook" | "jobsentinel_teams_webhook" => Ok(Self::TeamsWebhook),
            "linkedin_cookie" | "jobsentinel_linkedin_cookie" => Ok(Self::LinkedInCookie),
            "linkedin_cookie_expiry" | "jobsentinel_linkedin_cookie_expiry" => {
                Ok(Self::LinkedInCookieExpiry)
            }
            "usajobs_api_key" | "jobsentinel_usajobs_api_key" => Ok(Self::UsaJobsApiKey),
            _ => Err("invalid credential key".to_string()),
        }
    }
}

/// Service name for all keyring entries (used as namespace).
const SERVICE_NAME: &str = "JobSentinel";
const MAX_LINKEDIN_COOKIE_LEN: usize = 500;

fn validate_credential_value(key: CredentialKey, value: &str) -> Result<(), String> {
    if key != CredentialKey::LinkedInCookie {
        return Ok(());
    }

    if value.len() > MAX_LINKEDIN_COOKIE_LEN {
        return Err("LinkedIn cookie is too long".to_string());
    }

    if value.chars().any(|ch| ch.is_ascii_control() || ch == ';') {
        return Err("LinkedIn cookie contains unsupported characters".to_string());
    }

    Ok(())
}

/// Secure credential storage using OS-native keyring.
///
/// Provides direct Rust access to credentials stored in the OS keyring.
/// Used by backend modules (scheduler, notify) that don't have access to
/// Tauri's JS API.
///
/// # Architecture
///
/// - Frontend uses Tauri credential commands backed by this store
/// - Backend uses this `CredentialStore` (Rust API)
/// - Both access the same underlying keyring entries
///
/// # Platform Backends
///
/// - macOS: Keychain (stored in `login.keychain`)
/// - Windows: Credential Manager (accessible via Control Panel)
/// - Linux: Secret Service API via `libsecret` (requires D-Bus)
///
/// # Security
///
/// - Credentials encrypted at rest by OS
/// - User authentication required for access (OS-enforced)
/// - No plaintext storage in filesystem
///
/// # Examples
///
/// ```no_run
/// # use jobsentinel::core::credentials::{CredentialStore, CredentialKey};
/// # fn main() -> Result<(), String> {
/// // Store a credential
/// CredentialStore::store(CredentialKey::SmtpPassword, "secret123")?;
///
/// // Retrieve it
/// if let Some(password) = CredentialStore::retrieve(CredentialKey::SmtpPassword)? {
///     println!("Got password: {}", password);
/// }
///
/// // Delete it
/// CredentialStore::delete(CredentialKey::SmtpPassword)?;
/// # Ok(())
/// # }
/// ```
pub struct CredentialStore;

impl CredentialStore {
    /// Store a credential in the OS keyring.
    ///
    /// Empty values trigger deletion instead of storage (convenience behavior).
    ///
    /// # Arguments
    ///
    /// * `key` - Credential type to store
    /// * `value` - Secret value (password, token, URL, etc.)
    ///
    /// # Errors
    ///
    /// Returns error if keyring is inaccessible or OS denies permission.
    pub fn store(key: CredentialKey, value: &str) -> Result<(), String> {
        if value.is_empty() {
            return Self::delete(key);
        }

        validate_credential_value(key, value)?;

        let entry = Entry::new(SERVICE_NAME, key.as_str())
            .map_err(|e| format!("Failed to create keyring entry: {e}"))?;

        entry
            .set_password(value)
            .map_err(|e| format!("Failed to store credential '{}': {e}", key.as_str()))?;

        tracing::debug!("Stored credential: {}", key.as_str());
        Ok(())
    }

    /// Retrieve a credential from the OS keyring.
    ///
    /// # Arguments
    ///
    /// * `key` - Credential type to retrieve
    ///
    /// # Returns
    ///
    /// - `Ok(Some(value))` - Credential found and retrieved
    /// - `Ok(None)` - Credential doesn't exist (not an error)
    /// - `Err(_)` - Keyring error or permission denied
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

    /// Delete a credential from the OS keyring.
    ///
    /// Deleting a non-existent credential is not an error (idempotent).
    ///
    /// # Arguments
    ///
    /// * `key` - Credential type to delete
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

    /// Check if a credential exists in the OS keyring.
    ///
    /// # Arguments
    ///
    /// * `key` - Credential type to check
    ///
    /// # Returns
    ///
    /// `true` if credential exists, `false` otherwise.
    pub fn exists(key: CredentialKey) -> Result<bool, String> {
        Self::retrieve(key).map(|opt| opt.is_some())
    }

    /// Get existence status of all credential types (for diagnostics).
    ///
    /// Useful for settings UI to show which credentials are configured.
    ///
    /// # Returns
    ///
    /// Vector of `(key, exists)` tuples for all credential types.
    /// If keyring check fails, assumes credential doesn't exist (fail-safe).
    pub fn list_status() -> Vec<(CredentialKey, bool)> {
        CredentialKey::all()
            .iter()
            .map(|&key| (key, Self::exists(key).unwrap_or(false)))
            .collect()
    }
}

/// Migration utilities for moving credentials from plaintext config to secure keyring.
///
/// Security-sensitive migration.
///
/// Early versions of JobSentinel stored credentials in plaintext `config.json`.
/// This module migrates those credentials to OS keyring and clears them from config.
///
/// # Migration Process
///
/// 1. Check if migration already completed (flag file)
/// 2. Extract credentials from `config.json`
/// 3. Store each credential in OS keyring
/// 4. Clear plaintext credentials from config
/// 5. Write migration flag only after successful cleanup
///
/// # One-Time Execution
///
/// Migration runs once on first startup and creates a flag file to prevent
/// re-execution. The flag file is stored in the config directory.
pub mod migration {
    use super::CredentialKey;
    use crate::platforms;
    use std::path::Path;

    const MIGRATION_FLAG_FILE: &str = "keyring_migrated_v1";

    /// Check if keyring migration has already been performed.
    ///
    /// # Returns
    ///
    /// `true` if migration flag file exists, `false` otherwise.
    pub fn is_migrated() -> bool {
        let flag_path = platforms::get_config_dir().join(MIGRATION_FLAG_FILE);
        flag_path.exists()
    }

    /// Mark migration as complete by writing flag file.
    ///
    /// # Errors
    ///
    /// Returns IO error if unable to write flag file.
    pub fn set_migrated() -> std::io::Result<()> {
        let flag_path = platforms::get_config_dir().join(MIGRATION_FLAG_FILE);
        std::fs::write(&flag_path, "1")?;
        tracing::info!("Marked keyring migration as complete");
        Ok(())
    }

    /// Extract credentials from legacy plaintext config file.
    ///
    /// Parses JSON config and extracts sensitive fields using JSON Pointer paths.
    /// Non-existent config files return empty vector (not an error).
    ///
    /// # Arguments
    ///
    /// * `config_path` - Path to `config.json` file
    ///
    /// # Returns
    ///
    /// Vector of `(key, value)` pairs for all found credentials.
    /// Empty values are filtered out (not migrated).
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

        // Extract USAJobs API key
        if let Some(api_key) = config
            .pointer("/usajobs/api_key")
            .and_then(|v| v.as_str())
            .filter(|s| !s.is_empty())
        {
            credentials.push((CredentialKey::UsaJobsApiKey, api_key.to_string()));
        }

        Ok(credentials)
    }

    /// Remove credentials from config file after successful migration.
    ///
    /// Parses config JSON, removes all sensitive fields, and writes back
    /// the cleaned config. Non-existent files are silently skipped.
    ///
    /// # Arguments
    ///
    /// * `config_path` - Path to `config.json` file to clean
    ///
    /// # Safety
    ///
    /// Only call this AFTER successfully storing credentials in keyring.
    /// Otherwise credentials will be lost.
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
        if let Some(obj) = config.pointer_mut("/usajobs") {
            if let Some(map) = obj.as_object_mut() {
                map.remove("api_key");
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
            "smtp_password".parse::<CredentialKey>().unwrap(),
            CredentialKey::SmtpPassword
        );
        assert_eq!(
            "jobsentinel_slack_webhook"
                .parse::<CredentialKey>()
                .unwrap(),
            CredentialKey::SlackWebhook
        );
        assert!("unknown_key".parse::<CredentialKey>().is_err());
    }

    #[test]
    fn test_invalid_credential_key_error_does_not_echo_input() {
        let secret_like_key = "slack_webhook=https://hooks.slack.com/services/T/B/secret";
        let err = secret_like_key.parse::<CredentialKey>().unwrap_err();

        assert_eq!(err, "invalid credential key");
        assert!(
            !err.contains("secret"),
            "parse error must not echo caller input: {err}"
        );
    }

    #[test]
    fn linkedin_cookie_validation_rejects_oversized_values_without_echo() {
        let cookie = format!("AQ{}", "x".repeat(MAX_LINKEDIN_COOKIE_LEN));
        let err = validate_credential_value(CredentialKey::LinkedInCookie, &cookie).unwrap_err();

        assert_eq!(err, "LinkedIn cookie is too long");
        assert!(
            !err.contains(&cookie),
            "validation error must not echo cookie value: {err}"
        );
    }

    #[test]
    fn linkedin_cookie_validation_rejects_header_separators_without_echo() {
        let cookie = "AQvalidPrefix; other_cookie=secret";
        let err = validate_credential_value(CredentialKey::LinkedInCookie, cookie).unwrap_err();

        assert_eq!(err, "LinkedIn cookie contains unsupported characters");
        assert!(
            !err.contains("secret"),
            "validation error must not echo cookie value: {err}"
        );
    }

    #[test]
    fn linkedin_cookie_validation_rejects_control_characters_without_echo() {
        let cookie = "AQvalidPrefix\r\nx-secret: value";
        let err = validate_credential_value(CredentialKey::LinkedInCookie, cookie).unwrap_err();

        assert_eq!(err, "LinkedIn cookie contains unsupported characters");
        assert!(
            !err.contains("x-secret"),
            "validation error must not echo cookie value: {err}"
        );
    }

    #[test]
    fn test_migration_extracts_and_clears_usajobs_api_key() {
        let temp_dir = tempfile::tempdir().unwrap();
        let config_path = temp_dir.path().join("config.json");
        std::fs::write(
            &config_path,
            r#"{
              "alerts": {
                "email": { "smtp_password": "smtp-secret" }
              },
              "linkedin": { "session_cookie": "linkedin-secret" },
              "usajobs": {
                "api_key": "usajobs-secret",
                "email": "user@example.com"
              }
            }"#,
        )
        .unwrap();

        let credentials = migration::extract_plaintext_credentials(&config_path).unwrap();
        assert!(credentials.contains(&(CredentialKey::UsaJobsApiKey, "usajobs-secret".to_string())));

        migration::clear_config_credentials(&config_path).unwrap();

        let cleaned = std::fs::read_to_string(&config_path).unwrap();
        let cleaned_json: serde_json::Value = serde_json::from_str(&cleaned).unwrap();
        assert_eq!(
            cleaned_json
                .pointer("/usajobs/email")
                .and_then(|v| v.as_str()),
            Some("user@example.com")
        );
        assert!(cleaned_json.pointer("/usajobs/api_key").is_none());
    }
}
