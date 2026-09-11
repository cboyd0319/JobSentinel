//! Loads the local SQLCipher key from secure storage or the isolated macOS smoke environment.

use chacha20poly1305::aead::Generate;
use keyring::{Entry, Error as KeyringError};
use zeroize::Zeroizing;

use crate::SECURE_STORAGE_SERVICE;

const DATABASE_KEY_NAME: &str = "jobsentinel_database_key";
#[cfg(target_os = "macos")]
const SMOKE_DATABASE_KEY_HEX_ENV: &str = "JOBSENTINEL_MACOS_PACKAGE_SMOKE_DATABASE_KEY_HEX";
const DATABASE_KEY_LEN: usize = 32;
const DATABASE_KEY_HEX_LEN: usize = DATABASE_KEY_LEN * 2;

/// Opaque failure to retrieve or create the local SQLCipher key.
#[derive(Debug, Clone, Copy)]
pub struct DatabaseKeyError;

impl std::fmt::Display for DatabaseKeyError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str("device secure storage did not provide a valid database key")
    }
}

impl std::error::Error for DatabaseKeyError {}

/// Load the existing SQLCipher key or create it in device secure storage.
pub async fn load_or_create_database_key() -> Result<Zeroizing<String>, DatabaseKeyError> {
    tokio::task::spawn_blocking(load_or_create_database_key_blocking)
        .await
        .map_err(|_| DatabaseKeyError)?
}

fn load_or_create_database_key_blocking() -> Result<Zeroizing<String>, DatabaseKeyError> {
    #[cfg(target_os = "macos")]
    if let Some(key) = smoke_database_key_hex()? {
        tracing::info!("Using validated isolated macOS package-smoke database key");
        return Ok(key);
    }

    let entry =
        Entry::new(SECURE_STORAGE_SERVICE, DATABASE_KEY_NAME).map_err(|_| DatabaseKeyError)?;
    match entry.get_password() {
        Ok(encoded_key) => validate_database_key_hex(encoded_key),
        Err(KeyringError::NoEntry) => {
            let key = <[u8; DATABASE_KEY_LEN]>::generate();
            let encoded_key = Zeroizing::new(hex::encode(key));
            entry
                .set_password(encoded_key.as_str())
                .map_err(|_| DatabaseKeyError)?;
            Ok(encoded_key)
        }
        Err(_) => Err(DatabaseKeyError),
    }
}

#[cfg(target_os = "macos")]
fn smoke_database_key_hex() -> Result<Option<Zeroizing<String>>, DatabaseKeyError> {
    let smoke_root_present = crate::package_smoke_root().is_some();
    let encoded_key = smoke_root_present
        .then(|| std::env::var(SMOKE_DATABASE_KEY_HEX_ENV).ok())
        .flatten();
    select_smoke_database_key(smoke_root_present, encoded_key)
}

#[cfg(target_os = "macos")]
fn select_smoke_database_key(
    smoke_root_present: bool,
    encoded_key: Option<String>,
) -> Result<Option<Zeroizing<String>>, DatabaseKeyError> {
    if !smoke_root_present {
        return Ok(None);
    }
    encoded_key
        .ok_or(DatabaseKeyError)
        .and_then(validate_database_key_hex)
        .map(Some)
}

fn validate_database_key_hex(encoded_key: String) -> Result<Zeroizing<String>, DatabaseKeyError> {
    let trimmed = encoded_key.trim();
    if !is_valid_database_key_hex(trimmed) {
        return Err(DatabaseKeyError);
    }
    Ok(Zeroizing::new(trimmed.to_string()))
}

fn is_valid_database_key_hex(value: &str) -> bool {
    value.len() == DATABASE_KEY_HEX_LEN && hex::decode(value).is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn database_key_requires_exact_hex_length() {
        assert!(is_valid_database_key_hex(&"ab".repeat(DATABASE_KEY_LEN)));
        assert!(!is_valid_database_key_hex("ab"));
        assert!(!is_valid_database_key_hex(&"zz".repeat(DATABASE_KEY_LEN)));
    }

    #[test]
    fn validation_trims_without_exposing_key_material() {
        let key = format!("  {}\n", "ab".repeat(DATABASE_KEY_LEN));
        let validated = validate_database_key_hex(key).unwrap();
        assert_eq!(validated.len(), DATABASE_KEY_HEX_LEN);
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn smoke_key_selection_requires_a_valid_ephemeral_key_when_smoke_is_active() {
        for encoded_key in [
            None,
            Some("zz".repeat(DATABASE_KEY_LEN)),
            Some(" \n\t ".to_string()),
        ] {
            assert!(select_smoke_database_key(true, encoded_key).is_err());
        }
    }

    #[cfg(target_os = "macos")]
    #[test]
    fn smoke_key_selection_trims_valid_ephemeral_key_and_normal_mode_falls_through() {
        let key = format!("  {}\n", "ab".repeat(DATABASE_KEY_LEN));
        let selected = select_smoke_database_key(true, Some(key)).unwrap().unwrap();
        assert_eq!(selected.as_str(), "ab".repeat(DATABASE_KEY_LEN));
        assert!(select_smoke_database_key(false, None).unwrap().is_none());
        assert!(
            select_smoke_database_key(false, Some("malformed".to_string()))
                .unwrap()
                .is_none()
        );
    }
}
