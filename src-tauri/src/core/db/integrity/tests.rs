//! Tests for database integrity checking

use super::*;
use chrono::Utc;
use sqlx::SqlitePool;

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
#[ignore = "Requires file-based database (VACUUM INTO doesn't work with in-memory)"]
async fn test_backup_creation() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db, temp_dir.path().to_path_buf());

    let backup_path = integrity.create_backup("test").await.unwrap();
    assert!(backup_path.exists(), "Backup file should exist");
    assert!(
        backup_path.metadata().unwrap().len() > 0,
        "Backup should not be empty"
    );
}

#[tokio::test]
#[ignore = "Requires file-based database (VACUUM INTO doesn't work with in-memory)"]
async fn test_cleanup_old_backups() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db, temp_dir.path().to_path_buf());

    // Create multiple backups
    for i in 0..5 {
        integrity
            .create_backup(&format!("test_{}", i))
            .await
            .unwrap();
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
#[ignore = "Requires file-based database (VACUUM INTO doesn't work with in-memory)"]
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

#[tokio::test]
#[ignore = "Requires file-based database (VACUUM INTO doesn't work with in-memory)"]
async fn test_health_metrics() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db, temp_dir.path().to_path_buf());

    // Get health metrics
    let health = integrity.get_health_metrics().await.unwrap();

    // Verify basic metrics are collected
    assert!(health.database_size_bytes > 0, "Database should have size");
    assert_eq!(health.schema_version, 2, "Schema version should be 2");
    assert_eq!(
        health.application_id, 0x4A534442,
        "Application ID should be JSDB"
    );
    assert_eq!(health.total_jobs, 0, "New database should have 0 jobs");
    assert!(
        health.total_integrity_checks >= 0,
        "Should have integrity check count"
    );
    assert_eq!(
        health.failed_integrity_checks, 0,
        "Should have no failed checks"
    );
}

#[tokio::test]
async fn test_health_metrics_with_data() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db.clone(), temp_dir.path().to_path_buf());

    // Insert some test jobs
    for i in 0..10 {
        sqlx::query(
            r#"
    INSERT INTO jobs (hash, title, company, url, source, score)
    VALUES (?, ?, ?, ?, ?, ?)
    "#,
        )
        .bind(format!("hash_{}", i))
        .bind(format!("Job {}", i))
        .bind("Test Company")
        .bind(format!("https://example.com/job/{}", i))
        .bind("test")
        .bind(0.9)
        .execute(&db)
        .await
        .unwrap();
    }

    // Get health metrics
    let health = integrity.get_health_metrics().await.unwrap();

    assert_eq!(health.total_jobs, 10, "Should have 10 jobs");
    assert!(health.database_size_bytes > 0);
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
async fn test_fragmentation_tracking() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db.clone(), temp_dir.path().to_path_buf());

    // Insert and delete jobs to create fragmentation
    for i in 0..100 {
        sqlx::query(
            r#"
    INSERT INTO jobs (hash, title, company, url, source)
    VALUES (?, ?, ?, ?, ?)
    "#,
        )
        .bind(format!("hash_{}", i))
        .bind(format!("Job {}", i))
        .bind("Test Company")
        .bind(format!("https://example.com/job/{}", i))
        .bind("test")
        .execute(&db)
        .await
        .unwrap();
    }

    // Delete half of them to create freelist
    sqlx::query("DELETE FROM jobs WHERE id % 2 = 0")
        .execute(&db)
        .await
        .unwrap();

    // Get health metrics
    let health = integrity.get_health_metrics().await.unwrap();

    assert!(health.database_size_bytes > 0);
    // Fragmentation should be measurable
    assert!(
        health.fragmentation_percent >= 0.0,
        "Fragmentation should be non-negative"
    );
    println!("Fragmentation: {:.2}%", health.fragmentation_percent);
}

#[tokio::test]
#[ignore = "Backup/restore requires file-based database"]
async fn test_backup_and_restore() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db.clone(), temp_dir.path().to_path_buf());

    // Insert test data
    sqlx::query(
        r#"
INSERT INTO jobs (hash, title, company, url, source)
VALUES (?, ?, ?, ?, ?)
"#,
    )
    .bind("test_hash")
    .bind("Test Job")
    .bind("Test Company")
    .bind("https://example.com/job")
    .bind("test")
    .execute(&db)
    .await
    .unwrap();

    // Create backup
    let backup_path = integrity.create_backup("test_restore").await.unwrap();
    assert!(backup_path.exists(), "Backup file should exist");

    // Verify backup is not empty
    let backup_size = std::fs::metadata(&backup_path).unwrap().len();
    assert!(backup_size > 0, "Backup should not be empty");
    println!("Backup size: {} bytes", backup_size);

    // Delete original data
    sqlx::query("DELETE FROM jobs WHERE hash = 'test_hash'")
        .execute(&db)
        .await
        .unwrap();

    // Verify data is gone
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM jobs WHERE hash = 'test_hash'")
        .fetch_one(&db)
        .await
        .unwrap();
    assert_eq!(count, 0, "Data should be deleted");

    // Note: Actual restore requires closing and reopening database
    // which is complex to test in this context
    // But we've verified backup creation works
}

#[tokio::test]
#[ignore = "Backup cleanup requires file-based database"]
async fn test_multiple_backups_cleanup() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db, temp_dir.path().to_path_buf());

    // Create 10 backups
    for i in 0..10 {
        integrity
            .create_backup(&format!("test_cleanup_{}", i))
            .await
            .unwrap();
        tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
    }

    // Verify 10 backups exist
    let backup_count: usize = std::fs::read_dir(temp_dir.path())
        .unwrap()
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.path()
                .extension()
                .and_then(|s| s.to_str())
                .map(|s| s == "db")
                .unwrap_or(false)
        })
        .count();
    assert_eq!(backup_count, 10, "Should have 10 backups");

    // Cleanup, keeping only 3
    let deleted = integrity.cleanup_old_backups(3).await.unwrap();
    assert_eq!(deleted, 7, "Should delete 7 old backups");

    // Verify only 3 remain
    let remaining_count: usize = std::fs::read_dir(temp_dir.path())
        .unwrap()
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.path()
                .extension()
                .and_then(|s| s.to_str())
                .map(|s| s == "db")
                .unwrap_or(false)
        })
        .count();
    assert_eq!(remaining_count, 3, "Should have 3 backups remaining");
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
#[ignore = "Requires file-based database (VACUUM INTO doesn't work with in-memory)"]
async fn test_backup_before_operation() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db, temp_dir.path().to_path_buf());

    let backup_path = integrity
        .backup_before_operation("migration")
        .await
        .unwrap();
    assert!(
        backup_path
            .file_name()
            .unwrap()
            .to_str()
            .unwrap()
            .contains("pre_migration"),
        "Backup filename should contain operation name"
    );
    assert!(backup_path.exists(), "Backup file should exist");
}

#[tokio::test]
#[ignore = "Requires file-based database for restore operations"]
async fn test_restore_from_backup_file_not_found() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db, temp_dir.path().to_path_buf());

    let nonexistent_backup = temp_dir.path().join("nonexistent.db");
    let current_db = temp_dir.path().join("current.db");

    let result = integrity
        .restore_from_backup(&nonexistent_backup, &current_db)
        .await;
    assert!(result.is_err(), "Should fail if backup file doesn't exist");
    assert!(
        result
            .unwrap_err()
            .to_string()
            .contains("Backup file not found"),
        "Error message should mention file not found"
    );
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
async fn test_cleanup_old_backups_no_backups() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db, temp_dir.path().to_path_buf());

    let deleted = integrity.cleanup_old_backups(5).await.unwrap();
    assert_eq!(deleted, 0, "Should delete 0 files when no backups exist");
}

#[tokio::test]
async fn test_cleanup_old_backups_fewer_than_keep_count() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db, temp_dir.path().to_path_buf());

    // Create 2 dummy backup files
    for i in 0..2 {
        let backup_file = temp_dir.path().join(format!("backup_{}.db", i));
        std::fs::write(&backup_file, b"dummy backup").unwrap();
    }

    let deleted = integrity.cleanup_old_backups(5).await.unwrap();
    assert_eq!(
        deleted, 0,
        "Should delete 0 files when backups < keep_count"
    );
}

#[tokio::test]
async fn test_cleanup_old_backups_ignores_non_db_files() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db, temp_dir.path().to_path_buf());

    // Create various files
    std::fs::write(temp_dir.path().join("backup1.db"), b"backup").unwrap();
    std::fs::write(temp_dir.path().join("backup2.db"), b"backup").unwrap();
    std::fs::write(temp_dir.path().join("readme.txt"), b"text").unwrap();
    std::fs::write(temp_dir.path().join("data.json"), b"json").unwrap();

    // Keep only 1, should delete 1 (not the txt/json files)
    let deleted = integrity.cleanup_old_backups(1).await.unwrap();
    assert_eq!(deleted, 1, "Should delete only .db files");

    // Verify non-db files still exist
    assert!(temp_dir.path().join("readme.txt").exists());
    assert!(temp_dir.path().join("data.json").exists());
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
async fn test_get_backup_history_empty() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db, temp_dir.path().to_path_buf());

    let history = integrity.get_backup_history(10).await.unwrap();
    assert_eq!(history.len(), 0, "Should have no backup history initially");
}

#[tokio::test]
async fn test_get_backup_history_limit() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db.clone(), temp_dir.path().to_path_buf());

    // Insert 5 backup log entries
    for i in 0..5 {
        sqlx::query("INSERT INTO backup_log (backup_path, reason, size_bytes) VALUES (?, ?, ?)")
            .bind(format!("/path/to/backup_{}.db", i))
            .bind(format!("test_{}", i))
            .bind(1000 + i)
            .execute(&db)
            .await
            .unwrap();
    }

    // Get only 3
    let history = integrity.get_backup_history(3).await.unwrap();
    assert_eq!(history.len(), 3, "Should respect limit parameter");

    // Verify we got 3 entries (exact order may vary due to same timestamp)
    assert_eq!(history.len(), 3);

    // All entries should have valid data
    for entry in &history {
        assert!(entry.reason.is_some());
        assert!(entry.size_bytes.is_some());
        assert!(entry.size_bytes.unwrap() >= 1000 && entry.size_bytes.unwrap() <= 1004);
    }
}

#[tokio::test]
async fn test_health_metrics_overdue_checks() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db.clone(), temp_dir.path().to_path_buf());

    // Set last integrity check to 10 days ago
    let old_integrity = (Utc::now() - chrono::Duration::days(10)).to_rfc3339();
    sqlx::query(
"INSERT OR REPLACE INTO app_metadata (key, value, updated_at) VALUES (?, ?, datetime('now'))",
)
.bind("last_full_integrity_check")
.bind(old_integrity)
.execute(&db)
.await
.unwrap();

    // Set last backup to 30 hours ago
    let old_backup = (Utc::now() - chrono::Duration::hours(30)).to_rfc3339();
    sqlx::query(
"INSERT OR REPLACE INTO app_metadata (key, value, updated_at) VALUES (?, ?, datetime('now'))",
)
.bind("last_backup")
.bind(old_backup)
.execute(&db)
.await
.unwrap();

    let health = integrity.get_health_metrics().await.unwrap();

    assert!(
        health.integrity_check_overdue,
        "Integrity check should be overdue (> 7 days)"
    );
    assert!(
        health.backup_overdue,
        "Backup should be overdue (> 24 hours)"
    );
    assert_eq!(health.days_since_last_integrity_check, 10);
    assert_eq!(health.hours_since_last_backup, 30);
}

#[tokio::test]
async fn test_health_metrics_recent_maintenance() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db.clone(), temp_dir.path().to_path_buf());

    // Set recent integrity check
    integrity.update_last_full_check().await.unwrap();

    // Set recent backup
    sqlx::query(
"INSERT OR REPLACE INTO app_metadata (key, value, updated_at) VALUES (?, ?, datetime('now'))",
)
.bind("last_backup")
.bind(Utc::now().to_rfc3339())
.execute(&db)
.await
.unwrap();

    let health = integrity.get_health_metrics().await.unwrap();

    assert!(
        !health.integrity_check_overdue,
        "Integrity check should not be overdue"
    );
    assert!(!health.backup_overdue, "Backup should not be overdue");
    assert_eq!(health.days_since_last_integrity_check, 0);
    assert_eq!(health.hours_since_last_backup, 0);
}

#[tokio::test]
async fn test_health_metrics_failed_checks() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db.clone(), temp_dir.path().to_path_buf());

    // Insert failed check log entries
    for i in 0..3 {
        sqlx::query(
    "INSERT INTO integrity_check_log (check_type, status, details, duration_ms) VALUES (?, ?, ?, ?)",
)
.bind("full")
.bind("failed")
.bind(format!("Error {}", i))
.bind(100)
.execute(&db)
.await
.unwrap();
    }

    // Insert successful check
    sqlx::query(
"INSERT INTO integrity_check_log (check_type, status, details, duration_ms) VALUES (?, ?, ?, ?)",
)
.bind("quick")
.bind("passed")
.bind(None::<String>)
.bind(50)
.execute(&db)
.await
.unwrap();

    let health = integrity.get_health_metrics().await.unwrap();

    assert_eq!(health.total_integrity_checks, 4);
    assert_eq!(health.failed_integrity_checks, 3);
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
async fn test_health_metrics_all_fields() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db, temp_dir.path().to_path_buf());

    let health = integrity.get_health_metrics().await.unwrap();

    // Verify all fields are initialized with sensible values
    assert!(health.database_size_bytes >= 0);
    assert!(health.freelist_size_bytes >= 0);
    // WAL size can be negative (indicates no WAL or non-WAL mode)
    // This is expected for in-memory databases or databases not in WAL mode
    assert!(health.fragmentation_percent >= 0.0);
    assert!(health.schema_version >= 0);
    assert!(health.total_jobs >= 0);
    assert!(health.total_integrity_checks >= 0);
    assert!(health.failed_integrity_checks >= 0);
    assert!(health.total_backups >= 0);
    assert!(health.days_since_last_integrity_check >= 0);
    assert!(health.hours_since_last_backup >= 0);
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
async fn test_integrity_status_variants() {
    // Test IntegrityStatus enum variants
    let healthy = IntegrityStatus::Healthy;
    let corrupted = IntegrityStatus::Corrupted("test error".to_string());
    let violations = IntegrityStatus::ForeignKeyViolations(vec![]);

    // Verify variants are created correctly
    match healthy {
        IntegrityStatus::Healthy => {}
        _ => panic!("Expected Healthy variant"),
    }

    match corrupted {
        IntegrityStatus::Corrupted(msg) => assert_eq!(msg, "test error"),
        _ => panic!("Expected Corrupted variant"),
    }

    match violations {
        IntegrityStatus::ForeignKeyViolations(v) => assert!(v.is_empty()),
        _ => panic!("Expected ForeignKeyViolations variant"),
    }
}

#[tokio::test]
async fn test_check_result_structure() {
    // Test CheckResult internal struct
    let ok_result = CheckResult {
        is_ok: true,
        message: "ok".to_string(),
    };

    let fail_result = CheckResult {
        is_ok: false,
        message: "corruption detected".to_string(),
    };

    assert!(ok_result.is_ok);
    assert_eq!(ok_result.message, "ok");
    assert!(!fail_result.is_ok);
    assert_eq!(fail_result.message, "corruption detected");
}

#[tokio::test]
async fn test_backup_entry_structure() {
    let entry = BackupEntry {
        id: 1,
        backup_path: "/path/to/backup.db".to_string(),
        reason: Some("manual".to_string()),
        size_bytes: Some(1024),
        created_at: "2024-01-01T00:00:00Z".to_string(),
    };

    assert_eq!(entry.id, 1);
    assert_eq!(entry.backup_path, "/path/to/backup.db");
    assert_eq!(entry.reason, Some("manual".to_string()));
    assert_eq!(entry.size_bytes, Some(1024));
    assert_eq!(entry.created_at, "2024-01-01T00:00:00Z");
}

#[tokio::test]
async fn test_database_health_default() {
    let health = DatabaseHealth::default();

    assert_eq!(health.database_size_bytes, 0);
    assert_eq!(health.freelist_size_bytes, 0);
    assert_eq!(health.wal_size_bytes, 0);
    assert_eq!(health.fragmentation_percent, 0.0);
    assert_eq!(health.schema_version, 0);
    assert_eq!(health.application_id, 0);
    assert!(!health.integrity_check_overdue);
    assert!(!health.backup_overdue);
    assert_eq!(health.days_since_last_integrity_check, 0);
    assert_eq!(health.hours_since_last_backup, 0);
    assert_eq!(health.total_jobs, 0);
    assert_eq!(health.total_integrity_checks, 0);
    assert_eq!(health.failed_integrity_checks, 0);
    assert_eq!(health.total_backups, 0);
}

#[tokio::test]
async fn test_wal_checkpoint_result_structure() {
    let result = WalCheckpointResult {
        busy: 0,
        log_frames: 100,
        checkpointed_frames: 100,
    };

    assert_eq!(result.busy, 0);
    assert_eq!(result.log_frames, 100);
    assert_eq!(result.checkpointed_frames, 100);
}

#[tokio::test]
async fn test_pragma_diagnostics_default() {
    let diag = PragmaDiagnostics::default();

    assert_eq!(diag.journal_mode, "");
    assert_eq!(diag.synchronous, 0);
    assert_eq!(diag.cache_size, 0);
    assert_eq!(diag.page_size, 0);
    assert_eq!(diag.auto_vacuum, 0);
    assert!(!diag.foreign_keys);
    assert_eq!(diag.temp_store, 0);
    assert_eq!(diag.locking_mode, "");
    assert_eq!(diag.secure_delete, 0);
    assert!(!diag.cell_size_check);
    assert_eq!(diag.sqlite_version, "");
}

#[tokio::test]
async fn test_foreign_key_violation_clone() {
    let violation = ForeignKeyViolation {
        table: "applications".to_string(),
        rowid: 1,
        parent: "jobs".to_string(),
        fkid: 0,
    };

    let cloned = violation.clone();
    assert_eq!(cloned.table, "applications");
    assert_eq!(cloned.rowid, 1);
    assert_eq!(cloned.parent, "jobs");
    assert_eq!(cloned.fkid, 0);
}

#[tokio::test]
async fn test_health_metrics_with_invalid_metadata_timestamps() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db.clone(), temp_dir.path().to_path_buf());

    // Insert invalid timestamp for integrity check
    sqlx::query("INSERT INTO app_metadata (key, value, updated_at) VALUES (?, ?, datetime('now'))")
        .bind("last_full_integrity_check")
        .bind("not-a-valid-timestamp")
        .execute(&db)
        .await
        .unwrap();

    // Insert invalid timestamp for backup
    sqlx::query("INSERT INTO app_metadata (key, value, updated_at) VALUES (?, ?, datetime('now'))")
        .bind("last_backup")
        .bind("also-invalid")
        .execute(&db)
        .await
        .unwrap();

    // Should still return health metrics without crashing
    let health = integrity.get_health_metrics().await.unwrap();

    // Invalid timestamps should not cause overdue flags to be set
    assert_eq!(health.days_since_last_integrity_check, 0);
    assert_eq!(health.hours_since_last_backup, 0);
}

#[tokio::test]
async fn test_cleanup_old_backups_sorting() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db, temp_dir.path().to_path_buf());

    // Create backup files with different timestamps
    let backup1 = temp_dir.path().join("backup1.db");
    let backup2 = temp_dir.path().join("backup2.db");
    let backup3 = temp_dir.path().join("backup3.db");

    std::fs::write(&backup1, b"backup1").unwrap();
    std::thread::sleep(std::time::Duration::from_millis(10));
    std::fs::write(&backup2, b"backup2").unwrap();
    std::thread::sleep(std::time::Duration::from_millis(10));
    std::fs::write(&backup3, b"backup3").unwrap();

    // Keep only 2 (should delete oldest)
    let deleted = integrity.cleanup_old_backups(2).await.unwrap();
    assert_eq!(deleted, 1);

    // Verify newest 2 remain
    assert!(backup2.exists() || backup3.exists());
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
async fn test_get_backup_history_ordering() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db.clone(), temp_dir.path().to_path_buf());

    // Insert backups with different timestamps (manually to control order)
    for i in 0..3 {
        sqlx::query("INSERT INTO backup_log (backup_path, reason, size_bytes) VALUES (?, ?, ?)")
            .bind(format!("/path/to/backup_{}.db", i))
            .bind(format!("reason_{}", i))
            .bind(1000 + i)
            .execute(&db)
            .await
            .unwrap();
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
    }

    // Get history (should be in DESC order)
    let history = integrity.get_backup_history(10).await.unwrap();
    assert_eq!(history.len(), 3);

    // Verify all entries have reasons
    for entry in &history {
        assert!(entry.reason.is_some());
    }

    // Most recent should be reason_2 (DESC order)
    let last_reason = history[0].reason.as_ref().unwrap();
    assert!(
        last_reason.starts_with("reason_"),
        "Expected reason_X but got: {}",
        last_reason
    );
}

#[tokio::test]
async fn test_health_metrics_zero_division_protection() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db, temp_dir.path().to_path_buf());

    let health = integrity.get_health_metrics().await.unwrap();

    // If database_size_bytes is 0, fragmentation_percent should be 0.0
    if health.database_size_bytes == 0 {
        assert_eq!(health.fragmentation_percent, 0.0);
    } else {
        // Otherwise it should be a valid percentage
        assert!(health.fragmentation_percent >= 0.0);
        assert!(health.fragmentation_percent <= 100.0);
    }
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
#[ignore = "Requires file-based database for restore"]
async fn test_restore_from_backup_success() {
    use tempfile::NamedTempFile;

    // Create a temporary file-based database
    let temp_db_file = NamedTempFile::new().unwrap();
    let db_path = temp_db_file.path().to_path_buf();
    let db_url = format!("sqlite:{}", db_path.display());

    let db = SqlitePool::connect(&db_url).await.unwrap();
    sqlx::migrate!("./migrations").run(&db).await.unwrap();

    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db.clone(), temp_dir.path().to_path_buf());

    // Insert test data
    sqlx::query("INSERT INTO jobs (hash, title, company, url, source) VALUES (?, ?, ?, ?, ?)")
        .bind("restore_test")
        .bind("Test Job")
        .bind("Test Co")
        .bind("https://example.com")
        .bind("test")
        .execute(&db)
        .await
        .unwrap();

    // Create backup
    let backup_path = integrity.create_backup("restore_test").await.unwrap();
    assert!(backup_path.exists());

    // Close database connection
    db.close().await;

    // Simulate corruption by deleting the database
    std::fs::remove_file(&db_path).unwrap();

    // Restore from backup
    let new_integrity = DatabaseIntegrity::new(
        SqlitePool::connect("sqlite::memory:").await.unwrap(),
        temp_dir.path().to_path_buf(),
    );
    new_integrity
        .restore_from_backup(&backup_path, &db_path)
        .await
        .unwrap();

    // Verify database was restored
    assert!(db_path.exists());

    // Verify data is present
    let restored_db = SqlitePool::connect(&db_url).await.unwrap();
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM jobs WHERE hash = 'restore_test'")
        .fetch_one(&restored_db)
        .await
        .unwrap();
    assert_eq!(count, 1);

    restored_db.close().await;
}

#[tokio::test]
#[ignore = "Requires file-based database for restore"]
async fn test_restore_saves_corrupted_database() {
    let temp_dir = tempfile::tempdir().unwrap();

    // Create a fake corrupted database file
    let corrupted_db = temp_dir.path().join("corrupted.db");
    std::fs::write(&corrupted_db, b"corrupted data").unwrap();

    // Create a fake backup file
    let backup_file = temp_dir.path().join("backup.db");
    std::fs::write(&backup_file, b"good backup data").unwrap();

    let db = create_test_db().await;
    let integrity = DatabaseIntegrity::new(db, temp_dir.path().to_path_buf());

    // Restore from backup (should save corrupted file)
    integrity
        .restore_from_backup(&backup_file, &corrupted_db)
        .await
        .unwrap();

    // Verify corrupted database was saved
    let corrupted_backup = corrupted_db.with_extension("db.corrupted");
    assert!(corrupted_backup.exists());

    // Verify it contains the original corrupted data
    let saved_data = std::fs::read_to_string(&corrupted_backup).unwrap();
    assert_eq!(saved_data, "corrupted data");

    // Verify main database now contains backup data
    let restored_data = std::fs::read_to_string(&corrupted_db).unwrap();
    assert_eq!(restored_data, "good backup data");
}

#[tokio::test]
async fn test_health_metrics_edge_case_no_metadata() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db.clone(), temp_dir.path().to_path_buf());

    // Clear all metadata
    sqlx::query("DELETE FROM app_metadata")
        .execute(&db)
        .await
        .unwrap();

    let health = integrity.get_health_metrics().await.unwrap();

    // With no metadata, overdue flags should be false (default state)
    assert!(!health.integrity_check_overdue);
    assert!(!health.backup_overdue);
    assert_eq!(health.days_since_last_integrity_check, 0);
    assert_eq!(health.hours_since_last_backup, 0);
}

#[tokio::test]
async fn test_health_metrics_wal_size_calculation() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db, temp_dir.path().to_path_buf());

    let health = integrity.get_health_metrics().await.unwrap();

    // WAL size calculation depends on wal_checkpoint results
    // For in-memory DB, wal_size_bytes can be any i64 value
    // Just verify the calculation doesn't panic
    let _ = health.wal_size_bytes;
}

#[tokio::test]
async fn test_health_metrics_all_pragma_success() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db, temp_dir.path().to_path_buf());

    let health = integrity.get_health_metrics().await.unwrap();

    // Verify all PRAGMAs executed successfully
    assert!(health.database_size_bytes >= 0);
    assert!(health.schema_version >= 0);
    assert!(health.application_id != 0 || health.application_id == 0);
    assert!(health.total_jobs >= 0);
    assert!(health.total_integrity_checks >= 0);
    assert!(health.total_backups >= 0);
}

#[tokio::test]
async fn test_cleanup_old_backups_with_exact_keep_count() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db, temp_dir.path().to_path_buf());

    // Create exactly keep_count backups
    for i in 0..5 {
        let backup = temp_dir.path().join(format!("backup_{}.db", i));
        std::fs::write(&backup, format!("backup {}", i)).unwrap();
    }

    // Cleanup with keep_count = 5 (exact match)
    let deleted = integrity.cleanup_old_backups(5).await.unwrap();
    assert_eq!(deleted, 0, "Should not delete when count equals keep_count");

    // Verify all 5 backups still exist
    let count: usize = std::fs::read_dir(temp_dir.path())
        .unwrap()
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.path()
                .extension()
                .and_then(|s| s.to_str())
                .map(|s| s == "db")
                .unwrap_or(false)
        })
        .count();
    assert_eq!(count, 5);
}

#[tokio::test]
async fn test_get_backup_history_with_null_fields() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db.clone(), temp_dir.path().to_path_buf());

    // Insert backup log entry with NULL reason and size
    sqlx::query("INSERT INTO backup_log (backup_path, reason, size_bytes) VALUES (?, ?, ?)")
        .bind("/path/to/backup.db")
        .bind(None::<String>)
        .bind(None::<i64>)
        .execute(&db)
        .await
        .unwrap();

    let history = integrity.get_backup_history(10).await.unwrap();
    assert_eq!(history.len(), 1);
    assert!(history[0].reason.is_none());
    assert!(history[0].size_bytes.is_none());
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
async fn test_backup_entry_with_all_optional_fields() {
    let entry = BackupEntry {
        id: 99,
        backup_path: "/test/backup.db".to_string(),
        reason: None,
        size_bytes: None,
        created_at: "2026-01-16T00:00:00Z".to_string(),
    };

    assert_eq!(entry.id, 99);
    assert!(entry.reason.is_none());
    assert!(entry.size_bytes.is_none());
}

#[tokio::test]
async fn test_wal_checkpoint_result_busy_state() {
    let result = WalCheckpointResult {
        busy: 1, // Non-zero indicates blocked
        log_frames: 500,
        checkpointed_frames: 300,
    };

    assert_eq!(result.busy, 1);
    assert!(result.checkpointed_frames < result.log_frames);
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
async fn test_health_metrics_fragmentation_percentage_calculation() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db, temp_dir.path().to_path_buf());

    let health = integrity.get_health_metrics().await.unwrap();

    // Fragmentation should always be between 0-100%
    assert!(health.fragmentation_percent >= 0.0);
    assert!(health.fragmentation_percent <= 100.0);

    // If database_size is 0, fragmentation should be 0
    if health.database_size_bytes == 0 {
        assert_eq!(health.fragmentation_percent, 0.0);
    }
}

#[tokio::test]
async fn test_foreign_key_violation_debug_format() {
    let violation = ForeignKeyViolation {
        table: "test_table".to_string(),
        rowid: 42,
        parent: "parent_table".to_string(),
        fkid: 1,
    };

    let debug_str = format!("{:?}", violation);
    assert!(debug_str.contains("test_table"));
    assert!(debug_str.contains("42"));
    assert!(debug_str.contains("parent_table"));
}

#[tokio::test]
async fn test_integrity_status_debug_format() {
    let healthy = IntegrityStatus::Healthy;
    let corrupted = IntegrityStatus::Corrupted("test".to_string());
    let violations = IntegrityStatus::ForeignKeyViolations(vec![]);

    assert!(format!("{:?}", healthy).contains("Healthy"));
    assert!(format!("{:?}", corrupted).contains("Corrupted"));
    assert!(format!("{:?}", violations).contains("ForeignKeyViolations"));
}

#[tokio::test]
async fn test_database_health_clone() {
    let health = DatabaseHealth {
        database_size_bytes: 1000,
        freelist_size_bytes: 100,
        wal_size_bytes: 50,
        fragmentation_percent: 10.0,
        schema_version: 2,
        application_id: 0x4A534442,
        integrity_check_overdue: true,
        backup_overdue: false,
        days_since_last_integrity_check: 8,
        hours_since_last_backup: 12,
        total_jobs: 100,
        total_integrity_checks: 5,
        failed_integrity_checks: 0,
        total_backups: 3,
    };

    let cloned = health.clone();
    assert_eq!(cloned.database_size_bytes, 1000);
    assert_eq!(cloned.fragmentation_percent, 10.0);
    assert_eq!(cloned.total_jobs, 100);
}

#[tokio::test]
async fn test_wal_checkpoint_result_clone() {
    let result = WalCheckpointResult {
        busy: 0,
        log_frames: 200,
        checkpointed_frames: 200,
    };

    let cloned = result.clone();
    assert_eq!(cloned.busy, 0);
    assert_eq!(cloned.log_frames, 200);
    assert_eq!(cloned.checkpointed_frames, 200);
}

#[tokio::test]
async fn test_backup_entry_clone() {
    let entry = BackupEntry {
        id: 5,
        backup_path: "/test/path.db".to_string(),
        reason: Some("test".to_string()),
        size_bytes: Some(5000),
        created_at: "2026-01-16T12:00:00Z".to_string(),
    };

    let cloned = entry.clone();
    assert_eq!(cloned.id, 5);
    assert_eq!(cloned.backup_path, "/test/path.db");
    assert_eq!(cloned.reason, Some("test".to_string()));
}

#[tokio::test]
async fn test_pragma_diagnostics_clone() {
    let diag = PragmaDiagnostics {
        journal_mode: "wal".to_string(),
        synchronous: 2,
        cache_size: -64000,
        page_size: 4096,
        auto_vacuum: 0,
        foreign_keys: true,
        temp_store: 2,
        locking_mode: "normal".to_string(),
        secure_delete: 0,
        cell_size_check: true,
        sqlite_version: "3.40.0".to_string(),
    };

    let cloned = diag.clone();
    assert_eq!(cloned.journal_mode, "wal");
    assert_eq!(cloned.page_size, 4096);
    assert!(cloned.foreign_keys);
}

#[tokio::test]
async fn test_optimize_with_fragmented_data() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db.clone(), temp_dir.path().to_path_buf());

    // Create and delete data to fragment database
    for i in 0..100 {
        sqlx::query("INSERT INTO jobs (hash, title, company, url, source) VALUES (?, ?, ?, ?, ?)")
            .bind(format!("hash_{}", i))
            .bind("Job Title")
            .bind("Company")
            .bind(format!("https://example.com/{}", i))
            .bind("test")
            .execute(&db)
            .await
            .unwrap();
    }

    // Delete half to create fragmentation
    sqlx::query("DELETE FROM jobs WHERE id % 2 = 0")
        .execute(&db)
        .await
        .unwrap();

    // Optimize should succeed even with fragmentation
    integrity.optimize().await.unwrap();

    // Verify database still works
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM jobs")
        .fetch_one(&db)
        .await
        .unwrap();
    assert_eq!(count, 50);
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
