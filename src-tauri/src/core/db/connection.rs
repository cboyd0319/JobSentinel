//! Database connection and configuration
//!
//! Handles SQLite connection, PRAGMA configuration, and migrations.

use sqlx::{sqlite::SqlitePool, Row};
use std::path::PathBuf;

/// Database handle
#[derive(Debug)]
pub struct Database {
    pool: SqlitePool,
}

impl Database {
    /// Connect to SQLite database with optimized settings
    #[must_use]
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

        Ok(Database { pool })
    }

    /// Configure SQLite PRAGMA settings for MAXIMUM performance and integrity
    #[must_use]
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
    #[must_use]
    pub async fn migrate(&self) -> Result<(), sqlx::Error> {
        sqlx::migrate!("./migrations").run(&self.pool).await?;
        Ok(())
    }

    /// Connect to in-memory SQLite database (for testing)
    /// Available in test builds and for integration tests
    #[must_use]
    pub async fn connect_memory() -> Result<Self, sqlx::Error> {
        let pool = SqlitePool::connect("sqlite::memory:").await?;
        Ok(Database { pool })
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
    pub const fn from_pool(pool: SqlitePool) -> Self {
        Database { pool }
    }

    /// Run ANALYZE to update query planner statistics
    ///
    /// Should be run periodically (daily or after bulk inserts) to keep
    /// query plans optimal. This helps SQLite choose the best indexes.
    #[must_use]
    pub async fn analyze(&self) -> Result<(), sqlx::Error> {
        sqlx::query("ANALYZE").execute(&self.pool).await?;
        tracing::info!("Updated query planner statistics");
        Ok(())
    }

    /// Run PRAGMA optimize to maintain database performance
    ///
    /// Should be run periodically (daily) to keep internal structures optimized.
    /// This is a lightweight operation that SQLite uses to maintain performance.
    #[must_use]
    pub async fn optimize(&self) -> Result<(), sqlx::Error> {
        sqlx::query("PRAGMA optimize").execute(&self.pool).await?;
        tracing::info!("Optimized database structures");
        Ok(())
    }

    /// Get database size in bytes
    #[must_use]
    pub async fn database_size(&self) -> Result<i64, sqlx::Error> {
        let size: i64 = sqlx::query_scalar("SELECT page_count * page_size FROM pragma_page_count(), pragma_page_size()")
            .fetch_one(&self.pool)
            .await?;
        Ok(size)
    }

    /// Get WAL (Write-Ahead Log) size in pages
    #[must_use]
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
    #[must_use]
    pub async fn checkpoint_wal(&self) -> Result<(), sqlx::Error> {
        sqlx::query("PRAGMA wal_checkpoint(TRUNCATE)")
            .execute(&self.pool)
            .await?;
        tracing::info!("Checkpointed WAL file");
        Ok(())
    }
}
