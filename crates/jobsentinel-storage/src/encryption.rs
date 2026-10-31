//! Opens SQLCipher stores and probes existing databases without writer-side configuration.

use sqlx::{
    sqlite::{
        SqliteConnectOptions, SqliteJournalMode, SqlitePool, SqlitePoolOptions, SqliteSynchronous,
    },
    ConnectOptions, Connection,
};
use std::{
    path::{Path, PathBuf},
    time::Duration,
};
use zeroize::Zeroizing;

#[cfg(test)]
const DATABASE_KEY_LEN: usize = 32;
const DATABASE_ENCRYPTION_ERROR: &str =
    "JobSentinel could not unlock local database encryption. Check system permission prompts, then try again.";

pub(super) async fn load_or_create_database_key() -> Result<Zeroizing<String>, sqlx::Error> {
    #[cfg(test)]
    {
        return Ok(Zeroizing::new(hex::encode([0xDB; DATABASE_KEY_LEN])));
    }

    #[cfg(not(test))]
    {
        jobsentinel_platform::load_or_create_database_key()
            .await
            .map_err(|_| database_encryption_error())
    }
}

pub(super) async fn connect_encrypted_pool(
    path: &Path,
    key: &str,
    create_if_missing: bool,
) -> Result<SqlitePool, sqlx::Error> {
    let options = SqliteConnectOptions::new()
        .filename(path)
        .pragma("key", sqlcipher_key_pragma_value(key))
        .journal_mode(SqliteJournalMode::Wal)
        .synchronous(SqliteSynchronous::Normal)
        .foreign_keys(true)
        .busy_timeout(Duration::from_secs(5))
        .pragma("defer_foreign_keys", "OFF")
        .pragma("cell_size_check", "ON")
        .pragma("checksum_verification", "ON")
        .pragma("trusted_schema", "OFF")
        .pragma("secure_delete", "ON")
        .pragma("auto_vacuum", "INCREMENTAL")
        .pragma("wal_autocheckpoint", "1000")
        .pragma("cache_size", "-128000")
        .pragma("temp_store", "MEMORY")
        .pragma("mmap_size", "268435456")
        .pragma("locking_mode", "NORMAL")
        .create_if_missing(create_if_missing);
    #[cfg(debug_assertions)]
    let options = options.pragma("reverse_unordered_selects", "ON");
    let smoke_logging = package_smoke_logging_enabled();
    let pool = match SqlitePoolOptions::new().connect_with(options).await {
        Ok(pool) => {
            if smoke_logging {
                tracing::info!("Opened macOS package-smoke encrypted database connection");
            }
            pool
        }
        Err(error) => {
            if smoke_logging {
                tracing::warn!(
                    error = ?error,
                    "Failed to open macOS package-smoke encrypted database connection"
                );
            }
            return Err(error);
        }
    };
    if let Err(error) = verify_sqlcipher_connection(&pool).await {
        if smoke_logging {
            tracing::warn!(
                error = ?error,
                "Failed to verify macOS package-smoke SQLCipher connection"
            );
        }
        pool.close().await;
        return Err(error);
    }
    Ok(pool)
}

pub(super) async fn connect_encrypted_read_only_pool(
    path: &Path,
    key: &str,
) -> Result<SqlitePool, sqlx::Error> {
    if ["-wal", "-shm", "-journal"]
        .into_iter()
        .any(|suffix| sqlite_sidecar_path(path, suffix).exists())
    {
        return Err(sqlx::Error::Protocol(
            "Portable backup sidecars are not supported".into(),
        ));
    }
    let options = SqliteConnectOptions::new()
        .filename(path)
        .read_only(true)
        .pragma("key", sqlcipher_key_pragma_value(key))
        .immutable(true);
    connect_verified_read_pool(options).await
}

pub(super) async fn connect_encrypted_read_only_primary_pool(
    path: &Path,
    key: &str,
) -> Result<SqlitePool, sqlx::Error> {
    connect_verified_read_pool(primary_read_options(path, key)).await
}

fn primary_read_options(path: &Path, key: &str) -> SqliteConnectOptions {
    let options = SqliteConnectOptions::new()
        .filename(path)
        .read_only(true)
        .pragma("key", sqlcipher_key_pragma_value(key));
    if sqlite_sidecar_path(path, "-wal").exists() {
        options
    } else {
        options.immutable(true)
    }
}

async fn connect_verified_read_pool(
    options: SqliteConnectOptions,
) -> Result<SqlitePool, sqlx::Error> {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect_with(options.pragma("trusted_schema", "OFF"))
        .await?;
    if let Err(error) = verify_sqlcipher_connection(&pool).await {
        pool.close().await;
        return Err(error);
    }
    Ok(pool)
}

pub(super) async fn probe_encrypted_user_version(
    path: &Path,
    key: &str,
) -> Result<i64, sqlx::Error> {
    let options = primary_read_options(path, key);
    let mut connection = options.connect().await?;
    let result = async {
        let cipher_version: Option<String> = sqlx::query_scalar("PRAGMA cipher_version")
            .fetch_optional(&mut connection)
            .await?;
        if cipher_version
            .as_deref()
            .is_none_or(|version| version.trim().is_empty())
        {
            return Err(database_encryption_error());
        }
        sqlx::query("SELECT COUNT(*) FROM sqlite_master")
            .fetch_one(&mut connection)
            .await?;
        crate::connection::Database::require_supported_v3(&mut connection).await?;
        sqlx::query_scalar("PRAGMA user_version")
            .fetch_one(&mut connection)
            .await
    }
    .await;
    let close_result = connection.close().await;
    result.and_then(|version| close_result.map(|()| version))
}

pub(super) async fn probe_plaintext_user_version(path: &Path) -> Result<Option<i64>, sqlx::Error> {
    let options = SqliteConnectOptions::new().filename(path).read_only(true);
    let options = if sqlite_sidecar_path(path, "-wal").exists() {
        options
    } else {
        options.immutable(true)
    };
    let mut connection = options.connect().await?;
    let result = async {
        if let Err(error) = sqlx::query("SELECT COUNT(*) FROM sqlite_master")
            .fetch_one(&mut connection)
            .await
        {
            return match &error {
                sqlx::Error::Database(database) if database.code().as_deref() == Some("26") => {
                    Ok(None)
                }
                _ => Err(error),
            };
        }
        crate::connection::Database::refuse_future_data(&mut connection).await?;
        sqlx::query_scalar("PRAGMA user_version")
            .fetch_one(&mut connection)
            .await
            .map(Some)
    }
    .await;
    let close_result = connection.close().await;
    result.and_then(|version| close_result.map(|()| version))
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

pub(super) fn remove_sqlite_sidecars(db_path: &Path) {
    for suffix in ["-wal", "-shm"] {
        let _ = std::fs::remove_file(sqlite_sidecar_path(db_path, suffix));
    }
}

pub(super) fn sqlite_sidecar_path(db_path: &Path, suffix: &str) -> PathBuf {
    let mut sidecar_name = db_path.file_name().unwrap_or_default().to_os_string();
    sidecar_name.push(suffix);
    db_path.with_file_name(sidecar_name)
}

fn database_encryption_error() -> sqlx::Error {
    sqlx::Error::Io(std::io::Error::new(
        std::io::ErrorKind::PermissionDenied,
        DATABASE_ENCRYPTION_ERROR,
    ))
}

fn sqlcipher_key_pragma_value(key: &str) -> String {
    format!("'{}'", key.replace('\'', "''"))
}

fn package_smoke_logging_enabled() -> bool {
    #[cfg(target_os = "macos")]
    {
        jobsentinel_platform::package_smoke_root().is_some()
    }

    #[cfg(not(target_os = "macos"))]
    {
        false
    }
}

#[cfg(test)]
mod tests;
