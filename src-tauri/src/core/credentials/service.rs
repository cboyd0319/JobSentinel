//! Runtime credential provider for vault-backed credential access.
//!
//! Status checks use SQLite metadata only and do not touch the OS credential
//! store. Actual secret reads and writes lazily unlock or create the vault key.

use keyring::{Entry, Error as KeyringError};
use sqlx::sqlite::SqlitePool;
use std::{fmt, sync::Arc};
use tokio::sync::OnceCell;
use zeroize::Zeroizing;

use super::{
    passphrase::{self, PassphraseError},
    reject_disabled_credential_storage, secure_storage_error, validate_credential_value,
    vault::MASTER_KEY_LEN,
    CredentialKey, CredentialPresence, CredentialStore, SecretVault, SecretVaultError,
    SERVICE_NAME,
};

const VAULT_KEY_NAME: &str = "jobsentinel_vault_key";

/// App-level credential vault lock mode.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CredentialUnlockMode {
    System,
    Passphrase,
}

impl CredentialUnlockMode {
    #[must_use]
    pub fn as_str(self) -> &'static str {
        match self {
            Self::System => passphrase::MODE_SYSTEM,
            Self::Passphrase => passphrase::MODE_PASSPHRASE,
        }
    }
}

/// Non-secret credential-vault unlock state for settings diagnostics.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct CredentialUnlockState {
    pub mode: CredentialUnlockMode,
    pub configured: bool,
    pub unlocked: bool,
}

/// Credential access service used by Tauri commands and backend workers.
pub struct CredentialService {
    pool: Option<SqlitePool>,
    master_key: OnceCell<Arc<Zeroizing<[u8; MASTER_KEY_LEN]>>>,
    fixed_master_key: Option<Zeroizing<[u8; MASTER_KEY_LEN]>>,
    legacy_fallback: bool,
}

impl fmt::Debug for CredentialService {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("CredentialService")
            .field("has_vault", &self.pool.is_some())
            .field("has_cached_key", &self.master_key.get().is_some())
            .field("has_fixed_key", &self.fixed_master_key.is_some())
            .field("legacy_fallback", &self.legacy_fallback)
            .finish()
    }
}

impl CredentialService {
    /// Create the production provider backed by the local SQLite vault.
    #[must_use]
    pub fn new(pool: SqlitePool) -> Self {
        Self {
            pool: Some(pool),
            master_key: OnceCell::new(),
            fixed_master_key: None,
            legacy_fallback: true,
        }
    }

    /// Create a keyring-only compatibility provider for old tests and helpers.
    #[must_use]
    pub fn compatibility_keyring() -> Self {
        Self {
            pool: None,
            master_key: OnceCell::new(),
            fixed_master_key: None,
            legacy_fallback: true,
        }
    }

    /// Create a deterministic vault-backed provider for non-interactive tests.
    #[must_use]
    pub fn with_fixed_master_key(
        pool: SqlitePool,
        master_key: [u8; MASTER_KEY_LEN],
        legacy_fallback: bool,
    ) -> Self {
        Self {
            pool: Some(pool),
            master_key: OnceCell::new(),
            fixed_master_key: Some(Zeroizing::new(master_key)),
            legacy_fallback,
        }
    }

    /// Store or replace a credential.
    pub async fn store(&self, key: CredentialKey, value: &str) -> Result<(), String> {
        if value.is_empty() {
            return self.delete(key).await;
        }

        reject_disabled_credential_storage(key)?;
        validate_credential_value(key, value)?;

        if let Some(vault) = self.vault(true).await? {
            vault
                .store(key, value)
                .await
                .map_err(sanitize_vault_error)?;
            self.delete_legacy_best_effort(key).await;
            return Ok(());
        }

        Self::legacy_store(key, value).await
    }

    /// Retrieve a credential. Reads the vault first, then lazily migrates a
    /// legacy OS-keyring item only when a secret is actually needed.
    pub async fn retrieve(&self, key: CredentialKey) -> Result<Option<String>, String> {
        if self.vault_row_exists(key).await? {
            let vault = self.vault(false).await?.ok_or_else(secure_storage_error)?;
            return vault.retrieve(key).await.map_err(sanitize_vault_error);
        }

        if !self.legacy_fallback {
            return Ok(None);
        }

        let legacy_value = Self::legacy_retrieve(key).await?;
        if let Some(value) = legacy_value.as_deref().filter(|value| !value.is_empty()) {
            self.migrate_legacy_value_best_effort(key, value).await;
        }

        Ok(legacy_value)
    }

    /// Delete a credential from both vault and legacy compatibility storage.
    pub async fn delete(&self, key: CredentialKey) -> Result<(), String> {
        if let Some(pool) = &self.pool {
            sqlx::query("DELETE FROM secret_vault WHERE key = ?")
                .bind(key.as_str())
                .execute(pool)
                .await
                .map_err(|_| secure_storage_error())?;
        }

        if self.legacy_fallback {
            Self::legacy_delete(key).await?;
        }

        Ok(())
    }

    /// Check vault-row presence without touching the OS credential store.
    pub async fn exists(&self, key: CredentialKey) -> Result<bool, String> {
        if matches!(
            key,
            CredentialKey::LinkedInCookie | CredentialKey::LinkedInCookieExpiry
        ) {
            return Ok(false);
        }

        self.vault_row_exists(key).await
    }

    /// Return non-secret credential status without touching the OS keyring.
    pub async fn list_status(&self) -> Vec<CredentialPresence> {
        let mut statuses = Vec::with_capacity(CredentialKey::all().len());
        for &key in CredentialKey::all() {
            match self.exists(key).await {
                Ok(exists) => statuses.push(CredentialPresence {
                    key,
                    exists,
                    available: true,
                }),
                Err(_) => statuses.push(CredentialPresence {
                    key,
                    exists: false,
                    available: false,
                }),
            }
        }
        statuses
    }

    /// Return non-secret vault-lock status without touching the OS keyring.
    pub async fn unlock_status(&self) -> Result<CredentialUnlockState, String> {
        let Some(pool) = &self.pool else {
            return Ok(CredentialUnlockState {
                mode: CredentialUnlockMode::System,
                configured: false,
                unlocked: true,
            });
        };

        let configured = passphrase::is_configured(pool)
            .await
            .map_err(sanitize_passphrase_error)?;

        if configured {
            Ok(CredentialUnlockState {
                mode: CredentialUnlockMode::Passphrase,
                configured: true,
                unlocked: self.master_key.get().is_some(),
            })
        } else {
            Ok(CredentialUnlockState {
                mode: CredentialUnlockMode::System,
                configured: false,
                unlocked: true,
            })
        }
    }

    /// Enable passphrase wrapping for the credential-vault master key.
    pub async fn enable_passphrase_lock(&self, passphrase: &str) -> Result<(), String> {
        let Some(pool) = &self.pool else {
            return Err(secure_storage_error());
        };

        let key = self.master_key(true).await?;
        passphrase::wrap_key(pool, passphrase, copy_key_bytes(key.as_ref()))
            .await
            .map_err(sanitize_passphrase_error)?;

        if self.fixed_master_key.is_none() {
            if let Err(error) = delete_vault_key_from_keyring().await {
                let _ = passphrase::delete_config(pool).await;
                return Err(error);
            }
        }

        Ok(())
    }

    /// Unlock a passphrase-protected credential vault for this app session.
    pub async fn unlock_passphrase_vault(&self, passphrase: &str) -> Result<(), String> {
        let Some(pool) = &self.pool else {
            return Err(secure_storage_error());
        };

        if !passphrase::is_configured(pool)
            .await
            .map_err(sanitize_passphrase_error)?
        {
            return Err(PassphraseError::NotConfigured.to_string());
        }

        if self.master_key.get().is_some() {
            return Ok(());
        }

        let key = passphrase::unwrap_key(pool, passphrase)
            .await
            .map_err(sanitize_passphrase_error)?;
        self.cache_master_key(key)
    }

    /// Disable passphrase wrapping and return the vault key to the OS keyring.
    pub async fn disable_passphrase_lock(&self, passphrase: &str) -> Result<(), String> {
        let Some(pool) = &self.pool else {
            return Err(secure_storage_error());
        };

        let key = passphrase::unwrap_key(pool, passphrase)
            .await
            .map_err(sanitize_passphrase_error)?;

        if self.fixed_master_key.is_none() {
            store_vault_key_in_keyring(key.as_ref()).await?;
        }

        passphrase::delete_config(pool)
            .await
            .map_err(sanitize_passphrase_error)?;
        self.cache_master_key(key)
    }

    async fn vault(&self, create_if_missing: bool) -> Result<Option<SecretVault>, String> {
        let Some(pool) = &self.pool else {
            return Ok(None);
        };
        let key = self.master_key(create_if_missing).await?;
        Ok(Some(SecretVault::from_shared_key(pool.clone(), key)))
    }

    async fn master_key(
        &self,
        create_if_missing: bool,
    ) -> Result<Arc<Zeroizing<[u8; MASTER_KEY_LEN]>>, String> {
        self.master_key
            .get_or_try_init(|| async move {
                if let Some(pool) = &self.pool {
                    if passphrase::is_configured(pool)
                        .await
                        .map_err(sanitize_passphrase_error)?
                    {
                        return Err(secure_storage_error());
                    }
                }

                let key = if let Some(fixed_key) = &self.fixed_master_key {
                    let mut bytes = [0_u8; MASTER_KEY_LEN];
                    bytes.copy_from_slice(fixed_key.as_ref());
                    bytes
                } else {
                    load_vault_key_from_keyring(create_if_missing).await?
                };

                Ok(Arc::new(Zeroizing::new(key)))
            })
            .await
            .cloned()
    }

    fn cache_master_key(&self, key: Zeroizing<[u8; MASTER_KEY_LEN]>) -> Result<(), String> {
        if self.master_key.get().is_some() {
            return Ok(());
        }

        if self.master_key.set(Arc::new(key)).is_err() && self.master_key.get().is_none() {
            return Err(secure_storage_error());
        }

        Ok(())
    }

    async fn vault_row_exists(&self, key: CredentialKey) -> Result<bool, String> {
        let Some(pool) = &self.pool else {
            return Ok(false);
        };

        let exists: i64 =
            sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM secret_vault WHERE key = ?)")
                .bind(key.as_str())
                .fetch_one(pool)
                .await
                .map_err(|_| secure_storage_error())?;

        Ok(exists == 1)
    }

    async fn migrate_legacy_value_best_effort(&self, key: CredentialKey, value: &str) {
        if let Some(vault) = self.vault(true).await.ok().flatten() {
            if vault.store(key, value).await.is_ok() {
                self.delete_legacy_best_effort(key).await;
            }
        }
    }

    async fn delete_legacy_best_effort(&self, key: CredentialKey) {
        if self.legacy_fallback {
            let _ = Self::legacy_delete(key).await;
        }
    }

    async fn legacy_store(key: CredentialKey, value: &str) -> Result<(), String> {
        let value = value.to_string();
        tokio::task::spawn_blocking(move || CredentialStore::store(key, &value))
            .await
            .map_err(|_| secure_storage_error())?
    }

    async fn legacy_retrieve(key: CredentialKey) -> Result<Option<String>, String> {
        tokio::task::spawn_blocking(move || CredentialStore::retrieve(key))
            .await
            .map_err(|_| secure_storage_error())?
    }

    async fn legacy_delete(key: CredentialKey) -> Result<(), String> {
        tokio::task::spawn_blocking(move || CredentialStore::delete(key))
            .await
            .map_err(|_| secure_storage_error())?
    }
}

async fn store_vault_key_in_keyring(key: &[u8]) -> Result<(), String> {
    if key.len() != MASTER_KEY_LEN {
        return Err(secure_storage_error());
    }

    let mut key_bytes = [0_u8; MASTER_KEY_LEN];
    key_bytes.copy_from_slice(key);
    let key = Zeroizing::new(key_bytes);
    tokio::task::spawn_blocking(move || {
        let entry = Entry::new(SERVICE_NAME, VAULT_KEY_NAME).map_err(|_| secure_storage_error())?;
        let encoded_key = Zeroizing::new(hex::encode(key.as_ref()));
        entry
            .set_password(encoded_key.as_str())
            .map_err(|_| secure_storage_error())
    })
    .await
    .map_err(|_| secure_storage_error())?
}

async fn delete_vault_key_from_keyring() -> Result<(), String> {
    tokio::task::spawn_blocking(move || {
        let entry = Entry::new(SERVICE_NAME, VAULT_KEY_NAME).map_err(|_| secure_storage_error())?;
        match entry.delete_credential() {
            Ok(()) | Err(KeyringError::NoEntry) => Ok(()),
            Err(_) => Err(secure_storage_error()),
        }
    })
    .await
    .map_err(|_| secure_storage_error())?
}

async fn load_vault_key_from_keyring(
    create_if_missing: bool,
) -> Result<[u8; MASTER_KEY_LEN], String> {
    tokio::task::spawn_blocking(move || {
        let entry = Entry::new(SERVICE_NAME, VAULT_KEY_NAME).map_err(|_| secure_storage_error())?;

        match entry.get_password() {
            Ok(encoded_key) => decode_vault_key(&encoded_key),
            Err(KeyringError::NoEntry) if create_if_missing => {
                let key = SecretVault::generate_master_key();
                let encoded_key = Zeroizing::new(hex::encode(key));
                entry
                    .set_password(encoded_key.as_str())
                    .map_err(|_| secure_storage_error())?;
                Ok(key)
            }
            Err(KeyringError::NoEntry) => Err(secure_storage_error()),
            Err(_) => Err(secure_storage_error()),
        }
    })
    .await
    .map_err(|_| secure_storage_error())?
}

fn decode_vault_key(encoded_key: &str) -> Result<[u8; MASTER_KEY_LEN], String> {
    let decoded =
        Zeroizing::new(hex::decode(encoded_key.trim()).map_err(|_| secure_storage_error())?);
    if decoded.len() != MASTER_KEY_LEN {
        return Err(secure_storage_error());
    }

    let mut key = [0_u8; MASTER_KEY_LEN];
    key.copy_from_slice(decoded.as_slice());
    Ok(key)
}

fn sanitize_vault_error(error: SecretVaultError) -> String {
    match error {
        SecretVaultError::Credential(message) => message,
        SecretVaultError::Crypto
        | SecretVaultError::InvalidData
        | SecretVaultError::Storage
        | SecretVaultError::UnsupportedEnvelope => secure_storage_error(),
    }
}

fn sanitize_passphrase_error(error: PassphraseError) -> String {
    match error {
        PassphraseError::AlreadyConfigured
        | PassphraseError::InvalidPassphrase
        | PassphraseError::NotConfigured
        | PassphraseError::Policy => error.to_string(),
        PassphraseError::Storage | PassphraseError::UnsupportedEnvelope => secure_storage_error(),
    }
}

fn copy_key_bytes(key: &Zeroizing<[u8; MASTER_KEY_LEN]>) -> [u8; MASTER_KEY_LEN] {
    let mut bytes = [0_u8; MASTER_KEY_LEN];
    bytes.copy_from_slice(key.as_ref());
    bytes
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::db::Database;

    async fn test_service() -> CredentialService {
        let database = Database::connect_memory().await.unwrap();
        database.migrate().await.unwrap();
        CredentialService::with_fixed_master_key(database.pool().clone(), [9_u8; 32], false)
    }

    #[tokio::test]
    async fn service_roundtrips_vault_credentials() {
        let service = test_service().await;

        service
            .store(CredentialKey::SmtpPassword, "mail-password")
            .await
            .unwrap();

        assert!(service.exists(CredentialKey::SmtpPassword).await.unwrap());
        assert_eq!(
            service.retrieve(CredentialKey::SmtpPassword).await.unwrap(),
            Some("mail-password".to_string())
        );
    }

    #[tokio::test]
    async fn service_status_uses_vault_rows_without_legacy_fallback() {
        let service = test_service().await;

        service
            .store(
                CredentialKey::SlackWebhook,
                "https://hooks.slack.com/services/T/B/C",
            )
            .await
            .unwrap();

        let statuses = service.list_status().await;
        let slack = statuses
            .iter()
            .find(|status| status.key == CredentialKey::SlackWebhook)
            .unwrap();
        let email = statuses
            .iter()
            .find(|status| status.key == CredentialKey::SmtpPassword)
            .unwrap();

        assert!(slack.available);
        assert!(slack.exists);
        assert!(email.available);
        assert!(!email.exists);
    }

    #[tokio::test]
    async fn service_deletes_vault_rows() {
        let service = test_service().await;

        service
            .store(CredentialKey::TelegramBotToken, "telegram-token")
            .await
            .unwrap();
        service
            .delete(CredentialKey::TelegramBotToken)
            .await
            .unwrap();

        assert!(!service
            .exists(CredentialKey::TelegramBotToken)
            .await
            .unwrap());
        assert_eq!(
            service
                .retrieve(CredentialKey::TelegramBotToken)
                .await
                .unwrap(),
            None
        );
    }

    #[test]
    fn decode_vault_key_rejects_malformed_values_without_echo() {
        let err = decode_vault_key("not-a-key").unwrap_err();

        assert_eq!(err, secure_storage_error());
        assert!(!err.contains("not-a-key"));
    }
}
