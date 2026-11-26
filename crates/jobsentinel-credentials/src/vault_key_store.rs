//! Credential-vault key access through the platform owner.

use super::vault::MASTER_KEY_LEN;
use zeroize::Zeroizing;

/// Process-wide vault key. Its lock single-flights native loads and is the only creator;
/// holders clear it whenever the OS item is deleted or replaced.
pub(super) type VaultKeyCache = tokio::sync::Mutex<Option<Zeroizing<[u8; MASTER_KEY_LEN]>>>;

#[cfg(not(test))]
pub(super) fn cache() -> &'static VaultKeyCache {
    static CACHE: VaultKeyCache = VaultKeyCache::const_new(None);
    &CACHE
}
#[cfg(test)]
pub(super) use test_key::cache;

#[cfg(test)]
pub(super) use jobsentinel_platform::CredentialVaultKeyBackend as VaultKeyBackend;
#[cfg(test)]
pub(super) use jobsentinel_platform::CredentialVaultKeyStoragePolicy as VaultKeyStoragePolicy;

#[cfg(test)]
pub(super) const fn runtime_policy() -> VaultKeyStoragePolicy {
    jobsentinel_platform::credential_vault_key_storage_policy()
}

#[cfg(not(test))]
use jobsentinel_platform::{
    delete_credential_vault_key as native_delete, load_credential_vault_key as native_load,
    store_credential_vault_key as native_store,
};
#[cfg(test)]
use test_key::{delete as native_delete, load as native_load, store as native_store};

pub(super) async fn store_vault_key(key: &[u8]) -> Result<(), String> {
    native_store(key).await
}

pub(super) async fn delete_vault_key() -> Result<(), String> {
    native_delete().await
}

pub(super) async fn load_vault_key(
    create_if_missing: bool,
) -> Result<[u8; MASTER_KEY_LEN], String> {
    native_load(create_if_missing).await
}

/// Per-thread vault-key store that replaces every native call in this crate's tests.
#[cfg(test)]
pub(crate) mod test_key {
    use super::{VaultKeyCache, MASTER_KEY_LEN};
    use std::cell::Cell;

    thread_local! {
        static STORED: Cell<Option<[u8; MASTER_KEY_LEN]>> = const { Cell::new(None) };
        static WRITES: Cell<u8> = const { Cell::new(0) };
        static READS: Cell<u8> = const { Cell::new(0) };
        static MISS_NEXT_READ: Cell<bool> = const { Cell::new(false) };
        static RACE: Cell<bool> = const { Cell::new(false) };
        static CREATORS: Cell<u8> = const { Cell::new(0) };
        static CACHE: &'static VaultKeyCache = Box::leak(Box::new(VaultKeyCache::const_new(None)));
    }

    /// This thread's stand-in for the process-wide cache, so parallel tests stay isolated.
    pub(crate) fn cache() -> &'static VaultKeyCache {
        CACHE.with(|cache| *cache)
    }

    /// Empty this thread's store and cache, and reset its counters.
    pub(crate) fn reset() {
        STORED.set(None);
        WRITES.set(0);
        READS.set(0);
        MISS_NEXT_READ.set(false);
        RACE.set(false);
        CREATORS.set(0);
        *cache().try_lock().expect("vault key cache is idle") = None;
    }

    /// Report the next read as missing even if a key is stored, like a spurious `NoEntry`.
    pub(crate) fn miss_next_read() {
        MISS_NEXT_READ.set(true);
    }

    pub(crate) fn reads() -> u8 {
        READS.get()
    }

    /// Hold each creator up to 200 ms for a rival, so an unserialized race always appears.
    pub(crate) fn hold_creators_for_a_race() {
        RACE.set(true);
    }

    pub(crate) fn writes() -> u8 {
        WRITES.get()
    }

    pub(crate) fn creators() -> u8 {
        CREATORS.get()
    }

    pub(super) async fn store(key: &[u8]) -> Result<(), String> {
        let key = key.try_into().map_err(|_| crate::secure_storage_error())?;
        STORED.set(Some(key));
        WRITES.set(WRITES.get() + 1);
        Ok(())
    }

    pub(super) async fn delete() -> Result<(), String> {
        STORED.set(None);
        Ok(())
    }

    /// Mirrors the native read-then-create gap so racing creators are observable.
    pub(super) async fn load(create_if_missing: bool) -> Result<[u8; MASTER_KEY_LEN], String> {
        // A native read yields while it blocks, so concurrent loaders can overlap.
        tokio::task::yield_now().await;
        READS.set(READS.get() + 1);
        if let Some(key) = STORED.get().filter(|_| !MISS_NEXT_READ.replace(false)) {
            return Ok(key);
        }
        if !create_if_missing {
            return Err(crate::secure_storage_error());
        }
        CREATORS.set(CREATORS.get() + 1);
        if RACE.get() {
            let rival = async {
                while CREATORS.get() < 2 {
                    tokio::time::sleep(std::time::Duration::from_millis(1)).await;
                }
            };
            let _ = tokio::time::timeout(std::time::Duration::from_millis(200), rival).await;
        }
        let key = [WRITES.get() + 1; MASTER_KEY_LEN];
        store(&key).await?;
        Ok(key)
    }
}

#[cfg(test)]
pub(super) fn decode_vault_key(encoded_key: &str) -> Result<[u8; MASTER_KEY_LEN], String> {
    jobsentinel_platform::decode_credential_vault_key(encoded_key)
}
