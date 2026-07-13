//! Database backup and restore operations

use anyhow::{Context, Result};
use chrono::Utc;
use sqlx::Row;
use std::ffi::OsString;
use std::path::{Path, PathBuf};

use crate::core::logging::path_label_for_logging;

use super::types::BackupEntry;
use super::DatabaseIntegrity;

impl DatabaseIntegrity {
    /// Sanitize a backup reason string to prevent SQL injection via VACUUM INTO.
    /// Only allows alphanumeric characters, underscores, and hyphens.
    fn sanitize_backup_reason(reason: &str) -> String {
        reason
            .chars()
            .map(|c| {
                if c.is_alphanumeric() || c == '_' || c == '-' {
                    c
                } else {
                    '_'
                }
            })
            .collect()
    }

    /// Create database backup using VACUUM INTO
    pub async fn create_backup(&self, reason: &str) -> Result<PathBuf> {
        let safe_reason = Self::sanitize_backup_reason(reason);
        let timestamp = Utc::now().format("%Y%m%d_%H%M%S");
        let backup_name = format!("jobsentinel_backup_{}_{}.db", timestamp, safe_reason);
        let backup_path = self.backup_dir.join(&backup_name);

        tracing::info!(
            backup_path = %path_label_for_logging(&backup_path),
            "Creating database backup"
        );
        let start_time = std::time::Instant::now();

        // SQLite VACUUM INTO creates a compact, defragmented copy
        let backup_path_str = backup_path
            .to_str()
            .context("Invalid backup path encoding")?;

        sqlx::query("VACUUM INTO ?")
            .bind(backup_path_str)
            .execute(&self.db)
            .await
            .context("Failed to create backup via VACUUM INTO")?;
        crate::platforms::ensure_private_file(&backup_path)?;

        let duration = start_time.elapsed();
        let file_size = std::fs::metadata(&backup_path)?.len();

        tracing::info!(
            backup_path = %path_label_for_logging(&backup_path),
            file_size,
            duration_ms = duration.as_millis(),
            "Backup created successfully"
        );

        // Log backup to database
        sqlx::query("INSERT INTO backup_log (backup_path, reason, size_bytes) VALUES (?, ?, ?)")
            .bind(backup_path_str)
            .bind(reason)
            .bind(file_size as i64)
            .execute(&self.db)
            .await?;

        // Update last backup timestamp
        sqlx::query(
            "INSERT OR REPLACE INTO app_metadata (key, value, updated_at) VALUES (?, ?, datetime('now'))",
        )
        .bind("last_backup")
        .bind(Utc::now().to_rfc3339())
        .execute(&self.db)
        .await?;

        Ok(backup_path)
    }

    /// Auto-backup before risky operations
    pub async fn backup_before_operation(&self, operation: &str) -> Result<PathBuf> {
        self.create_backup(&format!("pre_{}", operation)).await
    }

    /// Restore from backup
    pub async fn restore_from_backup(
        &self,
        backup_path: &Path,
        current_db_path: &Path,
    ) -> Result<()> {
        tracing::warn!(
            backup_path = %path_label_for_logging(backup_path),
            "Restoring database from backup"
        );

        if !backup_path.exists() {
            return Err(anyhow::anyhow!("Backup file not found"));
        }

        // Close current connection (handled by caller)

        // Backup current database files for forensics. SQLite sidecars must be
        // quarantined with the main file so stale WAL frames cannot replay into
        // the restored database on next open.
        Self::quarantine_existing_sqlite_file(current_db_path)?;
        for sidecar in sqlite_sidecar_paths(current_db_path) {
            Self::quarantine_existing_sqlite_file(&sidecar)?;
        }

        // Copy backup to main database location
        std::fs::copy(backup_path, current_db_path)?;
        crate::platforms::ensure_private_file(current_db_path)?;

        tracing::info!("Database restored successfully");

        Ok(())
    }

    fn quarantine_existing_sqlite_file(path: &Path) -> Result<()> {
        if !path.exists() {
            return Ok(());
        }

        let quarantined_path = corrupted_sqlite_path(path);
        std::fs::rename(path, &quarantined_path)?;
        tracing::info!(
            backup_path = %path_label_for_logging(&quarantined_path),
            "Existing SQLite file saved before restore"
        );
        Ok(())
    }

    /// Clean up old backups (keep last N backups)
    pub async fn cleanup_old_backups(&self, keep_count: usize) -> Result<usize> {
        let mut backups: Vec<_> = std::fs::read_dir(&self.backup_dir)?
            .filter_map(|e| e.ok())
            .filter(|e| {
                e.path()
                    .extension()
                    .and_then(|s| s.to_str())
                    .map(|s| s == "db")
                    .unwrap_or(false)
            })
            .collect();

        if backups.len() <= keep_count {
            return Ok(0); // No cleanup needed
        }

        // Sort by modification time (newest first)
        backups.sort_by_key(|entry| {
            entry
                .metadata()
                .and_then(|m| m.modified())
                .unwrap_or(std::time::SystemTime::UNIX_EPOCH)
        });
        backups.reverse();

        // Delete old backups beyond keep_count
        let mut deleted_count = 0;
        for old_backup in backups.iter().skip(keep_count) {
            std::fs::remove_file(old_backup.path())?;
            tracing::info!(
                backup_path = %path_label_for_logging(old_backup.path()),
                "Deleted old backup"
            );
            deleted_count += 1;
        }

        Ok(deleted_count)
    }

    /// Get backup history
    pub async fn get_backup_history(&self, limit: i64) -> Result<Vec<BackupEntry>> {
        let rows = sqlx::query(
            "SELECT id, backup_path, reason, size_bytes, created_at
             FROM backup_log
             ORDER BY created_at DESC
             LIMIT ?",
        )
        .bind(limit)
        .fetch_all(&self.db)
        .await?;

        let mut backups = Vec::new();
        for row in rows {
            backups.push(BackupEntry {
                id: row.try_get(0)?,
                backup_path: row.try_get(1)?,
                reason: row.try_get(2)?,
                size_bytes: row.try_get(3)?,
                created_at: row.try_get(4)?,
            });
        }

        Ok(backups)
    }
}

fn sqlite_sidecar_paths(db_path: &Path) -> [PathBuf; 2] {
    [
        sqlite_path_with_suffix(db_path, "-wal"),
        sqlite_path_with_suffix(db_path, "-shm"),
    ]
}

fn sqlite_path_with_suffix(db_path: &Path, suffix: &str) -> PathBuf {
    let mut value = OsString::from(db_path.as_os_str());
    value.push(suffix);
    PathBuf::from(value)
}

fn corrupted_sqlite_path(path: &Path) -> PathBuf {
    let timestamp = Utc::now().format("%Y%m%d_%H%M%S_%3f");
    let file_name = path
        .file_name()
        .map(|name| name.to_string_lossy())
        .unwrap_or_else(|| "sqlite-file".into());
    path.with_file_name(format!("{file_name}.corrupted.{timestamp}"))
}

#[cfg(test)]
mod tests {
    use super::*;

    // ========================================================================
    // Security: VACUUM INTO SQL injection prevention (CWE-89)
    // ========================================================================

    #[test]
    fn test_sanitize_backup_reason_strips_sql_injection() {
        let malicious = "'; DROP TABLE jobs; --";
        let sanitized = DatabaseIntegrity::sanitize_backup_reason(malicious);
        assert!(!sanitized.contains('\''), "Single quotes must be stripped");
        assert!(!sanitized.contains(';'), "Semicolons must be stripped");
        assert_eq!(sanitized, "___DROP_TABLE_jobs__--");
    }

    #[test]
    fn test_sanitize_backup_reason_preserves_safe_chars() {
        let safe = "pre_migration-v2";
        let sanitized = DatabaseIntegrity::sanitize_backup_reason(safe);
        assert_eq!(sanitized, safe, "Safe characters should be preserved");
    }

    #[test]
    fn test_sanitize_backup_reason_handles_path_traversal() {
        let traversal = "../../etc/passwd";
        let sanitized = DatabaseIntegrity::sanitize_backup_reason(traversal);
        assert!(!sanitized.contains('/'), "Path separators must be stripped");
        assert!(!sanitized.contains('.'), "Dots must be stripped");
    }

    #[test]
    fn test_sanitize_backup_reason_handles_empty() {
        let sanitized = DatabaseIntegrity::sanitize_backup_reason("");
        assert_eq!(sanitized, "", "Empty string should remain empty");
    }

    #[test]
    fn test_sanitize_backup_reason_handles_unicode() {
        let unicode = "backup_日本語";
        let sanitized = DatabaseIntegrity::sanitize_backup_reason(unicode);
        // Unicode alphanumeric chars should be preserved
        assert!(sanitized.contains("backup_"));
    }

    #[cfg(unix)]
    #[tokio::test]
    async fn test_create_backup_writes_private_file() {
        use crate::core::db::Database;
        use std::os::unix::fs::PermissionsExt;

        let temp_dir = tempfile::tempdir().unwrap();
        let db_path = temp_dir.path().join("jobs.db");
        let database = Database::connect(&db_path).await.unwrap();
        database.migrate().await.unwrap();
        let integrity =
            DatabaseIntegrity::new(database.pool().clone(), temp_dir.path().join("backups"));

        let backup_path = integrity.create_backup("manual").await.unwrap();
        let mode = std::fs::metadata(&backup_path)
            .unwrap()
            .permissions()
            .mode()
            & 0o777;

        assert_eq!(mode, 0o600);
    }
}
