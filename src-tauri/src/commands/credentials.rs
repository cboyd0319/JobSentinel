//! Credential Management Tauri Commands
//!
//! Commands for secure credential storage using the runtime credential service.

use crate::commands::AppState;
use crate::core::credentials::{
    smtp::{encode_smtp_password, SmtpCredentialBinding},
    CredentialKey, CredentialService,
};
use serde::{Deserialize, Serialize};
use tauri::State;
use zeroize::Zeroizing;

const UNKNOWN_CREDENTIAL_KEY: &str = "Unknown credential key";
const LINKEDIN_CREDENTIALS_DISABLED: &str =
    "JobSentinel does not collect LinkedIn login details or session cookies";

/// Credential status for frontend display
#[derive(Debug, Serialize, Deserialize)]
pub struct CredentialStatus {
    pub key: String,
    pub exists: bool,
    pub available: bool,
}

/// Non-secret credential vault unlock status for frontend display.
#[derive(Debug, Serialize, Deserialize)]
pub struct CredentialUnlockStatus {
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
pub async fn store_credential(
    key: String,
    value: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let smtp_binding = match parse_credential_key(&key) {
        Ok(CredentialKey::SmtpPassword) => {
            let config = state.config.read().await;
            Some(SmtpCredentialBinding::from_email_config(
                &config.alerts.email,
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
pub async fn delete_credential(key: String, state: State<'_, AppState>) -> Result<(), String> {
    delete_credential_with_service(key, state.credentials.as_ref()).await
}

/// Check whether a credential exists without unlocking the OS credential store.
#[tauri::command]
pub async fn has_credential(key: String, state: State<'_, AppState>) -> Result<bool, String> {
    has_credential_with_service(key, state.credentials.as_ref()).await
}

/// Get non-secret status of all credentials.
#[tauri::command]
pub async fn get_credential_status(
    state: State<'_, AppState>,
) -> Result<Vec<CredentialStatus>, String> {
    get_credential_status_with_service(state.credentials.as_ref()).await
}

/// Get non-secret app-level credential vault lock status.
#[tauri::command]
pub async fn get_credential_unlock_status(
    state: State<'_, AppState>,
) -> Result<CredentialUnlockStatus, String> {
    get_credential_unlock_status_with_service(state.credentials.as_ref()).await
}

/// Enable passphrase wrapping for the credential vault.
#[tauri::command]
pub async fn enable_credential_passphrase(
    passphrase: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    enable_credential_passphrase_with_service(passphrase, state.credentials.as_ref()).await
}

/// Unlock a passphrase-protected credential vault for this app session.
#[tauri::command]
pub async fn unlock_credential_vault(
    passphrase: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    unlock_credential_vault_with_service(passphrase, state.credentials.as_ref()).await
}

/// Disable passphrase wrapping and return to system credential locking.
#[tauri::command]
pub async fn disable_credential_passphrase(
    passphrase: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    disable_credential_passphrase_with_service(passphrase, state.credentials.as_ref()).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::db::Database;

    async fn test_credentials() -> CredentialService {
        let database = Database::connect_memory().await.unwrap();
        database.migrate().await.unwrap();
        CredentialService::with_fixed_master_key(database.pool().clone(), [17_u8; 32], false)
    }

    async fn test_credentials_with_pool() -> (Database, CredentialService) {
        let database = Database::connect_memory().await.unwrap();
        database.migrate().await.unwrap();
        let credentials =
            CredentialService::with_fixed_master_key(database.pool().clone(), [17_u8; 32], false);
        (database, credentials)
    }

    #[tokio::test]
    async fn invalid_credential_key_error_does_not_echo_input() {
        let credentials = test_credentials().await;
        let secret_like_key = "slack_webhook=https://hooks.slack.com/services/T/B/secret";
        let err = store_credential_with_service(
            secret_like_key.to_string(),
            "ignored".to_string(),
            &credentials,
        )
        .await
        .unwrap_err();

        assert_eq!(err, UNKNOWN_CREDENTIAL_KEY);
        assert!(
            !err.contains("secret"),
            "invalid key error must not echo frontend input: {err}"
        );
    }

    #[tokio::test]
    async fn linkedin_cookie_storage_is_disabled_before_keyring() {
        let credentials = test_credentials().await;
        let cookie = "legacy-session-value";
        let err = store_credential_with_service(
            "linkedin_cookie".to_string(),
            cookie.to_string(),
            &credentials,
        )
        .await
        .unwrap_err();

        assert_eq!(err, LINKEDIN_CREDENTIALS_DISABLED);
        assert!(
            !err.contains(&cookie),
            "validation error must not echo cookie value: {err}"
        );
    }

    #[tokio::test]
    async fn linkedin_cookie_expiry_storage_is_disabled_before_keyring() {
        let credentials = test_credentials().await;
        let expiry = "2099-01-01T00:00:00Z";
        let err = store_credential_with_service(
            "linkedin_cookie_expiry".to_string(),
            expiry.to_string(),
            &credentials,
        )
        .await
        .unwrap_err();

        assert_eq!(err, LINKEDIN_CREDENTIALS_DISABLED);
        assert!(
            !err.contains(expiry),
            "validation error must not echo expiry value: {err}"
        );
    }

    #[tokio::test]
    async fn disabled_linkedin_credential_presence_returns_false() {
        let credentials = test_credentials().await;
        assert!(
            !has_credential_with_service("linkedin_cookie".to_string(), &credentials)
                .await
                .unwrap()
        );
    }

    #[tokio::test]
    async fn credential_unlock_status_defaults_to_system_mode_without_keyring() {
        let credentials = test_credentials().await;

        let status = get_credential_unlock_status_with_service(&credentials)
            .await
            .unwrap();

        assert_eq!(status.mode, "system");
        assert!(!status.configured);
        assert!(status.unlocked);
    }

    #[tokio::test]
    async fn passphrase_mode_locks_restarted_service_until_unlock() {
        let (database, credentials) = test_credentials_with_pool().await;

        store_credential_with_service(
            "smtp_password".to_string(),
            "mail-password".to_string(),
            &credentials,
        )
        .await
        .unwrap();
        enable_credential_passphrase_with_service(
            "correct battery staple".to_string(),
            &credentials,
        )
        .await
        .unwrap();

        let restarted =
            CredentialService::with_fixed_master_key(database.pool().clone(), [17_u8; 32], false);
        let locked_status = get_credential_unlock_status_with_service(&restarted)
            .await
            .unwrap();
        assert_eq!(locked_status.mode, "passphrase");
        assert!(locked_status.configured);
        assert!(!locked_status.unlocked);

        assert!(
            has_credential_with_service("smtp_password".to_string(), &restarted)
                .await
                .unwrap()
        );
        let locked_err = restarted
            .retrieve(CredentialKey::SmtpPassword)
            .await
            .unwrap_err();
        assert!(
            !locked_err.contains("mail-password"),
            "locked vault error must not echo stored secret: {locked_err}"
        );

        unlock_credential_vault_with_service("correct battery staple".to_string(), &restarted)
            .await
            .unwrap();

        assert_eq!(
            restarted
                .retrieve(CredentialKey::SmtpPassword)
                .await
                .unwrap(),
            Some("mail-password".to_string())
        );
    }

    #[tokio::test]
    async fn wrong_passphrase_error_does_not_echo_input() {
        let (database, credentials) = test_credentials_with_pool().await;
        enable_credential_passphrase_with_service(
            "correct battery staple".to_string(),
            &credentials,
        )
        .await
        .unwrap();

        let restarted =
            CredentialService::with_fixed_master_key(database.pool().clone(), [17_u8; 32], false);
        let err =
            unlock_credential_vault_with_service("wrong secret value".to_string(), &restarted)
                .await
                .unwrap_err();

        assert_eq!(err, "Passphrase could not unlock credential storage");
        assert!(!err.contains("wrong secret value"));
    }

    #[tokio::test]
    async fn passphrase_mode_can_return_to_system_locking() {
        let (database, credentials) = test_credentials_with_pool().await;
        enable_credential_passphrase_with_service(
            "correct battery staple".to_string(),
            &credentials,
        )
        .await
        .unwrap();

        disable_credential_passphrase_with_service(
            "correct battery staple".to_string(),
            &credentials,
        )
        .await
        .unwrap();

        let restarted =
            CredentialService::with_fixed_master_key(database.pool().clone(), [17_u8; 32], false);
        let status = get_credential_unlock_status_with_service(&restarted)
            .await
            .unwrap();
        assert_eq!(status.mode, "system");
        assert!(!status.configured);
        assert!(status.unlocked);
    }

    #[tokio::test]
    async fn slack_webhook_validation_rejects_wrong_host_before_keyring() {
        let credentials = test_credentials().await;
        let err = store_credential_with_service(
            "slack_webhook".to_string(),
            "https://evil.example/services/T/B/secret".to_string(),
            &credentials,
        )
        .await
        .unwrap_err();

        assert_eq!(
            err,
            "Paste the full Slack connection link copied from Slack. If you are not sure, leave it blank and set it up later."
        );
        assert!(
            !err.contains("secret") && !err.contains("evil.example"),
            "validation error must not echo webhook value: {err}"
        );
    }

    #[tokio::test]
    async fn discord_webhook_validation_rejects_wrong_path_before_keyring() {
        let credentials = test_credentials().await;
        let err = store_credential_with_service(
            "discord_webhook".to_string(),
            "https://discord.com/webhooks/123/secret".to_string(),
            &credentials,
        )
        .await
        .unwrap_err();

        assert_eq!(
            err,
            "Paste the full Discord connection link copied from Discord. If you are not sure, leave it blank and set it up later."
        );
        assert!(
            !err.contains("secret") && !err.contains("123"),
            "validation error must not echo webhook value: {err}"
        );
    }

    #[tokio::test]
    async fn teams_webhook_validation_rejects_embedded_credentials_before_keyring() {
        let credentials = test_credentials().await;
        let err = store_credential_with_service(
            "teams_webhook".to_string(),
            "https://user:secret@outlook.office.com/webhook/abc".to_string(),
            &credentials,
        )
        .await
        .unwrap_err();

        assert_eq!(
            err,
            "Paste the full Teams connection link copied from Teams. If you are not sure, leave it blank and set it up later."
        );
        assert!(
            !err.contains("secret") && !err.contains("abc"),
            "validation error must not echo webhook value: {err}"
        );
    }
}
