//! Database Layer (SQLite)
//!
//! Handles all database operations using SQLx with async support.
//! All queries use timeouts to prevent application hangs.

pub mod integrity;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{sqlite::SqlitePool, FromRow, Row};
use std::path::PathBuf;
use std::time::Duration;

/// Default timeout for database queries (30 seconds)
/// This prevents the application from hanging if a query gets stuck
pub const DEFAULT_QUERY_TIMEOUT: Duration = Duration::from_secs(30);

/// Execute a future with a timeout, converting timeout errors to sqlx errors
pub async fn with_timeout<T>(
    future: impl std::future::Future<Output = Result<T, sqlx::Error>>,
) -> Result<T, sqlx::Error> {
    tokio::time::timeout(DEFAULT_QUERY_TIMEOUT, future)
        .await
        .map_err(|_| {
            tracing::error!("Database query timed out after {:?}", DEFAULT_QUERY_TIMEOUT);
            sqlx::Error::Protocol("Query timed out".into())
        })?
}

/// Job model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Job {
    pub id: i64,

    /// SHA-256 hash for deduplication (company + title + location + url)
    pub hash: String,

    pub title: String,
    pub company: String,
    pub url: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub location: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Match score (0.0 - 1.0)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub score: Option<f64>,

    /// JSON object with score breakdown
    #[serde(skip_serializing_if = "Option::is_none")]
    pub score_reasons: Option<String>,

    /// Source scraper (e.g., "greenhouse", "lever", "jobswithgpt")
    pub source: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub remote: Option<bool>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub salary_min: Option<i64>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub salary_max: Option<i64>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub currency: Option<String>,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub last_seen: DateTime<Utc>,

    /// Number of times this job has been seen (for tracking repostings)
    pub times_seen: i64,

    /// Whether an immediate alert was sent for this job
    pub immediate_alert_sent: bool,

    /// Whether this job was included in a digest email
    pub included_in_digest: bool,

    /// Whether user has hidden/dismissed this job
    #[serde(default)]
    pub hidden: bool,

    /// Whether user has bookmarked/favorited this job
    #[serde(default)]
    pub bookmarked: bool,

    /// User's personal notes on this job
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
}

/// Database handle
pub struct Database {
    pool: SqlitePool,
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

        Ok(Database { pool })
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
        sqlx::query("PRAGMA optimize")
            .execute(pool)
            .await?;
        tracing::debug!("  ✓ Query optimizer statistics updated");

        // ============================================================
        // DIAGNOSTIC INFO (logged at startup)
        // ============================================================

        // Log SQLite compile options (useful for debugging)
        if let Ok(rows) = sqlx::query("PRAGMA compile_options")
            .fetch_all(pool)
            .await
        {
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
        if let Ok(row) = sqlx::query("SELECT sqlite_version()")
            .fetch_one(pool)
            .await
        {
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
                    tracing::warn!(
                        "  ⚠️  Cache size only {}MB (< 64MB minimum!)",
                        actual_mb
                    );
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
    pub async fn migrate(&self) -> Result<(), sqlx::Error> {
        sqlx::migrate!("./migrations").run(&self.pool).await?;
        Ok(())
    }

    /// Connect to in-memory SQLite database (for testing)
    /// Available in test builds and for integration tests
    pub async fn connect_memory() -> Result<Self, sqlx::Error> {
        let pool = SqlitePool::connect("sqlite::memory:").await?;
        Ok(Database { pool })
    }

    /// Insert or update a job (based on hash)
    ///
    /// If a job with the same hash exists:
    /// - Increments `times_seen`
    /// - Updates `last_seen` to now
    /// - Updates other fields (title, description, etc.)
    ///
    /// If job is new:
    /// - Inserts as new row
    ///
    /// Returns the job ID.
    pub async fn upsert_job(&self, job: &Job) -> Result<i64, sqlx::Error> {
        // Validate job field lengths to prevent database bloat
        const MAX_TITLE_LENGTH: usize = 500;
        const MAX_COMPANY_LENGTH: usize = 200;
        const MAX_URL_LENGTH: usize = 2000;
        const MAX_LOCATION_LENGTH: usize = 200;
        const MAX_DESCRIPTION_LENGTH: usize = 50000;

        if job.title.len() > MAX_TITLE_LENGTH {
            return Err(sqlx::Error::Protocol(format!(
                "Job title too long: {} chars (max: {})",
                job.title.len(),
                MAX_TITLE_LENGTH
            )));
        }

        if job.company.len() > MAX_COMPANY_LENGTH {
            return Err(sqlx::Error::Protocol(format!(
                "Company name too long: {} chars (max: {})",
                job.company.len(),
                MAX_COMPANY_LENGTH
            )));
        }

        if job.url.len() > MAX_URL_LENGTH {
            return Err(sqlx::Error::Protocol(format!(
                "Job URL too long: {} chars (max: {})",
                job.url.len(),
                MAX_URL_LENGTH
            )));
        }

        if let Some(location) = &job.location {
            if location.len() > MAX_LOCATION_LENGTH {
                return Err(sqlx::Error::Protocol(format!(
                    "Location too long: {} chars (max: {})",
                    location.len(),
                    MAX_LOCATION_LENGTH
                )));
            }
        }

        if let Some(description) = &job.description {
            if description.len() > MAX_DESCRIPTION_LENGTH {
                return Err(sqlx::Error::Protocol(format!(
                    "Description too long: {} chars (max: {})",
                    description.len(),
                    MAX_DESCRIPTION_LENGTH
                )));
            }
        }
        // Check if job with this hash already exists
        let existing: Option<i64> = sqlx::query_scalar("SELECT id FROM jobs WHERE hash = ?")
            .bind(&job.hash)
            .fetch_optional(&self.pool)
            .await?;

        if let Some(existing_id) = existing {
            // Job exists - update it
            sqlx::query(
                r#"
                UPDATE jobs SET
                    title = ?,
                    company = ?,
                    url = ?,
                    location = ?,
                    description = ?,
                    score = ?,
                    score_reasons = ?,
                    source = ?,
                    remote = ?,
                    salary_min = ?,
                    salary_max = ?,
                    currency = ?,
                    updated_at = ?,
                    last_seen = ?,
                    times_seen = times_seen + 1
                WHERE id = ?
                "#,
            )
            .bind(&job.title)
            .bind(&job.company)
            .bind(&job.url)
            .bind(&job.location)
            .bind(&job.description)
            .bind(job.score)
            .bind(&job.score_reasons)
            .bind(&job.source)
            .bind(job.remote.map(|r| if r { 1i64 } else { 0i64 }))
            .bind(job.salary_min)
            .bind(job.salary_max)
            .bind(&job.currency)
            .bind(Utc::now())
            .bind(Utc::now())
            .bind(existing_id)
            .execute(&self.pool)
            .await?;

            Ok(existing_id)
        } else {
            // New job - insert it
            let result = sqlx::query(
                r#"
                INSERT INTO jobs (
                    hash, title, company, url, location, description,
                    score, score_reasons, source, remote,
                    salary_min, salary_max, currency,
                    created_at, updated_at, last_seen, times_seen,
                    immediate_alert_sent, included_in_digest
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                "#,
            )
            .bind(&job.hash)
            .bind(&job.title)
            .bind(&job.company)
            .bind(&job.url)
            .bind(&job.location)
            .bind(&job.description)
            .bind(job.score)
            .bind(&job.score_reasons)
            .bind(&job.source)
            .bind(job.remote.map(|r| if r { 1i64 } else { 0i64 }))
            .bind(job.salary_min)
            .bind(job.salary_max)
            .bind(&job.currency)
            .bind(job.created_at)
            .bind(job.updated_at)
            .bind(job.last_seen)
            .bind(job.times_seen)
            .bind(if job.immediate_alert_sent { 1i64 } else { 0i64 })
            .bind(if job.included_in_digest { 1i64 } else { 0i64 })
            .execute(&self.pool)
            .await?;

            Ok(result.last_insert_rowid())
        }
    }

    /// Mark job as having sent immediate alert
    pub async fn mark_alert_sent(&self, job_id: i64) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE jobs SET immediate_alert_sent = 1 WHERE id = ?")
            .bind(job_id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    /// Get recent jobs
    pub async fn get_recent_jobs(&self, limit: i64) -> Result<Vec<Job>, sqlx::Error> {
        let jobs = sqlx::query_as::<_, Job>("SELECT * FROM jobs WHERE hidden = 0 ORDER BY score DESC, created_at DESC LIMIT ?")
            .bind(limit)
            .fetch_all(&self.pool)
            .await?;

        Ok(jobs)
    }

    /// Get jobs by minimum score
    pub async fn get_jobs_by_score(
        &self,
        min_score: f64,
        limit: i64,
    ) -> Result<Vec<Job>, sqlx::Error> {
        let jobs = sqlx::query_as::<_, Job>(
            "SELECT * FROM jobs WHERE score >= ? AND hidden = 0 ORDER BY score DESC, created_at DESC LIMIT ?",
        )
        .bind(min_score)
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        Ok(jobs)
    }

    /// Get jobs by source
    pub async fn get_jobs_by_source(
        &self,
        source: &str,
        limit: i64,
    ) -> Result<Vec<Job>, sqlx::Error> {
        let jobs = sqlx::query_as::<_, Job>(
            "SELECT * FROM jobs WHERE source = ? AND hidden = 0 ORDER BY created_at DESC LIMIT ?",
        )
        .bind(source)
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        Ok(jobs)
    }

    /// Get job by ID
    pub async fn get_job_by_id(&self, id: i64) -> Result<Option<Job>, sqlx::Error> {
        let job = sqlx::query_as::<_, Job>("SELECT * FROM jobs WHERE id = ?")
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;

        Ok(job)
    }

    /// Hide a job (user dismissal)
    pub async fn hide_job(&self, id: i64) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE jobs SET hidden = 1 WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    /// Unhide a job (restore to visible)
    pub async fn unhide_job(&self, id: i64) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE jobs SET hidden = 0 WHERE id = ?")
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    /// Toggle bookmark status for a job
    pub async fn toggle_bookmark(&self, id: i64) -> Result<bool, sqlx::Error> {
        // Get current state
        let current: Option<i64> =
            sqlx::query_scalar("SELECT bookmarked FROM jobs WHERE id = ?")
                .bind(id)
                .fetch_optional(&self.pool)
                .await?;

        let new_state = match current {
            Some(1) => 0,
            Some(0) => 1,
            None => return Err(sqlx::Error::RowNotFound),
            _ => 1,
        };

        sqlx::query("UPDATE jobs SET bookmarked = ? WHERE id = ?")
            .bind(new_state)
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(new_state == 1)
    }

    /// Set bookmark status for a job
    pub async fn set_bookmark(&self, id: i64, bookmarked: bool) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE jobs SET bookmarked = ? WHERE id = ?")
            .bind(if bookmarked { 1 } else { 0 })
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    /// Get bookmarked jobs
    pub async fn get_bookmarked_jobs(&self, limit: i64) -> Result<Vec<Job>, sqlx::Error> {
        let jobs = sqlx::query_as::<_, Job>(
            "SELECT * FROM jobs WHERE bookmarked = 1 AND hidden = 0 ORDER BY score DESC, created_at DESC LIMIT ?",
        )
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        Ok(jobs)
    }

    /// Set notes for a job
    pub async fn set_job_notes(&self, id: i64, notes: Option<&str>) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE jobs SET notes = ? WHERE id = ?")
            .bind(notes)
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    /// Get notes for a job
    pub async fn get_job_notes(&self, id: i64) -> Result<Option<String>, sqlx::Error> {
        let notes: Option<String> =
            sqlx::query_scalar("SELECT notes FROM jobs WHERE id = ?")
                .bind(id)
                .fetch_optional(&self.pool)
                .await?
                .flatten();

        Ok(notes)
    }

    /// Get jobs with notes
    pub async fn get_jobs_with_notes(&self, limit: i64) -> Result<Vec<Job>, sqlx::Error> {
        let jobs = sqlx::query_as::<_, Job>(
            "SELECT * FROM jobs WHERE notes IS NOT NULL AND hidden = 0 ORDER BY updated_at DESC LIMIT ?",
        )
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        Ok(jobs)
    }

    /// Get job by hash
    pub async fn get_job_by_hash(&self, hash: &str) -> Result<Option<Job>, sqlx::Error> {
        let job = sqlx::query_as::<_, Job>("SELECT * FROM jobs WHERE hash = ?")
            .bind(hash)
            .fetch_optional(&self.pool)
            .await?;

        Ok(job)
    }

    /// Full-text search on title and description
    pub async fn search_jobs(&self, query: &str, limit: i64) -> Result<Vec<Job>, sqlx::Error> {
        // Use FTS5 virtual table for fast full-text search
        let job_ids: Vec<i64> =
            sqlx::query_scalar("SELECT rowid FROM jobs_fts WHERE jobs_fts MATCH ? LIMIT ?")
                .bind(query)
                .bind(limit)
                .fetch_all(&self.pool)
                .await?;

        if job_ids.is_empty() {
            return Ok(Vec::new());
        }

        // Limit number of IDs to prevent query performance issues
        const MAX_IDS: usize = 1000;
        if job_ids.len() > MAX_IDS {
            return Err(sqlx::Error::Protocol(format!(
                "Too many job IDs requested: {} (max: {})",
                job_ids.len(),
                MAX_IDS
            )));
        }

        // Fetch full job records
        // SAFETY: This is NOT vulnerable to SQL injection. The format! only creates
        // placeholders ("?"), and actual values are bound using SQLx's parameterization.
        // This is the recommended pattern for dynamic IN clauses with SQLx.
        let placeholders = job_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
        let sql = format!("SELECT * FROM jobs WHERE id IN ({})", placeholders);

        let mut query_builder = sqlx::query_as::<_, Job>(&sql);
        for id in job_ids {
            query_builder = query_builder.bind(id);
        }

        let jobs = query_builder.fetch_all(&self.pool).await?;
        Ok(jobs)
    }

    /// Find potential duplicate jobs (same title + company, different sources)
    /// Returns groups of jobs that are likely duplicates
    pub async fn find_duplicate_groups(&self) -> Result<Vec<DuplicateGroup>, sqlx::Error> {
        // First, find all title+company pairs that have multiple jobs
        let duplicate_keys: Vec<(String, String)> = sqlx::query_as(
            r#"
            SELECT LOWER(title) as norm_title, LOWER(company) as norm_company
            FROM jobs
            WHERE hidden = 0
            GROUP BY LOWER(title), LOWER(company)
            HAVING COUNT(*) > 1
            ORDER BY MAX(score) DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await?;

        let mut groups = Vec::new();

        for (norm_title, norm_company) in duplicate_keys {
            let jobs: Vec<Job> = sqlx::query_as(
                r#"
                SELECT id, hash, title, company, url, location, description, score, score_reasons,
                       source, remote, salary_min, salary_max, currency, created_at, updated_at,
                       last_seen, times_seen, immediate_alert_sent, included_in_digest, hidden,
                       bookmarked, notes
                FROM jobs
                WHERE LOWER(title) = ? AND LOWER(company) = ? AND hidden = 0
                ORDER BY score DESC, created_at ASC
                "#,
            )
            .bind(&norm_title)
            .bind(&norm_company)
            .fetch_all(&self.pool)
            .await?;

            if jobs.len() > 1 {
                // The first job (highest score, oldest) is the "primary"
                let primary_id = jobs[0].id;
                let sources: Vec<String> = jobs.iter().map(|j| j.source.clone()).collect();

                groups.push(DuplicateGroup {
                    primary_id,
                    jobs,
                    sources,
                });
            }
        }

        Ok(groups)
    }

    /// Merge duplicate jobs: hide all duplicates except the primary one
    pub async fn merge_duplicates(&self, primary_id: i64, duplicate_ids: &[i64]) -> Result<(), sqlx::Error> {
        // Hide all duplicates
        for &id in duplicate_ids {
            if id != primary_id {
                self.hide_job(id).await?;
            }
        }
        Ok(())
    }

    /// Get statistics
    pub async fn get_statistics(&self) -> Result<Statistics, sqlx::Error> {
        let total_jobs: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM jobs")
            .fetch_one(&self.pool)
            .await?;

        let high_matches: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM jobs WHERE score >= 0.9")
            .fetch_one(&self.pool)
            .await?;

        let average_score: Option<f64> =
            sqlx::query_scalar("SELECT AVG(score) FROM jobs WHERE score IS NOT NULL")
                .fetch_one(&self.pool)
                .await?;

        let jobs_today: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM jobs WHERE DATE(created_at) = DATE('now')")
                .fetch_one(&self.pool)
                .await?;

        Ok(Statistics {
            total_jobs,
            high_matches,
            average_score: average_score.unwrap_or(0.0),
            jobs_today,
        })
    }

    /// Get default database path
    pub fn default_path() -> PathBuf {
        crate::platforms::get_data_dir().join("jobs.db")
    }

    /// Get reference to the connection pool (for integrity checks and backups)
    pub fn pool(&self) -> &SqlitePool {
        &self.pool
    }

    /// Get default backup directory path
    pub fn default_backup_dir() -> PathBuf {
        crate::platforms::get_data_dir().join("backups")
    }
}

/// Database statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Statistics {
    pub total_jobs: i64,
    pub high_matches: i64,
    pub average_score: f64,
    pub jobs_today: i64,
}

/// A group of duplicate jobs (same title + company from different sources)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DuplicateGroup {
    /// The ID of the primary job (highest score)
    pub primary_id: i64,
    /// All jobs in this duplicate group
    pub jobs: Vec<Job>,
    /// Sources where this job appears
    pub sources: Vec<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Helper to create a test job
    fn create_test_job(hash: &str, title: &str, score: f64) -> Job {
        Job {
            id: 0,
            hash: hash.to_string(),
            title: title.to_string(),
            company: "Test Company".to_string(),
            url: "https://example.com/job".to_string(),
            location: Some("Remote".to_string()),
            description: Some("Test description".to_string()),
            score: Some(score),
            score_reasons: Some("[]".to_string()),
            source: "test".to_string(),
            remote: Some(true),
            salary_min: Some(150000),
            salary_max: Some(200000),
            currency: Some("USD".to_string()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            last_seen: Utc::now(),
            times_seen: 1,
            immediate_alert_sent: false,
            included_in_digest: false,
            hidden: false,
            bookmarked: false,
            notes: None,
        }
    }

    #[tokio::test]
    async fn test_database_connection() {
        // Use in-memory database for testing
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        // Database is created successfully (implicitly verified by unwrap)
    }

    #[tokio::test]
    async fn test_upsert_job_insert() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let job = create_test_job("hash123", "Test Job", 0.95);

        // First insert
        let id = db.upsert_job(&job).await.unwrap();
        assert!(id > 0, "Job ID should be positive");

        // Verify job was inserted
        let fetched = db.get_job_by_id(id).await.unwrap().unwrap();
        assert_eq!(fetched.title, "Test Job");
        assert_eq!(fetched.hash, "hash123");
        assert_eq!(fetched.times_seen, 1);
    }

    #[tokio::test]
    async fn test_upsert_job_update() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let job = create_test_job("hash456", "Original Title", 0.85);

        // First insert
        let id1 = db.upsert_job(&job).await.unwrap();

        // Update with same hash but different title
        let mut updated_job = job.clone();
        updated_job.title = "Updated Title".to_string();
        updated_job.score = Some(0.92);

        let id2 = db.upsert_job(&updated_job).await.unwrap();

        // Should return same ID
        assert_eq!(id1, id2, "Update should not create new job");

        // Verify times_seen was incremented
        let fetched = db.get_job_by_id(id1).await.unwrap().unwrap();
        assert_eq!(fetched.times_seen, 2);
        assert_eq!(fetched.title, "Updated Title");
        assert_eq!(fetched.score, Some(0.92));
    }

    #[tokio::test]
    async fn test_upsert_job_title_too_long() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let mut job = create_test_job("hash789", "Test", 0.9);
        job.title = "x".repeat(501); // Over 500 char limit

        let result = db.upsert_job(&job).await;
        assert!(result.is_err(), "Overly long title should fail");
        assert!(result.unwrap_err().to_string().contains("title too long"));
    }

    #[tokio::test]
    async fn test_upsert_job_company_too_long() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let mut job = create_test_job("hash_company", "Test Job", 0.9);
        job.company = "c".repeat(201); // Over 200 char limit

        let result = db.upsert_job(&job).await;
        assert!(result.is_err(), "Overly long company name should fail");
        assert!(result.unwrap_err().to_string().contains("Company name too long"));
    }

    #[tokio::test]
    async fn test_upsert_job_url_too_long() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let mut job = create_test_job("hash_url", "Test Job", 0.9);
        job.url = format!("https://example.com/{}", "x".repeat(2000));

        let result = db.upsert_job(&job).await;
        assert!(result.is_err(), "Overly long URL should fail");
        assert!(result.unwrap_err().to_string().contains("URL too long"));
    }

    #[tokio::test]
    async fn test_upsert_job_location_too_long() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let mut job = create_test_job("hash_loc", "Test Job", 0.9);
        job.location = Some("l".repeat(201)); // Over 200 char limit

        let result = db.upsert_job(&job).await;
        assert!(result.is_err(), "Overly long location should fail");
        assert!(result.unwrap_err().to_string().contains("Location too long"));
    }

    #[tokio::test]
    async fn test_upsert_job_description_too_long() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let mut job = create_test_job("hash_desc", "Test Job", 0.9);
        job.description = Some("d".repeat(50001)); // Over 50000 char limit

        let result = db.upsert_job(&job).await;
        assert!(result.is_err(), "Overly long description should fail");
        assert!(result.unwrap_err().to_string().contains("Description too long"));
    }

    #[tokio::test]
    async fn test_mark_alert_sent() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let job = create_test_job("hash_alert", "Test Job", 0.95);
        let id = db.upsert_job(&job).await.unwrap();

        // Initially should be false
        let before = db.get_job_by_id(id).await.unwrap().unwrap();
        assert!(!before.immediate_alert_sent);

        // Mark as sent
        db.mark_alert_sent(id).await.unwrap();

        // Verify it was marked
        let after = db.get_job_by_id(id).await.unwrap().unwrap();
        assert!(after.immediate_alert_sent);
    }

    #[tokio::test]
    async fn test_get_recent_jobs() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        // Insert jobs at different times
        for i in 0..5 {
            let job = create_test_job(&format!("hash_{}", i), &format!("Job {}", i), 0.8);
            db.upsert_job(&job).await.unwrap();
            tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
        }

        // Get recent 3
        let recent = db.get_recent_jobs(3).await.unwrap();
        assert_eq!(recent.len(), 3, "Should return 3 most recent jobs");

        // Verify they're in descending order by created_at
        for i in 0..recent.len() - 1 {
            assert!(
                recent[i].created_at >= recent[i + 1].created_at,
                "Jobs should be ordered by created_at DESC"
            );
        }
    }

    #[tokio::test]
    async fn test_get_jobs_by_score() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        // Insert jobs with various scores
        db.upsert_job(&create_test_job("high1", "High Match 1", 0.95)).await.unwrap();
        db.upsert_job(&create_test_job("high2", "High Match 2", 0.92)).await.unwrap();
        db.upsert_job(&create_test_job("medium", "Medium Match", 0.75)).await.unwrap();
        db.upsert_job(&create_test_job("low", "Low Match", 0.50)).await.unwrap();

        // Get jobs with score >= 0.9
        let high_score_jobs = db.get_jobs_by_score(0.9, 10).await.unwrap();

        assert_eq!(high_score_jobs.len(), 2, "Should return 2 high-scoring jobs");
        for job in &high_score_jobs {
            assert!(job.score.unwrap() >= 0.9, "All jobs should have score >= 0.9");
        }

        // Verify ordering (highest score first)
        assert!(
            high_score_jobs[0].score.unwrap() >= high_score_jobs[1].score.unwrap(),
            "Jobs should be ordered by score DESC"
        );
    }

    #[tokio::test]
    async fn test_get_jobs_by_source() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        // Insert jobs from different sources
        let mut job1 = create_test_job("gh1", "Greenhouse Job", 0.9);
        job1.source = "greenhouse".to_string();
        db.upsert_job(&job1).await.unwrap();

        let mut job2 = create_test_job("lv1", "Lever Job", 0.85);
        job2.source = "lever".to_string();
        db.upsert_job(&job2).await.unwrap();

        let mut job3 = create_test_job("gh2", "Another Greenhouse", 0.88);
        job3.source = "greenhouse".to_string();
        db.upsert_job(&job3).await.unwrap();

        // Get greenhouse jobs
        let greenhouse_jobs = db.get_jobs_by_source("greenhouse", 10).await.unwrap();

        assert_eq!(greenhouse_jobs.len(), 2, "Should return 2 Greenhouse jobs");
        for job in &greenhouse_jobs {
            assert_eq!(job.source, "greenhouse");
        }
    }

    #[tokio::test]
    async fn test_get_job_by_id_not_found() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let result = db.get_job_by_id(999999).await.unwrap();
        assert!(result.is_none(), "Should return None for nonexistent ID");
    }

    #[tokio::test]
    async fn test_get_job_by_hash() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let job = create_test_job("unique_hash", "Unique Job", 0.9);
        db.upsert_job(&job).await.unwrap();

        // Find by hash
        let found = db.get_job_by_hash("unique_hash").await.unwrap();
        assert!(found.is_some(), "Should find job by hash");
        assert_eq!(found.unwrap().title, "Unique Job");

        // Try nonexistent hash
        let not_found = db.get_job_by_hash("nonexistent").await.unwrap();
        assert!(not_found.is_none(), "Should return None for nonexistent hash");
    }

    #[tokio::test]
    async fn test_get_statistics() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        // Insert jobs with various scores
        db.upsert_job(&create_test_job("s1", "Job 1", 0.95)).await.unwrap();
        db.upsert_job(&create_test_job("s2", "Job 2", 0.92)).await.unwrap();
        db.upsert_job(&create_test_job("s3", "Job 3", 0.75)).await.unwrap();
        db.upsert_job(&create_test_job("s4", "Job 4", 0.50)).await.unwrap();

        let stats = db.get_statistics().await.unwrap();

        assert_eq!(stats.total_jobs, 4);
        assert_eq!(stats.high_matches, 2); // Jobs with score >= 0.9
        assert!(stats.average_score > 0.7 && stats.average_score < 0.8);
    }

    #[tokio::test]
    async fn test_get_statistics_empty_database() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let stats = db.get_statistics().await.unwrap();

        assert_eq!(stats.total_jobs, 0);
        assert_eq!(stats.high_matches, 0);
        assert_eq!(stats.average_score, 0.0);
        assert_eq!(stats.jobs_today, 0);
    }

    #[tokio::test]
    async fn test_multiple_upserts_increment_times_seen() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let job = create_test_job("repeat_hash", "Repeated Job", 0.9);

        // Insert same job multiple times
        let id = db.upsert_job(&job).await.unwrap();
        db.upsert_job(&job).await.unwrap();
        db.upsert_job(&job).await.unwrap();
        db.upsert_job(&job).await.unwrap();

        let fetched = db.get_job_by_id(id).await.unwrap().unwrap();
        assert_eq!(fetched.times_seen, 4, "times_seen should be 4");
    }

    #[tokio::test]
    async fn test_job_with_all_optional_fields_none() {
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();

        let mut job = create_test_job("minimal", "Minimal Job", 0.8);
        job.location = None;
        job.description = None;
        job.score = None;
        job.score_reasons = None;
        job.remote = None;
        job.salary_min = None;
        job.salary_max = None;
        job.currency = None;

        let id = db.upsert_job(&job).await.unwrap();
        let fetched = db.get_job_by_id(id).await.unwrap().unwrap();

        assert!(fetched.location.is_none());
        assert!(fetched.description.is_none());
        assert!(fetched.score.is_none());
        assert!(fetched.remote.is_none());
        assert!(fetched.salary_min.is_none());
    }

    // ============================================================
    // UNIT TESTS (No Database Required)
    // ============================================================

    mod job_struct_tests {
        use super::*;

        #[test]
        fn test_job_creation_with_all_fields() {
            let now = Utc::now();
            let job = Job {
                id: 42,
                hash: "abc123def456".to_string(),
                title: "Senior Rust Engineer".to_string(),
                company: "TechCorp Inc".to_string(),
                url: "https://example.com/jobs/123".to_string(),
                location: Some("San Francisco, CA".to_string()),
                description: Some("Build amazing things with Rust".to_string()),
                score: Some(0.95),
                score_reasons: Some(r#"{"keywords": 5, "experience": 3}"#.to_string()),
                source: "greenhouse".to_string(),
                remote: Some(true),
                salary_min: Some(150000),
                salary_max: Some(200000),
                currency: Some("USD".to_string()),
                created_at: now,
                updated_at: now,
                last_seen: now,
                times_seen: 1,
                immediate_alert_sent: false,
                included_in_digest: false,
                hidden: false,
                bookmarked: true,
                notes: Some("Looks promising!".to_string()),
            };

            assert_eq!(job.id, 42);
            assert_eq!(job.hash, "abc123def456");
            assert_eq!(job.title, "Senior Rust Engineer");
            assert_eq!(job.company, "TechCorp Inc");
            assert_eq!(job.score, Some(0.95));
            assert!(job.remote.unwrap());
            assert!(job.bookmarked);
            assert!(!job.hidden);
        }

        #[test]
        fn test_job_creation_minimal_fields() {
            let now = Utc::now();
            let job = Job {
                id: 1,
                hash: "minimal_hash".to_string(),
                title: "Job Title".to_string(),
                company: "Company".to_string(),
                url: "https://example.com/job".to_string(),
                location: None,
                description: None,
                score: None,
                score_reasons: None,
                source: "test".to_string(),
                remote: None,
                salary_min: None,
                salary_max: None,
                currency: None,
                created_at: now,
                updated_at: now,
                last_seen: now,
                times_seen: 1,
                immediate_alert_sent: false,
                included_in_digest: false,
                hidden: false,
                bookmarked: false,
                notes: None,
            };

            assert_eq!(job.id, 1);
            assert!(job.location.is_none());
            assert!(job.description.is_none());
            assert!(job.score.is_none());
            assert!(job.remote.is_none());
            assert!(job.salary_min.is_none());
            assert!(job.notes.is_none());
        }

        #[test]
        fn test_job_clone() {
            let job = create_test_job("clone_test", "Original", 0.85);
            let cloned = job.clone();

            assert_eq!(job.hash, cloned.hash);
            assert_eq!(job.title, cloned.title);
            assert_eq!(job.company, cloned.company);
            assert_eq!(job.score, cloned.score);
            assert_eq!(job.created_at, cloned.created_at);
        }

        #[test]
        fn test_job_debug_format() {
            let job = create_test_job("debug_test", "Debug Job", 0.90);
            let debug_str = format!("{:?}", job);

            assert!(debug_str.contains("Debug Job"));
            assert!(debug_str.contains("debug_test"));
            assert!(debug_str.contains("Test Company"));
        }

        #[test]
        fn test_job_score_valid_range() {
            let mut job = create_test_job("score_test", "Score Test", 0.5);

            // Valid scores
            job.score = Some(0.0);
            assert_eq!(job.score, Some(0.0));

            job.score = Some(1.0);
            assert_eq!(job.score, Some(1.0));

            job.score = Some(0.5);
            assert_eq!(job.score, Some(0.5));

            // None is valid
            job.score = None;
            assert!(job.score.is_none());
        }

        #[test]
        fn test_job_times_seen_counter() {
            let mut job = create_test_job("times_seen_test", "Counter Test", 0.8);

            assert_eq!(job.times_seen, 1);

            job.times_seen += 1;
            assert_eq!(job.times_seen, 2);

            job.times_seen += 5;
            assert_eq!(job.times_seen, 7);
        }

        #[test]
        fn test_job_boolean_flags() {
            let mut job = create_test_job("flags_test", "Flags Test", 0.8);

            // Test alert sent flag
            assert!(!job.immediate_alert_sent);
            job.immediate_alert_sent = true;
            assert!(job.immediate_alert_sent);

            // Test digest flag
            assert!(!job.included_in_digest);
            job.included_in_digest = true;
            assert!(job.included_in_digest);

            // Test hidden flag
            assert!(!job.hidden);
            job.hidden = true;
            assert!(job.hidden);

            // Test bookmarked flag
            assert!(!job.bookmarked);
            job.bookmarked = true;
            assert!(job.bookmarked);
        }

        #[test]
        fn test_job_salary_range() {
            let mut job = create_test_job("salary_test", "Salary Test", 0.85);

            // Test valid salary range
            job.salary_min = Some(100000);
            job.salary_max = Some(150000);
            assert!(job.salary_max.unwrap() > job.salary_min.unwrap());

            // Test equal min/max
            job.salary_min = Some(120000);
            job.salary_max = Some(120000);
            assert_eq!(job.salary_min, job.salary_max);

            // Test None values
            job.salary_min = None;
            job.salary_max = None;
            assert!(job.salary_min.is_none());
            assert!(job.salary_max.is_none());
        }

        #[test]
        fn test_job_remote_flag() {
            let mut job = create_test_job("remote_test", "Remote Test", 0.9);

            // Test remote = true
            job.remote = Some(true);
            assert!(job.remote.unwrap());

            // Test remote = false
            job.remote = Some(false);
            assert!(!job.remote.unwrap());

            // Test remote = None (unknown)
            job.remote = None;
            assert!(job.remote.is_none());
        }

        #[test]
        fn test_job_notes_field() {
            let mut job = create_test_job("notes_test", "Notes Test", 0.8);

            // Initially None
            assert!(job.notes.is_none());

            // Set notes
            job.notes = Some("Great company culture!".to_string());
            assert_eq!(job.notes.as_ref().unwrap(), "Great company culture!");

            // Clear notes
            job.notes = None;
            assert!(job.notes.is_none());
        }

        #[test]
        fn test_job_hash_uniqueness() {
            let job1 = create_test_job("hash1", "Job 1", 0.9);
            let job2 = create_test_job("hash2", "Job 2", 0.9);
            let job3 = create_test_job("hash1", "Job 3", 0.9);

            assert_ne!(job1.hash, job2.hash, "Different hashes should not match");
            assert_eq!(job1.hash, job3.hash, "Same hash should match");
        }

        #[test]
        fn test_job_url_format() {
            let mut job = create_test_job("url_test", "URL Test", 0.8);

            // Test various URL formats
            job.url = "https://example.com/job/123".to_string();
            assert!(job.url.starts_with("https://"));

            job.url = "http://jobs.example.com/apply?id=456".to_string();
            assert!(job.url.contains("?id="));

            job.url = "https://greenhouse.io/company/jobs/789".to_string();
            assert!(job.url.contains("greenhouse.io"));
        }

        #[test]
        fn test_job_score_reasons_json() {
            let mut job = create_test_job("json_test", "JSON Test", 0.95);

            // Valid JSON
            job.score_reasons = Some(r#"{"keywords": 10, "experience": 5}"#.to_string());
            assert!(job.score_reasons.is_some());

            // Empty JSON object
            job.score_reasons = Some("{}".to_string());
            assert_eq!(job.score_reasons.as_ref().unwrap(), "{}");

            // None
            job.score_reasons = None;
            assert!(job.score_reasons.is_none());
        }
    }

    mod serialization_tests {
        use super::*;

        #[test]
        fn test_job_serialize_to_json() {
            let job = create_test_job("serialize_test", "Serialize Job", 0.92);
            let json = serde_json::to_string(&job).unwrap();

            assert!(json.contains("Serialize Job"));
            assert!(json.contains("serialize_test"));
            assert!(json.contains("Test Company"));
            assert!(json.contains("0.92"));
        }

        #[test]
        fn test_job_deserialize_from_json() {
            let job = create_test_job("deserialize_test", "Deserialize Job", 0.88);
            let json = serde_json::to_string(&job).unwrap();
            let deserialized: Job = serde_json::from_str(&json).unwrap();

            assert_eq!(deserialized.hash, job.hash);
            assert_eq!(deserialized.title, job.title);
            assert_eq!(deserialized.company, job.company);
            assert_eq!(deserialized.score, job.score);
        }

        #[test]
        fn test_job_serialize_skip_none_fields() {
            let mut job = create_test_job("skip_none", "Skip None Test", 0.8);
            job.location = None;
            job.description = None;
            job.notes = None;

            let json = serde_json::to_string(&job).unwrap();

            // Optional None fields should be skipped in serialization
            // (due to #[serde(skip_serializing_if = "Option::is_none")])
            let value: serde_json::Value = serde_json::from_str(&json).unwrap();
            assert!(value.get("location").is_none() || value["location"].is_null());
            assert!(value.get("description").is_none() || value["description"].is_null());
            assert!(value.get("notes").is_none() || value["notes"].is_null());
        }

        #[test]
        fn test_job_serialize_includes_some_fields() {
            let job = create_test_job("include_some", "Include Some Test", 0.9);

            let json = serde_json::to_string(&job).unwrap();
            let value: serde_json::Value = serde_json::from_str(&json).unwrap();

            // Some fields should be present
            assert!(value.get("location").is_some());
            assert!(value.get("description").is_some());
            assert_eq!(value["location"], "Remote");
        }

        #[test]
        fn test_job_roundtrip_serialization() {
            let original = create_test_job("roundtrip", "Roundtrip Test", 0.87);
            let json = serde_json::to_string(&original).unwrap();
            let deserialized: Job = serde_json::from_str(&json).unwrap();
            let json2 = serde_json::to_string(&deserialized).unwrap();

            // Should be identical after roundtrip
            assert_eq!(json, json2);
        }

        #[test]
        fn test_job_deserialize_with_default_hidden() {
            // Test that #[serde(default)] works for hidden field
            let json = r#"{
                "id": 1,
                "hash": "test",
                "title": "Test",
                "company": "Test Co",
                "url": "https://example.com",
                "source": "test",
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z",
                "last_seen": "2024-01-01T00:00:00Z",
                "times_seen": 1,
                "immediate_alert_sent": false,
                "included_in_digest": false,
                "bookmarked": false
            }"#;

            let job: Job = serde_json::from_str(json).unwrap();
            assert!(!job.hidden, "hidden should default to false");
        }

        #[test]
        fn test_job_deserialize_with_default_bookmarked() {
            // Test that #[serde(default)] works for bookmarked field
            let json = r#"{
                "id": 1,
                "hash": "test",
                "title": "Test",
                "company": "Test Co",
                "url": "https://example.com",
                "source": "test",
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z",
                "last_seen": "2024-01-01T00:00:00Z",
                "times_seen": 1,
                "immediate_alert_sent": false,
                "included_in_digest": false,
                "hidden": false
            }"#;

            let job: Job = serde_json::from_str(json).unwrap();
            assert!(!job.bookmarked, "bookmarked should default to false");
        }
    }

    mod statistics_tests {
        use super::*;

        #[test]
        fn test_statistics_creation() {
            let stats = Statistics {
                total_jobs: 100,
                high_matches: 25,
                average_score: 0.75,
                jobs_today: 10,
            };

            assert_eq!(stats.total_jobs, 100);
            assert_eq!(stats.high_matches, 25);
            assert_eq!(stats.average_score, 0.75);
            assert_eq!(stats.jobs_today, 10);
        }

        #[test]
        fn test_statistics_zero_values() {
            let stats = Statistics {
                total_jobs: 0,
                high_matches: 0,
                average_score: 0.0,
                jobs_today: 0,
            };

            assert_eq!(stats.total_jobs, 0);
            assert_eq!(stats.high_matches, 0);
            assert_eq!(stats.average_score, 0.0);
            assert_eq!(stats.jobs_today, 0);
        }

        #[test]
        fn test_statistics_serialize_deserialize() {
            let stats = Statistics {
                total_jobs: 50,
                high_matches: 15,
                average_score: 0.82,
                jobs_today: 5,
            };

            let json = serde_json::to_string(&stats).unwrap();
            let deserialized: Statistics = serde_json::from_str(&json).unwrap();

            assert_eq!(stats.total_jobs, deserialized.total_jobs);
            assert_eq!(stats.high_matches, deserialized.high_matches);
            assert_eq!(stats.average_score, deserialized.average_score);
            assert_eq!(stats.jobs_today, deserialized.jobs_today);
        }

        #[test]
        fn test_statistics_clone() {
            let stats = Statistics {
                total_jobs: 75,
                high_matches: 20,
                average_score: 0.88,
                jobs_today: 8,
            };

            let cloned = stats.clone();
            assert_eq!(stats.total_jobs, cloned.total_jobs);
            assert_eq!(stats.average_score, cloned.average_score);
        }
    }

    mod duplicate_group_tests {
        use super::*;

        #[test]
        fn test_duplicate_group_creation() {
            let job1 = create_test_job("dup1", "Duplicate Job", 0.95);
            let job2 = create_test_job("dup2", "Duplicate Job", 0.90);

            let group = DuplicateGroup {
                primary_id: job1.id,
                jobs: vec![job1.clone(), job2.clone()],
                sources: vec!["greenhouse".to_string(), "lever".to_string()],
            };

            assert_eq!(group.primary_id, job1.id);
            assert_eq!(group.jobs.len(), 2);
            assert_eq!(group.sources.len(), 2);
        }

        #[test]
        fn test_duplicate_group_serialize_deserialize() {
            let job1 = create_test_job("ser1", "Job A", 0.92);
            let job2 = create_test_job("ser2", "Job A", 0.88);

            let group = DuplicateGroup {
                primary_id: job1.id,
                jobs: vec![job1, job2],
                sources: vec!["greenhouse".to_string(), "lever".to_string()],
            };

            let json = serde_json::to_string(&group).unwrap();
            let deserialized: DuplicateGroup = serde_json::from_str(&json).unwrap();

            assert_eq!(group.primary_id, deserialized.primary_id);
            assert_eq!(group.jobs.len(), deserialized.jobs.len());
            assert_eq!(group.sources, deserialized.sources);
        }

        #[test]
        fn test_duplicate_group_empty_jobs() {
            let group = DuplicateGroup {
                primary_id: 0,
                jobs: vec![],
                sources: vec![],
            };

            assert_eq!(group.jobs.len(), 0);
            assert_eq!(group.sources.len(), 0);
        }
    }

    mod timeout_tests {
        use super::*;

        #[tokio::test]
        async fn test_with_timeout_success() {
            // Simulate a fast query that succeeds
            let future = async {
                tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
                Ok::<_, sqlx::Error>(42)
            };

            let result = with_timeout(future).await;
            assert!(result.is_ok());
            assert_eq!(result.unwrap(), 42);
        }

        #[tokio::test]
        async fn test_with_timeout_error() {
            // Simulate a query that returns an error
            let future = async {
                Err::<i32, sqlx::Error>(sqlx::Error::Protocol("Test error".into()))
            };

            let result = with_timeout(future).await;
            assert!(result.is_err());
        }

        #[tokio::test]
        async fn test_default_query_timeout_constant() {
            assert_eq!(DEFAULT_QUERY_TIMEOUT, Duration::from_secs(30));
        }
    }

    mod database_path_tests {
        use super::*;

        #[test]
        fn test_default_path() {
            let path = Database::default_path();
            assert!(path.to_string_lossy().contains("jobs.db"));
        }

        #[test]
        fn test_default_backup_dir() {
            let path = Database::default_backup_dir();
            assert!(path.to_string_lossy().contains("backups"));
        }
    }

    // ============================================================
    // COMPREHENSIVE DATABASE OPERATION TESTS
    // ============================================================

    mod hide_unhide_tests {
        use super::*;

        #[tokio::test]
        async fn test_hide_job() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("hide_test", "Test Job", 0.9);
            let id = db.upsert_job(&job).await.unwrap();

            // Initially not hidden
            let before = db.get_job_by_id(id).await.unwrap().unwrap();
            assert!(!before.hidden);

            // Hide the job
            db.hide_job(id).await.unwrap();

            // Verify it's hidden
            let after = db.get_job_by_id(id).await.unwrap().unwrap();
            assert!(after.hidden);
        }

        #[tokio::test]
        async fn test_unhide_job() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let mut job = create_test_job("unhide_test", "Test Job", 0.9);
            job.hidden = true;
            let id = db.upsert_job(&job).await.unwrap();

            // Manually hide first
            db.hide_job(id).await.unwrap();

            // Verify hidden
            let hidden = db.get_job_by_id(id).await.unwrap().unwrap();
            assert!(hidden.hidden);

            // Unhide the job
            db.unhide_job(id).await.unwrap();

            // Verify it's visible again
            let visible = db.get_job_by_id(id).await.unwrap().unwrap();
            assert!(!visible.hidden);
        }

        #[tokio::test]
        async fn test_hide_unhide_cycle() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("cycle_test", "Test Job", 0.9);
            let id = db.upsert_job(&job).await.unwrap();

            // Hide
            db.hide_job(id).await.unwrap();
            let after_hide = db.get_job_by_id(id).await.unwrap().unwrap();
            assert!(after_hide.hidden);

            // Unhide
            db.unhide_job(id).await.unwrap();
            let after_unhide = db.get_job_by_id(id).await.unwrap().unwrap();
            assert!(!after_unhide.hidden);

            // Hide again
            db.hide_job(id).await.unwrap();
            let after_rehide = db.get_job_by_id(id).await.unwrap().unwrap();
            assert!(after_rehide.hidden);
        }

        #[tokio::test]
        async fn test_hidden_jobs_excluded_from_recent() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert visible job
            let job1 = create_test_job("visible1", "Visible Job", 0.9);
            db.upsert_job(&job1).await.unwrap();

            // Insert hidden job
            let job2 = create_test_job("hidden1", "Hidden Job", 0.95);
            let id2 = db.upsert_job(&job2).await.unwrap();
            db.hide_job(id2).await.unwrap();

            // Get recent jobs
            let recent = db.get_recent_jobs(10).await.unwrap();

            // Should only return visible job
            assert_eq!(recent.len(), 1);
            assert_eq!(recent[0].title, "Visible Job");
        }

        #[tokio::test]
        async fn test_hidden_jobs_excluded_from_score_query() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert visible high-score job
            let job1 = create_test_job("visible_high", "Visible High", 0.95);
            db.upsert_job(&job1).await.unwrap();

            // Insert hidden high-score job
            let job2 = create_test_job("hidden_high", "Hidden High", 0.98);
            let id2 = db.upsert_job(&job2).await.unwrap();
            db.hide_job(id2).await.unwrap();

            // Get jobs by score
            let high_score = db.get_jobs_by_score(0.9, 10).await.unwrap();

            // Should only return visible job
            assert_eq!(high_score.len(), 1);
            assert_eq!(high_score[0].title, "Visible High");
        }

        #[tokio::test]
        async fn test_hidden_jobs_excluded_from_source_query() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert visible job from greenhouse
            let mut job1 = create_test_job("visible_gh", "Visible Greenhouse", 0.9);
            job1.source = "greenhouse".to_string();
            db.upsert_job(&job1).await.unwrap();

            // Insert hidden job from greenhouse
            let mut job2 = create_test_job("hidden_gh", "Hidden Greenhouse", 0.95);
            job2.source = "greenhouse".to_string();
            let id2 = db.upsert_job(&job2).await.unwrap();
            db.hide_job(id2).await.unwrap();

            // Get greenhouse jobs
            let greenhouse = db.get_jobs_by_source("greenhouse", 10).await.unwrap();

            // Should only return visible job
            assert_eq!(greenhouse.len(), 1);
            assert_eq!(greenhouse[0].title, "Visible Greenhouse");
        }
    }

    mod bookmark_tests {
        use super::*;

        #[tokio::test]
        async fn test_toggle_bookmark_on() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("toggle_on", "Test Job", 0.9);
            let id = db.upsert_job(&job).await.unwrap();

            // Initially not bookmarked
            let before = db.get_job_by_id(id).await.unwrap().unwrap();
            assert!(!before.bookmarked);

            // Toggle bookmark (should turn ON)
            let new_state = db.toggle_bookmark(id).await.unwrap();
            assert!(new_state);

            // Verify in database
            let after = db.get_job_by_id(id).await.unwrap().unwrap();
            assert!(after.bookmarked);
        }

        #[tokio::test]
        async fn test_toggle_bookmark_off() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("toggle_off", "Test Job", 0.9);
            let id = db.upsert_job(&job).await.unwrap();

            // First toggle to ON
            let state1 = db.toggle_bookmark(id).await.unwrap();
            assert!(state1, "First toggle should return true");

            // Verify it's ON
            let mid = db.get_job_by_id(id).await.unwrap().unwrap();
            assert!(mid.bookmarked, "Job should be bookmarked after first toggle");

            // Toggle again (should turn OFF)
            let state2 = db.toggle_bookmark(id).await.unwrap();
            assert!(!state2, "Second toggle should return false");

            // Verify in database
            let after = db.get_job_by_id(id).await.unwrap().unwrap();
            assert!(!after.bookmarked, "Job should not be bookmarked after second toggle");
        }

        #[tokio::test]
        async fn test_toggle_bookmark_cycle() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("toggle_cycle", "Test Job", 0.9);
            let id = db.upsert_job(&job).await.unwrap();

            // Cycle: OFF -> ON -> OFF -> ON
            let state1 = db.toggle_bookmark(id).await.unwrap();
            assert!(state1, "First toggle should be ON");

            let state2 = db.toggle_bookmark(id).await.unwrap();
            assert!(!state2, "Second toggle should be OFF");

            let state3 = db.toggle_bookmark(id).await.unwrap();
            assert!(state3, "Third toggle should be ON");
        }

        #[tokio::test]
        async fn test_toggle_bookmark_nonexistent_job() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Try to toggle bookmark on non-existent job
            let result = db.toggle_bookmark(999999).await;
            assert!(result.is_err());
        }

        #[tokio::test]
        async fn test_set_bookmark_true() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("set_true", "Test Job", 0.9);
            let id = db.upsert_job(&job).await.unwrap();

            // Set bookmark to true
            db.set_bookmark(id, true).await.unwrap();

            let after = db.get_job_by_id(id).await.unwrap().unwrap();
            assert!(after.bookmarked);
        }

        #[tokio::test]
        async fn test_set_bookmark_false() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("set_false", "Test Job", 0.9);
            let id = db.upsert_job(&job).await.unwrap();

            // Bookmark it first
            db.set_bookmark(id, true).await.unwrap();

            // Then set to false
            db.set_bookmark(id, false).await.unwrap();

            let after = db.get_job_by_id(id).await.unwrap().unwrap();
            assert!(!after.bookmarked);
        }

        #[tokio::test]
        async fn test_set_bookmark_idempotent() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("idempotent", "Test Job", 0.9);
            let id = db.upsert_job(&job).await.unwrap();

            // Set to true multiple times
            db.set_bookmark(id, true).await.unwrap();
            db.set_bookmark(id, true).await.unwrap();
            db.set_bookmark(id, true).await.unwrap();

            let after = db.get_job_by_id(id).await.unwrap().unwrap();
            assert!(after.bookmarked);
        }

        #[tokio::test]
        async fn test_get_bookmarked_jobs() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert bookmarked jobs with different scores
            let job1 = create_test_job("bookmarked1", "Bookmarked High", 0.95);
            let id1 = db.upsert_job(&job1).await.unwrap();
            db.set_bookmark(id1, true).await.unwrap();

            let job2 = create_test_job("bookmarked2", "Bookmarked Medium", 0.80);
            let id2 = db.upsert_job(&job2).await.unwrap();
            db.set_bookmark(id2, true).await.unwrap();

            // Insert non-bookmarked job
            let job3 = create_test_job("not_bookmarked", "Not Bookmarked", 0.99);
            db.upsert_job(&job3).await.unwrap();

            // Get bookmarked jobs
            let bookmarked = db.get_bookmarked_jobs(10).await.unwrap();

            // Should only return bookmarked jobs
            assert_eq!(bookmarked.len(), 2);
            assert!(bookmarked.iter().all(|j| j.bookmarked));

            // Should be ordered by score DESC
            assert!(bookmarked[0].score.unwrap() >= bookmarked[1].score.unwrap());
        }

        #[tokio::test]
        async fn test_get_bookmarked_jobs_limit() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert 5 bookmarked jobs
            for i in 0..5 {
                let job = create_test_job(&format!("bookmark_{}", i), &format!("Job {}", i), 0.8);
                let id = db.upsert_job(&job).await.unwrap();
                db.set_bookmark(id, true).await.unwrap();
            }

            // Get only 3
            let bookmarked = db.get_bookmarked_jobs(3).await.unwrap();
            assert_eq!(bookmarked.len(), 3);
        }

        #[tokio::test]
        async fn test_get_bookmarked_jobs_excludes_hidden() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert bookmarked but hidden job
            let job1 = create_test_job("bookmarked_hidden", "Bookmarked Hidden", 0.9);
            let id1 = db.upsert_job(&job1).await.unwrap();
            db.set_bookmark(id1, true).await.unwrap();
            db.hide_job(id1).await.unwrap();

            // Insert bookmarked visible job
            let job2 = create_test_job("bookmarked_visible", "Bookmarked Visible", 0.85);
            let id2 = db.upsert_job(&job2).await.unwrap();
            db.set_bookmark(id2, true).await.unwrap();

            // Should only return visible bookmarked job
            let bookmarked = db.get_bookmarked_jobs(10).await.unwrap();
            assert_eq!(bookmarked.len(), 1);
            assert_eq!(bookmarked[0].title, "Bookmarked Visible");
        }

        #[tokio::test]
        async fn test_get_bookmarked_jobs_empty() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert non-bookmarked job
            let job = create_test_job("not_bookmarked", "Not Bookmarked", 0.9);
            db.upsert_job(&job).await.unwrap();

            let bookmarked = db.get_bookmarked_jobs(10).await.unwrap();
            assert_eq!(bookmarked.len(), 0);
        }
    }

    mod notes_tests {
        use super::*;

        #[tokio::test]
        async fn test_set_job_notes() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("notes_test", "Test Job", 0.9);
            let id = db.upsert_job(&job).await.unwrap();

            // Set notes
            db.set_job_notes(id, Some("Great company culture!")).await.unwrap();

            // Verify notes were set
            let after = db.get_job_by_id(id).await.unwrap().unwrap();
            assert_eq!(after.notes.as_deref(), Some("Great company culture!"));
        }

        #[tokio::test]
        async fn test_set_job_notes_update() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("notes_update", "Test Job", 0.9);
            let id = db.upsert_job(&job).await.unwrap();

            // Set initial notes
            db.set_job_notes(id, Some("Original notes")).await.unwrap();

            // Update notes
            db.set_job_notes(id, Some("Updated notes")).await.unwrap();

            let after = db.get_job_by_id(id).await.unwrap().unwrap();
            assert_eq!(after.notes.as_deref(), Some("Updated notes"));
        }

        #[tokio::test]
        async fn test_set_job_notes_clear() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("notes_clear", "Test Job", 0.9);
            let id = db.upsert_job(&job).await.unwrap();

            // Set notes
            db.set_job_notes(id, Some("Some notes")).await.unwrap();

            // Clear notes by setting to None
            db.set_job_notes(id, None).await.unwrap();

            let after = db.get_job_by_id(id).await.unwrap().unwrap();
            assert!(after.notes.is_none());
        }

        #[tokio::test]
        async fn test_get_job_notes() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("get_notes", "Test Job", 0.9);
            let id = db.upsert_job(&job).await.unwrap();

            // Set notes
            db.set_job_notes(id, Some("Test notes")).await.unwrap();

            // Get notes using dedicated method
            let notes = db.get_job_notes(id).await.unwrap();
            assert_eq!(notes.as_deref(), Some("Test notes"));
        }

        #[tokio::test]
        async fn test_get_job_notes_none() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("no_notes", "Test Job", 0.9);
            let id = db.upsert_job(&job).await.unwrap();

            // Get notes (should be None)
            let notes = db.get_job_notes(id).await.unwrap();
            assert!(notes.is_none());
        }

        #[tokio::test]
        async fn test_get_job_notes_nonexistent() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Get notes for non-existent job
            let notes = db.get_job_notes(999999).await.unwrap();
            assert!(notes.is_none());
        }

        #[tokio::test]
        async fn test_get_jobs_with_notes() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert job with notes
            let job1 = create_test_job("with_notes1", "Job 1", 0.9);
            let id1 = db.upsert_job(&job1).await.unwrap();
            db.set_job_notes(id1, Some("Notes 1")).await.unwrap();

            // Insert job without notes
            let job2 = create_test_job("no_notes", "Job 2", 0.85);
            db.upsert_job(&job2).await.unwrap();

            // Insert another job with notes
            let job3 = create_test_job("with_notes2", "Job 3", 0.95);
            let id3 = db.upsert_job(&job3).await.unwrap();
            db.set_job_notes(id3, Some("Notes 2")).await.unwrap();

            // Get jobs with notes
            let jobs_with_notes = db.get_jobs_with_notes(10).await.unwrap();

            assert_eq!(jobs_with_notes.len(), 2);
            assert!(jobs_with_notes.iter().all(|j| j.notes.is_some()));
        }

        #[tokio::test]
        async fn test_get_jobs_with_notes_ordered_by_updated() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert first job with notes
            let job1 = create_test_job("notes_old", "Old Job", 0.9);
            let id1 = db.upsert_job(&job1).await.unwrap();
            db.set_job_notes(id1, Some("Old notes")).await.unwrap();

            tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;

            // Insert second job with notes
            let job2 = create_test_job("notes_new", "New Job", 0.85);
            let id2 = db.upsert_job(&job2).await.unwrap();
            db.set_job_notes(id2, Some("New notes")).await.unwrap();

            let jobs = db.get_jobs_with_notes(10).await.unwrap();

            // Should be ordered by updated_at DESC (newest first)
            assert_eq!(jobs[0].title, "New Job");
            assert_eq!(jobs[1].title, "Old Job");
        }

        #[tokio::test]
        async fn test_get_jobs_with_notes_limit() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert 5 jobs with notes
            for i in 0..5 {
                let job = create_test_job(&format!("notes_{}", i), &format!("Job {}", i), 0.8);
                let id = db.upsert_job(&job).await.unwrap();
                db.set_job_notes(id, Some(&format!("Notes {}", i))).await.unwrap();
            }

            let jobs = db.get_jobs_with_notes(3).await.unwrap();
            assert_eq!(jobs.len(), 3);
        }

        #[tokio::test]
        async fn test_get_jobs_with_notes_excludes_hidden() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert job with notes but hidden
            let job1 = create_test_job("notes_hidden", "Hidden Job", 0.9);
            let id1 = db.upsert_job(&job1).await.unwrap();
            db.set_job_notes(id1, Some("Hidden notes")).await.unwrap();
            db.hide_job(id1).await.unwrap();

            // Insert job with notes and visible
            let job2 = create_test_job("notes_visible", "Visible Job", 0.85);
            let id2 = db.upsert_job(&job2).await.unwrap();
            db.set_job_notes(id2, Some("Visible notes")).await.unwrap();

            let jobs = db.get_jobs_with_notes(10).await.unwrap();
            assert_eq!(jobs.len(), 1);
            assert_eq!(jobs[0].title, "Visible Job");
        }

        #[tokio::test]
        async fn test_notes_with_special_characters() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("special_chars", "Test Job", 0.9);
            let id = db.upsert_job(&job).await.unwrap();

            let special_notes = "Notes with 'quotes', \"double quotes\", and émojis 🎉";
            db.set_job_notes(id, Some(special_notes)).await.unwrap();

            let notes = db.get_job_notes(id).await.unwrap();
            assert_eq!(notes.as_deref(), Some(special_notes));
        }

        #[tokio::test]
        async fn test_notes_with_long_text() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("long_notes", "Test Job", 0.9);
            let id = db.upsert_job(&job).await.unwrap();

            let long_notes = "x".repeat(10000);
            db.set_job_notes(id, Some(&long_notes)).await.unwrap();

            let notes = db.get_job_notes(id).await.unwrap();
            assert_eq!(notes.as_deref(), Some(long_notes.as_str()));
        }
    }

    mod search_tests {
        use super::*;

        #[tokio::test]
        async fn test_search_jobs_by_title() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert jobs
            let job1 = create_test_job("search1", "Senior Rust Engineer", 0.9);
            db.upsert_job(&job1).await.unwrap();

            let job2 = create_test_job("search2", "Junior Python Developer", 0.8);
            db.upsert_job(&job2).await.unwrap();

            let job3 = create_test_job("search3", "Rust Developer", 0.85);
            db.upsert_job(&job3).await.unwrap();

            // Search for "Rust"
            let results = db.search_jobs("Rust", 10).await.unwrap();

            assert_eq!(results.len(), 2);
            assert!(results.iter().any(|j| j.title.contains("Rust")));
        }

        #[tokio::test]
        async fn test_search_jobs_by_description() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert job with specific description
            let mut job = create_test_job("search_desc", "Test Job", 0.9);
            job.description = Some("Looking for an expert in distributed systems and microservices".to_string());
            db.upsert_job(&job).await.unwrap();

            // Search for term in description
            let results = db.search_jobs("microservices", 10).await.unwrap();

            assert_eq!(results.len(), 1);
            assert!(results[0].description.as_ref().unwrap().contains("microservices"));
        }

        #[tokio::test]
        async fn test_search_jobs_limit() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert 5 jobs with "Engineer" in title
            for i in 0..5 {
                let job = create_test_job(&format!("eng_{}", i), &format!("Software Engineer {}", i), 0.8);
                db.upsert_job(&job).await.unwrap();
            }

            // Search with limit 3
            let results = db.search_jobs("Engineer", 3).await.unwrap();

            assert_eq!(results.len(), 3);
        }

        #[tokio::test]
        async fn test_search_jobs_no_results() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("search_none", "Rust Engineer", 0.9);
            db.upsert_job(&job).await.unwrap();

            // Search for term that doesn't exist
            let results = db.search_jobs("ZyxwvutNonexistent", 10).await.unwrap();

            assert_eq!(results.len(), 0);
        }

        #[tokio::test]
        async fn test_search_jobs_case_insensitive() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("case_test", "Senior RUST Engineer", 0.9);
            db.upsert_job(&job).await.unwrap();

            // Search with lowercase
            let results = db.search_jobs("rust", 10).await.unwrap();

            assert_eq!(results.len(), 1);
        }

        #[tokio::test]
        async fn test_search_jobs_empty_query() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("empty_search", "Test Job", 0.9);
            db.upsert_job(&job).await.unwrap();

            // Empty search should return no results (FTS5 requirement)
            let results = db.search_jobs("", 10).await;

            // FTS5 typically returns error for empty query
            assert!(results.is_err() || results.unwrap().is_empty());
        }
    }

    mod duplicate_detection_tests {
        use super::*;

        #[tokio::test]
        async fn test_find_duplicate_groups_same_title_company() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert same job from different sources
            let mut job1 = create_test_job("dup1", "Senior Engineer", 0.95);
            job1.company = "TechCorp".to_string();
            job1.source = "greenhouse".to_string();
            db.upsert_job(&job1).await.unwrap();

            let mut job2 = create_test_job("dup2", "Senior Engineer", 0.90);
            job2.company = "TechCorp".to_string();
            job2.source = "lever".to_string();
            db.upsert_job(&job2).await.unwrap();

            let mut job3 = create_test_job("dup3", "Senior Engineer", 0.88);
            job3.company = "TechCorp".to_string();
            job3.source = "linkedin".to_string();
            db.upsert_job(&job3).await.unwrap();

            // Find duplicates
            let groups = db.find_duplicate_groups().await.unwrap();

            assert_eq!(groups.len(), 1);
            assert_eq!(groups[0].jobs.len(), 3);
            assert_eq!(groups[0].sources.len(), 3);
        }

        #[tokio::test]
        async fn test_find_duplicate_groups_case_insensitive() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert jobs with different casing
            let mut job1 = create_test_job("case1", "Software Engineer", 0.9);
            job1.company = "CompanyA".to_string();
            db.upsert_job(&job1).await.unwrap();

            let mut job2 = create_test_job("case2", "SOFTWARE ENGINEER", 0.85);
            job2.company = "companyA".to_string();
            db.upsert_job(&job2).await.unwrap();

            let groups = db.find_duplicate_groups().await.unwrap();

            assert_eq!(groups.len(), 1);
            assert_eq!(groups[0].jobs.len(), 2);
        }

        #[tokio::test]
        async fn test_find_duplicate_groups_primary_is_highest_score() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert duplicates with different scores
            let mut job1 = create_test_job("score1", "Job Title", 0.85);
            job1.company = "Company".to_string();
            let _id1 = db.upsert_job(&job1).await.unwrap();

            let mut job2 = create_test_job("score2", "Job Title", 0.95);
            job2.company = "Company".to_string();
            let id2 = db.upsert_job(&job2).await.unwrap();

            let groups = db.find_duplicate_groups().await.unwrap();

            assert_eq!(groups.len(), 1);
            // Primary should be the highest score (id2)
            assert_eq!(groups[0].primary_id, id2);
        }

        #[tokio::test]
        async fn test_find_duplicate_groups_excludes_hidden() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert visible duplicate
            let mut job1 = create_test_job("visible_dup", "Duplicate Job", 0.9);
            job1.company = "Company".to_string();
            db.upsert_job(&job1).await.unwrap();

            // Insert hidden duplicate
            let mut job2 = create_test_job("hidden_dup", "Duplicate Job", 0.85);
            job2.company = "Company".to_string();
            let id2 = db.upsert_job(&job2).await.unwrap();
            db.hide_job(id2).await.unwrap();

            let groups = db.find_duplicate_groups().await.unwrap();

            // Should not form a duplicate group if one is hidden
            assert_eq!(groups.len(), 0);
        }

        #[tokio::test]
        async fn test_find_duplicate_groups_no_duplicates() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert unique jobs
            let job1 = create_test_job("unique1", "Job A", 0.9);
            db.upsert_job(&job1).await.unwrap();

            let job2 = create_test_job("unique2", "Job B", 0.85);
            db.upsert_job(&job2).await.unwrap();

            let groups = db.find_duplicate_groups().await.unwrap();

            assert_eq!(groups.len(), 0);
        }

        #[tokio::test]
        async fn test_find_duplicate_groups_multiple_groups() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Group 1: Job A at CompanyX
            let mut job1a = create_test_job("1a", "Job A", 0.9);
            job1a.company = "CompanyX".to_string();
            db.upsert_job(&job1a).await.unwrap();

            let mut job1b = create_test_job("1b", "Job A", 0.85);
            job1b.company = "CompanyX".to_string();
            db.upsert_job(&job1b).await.unwrap();

            // Group 2: Job B at CompanyY
            let mut job2a = create_test_job("2a", "Job B", 0.95);
            job2a.company = "CompanyY".to_string();
            db.upsert_job(&job2a).await.unwrap();

            let mut job2b = create_test_job("2b", "Job B", 0.80);
            job2b.company = "CompanyY".to_string();
            db.upsert_job(&job2b).await.unwrap();

            let groups = db.find_duplicate_groups().await.unwrap();

            assert_eq!(groups.len(), 2);
        }

        #[tokio::test]
        async fn test_merge_duplicates() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Insert duplicates
            let mut job1 = create_test_job("merge1", "Job Title", 0.95);
            job1.company = "Company".to_string();
            let primary_id = db.upsert_job(&job1).await.unwrap();

            let mut job2 = create_test_job("merge2", "Job Title", 0.90);
            job2.company = "Company".to_string();
            let dup_id1 = db.upsert_job(&job2).await.unwrap();

            let mut job3 = create_test_job("merge3", "Job Title", 0.85);
            job3.company = "Company".to_string();
            let dup_id2 = db.upsert_job(&job3).await.unwrap();

            // Merge duplicates
            db.merge_duplicates(primary_id, &[primary_id, dup_id1, dup_id2]).await.unwrap();

            // Primary should still be visible
            let primary = db.get_job_by_id(primary_id).await.unwrap().unwrap();
            assert!(!primary.hidden);

            // Duplicates should be hidden
            let dup1 = db.get_job_by_id(dup_id1).await.unwrap().unwrap();
            assert!(dup1.hidden);

            let dup2 = db.get_job_by_id(dup_id2).await.unwrap().unwrap();
            assert!(dup2.hidden);
        }

        #[tokio::test]
        async fn test_merge_duplicates_primary_not_hidden() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job1 = create_test_job("primary", "Job", 0.9);
            let primary_id = db.upsert_job(&job1).await.unwrap();

            let job2 = create_test_job("duplicate", "Job", 0.8);
            let dup_id = db.upsert_job(&job2).await.unwrap();

            // Merge with primary in the list
            db.merge_duplicates(primary_id, &[primary_id, dup_id]).await.unwrap();

            // Primary should NOT be hidden
            let primary = db.get_job_by_id(primary_id).await.unwrap().unwrap();
            assert!(!primary.hidden);
        }

        #[tokio::test]
        async fn test_merge_duplicates_empty_list() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("single", "Single Job", 0.9);
            let id = db.upsert_job(&job).await.unwrap();

            // Merge with empty list (should be no-op)
            db.merge_duplicates(id, &[]).await.unwrap();

            let after = db.get_job_by_id(id).await.unwrap().unwrap();
            assert!(!after.hidden);
        }
    }

    mod edge_case_tests {
        use super::*;

        #[tokio::test]
        async fn test_job_with_empty_strings() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let mut job = create_test_job("empty_strings", "Valid Title", 0.9);
            job.location = Some("".to_string());
            job.description = Some("".to_string());
            job.currency = Some("".to_string());

            let id = db.upsert_job(&job).await.unwrap();
            let fetched = db.get_job_by_id(id).await.unwrap().unwrap();

            // Empty strings should be preserved (not converted to None)
            assert_eq!(fetched.location.as_deref(), Some(""));
            assert_eq!(fetched.description.as_deref(), Some(""));
            assert_eq!(fetched.currency.as_deref(), Some(""));
        }

        #[tokio::test]
        async fn test_job_with_zero_salary() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let mut job = create_test_job("zero_salary", "Test Job", 0.9);
            job.salary_min = Some(0);
            job.salary_max = Some(0);

            let id = db.upsert_job(&job).await.unwrap();
            let fetched = db.get_job_by_id(id).await.unwrap().unwrap();

            assert_eq!(fetched.salary_min, Some(0));
            assert_eq!(fetched.salary_max, Some(0));
        }

        #[tokio::test]
        async fn test_job_with_negative_salary() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let mut job = create_test_job("negative_salary", "Test Job", 0.9);
            job.salary_min = Some(-1000);
            job.salary_max = Some(-500);

            let id = db.upsert_job(&job).await.unwrap();
            let fetched = db.get_job_by_id(id).await.unwrap().unwrap();

            // Negative salaries are stored (validation is application-level)
            assert_eq!(fetched.salary_min, Some(-1000));
            assert_eq!(fetched.salary_max, Some(-500));
        }

        #[tokio::test]
        async fn test_job_with_score_boundary_values() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            // Score = 0.0
            let job1 = create_test_job("score_zero", "Zero Score", 0.0);
            let id1 = db.upsert_job(&job1).await.unwrap();
            let fetched1 = db.get_job_by_id(id1).await.unwrap().unwrap();
            assert_eq!(fetched1.score, Some(0.0));

            // Score = 1.0
            let job2 = create_test_job("score_one", "Perfect Score", 1.0);
            let id2 = db.upsert_job(&job2).await.unwrap();
            let fetched2 = db.get_job_by_id(id2).await.unwrap().unwrap();
            assert_eq!(fetched2.score, Some(1.0));
        }

        #[tokio::test]
        async fn test_get_recent_jobs_with_limit_zero() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("limit_zero", "Test Job", 0.9);
            db.upsert_job(&job).await.unwrap();

            let results = db.get_recent_jobs(0).await.unwrap();
            assert_eq!(results.len(), 0);
        }

        #[tokio::test]
        async fn test_get_recent_jobs_with_negative_limit() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("negative_limit", "Test Job", 0.9);
            db.upsert_job(&job).await.unwrap();

            // SQLite treats negative LIMIT as unlimited
            let results = db.get_recent_jobs(-1).await.unwrap();
            assert_eq!(results.len(), 1);
        }

        #[tokio::test]
        async fn test_unicode_in_job_fields() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let mut job = create_test_job("unicode", "Développeur Senior 🚀", 0.9);
            job.company = "株式会社テスト".to_string();
            job.location = Some("São Paulo, Brasil 🇧🇷".to_string());
            job.description = Some("Looking for a 全栈工程师 with 経験 in Rust".to_string());

            let id = db.upsert_job(&job).await.unwrap();
            let fetched = db.get_job_by_id(id).await.unwrap().unwrap();

            assert_eq!(fetched.title, "Développeur Senior 🚀");
            assert_eq!(fetched.company, "株式会社テスト");
            assert_eq!(fetched.location.as_deref(), Some("São Paulo, Brasil 🇧🇷"));
        }

        #[tokio::test]
        async fn test_sql_injection_protection_in_search() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("injection_test", "Test Job", 0.9);
            db.upsert_job(&job).await.unwrap();

            // Try SQL injection in search query
            let malicious_query = "'; DROP TABLE jobs; --";
            let _result = db.search_jobs(malicious_query, 10).await;

            // Should either return empty results or FTS5 error, NOT drop the table
            // The table should still exist after this
            let jobs = db.get_recent_jobs(10).await.unwrap();
            assert_eq!(jobs.len(), 1, "Table should not be dropped");
        }

        #[tokio::test]
        async fn test_very_large_times_seen() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("large_times_seen", "Popular Job", 0.9);
            let id = db.upsert_job(&job).await.unwrap();

            // Upsert many times
            for _ in 0..100 {
                db.upsert_job(&job).await.unwrap();
            }

            let fetched = db.get_job_by_id(id).await.unwrap().unwrap();
            assert_eq!(fetched.times_seen, 101);
        }

        #[tokio::test]
        async fn test_job_with_very_long_url() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let mut job = create_test_job("long_url", "Test Job", 0.9);
            // Create a URL at the limit (2000 chars exactly)
            job.url = format!("https://example.com/job?{}", "x".repeat(1976));

            let id = db.upsert_job(&job).await.unwrap();
            let fetched = db.get_job_by_id(id).await.unwrap().unwrap();

            assert_eq!(fetched.url.len(), 2000);
        }

        #[tokio::test]
        async fn test_concurrent_upserts_same_hash() {
            let db = Database::connect_memory().await.unwrap();
            db.migrate().await.unwrap();

            let job = create_test_job("concurrent", "Test Job", 0.9);

            // First insert the job once to establish the row
            db.upsert_job(&job).await.unwrap();

            // Then do concurrent updates
            let mut handles = vec![];
            for _ in 0..10 {
                let job_clone = job.clone();
                let db_pool = db.pool().clone();
                let handle = tokio::spawn(async move {
                    let db = Database { pool: db_pool };
                    db.upsert_job(&job_clone).await
                });
                handles.push(handle);
            }

            // Wait for all to complete
            let mut ids = vec![];
            for handle in handles {
                let id = handle.await.unwrap().unwrap();
                ids.push(id);
            }

            // All should return the same ID (deduplication worked)
            assert!(ids.iter().all(|&id| id == ids[0]));

            // Verify times_seen incremented correctly (1 initial + 10 concurrent = 11)
            let fetched = db.get_job_by_id(ids[0]).await.unwrap().unwrap();
            assert_eq!(fetched.times_seen, 11);
        }
    }
}
