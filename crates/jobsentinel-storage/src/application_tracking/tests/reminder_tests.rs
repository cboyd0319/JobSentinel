use super::*;

// ========================================
// Auto-reminder tests for interview statuses
// ========================================

#[tokio::test]
async fn test_technical_interview_auto_sets_thank_you_reminder() {
    let pool = create_test_db().await;

    sqlx::query("INSERT INTO jobs (hash, title, company, url, source) VALUES ('test123', 'Case Manager', 'CommunityCare', 'http://test.com', 'test')")
        .execute(&pool)
        .await
        .unwrap();

    let tracker = ApplicationTracker::new(pool.clone());
    let app_id = tracker.create_application("test123").await.unwrap();

    tracker
        .update_status(app_id, ApplicationStatus::TechnicalInterview)
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

#[tokio::test]
async fn test_onsite_interview_auto_sets_thank_you_reminder() {
    let pool = create_test_db().await;

    sqlx::query("INSERT INTO jobs (hash, title, company, url, source) VALUES ('test123', 'Case Manager', 'CommunityCare', 'http://test.com', 'test')")
        .execute(&pool)
        .await
        .unwrap();

    let tracker = ApplicationTracker::new(pool.clone());
    let app_id = tracker.create_application("test123").await.unwrap();

    tracker
        .update_status(app_id, ApplicationStatus::OnsiteInterview)
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

#[tokio::test]
async fn test_screening_call_no_auto_reminder() {
    let pool = create_test_db().await;

    sqlx::query("INSERT INTO jobs (hash, title, company, url, source) VALUES ('test123', 'Case Manager', 'CommunityCare', 'http://test.com', 'test')")
        .execute(&pool)
        .await
        .unwrap();

    let tracker = ApplicationTracker::new(pool.clone());
    let app_id = tracker.create_application("test123").await.unwrap();

    tracker
        .update_status(app_id, ApplicationStatus::ScreeningCall)
        .await
        .unwrap();

    let reminders = sqlx::query("SELECT * FROM application_reminders WHERE application_id = ?")
        .bind(app_id)
        .fetch_all(&pool)
        .await
        .unwrap();

    // ScreeningCall is not in the auto-reminder list (line 301), so no reminders
    assert_eq!(reminders.len(), 0);
}

#[tokio::test]
async fn test_withdrawn_status_no_auto_reminder() {
    let pool = create_test_db().await;

    sqlx::query("INSERT INTO jobs (hash, title, company, url, source) VALUES ('test1', 'Case Manager', 'CommunityCare', 'http://test.com', 'test')")
        .execute(&pool)
        .await
        .unwrap();

    let tracker = ApplicationTracker::new(pool.clone());
    let app_id = tracker.create_application("test1").await.unwrap();

    tracker
        .update_status(app_id, ApplicationStatus::Withdrawn)
        .await
        .unwrap();

    let reminders = sqlx::query("SELECT * FROM application_reminders WHERE application_id = ?")
        .bind(app_id)
        .fetch_all(&pool)
        .await
        .unwrap();

    // Withdrawn is not in the auto-reminder list (line 301), so no reminders
    assert_eq!(reminders.len(), 0);
}
