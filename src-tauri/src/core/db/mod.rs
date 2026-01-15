//! Database Layer (SQLite)
//!
//! Handles all database operations using SQLx with async support.

pub mod integrity;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{sqlite::SqlitePool, FromRow, Row};
use std::path::PathBuf;

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
}
