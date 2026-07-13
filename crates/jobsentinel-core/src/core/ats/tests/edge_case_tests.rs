use super::*;

// ========================================
// Edge cases and error handling
// ========================================

#[tokio::test]
async fn test_get_application_nonexistent() {
    let pool = create_test_db().await;
    let tracker = ApplicationTracker::new(pool);

    let result = tracker.get_application(9999).await;
    assert!(result.is_err());
}

#[tokio::test]
async fn test_create_application_duplicate_job_hash() {
    let pool = create_test_db().await;

    sqlx::query("INSERT INTO jobs (hash, title, company, url, source) VALUES ('test123', 'Case Manager', 'CommunityCare', 'http://test.com', 'test')")
        .execute(&pool)
        .await
        .unwrap();

    let tracker = ApplicationTracker::new(pool);

    let app1 = tracker.create_application("test123").await.unwrap();
    let app2_result = tracker.create_application("test123").await;

    // First should succeed.
    assert!(app1 > 0);

    // Second should fail due to UNIQUE constraint on job_hash.
    assert!(app2_result.is_err());
}

#[tokio::test]
async fn test_kanban_board_empty() {
    let pool = create_test_db().await;
    let tracker = ApplicationTracker::new(pool);

    let kanban = tracker.get_applications_by_status().await.unwrap();
    assert!(kanban.to_apply.is_empty());
    assert!(kanban.applied.is_empty());
    assert!(kanban.rejected.is_empty());
}

#[tokio::test]
async fn test_get_pending_reminders_excludes_completed() {
    let pool = create_test_db().await;

    sqlx::query("INSERT INTO jobs (hash, title, company, url, source) VALUES ('test123', 'Case Manager', 'CommunityCare', 'http://test.com', 'test')")
        .execute(&pool)
        .await
        .unwrap();

    let tracker = ApplicationTracker::new(pool);
    let app_id = tracker.create_application("test123").await.unwrap();

    let past_time = Utc::now() - Duration::hours(1);
    tracker
        .set_reminder(app_id, "follow_up", past_time, "Test")
        .await
        .unwrap();

    let pending = tracker.get_pending_reminders().await.unwrap();
    let reminder_id = pending[0].id;

    tracker.complete_reminder(reminder_id).await.unwrap();

    let pending_after = tracker.get_pending_reminders().await.unwrap();
    assert_eq!(pending_after.len(), 0);
}
