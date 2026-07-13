use super::*;
use sqlx::sqlite::SqlitePoolOptions;
use tempfile::TempDir;

async fn setup_test_db() -> (SqlitePool, TempDir) {
    let temp_dir = TempDir::new().unwrap();
    let db_path = temp_dir.path().join("test.db");
    let db_url = format!("sqlite:{}?mode=rwc", db_path.display());

    let pool = SqlitePoolOptions::new().connect(&db_url).await.unwrap();

    sqlx::migrate!("./migrations").run(&pool).await.unwrap();

    (pool, temp_dir)
}

#[tokio::test]
async fn test_create_automation_attempt() {
    let (pool, _temp_dir) = setup_test_db().await;
    let manager = AutomationManager::new(pool);

    // Create test job first
    sqlx::query(
            "INSERT INTO jobs (hash, title, company, location, description, url, score, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind("test_hash")
        .bind("Care Coordinator")
        .bind("Community Care Network")
        .bind("Remote")
        .bind("Test description")
        .bind("https://example.com")
        .bind(0.9)
        .bind("greenhouse")
        .execute(&manager.db)
        .await
        .unwrap();

    let attempt_id = manager
        .create_attempt("test_hash", AtsPlatform::Greenhouse)
        .await
        .unwrap();

    assert!(attempt_id > 0);

    let attempt = manager.get_attempt(attempt_id).await.unwrap();
    assert_eq!(attempt.job_hash, "test_hash");
    assert_eq!(attempt.status, AutomationStatus::Pending);
    assert_eq!(attempt.ats_platform, AtsPlatform::Greenhouse);
}

#[tokio::test]
async fn test_update_attempt_status() {
    let (pool, _temp_dir) = setup_test_db().await;
    let manager = AutomationManager::new(pool.clone());

    // Create test job
    sqlx::query(
            "INSERT INTO jobs (hash, title, company, location, description, url, score, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind("test_hash")
        .bind("Program Coordinator")
        .bind("FreshMart")
        .bind("Remote")
        .bind("Desc")
        .bind("https://test.com")
        .bind(0.8)
        .bind("lever")
        .execute(&pool)
        .await
        .unwrap();

    let attempt_id = manager
        .create_attempt("test_hash", AtsPlatform::Lever)
        .await
        .unwrap();

    manager
        .update_status(attempt_id, AutomationStatus::Failed, Some("Test error"))
        .await
        .unwrap();

    let attempt = manager.get_attempt(attempt_id).await.unwrap();
    assert_eq!(attempt.status, AutomationStatus::Failed);
    assert_eq!(attempt.error_message, Some("Test error".to_string()));
}

#[tokio::test]
async fn test_approve_and_submit() {
    let (pool, _temp_dir) = setup_test_db().await;
    let manager = AutomationManager::new(pool.clone());

    sqlx::query(
            "INSERT INTO jobs (hash, title, company, location, description, url, score, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind("test_hash")
        .bind("Program Coordinator")
        .bind("City Health Department")
        .bind("Remote")
        .bind("Desc")
        .bind("https://test.com")
        .bind(0.8)
        .bind("workday")
        .execute(&pool)
        .await
        .unwrap();

    let attempt_id = manager
        .create_attempt("test_hash", AtsPlatform::Workday)
        .await
        .unwrap();

    // Approve
    manager.approve_attempt(attempt_id).await.unwrap();

    let attempt = manager.get_attempt(attempt_id).await.unwrap();
    assert!(attempt.user_approved);

    // Submit
    manager.mark_submitted(attempt_id).await.unwrap();

    let attempt = manager.get_attempt(attempt_id).await.unwrap();
    assert_eq!(attempt.status, AutomationStatus::Submitted);
    assert!(attempt.submitted_at.is_some());
}
