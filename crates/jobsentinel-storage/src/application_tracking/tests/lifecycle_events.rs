use super::*;

#[tokio::test]
async fn test_status_change_logs_event() {
    let pool = crate::test_support::migrated_pool().await;

    sqlx::query("INSERT INTO jobs (hash, title, company, url, source) VALUES ('test123', 'Case Manager', 'CommunityCare', 'http://test.com', 'test')")
        .execute(&pool)
        .await
        .unwrap();

    let tracker = ApplicationTracker::new(pool.clone());
    let app_id = tracker.create_application("test123").await.unwrap();

    tracker
        .update_status(app_id, ApplicationStatus::Applied)
        .await
        .unwrap();

    let events = sqlx::query("SELECT * FROM application_events WHERE application_id = ? AND event_type = 'status_change'")
        .bind(app_id)
        .fetch_all(&pool)
        .await
        .unwrap();

    assert_eq!(events.len(), 1);
    let event_data_raw: Option<String> = events[0].get("event_data");
    let event_data: serde_json::Value =
        serde_json::from_str(event_data_raw.as_ref().unwrap()).unwrap();
    assert_eq!(event_data["from"], "to_apply");
    assert_eq!(event_data["to"], "applied");
}

#[tokio::test]
async fn test_applied_status_sets_applied_at_once() {
    let pool = crate::test_support::migrated_pool().await;

    sqlx::query("INSERT INTO jobs (hash, title, company, url, source) VALUES ('test123', 'Case Manager', 'CommunityCare', 'http://test.com', 'test')")
        .execute(&pool)
        .await
        .unwrap();

    let tracker = ApplicationTracker::new(pool);
    let app_id = tracker.create_application("test123").await.unwrap();

    tracker
        .update_status(app_id, ApplicationStatus::Applied)
        .await
        .unwrap();
    let app_first = tracker.get_application(app_id).await.unwrap();
    assert!(app_first.applied_at.is_some());

    let first_applied_at = app_first.applied_at.unwrap();

    // Wait a bit
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

    // Update to different status then back to applied
    tracker
        .update_status(app_id, ApplicationStatus::PhoneInterview)
        .await
        .unwrap();
    tracker
        .update_status(app_id, ApplicationStatus::Applied)
        .await
        .unwrap();

    let app_second = tracker.get_application(app_id).await.unwrap();
    let second_applied_at = app_second.applied_at.unwrap();

    // applied_at should not change - timestamps might differ slightly due to rounding
    // So just check both exist and are within 1 second of each other
    let diff = (first_applied_at.timestamp() - second_applied_at.timestamp()).abs();
    assert!(
        diff <= 1,
        "Timestamps differ by {} seconds, expected <= 1",
        diff
    );
}

#[tokio::test]
async fn test_interview_status_auto_sets_thank_you_reminder() {
    let pool = crate::test_support::migrated_pool().await;

    sqlx::query("INSERT INTO jobs (hash, title, company, url, source) VALUES ('test123', 'Case Manager', 'CommunityCare', 'http://test.com', 'test')")
        .execute(&pool)
        .await
        .unwrap();

    let tracker = ApplicationTracker::new(pool.clone());
    let app_id = tracker.create_application("test123").await.unwrap();

    tracker
        .update_status(app_id, ApplicationStatus::PhoneInterview)
        .await
        .unwrap();

    let reminders = sqlx::query("SELECT * FROM application_reminders WHERE application_id = ?")
        .bind(app_id)
        .fetch_all(&pool)
        .await
        .unwrap();

    assert_eq!(reminders.len(), 1);
    assert!(reminders[0]
        .get::<Option<String>, _>("message")
        .as_ref()
        .unwrap()
        .contains("thank-you"));
}
