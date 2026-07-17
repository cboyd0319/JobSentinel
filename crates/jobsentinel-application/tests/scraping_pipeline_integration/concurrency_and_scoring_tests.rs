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
                location: None,
                description: None,
                score: Some(0.7),
                remote: None,
                currency: None,
                ..test_job(
                    &format!("concurrent_job_{i}"),
                    &format!("Job {i}"),
                    "Company",
                )
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
            location: None,
            description: None,
            score: Some(*score),
            remote: None,
            currency: None,
            ..test_job(&format!("ordered_job_{i}"), &format!("Job {i}"), "Company")
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
        url: "https://example.com/job".to_string(),
        location: None,
        description: None,
        score: Some(0.95),
        remote: None,
        currency: None,
        ..test_job("alert_test_job", "Test Job", "Company")
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
        location: None,
        description: Some("CRM case management and care planning".to_string()),
        remote: None,
        currency: None,
        ..test_job("match_test", "Care Coordinator", "Company")
    };

    let non_matching_job = Job {
        location: None,
        description: Some("commission-only sales territory role".to_string()),
        remote: None,
        currency: None,
        ..test_job(
            "no_match_test",
            "Commission-Only Sales Representative",
            "Company",
        )
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
        url: "https://example.com/high".to_string(),
        location: None,
        description: None,
        remote: None,
        salary_min: Some(65000),
        salary_max: Some(85000),
        ..test_job("high_salary", "Care Coordinator", "Company")
    };

    let low_salary_job = Job {
        url: "https://example.com/low".to_string(),
        location: None,
        description: None,
        remote: None,
        salary_min: Some(30000),
        salary_max: Some(35000),
        ..test_job("low_salary", "Care Coordinator", "Company")
    };

    let high_score = scoring_engine.score(&high_salary_job);
    let low_score = scoring_engine.score(&low_salary_job);

    assert!(
        high_score.total > low_score.total,
        "Higher salary should contribute to higher score"
    );
}
