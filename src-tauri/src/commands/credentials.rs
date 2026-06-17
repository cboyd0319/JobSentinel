//! Credential Management Tauri Commands
//!
//! Commands for secure credential storage using the runtime credential service.

use crate::commands::AppState;
use crate::core::credentials::{CredentialKey, CredentialService};
use serde::{Deserialize, Serialize};
use tauri::State;

const UNKNOWN_CREDENTIAL_KEY: &str = "Unknown credential key";
const LINKEDIN_CREDENTIALS_DISABLED: &str =
    "LinkedIn automatic monitoring is disabled by JobSentinel source policy";

/// Credential status for frontend display
#[derive(Debug, Serialize, Deserialize)]
pub struct CredentialStatus {
    pub key: String,
    pub exists: bool,
    pub available: bool,
}

fn parse_credential_key(key: &str) -> Result<CredentialKey, String> {
    key.parse::<CredentialKey>()
        .map_err(|_| UNKNOWN_CREDENTIAL_KEY.to_string())
}

fn normalize_credential_value(key: CredentialKey, value: String) -> String {
    match key {
        CredentialKey::LinkedInCookie => value.trim().to_string(),
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

async fn store_credential_with_service(
    key: String,
    value: String,
    credentials: &CredentialService,
) -> Result<(), String> {
    let cred_key = parse_credential_key(&key)?;
    reject_disabled_credential_storage(cred_key)?;
    let value = normalize_credential_value(cred_key, value);

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

/// Store a credential in the encrypted local vault.
#[tauri::command]
pub async fn store_credential(
    key: String,
    value: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    store_credential_with_service(key, value, state.credentials.as_ref()).await
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::db::Database;

    async fn test_credentials() -> CredentialService {
        let database = Database::connect_memory().await.unwrap();
        database.migrate().await.unwrap();
        CredentialService::with_fixed_master_key(database.pool().clone(), [17_u8; 32], false)
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
