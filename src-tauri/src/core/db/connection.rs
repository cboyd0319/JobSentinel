//! Database connection and configuration
//!
//! Handles SQLite connection, PRAGMA configuration, and migrations.

use sqlx::{sqlite::SqlitePool, Row};
use std::path::PathBuf;

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
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| {
                tracing::warn!("Failed to create database directory: {}", e);
                sqlx::Error::Io(e)
            })?;
        }

        let url = format!("sqlite://{}?mode=rwc", path.display());
        let pool = SqlitePool::connect(&url).await?;

        // Configure SQLite for better integrity and performance
        Self::configure_pragmas(&pool).await?;

        Ok(Database {
            pool,
            db_path: Some(path.to_path_buf()),
        })
    }

    /// Configure SQLite PRAGMA settings for MAXIMUM performance and integrity
    async fn configure_pragmas(pool: &SqlitePool) -> Result<(), sqlx::Error> {
        tracing::info!("🔧 Configuring SQLite with maximum protections and performance...");

        // ============================================================
        // JOURNAL & TRANSACTION SETTINGS
        // ============================================================

        // Enable WAL mode for better crash recovery and concurrent read/write access
        // WAL = Write-Ahead Logging, allows readers to access DB while writer commits
        sqlx::query("PRAGMA journal_mode = WAL")
            .execute(pool)
            .await?;
        tracing::debug!("  ✓ WAL mode enabled");

        // Set synchronous mode (NORMAL = good balance between safety and speed)
        // FULL = fsync after every write (safest, slowest)
        // NORMAL = fsync at critical moments (good balance) ← WE USE THIS
        // OFF = no fsync (fastest, risky - data loss on crash)
        sqlx::query("PRAGMA synchronous = NORMAL")
            .execute(pool)
            .await?;
        tracing::debug!("  ✓ Synchronous = NORMAL (balanced safety)");

        // Automatic WAL checkpointing every 1000 pages (~4MB with default page size)
        // Prevents WAL from growing too large
        sqlx::query("PRAGMA wal_autocheckpoint = 1000")
            .execute(pool)
            .await?;
        tracing::debug!("  ✓ WAL autocheckpoint = 1000 pages");

        // ============================================================
        // INTEGRITY & SECURITY SETTINGS
        // ============================================================

        // CRITICAL: Enable foreign key constraints
        sqlx::query("PRAGMA foreign_keys = ON")
            .execute(pool)
            .await?;
        tracing::debug!("  ✓ Foreign keys enforced");

        // Enforce immediate foreign key constraint checking (no deferring)
        sqlx::query("PRAGMA defer_foreign_keys = OFF")
            .execute(pool)
            .await?;
        tracing::debug!("  ✓ Immediate foreign key checks");

        // Verify B-tree cell sizes for corruption detection
        sqlx::query("PRAGMA cell_size_check = ON")
            .execute(pool)
            .await?;
        tracing::debug!("  ✓ Cell size verification enabled");

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
        tracing::debug!("  ✓ Secure delete = FAST (balanced security)");

        // Help detect code relying on undefined ordering (useful for testing)
        // Can be disabled in production if needed for performance
        #[cfg(debug_assertions)]
        {
            sqlx::query("PRAGMA reverse_unordered_selects = ON")
                .execute(pool)
                .await
                .ok();
            tracing::debug!("  ✓ Reverse unordered selects (debug mode)");
        }

        // ============================================================
        // PERFORMANCE SETTINGS
        // ============================================================

        // Set cache size to 128MB (negative = kilobytes, positive = pages)
        // Larger cache = fewer disk reads = faster queries
        // Using 128MB to ensure we have AT LEAST 64MB (with 2x safety margin)
        const CACHE_SIZE_KB: i64 = -128000; // 128MB in kilobytes
        sqlx::query(&format!("PRAGMA cache_size = {}", CACHE_SIZE_KB))
            .execute(pool)
            .await?;
        tracing::debug!("  ✓ Cache size = 128MB (AT LEAST 64MB guaranteed)");

        // Use memory for temporary tables and indices (much faster)
        // Options: DEFAULT (disk), FILE (disk), MEMORY (RAM) ← WE USE THIS
        sqlx::query("PRAGMA temp_store = MEMORY")
            .execute(pool)
            .await?;
        tracing::debug!("  ✓ Temp store = MEMORY");

        // Enable memory-mapped I/O for faster reads (256MB)
        // Reads from memory instead of system calls
        // Set to 0 to disable if causing issues
        sqlx::query("PRAGMA mmap_size = 268435456")
            .execute(pool)
            .await?;
        tracing::debug!("  ✓ Memory-mapped I/O = 256MB");

        // Set locking mode to NORMAL (allows multiple connections)
        // Options: NORMAL (multi-connection), EXCLUSIVE (single connection, faster)
        sqlx::query("PRAGMA locking_mode = NORMAL")
            .execute(pool)
            .await?;
        tracing::debug!("  ✓ Locking mode = NORMAL (multi-connection)");

        // Set busy timeout (wait up to 5 seconds for lock before failing)
        // Prevents immediate failures when DB is locked by another connection
        sqlx::query("PRAGMA busy_timeout = 5000")
            .execute(pool)
            .await?;
        tracing::debug!("  ✓ Busy timeout = 5000ms");

        // Set page size to 4096 bytes (optimal for most systems)
        // MUST be set before any tables are created (only affects new databases)
        // Common page sizes: 1024, 2048, 4096, 8192, 16384, 32768
        sqlx::query("PRAGMA page_size = 4096")
            .execute(pool)
            .await
            .ok(); // Ignore errors (can't change after DB created)
        tracing::debug!("  ✓ Page size = 4096 bytes (if new DB)");

        // ============================================================
        // VACUUM & SPACE MANAGEMENT
        // ============================================================

        // Enable auto_vacuum for automatic space reclamation
        // Options: NONE (manual), FULL (auto shrink), INCREMENTAL (auto but controlled)
        sqlx::query("PRAGMA auto_vacuum = INCREMENTAL")
            .execute(pool)
            .await?;
        tracing::debug!("  ✓ Auto vacuum = INCREMENTAL");

        // Run incremental vacuum to reclaim some free pages immediately
        // Argument = number of pages to free (0 = free all)
        sqlx::query("PRAGMA incremental_vacuum(100)")
            .execute(pool)
            .await
            .ok(); // Ignore errors if no pages to free
        tracing::debug!("  ✓ Incremental vacuum (100 pages)");

        // ============================================================
        // APPLICATION METADATA
        // ============================================================

        // Set application ID (unique identifier for JobSentinel)
        // Helps identify database files in forensic analysis
        // Using ASCII "JSDB" = 0x4A534442
        const JOBSENTINEL_APP_ID: i64 = 0x4A534442;
        sqlx::query(&format!("PRAGMA application_id = {}", JOBSENTINEL_APP_ID))
            .execute(pool)
            .await?;
        tracing::debug!("  ✓ Application ID set (JSDB)");

        // Set user version (complementary to migrations)
        // We'll use this to track major schema versions
        const SCHEMA_VERSION: i64 = 2; // Bumped with integrity tables
        sqlx::query(&format!("PRAGMA user_version = {}", SCHEMA_VERSION))
            .execute(pool)
            .await?;
        tracing::debug!("  ✓ User version = {}", SCHEMA_VERSION);

        // ============================================================
        // QUERY OPTIMIZER
        // ============================================================

        // Run query optimizer analysis to update statistics
        // Helps SQLite choose better query plans
        sqlx::query("PRAGMA optimize").execute(pool).await?;
        tracing::debug!("  ✓ Query optimizer statistics updated");

        // ============================================================
        // DIAGNOSTIC INFO (logged at startup)
        // ============================================================

        // Log SQLite compile options (useful for debugging)
        if let Ok(rows) = sqlx::query("PRAGMA compile_options").fetch_all(pool).await {
            let options: Vec<String> = rows
                .iter()
                .filter_map(|row| row.try_get::<String, _>(0).ok())
                .collect();
            tracing::debug!("  📋 SQLite compile options: {} features", options.len());

            // Check for important features
            let has_fts5 = options.iter().any(|opt| opt.contains("FTS5"));
            let has_json = options.iter().any(|opt| opt.contains("JSON"));
            let has_rtree = options.iter().any(|opt| opt.contains("RTREE"));

            if has_fts5 {
                tracing::debug!("    ✓ FTS5 full-text search available");
            }
            if has_json {
                tracing::debug!("    ✓ JSON1 extension available");
            }
            if has_rtree {
                tracing::debug!("    ✓ R*Tree spatial index available");
            }
        }

        // Log SQLite version
        if let Ok(row) = sqlx::query("SELECT sqlite_version()").fetch_one(pool).await {
            if let Ok(version) = row.try_get::<String, _>(0) {
                tracing::info!("  📦 SQLite version: {}", version);
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
                    tracing::debug!("  ✓ Cache size verified: {}MB (>= 64MB ✅)", actual_mb);
                } else {
                    tracing::warn!("  ⚠️  Cache size only {}MB (< 64MB minimum!)", actual_mb);
                }
            }
        }

        // Verify WAL mode is actually enabled
        if let Ok(row) = sqlx::query("PRAGMA journal_mode").fetch_one(pool).await {
            if let Ok(mode) = row.try_get::<String, _>(0) {
                if mode.eq_ignore_ascii_case("wal") {
                    tracing::debug!("  ✓ WAL mode verified ✅");
                } else {
                    tracing::error!("  ❌ WAL mode NOT enabled (got: {})", mode);
                }
            }
        }

        // Verify foreign keys are enforced
        if let Ok(row) = sqlx::query("PRAGMA foreign_keys").fetch_one(pool).await {
            if let Ok(enabled) = row.try_get::<i64, _>(0) {
                if enabled == 1 {
                    tracing::debug!("  ✓ Foreign keys verified ✅");
                } else {
                    tracing::error!("  ❌ Foreign keys NOT enabled!");
                }
            }
        }

        tracing::info!("✅ Database configured with MAXIMUM protections and performance");
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
                if let Err(e) = Self::backup_pre_migration(db_path) {
                    tracing::warn!(
                        "Pre-migration backup failed (migration will continue): {}",
                        e
                    );
                }
            }
        }

        sqlx::migrate!("./migrations").run(&self.pool).await?;
        Ok(())
    }

    /// Create a timestamped `backup_pre_migration_YYYYMMDD_HHMMSS.db` copy of
    /// the database file, then prune old pre-migration backups so that at most
    /// [`PRE_MIGRATION_BACKUP_KEEP`] copies are retained.
    fn backup_pre_migration(db_path: &std::path::Path) -> Result<(), Box<dyn std::error::Error>> {
        /// Maximum number of pre-migration backups to retain.
        const PRE_MIGRATION_BACKUP_KEEP: usize = 5;

        if !db_path.exists() {
            // Nothing to back up (fresh database that hasn't been written yet).
            return Ok(());
        }

        let backup_dir = Self::default_backup_dir();
        std::fs::create_dir_all(&backup_dir)?;

        let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
        let backup_name = format!("backup_pre_migration_{}.db", timestamp);
        let backup_path = backup_dir.join(&backup_name);

        std::fs::copy(db_path, &backup_path)?;
        tracing::info!(
            "Pre-migration backup created: {}",
            backup_path.display()
        );

        // Prune pre-migration backups beyond the keep limit.
        Self::prune_pre_migration_backups(&backup_dir, PRE_MIGRATION_BACKUP_KEEP);

        Ok(())
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
                tracing::warn!("Could not read backup directory for pruning: {}", e);
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
                    "Failed to delete old pre-migration backup {}: {}",
                    entry.path().display(),
                    e
                );
            } else {
                tracing::info!(
                    "Pruned old pre-migration backup: {}",
                    entry.path().display()
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
