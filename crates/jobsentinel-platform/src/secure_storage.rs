use keyring::{Entry, Error as KeyringError};
use std::fmt;

/// Opaque failure from the operating system's device-bound secret store.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct SecureStorageError;

impl fmt::Display for SecureStorageError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("device secure storage is unavailable")
    }
}

impl std::error::Error for SecureStorageError {}

/// Store a device-bound secret under JobSentinel's secure-storage namespace.
pub fn store_device_secret(key: &str, value: &str) -> Result<(), SecureStorageError> {
    device_secret_entry(key)?
        .set_password(value)
        .map_err(|_| SecureStorageError)
}

/// Retrieve a device-bound secret without exposing provider-specific failures.
pub fn retrieve_device_secret(key: &str) -> Result<Option<String>, SecureStorageError> {
    match device_secret_entry(key)?.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(KeyringError::NoEntry) => Ok(None),
        Err(_) => Err(SecureStorageError),
    }
}

/// Delete a device-bound secret. A missing value is already deleted.
pub fn delete_device_secret(key: &str) -> Result<(), SecureStorageError> {
    match device_secret_entry(key)?.delete_credential() {
        Ok(()) | Err(KeyringError::NoEntry) => Ok(()),
        Err(_) => Err(SecureStorageError),
    }
}

fn device_secret_entry(key: &str) -> Result<Entry, SecureStorageError> {
    Entry::new(super::SECURE_STORAGE_SERVICE, key).map_err(|_| SecureStorageError)
}
