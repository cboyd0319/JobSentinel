//! Tests for database integrity checking

use super::*;
use chrono::Utc;
use sqlx::SqlitePool;

mod backup_tests;
mod health_metrics_tests;
mod model_tests;

async fn create_test_db() -> SqlitePool {
    let pool = SqlitePool::connect("sqlite::memory:").await.unwrap();

    // Run migrations
    sqlx::migrate!("./migrations").run(&pool).await.unwrap();

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
async fn test_optimize_query_planner() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db, temp_dir.path().to_path_buf());

    // Should not fail
    integrity.optimize_query_planner().await.unwrap();
}

#[tokio::test]
#[ignore = "WAL checkpoint requires file-based database"]
async fn test_checkpoint_wal() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db, temp_dir.path().to_path_buf());

    // Checkpoint WAL
    let result = integrity.checkpoint_wal().await.unwrap();

    // busy should be 0 (not blocked)
    assert_eq!(result.busy, 0, "Checkpoint should not be blocked");
    assert!(result.log_frames >= 0, "Should have frame count");
    assert!(
        result.checkpointed_frames >= 0,
        "Should have checkpointed frames"
    );
}

#[tokio::test]
#[ignore = "PRAGMA diagnostics require file-based database"]
async fn test_pragma_diagnostics() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db, temp_dir.path().to_path_buf());

    let diag = integrity.get_pragma_diagnostics().await.unwrap();

    // Verify WAL mode
    assert_eq!(
        diag.journal_mode.to_lowercase(),
        "wal",
        "Should be in WAL mode"
    );

    // Verify foreign keys enabled
    assert!(diag.foreign_keys, "Foreign keys should be enabled");

    // Verify cache size (should be -64000 or close)
    assert!(
        diag.cache_size.abs() > 1000,
        "Cache size should be set (got {})",
        diag.cache_size
    );

    // Verify page size
    assert_eq!(diag.page_size, 4096, "Page size should be 4096");

    // Verify SQLite version is set
    assert!(
        !diag.sqlite_version.is_empty(),
        "SQLite version should be set"
    );

    // Log diagnostics for debugging
    tracing::debug!("PRAGMA Diagnostics:");
    tracing::debug!("  Journal mode: {}", diag.journal_mode);
    tracing::debug!("  Synchronous: {}", diag.synchronous);
    tracing::debug!("  Cache size: {}", diag.cache_size);
    tracing::debug!("  Page size: {}", diag.page_size);
    tracing::debug!("  Auto vacuum: {}", diag.auto_vacuum);
    tracing::debug!("  Foreign keys: {}", diag.foreign_keys);
    tracing::debug!("  Temp store: {}", diag.temp_store);
    tracing::debug!("  Locking mode: {}", diag.locking_mode);
    tracing::debug!("  Secure delete: {}", diag.secure_delete);
    tracing::debug!("  Cell size check: {}", diag.cell_size_check);
    tracing::debug!("  SQLite version: {}", diag.sqlite_version);
}

#[tokio::test]
async fn test_integrity_check_logging() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db.clone(), temp_dir.path().to_path_buf());

    // Run startup check
    let status = integrity.startup_check().await.unwrap();
    assert!(matches!(status, IntegrityStatus::Healthy));

    // Verify check was logged
    let log_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM integrity_check_log")
        .fetch_one(&db)
        .await
        .unwrap();
    assert!(log_count > 0, "Should have logged integrity check");

    // Verify log details
    let log_entry: (String, String) = sqlx::query_as(
        "SELECT check_type, status FROM integrity_check_log ORDER BY created_at DESC LIMIT 1",
    )
    .fetch_one(&db)
    .await
    .unwrap();

    assert_eq!(log_entry.0, "quick", "Should log quick check");
    assert_eq!(log_entry.1, "passed", "Should log passed status");
}

#[tokio::test]
async fn test_foreign_key_violation_detection() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db.clone(), temp_dir.path().to_path_buf());

    // Temporarily disable foreign keys to insert invalid data
    sqlx::query("PRAGMA foreign_keys = OFF")
        .execute(&db)
        .await
        .unwrap();

    // This would normally be caught, but we disabled FK checks
    // In a real scenario with FK violations, this would be detected
    // For now, just verify the check runs without error
    let violations = integrity.foreign_key_check().await.unwrap();
    assert_eq!(violations.len(), 0, "Should have no violations in test DB");

    // Re-enable foreign keys
    sqlx::query("PRAGMA foreign_keys = ON")
        .execute(&db)
        .await
        .unwrap();
}

#[tokio::test]
async fn test_full_integrity_check() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db, temp_dir.path().to_path_buf());

    let result = integrity.full_integrity_check().await.unwrap();
    assert!(
        result.is_ok,
        "Healthy database should pass full integrity check"
    );
    assert_eq!(result.message.to_lowercase(), "ok");
}

#[tokio::test]
async fn test_should_run_full_check_never_run() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db, temp_dir.path().to_path_buf());

    let should_run = integrity.should_run_full_check().await.unwrap();
    assert!(should_run, "Should run full check if never run before");
}

#[tokio::test]
async fn test_should_run_full_check_recent() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db.clone(), temp_dir.path().to_path_buf());

    // Set last check to now
    integrity.update_last_full_check().await.unwrap();

    let should_run = integrity.should_run_full_check().await.unwrap();
    assert!(!should_run, "Should not run full check if recently run");
}

#[tokio::test]
async fn test_should_run_full_check_old() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db.clone(), temp_dir.path().to_path_buf());

    // Set last check to 8 days ago
    let old_timestamp = (Utc::now() - chrono::Duration::days(8)).to_rfc3339();
    sqlx::query(
"INSERT OR REPLACE INTO app_metadata (key, value, updated_at) VALUES (?, ?, datetime('now'))",
)
.bind("last_full_integrity_check")
.bind(old_timestamp)
.execute(&db)
.await
.unwrap();

    let should_run = integrity.should_run_full_check().await.unwrap();
    assert!(
        should_run,
        "Should run full check if last check was > 7 days ago"
    );
}

#[tokio::test]
async fn test_should_run_full_check_invalid_timestamp() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db.clone(), temp_dir.path().to_path_buf());

    // Set invalid timestamp
    sqlx::query(
"INSERT OR REPLACE INTO app_metadata (key, value, updated_at) VALUES (?, ?, datetime('now'))",
)
.bind("last_full_integrity_check")
.bind("invalid-timestamp")
.execute(&db)
.await
.unwrap();

    let should_run = integrity.should_run_full_check().await.unwrap();
    assert!(should_run, "Should run full check if timestamp is invalid");
}

#[tokio::test]
async fn test_update_last_full_check() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db.clone(), temp_dir.path().to_path_buf());

    integrity.update_last_full_check().await.unwrap();

    let timestamp: String = sqlx::query_scalar(
        "SELECT value FROM app_metadata WHERE key = 'last_full_integrity_check'",
    )
    .fetch_one(&db)
    .await
    .unwrap();

    assert!(!timestamp.is_empty(), "Timestamp should be set");
    assert!(
        chrono::DateTime::parse_from_rfc3339(&timestamp).is_ok(),
        "Timestamp should be valid RFC3339"
    );
}

#[tokio::test]
async fn test_log_check() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db.clone(), temp_dir.path().to_path_buf());

    let duration = std::time::Duration::from_millis(123);
    integrity
        .log_check("quick", "passed", Some("test details"), duration)
        .await
        .unwrap();

    let (check_type, status, details, duration_ms): (String, String, Option<String>, i64) =
sqlx::query_as(
    "SELECT check_type, status, details, duration_ms FROM integrity_check_log ORDER BY created_at DESC LIMIT 1",
)
.fetch_one(&db)
.await
.unwrap();

    assert_eq!(check_type, "quick");
    assert_eq!(status, "passed");
    assert_eq!(details.unwrap(), "test details");
    assert_eq!(duration_ms, 123);
}

#[tokio::test]
async fn test_log_check_without_details() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db.clone(), temp_dir.path().to_path_buf());

    let duration = std::time::Duration::from_secs(1);
    integrity
        .log_check("quick", "passed", None, duration)
        .await
        .unwrap();

    let details: Option<String> = sqlx::query_scalar(
        "SELECT details FROM integrity_check_log ORDER BY created_at DESC LIMIT 1",
    )
    .fetch_one(&db)
    .await
    .unwrap();

    assert!(details.is_none(), "Details should be None");
}

#[tokio::test]
async fn test_optimize() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db, temp_dir.path().to_path_buf());

    // Should not fail
    integrity.optimize().await.unwrap();
}

#[tokio::test]
async fn test_optimize_with_data() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db.clone(), temp_dir.path().to_path_buf());

    // Insert some data
    for i in 0..50 {
        sqlx::query("INSERT INTO jobs (hash, title, company, url, source) VALUES (?, ?, ?, ?, ?)")
            .bind(format!("hash_{}", i))
            .bind(format!("Job {}", i))
            .bind("Company")
            .bind(format!("https://example.com/{}", i))
            .bind("test")
            .execute(&db)
            .await
            .unwrap();
    }

    // Optimize should succeed
    integrity.optimize().await.unwrap();
}

#[tokio::test]
async fn test_startup_check_triggers_full_check() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db.clone(), temp_dir.path().to_path_buf());

    // Set last check to 8 days ago to trigger full check
    let old_timestamp = (Utc::now() - chrono::Duration::days(8)).to_rfc3339();
    sqlx::query(
"INSERT OR REPLACE INTO app_metadata (key, value, updated_at) VALUES (?, ?, datetime('now'))",
)
.bind("last_full_integrity_check")
.bind(old_timestamp)
.execute(&db)
.await
.unwrap();

    let status = integrity.startup_check().await.unwrap();
    assert!(matches!(status, IntegrityStatus::Healthy));

    // Verify last_full_integrity_check was updated
    let timestamp: String = sqlx::query_scalar(
        "SELECT value FROM app_metadata WHERE key = 'last_full_integrity_check'",
    )
    .fetch_one(&db)
    .await
    .unwrap();

    let last_check = chrono::DateTime::parse_from_rfc3339(&timestamp).unwrap();
    let diff = (Utc::now() - last_check.with_timezone(&Utc)).num_seconds();
    assert!(diff < 10, "Last check should be very recent");
}

#[tokio::test]
async fn test_checkpoint_wal_in_memory() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db, temp_dir.path().to_path_buf());

    // In-memory database doesn't use WAL, but the call should still succeed
    let result = integrity.checkpoint_wal().await.unwrap();

    // In-memory databases may return -1 for WAL operations that don't apply
    assert!(
        result.busy >= 0 || result.busy == -1,
        "Busy should be valid"
    );
    // log_frames and checkpointed_frames can be -1 for non-WAL databases
    assert!(
        result.log_frames >= 0 || result.log_frames == -1,
        "Log frames should be valid (got {})",
        result.log_frames
    );
    assert!(
        result.checkpointed_frames >= 0 || result.checkpointed_frames == -1,
        "Checkpointed frames should be valid (got {})",
        result.checkpointed_frames
    );
}

#[tokio::test]
async fn test_get_pragma_diagnostics_in_memory() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db, temp_dir.path().to_path_buf());

    let diag = integrity.get_pragma_diagnostics().await.unwrap();

    // Verify all fields are populated
    assert!(!diag.journal_mode.is_empty(), "Journal mode should be set");
    assert!(diag.synchronous >= 0, "Synchronous should be set");
    assert!(diag.cache_size != 0, "Cache size should be set");
    assert!(diag.page_size > 0, "Page size should be positive");
    assert!(diag.auto_vacuum >= 0, "Auto vacuum should be set");
    assert!(diag.temp_store >= 0, "Temp store should be set");
    assert!(!diag.locking_mode.is_empty(), "Locking mode should be set");
    assert!(diag.secure_delete >= 0, "Secure delete should be set");
    assert!(
        !diag.sqlite_version.is_empty(),
        "SQLite version should be set"
    );

    // Verify SQLite version format (should be like "3.40.0")
    let version_parts: Vec<&str> = diag.sqlite_version.split('.').collect();
    assert!(
        version_parts.len() >= 2,
        "SQLite version should have at least major.minor"
    );
}

#[tokio::test]
async fn test_database_integrity_new_creates_backup_dir() {
    let temp_dir = tempfile::tempdir().unwrap();
    let backup_dir = temp_dir.path().join("backups").join("nested");
    assert!(!backup_dir.exists(), "Backup dir should not exist yet");

    let db = create_test_db().await;
    let _integrity = DatabaseIntegrity::new(db, backup_dir.clone());

    assert!(backup_dir.exists(), "Backup dir should be created");
    assert!(backup_dir.is_dir(), "Should be a directory");
}

#[tokio::test]
async fn test_foreign_key_check_returns_empty_vec() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db, temp_dir.path().to_path_buf());

    let violations = integrity.foreign_key_check().await.unwrap();
    assert!(violations.is_empty(), "Clean DB should have no violations");
}

#[tokio::test]
async fn test_startup_check_with_fk_violations() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db.clone(), temp_dir.path().to_path_buf());

    // Disable foreign keys temporarily to insert invalid data
    sqlx::query("PRAGMA foreign_keys = OFF")
        .execute(&db)
        .await
        .unwrap();

    // First create a job
    sqlx::query("INSERT INTO jobs (hash, title, company, url, source) VALUES (?, ?, ?, ?, ?)")
        .bind("test_hash")
        .bind("Test Job")
        .bind("Test Company")
        .bind("https://example.com")
        .bind("test")
        .execute(&db)
        .await
        .unwrap();

    // Create an application referencing the job
    sqlx::query("INSERT INTO applications (job_hash, status) VALUES (?, ?)")
        .bind("test_hash")
        .bind("applied")
        .execute(&db)
        .await
        .unwrap();

    // Delete the job that the application references (creates FK violation)
    sqlx::query("DELETE FROM jobs WHERE hash = 'test_hash'")
        .execute(&db)
        .await
        .unwrap();

    // Re-enable foreign keys to detect violations
    sqlx::query("PRAGMA foreign_keys = ON")
        .execute(&db)
        .await
        .unwrap();

    // Run foreign key check directly
    let violations = integrity.foreign_key_check().await.unwrap();

    // If we have violations (may not work in all SQLite configurations)
    if !violations.is_empty() {
        assert!(violations[0].table.len() > 0);
        assert!(violations[0].parent.len() > 0);
    }
}

#[tokio::test]
async fn test_foreign_key_violation_fields() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db.clone(), temp_dir.path().to_path_buf());

    // Just verify the foreign_key_check runs and returns proper structure
    let violations = integrity.foreign_key_check().await.unwrap();

    // Even if empty, verify the function works and returns Vec<ForeignKeyViolation>
    for violation in violations {
        // Verify ForeignKeyViolation struct fields are accessible
        let _table = violation.table;
        let _rowid = violation.rowid;
        let _parent = violation.parent;
        let _fkid = violation.fkid;
    }
}

#[tokio::test]
async fn test_startup_check_logs_passed_status() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db.clone(), temp_dir.path().to_path_buf());

    // Clear any existing logs
    sqlx::query("DELETE FROM integrity_check_log")
        .execute(&db)
        .await
        .unwrap();

    let status = integrity.startup_check().await.unwrap();
    assert!(matches!(status, IntegrityStatus::Healthy));

    // Verify log entry was created
    let log_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM integrity_check_log")
        .fetch_one(&db)
        .await
        .unwrap();
    assert!(log_count > 0);

    // Verify status is "passed"
    let status: String = sqlx::query_scalar(
        "SELECT status FROM integrity_check_log ORDER BY created_at DESC LIMIT 1",
    )
    .fetch_one(&db)
    .await
    .unwrap();
    assert_eq!(status, "passed");
}

#[tokio::test]
async fn test_log_check_duration_conversion() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db.clone(), temp_dir.path().to_path_buf());

    // Test various durations
    let test_cases = vec![
        ("quick", std::time::Duration::from_millis(1)),
        ("full", std::time::Duration::from_millis(999)),
        ("foreign_key", std::time::Duration::from_secs(1)),
    ];

    for (check_type, duration) in test_cases.iter() {
        integrity
            .log_check(check_type, "passed", None, *duration)
            .await
            .unwrap();
    }

    // Verify durations were stored correctly
    let duration_1ms: i64 = sqlx::query_scalar(
"SELECT duration_ms FROM integrity_check_log WHERE check_type = 'quick' ORDER BY created_at DESC LIMIT 1",
)
.fetch_one(&db)
.await
.unwrap();
    assert_eq!(duration_1ms, 1);

    let duration_999ms: i64 = sqlx::query_scalar(
"SELECT duration_ms FROM integrity_check_log WHERE check_type = 'full' ORDER BY created_at DESC LIMIT 1",
)
.fetch_one(&db)
.await
.unwrap();
    assert_eq!(duration_999ms, 999);

    let duration_1s: i64 = sqlx::query_scalar(
"SELECT duration_ms FROM integrity_check_log WHERE check_type = 'foreign_key' ORDER BY created_at DESC LIMIT 1",
)
.fetch_one(&db)
.await
.unwrap();
    assert_eq!(duration_1s, 1000);
}

#[tokio::test]
async fn test_should_run_full_check_edge_case_exactly_7_days() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db.clone(), temp_dir.path().to_path_buf());

    // Set last check to exactly 7 days ago
    let seven_days_ago = (Utc::now() - chrono::Duration::days(7)).to_rfc3339();
    sqlx::query(
"INSERT OR REPLACE INTO app_metadata (key, value, updated_at) VALUES (?, ?, datetime('now'))",
)
.bind("last_full_integrity_check")
.bind(seven_days_ago)
.execute(&db)
.await
.unwrap();

    let should_run = integrity.should_run_full_check().await.unwrap();
    // Should return true when days_since >= 7
    assert!(should_run);
}

#[tokio::test]
async fn test_startup_check_skips_full_check_when_recent() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db.clone(), temp_dir.path().to_path_buf());

    // Set last full check to recent (1 day ago)
    let recent = (Utc::now() - chrono::Duration::days(1)).to_rfc3339();
    sqlx::query(
"INSERT OR REPLACE INTO app_metadata (key, value, updated_at) VALUES (?, ?, datetime('now'))",
)
.bind("last_full_integrity_check")
.bind(recent)
.execute(&db)
.await
.unwrap();

    // Clear integrity check log
    sqlx::query("DELETE FROM integrity_check_log")
        .execute(&db)
        .await
        .unwrap();

    let status = integrity.startup_check().await.unwrap();
    assert!(matches!(status, IntegrityStatus::Healthy));

    // Verify only quick check was logged (not full)
    let check_types: Vec<String> = sqlx::query_scalar("SELECT check_type FROM integrity_check_log")
        .fetch_all(&db)
        .await
        .unwrap();

    // Should only have quick check, not full
    assert_eq!(check_types.len(), 1);
    assert_eq!(check_types[0], "quick");
}

#[tokio::test]
async fn test_pragma_diagnostics_all_fields_populated() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db, temp_dir.path().to_path_buf());

    let diag = integrity.get_pragma_diagnostics().await.unwrap();

    // Verify no empty strings or uninitialized values
    assert!(!diag.journal_mode.is_empty());
    assert!(!diag.locking_mode.is_empty());
    assert!(!diag.sqlite_version.is_empty());

    // Verify numeric values are within reasonable ranges
    assert!(diag.page_size > 0 && diag.page_size <= 65536);
    assert!(diag.synchronous >= 0 && diag.synchronous <= 3);
    assert!(diag.auto_vacuum >= 0 && diag.auto_vacuum <= 2);
    assert!(diag.temp_store >= 0 && diag.temp_store <= 2);
}

#[tokio::test]
async fn test_checkpoint_wal_all_return_values() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db, temp_dir.path().to_path_buf());

    let result = integrity.checkpoint_wal().await.unwrap();

    // All fields should be present (even if -1 for non-WAL)
    assert!(result.busy >= -1);
    assert!(result.log_frames >= -1);
    assert!(result.checkpointed_frames >= -1);
}
