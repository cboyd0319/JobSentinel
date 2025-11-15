//! Database Integrity and Backup Management
//!
//! Provides comprehensive integrity checking, automated backups,
//! and corruption detection/recovery for SQLite database.

use anyhow::{Context, Result};
use chrono::Utc;
use sqlx::{Row, SqlitePool};
use std::path::{Path, PathBuf};

/// Database integrity manager
pub struct DatabaseIntegrity {
    db: SqlitePool,
    backup_dir: PathBuf,
}

impl DatabaseIntegrity {
    /// Create new integrity manager
    pub fn new(db: SqlitePool, backup_dir: PathBuf) -> Self {
        std::fs::create_dir_all(&backup_dir).ok();
        Self { db, backup_dir }
    }

    /// Run full integrity check on startup
    pub async fn startup_check(&self) -> Result<IntegrityStatus> {
        tracing::info!("🔍 Running database integrity check...");
        let start_time = std::time::Instant::now();

        // 1. Quick check first (fast)
        let quick_result = self.quick_check().await?;
        if !quick_result.is_ok {
            tracing::error!("❌ Quick check failed: {}", quick_result.message);
            self.log_check("quick", "failed", Some(&quick_result.message), start_time.elapsed())
                .await?;
            return Ok(IntegrityStatus::Corrupted(quick_result.message));
        }

        // 2. Foreign key check
        let fk_violations = self.foreign_key_check().await?;
        if !fk_violations.is_empty() {
            tracing::warn!(
                "⚠️  Foreign key violations detected: {} issues",
                fk_violations.len()
            );
            self.log_check(
                "foreign_key",
                "warning",
                Some(&format!("{} violations", fk_violations.len())),
                start_time.elapsed(),
            )
            .await?;
            return Ok(IntegrityStatus::ForeignKeyViolations(fk_violations));
        }

        // 3. Full integrity check (only if needed based on schedule)
        if self.should_run_full_check().await? {
            tracing::info!("Running full integrity check (weekly schedule)...");
            let full_result = self.full_integrity_check().await?;
            if !full_result.is_ok {
                tracing::error!("❌ Full integrity check failed: {}", full_result.message);
                self.log_check("full", "failed", Some(&full_result.message), start_time.elapsed())
                    .await?;
                return Ok(IntegrityStatus::Corrupted(full_result.message));
            }

            // Update last full check timestamp
            self.update_last_full_check().await?;
        }

        self.log_check("quick", "passed", None, start_time.elapsed())
            .await?;
        tracing::info!("✅ Database integrity check passed ({:?})", start_time.elapsed());
        Ok(IntegrityStatus::Healthy)
    }

    /// Quick integrity check (PRAGMA quick_check)
    async fn quick_check(&self) -> Result<CheckResult> {
        let row = sqlx::query("PRAGMA quick_check")
            .fetch_one(&self.db)
            .await?;

        let result: String = row.try_get(0)?;

        Ok(CheckResult {
            is_ok: result.eq_ignore_ascii_case("ok"),
            message: result,
        })
    }

    /// Full integrity check (PRAGMA integrity_check)
    async fn full_integrity_check(&self) -> Result<CheckResult> {
        let row = sqlx::query("PRAGMA integrity_check")
            .fetch_one(&self.db)
            .await?;

        let result: String = row.try_get(0)?;

        Ok(CheckResult {
            is_ok: result.eq_ignore_ascii_case("ok"),
            message: result,
        })
    }

    /// Check for foreign key violations
    async fn foreign_key_check(&self) -> Result<Vec<ForeignKeyViolation>> {
        let rows = sqlx::query("PRAGMA foreign_key_check")
            .fetch_all(&self.db)
            .await?;

        let mut violations = Vec::new();
        for row in rows {
            violations.push(ForeignKeyViolation {
                table: row.try_get(0)?,
                rowid: row.try_get(1)?,
                parent: row.try_get(2)?,
                fkid: row.try_get(3)?,
            });
        }

        Ok(violations)
    }

    /// Determine if full check is needed (run weekly)
    async fn should_run_full_check(&self) -> Result<bool> {
        let last_check: Option<String> = sqlx::query_scalar(
            "SELECT value FROM app_metadata WHERE key = 'last_full_integrity_check'",
        )
        .fetch_optional(&self.db)
        .await?;

        if let Some(last_check_str) = last_check {
            let last_check_time = chrono::DateTime::parse_from_rfc3339(&last_check_str)?;
            let days_since = (Utc::now() - last_check_time).num_days();
            Ok(days_since >= 7) // Run weekly
        } else {
            Ok(true) // Never run before
        }
    }

    /// Update last full check timestamp
    async fn update_last_full_check(&self) -> Result<()> {
        sqlx::query(
            "INSERT OR REPLACE INTO app_metadata (key, value, updated_at) VALUES (?, ?, datetime('now'))",
        )
        .bind("last_full_integrity_check")
        .bind(Utc::now().to_rfc3339())
        .execute(&self.db)
        .await?;

        Ok(())
    }

    /// Log integrity check to database
    async fn log_check(
        &self,
        check_type: &str,
        status: &str,
        details: Option<&str>,
        duration: std::time::Duration,
    ) -> Result<()> {
        sqlx::query(
            "INSERT INTO integrity_check_log (check_type, status, details, duration_ms) VALUES (?, ?, ?, ?)",
        )
        .bind(check_type)
        .bind(status)
        .bind(details)
        .bind(duration.as_millis() as i64)
        .execute(&self.db)
        .await?;

        Ok(())
    }

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
        sqlx::query(
            "INSERT INTO backup_log (backup_path, reason, size_bytes) VALUES (?, ?, ?)",
        )
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
    pub async fn restore_from_backup(&self, backup_path: &Path, current_db_path: &Path) -> Result<()> {
        tracing::warn!("⚠️  Restoring database from backup: {}", backup_path.display());

        if !backup_path.exists() {
            return Err(anyhow::anyhow!("Backup file not found: {}", backup_path.display()));
        }

        // Close current connection (handled by caller)

        // Backup corrupted database for forensics
        let corrupted_backup = current_db_path.with_extension("db.corrupted");
        if current_db_path.exists() {
            std::fs::rename(current_db_path, &corrupted_backup)?;
            tracing::info!("🔒 Corrupted database saved to: {}", corrupted_backup.display());
        }

        // Copy backup to main database location
        std::fs::copy(backup_path, current_db_path)?;

        tracing::info!("✅ Database restored successfully");

        Ok(())
    }

    /// Optimize database (VACUUM, ANALYZE)
    pub async fn optimize(&self) -> Result<()> {
        tracing::info!("🔧 Optimizing database...");
        let start_time = std::time::Instant::now();

        // VACUUM: Rebuild database file (compact, defragment)
        sqlx::query("VACUUM")
            .execute(&self.db)
            .await
            .context("VACUUM failed")?;

        // ANALYZE: Update query planner statistics
        sqlx::query("ANALYZE")
            .execute(&self.db)
            .await
            .context("ANALYZE failed")?;

        let duration = start_time.elapsed();
        tracing::info!("✅ Database optimized (took {:?})", duration);
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

    /// Get comprehensive database health metrics
    pub async fn get_health_metrics(&self) -> Result<DatabaseHealth> {
        let mut health = DatabaseHealth::default();

        // Get database file size
        if let Ok(row) = sqlx::query("PRAGMA page_count")
            .fetch_one(&self.db)
            .await
        {
            let page_count: i64 = row.try_get(0)?;
            let page_size: i64 = sqlx::query("PRAGMA page_size")
                .fetch_one(&self.db)
                .await?
                .try_get(0)?;

            health.database_size_bytes = page_count * page_size;
        }

        // Get freelist size (unused space)
        if let Ok(row) = sqlx::query("PRAGMA freelist_count")
            .fetch_one(&self.db)
            .await
        {
            let freelist_count: i64 = row.try_get(0)?;
            let page_size: i64 = sqlx::query("PRAGMA page_size")
                .fetch_one(&self.db)
                .await?
                .try_get(0)?;

            health.freelist_size_bytes = freelist_count * page_size;
        }

        // Get WAL file size
        if let Ok(row) = sqlx::query("PRAGMA wal_checkpoint(PASSIVE)")
            .fetch_one(&self.db)
            .await
        {
            // WAL checkpoint returns (busy, log_size, checkpointed_frames)
            let wal_frames: i64 = row.try_get(1).unwrap_or(0);
            let page_size: i64 = sqlx::query("PRAGMA page_size")
                .fetch_one(&self.db)
                .await?
                .try_get(0)?;

            health.wal_size_bytes = wal_frames * page_size;
        }

        // Get schema version
        if let Ok(row) = sqlx::query("PRAGMA user_version")
            .fetch_one(&self.db)
            .await
        {
            health.schema_version = row.try_get(0)?;
        }

        // Get application ID
        if let Ok(row) = sqlx::query("PRAGMA application_id")
            .fetch_one(&self.db)
            .await
        {
            health.application_id = row.try_get(0)?;
        }

        // Check if integrity check is overdue
        if let Ok(last_check) = sqlx::query_scalar::<_, Option<String>>(
            "SELECT value FROM app_metadata WHERE key = 'last_full_integrity_check'",
        )
        .fetch_optional(&self.db)
        .await?
        {
            if let Some(last_check_str) = last_check {
                if let Ok(last_check_time) = chrono::DateTime::parse_from_rfc3339(&last_check_str) {
                    let days_since = (Utc::now() - last_check_time).num_days();
                    health.integrity_check_overdue = days_since > 7;
                    health.days_since_last_integrity_check = days_since;
                }
            }
        }

        // Check if backup is overdue
        if let Ok(last_backup) = sqlx::query_scalar::<_, Option<String>>(
            "SELECT value FROM app_metadata WHERE key = 'last_backup'",
        )
        .fetch_optional(&self.db)
        .await?
        {
            if let Some(last_backup_str) = last_backup {
                if let Ok(last_backup_time) = chrono::DateTime::parse_from_rfc3339(&last_backup_str) {
                    let hours_since = (Utc::now() - last_backup_time).num_hours();
                    health.backup_overdue = hours_since > 24;
                    health.hours_since_last_backup = hours_since;
                }
            }
        }

        // Get table row counts
        health.total_jobs = sqlx::query_scalar("SELECT COUNT(*) FROM jobs")
            .fetch_one(&self.db)
            .await
            .unwrap_or(0);

        // Get total integrity checks performed
        health.total_integrity_checks = sqlx::query_scalar(
            "SELECT COUNT(*) FROM integrity_check_log",
        )
        .fetch_one(&self.db)
        .await
        .unwrap_or(0);

        // Get failed check count
        health.failed_integrity_checks = sqlx::query_scalar(
            "SELECT COUNT(*) FROM integrity_check_log WHERE status = 'failed'",
        )
        .fetch_one(&self.db)
        .await
        .unwrap_or(0);

        // Get total backups
        health.total_backups = sqlx::query_scalar("SELECT COUNT(*) FROM backup_log")
            .fetch_one(&self.db)
            .await
            .unwrap_or(0);

        // Calculate fragmentation percentage
        if health.database_size_bytes > 0 {
            health.fragmentation_percent =
                (health.freelist_size_bytes as f64 / health.database_size_bytes as f64) * 100.0;
        }

        Ok(health)
    }

    /// Run PRAGMA optimize to update query statistics
    pub async fn optimize_query_planner(&self) -> Result<()> {
        tracing::info!("🔧 Optimizing query planner statistics...");
        sqlx::query("PRAGMA optimize")
            .execute(&self.db)
            .await?;
        tracing::info!("✅ Query planner optimized");
        Ok(())
    }

    /// Perform WAL checkpoint (flush WAL to main database)
    pub async fn checkpoint_wal(&self) -> Result<WalCheckpointResult> {
        tracing::info!("🔄 Performing WAL checkpoint...");

        let row = sqlx::query("PRAGMA wal_checkpoint(TRUNCATE)")
            .fetch_one(&self.db)
            .await?;

        let result = WalCheckpointResult {
            busy: row.try_get(0)?,
            log_frames: row.try_get(1)?,
            checkpointed_frames: row.try_get(2)?,
        };

        if result.busy == 0 {
            tracing::info!(
                "✅ WAL checkpoint complete ({} frames checkpointed)",
                result.checkpointed_frames
            );
        } else {
            tracing::warn!("⚠️ WAL checkpoint partially complete (database was busy)");
        }

        Ok(result)
    }

    /// Get detailed PRAGMA information for diagnostics
    pub async fn get_pragma_diagnostics(&self) -> Result<PragmaDiagnostics> {
        let mut diag = PragmaDiagnostics::default();

        // Journal mode
        if let Ok(row) = sqlx::query("PRAGMA journal_mode").fetch_one(&self.db).await {
            diag.journal_mode = row.try_get(0)?;
        }

        // Synchronous mode
        if let Ok(row) = sqlx::query("PRAGMA synchronous").fetch_one(&self.db).await {
            diag.synchronous = row.try_get(0)?;
        }

        // Cache size
        if let Ok(row) = sqlx::query("PRAGMA cache_size").fetch_one(&self.db).await {
            diag.cache_size = row.try_get(0)?;
        }

        // Page size
        if let Ok(row) = sqlx::query("PRAGMA page_size").fetch_one(&self.db).await {
            diag.page_size = row.try_get(0)?;
        }

        // Auto vacuum
        if let Ok(row) = sqlx::query("PRAGMA auto_vacuum").fetch_one(&self.db).await {
            diag.auto_vacuum = row.try_get(0)?;
        }

        // Foreign keys
        if let Ok(row) = sqlx::query("PRAGMA foreign_keys").fetch_one(&self.db).await {
            diag.foreign_keys = row.try_get::<i64, _>(0)? == 1;
        }

        // Temp store
        if let Ok(row) = sqlx::query("PRAGMA temp_store").fetch_one(&self.db).await {
            diag.temp_store = row.try_get(0)?;
        }

        // Locking mode
        if let Ok(row) = sqlx::query("PRAGMA locking_mode").fetch_one(&self.db).await {
            diag.locking_mode = row.try_get(0)?;
        }

        // Secure delete
        if let Ok(row) = sqlx::query("PRAGMA secure_delete").fetch_one(&self.db).await {
            diag.secure_delete = row.try_get(0)?;
        }

        // Cell size check
        if let Ok(row) = sqlx::query("PRAGMA cell_size_check").fetch_one(&self.db).await {
            diag.cell_size_check = row.try_get::<i64, _>(0)? == 1;
        }

        // SQLite version
        if let Ok(row) = sqlx::query("SELECT sqlite_version()").fetch_one(&self.db).await {
            diag.sqlite_version = row.try_get(0)?;
        }

        Ok(diag)
    }
}

/// Result of an integrity check
#[derive(Debug)]
struct CheckResult {
    is_ok: bool,
    message: String,
}

/// Status of database integrity
#[derive(Debug)]
pub enum IntegrityStatus {
    Healthy,
    Corrupted(String),
    ForeignKeyViolations(Vec<ForeignKeyViolation>),
}

/// Foreign key violation details
#[derive(Debug, Clone)]
pub struct ForeignKeyViolation {
    pub table: String,
    pub rowid: i64,
    pub parent: String,
    pub fkid: i64,
}

/// Backup log entry
#[derive(Debug, Clone)]
pub struct BackupEntry {
    pub id: i64,
    pub backup_path: String,
    pub reason: Option<String>,
    pub size_bytes: Option<i64>,
    pub created_at: String,
}

/// Comprehensive database health metrics
#[derive(Debug, Clone, Default)]
pub struct DatabaseHealth {
    // Size metrics
    pub database_size_bytes: i64,
    pub freelist_size_bytes: i64,
    pub wal_size_bytes: i64,
    pub fragmentation_percent: f64,

    // Version info
    pub schema_version: i64,
    pub application_id: i64,

    // Maintenance status
    pub integrity_check_overdue: bool,
    pub backup_overdue: bool,
    pub days_since_last_integrity_check: i64,
    pub hours_since_last_backup: i64,

    // Statistics
    pub total_jobs: i64,
    pub total_integrity_checks: i64,
    pub failed_integrity_checks: i64,
    pub total_backups: i64,
}

/// WAL checkpoint result
#[derive(Debug, Clone)]
pub struct WalCheckpointResult {
    pub busy: i64,           // 0 if checkpoint completed, non-zero if blocked
    pub log_frames: i64,     // Total frames in WAL
    pub checkpointed_frames: i64, // Frames successfully checkpointed
}

/// PRAGMA diagnostics information
#[derive(Debug, Clone, Default)]
pub struct PragmaDiagnostics {
    pub journal_mode: String,
    pub synchronous: i64,
    pub cache_size: i64,
    pub page_size: i64,
    pub auto_vacuum: i64,
    pub foreign_keys: bool,
    pub temp_store: i64,
    pub locking_mode: String,
    pub secure_delete: i64,
    pub cell_size_check: bool,
    pub sqlite_version: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::SqlitePool;

    async fn create_test_db() -> SqlitePool {
        let pool = SqlitePool::connect("sqlite::memory:").await.unwrap();

        // Run migrations
        sqlx::migrate!("./migrations")
            .run(&pool)
            .await
            .unwrap();

        pool
    }

    #[tokio::test]
    async fn test_quick_check_healthy_database() {
        let db = create_test_db().await;
        let temp_dir = tempfile::tempdir().unwrap();
        let integrity = DatabaseIntegrity::new(db, temp_dir.path().to_path_buf());

        let result = integrity.quick_check().await.unwrap();
        assert!(result.is_ok, "Healthy database should pass quick check");
        assert_eq!(result.message.to_lowercase(), "ok");
    }

    #[tokio::test]
    async fn test_startup_check_healthy() {
        let db = create_test_db().await;
        let temp_dir = tempfile::tempdir().unwrap();
        let integrity = DatabaseIntegrity::new(db, temp_dir.path().to_path_buf());

        let status = integrity.startup_check().await.unwrap();
        assert!(matches!(status, IntegrityStatus::Healthy));
    }

    #[tokio::test]
    async fn test_backup_creation() {
        let db = create_test_db().await;
        let temp_dir = tempfile::tempdir().unwrap();
        let integrity = DatabaseIntegrity::new(db, temp_dir.path().to_path_buf());

        let backup_path = integrity.create_backup("test").await.unwrap();
        assert!(backup_path.exists(), "Backup file should exist");
        assert!(backup_path.metadata().unwrap().len() > 0, "Backup should not be empty");
    }

    #[tokio::test]
    async fn test_cleanup_old_backups() {
        let db = create_test_db().await;
        let temp_dir = tempfile::tempdir().unwrap();
        let integrity = DatabaseIntegrity::new(db, temp_dir.path().to_path_buf());

        // Create multiple backups
        for i in 0..5 {
            integrity.create_backup(&format!("test_{}", i)).await.unwrap();
            tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
        }

        // Keep only 2 backups
        let deleted = integrity.cleanup_old_backups(2).await.unwrap();
        assert_eq!(deleted, 3, "Should delete 3 old backups");

        // Verify only 2 backups remain
        let remaining: Vec<_> = std::fs::read_dir(temp_dir.path())
            .unwrap()
            .filter_map(|e| e.ok())
            .filter(|e| {
                e.path()
                    .extension()
                    .and_then(|s| s.to_str())
                    .map(|s| s == "db")
                    .unwrap_or(false)
            })
            .collect();

        assert_eq!(remaining.len(), 2, "Should have 2 backups remaining");
    }

    #[tokio::test]
    async fn test_get_backup_history() {
        let db = create_test_db().await;
        let temp_dir = tempfile::tempdir().unwrap();
        let integrity = DatabaseIntegrity::new(db, temp_dir.path().to_path_buf());

        // Create a backup
        integrity.create_backup("test_history").await.unwrap();

        // Get backup history
        let history = integrity.get_backup_history(10).await.unwrap();
        assert!(!history.is_empty(), "Should have backup history");
        assert!(history[0].reason.as_ref().unwrap().contains("test_history"));
    }
}
