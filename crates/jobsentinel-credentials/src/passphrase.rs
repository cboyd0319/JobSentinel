//! Passphrase wrapping for the credential-vault master key.
//!
//! The passphrase protects only the local credential vault key. Non-secret
//! metadata checks stay available without touching the OS keyring.

use argon2::{Algorithm, Argon2, Params, Version};
use chacha20poly1305::{
    aead::{Aead, Generate, KeyInit, Payload},
    XChaCha20Poly1305, XNonce,
};
use jobsentinel_storage::{CredentialKeyWrapRecord, CredentialRepository, CredentialStorageError};
use std::fmt;
use zeroize::Zeroizing;

use super::vault::MASTER_KEY_LEN;

pub(super) const MODE_SYSTEM: &str = "system";
pub(super) const MODE_PASSPHRASE: &str = "passphrase";

const KDF_ARGON2ID: &str = "argon2id";
const KDF_VERSION: i64 = 1;
const WRAP_ALGORITHM: &str = "xchacha20poly1305";
const WRAP_AAD: &[u8] = b"jobsentinel.credential-vault-key.wrap.v1";
const DEFAULT_MEMORY_KIB: u32 = 65_536;
const DEFAULT_ITERATIONS: u32 = 3;
const DEFAULT_PARALLELISM: u32 = 1;
const MIN_ARGON2ID_MEMORY_KIB: u32 = 19_456;
const MIN_ARGON2ID_ITERATIONS: u32 = 2;
const MIN_ARGON2ID_PARALLELISM: u32 = 1;
const SALT_LEN: usize = 16;
const NONCE_LEN: usize = 24;
const MIN_PASSPHRASE_CHARS: usize = 12;
const MAX_PASSPHRASE_BYTES: usize = 1024;

#[derive(Debug, Clone, PartialEq, Eq)]
pub(super) enum PassphraseError {
    AlreadyConfigured,
    InvalidPassphrase,
    NotConfigured,
    Policy,
    Storage,
    UnsupportedEnvelope,
}

impl fmt::Display for PassphraseError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::AlreadyConfigured => f.write_str("Credential passphrase lock is already enabled"),
            Self::InvalidPassphrase => {
                f.write_str("Passphrase could not unlock credential storage")
            }
            Self::NotConfigured => f.write_str("Credential passphrase lock is not enabled"),
            Self::Policy => f.write_str("Use a passphrase with at least 12 non-space characters"),
            Self::Storage | Self::UnsupportedEnvelope => {
                f.write_str("Credential passphrase storage is unavailable")
            }
        }
    }
}

impl std::error::Error for PassphraseError {}

impl From<CredentialStorageError> for PassphraseError {
    fn from(_: CredentialStorageError) -> Self {
        Self::Storage
    }
}

#[derive(Debug)]
struct WrappedVaultKey {
    memory_kib: u32,
    iterations: u32,
    parallelism: u32,
    salt: Vec<u8>,
    nonce: Vec<u8>,
    ciphertext: Vec<u8>,
}

#[derive(Debug, Clone, Copy)]
struct KdfParams {
    memory_kib: u32,
    iterations: u32,
    parallelism: u32,
}

impl Default for KdfParams {
    fn default() -> Self {
        Self {
            memory_kib: DEFAULT_MEMORY_KIB,
            iterations: DEFAULT_ITERATIONS,
            parallelism: DEFAULT_PARALLELISM,
        }
    }
}

pub(super) async fn is_configured(
    repository: &CredentialRepository,
) -> Result<bool, PassphraseError> {
    Ok(repository.key_wrap_exists().await?)
}

pub(super) async fn wrap_key(
    repository: &CredentialRepository,
    passphrase: &str,
    vault_key: [u8; MASTER_KEY_LEN],
) -> Result<(), PassphraseError> {
    if is_configured(repository).await? {
        return Err(PassphraseError::AlreadyConfigured);
    }

    let envelope = build_envelope(passphrase, vault_key, KdfParams::default()).await?;
    store_envelope(repository, envelope).await
}

pub(super) async fn unwrap_key(
    repository: &CredentialRepository,
    passphrase: &str,
) -> Result<Zeroizing<[u8; MASTER_KEY_LEN]>, PassphraseError> {
    let envelope = load_envelope(repository)
        .await?
        .ok_or(PassphraseError::NotConfigured)?;
    decrypt_envelope(passphrase, envelope).await
}

pub(super) async fn delete_config(
    repository: &CredentialRepository,
) -> Result<(), PassphraseError> {
    repository.delete_key_wrap().await?;
    Ok(())
}

async fn build_envelope(
    passphrase: &str,
    vault_key: [u8; MASTER_KEY_LEN],
    params: KdfParams,
) -> Result<WrappedVaultKey, PassphraseError> {
    validate_new_passphrase(passphrase)?;

    let passphrase = Zeroizing::new(passphrase.to_string());
    let vault_key = Zeroizing::new(vault_key);
    tokio::task::spawn_blocking(move || encrypt_vault_key(&passphrase, &vault_key, params))
        .await
        .map_err(|_| PassphraseError::Storage)?
}

async fn decrypt_envelope(
    passphrase: &str,
    envelope: WrappedVaultKey,
) -> Result<Zeroizing<[u8; MASTER_KEY_LEN]>, PassphraseError> {
    if passphrase.is_empty() || passphrase.len() > MAX_PASSPHRASE_BYTES {
        return Err(PassphraseError::InvalidPassphrase);
    }

    let passphrase = Zeroizing::new(passphrase.to_string());
    tokio::task::spawn_blocking(move || decrypt_vault_key(&passphrase, envelope))
        .await
        .map_err(|_| PassphraseError::Storage)?
}

fn validate_new_passphrase(passphrase: &str) -> Result<(), PassphraseError> {
    if passphrase.len() > MAX_PASSPHRASE_BYTES {
        return Err(PassphraseError::Policy);
    }

    if passphrase.trim().chars().count() < MIN_PASSPHRASE_CHARS {
        return Err(PassphraseError::Policy);
    }

    Ok(())
}

fn encrypt_vault_key(
    passphrase: &str,
    vault_key: &[u8; MASTER_KEY_LEN],
    params: KdfParams,
) -> Result<WrappedVaultKey, PassphraseError> {
    let salt = <[u8; SALT_LEN]>::generate();
    let nonce = XNonce::generate();

    let derived_key = derive_key(passphrase, &salt, params)?;
    let cipher = XChaCha20Poly1305::new_from_slice(derived_key.as_ref())
        .map_err(|_| PassphraseError::Storage)?;
    let ciphertext = cipher
        .encrypt(
            &nonce,
            Payload {
                msg: vault_key.as_slice(),
                aad: WRAP_AAD,
            },
        )
        .map_err(|_| PassphraseError::Storage)?;

    Ok(WrappedVaultKey {
        memory_kib: params.memory_kib,
        iterations: params.iterations,
        parallelism: params.parallelism,
        salt: salt.to_vec(),
        nonce: nonce.to_vec(),
        ciphertext,
    })
}

fn decrypt_vault_key(
    passphrase: &str,
    envelope: WrappedVaultKey,
) -> Result<Zeroizing<[u8; MASTER_KEY_LEN]>, PassphraseError> {
    envelope.validate()?;

    let params = KdfParams {
        memory_kib: envelope.memory_kib,
        iterations: envelope.iterations,
        parallelism: envelope.parallelism,
    };
    let derived_key = derive_key(passphrase, &envelope.salt, params)?;
    let cipher = XChaCha20Poly1305::new_from_slice(derived_key.as_ref())
        .map_err(|_| PassphraseError::UnsupportedEnvelope)?;
    let nonce = XNonce::try_from(envelope.nonce.as_slice())
        .map_err(|_| PassphraseError::UnsupportedEnvelope)?;
    let plaintext = Zeroizing::new(
        cipher
            .decrypt(
                &nonce,
                Payload {
                    msg: envelope.ciphertext.as_slice(),
                    aad: WRAP_AAD,
                },
            )
            .map_err(|_| PassphraseError::InvalidPassphrase)?,
    );

    if plaintext.len() != MASTER_KEY_LEN {
        return Err(PassphraseError::UnsupportedEnvelope);
    }

    let mut key = Zeroizing::new([0_u8; MASTER_KEY_LEN]);
    key.copy_from_slice(plaintext.as_slice());
    Ok(key)
}

fn derive_key(
    passphrase: &str,
    salt: &[u8],
    params: KdfParams,
) -> Result<Zeroizing<[u8; MASTER_KEY_LEN]>, PassphraseError> {
    if salt.len() != SALT_LEN
        || params.memory_kib == 0
        || params.iterations == 0
        || params.parallelism == 0
    {
        return Err(PassphraseError::UnsupportedEnvelope);
    }

    let params = Params::new(
        params.memory_kib,
        params.iterations,
        params.parallelism,
        Some(MASTER_KEY_LEN),
    )
    .map_err(|_| PassphraseError::UnsupportedEnvelope)?;
    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
    let mut output = Zeroizing::new([0_u8; MASTER_KEY_LEN]);
    argon2
        .hash_password_into(passphrase.as_bytes(), salt, &mut output[..])
        .map_err(|_| PassphraseError::UnsupportedEnvelope)?;

    Ok(output)
}

async fn store_envelope(
    repository: &CredentialRepository,
    envelope: WrappedVaultKey,
) -> Result<(), PassphraseError> {
    repository
        .store_key_wrap(CredentialKeyWrapRecord {
            mode: MODE_PASSPHRASE.to_string(),
            kdf: KDF_ARGON2ID.to_string(),
            kdf_version: KDF_VERSION,
            memory_kib: i64::from(envelope.memory_kib),
            iterations: i64::from(envelope.iterations),
            parallelism: i64::from(envelope.parallelism),
            salt: envelope.salt,
            algorithm: WRAP_ALGORITHM.to_string(),
            nonce: envelope.nonce,
            ciphertext: envelope.ciphertext,
        })
        .await?;

    Ok(())
}

async fn load_envelope(
    repository: &CredentialRepository,
) -> Result<Option<WrappedVaultKey>, PassphraseError> {
    let Some(row) = repository.load_key_wrap().await? else {
        return Ok(None);
    };

    if row.mode != MODE_PASSPHRASE
        || row.kdf != KDF_ARGON2ID
        || row.kdf_version != KDF_VERSION
        || row.algorithm != WRAP_ALGORITHM
    {
        return Err(PassphraseError::UnsupportedEnvelope);
    }

    Ok(Some(WrappedVaultKey {
        memory_kib: read_u32(row.memory_kib)?,
        iterations: read_u32(row.iterations)?,
        parallelism: read_u32(row.parallelism)?,
        salt: row.salt,
        nonce: row.nonce,
        ciphertext: row.ciphertext,
    }))
}

fn read_u32(value: i64) -> Result<u32, PassphraseError> {
    u32::try_from(value).map_err(|_| PassphraseError::UnsupportedEnvelope)
}

impl WrappedVaultKey {
    fn validate(&self) -> Result<(), PassphraseError> {
        if self.salt.len() != SALT_LEN || self.nonce.len() != NONCE_LEN {
            return Err(PassphraseError::UnsupportedEnvelope);
        }
        if self.memory_kib < MIN_ARGON2ID_MEMORY_KIB
            || self.iterations < MIN_ARGON2ID_ITERATIONS
            || self.parallelism < MIN_ARGON2ID_PARALLELISM
        {
            return Err(PassphraseError::UnsupportedEnvelope);
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use jobsentinel_storage::Database;

    const TEST_PARAMS: KdfParams = KdfParams {
        memory_kib: MIN_ARGON2ID_MEMORY_KIB,
        iterations: MIN_ARGON2ID_ITERATIONS,
        parallelism: MIN_ARGON2ID_PARALLELISM,
    };

    async fn test_repository() -> CredentialRepository {
        let database = Database::connect_memory().await.unwrap();
        database.migrate().await.unwrap();
        database.credentials()
    }

    #[tokio::test]
    async fn passphrase_wraps_and_unwraps_vault_key() {
        let repository = test_repository().await;
        let key = [42_u8; MASTER_KEY_LEN];
        let envelope = build_envelope("correct battery staple", key, TEST_PARAMS)
            .await
            .unwrap();
        store_envelope(&repository, envelope).await.unwrap();

        assert!(is_configured(&repository).await.unwrap());
        assert_eq!(
            unwrap_key(&repository, "correct battery staple")
                .await
                .unwrap()
                .as_ref(),
            &key
        );
    }

    #[tokio::test]
    async fn wrong_passphrase_is_sanitized() {
        let repository = test_repository().await;
        let key = [51_u8; MASTER_KEY_LEN];
        let envelope = build_envelope("correct battery staple", key, TEST_PARAMS)
            .await
            .unwrap();
        store_envelope(&repository, envelope).await.unwrap();

        let err = unwrap_key(&repository, "wrong secret phrase")
            .await
            .unwrap_err();

        assert_eq!(err, PassphraseError::InvalidPassphrase);
        assert!(!err.to_string().contains("wrong secret phrase"));
    }

    #[tokio::test]
    async fn wrapped_row_does_not_store_plain_vault_key() {
        let repository = test_repository().await;
        let key = [65_u8; MASTER_KEY_LEN];
        let envelope = build_envelope("correct battery staple", key, TEST_PARAMS)
            .await
            .unwrap();
        store_envelope(&repository, envelope).await.unwrap();

        let stored = repository.load_key_wrap().await.unwrap().unwrap();
        let stored_hex = hex::encode_upper(stored.ciphertext);

        assert!(!stored_hex.contains(&hex::encode_upper(key)));
    }

    #[tokio::test]
    async fn new_passphrase_policy_rejects_short_values_without_echo() {
        let err = build_envelope("too short", [7_u8; MASTER_KEY_LEN], TEST_PARAMS)
            .await
            .unwrap_err();

        assert_eq!(err, PassphraseError::Policy);
        assert!(!err.to_string().contains("too short"));
    }

    #[test]
    fn wrapped_key_rejects_weak_kdf_metadata() {
        let envelope = WrappedVaultKey {
            memory_kib: 1024,
            iterations: 1,
            parallelism: 1,
            salt: vec![1_u8; SALT_LEN],
            nonce: vec![2_u8; NONCE_LEN],
            ciphertext: vec![3_u8; MASTER_KEY_LEN],
        };

        assert_eq!(
            envelope.validate().unwrap_err(),
            PassphraseError::UnsupportedEnvelope
        );
    }
}
