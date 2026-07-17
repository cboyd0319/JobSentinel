//! Integration Tests for Scraping Pipeline
//!
//! Exercises the scraper, scorer, storage, and notification pipeline.

mod support;

use jobsentinel_application::{scheduler::Scheduler, scoring::ScoringEngine};
use jobsentinel_domain::Job;
use jobsentinel_storage::Database;
use std::sync::Arc;
use support::{test_config as create_test_config, test_job};

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
        location: Some("Remote".to_string()),
        description: Some("Coordinate care plans with CRM and case management".to_string()),
        salary_min: Some(65000),
        salary_max: Some(85000),
        ..test_job("test123", "Senior Care Coordinator", "CareBridge")
    };

    let score = scoring_engine.score(&job);

    // Should score highly: matches title, has CRM/case-management keywords, remote, good salary
    assert!(score.total > 0.8, "High-quality job should score above 0.8");
}

#[tokio::test]
async fn test_database_upsert_pipeline() {
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();

    let mut job = Job {
        url: "https://example.com/job".to_string(),
        location: Some("Chicago".to_string()),
        description: None,
        score: Some(0.75),
        remote: None,
        currency: None,
        ..test_job("unique_hash_123", "Test Coordinator", "Example Services")
    };

    // First insert
    let id = db.upsert_job(&job).await.unwrap();
    assert!(id > 0);

    // Verify it was inserted
    let fetched = db.get_job_by_hash(&job.hash).await.unwrap();
    assert!(fetched.is_some());
    let fetched_job = fetched.unwrap();
    assert_eq!(fetched_job.title, "Test Coordinator");
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
        url: "https://example.com/job".to_string(),
        location: None,
        description: None,
        score: Some(0.6),
        remote: None,
        currency: None,
        ..test_job("duplicate_hash_456", "Duplicate Job", "Company")
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
        url: "https://example.com/high".to_string(),
        location: None,
        description: None,
        score: Some(0.95),
        remote: None,
        currency: None,
        ..test_job("high_score_1", "High Score Job", "Company")
    };

    let low_score_job = Job {
        url: "https://example.com/low".to_string(),
        location: None,
        description: None,
        score: Some(0.35),
        remote: None,
        currency: None,
        ..test_job("low_score_1", "Low Score Job", "Company")
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
            description: None,
            score: Some(0.5 + (i as f64 * 0.05)),
            salary_min: Some(100000 + (i * 10000)),
            salary_max: Some(150000 + (i * 10000)),
            ..test_job(&format!("job_hash_{i}"), &format!("Job {i}"), "Company")
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
        url: "https://example.com/care".to_string(),
        description: Some("Coordinate care plans with CRM".to_string()),
        score: Some(0.9),
        salary_min: Some(65000),
        salary_max: Some(85000),
        ..test_job("search_job_1", "Senior Care Coordinator", "CareBridge")
    };

    let job2 = Job {
        url: "https://example.com/support".to_string(),
        location: Some("Chicago".to_string()),
        description: Some("Resolve customer issues and coach support staff".to_string()),
        score: Some(0.85),
        remote: None,
        salary_min: Some(55000),
        salary_max: Some(75000),
        ..test_job("search_job_2", "Customer Support Lead", "SupportWorks")
    };

    db.upsert_job(&job1).await.unwrap();
    db.upsert_job(&job2).await.unwrap();

    // Search for "Care"
    let care_results = db.search_jobs("Care", 10).await.unwrap();
    assert!(!care_results.is_empty(), "Should find care jobs");
    assert!(
        care_results.iter().any(|j| j.title.contains("Care")),
        "Results should contain care job"
    );

    // Search for "Support"
    let support_results = db.search_jobs("Support", 10).await.unwrap();
    assert!(!support_results.is_empty(), "Should find support jobs");
    assert!(
        support_results.iter().any(|j| j.title.contains("Support")),
        "Results should contain support job"
    );
}

#[path = "scraping_pipeline_integration/concurrency_and_scoring_tests.rs"]
mod concurrency_and_scoring_tests;
