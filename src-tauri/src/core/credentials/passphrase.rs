//! Passphrase wrapping for the credential-vault master key.
//!
//! The passphrase protects only the local credential vault key. Non-secret
//! metadata checks stay available without touching the OS keyring.

use argon2::{Algorithm, Argon2, Params, Version};
use chacha20poly1305::{
    aead::{rand_core::RngCore, Aead, KeyInit, OsRng, Payload},
    Key, XChaCha20Poly1305, XNonce,
};
use sqlx::{sqlite::SqlitePool, Row};
use std::fmt;
use zeroize::Zeroizing;

use super::vault::MASTER_KEY_LEN;

pub(super) const MODE_SYSTEM: &str = "system";
pub(super) const MODE_PASSPHRASE: &str = "passphrase";

const ROW_ID: i64 = 1;
const KDF_ARGON2ID: &str = "argon2id";
const KDF_VERSION: i64 = 1;
const WRAP_ALGORITHM: &str = "xchacha20poly1305";
const WRAP_AAD: &[u8] = b"jobsentinel.credential-vault-key.wrap.v1";
const DEFAULT_MEMORY_KIB: u32 = 65_536;
const DEFAULT_ITERATIONS: u32 = 3;
const DEFAULT_PARALLELISM: u32 = 1;
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

impl From<sqlx::Error> for PassphraseError {
    fn from(_: sqlx::Error) -> Self {
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

pub(super) async fn is_configured(pool: &SqlitePool) -> Result<bool, PassphraseError> {
    let exists: i64 =
        sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM credential_key_wrapping WHERE id = ?)")
            .bind(ROW_ID)
            .fetch_one(pool)
            .await?;

    Ok(exists == 1)
}

pub(super) async fn wrap_key(
    pool: &SqlitePool,
    passphrase: &str,
    vault_key: [u8; MASTER_KEY_LEN],
) -> Result<(), PassphraseError> {
    if is_configured(pool).await? {
        return Err(PassphraseError::AlreadyConfigured);
    }

    let envelope = build_envelope(passphrase, vault_key, KdfParams::default()).await?;
    store_envelope(pool, envelope).await
}

pub(super) async fn unwrap_key(
    pool: &SqlitePool,
    passphrase: &str,
) -> Result<Zeroizing<[u8; MASTER_KEY_LEN]>, PassphraseError> {
    let envelope = load_envelope(pool)
        .await?
        .ok_or(PassphraseError::NotConfigured)?;
    decrypt_envelope(passphrase, envelope).await
}

pub(super) async fn delete_config(pool: &SqlitePool) -> Result<(), PassphraseError> {
    sqlx::query("DELETE FROM credential_key_wrapping WHERE id = ?")
        .bind(ROW_ID)
        .execute(pool)
        .await?;
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
    let mut salt = vec![0_u8; SALT_LEN];
    OsRng.fill_bytes(&mut salt);
    let mut nonce = vec![0_u8; NONCE_LEN];
    OsRng.fill_bytes(&mut nonce);

    let derived_key = derive_key(passphrase, &salt, params)?;
    let cipher = XChaCha20Poly1305::new(Key::from_slice(derived_key.as_ref()));
    let ciphertext = cipher
        .encrypt(
            XNonce::from_slice(&nonce),
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
        salt,
        nonce,
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
    let cipher = XChaCha20Poly1305::new(Key::from_slice(derived_key.as_ref()));
    let plaintext = Zeroizing::new(
        cipher
            .decrypt(
                XNonce::from_slice(&envelope.nonce),
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
    pool: &SqlitePool,
    envelope: WrappedVaultKey,
) -> Result<(), PassphraseError> {
    sqlx::query(
        r#"
        INSERT INTO credential_key_wrapping (
            id,
            mode,
            kdf,
            kdf_version,
            memory_kib,
            iterations,
            parallelism,
            salt,
            algorithm,
            nonce,
            ciphertext,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        "#,
    )
    .bind(ROW_ID)
    .bind(MODE_PASSPHRASE)
    .bind(KDF_ARGON2ID)
    .bind(KDF_VERSION)
    .bind(i64::from(envelope.memory_kib))
    .bind(i64::from(envelope.iterations))
    .bind(i64::from(envelope.parallelism))
    .bind(envelope.salt)
    .bind(WRAP_ALGORITHM)
    .bind(envelope.nonce)
    .bind(envelope.ciphertext)
    .execute(pool)
    .await?;

    Ok(())
}

async fn load_envelope(pool: &SqlitePool) -> Result<Option<WrappedVaultKey>, PassphraseError> {
    let Some(row) = sqlx::query(
        r#"
        SELECT
            mode,
            kdf,
            kdf_version,
            memory_kib,
            iterations,
            parallelism,
            salt,
            algorithm,
            nonce,
            ciphertext
        FROM credential_key_wrapping
        WHERE id = ?
        "#,
    )
    .bind(ROW_ID)
    .fetch_optional(pool)
    .await?
    else {
        return Ok(None);
    };

    let mode: String = row.try_get("mode")?;
    let kdf: String = row.try_get("kdf")?;
    let kdf_version: i64 = row.try_get("kdf_version")?;
    let algorithm: String = row.try_get("algorithm")?;
    if mode != MODE_PASSPHRASE
        || kdf != KDF_ARGON2ID
        || kdf_version != KDF_VERSION
        || algorithm != WRAP_ALGORITHM
    {
        return Err(PassphraseError::UnsupportedEnvelope);
    }

    Ok(Some(WrappedVaultKey {
        memory_kib: read_u32(&row, "memory_kib")?,
        iterations: read_u32(&row, "iterations")?,
        parallelism: read_u32(&row, "parallelism")?,
        salt: row.try_get("salt")?,
        nonce: row.try_get("nonce")?,
        ciphertext: row.try_get("ciphertext")?,
    }))
}

fn read_u32(row: &sqlx::sqlite::SqliteRow, column: &str) -> Result<u32, PassphraseError> {
    let value: i64 = row.try_get(column)?;
    u32::try_from(value).map_err(|_| PassphraseError::UnsupportedEnvelope)
}

impl WrappedVaultKey {
    fn validate(&self) -> Result<(), PassphraseError> {
        if self.salt.len() != SALT_LEN || self.nonce.len() != NONCE_LEN {
            return Err(PassphraseError::UnsupportedEnvelope);
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::db::Database;

    const TEST_PARAMS: KdfParams = KdfParams {
        memory_kib: 1024,
        iterations: 1,
        parallelism: 1,
    };

    async fn test_pool() -> SqlitePool {
        let database = Database::connect_memory().await.unwrap();
        database.migrate().await.unwrap();
        database.pool().clone()
    }

    #[tokio::test]
    async fn passphrase_wraps_and_unwraps_vault_key() {
        let pool = test_pool().await;
        let key = [42_u8; MASTER_KEY_LEN];
        let envelope = build_envelope("correct battery staple", key, TEST_PARAMS)
            .await
            .unwrap();
        store_envelope(&pool, envelope).await.unwrap();

        assert!(is_configured(&pool).await.unwrap());
        assert_eq!(
            unwrap_key(&pool, "correct battery staple")
                .await
                .unwrap()
                .as_ref(),
            &key
        );
    }

    #[tokio::test]
    async fn wrong_passphrase_is_sanitized() {
        let pool = test_pool().await;
        let key = [51_u8; MASTER_KEY_LEN];
        let envelope = build_envelope("correct battery staple", key, TEST_PARAMS)
            .await
            .unwrap();
        store_envelope(&pool, envelope).await.unwrap();

        let err = unwrap_key(&pool, "wrong secret phrase").await.unwrap_err();

        assert_eq!(err, PassphraseError::InvalidPassphrase);
        assert!(!err.to_string().contains("wrong secret phrase"));
    }

    #[tokio::test]
    async fn wrapped_row_does_not_store_plain_vault_key() {
        let pool = test_pool().await;
        let key = [65_u8; MASTER_KEY_LEN];
        let envelope = build_envelope("correct battery staple", key, TEST_PARAMS)
            .await
            .unwrap();
        store_envelope(&pool, envelope).await.unwrap();

        let stored_hex: String =
            sqlx::query_scalar("SELECT hex(ciphertext) FROM credential_key_wrapping WHERE id = 1")
                .fetch_one(&pool)
                .await
                .unwrap();

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
}
