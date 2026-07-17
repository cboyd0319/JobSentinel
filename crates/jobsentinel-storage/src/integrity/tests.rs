use super::*;
use chrono::{Duration, Utc};
use sqlx::{sqlite::SqlitePoolOptions, SqlitePool};

async fn create_integrity_test_db() -> SqlitePool {
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    // Apply the schema without the startup check that these tests exercise.
    sqlx::migrate!("./migrations").run(&pool).await.unwrap();
    pool
}

#[tokio::test]
async fn healthy_startup_check_is_recorded() {
    let pool = create_integrity_test_db().await;
    let integrity = DatabaseIntegrity::new(pool.clone());

    let status = integrity.startup_check().await.unwrap();

    assert_eq!(status, IntegrityStatus::Healthy);
    let passed: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM integrity_check_log WHERE check_type = 'quick' AND status = 'passed'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(passed, 1);
}

#[tokio::test]
async fn first_startup_check_records_full_check_time() {
    let pool = create_integrity_test_db().await;

    DatabaseIntegrity::new(pool.clone())
        .startup_check()
        .await
        .unwrap();

    let timestamp: String = sqlx::query_scalar(
        "SELECT value FROM app_metadata WHERE key = 'last_full_integrity_check'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert!(chrono::DateTime::parse_from_rfc3339(&timestamp).is_ok());
}

#[tokio::test]
async fn recent_full_check_is_not_repeated() {
    let pool = create_integrity_test_db().await;
    let timestamp = Utc::now().to_rfc3339();
    sqlx::query("INSERT INTO app_metadata (key, value) VALUES ('last_full_integrity_check', ?)")
        .bind(&timestamp)
        .execute(&pool)
        .await
        .unwrap();

    DatabaseIntegrity::new(pool.clone())
        .startup_check()
        .await
        .unwrap();

    let stored: String = sqlx::query_scalar(
        "SELECT value FROM app_metadata WHERE key = 'last_full_integrity_check'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(stored, timestamp);
}

#[tokio::test]
async fn overdue_full_check_updates_its_timestamp() {
    let pool = create_integrity_test_db().await;
    let old_timestamp = (Utc::now() - Duration::days(8)).to_rfc3339();
    sqlx::query("INSERT INTO app_metadata (key, value) VALUES ('last_full_integrity_check', ?)")
        .bind(&old_timestamp)
        .execute(&pool)
        .await
        .unwrap();

    DatabaseIntegrity::new(pool.clone())
        .startup_check()
        .await
        .unwrap();

    let stored: String = sqlx::query_scalar(
        "SELECT value FROM app_metadata WHERE key = 'last_full_integrity_check'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_ne!(stored, old_timestamp);
}

#[tokio::test]
async fn foreign_key_violation_fails_startup_check() {
    let pool = create_integrity_test_db().await;
    sqlx::query("CREATE TABLE integrity_parent (id INTEGER PRIMARY KEY)")
        .execute(&pool)
        .await
        .unwrap();
    sqlx::query("CREATE TABLE integrity_child (parent_id INTEGER REFERENCES integrity_parent(id))")
        .execute(&pool)
        .await
        .unwrap();
    sqlx::query("PRAGMA foreign_keys = OFF")
        .execute(&pool)
        .await
        .unwrap();
    sqlx::query("INSERT INTO integrity_child (parent_id) VALUES (42)")
        .execute(&pool)
        .await
        .unwrap();
    sqlx::query("PRAGMA foreign_keys = ON")
        .execute(&pool)
        .await
        .unwrap();

    let status = DatabaseIntegrity::new(pool.clone())
        .startup_check()
        .await
        .unwrap();

    assert_eq!(status, IntegrityStatus::ForeignKeyViolations);
    let warnings: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM integrity_check_log WHERE check_type = 'foreign_key' AND status = 'warning'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(warnings, 1);
}
