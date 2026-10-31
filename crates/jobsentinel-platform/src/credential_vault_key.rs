//! OS-backed credential-vault master keys, accessed only for explicit secret use or lock changes.
//! Passive status checks must never load these keys or trigger authentication.

#![cfg_attr(target_os = "macos", allow(unsafe_code))]

use chacha20poly1305::aead::Generate;
use zeroize::Zeroizing;

const VAULT_KEY_NAME: &str = "jobsentinel_vault_key";
const MASTER_KEY_LEN: usize = 32;
pub const SECURE_STORAGE_UNAVAILABLE_MESSAGE: &str =
    "JobSentinel could not use your device's secure storage. Check system permission prompts, then try again.";

fn secure_storage_error() -> String {
    SECURE_STORAGE_UNAVAILABLE_MESSAGE.to_string()
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CredentialVaultKeyBackend {
    #[cfg(not(any(target_os = "macos", windows)))]
    GenericKeyring,
    #[cfg(windows)]
    WindowsLocalCredentialManager,
    #[cfg(target_os = "macos")]
    MacosUserPresenceKeychain,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct CredentialVaultKeyStoragePolicy {
    pub backend: CredentialVaultKeyBackend,
    pub user_presence_required: bool,
    pub device_local: bool,
    pub biometry_current_set: bool,
}

/// Protection enforced on newly stored and successfully loaded keys.
///
/// Windows migrates legacy persistence on explicit load; previously roamed copies
/// are not revoked. Credential Manager itself does not require Hello consent.
pub const fn credential_vault_key_storage_policy() -> CredentialVaultKeyStoragePolicy {
    #[cfg(target_os = "macos")]
    {
        CredentialVaultKeyStoragePolicy {
            backend: CredentialVaultKeyBackend::MacosUserPresenceKeychain,
            user_presence_required: true,
            device_local: true,
            biometry_current_set: false,
        }
    }

    #[cfg(windows)]
    {
        CredentialVaultKeyStoragePolicy {
            backend: CredentialVaultKeyBackend::WindowsLocalCredentialManager,
            // Hello consent is enforced by the action owner, not Credential Manager.
            user_presence_required: false,
            device_local: true,
            biometry_current_set: false,
        }
    }

    #[cfg(not(any(target_os = "macos", windows)))]
    {
        CredentialVaultKeyStoragePolicy {
            backend: CredentialVaultKeyBackend::GenericKeyring,
            user_presence_required: false,
            device_local: false,
            biometry_current_set: false,
        }
    }
}

pub async fn store_credential_vault_key(key: &[u8]) -> Result<(), String> {
    let key = normalize_vault_key(key)?;
    tokio::task::spawn_blocking(move || platform::store_vault_key(&key))
        .await
        .map_err(|_| secure_storage_error())?
}

pub async fn delete_credential_vault_key() -> Result<(), String> {
    tokio::task::spawn_blocking(platform::delete_vault_key)
        .await
        .map_err(|_| secure_storage_error())?
}

pub async fn load_credential_vault_key(
    create_if_missing: bool,
) -> Result<[u8; MASTER_KEY_LEN], String> {
    tokio::task::spawn_blocking(move || {
        if let Some(encoded_key) = platform::load_vault_key()? {
            return decode_credential_vault_key(encoded_key.as_str());
        }

        if !create_if_missing {
            return Err(secure_storage_error());
        }

        let key = <[u8; MASTER_KEY_LEN]>::generate();
        let protected_key = Zeroizing::new(key);
        platform::store_vault_key(&protected_key)?;
        Ok(key)
    })
    .await
    .map_err(|_| secure_storage_error())?
}

fn normalize_vault_key(key: &[u8]) -> Result<Zeroizing<[u8; MASTER_KEY_LEN]>, String> {
    if key.len() != MASTER_KEY_LEN {
        return Err(secure_storage_error());
    }

    let mut key_bytes = [0_u8; MASTER_KEY_LEN];
    key_bytes.copy_from_slice(key);
    Ok(Zeroizing::new(key_bytes))
}

pub fn decode_credential_vault_key(encoded_key: &str) -> Result<[u8; MASTER_KEY_LEN], String> {
    let decoded =
        Zeroizing::new(hex::decode(encoded_key.trim()).map_err(|_| secure_storage_error())?);
    if decoded.len() != MASTER_KEY_LEN {
        return Err(secure_storage_error());
    }

    let mut key = [0_u8; MASTER_KEY_LEN];
    key.copy_from_slice(decoded.as_slice());
    Ok(key)
}

// Native writes stay injectable so migration failures can be checked without a host store.
#[cfg(any(windows, test))]
fn localize_vault_key(
    encoded_key: &str,
    already_local: bool,
    persist: impl FnOnce() -> Result<(), String>,
) -> Result<(), String> {
    let _key = Zeroizing::new(decode_credential_vault_key(encoded_key)?);
    if !already_local {
        persist()?;
    }
    Ok(())
}

#[cfg(not(target_os = "macos"))]
mod platform {
    use keyring::{Entry, Error as KeyringError};
    use zeroize::Zeroizing;

    use super::MASTER_KEY_LEN;
    use super::{secure_storage_error, VAULT_KEY_NAME};
    use crate::SECURE_STORAGE_SERVICE as SERVICE_NAME;

    fn vault_key_entry() -> Result<Entry, String> {
        #[cfg(windows)]
        {
            use keyring_core::api::CredentialStoreApi;
            use std::collections::HashMap;

            let store =
                windows_native_keyring_store::Store::new().map_err(|_| secure_storage_error())?;
            let modifiers = HashMap::from([("persistence", "Local")]);
            let inner = store
                .build(SERVICE_NAME, VAULT_KEY_NAME, Some(&modifiers))
                .map_err(|_| secure_storage_error())?;
            Ok(Entry { inner })
        }
        #[cfg(not(windows))]
        Entry::new(SERVICE_NAME, VAULT_KEY_NAME).map_err(|_| secure_storage_error())
    }

    pub(super) fn store_vault_key(key: &Zeroizing<[u8; MASTER_KEY_LEN]>) -> Result<(), String> {
        let entry = vault_key_entry()?;
        let encoded_key = Zeroizing::new(hex::encode(key.as_ref()));
        entry
            .set_password(encoded_key.as_str())
            .map_err(|_| secure_storage_error())
    }

    pub(super) fn delete_vault_key() -> Result<(), String> {
        let entry = vault_key_entry()?;
        match entry.delete_credential() {
            Ok(()) | Err(KeyringError::NoEntry) => Ok(()),
            Err(_) => Err(secure_storage_error()),
        }
    }

    pub(super) fn load_vault_key() -> Result<Option<Zeroizing<String>>, String> {
        let entry = vault_key_entry()?;
        match entry.get_password() {
            Ok(encoded_key) => {
                let encoded_key = Zeroizing::new(encoded_key);
                #[cfg(windows)]
                {
                    // Validate before replacing legacy roaming-capable persistence.
                    // Updating the same entry never deletes the recoverable old key.
                    let attributes = entry
                        .inner
                        .get_attributes()
                        .map_err(|_| secure_storage_error())?;
                    super::localize_vault_key(
                        &encoded_key,
                        attributes.get("persistence").map(String::as_str) == Some("Local"),
                        || {
                            entry
                                .set_password(&encoded_key)
                                .map_err(|_| secure_storage_error())
                        },
                    )?;
                }
                Ok(Some(encoded_key))
            }
            Err(KeyringError::NoEntry) => Ok(None),
            Err(_) => Err(secure_storage_error()),
        }
    }
}

#[cfg(target_os = "macos")]
mod platform {
    use objc2::rc::Retained;
    use objc2_foundation::NSString;
    use objc2_local_authentication::LAContext;
    use security_framework::{
        access_control::{ProtectionMode, SecAccessControl},
        base::Error as SecurityError,
        item::{ItemClass, ItemSearchOptions, Limit, SearchResult},
        passwords::{set_generic_password_options, AccessControlOptions, PasswordOptions},
    };
    use zeroize::Zeroizing;

    use super::MASTER_KEY_LEN;
    use super::{secure_storage_error, VAULT_KEY_NAME};
    use crate::SECURE_STORAGE_SERVICE as SERVICE_NAME;

    const ERR_SEC_ITEM_NOT_FOUND: i32 = -25300;

    pub(super) fn store_vault_key(key: &Zeroizing<[u8; MASTER_KEY_LEN]>) -> Result<(), String> {
        delete_vault_key()?;

        let mut options = password_options();
        let access_control = SecAccessControl::create_with_protection(
            Some(ProtectionMode::AccessibleWhenUnlockedThisDeviceOnly),
            AccessControlOptions::USER_PRESENCE.bits(),
        )
        .map_err(|_| secure_storage_error())?;
        options.set_access_control(access_control);

        let encoded_key = Zeroizing::new(hex::encode(key.as_ref()));
        set_generic_password_options(encoded_key.as_bytes(), options)
            .map_err(sanitize_security_error)
    }

    pub(super) fn delete_vault_key() -> Result<(), String> {
        match vault_key_search_options().delete() {
            Ok(()) => Ok(()),
            Err(error) if is_not_found(error) => Ok(()),
            Err(error) => Err(sanitize_security_error(error)),
        }
    }

    pub(super) fn load_vault_key() -> Result<Option<Zeroizing<String>>, String> {
        let mut search = vault_key_search_options();
        search.load_data(true).limit(Limit::Max(1));

        let results = match search.search() {
            Ok(results) => results,
            Err(error) if is_not_found(error) => return Ok(None),
            Err(error) => return Err(sanitize_security_error(error)),
        };

        match results.into_iter().next() {
            Some(SearchResult::Data(data)) => String::from_utf8(data)
                .map(Zeroizing::new)
                .map(Some)
                .map_err(|_| secure_storage_error()),
            Some(_) => Err(secure_storage_error()),
            None => Ok(None),
        }
    }

    fn password_options() -> PasswordOptions {
        let mut options = PasswordOptions::new_generic_password(SERVICE_NAME, VAULT_KEY_NAME);
        options.set_access_synchronized(Some(false));
        options.set_label("JobSentinel credential vault key");
        options
    }

    fn vault_key_search_options() -> ItemSearchOptions {
        let mut search = ItemSearchOptions::new();
        search
            .class(ItemClass::generic_password())
            .service(SERVICE_NAME)
            .account(VAULT_KEY_NAME)
            .cloud_sync(Some(false));
        attach_local_authentication_context(&mut search);
        search
    }

    fn attach_local_authentication_context(search: &mut ItemSearchOptions) {
        let context = new_authentication_context();
        let context = Retained::into_raw(context);
        #[allow(deprecated)]
        unsafe {
            // SAFETY: `LAContext::new` returns a +1 retained Objective-C object.
            // `Retained::into_raw` transfers that +1 retain count, and
            // `authentication_context` immediately wraps it under create-rule
            // ownership for the query dictionary value.
            search.authentication_context(context.cast());
        }
    }

    fn new_authentication_context() -> Retained<LAContext> {
        let context = unsafe {
            // SAFETY: `+[LAContext new]` returns a valid retained LAContext.
            LAContext::new()
        };
        let reason = NSString::from_str("unlock saved JobSentinel details");
        unsafe {
            // SAFETY: The generated setters require Objective-C messaging.
            // Both inputs are live retained objects for the duration of the call.
            context.setLocalizedReason(&reason);
            context.setInteractionNotAllowed(false);
        }
        context
    }

    fn is_not_found(error: SecurityError) -> bool {
        error.code() == ERR_SEC_ITEM_NOT_FOUND
    }

    fn sanitize_security_error(_error: SecurityError) -> String {
        secure_storage_error()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::Cell;

    #[test]
    fn local_migration_preserves_invalid_keys_without_writing() {
        let written = Cell::new(false);
        let result = localize_vault_key("invalid", false, || {
            written.set(true);
            Ok(())
        });
        assert!(result.is_err());
        assert!(!written.get());
    }

    #[test]
    fn local_migration_propagates_write_failure_and_skips_local_keys() {
        let encoded = "ab".repeat(MASTER_KEY_LEN);
        assert_eq!(
            localize_vault_key(&encoded, false, || Err("failed".into())),
            Err("failed".into())
        );
        assert!(localize_vault_key(&encoded, true, || panic!(
            "local keys must not be rewritten"
        ))
        .is_ok());
        let written = Cell::new(false);
        assert!(localize_vault_key(&encoded, false, || {
            written.set(true);
            Ok(())
        })
        .is_ok());
        assert!(written.get());
    }
}
