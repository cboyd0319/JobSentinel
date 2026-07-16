use sqlx::{Row, SqlitePool};

/// Opaque storage failure for credential metadata and encrypted envelopes.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct CredentialStorageError;

impl std::fmt::Display for CredentialStorageError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str("credential storage is unavailable")
    }
}

impl std::error::Error for CredentialStorageError {}

impl From<sqlx::Error> for CredentialStorageError {
    fn from(_: sqlx::Error) -> Self {
        Self
    }
}

/// Encrypted credential row. This type never contains plaintext secret values.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CredentialSecretRecord {
    pub algorithm: String,
    pub key_version: i64,
    pub nonce: Vec<u8>,
    pub ciphertext: Vec<u8>,
}

/// Wrapped credential-vault key metadata and ciphertext.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CredentialKeyWrapRecord {
    pub mode: String,
    pub kdf: String,
    pub kdf_version: i64,
    pub memory_kib: i64,
    pub iterations: i64,
    pub parallelism: i64,
    pub salt: Vec<u8>,
    pub algorithm: String,
    pub nonce: Vec<u8>,
    pub ciphertext: Vec<u8>,
}

/// SQLx-backed persistence for encrypted credentials and key-wrapping metadata.
#[derive(Debug, Clone)]
pub struct CredentialRepository {
    pool: SqlitePool,
}

impl CredentialRepository {
    pub(crate) const fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    pub async fn store_secret(
        &self,
        key: &str,
        record: CredentialSecretRecord,
    ) -> Result<(), CredentialStorageError> {
        sqlx::query(
            r#"
            INSERT INTO secret_vault (
                key, algorithm, key_version, nonce, ciphertext, created_at, updated_at
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
        .bind(key)
        .bind(record.algorithm)
        .bind(record.key_version)
        .bind(record.nonce)
        .bind(record.ciphertext)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn load_secret(
        &self,
        key: &str,
    ) -> Result<Option<CredentialSecretRecord>, CredentialStorageError> {
        let row = sqlx::query(
            "SELECT algorithm, key_version, nonce, ciphertext FROM secret_vault WHERE key = ?",
        )
        .bind(key)
        .fetch_optional(&self.pool)
        .await?;

        row.map(|row| {
            Ok(CredentialSecretRecord {
                algorithm: row.try_get("algorithm")?,
                key_version: row.try_get("key_version")?,
                nonce: row.try_get("nonce")?,
                ciphertext: row.try_get("ciphertext")?,
            })
        })
        .transpose()
    }

    pub async fn delete_secret(&self, key: &str) -> Result<(), CredentialStorageError> {
        sqlx::query("DELETE FROM secret_vault WHERE key = ?")
            .bind(key)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn secret_exists(&self, key: &str) -> Result<bool, CredentialStorageError> {
        let exists: i64 =
            sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM secret_vault WHERE key = ?)")
                .bind(key)
                .fetch_one(&self.pool)
                .await?;
        Ok(exists == 1)
    }

    pub async fn store_key_wrap(
        &self,
        record: CredentialKeyWrapRecord,
    ) -> Result<(), CredentialStorageError> {
        sqlx::query(
            r#"
            INSERT INTO credential_key_wrapping (
                id, mode, kdf, kdf_version, memory_kib, iterations, parallelism,
                salt, algorithm, nonce, ciphertext, created_at, updated_at
            )
            VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            "#,
        )
        .bind(record.mode)
        .bind(record.kdf)
        .bind(record.kdf_version)
        .bind(record.memory_kib)
        .bind(record.iterations)
        .bind(record.parallelism)
        .bind(record.salt)
        .bind(record.algorithm)
        .bind(record.nonce)
        .bind(record.ciphertext)
        .execute(&self.pool)
        .await?;
        Ok(())
    }

    pub async fn load_key_wrap(
        &self,
    ) -> Result<Option<CredentialKeyWrapRecord>, CredentialStorageError> {
        let row = sqlx::query(
            r#"
            SELECT mode, kdf, kdf_version, memory_kib, iterations, parallelism,
                   salt, algorithm, nonce, ciphertext
            FROM credential_key_wrapping
            WHERE id = 1
            "#,
        )
        .fetch_optional(&self.pool)
        .await?;

        row.map(|row| {
            Ok(CredentialKeyWrapRecord {
                mode: row.try_get("mode")?,
                kdf: row.try_get("kdf")?,
                kdf_version: row.try_get("kdf_version")?,
                memory_kib: row.try_get("memory_kib")?,
                iterations: row.try_get("iterations")?,
                parallelism: row.try_get("parallelism")?,
                salt: row.try_get("salt")?,
                algorithm: row.try_get("algorithm")?,
                nonce: row.try_get("nonce")?,
                ciphertext: row.try_get("ciphertext")?,
            })
        })
        .transpose()
    }

    pub async fn key_wrap_exists(&self) -> Result<bool, CredentialStorageError> {
        let exists: i64 =
            sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM credential_key_wrapping WHERE id = 1)")
                .fetch_one(&self.pool)
                .await?;
        Ok(exists == 1)
    }

    pub async fn delete_key_wrap(&self) -> Result<(), CredentialStorageError> {
        sqlx::query("DELETE FROM credential_key_wrapping WHERE id = 1")
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}
