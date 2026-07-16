use super::*;

#[tokio::test]
async fn test_pipeline_concurrent_upserts() {
    let db = Arc::new(Database::connect_memory().await.unwrap());
    db.migrate().await.unwrap();

    let mut handles = vec![];

    // Spawn 10 concurrent upsert tasks
    for i in 0..10 {
        let db_clone = Arc::clone(&db);
        let handle = tokio::spawn(async move {
            let job = Job {
                id: 0,
                hash: format!("concurrent_job_{}", i),
                title: format!("Job {}", i),
                company: "Company".to_string(),
                url: format!("https://example.com/job/{}", i),
                location: None,
                description: None,
                score: Some(0.7),
                score_reasons: None,
                source: "test".to_string(),
                remote: None,
                salary_min: None,
                salary_max: None,
                currency: None,
                created_at: chrono::Utc::now(),
                updated_at: chrono::Utc::now(),
                last_seen: chrono::Utc::now(),
                times_seen: 1,
                immediate_alert_sent: false,
                hidden: false,
                included_in_digest: false,
                bookmarked: false,
                notes: None,
                ghost_score: None,
                ghost_reasons: None,
                first_seen: None,
                repost_count: 0,
            };

            db_clone.upsert_job(&job).await
        });

        handles.push(handle);
    }

    // Wait for all to complete
    for handle in handles {
        let result = handle.await.unwrap();
        assert!(result.is_ok(), "Concurrent upsert should succeed");
    }

    // Verify all 10 jobs were inserted
    let jobs = db.get_recent_jobs(20).await.unwrap();
    assert_eq!(jobs.len(), 10, "All concurrent upserts should succeed");
}

#[tokio::test]
async fn test_pipeline_job_ordering_by_score() {
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();

    // Insert jobs in random score order
    let scores = [0.3, 0.9, 0.5, 0.95, 0.2, 0.8];

    for (i, score) in scores.iter().enumerate() {
        let job = Job {
            id: 0,
            hash: format!("ordered_job_{}", i),
            title: format!("Job {}", i),
            company: "Company".to_string(),
            url: format!("https://example.com/job/{}", i),
            location: None,
            description: None,
            score: Some(*score),
            score_reasons: None,
            source: "test".to_string(),
            remote: None,
            salary_min: None,
            salary_max: None,
            currency: None,
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
            last_seen: chrono::Utc::now(),
            times_seen: 1,
            immediate_alert_sent: false,
            hidden: false,
            included_in_digest: false,
            bookmarked: false,
            notes: None,
            ghost_score: None,
            ghost_reasons: None,
            first_seen: None,
            repost_count: 0,
        };

        db.upsert_job(&job).await.unwrap();
    }

    // Get jobs above threshold 0.7
    let high_scoring = db.get_jobs_by_score(0.7, 100).await.unwrap();

    // Should be ordered by score descending
    assert_eq!(high_scoring.len(), 3); // 0.95, 0.9, 0.8
    assert_eq!(high_scoring[0].score.unwrap(), 0.95);
    assert_eq!(high_scoring[1].score.unwrap(), 0.9);
    assert_eq!(high_scoring[2].score.unwrap(), 0.8);
}

#[tokio::test]
async fn test_pipeline_alert_sent_flag() {
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();

    let job = Job {
        id: 0,
        hash: "alert_test_job".to_string(),
        title: "Test Job".to_string(),
        company: "Company".to_string(),
        url: "https://example.com/job".to_string(),
        location: None,
        description: None,
        score: Some(0.95),
        score_reasons: None,
        source: "test".to_string(),
        remote: None,
        salary_min: None,
        salary_max: None,
        currency: None,
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
        last_seen: chrono::Utc::now(),
        times_seen: 1,
        immediate_alert_sent: false,
        hidden: false,
        included_in_digest: false,
        bookmarked: false,
        notes: None,
        ghost_score: None,
        ghost_reasons: None,
        first_seen: None,
        repost_count: 0,
    };

    let id = db.upsert_job(&job).await.unwrap();

    // Mark alert as sent
    db.mark_alert_sent(id).await.unwrap();

    // Verify flag was updated
    let updated_job = db.get_job_by_id(id).await.unwrap().unwrap();
    assert!(updated_job.immediate_alert_sent, "Alert flag should be set");
}

// ========================================
// Scoring Engine Integration Tests
// ========================================

#[tokio::test]
async fn test_scoring_title_matching() {
    let config = Arc::new(create_test_config());
    let scoring_engine = ScoringEngine::new(Arc::clone(&config));

    let matching_job = Job {
        id: 0,
        hash: "match_test".to_string(),
        title: "Care Coordinator".to_string(), // Matches allowlist
        company: "Company".to_string(),
        url: "https://example.com/job".to_string(),
        location: None,
        description: Some("CRM case management and care planning".to_string()),
        score: None,
        score_reasons: None,
        source: "test".to_string(),
        remote: None,
        salary_min: None,
        salary_max: None,
        currency: None,
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
        last_seen: chrono::Utc::now(),
        times_seen: 1,
        immediate_alert_sent: false,
        hidden: false,
        included_in_digest: false,
        bookmarked: false,
        notes: None,
        ghost_score: None,
        ghost_reasons: None,
        first_seen: None,
        repost_count: 0,
    };

    let non_matching_job = Job {
        id: 0,
        hash: "no_match_test".to_string(),
        title: "Commission-Only Sales Representative".to_string(), // Contains excluded keyword
        company: "Company".to_string(),
        url: "https://example.com/job".to_string(),
        location: None,
        description: Some("commission-only sales territory role".to_string()),
        score: None,
        score_reasons: None,
        source: "test".to_string(),
        remote: None,
        salary_min: None,
        salary_max: None,
        currency: None,
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
        last_seen: chrono::Utc::now(),
        times_seen: 1,
        immediate_alert_sent: false,
        hidden: false,
        included_in_digest: false,
        bookmarked: false,
        notes: None,
        ghost_score: None,
        ghost_reasons: None,
        first_seen: None,
        repost_count: 0,
    };

    let matching_score = scoring_engine.score(&matching_job);
    let non_matching_score = scoring_engine.score(&non_matching_job);

    assert!(
        matching_score.total > non_matching_score.total,
        "Matching job should score higher"
    );
}

#[tokio::test]
async fn test_scoring_salary_influence() {
    let config = Arc::new(create_test_config());
    let scoring_engine = ScoringEngine::new(Arc::clone(&config));

    let high_salary_job = Job {
        id: 0,
        hash: "high_salary".to_string(),
        title: "Care Coordinator".to_string(),
        company: "Company".to_string(),
        url: "https://example.com/high".to_string(),
        location: None,
        description: None,
        score: None,
        score_reasons: None,
        source: "test".to_string(),
        remote: None,
        salary_min: Some(65000),
        salary_max: Some(85000),
        currency: Some("USD".to_string()),
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
        last_seen: chrono::Utc::now(),
        times_seen: 1,
        immediate_alert_sent: false,
        hidden: false,
        included_in_digest: false,
        bookmarked: false,
        notes: None,
        ghost_score: None,
        ghost_reasons: None,
        first_seen: None,
        repost_count: 0,
    };

    let low_salary_job = Job {
        id: 0,
        hash: "low_salary".to_string(),
        title: "Care Coordinator".to_string(),
        company: "Company".to_string(),
        url: "https://example.com/low".to_string(),
        location: None,
        description: None,
        score: None,
        score_reasons: None,
        source: "test".to_string(),
        remote: None,
        salary_min: Some(30000),
        salary_max: Some(35000),
        currency: Some("USD".to_string()),
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
        last_seen: chrono::Utc::now(),
        times_seen: 1,
        immediate_alert_sent: false,
        hidden: false,
        included_in_digest: false,
        bookmarked: false,
        notes: None,
        ghost_score: None,
        ghost_reasons: None,
        first_seen: None,
        repost_count: 0,
    };

    let high_score = scoring_engine.score(&high_salary_job);
    let low_score = scoring_engine.score(&low_salary_job);

    assert!(
        high_score.total > low_score.total,
        "Higher salary should contribute to higher score"
    );
}
