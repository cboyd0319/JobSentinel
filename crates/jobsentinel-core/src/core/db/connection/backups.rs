use sqlx::sqlite::SqlitePool;
use std::path::{Path, PathBuf};

use super::Database;
use crate::core::logging::path_label_for_logging;

impl Database {
    /// Create a timestamped `backup_pre_migration_YYYYMMDD_HHMMSS_mmm.db`
    /// SQLite snapshot of the database file, then prune old pre-migration
    /// backups so that at most five copies are retained.
    pub(super) async fn backup_pre_migration(
        pool: &SqlitePool,
        db_path: &Path,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        Self::backup_pre_migration_to_dir(pool, db_path, &Self::default_backup_dir())
            .await
            .map(|_| ())
    }

    pub(super) async fn backup_pre_migration_to_dir(
        pool: &SqlitePool,
        db_path: &Path,
        backup_dir: &Path,
    ) -> Result<Option<PathBuf>, Box<dyn std::error::Error + Send + Sync>> {
        /// Maximum number of pre-migration backups to retain.
        const PRE_MIGRATION_BACKUP_KEEP: usize = 5;

        if !db_path.exists() {
            // Nothing to back up for a fresh database that has not been written yet.
            return Ok(None);
        }

        crate::platforms::ensure_private_dir(backup_dir)?;

        let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S_%3f");
        let backup_name = format!("backup_pre_migration_{}.db", timestamp);
        let backup_path = backup_dir.join(&backup_name);
        let backup_path_str = backup_path.to_str().ok_or_else(|| {
            std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                "Invalid backup path encoding",
            )
        })?;

        sqlx::query("VACUUM INTO ?")
            .bind(backup_path_str)
            .execute(pool)
            .await?;
        crate::platforms::ensure_private_file(&backup_path)?;
        Self::verify_pre_migration_backup(pool, backup_path_str).await?;
        tracing::info!(
            backup_path = %path_label_for_logging(&backup_path),
            "Pre-migration backup created"
        );

        Self::prune_pre_migration_backups(backup_dir, PRE_MIGRATION_BACKUP_KEEP);

        Ok(Some(backup_path))
    }

    async fn verify_pre_migration_backup(
        pool: &SqlitePool,
        backup_path: &str,
    ) -> Result<(), sqlx::Error> {
        let mut conn = pool.acquire().await?;
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

    /// Delete old `backup_pre_migration_*.db` files, keeping the `keep` newest.
    fn prune_pre_migration_backups(backup_dir: &Path, keep: usize) {
        let mut entries: Vec<_> = match std::fs::read_dir(backup_dir) {
            Ok(rd) => rd
                .filter_map(|e| e.ok())
                .filter(|e| {
                    let name = e.file_name();
                    let name = name.to_string_lossy();
                    name.starts_with("backup_pre_migration_") && name.ends_with(".db")
                })
                .collect(),
            Err(e) => {
                tracing::warn!(
                    error_kind = ?e.kind(),
                    "Could not read backup directory for pruning"
                );
                return;
            }
        };

        if entries.len() <= keep {
            return;
        }

        // Sort oldest-first by modification time so we delete from the front.
        entries.sort_by_key(|e| {
            e.metadata()
                .and_then(|m| m.modified())
                .unwrap_or(std::time::SystemTime::UNIX_EPOCH)
        });

        let to_delete = entries.len() - keep;
        for entry in entries.iter().take(to_delete) {
            if let Err(e) = std::fs::remove_file(entry.path()) {
                tracing::warn!(
                    backup_path = %path_label_for_logging(entry.path()),
                    error_kind = ?e.kind(),
                    "Failed to delete old pre-migration backup"
                );
            } else {
                tracing::info!(
                    backup_path = %path_label_for_logging(entry.path()),
                    "Pruned old pre-migration backup"
                );
            }
        }
    }
}
