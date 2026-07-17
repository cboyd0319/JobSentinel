use super::*;

// ========================================
// Application stats edge cases
// ========================================

#[tokio::test]
async fn test_application_stats_weekly_data_with_null_week() {
    let pool = crate::test_support::migrated_pool().await;

    sqlx::query("INSERT INTO jobs (hash, title, company, url, source) VALUES ('test1', 'Case Manager', 'CommunityCare', 'http://test.com', 'test')")
        .execute(&pool)
        .await
        .unwrap();

    let tracker = ApplicationTracker::new(pool.clone());
    let app_id = tracker.create_application("test1").await.unwrap();

    tracker
        .update_status(app_id, ApplicationStatus::Applied)
        .await
        .unwrap();

    let applied_at: Option<String> =
        sqlx::query_scalar("SELECT applied_at FROM applications WHERE id = ?")
            .bind(app_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert!(applied_at.is_some());

    let sql_week: Option<String> = sqlx::query_scalar(
        "SELECT strftime('%Y-%W', datetime(applied_at)) FROM applications WHERE id = ?",
    )
    .bind(app_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert!(
        sql_week.is_some(),
        "applied_at should map to a SQLite week: {:?}",
        applied_at
    );

    let applied_julian: Option<f64> =
        sqlx::query_scalar("SELECT julianday(datetime(applied_at)) FROM applications WHERE id = ?")
            .bind(app_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    let cutoff_julian: Option<f64> = sqlx::query_scalar("SELECT julianday('now', '-84 days')")
        .fetch_one(&pool)
        .await
        .unwrap();
    let in_window: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM applications WHERE id = ? AND julianday(datetime(applied_at)) >= julianday('now', '-84 days')",
    )
    .bind(app_id)
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(
        in_window, 1,
        "applied_at should be in the 12-week window: applied_at={:?}, applied_julian={:?}, cutoff_julian={:?}",
        applied_at, applied_julian, cutoff_julian
    );

    let stats = tracker.get_application_stats().await.unwrap();

    // Should have weekly data for the current applied application.
    assert_eq!(stats.weekly_applications.len(), 1);
    assert_eq!(stats.weekly_applications[0].count, 1);
    assert!(!stats.weekly_applications[0].week.is_empty());

    // Insert application with NULL applied_at to test filter_map on line 769
    sqlx::query("UPDATE applications SET applied_at = NULL WHERE id = ?")
        .bind(app_id)
        .execute(&pool)
        .await
        .unwrap();

    let stats2 = tracker.get_application_stats().await.unwrap();
    // NULL applied_at should be filtered out
    assert_eq!(stats2.weekly_applications.len(), 0);
}

#[tokio::test]
async fn test_event_logging_via_reminder_set() {
    let pool = crate::test_support::migrated_pool().await;

    sqlx::query("INSERT INTO jobs (hash, title, company, url, source) VALUES ('test123', 'Case Manager', 'CommunityCare', 'http://test.com', 'test')")
        .execute(&pool)
        .await
        .unwrap();

    let tracker = ApplicationTracker::new(pool.clone());
    let app_id = tracker.create_application("test123").await.unwrap();

    let reminder_time = Utc::now() + Duration::days(1);
    tracker
        .set_reminder(app_id, "custom", reminder_time, "Custom reminder")
        .await
        .unwrap();

    // Verify event was logged (tests log_event function lines 329-338)
    let events = sqlx::query(
        "SELECT * FROM application_events WHERE application_id = ? AND event_type = 'reminder_set'",
    )
    .bind(app_id)
    .fetch_all(&pool)
    .await
    .unwrap();

    assert_eq!(events.len(), 1);
    let event_data_raw: Option<String> = events[0].get("event_data");
    let event_data: serde_json::Value =
        serde_json::from_str(event_data_raw.as_ref().unwrap()).unwrap();
    assert_eq!(event_data["type"], "custom");
    assert_eq!(event_data["has_message"], true);
    assert_eq!(event_data["message_chars"], 15);
    assert_eq!(event_data["time"], reminder_time.to_rfc3339());
    assert!(!event_data_raw.unwrap().contains("Custom reminder"));
}
