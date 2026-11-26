//! Loads validated Windows device keys and replaces roaming persistence without rotating keys.

use keyring::{Entry, Error};
use zeroize::Zeroizing;

#[cfg(windows)]
pub(super) fn entry(name: &str) -> Result<Entry, Error> {
    use keyring_core::api::CredentialStoreApi;
    use std::collections::HashMap;

    let store = windows_native_keyring_store::Store::new()?;
    let modifiers = HashMap::from([("persistence", "Local")]);
    let inner = store.build(crate::SECURE_STORAGE_SERVICE, name, Some(&modifiers))?;
    Ok(Entry { inner })
}

/// Load a 32-byte hex key; `Ok(None)` means `NoEntry`, which is not proof of absence.
pub(super) fn load(entry: &Entry) -> Result<Option<Zeroizing<String>>, ()> {
    let encoded_key = match entry.get_password() {
        Ok(encoded_key) => Zeroizing::new(encoded_key),
        Err(Error::NoEntry) => return Ok(None),
        Err(error) => {
            crate::database_key::wipe_keyring_error(error);
            return Err(());
        }
    };
    if !crate::database_key::is_valid_key_hex(encoded_key.trim()) {
        return Err(());
    }
    let attributes = entry.inner.get_attributes().map_err(|_| ())?;
    if attributes.get("persistence").map(String::as_str) != Some("Local") {
        // Overwrite the same target only after validation; never delete or rotate it.
        // This changes local persistence but cannot revoke previously roamed copies.
        entry.set_password(&encoded_key).map_err(|_| ())?;
    }
    Ok(Some(encoded_key))
}

#[cfg(test)]
mod tests {
    use super::*;
    use keyring_core::api::{CredentialApi, CredentialStoreApi};
    use std::collections::HashMap;
    use std::sync::{
        atomic::{AtomicUsize, Ordering},
        Arc,
    };

    struct Credential {
        inner: keyring_core::Entry,
        persistence: std::sync::Mutex<&'static str>,
        fail_read: bool,
        fail_attributes: bool,
        fail_write: bool,
        writes: AtomicUsize,
    }

    impl CredentialApi for Credential {
        fn get_secret(&self) -> keyring_core::Result<Vec<u8>> {
            if self.fail_read {
                return Err(Error::NoDefaultStore);
            }
            self.inner.get_secret()
        }
        fn set_secret(&self, secret: &[u8]) -> keyring_core::Result<()> {
            self.writes.fetch_add(1, Ordering::SeqCst);
            if self.fail_write {
                return Err(Error::NoDefaultStore);
            }
            // Native writes go through the `Local` entry, so later reads see `Local`.
            *self.persistence.lock().unwrap() = "Local";
            self.inner.set_secret(secret)
        }
        fn get_attributes(&self) -> keyring_core::Result<HashMap<String, String>> {
            if self.fail_attributes {
                return Err(Error::NoDefaultStore);
            }
            let persistence = *self.persistence.lock().unwrap();
            Ok(HashMap::from([("persistence".into(), persistence.into())]))
        }
        fn delete_credential(&self) -> keyring_core::Result<()> {
            panic!("migration must never delete the existing key")
        }
        fn get_credential(&self) -> keyring_core::Result<Option<Arc<keyring_core::Credential>>> {
            self.inner.get_secret()?;
            Ok(None)
        }
        fn get_specifiers(&self) -> Option<(String, String)> {
            self.inner.get_specifiers()
        }
        fn as_any(&self) -> &dyn std::any::Any {
            self
        }
    }

    fn fixture(name: &str, key: Option<&str>, persistence: &'static str) -> Credential {
        let store = keyring_core::mock::Store::new().unwrap();
        let inner = store
            .build(crate::SECURE_STORAGE_SERVICE, name, None)
            .unwrap();
        if let Some(key) = key {
            inner.set_password(key).unwrap();
        }
        Credential {
            inner,
            persistence: std::sync::Mutex::new(persistence),
            fail_read: false,
            fail_attributes: false,
            fail_write: false,
            writes: AtomicUsize::new(0),
        }
    }

    fn entry(credential: &Arc<Credential>) -> Entry {
        Entry {
            inner: keyring_core::Entry::new_with_credential(credential.clone()),
        }
    }

    #[cfg(windows)]
    #[test]
    fn native_entries_keep_the_existing_specifiers() {
        for name in ["jobsentinel_database_key", "jobsentinel_vault_key"] {
            let entry = super::entry(name).unwrap();
            assert_eq!(
                entry.inner.get_specifiers(),
                Some((crate::SECURE_STORAGE_SERVICE.into(), name.into()))
            );
        }
    }

    #[test]
    fn malformed_keys_are_preserved_without_writing() {
        for value in ["invalid".to_string(), "ab".repeat(31), "zz".repeat(32)] {
            let credential = Arc::new(fixture(
                "jobsentinel_database_key",
                Some(&value),
                "Enterprise",
            ));
            assert!(load(&entry(&credential)).is_err());
            assert_eq!(credential.writes.load(Ordering::SeqCst), 0);
            assert_eq!(credential.inner.get_password().unwrap(), value);
        }
    }

    #[test]
    fn legacy_keys_are_repersisted_once_with_exact_value_and_local_keys_never() {
        let value = format!("  {}\n", "AB".repeat(32));
        for name in ["jobsentinel_database_key", "jobsentinel_vault_key"] {
            for (persistence, writes) in [("Enterprise", 1), ("Local", 0)] {
                let credential = Arc::new(fixture(name, Some(&value), persistence));
                for _ in 0..2 {
                    assert_eq!(load(&entry(&credential)).unwrap().unwrap().as_str(), value);
                }
                assert_eq!(credential.inner.get_password().unwrap(), value);
                assert_eq!(credential.writes.load(Ordering::SeqCst), writes);
            }
        }
    }

    #[test]
    fn failed_migration_preserves_the_old_key() {
        let value = "ab".repeat(32);
        let mut credential = fixture("jobsentinel_database_key", Some(&value), "Enterprise");
        credential.fail_write = true;
        let credential = Arc::new(credential);
        assert!(load(&entry(&credential)).is_err());
        assert_eq!(credential.writes.load(Ordering::SeqCst), 1);
        assert_eq!(credential.inner.get_password().unwrap(), value);
    }

    #[test]
    fn missing_key_and_storage_failures_are_distinct_without_writes() {
        let missing = Arc::new(fixture("jobsentinel_database_key", None, "Enterprise"));
        assert!(load(&entry(&missing)).unwrap().is_none());
        assert_eq!(missing.writes.load(Ordering::SeqCst), 0);
        for fail_read in [false, true] {
            let mut credential = fixture(
                "jobsentinel_database_key",
                Some(&"ab".repeat(32)),
                "Enterprise",
            );
            credential.fail_read = fail_read;
            credential.fail_attributes = !fail_read;
            let credential = Arc::new(credential);
            assert!(load(&entry(&credential)).is_err());
            assert_eq!(credential.writes.load(Ordering::SeqCst), 0);
        }
    }
}
