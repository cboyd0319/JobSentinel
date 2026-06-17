//! SQLCipher-backed SQLite encryption.

#[cfg(not(test))]
use keyring::{Entry, Error as KeyringError};
use sqlx::{
    sqlite::{SqliteConnectOptions, SqlitePool, SqlitePoolOptions},
    ConnectOptions,
};
use std::{path::Path, str::FromStr};
use zeroize::Zeroizing;

#[cfg(not(test))]
const DATABASE_KEY_NAME: &str = "jobsentinel_database_key";
const DATABASE_KEY_LEN: usize = 32;
#[cfg(not(test))]
const DATABASE_KEY_HEX_LEN: usize = DATABASE_KEY_LEN * 2;
const DATABASE_ENCRYPTION_ERROR: &str =
    "JobSentinel could not unlock local database encryption. Check system permission prompts, then try again.";

pub(super) async fn load_or_create_database_key() -> Result<Zeroizing<String>, sqlx::Error> {
    #[cfg(test)]
    {
        return Ok(Zeroizing::new(hex::encode([0xDB; DATABASE_KEY_LEN])));
    }

    #[cfg(not(test))]
    {
        tokio::task::spawn_blocking(load_or_create_database_key_blocking)
            .await
            .map_err(|_| database_encryption_error())?
    }
}

#[cfg(not(test))]
fn load_or_create_database_key_blocking() -> Result<Zeroizing<String>, sqlx::Error> {
    let entry = Entry::new(crate::core::credentials::SERVICE_NAME, DATABASE_KEY_NAME)
        .map_err(|_| database_encryption_error())?;

    match entry.get_password() {
        Ok(encoded_key) => validate_database_key_hex(encoded_key),
        Err(KeyringError::NoEntry) => {
            let key = crate::core::credentials::SecretVault::generate_master_key();
            let encoded_key = Zeroizing::new(hex::encode(key));
            entry
                .set_password(encoded_key.as_str())
                .map_err(|_| database_encryption_error())?;
            Ok(encoded_key)
        }
        Err(_) => Err(database_encryption_error()),
    }
}

#[cfg(not(test))]
fn validate_database_key_hex(encoded_key: String) -> Result<Zeroizing<String>, sqlx::Error> {
    let trimmed = encoded_key.trim();
    if trimmed.len() != DATABASE_KEY_HEX_LEN || hex::decode(trimmed).is_err() {
        return Err(database_encryption_error());
    }

    Ok(Zeroizing::new(trimmed.to_string()))
}

pub(super) async fn connect_encrypted_pool(
    path: &Path,
    key: &str,
    create_if_missing: bool,
) -> Result<SqlitePool, sqlx::Error> {
    let url = format!("sqlite://{}?mode=rwc", path.display());
    let options = SqliteConnectOptions::from_str(&url)?
        .pragma("key", key.to_string())
        .create_if_missing(create_if_missing);
    let pool = SqlitePoolOptions::new().connect_with(options).await?;
    verify_sqlcipher_connection(&pool).await?;
    Ok(pool)
}

pub(super) async fn encrypt_plaintext_database(
    db_path: &Path,
    key: &str,
    backup_dir: &Path,
) -> Result<(), sqlx::Error> {
    let temp_encrypted_path = db_path.with_extension("db.sqlcipher-new");
    let backup_path = backup_dir.join(format!(
        "plaintext_before_encryption_{}.db",
        chrono::Utc::now().format("%Y%m%d_%H%M%S_%3f")
    ));

    if temp_encrypted_path.exists() {
        std::fs::remove_file(&temp_encrypted_path).map_err(sqlx::Error::Io)?;
    }

    crate::platforms::ensure_private_dir(backup_dir).map_err(sqlx::Error::Io)?;
    std::fs::copy(db_path, &backup_path).map_err(sqlx::Error::Io)?;
    crate::platforms::ensure_private_file(&backup_path).map_err(sqlx::Error::Io)?;

    let temp_pool = connect_encrypted_pool(&temp_encrypted_path, key, true).await?;
    temp_pool.close().await;

    if let Err(error) =
        export_plaintext_database_to_encrypted(db_path, &temp_encrypted_path, key).await
    {
        let _ = std::fs::remove_file(&temp_encrypted_path);
        let _ = std::fs::remove_file(&backup_path);
        return Err(error);
    }

    let verified_temp_pool = connect_encrypted_pool(&temp_encrypted_path, key, false).await?;
    verified_temp_pool.close().await;

    remove_sqlite_sidecars(db_path);
    if let Err(error) = replace_database_file(db_path, &temp_encrypted_path, &backup_path) {
        return Err(sqlx::Error::Io(error));
    }

    let _ = std::fs::remove_file(&backup_path);
    crate::platforms::ensure_private_sqlite_files(db_path).map_err(sqlx::Error::Io)?;
    Ok(())
}

async fn verify_sqlcipher_connection(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    let cipher_version: Option<String> = sqlx::query_scalar("PRAGMA cipher_version")
        .fetch_optional(pool)
        .await?;
    if cipher_version
        .as_deref()
        .is_none_or(|version| version.trim().is_empty())
    {
        return Err(database_encryption_error());
    }

    sqlx::query("SELECT COUNT(*) FROM sqlite_master")
        .fetch_one(pool)
        .await?;
    Ok(())
}

pub(super) async fn plaintext_database_readable(path: &Path) -> Result<bool, sqlx::Error> {
    let url = format!("sqlite://{}?mode=ro", path.display());
    let pool = SqlitePool::connect(&url).await?;
    let readable = sqlx::query("SELECT COUNT(*) FROM sqlite_master")
        .fetch_one(&pool)
        .await
        .is_ok();
    pool.close().await;
    Ok(readable)
}

async fn export_plaintext_database_to_encrypted(
    plaintext_path: &Path,
    encrypted_path: &Path,
    key: &str,
) -> Result<(), sqlx::Error> {
    let url = format!("sqlite://{}?mode=rw", plaintext_path.display());
    let mut conn = SqliteConnectOptions::from_str(&url)?.connect().await?;

    let _ = sqlx::query("PRAGMA wal_checkpoint(TRUNCATE)")
        .execute(&mut conn)
        .await;

    let encrypted_path = encrypted_path
        .to_str()
        .ok_or_else(database_encryption_error)?;
    sqlx::query("ATTACH DATABASE ? AS encrypted KEY ?")
        .bind(encrypted_path)
        .bind(key)
        .execute(&mut conn)
        .await?;
    sqlx::query("SELECT sqlcipher_export('encrypted')")
        .execute(&mut conn)
        .await?;
    sqlx::query("DETACH DATABASE encrypted")
        .execute(&mut conn)
        .await?;

    Ok(())
}

fn remove_sqlite_sidecars(db_path: &Path) {
    for suffix in ["-wal", "-shm"] {
        let mut sidecar_name = db_path.file_name().unwrap_or_default().to_os_string();
        sidecar_name.push(suffix);
        let _ = std::fs::remove_file(db_path.with_file_name(sidecar_name));
    }
}

fn replace_database_file(
    db_path: &Path,
    encrypted_path: &Path,
    backup_path: &Path,
) -> std::io::Result<()> {
    std::fs::remove_file(db_path)?;
    if let Err(error) = std::fs::rename(encrypted_path, db_path) {
        let _ = std::fs::copy(backup_path, db_path);
        return Err(error);
    }
    Ok(())
}

fn database_encryption_error() -> sqlx::Error {
    sqlx::Error::Io(std::io::Error::new(
        std::io::ErrorKind::PermissionDenied,
        DATABASE_ENCRYPTION_ERROR,
    ))
}

#[cfg(test)]
mod tests {
    use super::super::connection::Database;
    use sqlx::sqlite::SqlitePool;

    #[tokio::test]
    async fn file_database_is_not_readable_without_encryption_key() {
        let temp_dir = tempfile::tempdir().unwrap();
        let db_path = temp_dir.path().join("jobs.db");

        {
            let database = Database::connect(&db_path).await.unwrap();
            database.migrate().await.unwrap();
            sqlx::query("CREATE TABLE encryption_probe(value TEXT NOT NULL)")
                .execute(database.pool())
                .await
                .unwrap();
            sqlx::query("INSERT INTO encryption_probe(value) VALUES ('private job note')")
                .execute(database.pool())
                .await
                .unwrap();
            database.checkpoint_wal().await.unwrap();
        }

        let url = format!("sqlite://{}?mode=ro", db_path.display());
        let unkeyed_pool = SqlitePool::connect(&url).await.unwrap();
        let unkeyed_read = sqlx::query_scalar::<_, String>("SELECT value FROM encryption_probe")
            .fetch_one(&unkeyed_pool)
            .await;

        assert!(
            unkeyed_read.is_err(),
            "unkeyed SQLite connection should not read a JobSentinel database"
        );
    }

    #[tokio::test]
    async fn plaintext_database_is_migrated_to_encrypted_storage() {
        let temp_dir = tempfile::tempdir().unwrap();
        let db_path = temp_dir.path().join("jobs.db");
        let url = format!("sqlite://{}?mode=rwc", db_path.display());

        {
            let plaintext_pool = SqlitePool::connect(&url).await.unwrap();
            sqlx::query("CREATE TABLE encryption_probe(value TEXT NOT NULL)")
                .execute(&plaintext_pool)
                .await
                .unwrap();
            sqlx::query("INSERT INTO encryption_probe(value) VALUES ('preserved local record')")
                .execute(&plaintext_pool)
                .await
                .unwrap();
            plaintext_pool.close().await;
        }

        {
            let database = Database::connect(&db_path).await.unwrap();
            let value: String = sqlx::query_scalar("SELECT value FROM encryption_probe")
                .fetch_one(database.pool())
                .await
                .unwrap();
            assert_eq!(value, "preserved local record");
            database.checkpoint_wal().await.unwrap();
        }

        let unkeyed_pool = SqlitePool::connect(&url).await.unwrap();
        let unkeyed_read = sqlx::query_scalar::<_, String>("SELECT value FROM encryption_probe")
            .fetch_one(&unkeyed_pool)
            .await;
        assert!(
            unkeyed_read.is_err(),
            "plaintext migration should leave only encrypted storage behind"
        );
    }

    #[tokio::test]
    async fn plaintext_upgrade_deletes_temporary_plaintext_backup_after_success() {
        let temp_dir = tempfile::tempdir().unwrap();
        let db_path = temp_dir.path().join("jobs.db");
        let backup_dir = temp_dir.path().join("backups");
        let url = format!("sqlite://{}?mode=rwc", db_path.display());

        {
            let plaintext_pool = SqlitePool::connect(&url).await.unwrap();
            sqlx::query("CREATE TABLE encryption_probe(value TEXT NOT NULL)")
                .execute(&plaintext_pool)
                .await
                .unwrap();
            sqlx::query("INSERT INTO encryption_probe(value) VALUES ('temporary backup probe')")
                .execute(&plaintext_pool)
                .await
                .unwrap();
            plaintext_pool.close().await;
        }

        let key = super::load_or_create_database_key().await.unwrap();
        super::encrypt_plaintext_database(&db_path, &key, &backup_dir)
            .await
            .unwrap();

        let leftovers: Vec<_> = std::fs::read_dir(&backup_dir)
            .unwrap()
            .filter_map(Result::ok)
            .filter(|entry| {
                entry
                    .file_name()
                    .to_string_lossy()
                    .starts_with("plaintext_before_encryption_")
            })
            .collect();

        assert!(
            leftovers.is_empty(),
            "successful plaintext upgrade must not leave plaintext backup files"
        );
    }
}
