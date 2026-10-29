//! Provides vault-backed credentials with metadata-only status and explicit native cleanup.

use chacha20poly1305::aead::Generate;
use jobsentinel_storage::CredentialRepository;
use std::{fmt, sync::Arc};
use tokio::sync::OnceCell;
use zeroize::Zeroizing;

use super::{
    delete_os_credential,
    passphrase::{self, PassphraseError},
    reject_disabled_credential_storage, secure_storage_error, validate_credential_value,
    vault::MASTER_KEY_LEN,
    vault_key_store, CredentialKey, CredentialPresence, SecretVault, SecretVaultError,
};

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
    repository: CredentialRepository,
    master_key: OnceCell<Arc<Zeroizing<[u8; MASTER_KEY_LEN]>>>,
    fixed_master_key: Option<Zeroizing<[u8; MASTER_KEY_LEN]>>,
    portable: bool,
}

impl fmt::Debug for CredentialService {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("CredentialService")
            .field("has_cached_key", &self.master_key.get().is_some())
            .field("has_fixed_key", &self.fixed_master_key.is_some())
            .finish_non_exhaustive()
    }
}

impl CredentialService {
    /// Create the production provider backed by the local SQLite vault.
    #[must_use]
    pub fn new(repository: CredentialRepository) -> Self {
        Self {
            repository,
            master_key: OnceCell::new(),
            fixed_master_key: None,
            portable: false,
        }
    }

    /// Open portable saved details using only their existing passphrase envelope.
    /// An empty new vault receives a random wrapped key; missing protection never replaces saved data.
    pub async fn new_portable(
        repository: CredentialRepository,
        passphrase: &str,
    ) -> Result<Self, String> {
        let key = if passphrase::is_configured(&repository)
            .await
            .map_err(sanitize_passphrase_error)?
        {
            passphrase::unwrap_key(&repository, passphrase)
                .await
                .map_err(sanitize_passphrase_error)?
        } else {
            if repository
                .has_secrets()
                .await
                .map_err(|_| secure_storage_error())?
            {
                return Err(
                    "Portable saved details are missing their passphrase protection.".into(),
                );
            }
            let key = Zeroizing::new(<[u8; MASTER_KEY_LEN]>::generate());
            passphrase::wrap_key(&repository, passphrase, copy_key_bytes(&key))
                .await
                .map_err(sanitize_passphrase_error)?;
            key
        };
        let mut service = Self::new(repository);
        service.portable = true;
        service.cache_master_key(key)?;
        Ok(service)
    }

    /// Create a deterministic vault-backed provider for non-interactive tests.
    #[must_use]
    pub fn with_fixed_master_key(
        repository: CredentialRepository,
        master_key: [u8; MASTER_KEY_LEN],
    ) -> Self {
        Self {
            repository,
            master_key: OnceCell::new(),
            fixed_master_key: Some(Zeroizing::new(master_key)),
            portable: false,
        }
    }

    /// Store or replace a credential.
    pub async fn store(&self, key: CredentialKey, value: &str) -> Result<(), String> {
        if value.is_empty() {
            return self.delete(key).await;
        }

        reject_disabled_credential_storage(key)?;
        validate_credential_value(key, value)?;

        self.vault(true)
            .await?
            .store(key, value)
            .await
            .map_err(sanitize_vault_error)
    }

    /// Read a vault entry without consulting retired per-secret OS items.
    pub async fn retrieve(&self, key: CredentialKey) -> Result<Option<String>, String> {
        if !self.vault_row_exists(key).await? {
            return Ok(None);
        }
        self.vault(false)
            .await?
            .retrieve(key)
            .await
            .map_err(sanitize_vault_error)
    }

    /// Delete the vault entry and explicitly clean matching OS entries for native providers.
    pub async fn delete(&self, key: CredentialKey) -> Result<(), String> {
        self.repository
            .delete_secret(key.as_str())
            .await
            .map_err(|_| secure_storage_error())?;
        // Portable profiles and fixed-key fixtures never own host credential entries.
        if !self.portable && self.fixed_master_key.is_none() {
            tokio::task::spawn_blocking(move || delete_os_credential(key))
                .await
                .map_err(|_| secure_storage_error())??;
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
        let repository = &self.repository;

        let configured = passphrase::is_configured(repository)
            .await
            .map_err(sanitize_passphrase_error)?;

        if configured {
            Ok(CredentialUnlockState {
                mode: CredentialUnlockMode::Passphrase,
                configured: true,
                unlocked: self.master_key.get().is_some(),
            })
        } else if self.portable {
            Err("Portable credential passphrase protection is unavailable.".into())
        } else {
            Ok(CredentialUnlockState {
                mode: CredentialUnlockMode::System,
                configured: false,
                unlocked: true,
            })
        }
    }

    /// Prepare a persistent passphrase or user-presence key before enabling app lock.
    pub async fn prepare_app_lock(&self) -> Result<(), String> {
        if !passphrase::is_configured(&self.repository)
            .await
            .map_err(sanitize_passphrase_error)?
        {
            self.require_app_user_presence()?;
            self.master_key(true).await?;
        }
        Ok(())
    }

    /// Authenticate app unlock afresh; a cached vault key is never proof of identity.
    pub async fn verify_app_unlock(&self, passphrase: Option<&str>) -> Result<(), String> {
        let key = if passphrase::is_configured(&self.repository)
            .await
            .map_err(sanitize_passphrase_error)?
        {
            passphrase::unwrap_key(&self.repository, passphrase.unwrap_or_default())
                .await
                .map_err(sanitize_passphrase_error)?
        } else {
            self.require_app_user_presence()?;
            Zeroizing::new(vault_key_store::load_vault_key(false).await?)
        };
        self.cache_master_key(key)
    }

    fn require_app_user_presence(&self) -> Result<(), String> {
        if self.portable {
            return Err("Portable credentials require their passphrase.".into());
        }
        if self.fixed_master_key.is_some()
            || !jobsentinel_platform::credential_vault_key_storage_policy().user_presence_required
        {
            return Err("Configure a saved-details passphrase before enabling shared-computer mode on this device.".into());
        }
        Ok(())
    }

    /// Enable passphrase wrapping for the credential-vault master key.
    pub async fn enable_passphrase_lock(&self, passphrase: &str) -> Result<(), String> {
        if self.portable {
            return Err("Portable credential protection cannot be changed independently of its profile passphrase.".into());
        }
        let repository = &self.repository;

        let key = self.master_key(true).await?;
        passphrase::wrap_key(repository, passphrase, copy_key_bytes(key.as_ref()))
            .await
            .map_err(sanitize_passphrase_error)?;

        if self.fixed_master_key.is_none() {
            if let Err(error) = vault_key_store::delete_vault_key().await {
                let _ = passphrase::delete_config(repository).await;
                return Err(error);
            }
        }

        Ok(())
    }

    /// Unlock a passphrase-protected credential vault for this app session.
    pub async fn unlock_passphrase_vault(&self, passphrase: &str) -> Result<(), String> {
        let repository = &self.repository;

        if !passphrase::is_configured(repository)
            .await
            .map_err(sanitize_passphrase_error)?
        {
            return Err(PassphraseError::NotConfigured.to_string());
        }

        if self.master_key.get().is_some() {
            return Ok(());
        }

        let key = passphrase::unwrap_key(repository, passphrase)
            .await
            .map_err(sanitize_passphrase_error)?;
        self.cache_master_key(key)
    }

    /// Disable passphrase wrapping and return the vault key to the OS keyring.
    pub async fn disable_passphrase_lock(&self, passphrase: &str) -> Result<(), String> {
        if self.portable {
            return Err("Portable credential protection cannot be changed independently of its profile passphrase.".into());
        }
        let repository = &self.repository;

        let key = passphrase::unwrap_key(repository, passphrase)
            .await
            .map_err(sanitize_passphrase_error)?;

        if self.fixed_master_key.is_none() {
            vault_key_store::store_vault_key(key.as_ref()).await?;
        }

        passphrase::delete_config(repository)
            .await
            .map_err(sanitize_passphrase_error)?;
        self.cache_master_key(key)
    }

    async fn vault(&self, create_if_missing: bool) -> Result<SecretVault, String> {
        let key = self.master_key(create_if_missing).await?;
        Ok(SecretVault::from_shared_key(self.repository.clone(), key))
    }

    async fn master_key(
        &self,
        create_if_missing: bool,
    ) -> Result<Arc<Zeroizing<[u8; MASTER_KEY_LEN]>>, String> {
        self.master_key
            .get_or_try_init(|| async move {
                if self.portable {
                    return Err("Unlock the portable profile before using saved details.".into());
                }
                if passphrase::is_configured(&self.repository)
                    .await
                    .map_err(sanitize_passphrase_error)?
                {
                    return Err(secure_storage_error());
                }

                let key = if let Some(fixed_key) = &self.fixed_master_key {
                    let mut bytes = [0_u8; MASTER_KEY_LEN];
                    bytes.copy_from_slice(fixed_key.as_ref());
                    bytes
                } else {
                    vault_key_store::load_vault_key(create_if_missing).await?
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
        self.repository
            .secret_exists(key.as_str())
            .await
            .map_err(|_| secure_storage_error())
    }
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
mod tests;
