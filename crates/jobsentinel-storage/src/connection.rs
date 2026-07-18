//! Database connection and configuration
//!
//! Handles SQLite connection, PRAGMA configuration, and migrations.

mod backups;

use sqlx::{
    sqlite::{SqlitePool, SqlitePoolOptions},
    Row,
};
use std::path::PathBuf;

use super::encryption::{
    connect_encrypted_pool, encrypt_plaintext_database, load_or_create_database_key,
    plaintext_database_readable,
};

/// Database handle
#[derive(Debug)]
pub struct Database {
    pool: SqlitePool,
    /// Path to the on-disk database file. `None` for in-memory databases.
    db_path: Option<PathBuf>,
}

impl Database {
    /// Create the bounded encrypted-credential repository for this database.
    #[must_use]
    pub fn credentials(&self) -> crate::CredentialRepository {
        crate::CredentialRepository::new(self.pool.clone())
    }

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
                jobsentinel_platform::ensure_private_dir(parent)
            };

            parent_result.map_err(|e| {
                tracing::warn!(
                    error_kind = ?e.kind(),
                    "Failed to create database directory"
                );
                sqlx::Error::Io(e)
            })?;
        }

        let key = load_or_create_database_key().await?;
        let pool = match connect_encrypted_pool(path, &key, true).await {
            Ok(pool) => pool,
            Err(error) => {
                if path.exists() && plaintext_database_readable(path).await.unwrap_or(false) {
                    let backup_dir = path
                        .parent()
                        .filter(|parent| !parent.as_os_str().is_empty())
                        .map(|parent| parent.join("backups"))
                        .unwrap_or_else(Self::default_backup_dir);
                    encrypt_plaintext_database(path, &key, &backup_dir).await?;
                    connect_encrypted_pool(path, &key, true).await?
                } else {
                    return Err(error);
                }
            }
        };

        // Configure database-persistent settings and validate the connection.
        Self::configure_database(&pool).await?;
        jobsentinel_platform::ensure_private_sqlite_files(path).map_err(sqlx::Error::Io)?;

        Ok(Database {
            pool,
            db_path: Some(path.to_path_buf()),
        })
    }

    /// Configure database-persistent settings and log connection diagnostics.
    async fn configure_database(pool: &SqlitePool) -> Result<(), sqlx::Error> {
        const SCHEMA_VERSION: i64 = 2;

        tracing::info!("Configuring SQLite database");

        let stored_version: i64 = sqlx::query_scalar("PRAGMA user_version")
            .fetch_one(pool)
            .await?;
        if stored_version > SCHEMA_VERSION {
            return Err(sqlx::Error::Protocol(
                format!(
                    "Unsupported newer database schema version {stored_version}; this app supports through version {SCHEMA_VERSION}"
                )
                .into(),
            ));
        }

        // Set page size to 4096 bytes (optimal for most systems)
        // MUST be set before any tables are created (only affects new databases)
        // Common page sizes: 1024, 2048, 4096, 8192, 16384, 32768
        sqlx::query("PRAGMA page_size = 4096")
            .execute(pool)
            .await
            .ok(); // Ignore errors (can't change after DB created)
        tracing::debug!("Page size = 4096 bytes (if new DB)");

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

        // Set application ID (unique identifier for JobSentinel)
        // Helps identify database files in forensic analysis
        // Using ASCII "JSDB" = 0x4A534442
        sqlx::query("PRAGMA application_id = 1246970946")
            .execute(pool)
            .await?;
        tracing::debug!("Application ID set (JSDB)");

        // Set user version (complementary to migrations)
        // We'll use this to track major schema versions
        sqlx::query("PRAGMA user_version = 2").execute(pool).await?;
        tracing::debug!("User version = {}", SCHEMA_VERSION);

        // Run query optimizer analysis to update statistics
        // Helps SQLite choose better query plans
        sqlx::query("PRAGMA optimize").execute(pool).await?;
        tracing::debug!("Query optimizer statistics updated");

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

        tracing::info!("Database configuration verified");
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
    /// Migration stops if the required backup cannot be created and verified.
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
                Self::backup_pre_migration(&self.pool, db_path)
                    .await
                    .map_err(|_| {
                        tracing::error!("Required pre-migration backup failed");
                        sqlx::Error::Protocol("Required pre-migration backup failed".into())
                    })?;
            }
        }

        sqlx::migrate!("./migrations").run(&self.pool).await?;
        self.verify_integrity().await?;
        if let Some(db_path) = &self.db_path {
            jobsentinel_platform::ensure_private_sqlite_files(db_path).map_err(sqlx::Error::Io)?;
        }
        Ok(())
    }

    async fn verify_integrity(&self) -> Result<(), sqlx::Error> {
        super::integrity::verify_startup(&self.pool).await
    }

    /// Connect to in-memory SQLite database (for testing)
    /// Available in test builds and for integration tests
    pub async fn connect_memory() -> Result<Self, sqlx::Error> {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await?;
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

    /// Internal SQL owner access for repositories, integrity checks, and backups.
    #[must_use]
    pub(crate) const fn pool(&self) -> &SqlitePool {
        &self.pool
    }
}

mod maintenance;

#[cfg(test)]
mod tests;
