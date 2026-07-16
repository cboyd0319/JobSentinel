use super::*;

// ========================================
// Comprehensive status coverage tests (lines 371-382, 686-697)
// ========================================

#[tokio::test]
async fn test_kanban_all_status_buckets() {
    let pool = create_test_db().await;

    // Create jobs for all statuses
    for i in 1..=12 {
        sqlx::query("INSERT INTO jobs (hash, title, company, url, source) VALUES (?, 'Case Manager', 'CommunityCare', 'http://test.com', 'test')")
            .bind(format!("job{}", i))
            .execute(&pool)
            .await
            .unwrap();
    }

    let tracker = ApplicationTracker::new(pool);

    // Create applications for each status
    let _app1 = tracker.create_application("job1").await.unwrap();
    // to_apply - default status

    let app2 = tracker.create_application("job2").await.unwrap();
    tracker
        .update_status(app2, ApplicationStatus::Applied)
        .await
        .unwrap();

    let app3 = tracker.create_application("job3").await.unwrap();
    tracker
        .update_status(app3, ApplicationStatus::Applied)
        .await
        .unwrap();
    tracker
        .update_status(app3, ApplicationStatus::ScreeningCall)
        .await
        .unwrap();

    let app4 = tracker.create_application("job4").await.unwrap();
    tracker
        .update_status(app4, ApplicationStatus::Applied)
        .await
        .unwrap();
    tracker
        .update_status(app4, ApplicationStatus::PhoneInterview)
        .await
        .unwrap();

    let app5 = tracker.create_application("job5").await.unwrap();
    tracker
        .update_status(app5, ApplicationStatus::Applied)
        .await
        .unwrap();
    tracker
        .update_status(app5, ApplicationStatus::TechnicalInterview)
        .await
        .unwrap();

    let app6 = tracker.create_application("job6").await.unwrap();
    tracker
        .update_status(app6, ApplicationStatus::Applied)
        .await
        .unwrap();
    tracker
        .update_status(app6, ApplicationStatus::OnsiteInterview)
        .await
        .unwrap();

    let app7 = tracker.create_application("job7").await.unwrap();
    tracker
        .update_status(app7, ApplicationStatus::Applied)
        .await
        .unwrap();
    tracker
        .update_status(app7, ApplicationStatus::OfferReceived)
        .await
        .unwrap();

    let app8 = tracker.create_application("job8").await.unwrap();
    tracker
        .update_status(app8, ApplicationStatus::Applied)
        .await
        .unwrap();
    tracker
        .update_status(app8, ApplicationStatus::OfferReceived)
        .await
        .unwrap();
    tracker
        .update_status(app8, ApplicationStatus::OfferAccepted)
        .await
        .unwrap();

    let app9 = tracker.create_application("job9").await.unwrap();
    tracker
        .update_status(app9, ApplicationStatus::Applied)
        .await
        .unwrap();
    tracker
        .update_status(app9, ApplicationStatus::OfferReceived)
        .await
        .unwrap();
    tracker
        .update_status(app9, ApplicationStatus::OfferRejected)
        .await
        .unwrap();

    let app10 = tracker.create_application("job10").await.unwrap();
    tracker
        .update_status(app10, ApplicationStatus::Applied)
        .await
        .unwrap();
    tracker
        .update_status(app10, ApplicationStatus::Rejected)
        .await
        .unwrap();

    let app11 = tracker.create_application("job11").await.unwrap();
    tracker
        .update_status(app11, ApplicationStatus::Applied)
        .await
        .unwrap();
    tracker
        .update_status(app11, ApplicationStatus::Ghosted)
        .await
        .unwrap();

    let app12 = tracker.create_application("job12").await.unwrap();
    tracker
        .update_status(app12, ApplicationStatus::Applied)
        .await
        .unwrap();
    tracker
        .update_status(app12, ApplicationStatus::Withdrawn)
        .await
        .unwrap();

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
    let pool = create_test_db().await;

    // Create jobs for all statuses
    for i in 1..=12 {
        sqlx::query("INSERT INTO jobs (hash, title, company, url, source) VALUES (?, 'Case Manager', 'CommunityCare', 'http://test.com', 'test')")
            .bind(format!("job{}", i))
            .execute(&pool)
            .await
            .unwrap();
    }

    let tracker = ApplicationTracker::new(pool);

    // Create applications for each status
    let _app1 = tracker.create_application("job1").await.unwrap();
    // to_apply - default

    let app2 = tracker.create_application("job2").await.unwrap();
    tracker
        .update_status(app2, ApplicationStatus::Applied)
        .await
        .unwrap();

    let app3 = tracker.create_application("job3").await.unwrap();
    tracker
        .update_status(app3, ApplicationStatus::Applied)
        .await
        .unwrap();
    tracker
        .update_status(app3, ApplicationStatus::ScreeningCall)
        .await
        .unwrap();

    let app4 = tracker.create_application("job4").await.unwrap();
    tracker
        .update_status(app4, ApplicationStatus::Applied)
        .await
        .unwrap();
    tracker
        .update_status(app4, ApplicationStatus::PhoneInterview)
        .await
        .unwrap();

    let app5 = tracker.create_application("job5").await.unwrap();
    tracker
        .update_status(app5, ApplicationStatus::Applied)
        .await
        .unwrap();
    tracker
        .update_status(app5, ApplicationStatus::TechnicalInterview)
        .await
        .unwrap();

    let app6 = tracker.create_application("job6").await.unwrap();
    tracker
        .update_status(app6, ApplicationStatus::Applied)
        .await
        .unwrap();
    tracker
        .update_status(app6, ApplicationStatus::OnsiteInterview)
        .await
        .unwrap();

    let app7 = tracker.create_application("job7").await.unwrap();
    tracker
        .update_status(app7, ApplicationStatus::Applied)
        .await
        .unwrap();
    tracker
        .update_status(app7, ApplicationStatus::OfferReceived)
        .await
        .unwrap();

    let app8 = tracker.create_application("job8").await.unwrap();
    tracker
        .update_status(app8, ApplicationStatus::Applied)
        .await
        .unwrap();
    tracker
        .update_status(app8, ApplicationStatus::OfferReceived)
        .await
        .unwrap();
    tracker
        .update_status(app8, ApplicationStatus::OfferAccepted)
        .await
        .unwrap();

    let app9 = tracker.create_application("job9").await.unwrap();
    tracker
        .update_status(app9, ApplicationStatus::Applied)
        .await
        .unwrap();
    tracker
        .update_status(app9, ApplicationStatus::OfferReceived)
        .await
        .unwrap();
    tracker
        .update_status(app9, ApplicationStatus::OfferRejected)
        .await
        .unwrap();

    let app10 = tracker.create_application("job10").await.unwrap();
    tracker
        .update_status(app10, ApplicationStatus::Applied)
        .await
        .unwrap();
    tracker
        .update_status(app10, ApplicationStatus::Rejected)
        .await
        .unwrap();

    let app11 = tracker.create_application("job11").await.unwrap();
    tracker
        .update_status(app11, ApplicationStatus::Applied)
        .await
        .unwrap();
    tracker
        .update_status(app11, ApplicationStatus::Ghosted)
        .await
        .unwrap();

    let app12 = tracker.create_application("job12").await.unwrap();
    tracker
        .update_status(app12, ApplicationStatus::Applied)
        .await
        .unwrap();
    tracker
        .update_status(app12, ApplicationStatus::Withdrawn)
        .await
        .unwrap();

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
    let pool = create_test_db().await;

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
