//! Integration Tests for Scraping Pipeline
//!
//! Tests the complete scraping workflow from scraper → scorer → database → notifications

use jobsentinel::core::{
    config::{Config, LocationPreferences},
    db::{Database, Job},
    scheduler::Scheduler,
    scoring::ScoringEngine,
};
use std::sync::Arc;

/// Helper to create a minimal test config
fn create_test_config() -> Config {
    Config {
        title_allowlist: vec![
            "Security Engineer".to_string(),
            "Rust Developer".to_string(),
        ],
        title_blocklist: vec!["Manager".to_string()],
        keywords_boost: vec!["Rust".to_string(), "Security".to_string()],
        keywords_exclude: vec!["PHP".to_string()],
        location_preferences: LocationPreferences {
            allow_remote: true,
            allow_hybrid: false,
            allow_onsite: false,
            cities: vec!["San Francisco".to_string()],
            states: vec!["CA".to_string()],
            country: "US".to_string(),
        },
        salary_floor_usd: 120000,
        auto_refresh: Default::default(),
        immediate_alert_threshold: 0.85,
        scraping_interval_hours: 2,
        alerts: Default::default(),
        greenhouse_urls: vec![],
        lever_urls: vec![],
        linkedin: Default::default(),
        indeed: Default::default(),
        jobswithgpt_endpoint: "https://api.jobswithgpt.com/mcp".to_string(),
    }
}

/// Helper to create a test job with ghost detection fields
fn create_test_job(hash: &str, title: &str, company: &str) -> Job {
    Job {
        id: 0,
        hash: hash.to_string(),
        title: title.to_string(),
        company: company.to_string(),
        url: format!("https://example.com/job/{}", hash),
        location: None,
        description: None,
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
    }
}

// ========================================
// Scraping Pipeline Integration Tests
// ========================================

#[tokio::test]
async fn test_pipeline_empty_config_completes_successfully() {
    let config = Arc::new(create_test_config());
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Run scraping cycle with empty scraper URLs
    let result = scheduler.run_scraping_cycle().await;

    assert!(result.is_ok(), "Pipeline should complete without errors");
    let scraping_result = result.unwrap();

    assert_eq!(scraping_result.jobs_found, 0);
    assert_eq!(scraping_result.jobs_new, 0);
    assert_eq!(scraping_result.jobs_updated, 0);
    assert_eq!(scraping_result.high_matches, 0);
    assert_eq!(scraping_result.alerts_sent, 0);
}

#[tokio::test]
async fn test_scoring_engine_integration() {
    let config = Arc::new(create_test_config());
    let scoring_engine = ScoringEngine::new(Arc::clone(&config));

    let job = Job {
        id: 0,
        hash: "test123".to_string(),
        title: "Senior Rust Security Engineer".to_string(),
        company: "TechCorp".to_string(),
        url: "https://example.com/job".to_string(),
        location: Some("Remote".to_string()),
        description: Some("Build secure systems in Rust".to_string()),
        score: None,
        score_reasons: None,
        source: "test".to_string(),
        remote: Some(true),
        salary_min: Some(150000),
        salary_max: Some(200000),
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

    let score = scoring_engine.score(&job);

    // Should score highly: matches title, has Rust/Security keywords, remote, good salary
    assert!(score.total > 0.8, "High-quality job should score above 0.8");
}

#[tokio::test]
async fn test_database_upsert_pipeline() {
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();

    let mut job = Job {
        id: 0,
        hash: "unique_hash_123".to_string(),
        title: "Test Engineer".to_string(),
        company: "TestCo".to_string(),
        url: "https://example.com/job".to_string(),
        location: Some("San Francisco".to_string()),
        description: None,
        score: Some(0.75),
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

    // First insert
    let id = db.upsert_job(&job).await.unwrap();
    assert!(id > 0);

    // Verify it was inserted
    let fetched = db.get_job_by_hash(&job.hash).await.unwrap();
    assert!(fetched.is_some());
    let fetched_job = fetched.unwrap();
    assert_eq!(fetched_job.title, "Test Engineer");
    assert_eq!(fetched_job.times_seen, 1);

    // Second insert (should update times_seen)
    job.times_seen = 2;
    let id2 = db.upsert_job(&job).await.unwrap();
    assert_eq!(id, id2, "Upserting same job should return same ID");

    let fetched2 = db.get_job_by_hash(&job.hash).await.unwrap().unwrap();
    assert_eq!(fetched2.times_seen, 2, "times_seen should be updated");
}

#[tokio::test]
async fn test_pipeline_job_deduplication() {
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    // Create identical jobs (same hash)
    let job1 = Job {
        id: 0,
        hash: "duplicate_hash_456".to_string(),
        title: "Duplicate Job".to_string(),
        company: "Company".to_string(),
        url: "https://example.com/job".to_string(),
        location: None,
        description: None,
        score: Some(0.6),
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

    let mut job2 = job1.clone();
    job2.times_seen = 2;

    // Insert both
    database.upsert_job(&job1).await.unwrap();
    database.upsert_job(&job2).await.unwrap();

    // Should only have one job in database
    let recent_jobs = database.get_recent_jobs(10).await.unwrap();
    assert_eq!(
        recent_jobs.len(),
        1,
        "Duplicate jobs should be deduplicated"
    );

    let stored_job = &recent_jobs[0];
    assert_eq!(stored_job.hash, "duplicate_hash_456");
    assert_eq!(stored_job.times_seen, 2, "times_seen should be updated");
}

#[tokio::test]
async fn test_pipeline_high_score_filtering() {
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    // Insert jobs with different scores
    let high_score_job = Job {
        id: 0,
        hash: "high_score_1".to_string(),
        title: "High Score Job".to_string(),
        company: "Company".to_string(),
        url: "https://example.com/high".to_string(),
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

    let low_score_job = Job {
        id: 0,
        hash: "low_score_1".to_string(),
        title: "Low Score Job".to_string(),
        company: "Company".to_string(),
        url: "https://example.com/low".to_string(),
        location: None,
        description: None,
        score: Some(0.35),
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

    database.upsert_job(&high_score_job).await.unwrap();
    database.upsert_job(&low_score_job).await.unwrap();

    // Query by score threshold (config has threshold of 0.85)
    let high_scoring_jobs = database.get_jobs_by_score(0.85, 100).await.unwrap();

    assert_eq!(
        high_scoring_jobs.len(),
        1,
        "Should only return high-scoring jobs"
    );
    assert_eq!(high_scoring_jobs[0].hash, "high_score_1");
}

#[tokio::test]
async fn test_pipeline_full_cycle_statistics() {
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    // Insert multiple jobs
    for i in 0..10 {
        let job = Job {
            id: 0,
            hash: format!("job_hash_{}", i),
            title: format!("Job {}", i),
            company: "Company".to_string(),
            url: format!("https://example.com/job/{}", i),
            location: Some("Remote".to_string()),
            description: None,
            score: Some(0.5 + (i as f64 * 0.05)),
            score_reasons: None,
            source: "test".to_string(),
            remote: Some(true),
            salary_min: Some(100000 + (i * 10000)),
            salary_max: Some(150000 + (i * 10000)),
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

        database.upsert_job(&job).await.unwrap();
    }

    // Get statistics
    let stats = database.get_statistics().await.unwrap();

    assert_eq!(stats.total_jobs, 10);
    assert_eq!(stats.jobs_today, 10);
    assert!(stats.average_score > 0.0);
}

#[tokio::test]
async fn test_pipeline_search_functionality() {
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();

    // Insert test jobs with searchable content
    let job1 = Job {
        id: 0,
        hash: "search_job_1".to_string(),
        title: "Senior Rust Developer".to_string(),
        company: "RustCorp".to_string(),
        url: "https://example.com/rust".to_string(),
        location: Some("Remote".to_string()),
        description: Some("Build amazing Rust applications".to_string()),
        score: Some(0.9),
        score_reasons: None,
        source: "test".to_string(),
        remote: Some(true),
        salary_min: Some(150000),
        salary_max: Some(200000),
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

    let job2 = Job {
        id: 0,
        hash: "search_job_2".to_string(),
        title: "Security Engineer".to_string(),
        company: "SecureCo".to_string(),
        url: "https://example.com/security".to_string(),
        location: Some("San Francisco".to_string()),
        description: Some("Protect our infrastructure".to_string()),
        score: Some(0.85),
        score_reasons: None,
        source: "test".to_string(),
        remote: None,
        salary_min: Some(140000),
        salary_max: Some(180000),
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

    db.upsert_job(&job1).await.unwrap();
    db.upsert_job(&job2).await.unwrap();

    // Search for "Rust"
    let rust_results = db.search_jobs("Rust", 10).await.unwrap();
    assert!(!rust_results.is_empty(), "Should find Rust jobs");
    assert!(
        rust_results.iter().any(|j| j.title.contains("Rust")),
        "Results should contain Rust job"
    );

    // Search for "Security"
    let security_results = db.search_jobs("Security", 10).await.unwrap();
    assert!(!security_results.is_empty(), "Should find Security jobs");
    assert!(
        security_results
            .iter()
            .any(|j| j.title.contains("Security")),
        "Results should contain Security job"
    );
}

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
        title: "Security Engineer".to_string(), // Matches allowlist
        company: "Company".to_string(),
        url: "https://example.com/job".to_string(),
        location: None,
        description: None,
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
        title: "PHP Developer".to_string(), // Contains excluded keyword
        company: "Company".to_string(),
        url: "https://example.com/job".to_string(),
        location: None,
        description: None,
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
        title: "Security Engineer".to_string(),
        company: "Company".to_string(),
        url: "https://example.com/high".to_string(),
        location: None,
        description: None,
        score: None,
        score_reasons: None,
        source: "test".to_string(),
        remote: None,
        salary_min: Some(180000),
        salary_max: Some(220000),
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
        title: "Security Engineer".to_string(),
        company: "Company".to_string(),
        url: "https://example.com/low".to_string(),
        location: None,
        description: None,
        score: None,
        score_reasons: None,
        source: "test".to_string(),
        remote: None,
        salary_min: Some(80000),
        salary_max: Some(100000),
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
