use super::*;

async fn tracker_with_each_application_status() -> ApplicationTracker {
    let pool = crate::test_support::migrated_pool().await;
    let status_paths: [&[ApplicationStatus]; 12] = [
        &[],
        &[ApplicationStatus::Applied],
        &[ApplicationStatus::Applied, ApplicationStatus::ScreeningCall],
        &[
            ApplicationStatus::Applied,
            ApplicationStatus::PhoneInterview,
        ],
        &[
            ApplicationStatus::Applied,
            ApplicationStatus::TechnicalInterview,
        ],
        &[
            ApplicationStatus::Applied,
            ApplicationStatus::OnsiteInterview,
        ],
        &[ApplicationStatus::Applied, ApplicationStatus::OfferReceived],
        &[
            ApplicationStatus::Applied,
            ApplicationStatus::OfferReceived,
            ApplicationStatus::OfferAccepted,
        ],
        &[
            ApplicationStatus::Applied,
            ApplicationStatus::OfferReceived,
            ApplicationStatus::OfferRejected,
        ],
        &[ApplicationStatus::Applied, ApplicationStatus::Rejected],
        &[ApplicationStatus::Applied, ApplicationStatus::Ghosted],
        &[ApplicationStatus::Applied, ApplicationStatus::Withdrawn],
    ];

    for (index, path) in status_paths.into_iter().enumerate() {
        let hash = format!("job{}", index + 1);
        sqlx::query(
            "INSERT INTO jobs (hash, title, company, url, source) VALUES (?, 'Case Manager', 'CommunityCare', 'http://test.com', 'test')",
        )
        .bind(&hash)
        .execute(&pool)
        .await
        .unwrap();

        let tracker = ApplicationTracker::new(pool.clone());
        let application_id = tracker.create_application(&hash).await.unwrap();
        for status in path {
            tracker
                .update_status(application_id, *status)
                .await
                .unwrap();
        }
    }

    ApplicationTracker::new(pool)
}

// ========================================
// Comprehensive status coverage tests (lines 371-382, 686-697)
// ========================================

#[tokio::test]
async fn test_kanban_all_status_buckets() {
    let tracker = tracker_with_each_application_status().await;

    // Get Kanban board and verify all buckets are populated
    let kanban = tracker.get_applications_by_status().await.unwrap();

    assert_eq!(kanban.to_apply.len(), 1);
    assert_eq!(kanban.applied.len(), 1);
    assert_eq!(kanban.screening_call.len(), 1);
    assert_eq!(kanban.phone_interview.len(), 1);
    assert_eq!(kanban.technical_interview.len(), 1);
    assert_eq!(kanban.onsite_interview.len(), 1);
    assert_eq!(kanban.offer_received.len(), 1);
    assert_eq!(kanban.offer_accepted.len(), 1);
    assert_eq!(kanban.offer_rejected.len(), 1);
    assert_eq!(kanban.rejected.len(), 1);
    assert_eq!(kanban.ghosted.len(), 1);
    assert_eq!(kanban.withdrawn.len(), 1);
}

#[tokio::test]
async fn test_application_stats_all_statuses() {
    let tracker = tracker_with_each_application_status().await;

    // Get stats and verify all status counts
    let stats = tracker.get_application_stats().await.unwrap();

    assert_eq!(stats.by_status.to_apply, 1);
    assert_eq!(stats.by_status.applied, 1);
    assert_eq!(stats.by_status.screening_call, 1);
    assert_eq!(stats.by_status.phone_interview, 1);
    assert_eq!(stats.by_status.technical_interview, 1);
    assert_eq!(stats.by_status.onsite_interview, 1);
    assert_eq!(stats.by_status.offer_received, 1);
    assert_eq!(stats.by_status.offer_accepted, 1);
    assert_eq!(stats.by_status.offer_rejected, 1);
    assert_eq!(stats.by_status.rejected, 1);
    assert_eq!(stats.by_status.ghosted, 1);
    assert_eq!(stats.by_status.withdrawn, 1);

    assert_eq!(stats.total, 12);
}

#[tokio::test]
async fn test_auto_reminder_for_offer_status() {
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

    // Clear initial reminder
    sqlx::query("DELETE FROM application_reminders WHERE application_id = ?")
        .bind(app_id)
        .execute(&pool)
        .await
        .unwrap();

    // Transition to OfferReceived - should NOT create reminder (lines 298-300)
    tracker
        .update_status(app_id, ApplicationStatus::OfferReceived)
        .await
        .unwrap();

    let reminders = sqlx::query("SELECT * FROM application_reminders WHERE application_id = ?")
        .bind(app_id)
        .fetch_all(&pool)
        .await
        .unwrap();

    assert_eq!(reminders.len(), 0);
}
