//! Credential Management Tauri Commands
//!
//! Commands for secure credential storage using the runtime credential service.

use crate::application::credentials::{
    encode_smtp_password, CredentialKey, CredentialService, SmtpCredentialBinding,
};
use crate::commands::AppState;
use serde::{Deserialize, Serialize};
use tauri::State;
use zeroize::Zeroizing;

const UNKNOWN_CREDENTIAL_KEY: &str = "Unknown credential key";
const LINKEDIN_CREDENTIALS_DISABLED: &str =
    "JobSentinel does not collect LinkedIn login details or session cookies";

/// Credential status for frontend display
#[derive(Debug, Serialize, Deserialize)]
pub(crate) struct CredentialStatus {
    pub key: String,
    pub exists: bool,
    pub available: bool,
}

/// Non-secret credential vault unlock status for frontend display.
#[derive(Debug, Serialize, Deserialize)]
pub(crate) struct CredentialUnlockStatus {
    pub mode: String,
    pub configured: bool,
    pub unlocked: bool,
}

fn parse_credential_key(key: &str) -> Result<CredentialKey, String> {
    key.parse::<CredentialKey>()
        .map_err(|_| UNKNOWN_CREDENTIAL_KEY.to_string())
}

fn normalize_credential_value(key: CredentialKey, value: String) -> String {
    match key {
        CredentialKey::LinkedInCookie
        | CredentialKey::ExternalAiOpenAiApiKey
        | CredentialKey::ExternalAiAnthropicApiKey
        | CredentialKey::ExternalAiGoogleApiKey
        | CredentialKey::ExternalAiGithubCopilotApiKey
        | CredentialKey::ExternalAiCustomApiKey => value.trim().to_string(),
        _ => value,
    }
}

fn reject_disabled_credential_storage(key: CredentialKey) -> Result<(), String> {
    if is_disabled_credential(key) {
        Err(LINKEDIN_CREDENTIALS_DISABLED.to_string())
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

#[cfg(test)]
async fn store_credential_with_service(
    key: String,
    value: String,
    credentials: &CredentialService,
) -> Result<(), String> {
    store_credential_with_optional_smtp_binding(key, value, credentials, None).await
}

async fn store_credential_with_optional_smtp_binding(
    key: String,
    value: String,
    credentials: &CredentialService,
    smtp_binding: Option<SmtpCredentialBinding>,
) -> Result<(), String> {
    let cred_key = parse_credential_key(&key)?;
    reject_disabled_credential_storage(cred_key)?;
    let mut value = normalize_credential_value(cred_key, value);
    if cred_key == CredentialKey::SmtpPassword && !value.is_empty() {
        if let Some(binding) = smtp_binding {
            value = encode_smtp_password(&value, binding)?;
        }
    }

    tracing::info!("Command: store_credential for {}", cred_key.as_str());

    credentials.store(cred_key, &value).await
}

async fn delete_credential_with_service(
    key: String,
    credentials: &CredentialService,
) -> Result<(), String> {
    let cred_key = parse_credential_key(&key)?;

    tracing::info!("Command: delete_credential for {}", cred_key.as_str());

    credentials.delete(cred_key).await
}

async fn has_credential_with_service(
    key: String,
    credentials: &CredentialService,
) -> Result<bool, String> {
    let cred_key = parse_credential_key(&key)?;

    tracing::info!("Command: has_credential for {}", cred_key.as_str());

    if is_disabled_credential(cred_key) {
        return Ok(false);
    }

    credentials.exists(cred_key).await
}

async fn get_credential_status_with_service(
    credentials: &CredentialService,
) -> Result<Vec<CredentialStatus>, String> {
    tracing::info!("Command: get_credential_status");

    Ok(credentials
        .list_status()
        .await
        .into_iter()
        .map(|status| CredentialStatus {
            key: status.key.as_str().to_string(),
            exists: status.exists,
            available: status.available,
        })
        .collect())
}

async fn get_credential_unlock_status_with_service(
    credentials: &CredentialService,
) -> Result<CredentialUnlockStatus, String> {
    tracing::info!("Command: get_credential_unlock_status");

    let status = credentials.unlock_status().await?;
    Ok(CredentialUnlockStatus {
        mode: status.mode.as_str().to_string(),
        configured: status.configured,
        unlocked: status.unlocked,
    })
}

async fn enable_credential_passphrase_with_service(
    passphrase: String,
    credentials: &CredentialService,
) -> Result<(), String> {
    tracing::info!("Command: enable_credential_passphrase");

    let passphrase = Zeroizing::new(passphrase);
    credentials
        .enable_passphrase_lock(passphrase.as_str())
        .await
}

async fn unlock_credential_vault_with_service(
    passphrase: String,
    credentials: &CredentialService,
) -> Result<(), String> {
    tracing::info!("Command: unlock_credential_vault");

    let passphrase = Zeroizing::new(passphrase);
    credentials
        .unlock_passphrase_vault(passphrase.as_str())
        .await
}

async fn disable_credential_passphrase_with_service(
    passphrase: String,
    credentials: &CredentialService,
) -> Result<(), String> {
    tracing::info!("Command: disable_credential_passphrase");

    let passphrase = Zeroizing::new(passphrase);
    credentials
        .disable_passphrase_lock(passphrase.as_str())
        .await
}

/// Store a credential in the encrypted local vault.
#[tauri::command]
pub(crate) async fn store_credential(
    key: String,
    value: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let smtp_binding = match parse_credential_key(&key) {
        Ok(CredentialKey::SmtpPassword) => {
            let config = state.config.read().await;
            Some(SmtpCredentialBinding::new(
                &config.alerts.email.smtp_server,
                config.alerts.email.smtp_port,
                &config.alerts.email.smtp_username,
            ))
        }
        _ => None,
    };
    store_credential_with_optional_smtp_binding(
        key,
        value,
        state.credentials.as_ref(),
        smtp_binding,
    )
    .await
}

/// Delete a credential from the encrypted local vault and legacy keyring entry.
#[tauri::command]
pub(crate) async fn delete_credential(
    key: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    delete_credential_with_service(key, state.credentials.as_ref()).await
}

/// Check whether a credential exists without unlocking the OS credential store.
#[tauri::command]
pub(crate) async fn has_credential(
    key: String,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    has_credential_with_service(key, state.credentials.as_ref()).await
}

/// Get non-secret status of all credentials.
#[tauri::command]
pub(crate) async fn get_credential_status(
    state: State<'_, AppState>,
) -> Result<Vec<CredentialStatus>, String> {
    get_credential_status_with_service(state.credentials.as_ref()).await
}

/// Get non-secret app-level credential vault lock status.
#[tauri::command]
pub(crate) async fn get_credential_unlock_status(
    state: State<'_, AppState>,
) -> Result<CredentialUnlockStatus, String> {
    get_credential_unlock_status_with_service(state.credentials.as_ref()).await
}

/// Enable passphrase wrapping for the credential vault.
#[tauri::command]
pub(crate) async fn enable_credential_passphrase(
    passphrase: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    enable_credential_passphrase_with_service(passphrase, state.credentials.as_ref()).await
}

/// Unlock a passphrase-protected credential vault for this app session.
#[tauri::command]
pub(crate) async fn unlock_credential_vault(
    passphrase: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    unlock_credential_vault_with_service(passphrase, state.credentials.as_ref()).await
}

/// Disable passphrase wrapping and return to system credential locking.
#[tauri::command]
pub(crate) async fn disable_credential_passphrase(
    passphrase: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    disable_credential_passphrase_with_service(passphrase, state.credentials.as_ref()).await
}

#[cfg(test)]
mod tests;
