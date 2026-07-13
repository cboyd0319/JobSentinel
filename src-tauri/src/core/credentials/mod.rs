//! Secure Credential Storage
//!
//! Provides credential key definitions, a vault-backed runtime provider, and
//! a legacy OS credential-store compatibility path.
//!
//! ## Architecture
//!
//! - **Frontend**: Uses Tauri credential commands (`store_credential`, `has_credential`, etc.)
//! - **Backend**: Uses `CredentialService` for scheduler, notifications, smoke tests, and commands
//! - **Compatibility**: Uses `CredentialStore` only for legacy fallback and live keyring tests

mod key;
mod passphrase;
mod service;
pub mod smtp;
pub mod vault;
mod vault_key_store;

pub use key::{CredentialKey, CredentialPresence};
pub use service::{CredentialService, CredentialUnlockMode, CredentialUnlockState};
pub use vault::{SecretVault, SecretVaultError};

use crate::core::secure_storage::SERVICE_NAME;
use keyring::{Entry, Error as KeyringError};

const MAX_LINKEDIN_COOKIE_LEN: usize = 500;
const LINKEDIN_CREDENTIAL_STORAGE_DISABLED: &str =
    "JobSentinel does not collect LinkedIn login details or session cookies";
const SECURE_STORAGE_UNAVAILABLE: &str =
    "JobSentinel could not use your device's secure storage. Check system permission prompts, then try again.";
fn credential_entry(key: CredentialKey) -> Result<Entry, String> {
    Entry::new(SERVICE_NAME, key.as_str()).map_err(|_| secure_storage_error())
}

fn secure_storage_error() -> String {
    SECURE_STORAGE_UNAVAILABLE.to_string()
}

fn credential_presence_from_result(
    key: CredentialKey,
    exists_result: Result<bool, String>,
) -> CredentialPresence {
    match exists_result {
        Ok(exists) => CredentialPresence {
            key,
            exists,
            available: true,
        },
        Err(_) => CredentialPresence {
            key,
            exists: false,
            available: false,
        },
    }
}

fn validate_credential_value(key: CredentialKey, value: &str) -> Result<(), String> {
    match key {
        CredentialKey::LinkedInCookie => validate_legacy_linkedin_cookie(value),
        CredentialKey::SlackWebhook => {
            validate_webhook_credential(value, &["hooks.slack.com"], "/services/", "Slack")
        }
        CredentialKey::DiscordWebhook => validate_webhook_credential(
            value,
            &["discord.com", "discordapp.com", "hooks.discord.com"],
            "/api/webhooks/",
            "Discord",
        ),
        CredentialKey::TeamsWebhook => validate_teams_webhook_credential(value),
        CredentialKey::TelegramBotToken => validate_telegram_bot_token_credential(value),
        CredentialKey::ExternalAiOpenAiApiKey
        | CredentialKey::ExternalAiAnthropicApiKey
        | CredentialKey::ExternalAiGoogleApiKey
        | CredentialKey::ExternalAiGithubCopilotApiKey
        | CredentialKey::ExternalAiCustomApiKey => {
            validate_api_key_credential(value, "Outside AI API key")
        }
        _ => Ok(()),
    }
}

fn reject_disabled_credential_storage(key: CredentialKey) -> Result<(), String> {
    if is_disabled_credential(key) {
        Err(LINKEDIN_CREDENTIAL_STORAGE_DISABLED.to_string())
    } else {
        Ok(())
    }
}

fn is_disabled_credential(key: CredentialKey) -> bool {
    matches!(
        key,
        CredentialKey::LinkedInCookie | CredentialKey::LinkedInCookieExpiry
    )
}

fn validate_legacy_linkedin_cookie(value: &str) -> Result<(), String> {
    if value.len() > MAX_LINKEDIN_COOKIE_LEN {
        return Err("Legacy LinkedIn credential is too long".to_string());
    }

    if value.chars().any(|ch| ch.is_ascii_control() || ch == ';') {
        return Err("Legacy LinkedIn credential contains unsupported characters".to_string());
    }

    Ok(())
}

fn validate_api_key_credential(value: &str, label: &str) -> Result<(), String> {
    let trimmed = value.trim();
    if trimmed.len() < 8 || trimmed.len() > 4096 {
        return Err(format!(
            "{label} should be the provider key copied from your account. Leave it blank if you are not ready to use outside AI."
        ));
    }

    if trimmed
        .chars()
        .any(|ch| ch.is_ascii_control() || ch.is_whitespace())
    {
        return Err(format!(
            "{label} should not include spaces, line breaks, or hidden characters."
        ));
    }

    Ok(())
}

fn validate_webhook_credential(
    value: &str,
    allowed_hosts: &[&str],
    required_path_prefix: &str,
    provider_label: &str,
) -> Result<(), String> {
    let help = format!(
        "Paste the full {provider_label} connection link copied from {provider_label}. If you are not sure, leave it blank and set it up later."
    );
    let url = url::Url::parse(value).map_err(|_| help.clone())?;

    if url.scheme() != "https" {
        return Err(help);
    }

    if !url.username().is_empty() || url.password().is_some() {
        return Err(help);
    }

    if let Some(port) = url.port() {
        if port != 443 {
            return Err(help);
        }
    }

    let host = url.host_str().map(str::to_ascii_lowercase);
    if !host.is_some_and(|host| allowed_hosts.contains(&host.as_str())) {
        return Err(help);
    }

    if !url.path().starts_with(required_path_prefix) {
        return Err(help);
    }

    Ok(())
}

fn validate_teams_webhook_credential(value: &str) -> Result<(), String> {
    let help =
        "Paste the full Teams connection link copied from Teams. If you are not sure, leave it blank and set it up later."
            .to_string();
    let url = url::Url::parse(value).map_err(|_| help.clone())?;

    if url.scheme() != "https" {
        return Err(help);
    }

    if !url.username().is_empty() || url.password().is_some() {
        return Err(help);
    }

    if let Some(port) = url.port() {
        if port != 443 {
            return Err(help);
        }
    }

    let Some(host) = url.host_str().map(str::to_ascii_lowercase) else {
        return Err(help);
    };
    let path = url.path();
    let has_generated_path = path.len() > 1;

    let legacy_connector = matches!(
        host.as_str(),
        "outlook.office.com" | "outlook.office365.com"
    ) && path.starts_with("/webhook/");
    let current_connector =
        host.ends_with(".webhook.office.com") && host != "webhook.office.com" && has_generated_path;
    let workflow_trigger =
        host.ends_with(".logic.azure.com") && host != "logic.azure.com" && has_generated_path;

    if legacy_connector || current_connector || workflow_trigger {
        Ok(())
    } else {
        Err(help)
    }
}

fn validate_telegram_bot_token_credential(value: &str) -> Result<(), String> {
    let help =
        "Paste the Telegram bot token copied from BotFather. If you are not sure, leave it blank and set it up later.";
    let Some((bot_id, token_part)) = value.split_once(':') else {
        return Err(help.to_string());
    };

    if token_part.contains(':') {
        return Err(help.to_string());
    }

    if bot_id.is_empty() || !bot_id.chars().all(|ch| ch.is_ascii_digit()) {
        return Err(help.to_string());
    }

    if token_part.len() < 20
        || !token_part
            .chars()
            .all(|ch| ch.is_ascii_alphanumeric() || ch == '_' || ch == '-')
    {
        return Err(help.to_string());
    }

    Ok(())
}

/// Legacy secure credential storage using the OS-native keyring.
///
/// This compatibility path is retained for migration fallback, legacy cleanup,
/// and opt-in live keyring tests. Runtime app code should use
/// `CredentialService`, which stores encrypted secret rows in SQLite and only
/// touches the OS credential store to protect or migrate the vault key.
///
/// # Architecture
///
/// - Frontend uses Tauri credential commands backed by `CredentialService`
/// - Backend uses `CredentialService` for scheduled and user-triggered work
/// - Legacy fallback reads these keyring entries only when a secret is needed
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
/// let is_configured = CredentialStore::retrieve(CredentialKey::SmtpPassword)?.is_some();
/// assert!(is_configured);
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

        reject_disabled_credential_storage(key)?;
        validate_credential_value(key, value)?;

        let entry = credential_entry(key)?;

        entry
            .set_password(value)
            .map_err(|_| secure_storage_error())?;

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
        if is_disabled_credential(key) {
            return Ok(None);
        }

        let entry = credential_entry(key)?;

        match entry.get_password() {
            Ok(password) => Ok(Some(password)),
            Err(KeyringError::NoEntry) => Ok(None),
            Err(_) => Err(secure_storage_error()),
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
        let entry = credential_entry(key)?;

        match entry.delete_credential() {
            Ok(()) => {
                tracing::debug!("Deleted credential: {}", key.as_str());
                Ok(())
            }
            Err(KeyringError::NoEntry) => Ok(()), // Already deleted
            Err(_) => Err(secure_storage_error()),
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
        if is_disabled_credential(key) {
            return Ok(false);
        }

        Self::retrieve(key).map(|opt| opt.is_some())
    }

    /// Get existence status of all credential types (for diagnostics).
    ///
    /// Useful for settings UI to show which credentials are configured.
    ///
    /// # Returns
    ///
    /// Vector of key/existence/availability statuses for all credential types.
    /// If a keyring check fails, the entry is marked unavailable instead of
    /// reporting the credential as missing.
    pub fn list_status() -> Vec<CredentialPresence> {
        CredentialKey::all()
            .iter()
            .map(|&key| credential_presence_from_result(key, Self::exists(key)))
            .collect()
    }
}

/// Migration utilities for moving active credentials out of plaintext config.
///
/// Security-sensitive migration.
///
/// Early versions of JobSentinel stored credentials in plaintext `config.json`.
/// Runtime startup stores active credentials through `CredentialService`, then
/// clears all known plaintext credential fields from config. Legacy LinkedIn
/// session values are cleared but not migrated because LinkedIn automatic
/// monitoring is disabled.
///
/// # Migration Process
///
/// 1. Check if migration already completed (flag file)
/// 2. Extract credentials from `config.json`
/// 3. Store each credential through runtime secure storage
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

    /// Check if plaintext credential migration has already been performed.
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
        crate::core::config::write_file_atomic_private(&flag_path, "1")?;
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
    /// Only call this AFTER successfully storing credentials in secure storage.
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

        crate::core::config::write_file_atomic_private(
            config_path,
            &serde_json::to_string_pretty(&config)?,
        )?;
        tracing::info!("Cleared plaintext credentials from config.json");

        Ok(())
    }
}

#[cfg(test)]
mod tests;
