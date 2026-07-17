//! Application tracking tests.

use super::tracker::ApplicationTracker;
use super::types::*;
use chrono::{Duration, Utc};
use sqlx::Row;

// ========================================
// Database integration tests
// ========================================

#[tokio::test]
async fn test_create_application() {
    let pool = crate::test_support::migrated_pool().await;

    // Insert test job
    sqlx::query("INSERT INTO jobs (hash, title, company, url, source) VALUES ('test123', 'Case Manager', 'CommunityCare', 'http://test.com', 'test')")
        .execute(&pool)
        .await
        .unwrap();

    let tracker = ApplicationTracker::new(pool);
    let app_id = tracker.create_application("test123").await.unwrap();

    assert!(app_id > 0);

    let app = tracker.get_application(app_id).await.unwrap();
    assert_eq!(app.job_hash, "test123");
    assert_eq!(app.status, ApplicationStatus::ToApply);
}

#[tokio::test]
async fn test_update_status() {
    let pool = crate::test_support::migrated_pool().await;

    sqlx::query("INSERT INTO jobs (hash, title, company, url, source) VALUES ('test123', 'Case Manager', 'CommunityCare', 'http://test.com', 'test')")
        .execute(&pool)
        .await
        .unwrap();

    let tracker = ApplicationTracker::new(pool);
    let app_id = tracker.create_application("test123").await.unwrap();

    // Update to applied
    tracker
        .update_status(app_id, ApplicationStatus::Applied)
        .await
        .unwrap();

    let app = tracker.get_application(app_id).await.unwrap();
    assert_eq!(app.status, ApplicationStatus::Applied);
    assert!(app.applied_at.is_some());
}

#[tokio::test]
async fn test_kanban_board() {
    let pool = crate::test_support::migrated_pool().await;

    sqlx::query("INSERT INTO jobs (hash, title, company, url, source) VALUES ('job1', 'Case Manager', 'CommunityCare', 'http://test.com', 'test')")
        .execute(&pool)
        .await
        .unwrap();
    sqlx::query("INSERT INTO jobs (hash, title, company, url, source) VALUES ('job2', 'Retail Manager', 'StoreOps', 'http://test2.com', 'test')")
        .execute(&pool)
        .await
        .unwrap();

    let tracker = ApplicationTracker::new(pool);

    let app1 = tracker.create_application("job1").await.unwrap();
    let app2 = tracker.create_application("job2").await.unwrap();

    tracker
        .update_status(app1, ApplicationStatus::Applied)
        .await
        .unwrap();
    tracker
        .update_status(app2, ApplicationStatus::PhoneInterview)
        .await
        .unwrap();

    let kanban = tracker.get_applications_by_status().await.unwrap();

    assert_eq!(kanban.applied.len(), 1);
    assert_eq!(kanban.phone_interview.len(), 1);
    assert_eq!(kanban.to_apply.len(), 0);
}

#[tokio::test]
async fn test_auto_reminders() {
    let pool = crate::test_support::migrated_pool().await;

    sqlx::query("INSERT INTO jobs (hash, title, company, url, source) VALUES ('test123', 'Case Manager', 'CommunityCare', 'http://test.com', 'test')")
        .execute(&pool)
        .await
        .unwrap();

    let tracker = ApplicationTracker::new(pool.clone());
    let app_id = tracker.create_application("test123").await.unwrap();

    // Update to applied (should create follow-up reminder)
    tracker
        .update_status(app_id, ApplicationStatus::Applied)
        .await
        .unwrap();

    // Check reminder was created
    let reminders = sqlx::query("SELECT * FROM application_reminders WHERE application_id = ?")
        .bind(app_id)
        .fetch_all(&pool)
        .await
        .unwrap();

    assert_eq!(reminders.len(), 1);
    assert_eq!(reminders[0].get::<String, _>("reminder_type"), "follow_up");
}

// ========================================
// InterviewType tests
// ========================================

#[test]
fn test_interview_type_display() {
    assert_eq!(InterviewType::Phone.to_string(), "phone");
    assert_eq!(InterviewType::Screening.to_string(), "screening");
    assert_eq!(InterviewType::Technical.to_string(), "technical");
    assert_eq!(InterviewType::Behavioral.to_string(), "behavioral");
    assert_eq!(InterviewType::Onsite.to_string(), "onsite");
    assert_eq!(InterviewType::Final.to_string(), "final");
    assert_eq!(InterviewType::Other.to_string(), "other");
}

#[test]
fn test_interview_type_from_str() {
    assert_eq!(
        "phone".parse::<InterviewType>().unwrap(),
        InterviewType::Phone
    );
    assert_eq!(
        "Phone".parse::<InterviewType>().unwrap(),
        InterviewType::Phone
    );
    assert_eq!(
        "PHONE".parse::<InterviewType>().unwrap(),
        InterviewType::Phone
    );
    assert_eq!(
        "screening".parse::<InterviewType>().unwrap(),
        InterviewType::Screening
    );
    assert_eq!(
        "technical".parse::<InterviewType>().unwrap(),
        InterviewType::Technical
    );
    assert_eq!(
        "behavioral".parse::<InterviewType>().unwrap(),
        InterviewType::Behavioral
    );
    assert_eq!(
        "onsite".parse::<InterviewType>().unwrap(),
        InterviewType::Onsite
    );
    assert_eq!(
        "final".parse::<InterviewType>().unwrap(),
        InterviewType::Final
    );
    assert_eq!(
        "unknown".parse::<InterviewType>().unwrap(),
        InterviewType::Other
    );
    assert_eq!("".parse::<InterviewType>().unwrap(), InterviewType::Other);
}

// ========================================
// Update last contact tests
// ========================================

#[tokio::test]
async fn test_update_last_contact() {
    let pool = crate::test_support::migrated_pool().await;

    sqlx::query("INSERT INTO jobs (hash, title, company, url, source) VALUES ('test123', 'Case Manager', 'CommunityCare', 'http://test.com', 'test')")
        .execute(&pool)
        .await
        .unwrap();

    let tracker = ApplicationTracker::new(pool);
    let app_id = tracker.create_application("test123").await.unwrap();

    tracker.update_last_contact(app_id).await.unwrap();

    let app = tracker.get_application(app_id).await.unwrap();
    assert!(app.last_contact.is_some());
}

// ========================================
// Add notes tests
// ========================================

#[tokio::test]
async fn test_add_notes() {
    let pool = crate::test_support::migrated_pool().await;

    sqlx::query("INSERT INTO jobs (hash, title, company, url, source) VALUES ('test123', 'Case Manager', 'CommunityCare', 'http://test.com', 'test')")
        .execute(&pool)
        .await
        .unwrap();

    let tracker = ApplicationTracker::new(pool.clone());
    let app_id = tracker.create_application("test123").await.unwrap();

    tracker
        .add_notes(app_id, "Great opportunity!")
        .await
        .unwrap();

    let app = tracker.get_application(app_id).await.unwrap();
    assert_eq!(app.notes, Some("Great opportunity!".to_string()));

    // Verify event was logged
    let events = sqlx::query(
        "SELECT * FROM application_events WHERE application_id = ? AND event_type = 'note_added'",
    )
    .bind(app_id)
    .fetch_all(&pool)
    .await
    .unwrap();
    assert_eq!(events.len(), 1);
    let event_data_raw: Option<String> = events[0].get("event_data");
    let event_data: serde_json::Value =
        serde_json::from_str(event_data_raw.as_ref().unwrap()).unwrap();
    assert_eq!(event_data["has_notes"], true);
    assert_eq!(event_data["note_chars"], 18);
    assert!(!event_data_raw.unwrap().contains("Great opportunity!"));
}

#[tokio::test]
async fn test_add_notes_overwrites_existing() {
    let pool = crate::test_support::migrated_pool().await;

    sqlx::query("INSERT INTO jobs (hash, title, company, url, source) VALUES ('test123', 'Case Manager', 'CommunityCare', 'http://test.com', 'test')")
        .execute(&pool)
        .await
        .unwrap();

    let tracker = ApplicationTracker::new(pool);
    let app_id = tracker.create_application("test123").await.unwrap();

    tracker.add_notes(app_id, "First note").await.unwrap();
    tracker.add_notes(app_id, "Second note").await.unwrap();

    let app = tracker.get_application(app_id).await.unwrap();
    assert_eq!(app.notes, Some("Second note".to_string()));
}

// ========================================
// Reminder tests
// ========================================

#[tokio::test]
async fn test_set_reminder() {
    let pool = crate::test_support::migrated_pool().await;

    sqlx::query("INSERT INTO jobs (hash, title, company, url, source) VALUES ('test123', 'Case Manager', 'CommunityCare', 'http://test.com', 'test')")
        .execute(&pool)
        .await
        .unwrap();

    let tracker = ApplicationTracker::new(pool.clone());
    let app_id = tracker.create_application("test123").await.unwrap();

    let reminder_time = Utc::now() + Duration::hours(24);
    tracker
        .set_reminder(app_id, "follow_up", reminder_time, "Check status")
        .await
        .unwrap();

    let reminders = sqlx::query("SELECT * FROM application_reminders WHERE application_id = ?")
        .bind(app_id)
        .fetch_all(&pool)
        .await
        .unwrap();

    assert_eq!(reminders.len(), 1);
    assert_eq!(reminders[0].get::<String, _>("reminder_type"), "follow_up");
    assert_eq!(
        reminders[0].get::<Option<String>, _>("message"),
        Some("Check status".to_string())
    );
}

#[tokio::test]
async fn test_get_pending_reminders() {
    let pool = crate::test_support::migrated_pool().await;

    sqlx::query("INSERT INTO jobs (hash, title, company, url, source) VALUES ('test123', 'Case Manager', 'CommunityCare', 'http://test.com', 'test')")
        .execute(&pool)
        .await
        .unwrap();

    let tracker = ApplicationTracker::new(pool);
    let app_id = tracker.create_application("test123").await.unwrap();

    // Set a past reminder (should be returned)
    let past_time = Utc::now() - Duration::hours(1);
    tracker
        .set_reminder(app_id, "follow_up", past_time, "Past reminder")
        .await
        .unwrap();

    // Set a future reminder (should not be returned)
    let future_time = Utc::now() + Duration::hours(24);
    tracker
        .set_reminder(app_id, "follow_up", future_time, "Future reminder")
        .await
        .unwrap();

    let pending = tracker.get_pending_reminders().await.unwrap();
    assert_eq!(pending.len(), 1);
    assert_eq!(pending[0].message, Some("Past reminder".to_string()));
}

#[tokio::test]
async fn test_complete_reminder() {
    let pool = crate::test_support::migrated_pool().await;

    sqlx::query("INSERT INTO jobs (hash, title, company, url, source) VALUES ('test123', 'Case Manager', 'CommunityCare', 'http://test.com', 'test')")
        .execute(&pool)
        .await
        .unwrap();

    let tracker = ApplicationTracker::new(pool.clone());
    let app_id = tracker.create_application("test123").await.unwrap();

    let reminder_time = Utc::now() - Duration::hours(1);
    tracker
        .set_reminder(app_id, "follow_up", reminder_time, "Test reminder")
        .await
        .unwrap();

    let pending = tracker.get_pending_reminders().await.unwrap();
    assert_eq!(pending.len(), 1);

    let reminder_id = pending[0].id;
    tracker.complete_reminder(reminder_id).await.unwrap();

    // Should no longer be in pending
    let pending_after = tracker.get_pending_reminders().await.unwrap();
    assert_eq!(pending_after.len(), 0);

    // Verify completed flag set
    let reminder =
        sqlx::query("SELECT completed, completed_at FROM application_reminders WHERE id = ?")
            .bind(reminder_id)
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(reminder.get::<i32, _>("completed"), 1);
    assert!(reminder.get::<Option<String>, _>("completed_at").is_some());
}

// ========================================
// Interview tests
// ========================================
// NOTE: Interview tests are skipped because there's a schema conflict
// between migrations 20251115010000 and 20260116000002.
// The interviews table columns don't match the code expectations.
// This needs to be resolved at the migration level first.

mod ghosting_and_stats_tests;

// ========================================
// Status transition and event logging tests
// ========================================

mod lifecycle_events;

#[path = "tests/edge_case_tests.rs"]
mod edge_case_tests;
#[path = "tests/reminder_tests.rs"]
mod reminder_tests;
#[path = "tests/stats_edge_tests.rs"]
mod stats_edge_tests;
#[path = "tests/status_basic_tests.rs"]
mod status_basic_tests;
#[path = "tests/status_coverage_tests.rs"]
mod status_coverage_tests;
