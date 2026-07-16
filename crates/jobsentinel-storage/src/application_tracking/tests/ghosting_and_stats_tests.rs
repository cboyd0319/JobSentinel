use super::*;

// ========================================
// Ghosting detection tests
// ========================================

#[tokio::test]
async fn test_auto_detect_ghosted() {
    let pool = create_test_db().await;

    sqlx::query("INSERT INTO jobs (hash, title, company, url, source) VALUES ('test1', 'Case Manager', 'CommunityCare', 'http://test.com', 'test')")
        .execute(&pool)
        .await
        .unwrap();
    sqlx::query("INSERT INTO jobs (hash, title, company, url, source) VALUES ('test2', 'Retail Manager', 'StoreOps', 'http://test2.com', 'test')")
        .execute(&pool)
        .await
        .unwrap();

    let tracker = ApplicationTracker::new(pool.clone());

    // Create old application (should be ghosted)
    let app1 = tracker.create_application("test1").await.unwrap();
    tracker
        .update_status(app1, ApplicationStatus::Applied)
        .await
        .unwrap();

    // Set last_contact to 3 weeks ago
    let old_contact = (Utc::now() - Duration::days(21)).to_rfc3339();
    sqlx::query("UPDATE applications SET last_contact = ? WHERE id = ?")
        .bind(&old_contact)
        .bind(app1)
        .execute(&pool)
        .await
        .unwrap();

    // Create recent application (should not be ghosted)
    let app2 = tracker.create_application("test2").await.unwrap();
    tracker
        .update_status(app2, ApplicationStatus::Applied)
        .await
        .unwrap();
    tracker.update_last_contact(app2).await.unwrap();

    let ghosted_count = tracker.auto_detect_ghosted().await.unwrap();
    assert_eq!(ghosted_count, 1);

    let app1_after = tracker.get_application(app1).await.unwrap();
    assert_eq!(app1_after.status, ApplicationStatus::Ghosted);

    let app2_after = tracker.get_application(app2).await.unwrap();
    assert_eq!(app2_after.status, ApplicationStatus::Applied);
}

#[tokio::test]
async fn test_auto_detect_ghosted_no_last_contact() {
    let pool = create_test_db().await;

    sqlx::query("INSERT INTO jobs (hash, title, company, url, source) VALUES ('test1', 'Case Manager', 'CommunityCare', 'http://test.com', 'test')")
        .execute(&pool)
        .await
        .unwrap();

    let tracker = ApplicationTracker::new(pool.clone());

    // Create old application with no last_contact
    let app_id = tracker.create_application("test1").await.unwrap();
    tracker
        .update_status(app_id, ApplicationStatus::Applied)
        .await
        .unwrap();

    // Backdoor: set applied_at to 3 weeks ago
    let old_time = (Utc::now() - Duration::days(21)).to_rfc3339();
    sqlx::query("UPDATE applications SET applied_at = ? WHERE id = ?")
        .bind(&old_time)
        .bind(app_id)
        .execute(&pool)
        .await
        .unwrap();

    let ghosted_count = tracker.auto_detect_ghosted().await.unwrap();
    assert_eq!(ghosted_count, 1);

    let app = tracker.get_application(app_id).await.unwrap();
    assert_eq!(app.status, ApplicationStatus::Ghosted);
}

#[tokio::test]
async fn test_auto_detect_ghosted_keeps_recent_no_last_contact() {
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

    let ghosted_count = tracker.auto_detect_ghosted().await.unwrap();
    assert_eq!(ghosted_count, 0);

    let app = tracker.get_application(app_id).await.unwrap();
    assert_eq!(app.status, ApplicationStatus::Applied);
}

#[tokio::test]
async fn test_auto_detect_ghosted_skips_terminal_states() {
    let pool = create_test_db().await;

    sqlx::query("INSERT INTO jobs (hash, title, company, url, source) VALUES ('test1', 'Case Manager', 'CommunityCare', 'http://test.com', 'test')")
        .execute(&pool)
        .await
        .unwrap();

    let tracker = ApplicationTracker::new(pool.clone());

    let app_id = tracker.create_application("test1").await.unwrap();
    tracker
        .update_status(app_id, ApplicationStatus::Rejected)
        .await
        .unwrap();

    // Set old last_contact
    let old_contact = (Utc::now() - Duration::days(21)).to_rfc3339();
    sqlx::query("UPDATE applications SET last_contact = ? WHERE id = ?")
        .bind(&old_contact)
        .bind(app_id)
        .execute(&pool)
        .await
        .unwrap();

    let ghosted_count = tracker.auto_detect_ghosted().await.unwrap();
    assert_eq!(ghosted_count, 0);

    let app = tracker.get_application(app_id).await.unwrap();
    assert_eq!(app.status, ApplicationStatus::Rejected);
}

// ========================================
// Application stats tests
// ========================================

#[tokio::test]
async fn test_get_application_stats_empty() {
    let pool = create_test_db().await;
    let tracker = ApplicationTracker::new(pool);

    let stats = tracker.get_application_stats().await.unwrap();
    assert_eq!(stats.total, 0);
    assert_eq!(stats.response_rate, 0.0);
    assert_eq!(stats.offer_rate, 0.0);
    assert_eq!(stats.weekly_applications.len(), 0);
}

#[tokio::test]
async fn test_get_application_stats_comprehensive() {
    let pool = create_test_db().await;

    // Insert test jobs
    for i in 1..=10 {
        let hash = format!("test{}", i);
        sqlx::query("INSERT INTO jobs (hash, title, company, url, source) VALUES (?, 'Case Manager', 'CommunityCare', 'http://test.com', 'test')")
            .bind(&hash)
            .execute(&pool)
            .await
            .unwrap();
    }

    let tracker = ApplicationTracker::new(pool);

    // Create applications with various statuses
    let _app1 = tracker.create_application("test1").await.unwrap(); // to_apply
    let app2 = tracker.create_application("test2").await.unwrap();
    tracker
        .update_status(app2, ApplicationStatus::Applied)
        .await
        .unwrap();
    let app3 = tracker.create_application("test3").await.unwrap();
    tracker
        .update_status(app3, ApplicationStatus::Applied)
        .await
        .unwrap();
    tracker
        .update_status(app3, ApplicationStatus::PhoneInterview)
        .await
        .unwrap();
    let app4 = tracker.create_application("test4").await.unwrap();
    tracker
        .update_status(app4, ApplicationStatus::Applied)
        .await
        .unwrap();
    tracker
        .update_status(app4, ApplicationStatus::TechnicalInterview)
        .await
        .unwrap();
    let app5 = tracker.create_application("test5").await.unwrap();
    tracker
        .update_status(app5, ApplicationStatus::Applied)
        .await
        .unwrap();
    tracker
        .update_status(app5, ApplicationStatus::OfferReceived)
        .await
        .unwrap();
    let app6 = tracker.create_application("test6").await.unwrap();
    tracker
        .update_status(app6, ApplicationStatus::Applied)
        .await
        .unwrap();
    tracker
        .update_status(app6, ApplicationStatus::Rejected)
        .await
        .unwrap();

    let stats = tracker.get_application_stats().await.unwrap();

    assert_eq!(stats.total, 6);
    assert_eq!(stats.by_status.to_apply, 1);
    assert_eq!(stats.by_status.applied, 1);
    assert_eq!(stats.by_status.phone_interview, 1);
    assert_eq!(stats.by_status.technical_interview, 1);
    assert_eq!(stats.by_status.offer_received, 1);
    assert_eq!(stats.by_status.rejected, 1);

    // Response rate: 4 responses out of 5 applied = 80%
    assert!((stats.response_rate - 80.0).abs() < 0.1);

    // Offer rate: 1 offer out of 5 applied = 20%
    assert!((stats.offer_rate - 20.0).abs() < 0.1);
}

#[tokio::test]
async fn test_get_application_stats_response_rate_calculation() {
    let pool = create_test_db().await;

    for i in 1..=5 {
        let hash = format!("test{}", i);
        sqlx::query("INSERT INTO jobs (hash, title, company, url, source) VALUES (?, 'Case Manager', 'CommunityCare', 'http://test.com', 'test')")
            .bind(&hash)
            .execute(&pool)
            .await
            .unwrap();
    }

    let tracker = ApplicationTracker::new(pool);

    // 3 applied with no response
    for i in 1..=3 {
        let hash = format!("test{}", i);
        let app_id = tracker.create_application(&hash).await.unwrap();
        tracker
            .update_status(app_id, ApplicationStatus::Applied)
            .await
            .unwrap();
    }

    // 2 applied with response
    for i in 4..=5 {
        let hash = format!("test{}", i);
        let app_id = tracker.create_application(&hash).await.unwrap();
        tracker
            .update_status(app_id, ApplicationStatus::Applied)
            .await
            .unwrap();
        tracker
            .update_status(app_id, ApplicationStatus::PhoneInterview)
            .await
            .unwrap();
    }

    let stats = tracker.get_application_stats().await.unwrap();

    // Response rate: 2 responses out of 5 applied = 40%
    assert!((stats.response_rate - 40.0).abs() < 0.1);
}

#[tokio::test]
async fn test_get_application_stats_offer_rate_calculation() {
    let pool = create_test_db().await;

    for i in 1..=10 {
        let hash = format!("test{}", i);
        sqlx::query("INSERT INTO jobs (hash, title, company, url, source) VALUES (?, 'Case Manager', 'CommunityCare', 'http://test.com', 'test')")
            .bind(&hash)
            .execute(&pool)
            .await
            .unwrap();
    }

    let tracker = ApplicationTracker::new(pool);

    // 8 applied with no offer
    for i in 1..=8 {
        let hash = format!("test{}", i);
        let app_id = tracker.create_application(&hash).await.unwrap();
        tracker
            .update_status(app_id, ApplicationStatus::Applied)
            .await
            .unwrap();
    }

    // 2 applied with offers
    for i in 9..=10 {
        let hash = format!("test{}", i);
        let app_id = tracker.create_application(&hash).await.unwrap();
        tracker
            .update_status(app_id, ApplicationStatus::Applied)
            .await
            .unwrap();
        tracker
            .update_status(app_id, ApplicationStatus::OfferReceived)
            .await
            .unwrap();
    }

    let stats = tracker.get_application_stats().await.unwrap();

    // Offer rate: 2 offers out of 10 applied = 20%
    assert!((stats.offer_rate - 20.0).abs() < 0.1);
}
