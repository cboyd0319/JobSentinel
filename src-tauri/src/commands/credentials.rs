//! Credential Management Tauri Commands
//!
//! Commands for secure credential storage using the OS keyring.
//! These wrap the CredentialStore for frontend access.

use crate::core::credentials::{CredentialKey, CredentialStore};
use serde::{Deserialize, Serialize};

const UNKNOWN_CREDENTIAL_KEY: &str = "Unknown credential key";

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

/// Store a credential in the OS keyring
#[tauri::command]
pub async fn store_credential(key: String, value: String) -> Result<(), String> {
    let cred_key = parse_credential_key(&key)?;
    let value = normalize_credential_value(cred_key, value);

    tracing::info!("Command: store_credential for {}", cred_key.as_str());

    CredentialStore::store(cred_key, &value)
}

/// Retrieve a credential from the OS keyring
#[tauri::command]
pub async fn retrieve_credential(key: String) -> Result<Option<String>, String> {
    let cred_key = parse_credential_key(&key)?;

    tracing::info!("Command: retrieve_credential for {}", cred_key.as_str());

    CredentialStore::retrieve(cred_key)
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
    async fn linkedin_cookie_validation_rejects_oversized_values_before_keyring() {
        let cookie = format!("AQ{}", "x".repeat(500));
        let err = store_credential("linkedin_cookie".to_string(), cookie.clone())
            .await
            .unwrap_err();

        assert_eq!(err, "LinkedIn cookie is too long");
        assert!(
            !err.contains(&cookie),
            "validation error must not echo cookie value: {err}"
        );
    }

    #[tokio::test]
    async fn linkedin_cookie_validation_rejects_header_separator_before_keyring() {
        let cookie = "AQvalidPrefix; other_cookie=secret";
        let err = store_credential("linkedin_cookie".to_string(), cookie.to_string())
            .await
            .unwrap_err();

        assert_eq!(err, "LinkedIn cookie contains unsupported characters");
        assert!(
            !err.contains("secret"),
            "validation error must not echo cookie value: {err}"
        );
    }
}
