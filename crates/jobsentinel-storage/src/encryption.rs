//! Opens encrypted SQLite stores and atomically converts supported plaintext databases.

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
tokio::task_local! { static CRASH_BEFORE_PUBLICATION: (); }

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
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect_with(options)
        .await?;
    verify_sqlcipher_connection(&pool).await?;
    Ok(pool)
}

pub(super) async fn probe_encrypted_user_version(
    path: &Path,
    key: &str,
) -> Result<i64, sqlx::Error> {
    let options = SqliteConnectOptions::new()
        .filename(path)
        .read_only(true)
        .pragma("key", sqlcipher_key_pragma_value(key));
    let options = if sqlite_sidecar_path(path, "-wal").exists() {
        options
    } else {
        options.immutable(true)
    };
    let mut connection = options.connect().await?;
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
    crate::connection::Database::refuse_future_data(&mut connection).await?;
    sqlx::query_scalar("PRAGMA user_version")
        .fetch_one(&mut connection)
        .await
}

pub(super) async fn probe_plaintext_user_version(path: &Path) -> Result<Option<i64>, sqlx::Error> {
    let options = SqliteConnectOptions::new().filename(path).read_only(true);
    let options = if sqlite_sidecar_path(path, "-wal").exists() {
        options
    } else {
        options.immutable(true)
    };
    let mut connection = options.connect().await?;
    if let Err(error) = sqlx::query("SELECT COUNT(*) FROM sqlite_master")
        .fetch_one(&mut connection)
        .await
    {
        return match &error {
            sqlx::Error::Database(database) if database.code().as_deref() == Some("26") => Ok(None),
            _ => Err(error),
        };
    }
    crate::connection::Database::refuse_future_data(&mut connection).await?;
    sqlx::query_scalar("PRAGMA user_version")
        .fetch_one(&mut connection)
        .await
        .map(Some)
}

pub(super) async fn encrypt_plaintext_database(
    db_path: &Path,
    key: &str,
) -> Result<(), sqlx::Error> {
    let parent = db_path
        .parent()
        .filter(|path| !path.as_os_str().is_empty())
        .ok_or_else(database_encryption_error)?;
    let temporary = tempfile::Builder::new()
        .prefix(".jobsentinel-encryption-")
        .tempfile_in(parent)?
        .into_temp_path();
    let pool = connect_encrypted_pool(&temporary, key, false).await?;
    pool.close().await;
    export_plaintext_database_to_encrypted(db_path, &temporary, key).await?;
    let pool = connect_encrypted_pool(&temporary, key, false).await?;
    let check: String = sqlx::query_scalar("PRAGMA quick_check")
        .fetch_one(&pool)
        .await?;
    if check != "ok" {
        return Err(database_encryption_error());
    }
    let (busy, _, _): (i64, i64, i64) = sqlx::query_as("PRAGMA wal_checkpoint(TRUNCATE)")
        .fetch_one(&pool)
        .await?;
    pool.close().await;
    if busy != 0 {
        return Err(database_encryption_error());
    }
    std::fs::OpenOptions::new()
        .write(true)
        .open(&temporary)?
        .sync_all()?;
    // Both databases are checkpointed and closed; a failed replacement leaves the original intact.
    for path in [db_path, temporary.as_ref()] {
        for suffix in ["-wal", "-shm"] {
            if let Err(error) = std::fs::remove_file(sqlite_sidecar_path(path, suffix)) {
                if error.kind() != std::io::ErrorKind::NotFound {
                    return Err(error.into());
                }
            }
        }
    }
    #[cfg(test)]
    if CRASH_BEFORE_PUBLICATION.try_with(|_| ()).is_ok() {
        std::process::exit(91);
    }
    replace_database_file(db_path, &temporary)?;
    #[cfg(unix)]
    std::fs::File::open(parent)?.sync_all()?;
    jobsentinel_platform::ensure_private_sqlite_files(db_path)?;
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

async fn export_plaintext_database_to_encrypted(
    plaintext_path: &Path,
    encrypted_path: &Path,
    key: &str,
) -> Result<(), sqlx::Error> {
    let mut conn = SqliteConnectOptions::new()
        .filename(plaintext_path)
        .create_if_missing(false)
        .connect()
        .await?;

    let (busy, _, _): (i64, i64, i64) = sqlx::query_as("PRAGMA wal_checkpoint(TRUNCATE)")
        .fetch_one(&mut conn)
        .await?;
    if busy != 0 {
        return Err(database_encryption_error());
    }
    let user_version: i64 = sqlx::query_scalar("PRAGMA user_version")
        .fetch_one(&mut conn)
        .await?;

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
    sqlx::query(sqlx::AssertSqlSafe(format!(
        "PRAGMA encrypted.user_version = {user_version}"
    )))
    .execute(&mut conn)
    .await?;
    sqlx::query("DETACH DATABASE encrypted")
        .execute(&mut conn)
        .await?;
    conn.close().await?;
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

fn replace_database_file(db_path: &Path, encrypted_path: &Path) -> std::io::Result<()> {
    std::fs::rename(encrypted_path, db_path)
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
