//! Database backup and restore operations

use anyhow::{Context, Result};
use chrono::Utc;
use sqlx::Row;
use std::path::{Path, PathBuf};

use super::types::BackupEntry;
use super::DatabaseIntegrity;

impl DatabaseIntegrity {
    /// Create database backup using VACUUM INTO
    pub async fn create_backup(&self, reason: &str) -> Result<PathBuf> {
        let timestamp = Utc::now().format("%Y%m%d_%H%M%S");
        let backup_name = format!("jobsentinel_backup_{}_{}.db", timestamp, reason);
        let backup_path = self.backup_dir.join(&backup_name);

        tracing::info!("💾 Creating database backup: {}", backup_path.display());
        let start_time = std::time::Instant::now();

        // SQLite VACUUM INTO creates a compact, defragmented copy
        let backup_path_str = backup_path
            .to_str()
            .context("Invalid backup path encoding")?;

        sqlx::query(&format!("VACUUM INTO '{}'", backup_path_str))
            .execute(&self.db)
            .await
            .context("Failed to create backup via VACUUM INTO")?;

        let duration = start_time.elapsed();
        let file_size = std::fs::metadata(&backup_path)?.len();

        tracing::info!(
            "✅ Backup created successfully: {} ({} bytes, took {:?})",
            backup_path.display(),
            file_size,
            duration
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
            "⚠️  Restoring database from backup: {}",
            backup_path.display()
        );

        if !backup_path.exists() {
            return Err(anyhow::anyhow!(
                "Backup file not found: {}",
                backup_path.display()
            ));
        }

        // Close current connection (handled by caller)

        // Backup corrupted database for forensics
        let corrupted_backup = current_db_path.with_extension("db.corrupted");
        if current_db_path.exists() {
            std::fs::rename(current_db_path, &corrupted_backup)?;
            tracing::info!(
                "🔒 Corrupted database saved to: {}",
                corrupted_backup.display()
            );
        }

        // Copy backup to main database location
        std::fs::copy(backup_path, current_db_path)?;

        tracing::info!("✅ Database restored successfully");

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
            tracing::info!("🗑️  Deleted old backup: {}", old_backup.path().display());
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
