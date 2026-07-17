//! Scheduler Integration Tests
//!
//! Exercises scheduling, scoring, persistence, errors, and shutdown.

mod support;

use jobsentinel_application::{
    config::Config,
    scheduler::{ScheduleConfig, Scheduler},
};
use jobsentinel_domain::Job;
use jobsentinel_storage::Database;
use std::sync::Arc;
use std::time::Duration;
use support::{test_config, test_job};

/// Helper to create a minimal test config
fn create_test_config() -> Config {
    let mut config = test_config();
    config
        .title_allowlist
        .push("Program Coordinator".to_string());
    config.title_blocklist.push("Director".to_string());
    config.keywords_boost.push("patient scheduling".to_string());
    config.keywords_exclude.push("unpaid trial".to_string());
    config.location_preferences.allow_hybrid = true;
    config
        .location_preferences
        .cities
        .push("Austin".to_string());
    config.location_preferences.states.push("TX".to_string());
    config
}

/// Helper to create a test job with realistic data
fn create_test_job(
    hash: &str,
    title: &str,
    company: &str,
    remote: bool,
    salary_min: Option<i64>,
) -> Job {
    Job {
        location: Some(if remote { "Remote" } else { "Chicago, IL" }.to_string()),
        description: Some(format!("Job description for {title} at {company}.")),
        remote: Some(remote),
        salary_min,
        salary_max: salary_min.map(|salary| salary + 50000),
        ..test_job(hash, title, company)
    }
}

// ============================================================================
// Scheduler Lifecycle Tests
// ============================================================================

#[tokio::test]
async fn test_scheduler_creation() {
    let config = Arc::new(create_test_config());
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Scheduler should be created successfully
    assert!(scheduler.shutdown().is_ok());
    let schedule_config = ScheduleConfig::from(config.as_ref());
    assert_eq!(schedule_config.interval_hours, 2);
}

#[tokio::test]
async fn test_scheduler_graceful_shutdown() {
    let config = Arc::new(create_test_config());
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Start scheduler in background
    let scheduler_clone = Arc::new(scheduler);
    let scheduler_handle = scheduler_clone.clone();

    let handle = tokio::spawn(async move { scheduler_handle.start().await });

    // Give it time to start
    tokio::time::sleep(Duration::from_millis(100)).await;

    // Send shutdown signal
    scheduler_clone.shutdown().unwrap();

    // Wait for scheduler to stop (with timeout)
    let result = tokio::time::timeout(Duration::from_secs(5), handle).await;
    assert!(
        result.is_ok(),
        "Scheduler should shut down gracefully within 5 seconds"
    );
}

// ============================================================================
// Scraping Cycle Tests
// ============================================================================

#[tokio::test]
async fn test_empty_config_scraping_cycle() {
    let config = Arc::new(create_test_config());
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Run scraping cycle with empty scraper URLs
    let result = scheduler.run_scraping_cycle().await;

    assert!(result.is_ok(), "Pipeline should complete without errors");
    let scraping_result = result.unwrap();

    // With no configured scrapers, should find 0 jobs
    assert_eq!(scraping_result.jobs_found, 0);
    assert_eq!(scraping_result.jobs_new, 0);
    assert_eq!(scraping_result.jobs_updated, 0);
}

#[tokio::test]
async fn test_scraping_result_fields() {
    let config = Arc::new(create_test_config());
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));
    let result = scheduler.run_scraping_cycle().await.unwrap();

    assert_eq!(result.jobs_found, 0);
    assert_eq!(result.jobs_new, 0);
    assert_eq!(result.jobs_updated, 0);
    assert_eq!(result.alerts_sent, 0);
    assert!(result.errors.is_empty());
    assert!(result.high_matches <= result.jobs_found);
}

#[path = "scheduler_integration_test/scoring_tests.rs"]
mod scoring_tests;

#[path = "scheduler_integration_test/persistence_tests.rs"]
mod persistence_tests;

// ============================================================================
// Schedule Configuration Tests
// ============================================================================

#[tokio::test]
async fn test_schedule_config_from_config() {
    let mut config = create_test_config();
    config.scraping_interval_hours = 4;
    config.auto_refresh.enabled = true;

    let schedule_config = ScheduleConfig::from(&config);

    assert_eq!(schedule_config.interval_hours, 4);
    assert!(schedule_config.enabled);
}

#[tokio::test]
async fn test_schedule_config_disabled() {
    let mut config = create_test_config();
    config.auto_refresh.enabled = false;

    let schedule_config = ScheduleConfig::from(&config);

    assert!(!schedule_config.enabled);
}

// ============================================================================
// Integration: Full Pipeline
// ============================================================================

#[tokio::test]
async fn test_full_pipeline_empty_run() {
    // This tests the complete pipeline with no configured scrapers
    let config = Arc::new(create_test_config());
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Run full cycle
    let result = scheduler.run_scraping_cycle().await.unwrap();

    // Verify result structure
    assert_eq!(result.jobs_found, 0);
    assert_eq!(result.jobs_new, 0);
    assert_eq!(result.jobs_updated, 0);
    assert_eq!(result.high_matches, 0);
    assert_eq!(result.alerts_sent, 0);

    // Database should be empty
    let stats = database.get_statistics().await.unwrap();
    assert_eq!(stats.total_jobs, 0);
}

#[tokio::test]
async fn test_database_search_after_upsert() {
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();

    // Insert jobs
    // Note: Using unique company names that don't contain search terms
    let jobs = vec![
        create_test_job(
            "search_001",
            "Care Coordinator",
            "WellBridge",
            true,
            Some(65000),
        ),
        create_test_job(
            "search_002",
            "Customer Support Lead",
            "SupportWorks",
            true,
            Some(52000),
        ),
        create_test_job(
            "search_003",
            "Patient Care Specialist",
            "HealthBridge",
            true,
            Some(55000),
        ),
    ];

    for job in &jobs {
        db.upsert_job(job).await.unwrap();
    }

    // Search for care jobs (should match title containing "Care")
    let results = db.search_jobs("Care", 10).await.unwrap();

    // Should find exactly 2 care jobs by title
    assert_eq!(results.len(), 2, "Should find exactly 2 care jobs");

    let titles: Vec<_> = results.iter().map(|j| j.title.as_str()).collect();
    assert!(titles.contains(&"Care Coordinator"));
    assert!(titles.contains(&"Patient Care Specialist"));
    assert!(!titles.contains(&"Customer Support Lead"));
}

#[tokio::test]
async fn test_job_ordering_by_score() {
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();

    // Insert jobs with different scores
    let mut job1 = create_test_job("order_001", "Job A", "Company", true, None);
    job1.score = Some(0.9);

    let mut job2 = create_test_job("order_002", "Job B", "Company", true, None);
    job2.score = Some(0.5);

    let mut job3 = create_test_job("order_003", "Job C", "Company", true, None);
    job3.score = Some(0.7);

    db.upsert_job(&job1).await.unwrap();
    db.upsert_job(&job2).await.unwrap();
    db.upsert_job(&job3).await.unwrap();

    // Get jobs ordered by score
    let jobs = db.get_recent_jobs(10).await.unwrap();

    // Should be ordered by score descending
    let scores: Vec<f64> = jobs.iter().filter_map(|j| j.score).collect();
    let mut sorted_scores = scores.clone();
    sorted_scores.sort_by(|a, b| b.partial_cmp(a).unwrap());

    assert_eq!(
        scores, sorted_scores,
        "Jobs should be ordered by score descending"
    );
}
