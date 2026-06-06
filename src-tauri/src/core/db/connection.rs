//! Database connection and configuration
//!
//! Handles SQLite connection, PRAGMA configuration, and migrations.

use sqlx::{sqlite::SqlitePool, Row};
use std::path::PathBuf;

use crate::core::logging::path_label_for_logging;

/// Database handle
#[derive(Debug)]
pub struct Database {
    pool: SqlitePool,
    /// Path to the on-disk database file. `None` for in-memory databases.
    db_path: Option<PathBuf>,
}

impl Database {
    /// Connect to SQLite database with optimized settings
    pub async fn connect(path: &std::path::Path) -> Result<Self, sqlx::Error> {
        // Ensure parent directory exists
        if let Some(parent) = path
            .parent()
            .filter(|parent| !parent.as_os_str().is_empty())
        {
            let parent_existed = parent.exists();
            let parent_result = if parent_existed {
                std::fs::create_dir_all(parent)
            } else {
                crate::platforms::ensure_private_dir(parent)
            };

            parent_result.map_err(|e| {
                tracing::warn!(
                    error_kind = ?e.kind(),
                    "Failed to create database directory"
                );
                sqlx::Error::Io(e)
            })?;
        }

        let url = format!("sqlite://{}?mode=rwc", path.display());
        let pool = SqlitePool::connect(&url).await?;

        // Configure SQLite for better integrity and performance
        Self::configure_pragmas(&pool).await?;
        crate::platforms::ensure_private_sqlite_files(path).map_err(sqlx::Error::Io)?;

        Ok(Database {
            pool,
            db_path: Some(path.to_path_buf()),
        })
    }

    /// Configure SQLite PRAGMA settings for performance and integrity.
    async fn configure_pragmas(pool: &SqlitePool) -> Result<(), sqlx::Error> {
        tracing::info!("Configuring SQLite with integrity and performance settings");

        // ============================================================
        // JOURNAL & TRANSACTION SETTINGS
        // ============================================================

        // Enable WAL mode for better crash recovery and concurrent read/write access
        // WAL = Write-Ahead Logging, allows readers to access DB while writer commits
        sqlx::query("PRAGMA journal_mode = WAL")
            .execute(pool)
            .await?;
        tracing::debug!("WAL mode enabled");

        // Set synchronous mode (NORMAL = good balance between safety and speed)
        // FULL = fsync after every write (safest, slowest)
        // NORMAL = fsync at critical moments (good balance used here)
        // OFF = no fsync (fastest, risky - data loss on crash)
        sqlx::query("PRAGMA synchronous = NORMAL")
            .execute(pool)
            .await?;
        tracing::debug!("Synchronous = NORMAL (balanced safety)");

        // Automatic WAL checkpointing every 1000 pages (~4MB with default page size)
        // Prevents WAL from growing too large
        sqlx::query("PRAGMA wal_autocheckpoint = 1000")
            .execute(pool)
            .await?;
        tracing::debug!("WAL autocheckpoint = 1000 pages");

        // ============================================================
        // INTEGRITY & SECURITY SETTINGS
        // ============================================================

        // CRITICAL: Enable foreign key constraints
        sqlx::query("PRAGMA foreign_keys = ON")
            .execute(pool)
            .await?;
        tracing::debug!("Foreign keys enforced");

        // Enforce immediate foreign key constraint checking (no deferring)
        sqlx::query("PRAGMA defer_foreign_keys = OFF")
            .execute(pool)
            .await?;
        tracing::debug!("Immediate foreign key checks");

        // Verify B-tree cell sizes for corruption detection
        sqlx::query("PRAGMA cell_size_check = ON")
            .execute(pool)
            .await?;
        tracing::debug!("Cell size verification enabled");

        // Enable checksum verification (requires SQLite 3.37+, ignore if not supported)
        if sqlx::query("PRAGMA checksum_verification = ON")
            .execute(pool)
            .await
            .is_ok()
        {
            tracing::debug!("  - Checksum verification enabled (SQLite 3.37+)");
        } else {
            tracing::debug!("  - Checksum verification not supported (SQLite < 3.37)");
        }

        // Disable potentially unsafe schema features (SQLite 3.31+)
        // Prevents malicious SQL from being executed via schema
        if sqlx::query("PRAGMA trusted_schema = OFF")
            .execute(pool)
            .await
            .is_ok()
        {
            tracing::debug!("  - Trusted schema disabled (SQLite 3.31+)");
        } else {
            tracing::debug!("  - Trusted schema setting not supported (SQLite < 3.31)");
        }

        // Enable secure delete - overwrites deleted content with zeros
        // Slower but prevents data recovery from deleted records
        // Set to FAST (overwrite free pages but not individual deleted rows)
        // Options: ON (slow, max security), FAST (balanced), OFF (fast, less secure)
        sqlx::query("PRAGMA secure_delete = FAST")
            .execute(pool)
            .await?;
        tracing::debug!("Secure delete = FAST (balanced security)");

        // Help detect code relying on undefined ordering (useful for testing)
        // Can be disabled in production if needed for performance
        #[cfg(debug_assertions)]
        {
            sqlx::query("PRAGMA reverse_unordered_selects = ON")
                .execute(pool)
                .await
                .ok();
            tracing::debug!("Reverse unordered selects enabled (debug mode)");
        }

        // ============================================================
        // PERFORMANCE SETTINGS
        // ============================================================

        // Set cache size to 128MB (negative = kilobytes, positive = pages)
        // Larger cache = fewer disk reads = faster queries
        // Using 128MB to ensure we have AT LEAST 64MB (with 2x safety margin)
        sqlx::query("PRAGMA cache_size = -128000")
            .execute(pool)
            .await?;
        tracing::debug!("Cache size = 128MB (at least 64MB required)");

        // Use memory for temporary tables and indices (much faster)
        // Options: DEFAULT (disk), FILE (disk), MEMORY (RAM). We use MEMORY.
        sqlx::query("PRAGMA temp_store = MEMORY")
            .execute(pool)
            .await?;
        tracing::debug!("Temp store = MEMORY");

        // Enable memory-mapped I/O for faster reads (256MB)
        // Reads from memory instead of system calls
        // Set to 0 to disable if causing issues
        sqlx::query("PRAGMA mmap_size = 268435456")
            .execute(pool)
            .await?;
        tracing::debug!("Memory-mapped I/O = 256MB");

        // Set locking mode to NORMAL (allows multiple connections)
        // Options: NORMAL (multi-connection), EXCLUSIVE (single connection, faster)
        sqlx::query("PRAGMA locking_mode = NORMAL")
            .execute(pool)
            .await?;
        tracing::debug!("Locking mode = NORMAL (multi-connection)");

        // Set busy timeout (wait up to 5 seconds for lock before failing)
        // Prevents immediate failures when DB is locked by another connection
        sqlx::query("PRAGMA busy_timeout = 5000")
            .execute(pool)
            .await?;
        tracing::debug!("Busy timeout = 5000ms");

        // Set page size to 4096 bytes (optimal for most systems)
        // MUST be set before any tables are created (only affects new databases)
        // Common page sizes: 1024, 2048, 4096, 8192, 16384, 32768
        sqlx::query("PRAGMA page_size = 4096")
            .execute(pool)
            .await
            .ok(); // Ignore errors (can't change after DB created)
        tracing::debug!("Page size = 4096 bytes (if new DB)");

        // ============================================================
        // VACUUM & SPACE MANAGEMENT
        // ============================================================

        // Enable auto_vacuum for automatic space reclamation
        // Options: NONE (manual), FULL (auto shrink), INCREMENTAL (auto but controlled)
        sqlx::query("PRAGMA auto_vacuum = INCREMENTAL")
            .execute(pool)
            .await?;
        tracing::debug!("Auto vacuum = INCREMENTAL");

        // Run incremental vacuum to reclaim some free pages immediately
        // Argument = number of pages to free (0 = free all)
        sqlx::query("PRAGMA incremental_vacuum(100)")
            .execute(pool)
            .await
            .ok(); // Ignore errors if no pages to free
        tracing::debug!("Incremental vacuum attempted (100 pages)");

        // ============================================================
        // APPLICATION METADATA
        // ============================================================

        // Set application ID (unique identifier for JobSentinel)
        // Helps identify database files in forensic analysis
        // Using ASCII "JSDB" = 0x4A534442
        sqlx::query("PRAGMA application_id = 1246979138")
            .execute(pool)
            .await?;
        tracing::debug!("Application ID set (JSDB)");

        // Set user version (complementary to migrations)
        // We'll use this to track major schema versions
        const SCHEMA_VERSION: i64 = 2; // Bumped with integrity tables
        sqlx::query("PRAGMA user_version = 2").execute(pool).await?;
        tracing::debug!("User version = {}", SCHEMA_VERSION);

        // ============================================================
        // QUERY OPTIMIZER
        // ============================================================

        // Run query optimizer analysis to update statistics
        // Helps SQLite choose better query plans
        sqlx::query("PRAGMA optimize").execute(pool).await?;
        tracing::debug!("Query optimizer statistics updated");

        // ============================================================
        // DIAGNOSTIC INFO (logged at startup)
        // ============================================================

        // Log SQLite compile options (useful for debugging)
        if let Ok(rows) = sqlx::query("PRAGMA compile_options").fetch_all(pool).await {
            let options: Vec<String> = rows
                .iter()
                .filter_map(|row| row.try_get::<String, _>(0).ok())
                .collect();
            tracing::debug!("SQLite compile options: {} features", options.len());

            // Check for important features
            let has_fts5 = options.iter().any(|opt| opt.contains("FTS5"));
            let has_json = options.iter().any(|opt| opt.contains("JSON"));
            let has_rtree = options.iter().any(|opt| opt.contains("RTREE"));

            if has_fts5 {
                tracing::debug!("FTS5 full-text search available");
            }
            if has_json {
                tracing::debug!("JSON1 extension available");
            }
            if has_rtree {
                tracing::debug!("R*Tree spatial index available");
            }
        }

        // Log SQLite version
        if let Ok(row) = sqlx::query("SELECT sqlite_version()").fetch_one(pool).await {
            if let Ok(version) = row.try_get::<String, _>(0) {
                tracing::info!("SQLite version: {}", version);
            }
        }

        // ============================================================
        // VALIDATION: Verify Critical Settings
        // ============================================================

        // Verify cache size is AT LEAST 64MB
        if let Ok(row) = sqlx::query("PRAGMA cache_size").fetch_one(pool).await {
            if let Ok(cache_size) = row.try_get::<i64, _>(0) {
                let actual_mb = if cache_size < 0 {
                    // Negative = kilobytes
                    cache_size.abs() / 1024
                } else {
                    // Positive = pages (4KB each typically)
                    cache_size * 4 / 1024
                };

                if actual_mb >= 64 {
                    tracing::debug!("Cache size verified: {}MB (>= 64MB)", actual_mb);
                } else {
                    tracing::warn!("Cache size only {}MB (< 64MB minimum)", actual_mb);
                }
            }
        }

        // Verify WAL mode is actually enabled
        if let Ok(row) = sqlx::query("PRAGMA journal_mode").fetch_one(pool).await {
            if let Ok(mode) = row.try_get::<String, _>(0) {
                if mode.eq_ignore_ascii_case("wal") {
                    tracing::debug!("WAL mode verified");
                } else {
                    tracing::error!("WAL mode not enabled (got: {})", mode);
                }
            }
        }

        // Verify foreign keys are enforced
        if let Ok(row) = sqlx::query("PRAGMA foreign_keys").fetch_one(pool).await {
            if let Ok(enabled) = row.try_get::<i64, _>(0) {
                if enabled == 1 {
                    tracing::debug!("Foreign keys verified");
                } else {
                    tracing::error!("Foreign keys not enabled");
                }
            }
        }

        tracing::info!("Database configured with integrity and performance settings");
        Ok(())
    }

    /// Run database migrations
    ///
    /// Before applying migrations, creates a timestamped backup of the database
    /// file (if one already exists on disk) so that a failed migration can be
    /// recovered. The backup is placed in [`Database::default_backup_dir()`] and
    /// named `backup_pre_migration_YYYYMMDD_HHMMSS.db`. Only the 5 most recent
    /// pre-migration backups are kept; older ones are pruned automatically.
    ///
    /// A backup failure is logged as a warning but never aborts the migration —
    /// a missing backup is better than refusing to migrate.
    pub async fn migrate(&self) -> Result<(), sqlx::Error> {
        // Only attempt a backup when we have a real on-disk database that has
        // already been migrated at least once (i.e. not a fresh install).
        if let Some(db_path) = &self.db_path {
            let is_existing_db = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='_sqlx_migrations'",
            )
            .fetch_one(&self.pool)
            .await
            .unwrap_or(0)
                > 0;

            if is_existing_db {
                if let Err(_e) = Self::backup_pre_migration(&self.pool, db_path).await {
                    tracing::warn!("Pre-migration backup failed; migration will continue");
                }
            }
        }

        sqlx::migrate!("./migrations").run(&self.pool).await?;
        if let Some(db_path) = &self.db_path {
            crate::platforms::ensure_private_sqlite_files(db_path).map_err(sqlx::Error::Io)?;
        }
        Ok(())
    }

    /// Create a timestamped `backup_pre_migration_YYYYMMDD_HHMMSS_mmm.db`
    /// SQLite snapshot of
    /// the database file, then prune old pre-migration backups so that at most
    /// [`PRE_MIGRATION_BACKUP_KEEP`] copies are retained.
    async fn backup_pre_migration(
        pool: &SqlitePool,
        db_path: &std::path::Path,
    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        Self::backup_pre_migration_to_dir(pool, db_path, &Self::default_backup_dir())
            .await
            .map(|_| ())
    }

    async fn backup_pre_migration_to_dir(
        pool: &SqlitePool,
        db_path: &std::path::Path,
        backup_dir: &std::path::Path,
    ) -> Result<Option<std::path::PathBuf>, Box<dyn std::error::Error + Send + Sync>> {
        /// Maximum number of pre-migration backups to retain.
        const PRE_MIGRATION_BACKUP_KEEP: usize = 5;

        if !db_path.exists() {
            // Nothing to back up (fresh database that hasn't been written yet).
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
        tracing::info!(
            backup_path = %path_label_for_logging(&backup_path),
            "Pre-migration backup created"
        );

        // Prune pre-migration backups beyond the keep limit.
        Self::prune_pre_migration_backups(backup_dir, PRE_MIGRATION_BACKUP_KEEP);

        Ok(Some(backup_path))
    }

    /// Delete old `backup_pre_migration_*.db` files, keeping the `keep` newest.
    fn prune_pre_migration_backups(backup_dir: &std::path::Path, keep: usize) {
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

    /// Connect to in-memory SQLite database (for testing)
    /// Available in test builds and for integration tests
    pub async fn connect_memory() -> Result<Self, sqlx::Error> {
        let pool = SqlitePool::connect("sqlite::memory:").await?;
        // Apply pragmas that are compatible with in-memory SQLite.
        // WAL journal mode, mmap_size, auto_vacuum, and WAL checkpointing
        // do not work with in-memory databases and are intentionally skipped.
        Self::configure_memory_pragmas(&pool).await?;
        Ok(Database {
            pool,
            db_path: None,
        })
    }

    /// Configure SQLite PRAGMA settings compatible with in-memory databases (tests).
    ///
    /// Applies the same integrity and performance settings as [`configure_pragmas`]
    /// except for features that require a real file (WAL, mmap, auto_vacuum).
    /// Most importantly, this enables `foreign_keys = ON` so that FK violations
    /// are caught in tests the same way they would be in production.
    async fn configure_memory_pragmas(pool: &SqlitePool) -> Result<(), sqlx::Error> {
        // INTEGRITY: Enable foreign key constraints — the main reason this exists.
        sqlx::query("PRAGMA foreign_keys = ON")
            .execute(pool)
            .await?;

        // INTEGRITY: Enforce immediate FK checking (no deferring).
        sqlx::query("PRAGMA defer_foreign_keys = OFF")
            .execute(pool)
            .await?;

        // INTEGRITY: Cell size verification for corruption detection.
        sqlx::query("PRAGMA cell_size_check = ON")
            .execute(pool)
            .await?;

        // JOURNAL: Use DELETE mode — WAL requires a real file and does not
        // work with sqlite::memory: connections.
        sqlx::query("PRAGMA journal_mode = DELETE")
            .execute(pool)
            .await?;

        // PERFORMANCE: Synchronous = NORMAL (balanced; no fsync cost for in-memory anyway).
        sqlx::query("PRAGMA synchronous = NORMAL")
            .execute(pool)
            .await?;

        // PERFORMANCE: Keep temp tables in memory.
        sqlx::query("PRAGMA temp_store = MEMORY")
            .execute(pool)
            .await?;

        // PERFORMANCE: 32MB cache for test databases (enough without wasting memory).
        sqlx::query("PRAGMA cache_size = -32000")
            .execute(pool)
            .await?;

        // LOCKING: Wait up to 5 s before failing on a locked database.
        sqlx::query("PRAGMA busy_timeout = 5000")
            .execute(pool)
            .await?;

        // DEBUG: Randomise result order to surface implicit ORDER BY dependencies.
        #[cfg(debug_assertions)]
        {
            sqlx::query("PRAGMA reverse_unordered_selects = ON")
                .execute(pool)
                .await
                .ok();
        }

        tracing::debug!("In-memory SQLite configured (FK enforcement ON)");
        Ok(())
    }

    /// Get reference to the connection pool (for integrity checks and backups)
    #[must_use]
    pub const fn pool(&self) -> &SqlitePool {
        &self.pool
    }

    /// Get default database path
    #[must_use]
    pub fn default_path() -> PathBuf {
        crate::platforms::get_data_dir().join("jobs.db")
    }

    /// Get default backup directory path
    #[must_use]
    pub fn default_backup_dir() -> PathBuf {
        crate::platforms::get_data_dir().join("backups")
    }

    /// Create Database from an existing pool (for testing/advanced use cases)
    #[doc(hidden)]
    #[must_use]
    pub fn from_pool(pool: SqlitePool) -> Self {
        Database {
            pool,
            db_path: None,
        }
    }

    /// Run ANALYZE to update query planner statistics
    ///
    /// Should be run periodically (daily or after bulk inserts) to keep
    /// query plans optimal. This helps SQLite choose the best indexes.
    pub async fn analyze(&self) -> Result<(), sqlx::Error> {
        sqlx::query("ANALYZE").execute(&self.pool).await?;
        tracing::info!("Updated query planner statistics");
        Ok(())
    }

    /// Run PRAGMA optimize to maintain database performance
    ///
    /// Should be run periodically (daily) to keep internal structures optimized.
    /// This is a lightweight operation that SQLite uses to maintain performance.
    pub async fn optimize(&self) -> Result<(), sqlx::Error> {
        sqlx::query("PRAGMA optimize").execute(&self.pool).await?;
        tracing::info!("Optimized database structures");
        Ok(())
    }

    /// Get database size in bytes
    pub async fn database_size(&self) -> Result<i64, sqlx::Error> {
        let size: i64 = sqlx::query_scalar(
            "SELECT page_count * page_size FROM pragma_page_count(), pragma_page_size()",
        )
        .fetch_one(&self.pool)
        .await?;
        Ok(size)
    }

    /// Get WAL (Write-Ahead Log) size in pages
    pub async fn wal_size(&self) -> Result<i64, sqlx::Error> {
        let size: i64 = sqlx::query_scalar("PRAGMA wal_checkpoint(PASSIVE)")
            .fetch_one(&self.pool)
            .await?;
        Ok(size)
    }

    /// Checkpoint the WAL to reclaim space
    ///
    /// This merges the WAL file back into the main database file.
    /// Use this periodically if the WAL grows too large.
    pub async fn checkpoint_wal(&self) -> Result<(), sqlx::Error> {
        sqlx::query("PRAGMA wal_checkpoint(TRUNCATE)")
            .execute(&self.pool)
            .await?;
        tracing::info!("Checkpointed WAL file");
        Ok(())
    }
}

#[cfg(test)]
mod backup_tests {
    use super::*;

    #[tokio::test]
    async fn pre_migration_backup_captures_committed_wal_data() {
        let temp_dir = tempfile::tempdir().unwrap();
        let db_path = temp_dir.path().join("jobs.db");
        let backup_dir = temp_dir.path().join("backups");
        let database = Database::connect(&db_path).await.unwrap();

        sqlx::query("CREATE TABLE qa_wal_capture (id INTEGER PRIMARY KEY, note TEXT NOT NULL)")
            .execute(database.pool())
            .await
            .unwrap();
        sqlx::query("INSERT INTO qa_wal_capture (note) VALUES ('saved in wal')")
            .execute(database.pool())
            .await
            .unwrap();

        let backup_path =
            Database::backup_pre_migration_to_dir(database.pool(), &db_path, &backup_dir)
                .await
                .unwrap()
                .expect("existing database should create pre-migration backup");

        let backup_url = format!("sqlite://{}", backup_path.display());
        let backup_pool = SqlitePool::connect(&backup_url).await.unwrap();
        let note: String = sqlx::query_scalar("SELECT note FROM qa_wal_capture WHERE id = 1")
            .fetch_one(&backup_pool)
            .await
            .unwrap();

        assert_eq!(note, "saved in wal");
    }
}

#[cfg(all(test, unix))]
mod permission_tests {
    use super::*;
    use std::fs;
    use std::os::unix::fs::PermissionsExt;

    fn mode(path: &std::path::Path) -> u32 {
        fs::metadata(path).unwrap().permissions().mode() & 0o777
    }

    #[tokio::test]
    async fn connect_creates_private_database_directory_and_files() {
        let temp_dir = tempfile::tempdir().unwrap();
        let data_dir = temp_dir.path().join("JobSentinel");
        let db_path = data_dir.join("jobs.db");

        let database = Database::connect(&db_path).await.unwrap();

        assert_eq!(mode(&data_dir), 0o700);
        assert_eq!(mode(&db_path), 0o600);
        if data_dir.join("jobs.db-wal").exists() {
            assert_eq!(mode(&data_dir.join("jobs.db-wal")), 0o600);
        }
        if data_dir.join("jobs.db-shm").exists() {
            assert_eq!(mode(&data_dir.join("jobs.db-shm")), 0o600);
        }

        drop(database);
    }

    #[tokio::test]
    async fn connect_does_not_chmod_existing_arbitrary_parent_directory() {
        let temp_dir = tempfile::tempdir().unwrap();
        let data_dir = temp_dir.path().join("external-parent");
        fs::create_dir_all(&data_dir).unwrap();
        fs::set_permissions(&data_dir, fs::Permissions::from_mode(0o755)).unwrap();

        let db_path = data_dir.join("jobs.db");
        fs::write(&db_path, []).unwrap();
        fs::set_permissions(&db_path, fs::Permissions::from_mode(0o644)).unwrap();

        let database = Database::connect(&db_path).await.unwrap();

        assert_eq!(mode(&data_dir), 0o755);
        assert_eq!(mode(&db_path), 0o600);

        drop(database);
    }
}
