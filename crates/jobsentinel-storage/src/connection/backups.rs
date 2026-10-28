//! Creates and verifies same-device SQLite recovery snapshots for migrations and updates.

use sha2::{Digest, Sha256};
use sqlx::sqlite::SqlitePool;
use std::path::{Path, PathBuf};
use uuid::Uuid;

use super::Database;
use jobsentinel_security::path_label_for_logging;

impl Database {
    /// Create a fresh database-scoped recovery snapshot for each migration attempt.
    ///
    /// This internal SQLCipher copy is not a portable user backup or export.
    pub(super) async fn ensure_migration_snapshot(
        pool: &SqlitePool,
        db_path: &Path,
        from_version: i64,
        to_version: i64,
    ) -> Result<Option<PathBuf>, Box<dyn std::error::Error + Send + Sync>> {
        let backup_dir = db_path
            .parent()
            .filter(|parent| !parent.as_os_str().is_empty())
            .map(|parent| parent.join("backups"))
            .unwrap_or_else(Self::default_backup_dir);
        if !db_path.exists() {
            return Ok(None);
        }

        let filename = db_path
            .file_name()
            .ok_or_else(|| std::io::Error::other("Missing database filename"))?;
        let backup_dir = backup_dir.join(hex::encode(Sha256::digest(filename.as_encoded_bytes())));
        jobsentinel_platform::ensure_private_dir(&backup_dir)?;
        let snapshot = backup_dir.join(format!(
            "migration_snapshot_v{from_version}_to_v{to_version}_{}.db",
            Uuid::new_v4()
        ));
        if let Err(error) = Self::create_verified_snapshot(pool, &snapshot).await {
            let _ = std::fs::remove_file(&snapshot);
            return Err(error);
        }
        tracing::info!(
            backup_path = %path_label_for_logging(&snapshot),
            from_version,
            to_version,
            "Internal migration recovery snapshot created"
        );
        Ok(Some(snapshot))
    }

    /// Test seam for the internal same-device snapshot mechanism.
    #[cfg(test)]
    pub(super) async fn backup_pre_migration_to_dir(
        pool: &SqlitePool,
        db_path: &Path,
        backup_dir: &Path,
    ) -> Result<Option<PathBuf>, Box<dyn std::error::Error + Send + Sync>> {
        if !db_path.exists() {
            return Ok(None);
        }

        jobsentinel_platform::ensure_private_dir(backup_dir)?;
        let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S_%3f");
        let backup_name = format!("backup_pre_migration_{}.db", timestamp);
        let backup_path = backup_dir.join(&backup_name);
        Self::create_verified_snapshot(pool, &backup_path).await?;
        Ok(Some(backup_path))
    }

    pub(super) async fn create_verified_snapshot(
        pool: &SqlitePool,
        backup_path: &Path,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let backup_path_str = backup_path.to_str().ok_or_else(|| {
            std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                "Invalid migration snapshot path encoding",
            )
        })?;
        sqlx::query("VACUUM INTO ?")
            .bind(backup_path_str)
            .execute(pool)
            .await?;
        jobsentinel_platform::ensure_private_file(backup_path)?;
        Self::verify_pre_migration_backup(pool, backup_path_str).await?;
        tracing::info!(
            backup_path = %path_label_for_logging(backup_path),
            "Internal migration recovery snapshot verified"
        );
        Ok(())
    }

    // ATTACH changes connection state; cancellation must never return it to the pool.
    pub(super) async fn snapshot_connection(
        pool: &SqlitePool,
    ) -> Result<sqlx::pool::PoolConnection<sqlx::Sqlite>, sqlx::Error> {
        let mut connection = pool.acquire().await?;
        connection.close_on_drop();
        Ok(connection)
    }

    pub(super) async fn verify_pre_migration_backup(
        pool: &SqlitePool,
        backup_path: &str,
    ) -> Result<(), sqlx::Error> {
        let mut conn = Self::snapshot_connection(pool).await?;
        sqlx::query("ATTACH DATABASE ? AS pre_migration_backup")
            .bind(backup_path)
            .execute(&mut *conn)
            .await?;

        let check_result =
            sqlx::query_scalar::<_, String>("PRAGMA pre_migration_backup.quick_check")
                .fetch_one(&mut *conn)
                .await;
        let detach_result = sqlx::query("DETACH DATABASE pre_migration_backup")
            .execute(&mut *conn)
            .await;

        let check = check_result?;
        detach_result?;

        if check.trim().eq_ignore_ascii_case("ok") {
            Ok(())
        } else {
            Err(sqlx::Error::Protocol(
                "Pre-migration backup integrity check failed".into(),
            ))
        }
    }

    pub(super) fn prune_superseded_migration_snapshots(
        backup_dir: &Path,
        retained_snapshot: &Path,
    ) {
        let Ok(entries) = std::fs::read_dir(backup_dir) else {
            return;
        };
        for entry in entries.filter_map(Result::ok) {
            let path = entry.path();
            let is_snapshot = path.file_name().is_some_and(|name| {
                let name = name.to_string_lossy();
                name.starts_with("migration_snapshot_") && name.ends_with(".db")
            });
            if is_snapshot && path != retained_snapshot {
                if let Err(e) = std::fs::remove_file(&path) {
                    tracing::warn!(
                        backup_path = %path_label_for_logging(&path),
                        error_kind = ?e.kind(),
                        "Failed to delete superseded migration snapshot"
                    );
                } else {
                    tracing::info!(
                        backup_path = %path_label_for_logging(&path),
                        "Pruned superseded migration snapshot"
                    );
                }
            }
        }
    }
}
