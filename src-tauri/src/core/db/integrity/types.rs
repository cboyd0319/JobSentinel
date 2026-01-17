//! Type definitions for database integrity checking

/// Result of an integrity check
#[derive(Debug)]
pub(super) struct CheckResult {
    pub is_ok: bool,
    pub message: String,
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
    pub busy: i64,                // 0 if checkpoint completed, non-zero if blocked
    pub log_frames: i64,          // Total frames in WAL
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
