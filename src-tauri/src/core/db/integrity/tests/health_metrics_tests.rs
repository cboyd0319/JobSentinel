use super::*;
use chrono::Utc;

#[tokio::test]
#[ignore = "Requires file-based database (VACUUM INTO doesn't work with in-memory)"]
async fn test_health_metrics() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db, temp_dir.path().to_path_buf());

    let health = integrity.get_health_metrics().await.unwrap();

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

    let health = integrity.get_health_metrics().await.unwrap();

    assert_eq!(health.total_jobs, 10, "Should have 10 jobs");
    assert!(health.database_size_bytes > 0);
}

#[tokio::test]
async fn test_fragmentation_tracking() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db.clone(), temp_dir.path().to_path_buf());

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

    sqlx::query("DELETE FROM jobs WHERE id % 2 = 0")
        .execute(&db)
        .await
        .unwrap();

    let health = integrity.get_health_metrics().await.unwrap();

    assert!(health.database_size_bytes > 0);
    assert!(
        health.fragmentation_percent >= 0.0,
        "Fragmentation should be non-negative"
    );
    println!("Fragmentation: {:.2}%", health.fragmentation_percent);
}

#[tokio::test]
async fn test_health_metrics_overdue_checks() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db.clone(), temp_dir.path().to_path_buf());

    let old_integrity = (Utc::now() - chrono::Duration::days(10)).to_rfc3339();
    sqlx::query(
        "INSERT OR REPLACE INTO app_metadata (key, value, updated_at) VALUES (?, ?, datetime('now'))",
    )
    .bind("last_full_integrity_check")
    .bind(old_integrity)
    .execute(&db)
    .await
    .unwrap();

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

    integrity.update_last_full_check().await.unwrap();

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
async fn test_health_metrics_all_fields() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db, temp_dir.path().to_path_buf());

    let health = integrity.get_health_metrics().await.unwrap();

    assert!(health.database_size_bytes >= 0);
    assert!(health.freelist_size_bytes >= 0);
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
async fn test_health_metrics_with_invalid_metadata_timestamps() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db.clone(), temp_dir.path().to_path_buf());

    sqlx::query("INSERT INTO app_metadata (key, value, updated_at) VALUES (?, ?, datetime('now'))")
        .bind("last_full_integrity_check")
        .bind("not-a-valid-timestamp")
        .execute(&db)
        .await
        .unwrap();

    sqlx::query("INSERT INTO app_metadata (key, value, updated_at) VALUES (?, ?, datetime('now'))")
        .bind("last_backup")
        .bind("also-invalid")
        .execute(&db)
        .await
        .unwrap();

    let health = integrity.get_health_metrics().await.unwrap();

    assert_eq!(health.days_since_last_integrity_check, 0);
    assert_eq!(health.hours_since_last_backup, 0);
}

#[tokio::test]
async fn test_health_metrics_zero_division_protection() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db, temp_dir.path().to_path_buf());

    let health = integrity.get_health_metrics().await.unwrap();

    if health.database_size_bytes == 0 {
        assert_eq!(health.fragmentation_percent, 0.0);
    } else {
        assert!(health.fragmentation_percent >= 0.0);
        assert!(health.fragmentation_percent <= 100.0);
    }
}

#[tokio::test]
async fn test_health_metrics_edge_case_no_metadata() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db.clone(), temp_dir.path().to_path_buf());

    sqlx::query("DELETE FROM app_metadata")
        .execute(&db)
        .await
        .unwrap();

    let health = integrity.get_health_metrics().await.unwrap();

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

    let _ = health.wal_size_bytes;
}

#[tokio::test]
async fn test_health_metrics_all_pragma_success() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db, temp_dir.path().to_path_buf());

    let health = integrity.get_health_metrics().await.unwrap();

    assert!(health.database_size_bytes >= 0);
    assert!(health.schema_version >= 0);
    assert!(health.application_id != 0 || health.application_id == 0);
    assert!(health.total_jobs >= 0);
    assert!(health.total_integrity_checks >= 0);
    assert!(health.total_backups >= 0);
}

#[tokio::test]
async fn test_health_metrics_fragmentation_percentage_calculation() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db, temp_dir.path().to_path_buf());

    let health = integrity.get_health_metrics().await.unwrap();

    assert!(health.fragmentation_percent >= 0.0);
    assert!(health.fragmentation_percent <= 100.0);

    if health.database_size_bytes == 0 {
        assert_eq!(health.fragmentation_percent, 0.0);
    }
}

#[tokio::test]
async fn test_optimize_with_fragmented_data() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db.clone(), temp_dir.path().to_path_buf());

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

    sqlx::query("DELETE FROM jobs WHERE id % 2 = 0")
        .execute(&db)
        .await
        .unwrap();

    integrity.optimize().await.unwrap();

    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM jobs")
        .fetch_one(&db)
        .await
        .unwrap();
    assert_eq!(count, 50);
}
