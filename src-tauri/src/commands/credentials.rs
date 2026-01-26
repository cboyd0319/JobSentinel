//! Credential Management Tauri Commands
//!
//! Commands for secure credential storage using the OS keyring.
//! These wrap the CredentialStore for frontend access.

use crate::core::credentials::{CredentialKey, CredentialStore};
use serde::{Deserialize, Serialize};

/// Credential status for frontend display
#[derive(Debug, Serialize, Deserialize)]
pub struct CredentialStatus {
    pub key: String,
    pub exists: bool,
}

/// Store a credential in the OS keyring
#[tauri::command]
pub async fn store_credential(key: String, value: String) -> Result<(), String> {
    tracing::info!("Command: store_credential for {}", key);

    let cred_key =
        key.parse::<CredentialKey>().map_err(|_| format!("Unknown credential key: {key}"))?;

    CredentialStore::store(cred_key, &value)
}

/// Retrieve a credential from the OS keyring
#[tauri::command]
pub async fn retrieve_credential(key: String) -> Result<Option<String>, String> {
    tracing::info!("Command: retrieve_credential for {}", key);

    let cred_key =
        key.parse::<CredentialKey>().map_err(|_| format!("Unknown credential key: {key}"))?;

    CredentialStore::retrieve(cred_key)
}

/// Delete a credential from the OS keyring
#[tauri::command]
pub async fn delete_credential(key: String) -> Result<(), String> {
    tracing::info!("Command: delete_credential for {}", key);

    let cred_key =
        key.parse::<CredentialKey>().map_err(|_| format!("Unknown credential key: {key}"))?;

    CredentialStore::delete(cred_key)
}

/// Check if a credential exists in the OS keyring
#[tauri::command]
pub async fn has_credential(key: String) -> Result<bool, String> {
    tracing::info!("Command: has_credential for {}", key);

    let cred_key =
        key.parse::<CredentialKey>().map_err(|_| format!("Unknown credential key: {key}"))?;

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
