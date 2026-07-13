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
mod migration;
mod passphrase;
mod service;
mod smtp;
mod validation;
mod vault;
mod vault_key_store;

use validation::{
    is_disabled_credential, reject_disabled_credential_storage, validate_credential_value,
};

pub use key::{CredentialKey, CredentialPresence};
pub use migration::{
    clear_config_credentials, extract_plaintext_credentials, is_migrated, set_migrated,
};
pub use service::{CredentialService, CredentialUnlockMode, CredentialUnlockState};
pub use smtp::{
    decode_smtp_password_for_binding, encode_smtp_password, SmtpCredentialBinding,
    SMTP_CREDENTIAL_REENTRY_REQUIRED,
};

use vault::{SecretVault, SecretVaultError};

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

/// Private adapter for lazy migration and cleanup of legacy OS credentials.
struct CredentialStore;

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
    fn store(key: CredentialKey, value: &str) -> Result<(), String> {
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
    fn retrieve(key: CredentialKey) -> Result<Option<String>, String> {
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
    fn delete(key: CredentialKey) -> Result<(), String> {
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
}

#[cfg(test)]
mod tests;
