//! Credential Management Tauri Commands
//!
//! Commands for secure credential storage using the OS keyring.
//! These wrap the CredentialStore for frontend access.

use crate::core::credentials::{CredentialKey, CredentialStore};
use serde::{Deserialize, Serialize};

const UNKNOWN_CREDENTIAL_KEY: &str = "Unknown credential key";
const LINKEDIN_CREDENTIALS_DISABLED: &str =
    "LinkedIn automatic monitoring is disabled by JobSentinel source policy";

/// Credential status for frontend display
#[derive(Debug, Serialize, Deserialize)]
pub struct CredentialStatus {
    pub key: String,
    pub exists: bool,
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

/// Store a credential in the OS keyring
#[tauri::command]
pub async fn store_credential(key: String, value: String) -> Result<(), String> {
    let cred_key = parse_credential_key(&key)?;
    reject_disabled_credential_storage(cred_key)?;
    let value = normalize_credential_value(cred_key, value);

    tracing::info!("Command: store_credential for {}", cred_key.as_str());

    CredentialStore::store(cred_key, &value)
}

/// Delete a credential from the OS keyring
#[tauri::command]
pub async fn delete_credential(key: String) -> Result<(), String> {
    let cred_key = parse_credential_key(&key)?;

    tracing::info!("Command: delete_credential for {}", cred_key.as_str());

    CredentialStore::delete(cred_key)
}

/// Check if a credential exists in the OS keyring
#[tauri::command]
pub async fn has_credential(key: String) -> Result<bool, String> {
    let cred_key = parse_credential_key(&key)?;

    tracing::info!("Command: has_credential for {}", cred_key.as_str());

    if is_disabled_credential(cred_key) {
        return Ok(false);
    }

    CredentialStore::exists(cred_key)
}

/// Get status of all credentials
#[tauri::command]
pub async fn get_credential_status() -> Result<Vec<CredentialStatus>, String> {
    tracing::info!("Command: get_credential_status");

    Ok(CredentialStore::list_status()
        .into_iter()
        .map(|(key, exists)| CredentialStatus {
            key: key.as_str().to_string(),
            exists,
        })
        .collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn invalid_credential_key_error_does_not_echo_input() {
        let secret_like_key = "slack_webhook=https://hooks.slack.com/services/T/B/secret";
        let err = store_credential(secret_like_key.to_string(), "ignored".to_string())
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
        let cookie = "legacy-session-value";
        let err = store_credential("linkedin_cookie".to_string(), cookie.to_string())
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
        let expiry = "2099-01-01T00:00:00Z";
        let err = store_credential("linkedin_cookie_expiry".to_string(), expiry.to_string())
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
        assert!(!has_credential("linkedin_cookie".to_string()).await.unwrap());
    }

    #[tokio::test]
    async fn slack_webhook_validation_rejects_wrong_host_before_keyring() {
        let err = store_credential(
            "slack_webhook".to_string(),
            "https://evil.example/services/T/B/secret".to_string(),
        )
        .await
        .unwrap_err();

        assert_eq!(err, "Slack connection link must use hooks.slack.com");
        assert!(
            !err.contains("secret") && !err.contains("evil.example"),
            "validation error must not echo webhook value: {err}"
        );
    }

    #[tokio::test]
    async fn discord_webhook_validation_rejects_wrong_path_before_keyring() {
        let err = store_credential(
            "discord_webhook".to_string(),
            "https://discord.com/webhooks/123/secret".to_string(),
        )
        .await
        .unwrap_err();

        assert_eq!(err, "Paste the full Discord connection link");
        assert!(
            !err.contains("secret") && !err.contains("123"),
            "validation error must not echo webhook value: {err}"
        );
    }

    #[tokio::test]
    async fn teams_webhook_validation_rejects_embedded_credentials_before_keyring() {
        let err = store_credential(
            "teams_webhook".to_string(),
            "https://user:secret@outlook.office.com/webhook/abc".to_string(),
        )
        .await
        .unwrap_err();

        assert_eq!(
            err,
            "Teams connection link must not include a username or password"
        );
        assert!(
            !err.contains("secret") && !err.contains("abc"),
            "validation error must not echo webhook value: {err}"
        );
    }
}
