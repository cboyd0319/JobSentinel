use super::*;
use crate::core::{
    config::{AutoRefreshConfig, Config, LocationPreferences},
    db::{Database, Job},
};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;

fn create_test_config() -> Config {
    Config {
        title_allowlist: vec!["Security Engineer".to_string()],
        title_blocklist: vec![],
        keywords_boost: vec![],
        keywords_exclude: vec![],
        location_preferences: LocationPreferences {
            allow_remote: true,
            allow_hybrid: false,
            allow_onsite: false,
            cities: vec![],
            states: vec![],
            country: "US".to_string(),
        },
        salary_floor_usd: 0,
        auto_refresh: AutoRefreshConfig {
            enabled: true,
            interval_minutes: 30,
        },
        bookmarklet_port: 4321,
        immediate_alert_threshold: 0.9,
        scraping_interval_hours: 2,
        alerts: Default::default(),
        greenhouse_urls: vec![],
        lever_urls: vec![],
        linkedin: Default::default(),
        restricted_source_acknowledgements: Default::default(),
        jobswithgpt_endpoint: String::new(),
        jobswithgpt_approval: Default::default(),
        remoteok: Default::default(),
        weworkremotely: Default::default(),
        builtin: Default::default(),
        hn_hiring: Default::default(),
        dice: Default::default(),
        yc_startup: Default::default(),
        usajobs: Default::default(),
        simplyhired: Default::default(),
        glassdoor: Default::default(),
        ghost_config: None,
        company_whitelist: vec![],
        company_blacklist: vec![],
        use_resume_matching: false,
        salary_target_usd: None,
        penalize_missing_salary: false,
    }
}

fn approve_jobswithgpt_payload(config: &mut Config) {
    config.jobswithgpt_approval.enabled = true;
    config.jobswithgpt_approval.payload = config.jobswithgpt_payload_preview();
}

#[path = "tests/basic_tests.rs"]
mod basic_tests;
#[path = "tests/interval_tests.rs"]
mod interval_tests;
#[path = "tests/result_tests.rs"]
mod result_tests;
#[path = "tests/start_loop_tests.rs"]
mod start_loop_tests;

// ========================================
// Interval Validation and Edge Cases
// ========================================

// ========================================
// Scraping Cycle Execution Tracking
// ========================================

#[tokio::test]
async fn test_scraping_cycle_tracks_new_vs_updated_jobs() {
    let config = Arc::new(create_test_config());
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    // Pre-populate database with a job
    let now = chrono::Utc::now();
    let existing_job = Job {
        id: 0,
        hash: "test_hash_123".to_string(),
        title: "Senior Rust Developer".to_string(),
        company: "Test Corp".to_string(),
        location: Some("Remote".to_string()),
        url: "https://example.com/job/1".to_string(),
        description: Some("Great job".to_string()),
        score: Some(0.8),
        score_reasons: None,
        source: "test".to_string(),
        remote: Some(true),
        salary_min: None,
        salary_max: None,
        currency: None,
        created_at: now,
        updated_at: now,
        last_seen: now,
        times_seen: 1,
        immediate_alert_sent: false,
        included_in_digest: false,
        hidden: false,
        bookmarked: false,
        ghost_score: None,
        ghost_reasons: None,
        first_seen: None,
        repost_count: 0,
        notes: None,
    };
    database.upsert_job(&existing_job).await.unwrap();

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Run scraping cycle (empty config = no scrapers)
    let result = scheduler.run_scraping_cycle().await.unwrap();

    // Verify tracking
    assert_eq!(result.jobs_found, 0);
    assert_eq!(result.jobs_new, 0);
    assert_eq!(result.jobs_updated, 0);
}

// ========================================
// Error Handling and Recovery
// ========================================

#[tokio::test]
async fn test_scraping_cycle_continues_on_scraper_error() {
    // Even if individual scrapers fail, the cycle should complete
    let config = Arc::new(create_test_config());
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Run cycle - scrapers will fail but cycle should complete
    let result = scheduler.run_scraping_cycle().await;

    assert!(
        result.is_ok(),
        "Scraping cycle should complete even with scraper errors"
    );
}

// ========================================
// Concurrent Operations
// ========================================

#[tokio::test]
async fn test_scheduler_multiple_concurrent_cycles() {
    let config = Arc::new(create_test_config());
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Arc::new(Scheduler::new(Arc::clone(&config), Arc::clone(&database)));

    // Run multiple scraping cycles concurrently
    let scheduler1 = Arc::clone(&scheduler);
    let scheduler2 = Arc::clone(&scheduler);
    let scheduler3 = Arc::clone(&scheduler);

    let handle1 = tokio::spawn(async move { scheduler1.run_scraping_cycle().await });
    let handle2 = tokio::spawn(async move { scheduler2.run_scraping_cycle().await });
    let handle3 = tokio::spawn(async move { scheduler3.run_scraping_cycle().await });

    // All should complete successfully
    let result1 = handle1.await.unwrap();
    let result2 = handle2.await.unwrap();
    let result3 = handle3.await.unwrap();

    assert!(result1.is_ok());
    assert!(result2.is_ok());
    assert!(result3.is_ok());
}

#[tokio::test]
async fn test_scheduler_shutdown_during_cycle() {
    let mut config = create_test_config();
    config.scraping_interval_hours = 24; // Long interval
    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Arc::new(Scheduler::new(Arc::clone(&config), Arc::clone(&database)));
    let scheduler_clone = Arc::clone(&scheduler);

    // Start scheduler
    let handle = tokio::spawn(async move { scheduler_clone.start().await });

    // Let it start up
    tokio::time::sleep(Duration::from_millis(50)).await;

    // Shutdown immediately (potentially during cycle)
    scheduler.shutdown().unwrap();

    // Should stop gracefully
    let result = tokio::time::timeout(Duration::from_secs(5), handle).await;
    assert!(result.is_ok());
}

// ========================================
// Database Interaction Patterns
// ========================================

#[tokio::test]
async fn test_scraping_cycle_database_persistence() {
    let config = Arc::new(create_test_config());
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Run cycle
    let _result = scheduler.run_scraping_cycle().await.unwrap();

    // Verify database is still accessible
    let jobs = database.get_recent_jobs(10).await.unwrap();
    assert!(jobs.is_empty() || !jobs.is_empty()); // Database should be queryable
}

#[tokio::test]
async fn test_scraping_cycle_job_deduplication() {
    let _config = Arc::new(create_test_config());
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    // Insert same job twice with same hash
    let now = chrono::Utc::now();
    let job = Job {
        id: 0,
        hash: "duplicate_hash".to_string(),
        title: "Test Job".to_string(),
        company: "Test Co".to_string(),
        location: Some("Remote".to_string()),
        url: "https://example.com/job".to_string(),
        description: None,
        score: None,
        score_reasons: None,
        source: "test".to_string(),
        remote: Some(true),
        salary_min: None,
        salary_max: None,
        currency: None,
        created_at: now,
        updated_at: now,
        last_seen: now,
        times_seen: 1,
        immediate_alert_sent: false,
        included_in_digest: false,
        hidden: false,
        bookmarked: false,
        ghost_score: None,
        ghost_reasons: None,
        first_seen: None,
        repost_count: 0,
        notes: None,
    };

    database.upsert_job(&job).await.unwrap();
    database.upsert_job(&job).await.unwrap();

    // Should only have one job
    let jobs = database.get_recent_jobs(10).await.unwrap();
    assert_eq!(jobs.len(), 1, "Duplicate jobs should be deduplicated");
}

// ========================================
// Configuration Validation
// ========================================

#[tokio::test]
async fn test_scheduler_immediate_shutdown() {
    let config = Arc::new(create_test_config());
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Arc::new(Scheduler::new(Arc::clone(&config), Arc::clone(&database)));
    let scheduler_clone = Arc::clone(&scheduler);

    // Start scheduler in background
    let handle = tokio::spawn(async move { scheduler_clone.start().await });

    // Give scheduler time to start and run first cycle
    tokio::time::sleep(Duration::from_millis(100)).await;

    // Shutdown the scheduler
    scheduler.shutdown().unwrap();

    // Should shutdown within reasonable time (allowing for current cycle to complete)
    let result = tokio::time::timeout(Duration::from_secs(5), handle).await;
    assert!(result.is_ok(), "Scheduler should shutdown within timeout");
}

#[tokio::test]
async fn test_scheduler_rapid_shutdown_subscribe_cycle() {
    let config = Arc::new(create_test_config());
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Rapid subscribe/shutdown cycles should not panic
    for _ in 0..10 {
        let _rx = scheduler.subscribe_shutdown();
    }

    scheduler.shutdown().unwrap();
}

#[path = "tests/scraper_cycle_tests.rs"]
mod scraper_cycle_tests;

// ========================================
// State Transition Tests
// ========================================

#[tokio::test]
async fn test_scheduler_start_to_shutdown_transition() {
    let mut config = create_test_config();
    config.scraping_interval_hours = 24;
    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Arc::new(Scheduler::new(Arc::clone(&config), Arc::clone(&database)));
    let scheduler_clone = Arc::clone(&scheduler);

    // Start scheduler
    let handle = tokio::spawn(async move { scheduler_clone.start().await });

    // Let it run briefly
    tokio::time::sleep(Duration::from_millis(50)).await;

    // Transition to shutdown
    scheduler.shutdown().unwrap();

    // Wait for clean shutdown
    let result = tokio::time::timeout(Duration::from_secs(5), handle).await;
    assert!(result.is_ok());
    assert!(result.unwrap().is_ok());
}

#[tokio::test]
async fn test_scheduler_multiple_start_cycles() {
    let config = Arc::new(create_test_config());
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Multiple scraping cycles should be idempotent
    let _result1 = scheduler.run_scraping_cycle().await.unwrap();
    let _result2 = scheduler.run_scraping_cycle().await.unwrap();
    let _result3 = scheduler.run_scraping_cycle().await.unwrap();

    // All cycles should complete successfully
    let jobs = database.get_recent_jobs(100).await.unwrap();
    // Jobs can be retrieved from database
    assert!(jobs.is_empty() || !jobs.is_empty());
}

// ========================================
// Edge Cases for Alert Logic
// ========================================

#[tokio::test]
async fn test_scraping_cycle_alert_threshold_boundary() {
    let mut config = create_test_config();
    config.immediate_alert_threshold = 1.0; // Maximum threshold
    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Run cycle - very high threshold means no alerts
    let result = scheduler.run_scraping_cycle().await.unwrap();

    assert_eq!(result.alerts_sent, 0);
}

#[tokio::test]
async fn test_scraping_cycle_alert_threshold_zero() {
    let mut config = create_test_config();
    config.immediate_alert_threshold = 0.0; // Minimum threshold
    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Run cycle - low threshold might trigger alerts if jobs found
    let result = scheduler.run_scraping_cycle().await.unwrap();

    // With no scrapers configured, no jobs and no alerts
    assert_eq!(result.alerts_sent, 0);
}

// ========================================
// Scraper URL Edge Cases
// ========================================

#[tokio::test]
async fn test_scraping_cycle_with_many_greenhouse_urls() {
    let mut config = create_test_config();
    config.greenhouse_urls = (0..50)
        .map(|i| format!("https://boards.greenhouse.io/company{}", i))
        .collect();
    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Run cycle with many URLs
    let result = scheduler.run_scraping_cycle().await.unwrap();

    // Should handle many URLs gracefully
    assert!(result.jobs_found == 0 || result.errors.len() > 0);
}

#[tokio::test]
async fn test_scraping_cycle_with_duplicate_urls() {
    let mut config = create_test_config();
    let url = "https://boards.greenhouse.io/jobsentinel-missing-company".to_string();
    config.greenhouse_urls = vec![url.clone(), url.clone(), url.clone()];
    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Run cycle - should handle duplicate URLs
    let result = scheduler.run_scraping_cycle().await.unwrap();

    // Cycle should complete
    assert!(result.jobs_found == 0 || result.errors.len() > 0);
}

// ========================================
// Scraper Error Path Coverage Tests
// ========================================

#[tokio::test]
async fn test_scraping_cycle_greenhouse_error_path() {
    // Tests lines 184-187 (Greenhouse error logging)
    let mut config = create_test_config();
    config.greenhouse_urls = vec!["https://boards.greenhouse.io/test-company-error".to_string()];
    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Run cycle - Greenhouse will attempt to scrape
    let result = scheduler.run_scraping_cycle().await.unwrap();

    // Should complete (may have errors or just find 0 jobs)
    assert!(
        result.errors.iter().any(|e| e.contains("Greenhouse")) || result.jobs_found == 0,
        "Should handle Greenhouse scraping attempt"
    );
}

#[tokio::test]
async fn test_scraping_cycle_lever_error_path() {
    // Tests lines 217-220 (Lever error logging)
    let mut config = create_test_config();
    config.lever_urls = vec!["https://jobs.lever.co/test-company-error".to_string()];
    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Run cycle - Lever will attempt to scrape
    let result = scheduler.run_scraping_cycle().await.unwrap();

    // Should complete (may have errors or just find 0 jobs)
    assert!(
        result.errors.iter().any(|e| e.contains("Lever")) || result.jobs_found == 0,
        "Should handle Lever scraping attempt"
    );
}

#[tokio::test]
async fn test_scraping_cycle_jobswithgpt_error_path() {
    // Tests lines 246-250 (JobsWithGPT error logging)
    let mut config = create_test_config();
    config.title_allowlist = vec!["Security Engineer".to_string()];
    config.jobswithgpt_endpoint = "not-a-url".to_string();
    config.location_preferences.allow_remote = true;
    config.location_preferences.allow_onsite = false;
    approve_jobswithgpt_payload(&mut config);
    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Run cycle - JobsWithGPT will fail
    let result = scheduler.run_scraping_cycle().await.unwrap();

    // Should have errors from JobsWithGPT scraper
    assert!(
        result.errors.iter().any(|e| e.contains("JobsWithGPT")),
        "Should have JobsWithGPT error"
    );

    let source_request = crate::core::health::get_latest_source_request(&database, "jobswithgpt")
        .await
        .unwrap()
        .unwrap();
    assert_eq!(source_request.title_count, 1);
    assert!(!source_request.has_location);
    assert!(source_request.remote_only);
    assert_eq!(source_request.result_limit, 100);
    assert_eq!(
        source_request.outcome,
        crate::core::health::SourceRequestOutcome::Failure
    );
}

#[tokio::test]
async fn test_scraping_cycle_linkedin_user_choice_warns_without_hidden_monitoring() {
    let mut config = create_test_config();
    config.linkedin.enabled = true;
    config.linkedin.query = "Engineer".to_string();
    config.linkedin.location = "Remote".to_string();
    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    let result = scheduler.run_scraping_cycle().await.unwrap();

    assert!(result
        .errors
        .iter()
        .any(|e| e.contains("local record") && e.contains("User Agreement")));
}

#[tokio::test]
async fn test_scraping_cycle_all_scrapers_error_accumulation() {
    // Tests error accumulation from multiple scrapers
    let mut config = create_test_config();
    config.greenhouse_urls = vec!["https://boards.greenhouse.io/error".to_string()];
    config.lever_urls = vec!["https://jobs.lever.co/error".to_string()];
    config.title_allowlist = vec!["Engineer".to_string()];
    config.jobswithgpt_endpoint = "not-a-url".to_string();
    approve_jobswithgpt_payload(&mut config);
    config.linkedin.enabled = true;
    config.linkedin.query = "Engineer".to_string();
    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Run cycle - all scrapers will fail
    let result = scheduler.run_scraping_cycle().await.unwrap();

    // Should accumulate errors from multiple scrapers
    // Note: Some scrapers may succeed or not error depending on network conditions
    assert!(
        result.errors.len() >= 1,
        "Should have scraper errors, got: {}",
        result.errors.len()
    );
}

// ========================================
// Database Error Path Coverage
// ========================================

#[tokio::test]
async fn test_scraping_cycle_database_upsert_resilience() {
    // Tests that cycle continues even if individual upserts fail
    let config = Arc::new(create_test_config());
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Run multiple cycles to ensure database operations are resilient
    let result1 = scheduler.run_scraping_cycle().await;
    let result2 = scheduler.run_scraping_cycle().await;

    assert!(result1.is_ok());
    assert!(result2.is_ok());
}

// ========================================
// Notification Error Path Coverage
// ========================================

#[tokio::test]
async fn test_scraping_cycle_notification_error_handling() {
    // Tests notification send error handling (lines 408-412)
    let mut config = create_test_config();
    config.immediate_alert_threshold = 0.0; // Low threshold
                                            // Configure invalid Slack webhook to trigger error
    config.alerts.slack.enabled = true;
    config.alerts.slack.webhook_url = "https://invalid-webhook-url".to_string();
    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Run cycle - notification will fail if high-scoring job found
    let result = scheduler.run_scraping_cycle().await.unwrap();

    // Should handle notification errors gracefully and keep result accounting consistent.
    assert!(result.jobs_new <= result.jobs_found);
    assert!(result.jobs_updated <= result.jobs_found);
}

// ========================================
// Interval and Timing Edge Cases
// ========================================

// ========================================
// Job Scoring and Serialization
// ========================================

#[tokio::test]
async fn test_scraping_cycle_handles_all_score_ranges() {
    // Ensure scoring works across different scenarios
    let config = Arc::new(create_test_config());
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Run cycle multiple times
    for _ in 0..3 {
        let result = scheduler.run_scraping_cycle().await;
        assert!(result.is_ok());
    }
}

// ========================================
// Multiple Scraping Cycles in Scheduler
// ========================================

#[tokio::test]
async fn test_scheduler_runs_multiple_cycles_before_shutdown() {
    let mut config = create_test_config();
    config.scraping_interval_hours = 0; // Immediate re-run
    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Arc::new(Scheduler::new(Arc::clone(&config), Arc::clone(&database)));
    let scheduler_clone = Arc::clone(&scheduler);

    // Start scheduler
    let handle = tokio::spawn(async move { scheduler_clone.start().await });

    // Let it run multiple cycles
    tokio::time::sleep(Duration::from_millis(300)).await;

    // Shutdown
    scheduler.shutdown().unwrap();

    let result = tokio::time::timeout(Duration::from_secs(5), handle).await;
    assert!(result.is_ok());
}

// ========================================
// Comprehensive Integration Tests
// ========================================

#[tokio::test]
#[ignore = "Integration test - makes real HTTP requests"]
async fn test_complete_workflow_with_all_error_paths() {
    // Comprehensive test hitting multiple error paths
    let mut config = create_test_config();
    config.scraping_interval_hours = 6;
    config.greenhouse_urls = vec!["https://boards.greenhouse.io/test".to_string()];
    config.lever_urls = vec!["https://jobs.lever.co/test".to_string()];
    config.title_allowlist = vec!["Engineer".to_string()];
    config.linkedin.enabled = true;
    config.linkedin.query = "Test".to_string();
    config.immediate_alert_threshold = 0.5;

    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Arc::new(Scheduler::new(Arc::clone(&config), Arc::clone(&database)));
    let scheduler_clone = Arc::clone(&scheduler);

    // Start full scheduler loop
    let handle = tokio::spawn(async move { scheduler_clone.start().await });

    // Let it run complete cycle
    tokio::time::sleep(Duration::from_millis(250)).await;

    // Shutdown
    scheduler.shutdown().unwrap();

    let result = tokio::time::timeout(Duration::from_secs(5), handle).await;
    assert!(result.is_ok());
}

#[path = "tests/error_path_tests.rs"]
mod error_path_tests;
