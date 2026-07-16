//! Plaintext credential migration into secure runtime storage.

use super::CredentialKey;
use jobsentinel_platform as platforms;
use std::path::Path;

const MIGRATION_FLAG_FILE: &str = "keyring_migrated_v1";

/// Check whether plaintext credential migration has already run.
pub fn is_migrated() -> bool {
    let flag_path = platforms::get_config_dir().join(MIGRATION_FLAG_FILE);
    flag_path.exists()
}

/// Mark plaintext credential migration as complete.
pub fn set_migrated() -> std::io::Result<()> {
    let flag_path = platforms::get_config_dir().join(MIGRATION_FLAG_FILE);
    jobsentinel_platform::write_file_atomic_private(&flag_path, "1")?;
    tracing::info!("Marked keyring migration as complete");
    Ok(())
}

/// Extract active credentials from a legacy plaintext configuration.
pub fn extract_plaintext_credentials(
    config_path: &Path,
) -> Result<Vec<(CredentialKey, String)>, Box<dyn std::error::Error>> {
    if !config_path.exists() {
        return Ok(vec![]);
    }

    let content = std::fs::read_to_string(config_path)?;
    let config: serde_json::Value = serde_json::from_str(&content)?;
    let mut credentials = Vec::new();

    if let Some(password) = config
        .pointer("/alerts/email/smtp_password")
        .and_then(|value| value.as_str())
        .filter(|value| !value.is_empty())
    {
        credentials.push((CredentialKey::SmtpPassword, password.to_string()));
    }

    if let Some(token) = config
        .pointer("/alerts/telegram/bot_token")
        .and_then(|value| value.as_str())
        .filter(|value| !value.is_empty())
    {
        credentials.push((CredentialKey::TelegramBotToken, token.to_string()));
    }

    if let Some(url) = config
        .pointer("/alerts/slack/webhook_url")
        .and_then(|value| value.as_str())
        .filter(|value| !value.is_empty())
    {
        credentials.push((CredentialKey::SlackWebhook, url.to_string()));
    }

    if let Some(url) = config
        .pointer("/alerts/discord/webhook_url")
        .and_then(|value| value.as_str())
        .filter(|value| !value.is_empty())
    {
        credentials.push((CredentialKey::DiscordWebhook, url.to_string()));
    }

    if let Some(url) = config
        .pointer("/alerts/teams/webhook_url")
        .and_then(|value| value.as_str())
        .filter(|value| !value.is_empty())
    {
        credentials.push((CredentialKey::TeamsWebhook, url.to_string()));
    }

    if let Some(api_key) = config
        .pointer("/usajobs/api_key")
        .and_then(|value| value.as_str())
        .filter(|value| !value.is_empty())
    {
        credentials.push((CredentialKey::UsaJobsApiKey, api_key.to_string()));
    }

    Ok(credentials)
}

/// Remove legacy credential fields after secure storage succeeds.
///
/// Call this only after every extracted credential has been stored safely.
pub fn clear_config_credentials(config_path: &Path) -> Result<(), Box<dyn std::error::Error>> {
    if !config_path.exists() {
        return Ok(());
    }

    let content = std::fs::read_to_string(config_path)?;
    let mut config: serde_json::Value = serde_json::from_str(&content)?;

    for pointer in [
        "/alerts/email/smtp_password",
        "/alerts/telegram/bot_token",
        "/alerts/slack/webhook_url",
        "/alerts/discord/webhook_url",
        "/alerts/teams/webhook_url",
        "/linkedin/session_cookie",
        "/usajobs/api_key",
    ] {
        remove_json_pointer(&mut config, pointer);
    }

    jobsentinel_platform::write_file_atomic_private(
        config_path,
        &serde_json::to_string_pretty(&config)?,
    )?;
    tracing::info!("Cleared plaintext credentials from config.json");
    Ok(())
}

fn remove_json_pointer(config: &mut serde_json::Value, pointer: &str) {
    let Some((parent, key)) = pointer.rsplit_once('/') else {
        return;
    };
    let Some(map) = config
        .pointer_mut(parent)
        .and_then(|value| value.as_object_mut())
    else {
        return;
    };
    map.remove(key);
}
