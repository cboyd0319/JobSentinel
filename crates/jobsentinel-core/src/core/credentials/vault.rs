//! Per-row AEAD vault for local credential values.
//!
//! The vault keeps plaintext secrets out of SQLite. Rows contain only an
//! XChaCha20-Poly1305 nonce, ciphertext, key version, and algorithm metadata.

use chacha20poly1305::{
    aead::{Aead, Generate, KeyInit, Payload},
    XChaCha20Poly1305, XNonce,
};
use sqlx::{sqlite::SqlitePool, Row};
use std::{fmt, sync::Arc};
use zeroize::Zeroizing;

use super::{
    is_disabled_credential, reject_disabled_credential_storage, validate_credential_value,
    CredentialKey,
};

const ALGORITHM: &str = "xchacha20poly1305";
const KEY_VERSION: i64 = 1;
pub(super) const MASTER_KEY_LEN: usize = 32;
const NONCE_LEN: usize = 24;

/// Sanitized errors from local secret-vault operations.
#[derive(Debug, Clone, PartialEq, Eq)]
pub(super) enum SecretVaultError {
    Credential(String),
    Crypto,
    InvalidData,
    Storage,
    UnsupportedEnvelope,
}

impl fmt::Display for SecretVaultError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Credential(message) => f.write_str(message),
            Self::Crypto => f.write_str("Stored credential could not be decrypted"),
            Self::InvalidData => f.write_str("Stored credential data is invalid"),
            Self::Storage => f.write_str("Secret vault storage is unavailable"),
            Self::UnsupportedEnvelope => {
                f.write_str("Stored credential uses unsupported encryption metadata")
            }
        }
    }
}

impl std::error::Error for SecretVaultError {}

impl From<sqlx::Error> for SecretVaultError {
    fn from(_: sqlx::Error) -> Self {
        Self::Storage
    }
}

impl From<chacha20poly1305::Error> for SecretVaultError {
    fn from(_: chacha20poly1305::Error) -> Self {
        Self::Crypto
    }
}

impl From<std::string::FromUtf8Error> for SecretVaultError {
    fn from(_: std::string::FromUtf8Error) -> Self {
        Self::InvalidData
    }
}

/// SQLite-backed encrypted credential vault.
pub(super) struct SecretVault {
    pool: SqlitePool,
    master_key: Arc<Zeroizing<[u8; MASTER_KEY_LEN]>>,
}

impl SecretVault {
    /// Generate a random 256-bit vault master key.
    #[must_use]
    pub(super) fn generate_master_key() -> [u8; MASTER_KEY_LEN] {
        <[u8; MASTER_KEY_LEN]>::generate()
    }

    #[cfg(test)]
    fn new(pool: SqlitePool, master_key: [u8; MASTER_KEY_LEN]) -> Self {
        Self::from_shared_key(pool, Arc::new(Zeroizing::new(master_key)))
    }

    /// Create a vault backed by a session-cached master key.
    #[must_use]
    pub(super) fn from_shared_key(
        pool: SqlitePool,
        master_key: Arc<Zeroizing<[u8; MASTER_KEY_LEN]>>,
    ) -> Self {
        Self { pool, master_key }
    }

    /// Store or replace an encrypted credential. Empty values delete the row.
    pub(super) async fn store(
        &self,
        key: CredentialKey,
        value: &str,
    ) -> Result<(), SecretVaultError> {
        if value.is_empty() {
            return self.delete(key).await;
        }

        reject_disabled_credential_storage(key).map_err(SecretVaultError::Credential)?;
        validate_credential_value(key, value).map_err(SecretVaultError::Credential)?;

        let cipher = self.cipher()?;
        let nonce = XNonce::generate();
        let aad = aad_for_key(key);
        let ciphertext = cipher.encrypt(
            &nonce,
            Payload {
                msg: value.as_bytes(),
                aad: aad.as_bytes(),
            },
        )?;

        sqlx::query(
            r#"
            INSERT INTO secret_vault (
                key,
                algorithm,
                key_version,
                nonce,
                ciphertext,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            ON CONFLICT(key) DO UPDATE SET
                algorithm = excluded.algorithm,
                key_version = excluded.key_version,
                nonce = excluded.nonce,
                ciphertext = excluded.ciphertext,
                updated_at = datetime('now')
            "#,
        )
        .bind(key.as_str())
        .bind(ALGORITHM)
        .bind(KEY_VERSION)
        .bind(nonce.as_slice())
        .bind(ciphertext)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Retrieve and decrypt a credential.
    pub(super) async fn retrieve(
        &self,
        key: CredentialKey,
    ) -> Result<Option<String>, SecretVaultError> {
        if is_disabled_credential(key) {
            return Ok(None);
        }

        let Some(row) = sqlx::query(
            r#"
            SELECT algorithm, key_version, nonce, ciphertext
            FROM secret_vault
            WHERE key = ?
            "#,
        )
        .bind(key.as_str())
        .fetch_optional(&self.pool)
        .await?
        else {
            return Ok(None);
        };

        let algorithm: String = row.try_get("algorithm")?;
        let key_version: i64 = row.try_get("key_version")?;
        if algorithm != ALGORITHM || key_version != KEY_VERSION {
            return Err(SecretVaultError::UnsupportedEnvelope);
        }

        let nonce: Vec<u8> = row.try_get("nonce")?;
        if nonce.len() != NONCE_LEN {
            return Err(SecretVaultError::InvalidData);
        }

        let ciphertext: Vec<u8> = row.try_get("ciphertext")?;
        let aad = aad_for_key(key);
        let nonce =
            XNonce::try_from(nonce.as_slice()).map_err(|_| SecretVaultError::InvalidData)?;
        let plaintext = self.cipher()?.decrypt(
            &nonce,
            Payload {
                msg: &ciphertext,
                aad: aad.as_bytes(),
            },
        )?;

        Ok(Some(String::from_utf8(plaintext)?))
    }

    /// Delete a credential row. Missing rows are treated as success.
    pub(super) async fn delete(&self, key: CredentialKey) -> Result<(), SecretVaultError> {
        sqlx::query("DELETE FROM secret_vault WHERE key = ?")
            .bind(key.as_str())
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    fn cipher(&self) -> Result<XChaCha20Poly1305, SecretVaultError> {
        XChaCha20Poly1305::new_from_slice(self.master_key.as_ref().as_ref())
            .map_err(|_| SecretVaultError::Crypto)
    }
}

fn aad_for_key(key: CredentialKey) -> String {
    format!("jobsentinel.secret-vault.v1:{}", key.as_str())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::db::Database;

    async fn test_vault() -> SecretVault {
        let database = Database::connect_memory().await.unwrap();
        database.migrate().await.unwrap();
        SecretVault::new(database.pool().clone(), [7_u8; MASTER_KEY_LEN])
    }

    #[tokio::test]
    async fn vault_roundtrips_secret_without_plaintext_row() {
        let vault = test_vault().await;

        vault
            .store(CredentialKey::SmtpPassword, "mail-password")
            .await
            .unwrap();

        assert_eq!(
            vault.retrieve(CredentialKey::SmtpPassword).await.unwrap(),
            Some("mail-password".to_string())
        );

        let stored_text: String =
            sqlx::query_scalar("SELECT hex(ciphertext) FROM secret_vault WHERE key = ?")
                .bind(CredentialKey::SmtpPassword.as_str())
                .fetch_one(&vault.pool)
                .await
                .unwrap();
        assert!(!stored_text.contains(&hex::encode_upper("mail-password")));
    }

    #[tokio::test]
    async fn vault_deletes_empty_values() {
        let vault = test_vault().await;

        vault
            .store(
                CredentialKey::TelegramBotToken,
                "123456789:ABCdefGHIjklMNOpqrsTUVwxyz",
            )
            .await
            .unwrap();
        vault
            .store(CredentialKey::TelegramBotToken, "")
            .await
            .unwrap();

        assert_eq!(
            vault
                .retrieve(CredentialKey::TelegramBotToken)
                .await
                .unwrap(),
            None
        );
    }

    #[tokio::test]
    async fn vault_binds_ciphertext_to_credential_key() {
        let vault = test_vault().await;

        vault
            .store(CredentialKey::SmtpPassword, "mail-password")
            .await
            .unwrap();
        vault
            .store(
                CredentialKey::SlackWebhook,
                "https://hooks.slack.com/services/T/B/C",
            )
            .await
            .unwrap();

        let smtp_ciphertext: Vec<u8> =
            sqlx::query_scalar("SELECT ciphertext FROM secret_vault WHERE key = ?")
                .bind(CredentialKey::SmtpPassword.as_str())
                .fetch_one(&vault.pool)
                .await
                .unwrap();

        sqlx::query("UPDATE secret_vault SET ciphertext = ? WHERE key = ?")
            .bind(smtp_ciphertext)
            .bind(CredentialKey::SlackWebhook.as_str())
            .execute(&vault.pool)
            .await
            .unwrap();

        let err = vault
            .retrieve(CredentialKey::SlackWebhook)
            .await
            .unwrap_err();
        assert_eq!(err, SecretVaultError::Crypto);
    }

    #[tokio::test]
    async fn vault_rejects_disabled_linkedin_credentials_before_storage() {
        let vault = test_vault().await;
        let secret = "legacy-session-secret";

        let err = vault
            .store(CredentialKey::LinkedInCookie, secret)
            .await
            .unwrap_err();

        assert!(matches!(err, SecretVaultError::Credential(_)));
        assert!(
            !err.to_string().contains(secret),
            "disabled credential error must not echo secret"
        );
        assert!(vault
            .retrieve(CredentialKey::LinkedInCookie)
            .await
            .unwrap()
            .is_none());
    }

    #[tokio::test]
    async fn vault_error_display_does_not_echo_provider_details() {
        let storage_error = SecretVaultError::from(sqlx::Error::RowNotFound);

        assert_eq!(
            storage_error.to_string(),
            "Secret vault storage is unavailable"
        );
        assert!(!storage_error.to_string().contains("RowNotFound"));
    }
}
