use super::*;
use sqlx::SqlitePool;
use std::path::PathBuf;

async fn create_file_test_db() -> (SqlitePool, tempfile::TempDir, PathBuf) {
    let temp_dir = tempfile::tempdir().unwrap();
    let db_path = temp_dir.path().join("jobsentinel-test.db");
    let db_url = format!("sqlite://{}?mode=rwc", db_path.display());
    let pool = SqlitePool::connect(&db_url).await.unwrap();
    sqlx::query("PRAGMA page_size = 4096")
        .execute(&pool)
        .await
        .unwrap();
    sqlx::query("PRAGMA journal_mode = WAL")
        .execute(&pool)
        .await
        .unwrap();
    sqlx::query("PRAGMA synchronous = NORMAL")
        .execute(&pool)
        .await
        .unwrap();
    sqlx::query("PRAGMA foreign_keys = ON")
        .execute(&pool)
        .await
        .unwrap();
    sqlx::query("PRAGMA cache_size = -128000")
        .execute(&pool)
        .await
        .unwrap();
    sqlx::query("PRAGMA application_id = 1246970946")
        .execute(&pool)
        .await
        .unwrap();
    sqlx::query("PRAGMA user_version = 2")
        .execute(&pool)
        .await
        .unwrap();
    sqlx::migrate!("./migrations").run(&pool).await.unwrap();
    (pool, temp_dir, db_path)
}

#[tokio::test]
async fn test_backup_creation() {
    let (db, temp_dir, _) = create_file_test_db().await;
    let integrity = DatabaseIntegrity::new(db, temp_dir.path().join("backups"));

    let backup_path = integrity.create_backup("test").await.unwrap();
    assert!(backup_path.exists(), "Backup file should exist");
    assert!(
        backup_path.metadata().unwrap().len() > 0,
        "Backup should not be empty"
    );
}

#[tokio::test]
async fn test_cleanup_old_backups() {
    let (db, temp_dir, _) = create_file_test_db().await;
    let backup_dir = temp_dir.path().join("backups");
    let integrity = DatabaseIntegrity::new(db, backup_dir.clone());

    for i in 0..5 {
        integrity
            .create_backup(&format!("test_{}", i))
            .await
            .unwrap();
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
    }

    let deleted = integrity.cleanup_old_backups(2).await.unwrap();
    assert_eq!(deleted, 3, "Should delete 3 old backups");

    let remaining: Vec<_> = std::fs::read_dir(&backup_dir)
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
async fn test_get_backup_history() {
    let (db, temp_dir, _) = create_file_test_db().await;
    let integrity = DatabaseIntegrity::new(db, temp_dir.path().join("backups"));

    integrity.create_backup("test_history").await.unwrap();

    let history = integrity.get_backup_history(10).await.unwrap();
    assert!(!history.is_empty(), "Should have backup history");
    assert!(history[0].reason.as_ref().unwrap().contains("test_history"));
}

#[tokio::test]
async fn test_backup_and_restore() {
    let (db, temp_dir, _) = create_file_test_db().await;
    let integrity = DatabaseIntegrity::new(db.clone(), temp_dir.path().join("backups"));

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

    let backup_path = integrity.create_backup("test_restore").await.unwrap();
    assert!(backup_path.exists(), "Backup file should exist");

    let backup_size = std::fs::metadata(&backup_path).unwrap().len();
    assert!(backup_size > 0, "Backup should not be empty");
    println!("Backup size: {} bytes", backup_size);

    sqlx::query("DELETE FROM jobs WHERE hash = 'test_hash'")
        .execute(&db)
        .await
        .unwrap();

    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM jobs WHERE hash = 'test_hash'")
        .fetch_one(&db)
        .await
        .unwrap();
    assert_eq!(count, 0, "Data should be deleted");
}

#[tokio::test]
async fn test_multiple_backups_cleanup() {
    let (db, temp_dir, _) = create_file_test_db().await;
    let backup_dir = temp_dir.path().join("backups");
    let integrity = DatabaseIntegrity::new(db, backup_dir.clone());

    for i in 0..10 {
        integrity
            .create_backup(&format!("test_cleanup_{}", i))
            .await
            .unwrap();
        tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
    }

    let backup_count: usize = std::fs::read_dir(&backup_dir)
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

    let deleted = integrity.cleanup_old_backups(3).await.unwrap();
    assert_eq!(deleted, 7, "Should delete 7 old backups");

    let remaining_count: usize = std::fs::read_dir(&backup_dir)
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
async fn test_backup_before_operation() {
    let (db, temp_dir, _) = create_file_test_db().await;
    let integrity = DatabaseIntegrity::new(db, temp_dir.path().join("backups"));

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
    let error = result.unwrap_err().to_string();
    assert!(
        error.contains("Backup file not found"),
        "Error message should mention file not found"
    );
    assert!(
        !error.contains("nonexistent.db"),
        "Error message must not expose backup path: {error}"
    );
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

    std::fs::write(temp_dir.path().join("backup1.db"), b"backup").unwrap();
    std::fs::write(temp_dir.path().join("backup2.db"), b"backup").unwrap();
    std::fs::write(temp_dir.path().join("readme.txt"), b"text").unwrap();
    std::fs::write(temp_dir.path().join("data.json"), b"json").unwrap();

    let deleted = integrity.cleanup_old_backups(1).await.unwrap();
    assert_eq!(deleted, 1, "Should delete only .db files");

    assert!(temp_dir.path().join("readme.txt").exists());
    assert!(temp_dir.path().join("data.json").exists());
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

    for i in 0..5 {
        sqlx::query("INSERT INTO backup_log (backup_path, reason, size_bytes) VALUES (?, ?, ?)")
            .bind(format!("backup_{}.db", i))
            .bind(format!("test_{}", i))
            .bind(1000 + i)
            .execute(&db)
            .await
            .unwrap();
    }

    let history = integrity.get_backup_history(3).await.unwrap();
    assert_eq!(history.len(), 3, "Should respect limit parameter");
    assert_eq!(history.len(), 3);

    for entry in &history {
        assert!(entry.reason.is_some());
        assert!(entry.size_bytes.is_some());
        assert!(entry.size_bytes.unwrap() >= 1000 && entry.size_bytes.unwrap() <= 1004);
    }
}

#[tokio::test]
async fn test_cleanup_old_backups_sorting() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db, temp_dir.path().to_path_buf());

    let backup1 = temp_dir.path().join("backup1.db");
    let backup2 = temp_dir.path().join("backup2.db");
    let backup3 = temp_dir.path().join("backup3.db");

    std::fs::write(&backup1, b"backup1").unwrap();
    tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
    std::fs::write(&backup2, b"backup2").unwrap();
    tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
    std::fs::write(&backup3, b"backup3").unwrap();

    let deleted = integrity.cleanup_old_backups(2).await.unwrap();
    assert_eq!(deleted, 1, "Should delete oldest backup");

    assert!(backup2.exists() || backup3.exists());
}

#[tokio::test]
async fn test_get_backup_history_ordering() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db.clone(), temp_dir.path().to_path_buf());

    for i in 0..3 {
        sqlx::query("INSERT INTO backup_log (backup_path, reason, size_bytes) VALUES (?, ?, ?)")
            .bind(format!("backup_{}.db", i))
            .bind(format!("backup_{}", i))
            .bind(1000 + i)
            .execute(&db)
            .await
            .unwrap();
        tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
    }

    let history = integrity.get_backup_history(10).await.unwrap();
    assert_eq!(history.len(), 3);
    assert!(history[0].created_at >= history[1].created_at);
}

#[tokio::test]
async fn test_restore_from_backup_success() {
    let temp_dir = tempfile::tempdir().unwrap();
    let db_path = temp_dir.path().join("restore-source.db");
    let db_url = format!("sqlite://{}?mode=rwc", db_path.display());

    let db = SqlitePool::connect(&db_url).await.unwrap();
    sqlx::migrate!("./migrations").run(&db).await.unwrap();

    let backup_dir = temp_dir.path().join("backups");
    let integrity = DatabaseIntegrity::new(db.clone(), backup_dir.clone());

    sqlx::query("INSERT INTO jobs (hash, title, company, url, source) VALUES (?, ?, ?, ?, ?)")
        .bind("restore_test")
        .bind("Test Job")
        .bind("Test Co")
        .bind("https://example.com")
        .bind("test")
        .execute(&db)
        .await
        .unwrap();

    let backup_path = integrity.create_backup("restore_test").await.unwrap();
    assert!(backup_path.exists());

    db.close().await;

    std::fs::remove_file(&db_path).unwrap();

    let new_integrity = DatabaseIntegrity::new(
        SqlitePool::connect("sqlite::memory:").await.unwrap(),
        backup_dir,
    );
    new_integrity
        .restore_from_backup(&backup_path, &db_path)
        .await
        .unwrap();

    assert!(db_path.exists());

    let restored_db = SqlitePool::connect(&db_url).await.unwrap();
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM jobs WHERE hash = 'restore_test'")
        .fetch_one(&restored_db)
        .await
        .unwrap();
    assert_eq!(count, 1);

    restored_db.close().await;
}

#[tokio::test]
async fn test_restore_saves_corrupted_database() {
    let temp_dir = tempfile::tempdir().unwrap();

    let corrupted_db = temp_dir.path().join("corrupted.db");
    std::fs::write(&corrupted_db, b"corrupted data").unwrap();

    let backup_file = temp_dir.path().join("backup.db");
    std::fs::write(&backup_file, b"good backup data").unwrap();

    let db = create_test_db().await;
    let integrity = DatabaseIntegrity::new(db, temp_dir.path().to_path_buf());

    integrity
        .restore_from_backup(&backup_file, &corrupted_db)
        .await
        .unwrap();

    let corrupted_backup = std::fs::read_dir(temp_dir.path())
        .unwrap()
        .filter_map(|entry| entry.ok())
        .map(|entry| entry.path())
        .find(|path| {
            path.file_name()
                .and_then(|name| name.to_str())
                .is_some_and(|name| name.starts_with("corrupted.db.corrupted."))
        })
        .expect("corrupted database should be quarantined");

    let saved_data = std::fs::read_to_string(&corrupted_backup).unwrap();
    assert_eq!(saved_data, "corrupted data");

    let restored_data = std::fs::read_to_string(&corrupted_db).unwrap();
    assert_eq!(restored_data, "good backup data");
}

#[tokio::test]
async fn test_restore_quarantines_sqlite_wal_and_shm_sidecars() {
    let temp_dir = tempfile::tempdir().unwrap();
    let current_db = temp_dir.path().join("current.db");
    let current_wal = temp_dir.path().join("current.db-wal");
    let current_shm = temp_dir.path().join("current.db-shm");
    let backup_file = temp_dir.path().join("backup.db");

    std::fs::write(&current_db, b"old main").unwrap();
    std::fs::write(&current_wal, b"old wal").unwrap();
    std::fs::write(&current_shm, b"old shm").unwrap();
    std::fs::write(&backup_file, b"restored main").unwrap();

    let db = create_test_db().await;
    let integrity = DatabaseIntegrity::new(db, temp_dir.path().to_path_buf());

    integrity
        .restore_from_backup(&backup_file, &current_db)
        .await
        .unwrap();

    assert_eq!(std::fs::read(&current_db).unwrap(), b"restored main");
    assert!(!current_wal.exists());
    assert!(!current_shm.exists());

    let quarantined_names = std::fs::read_dir(temp_dir.path())
        .unwrap()
        .filter_map(|entry| entry.ok())
        .filter_map(|entry| entry.file_name().into_string().ok())
        .collect::<Vec<_>>();
    assert!(quarantined_names
        .iter()
        .any(|name| name.starts_with("current.db.corrupted.")));
    assert!(quarantined_names
        .iter()
        .any(|name| name.starts_with("current.db-wal.corrupted.")));
    assert!(quarantined_names
        .iter()
        .any(|name| name.starts_with("current.db-shm.corrupted.")));
}

#[tokio::test]
async fn test_cleanup_old_backups_with_exact_keep_count() {
    let db = create_test_db().await;
    let temp_dir = tempfile::tempdir().unwrap();
    let integrity = DatabaseIntegrity::new(db, temp_dir.path().to_path_buf());

    for i in 0..5 {
        let backup = temp_dir.path().join(format!("backup_{}.db", i));
        std::fs::write(&backup, format!("backup {}", i)).unwrap();
    }

    let deleted = integrity.cleanup_old_backups(5).await.unwrap();
    assert_eq!(deleted, 0, "Should not delete when count equals keep_count");

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

    sqlx::query("INSERT INTO backup_log (backup_path, reason, size_bytes) VALUES (?, ?, ?)")
        .bind("backup.db")
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
