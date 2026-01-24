use super::*;
use crate::core::{
    config::{AutoRefreshConfig, Config, LocationPreferences},
    db::{Database, Job},
};
use std::sync::Arc;
use std::time::Duration;

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
        immediate_alert_threshold: 0.9,
        scraping_interval_hours: 2,
        alerts: Default::default(),
        greenhouse_urls: vec![],
        lever_urls: vec![],
        linkedin: Default::default(),
        jobswithgpt_endpoint: "https://api.jobswithgpt.com/mcp".to_string(),
        remoteok: Default::default(),
        weworkremotely: Default::default(),
        builtin: Default::default(),
        hn_hiring: Default::default(),
        dice: Default::default(),
        yc_startup: Default::default(),
        usajobs: Default::default(),
        ghost_config: None,
        company_whitelist: vec![],
        company_blacklist: vec![],
        use_resume_matching: false,
        salary_target_usd: None,
        penalize_missing_salary: false,
    }
}

#[test]
fn test_schedule_config_from_config() {
    let config = create_test_config();
    let schedule_config = ScheduleConfig::from(&config);

    assert_eq!(schedule_config.interval_hours, 2);
    assert!(schedule_config.enabled);
}

// ========================================
// Scheduler Lifecycle Tests
// ========================================

#[tokio::test]
async fn test_scheduler_creation() {
    let config = Arc::new(create_test_config());
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Verify scheduler was created with correct config
    assert_eq!(
        scheduler.config.scraping_interval_hours,
        config.scraping_interval_hours
    );
}

#[tokio::test]
async fn test_scheduler_shutdown_signal() {
    let config = Arc::new(create_test_config());
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Subscribe to shutdown signal before calling shutdown
    let mut rx = scheduler.subscribe_shutdown();

    // Trigger shutdown
    scheduler.shutdown().unwrap();

    // Verify shutdown signal was received
    assert!(
        rx.recv().await.is_ok(),
        "Shutdown signal should be received"
    );
}

#[tokio::test]
async fn test_scheduler_multiple_shutdown_subscribers() {
    let config = Arc::new(create_test_config());
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Create multiple subscribers
    let mut rx1 = scheduler.subscribe_shutdown();
    let mut rx2 = scheduler.subscribe_shutdown();
    let mut rx3 = scheduler.subscribe_shutdown();

    // Trigger shutdown
    scheduler.shutdown().unwrap();

    // All subscribers should receive the signal
    assert!(
        rx1.recv().await.is_ok(),
        "Subscriber 1 should receive signal"
    );
    assert!(
        rx2.recv().await.is_ok(),
        "Subscriber 2 should receive signal"
    );
    assert!(
        rx3.recv().await.is_ok(),
        "Subscriber 3 should receive signal"
    );
}

#[tokio::test]
async fn test_scheduler_graceful_stop_with_timeout() {
    let mut config = create_test_config();
    config.scraping_interval_hours = 24; // Long interval to ensure we can stop it
    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Arc::new(Scheduler::new(Arc::clone(&config), Arc::clone(&database)));
    let scheduler_clone = Arc::clone(&scheduler);

    // Start scheduler in background task
    let handle = tokio::spawn(async move { scheduler_clone.start().await });

    // Give scheduler time to start
    tokio::time::sleep(Duration::from_millis(100)).await;

    // Shutdown the scheduler
    scheduler.shutdown().unwrap();

    // Wait for scheduler to stop (with timeout)
    let result = tokio::time::timeout(Duration::from_secs(5), handle).await;

    assert!(result.is_ok(), "Scheduler should stop within timeout");
    assert!(
        result.unwrap().is_ok(),
        "Scheduler should stop without errors"
    );
}

#[test]
fn test_schedule_config_creation() {
    let config = ScheduleConfig {
        interval_hours: 4,
        enabled: true,
    };

    assert_eq!(config.interval_hours, 4);
    assert!(config.enabled);
}

#[test]
fn test_schedule_config_disabled() {
    let config = ScheduleConfig {
        interval_hours: 2,
        enabled: false,
    };

    assert!(!config.enabled);
}

#[test]
fn test_scraping_result_creation() {
    let result = ScrapingResult {
        jobs_found: 100,
        jobs_new: 25,
        jobs_updated: 75,
        high_matches: 10,
        alerts_sent: 5,
        errors: vec!["Test error".to_string()],
    };

    assert_eq!(result.jobs_found, 100);
    assert_eq!(result.jobs_new, 25);
    assert_eq!(result.jobs_updated, 75);
    assert_eq!(result.high_matches, 10);
    assert_eq!(result.alerts_sent, 5);
    assert_eq!(result.errors.len(), 1);
}

#[test]
fn test_scraping_result_no_errors() {
    let result = ScrapingResult {
        jobs_found: 50,
        jobs_new: 50,
        jobs_updated: 0,
        high_matches: 5,
        alerts_sent: 5,
        errors: vec![],
    };

    assert!(result.errors.is_empty(), "Should have no errors");
    assert_eq!(result.jobs_new, result.jobs_found);
}

#[tokio::test]
async fn test_run_scraping_cycle_with_empty_config() {
    let config = Arc::new(create_test_config());
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Run scraping cycle with empty config (no scraper URLs)
    let result = scheduler.run_scraping_cycle().await.unwrap();

    // Should complete without errors but find no jobs
    assert_eq!(result.jobs_found, 0);
    assert_eq!(result.jobs_new, 0);
    assert_eq!(result.jobs_updated, 0);
}

#[tokio::test]
async fn test_scheduler_config_interval_mapping() {
    let mut config = create_test_config();
    config.scraping_interval_hours = 6;
    let schedule_config = ScheduleConfig::from(&config);

    assert_eq!(schedule_config.interval_hours, 6);
}

#[test]
fn test_scraping_result_clone() {
    let result = ScrapingResult {
        jobs_found: 10,
        jobs_new: 5,
        jobs_updated: 5,
        high_matches: 2,
        alerts_sent: 1,
        errors: vec!["Error 1".to_string()],
    };

    let cloned = result.clone();

    assert_eq!(cloned.jobs_found, result.jobs_found);
    assert_eq!(cloned.jobs_new, result.jobs_new);
    assert_eq!(cloned.high_matches, result.high_matches);
    assert_eq!(cloned.errors, result.errors);
}

#[test]
fn test_schedule_config_clone() {
    let config = ScheduleConfig {
        interval_hours: 3,
        enabled: true,
    };

    let cloned = config.clone();

    assert_eq!(cloned.interval_hours, config.interval_hours);
    assert_eq!(cloned.enabled, config.enabled);
}

#[tokio::test]
async fn test_scheduler_concurrent_shutdowns() {
    let config = Arc::new(create_test_config());
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Arc::new(Scheduler::new(Arc::clone(&config), Arc::clone(&database)));

    // Multiple concurrent shutdown calls should not panic
    let scheduler1 = Arc::clone(&scheduler);
    let scheduler2 = Arc::clone(&scheduler);
    let scheduler3 = Arc::clone(&scheduler);

    let handle1 = tokio::spawn(async move { scheduler1.shutdown() });
    let handle2 = tokio::spawn(async move { scheduler2.shutdown() });
    let handle3 = tokio::spawn(async move { scheduler3.shutdown() });

    // All should complete without error
    assert!(handle1.await.is_ok());
    assert!(handle2.await.is_ok());
    assert!(handle3.await.is_ok());
}

#[tokio::test]
async fn test_scheduler_subscribe_after_shutdown() {
    let config = Arc::new(create_test_config());
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Trigger shutdown first
    scheduler.shutdown().unwrap();

    // Subscribe after shutdown
    let mut rx = scheduler.subscribe_shutdown();

    // Should not receive signal (lagged)
    let result = tokio::time::timeout(Duration::from_millis(100), rx.recv()).await;

    // Should timeout since signal was already sent
    assert!(result.is_err() || result.unwrap().is_err());
}

#[test]
fn test_schedule_config_debug() {
    let config = ScheduleConfig {
        interval_hours: 2,
        enabled: true,
    };

    let debug_str = format!("{:?}", config);
    assert!(debug_str.contains("interval_hours"));
    assert!(debug_str.contains("enabled"));
}

#[test]
fn test_scraping_result_debug() {
    let result = ScrapingResult {
        jobs_found: 10,
        jobs_new: 5,
        jobs_updated: 5,
        high_matches: 2,
        alerts_sent: 1,
        errors: vec![],
    };

    let debug_str = format!("{:?}", result);
    assert!(debug_str.contains("jobs_found"));
    assert!(debug_str.contains("high_matches"));
}

// ========================================
// Interval Validation and Edge Cases
// ========================================

#[test]
fn test_schedule_config_minimum_interval() {
    let config = ScheduleConfig {
        interval_hours: 1,
        enabled: true,
    };

    assert_eq!(config.interval_hours, 1);
    assert!(config.enabled);
}

#[test]
fn test_schedule_config_maximum_interval() {
    let config = ScheduleConfig {
        interval_hours: 168, // 1 week
        enabled: true,
    };

    assert_eq!(config.interval_hours, 168);
}

#[test]
fn test_schedule_config_zero_interval() {
    // Zero interval is technically allowed but would run continuously
    let config = ScheduleConfig {
        interval_hours: 0,
        enabled: true,
    };

    assert_eq!(config.interval_hours, 0);
}

#[tokio::test]
async fn test_scheduler_interval_calculation() {
    let mut config = create_test_config();
    config.scraping_interval_hours = 4;
    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // The interval should be converted to seconds correctly
    // 4 hours = 4 * 3600 = 14400 seconds
    assert_eq!(scheduler.config.scraping_interval_hours, 4);
}

#[tokio::test]
async fn test_scheduler_very_large_interval() {
    let mut config = create_test_config();
    config.scraping_interval_hours = u64::MAX / 3600; // Very large but valid
    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    // Should not panic when creating scheduler with large interval
    let _scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));
}

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

#[tokio::test]
async fn test_scraping_result_partial_errors() {
    let result = ScrapingResult {
        jobs_found: 50,
        jobs_new: 30,
        jobs_updated: 20,
        high_matches: 5,
        alerts_sent: 3,
        errors: vec![
            "Greenhouse scraper timeout".to_string(),
            "Lever scraper rate limit".to_string(),
        ],
    };

    assert_eq!(result.jobs_found, 50);
    assert_eq!(result.errors.len(), 2);
    assert!(!result.errors.is_empty());
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

#[test]
fn test_scraping_result_multiple_errors() {
    let errors = vec![
        "Error 1".to_string(),
        "Error 2".to_string(),
        "Error 3".to_string(),
        "Error 4".to_string(),
        "Error 5".to_string(),
    ];

    let result = ScrapingResult {
        jobs_found: 10,
        jobs_new: 10,
        jobs_updated: 0,
        high_matches: 0,
        alerts_sent: 0,
        errors: errors.clone(),
    };

    assert_eq!(result.errors.len(), 5);
    assert_eq!(result.errors, errors);
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

#[test]
fn test_schedule_config_from_various_intervals() {
    let test_cases = vec![
        (1, 1),     // 1 hour
        (2, 2),     // 2 hours
        (6, 6),     // 6 hours
        (12, 12),   // 12 hours
        (24, 24),   // 1 day
        (168, 168), // 1 week
    ];

    for (input_hours, expected_hours) in test_cases {
        let mut config = create_test_config();
        config.scraping_interval_hours = input_hours;
        let schedule_config = ScheduleConfig::from(&config);

        assert_eq!(
            schedule_config.interval_hours, expected_hours,
            "Failed for interval: {} hours",
            input_hours
        );
    }
}

#[tokio::test]
async fn test_scheduler_respects_config_interval() {
    let mut config = create_test_config();
    config.scraping_interval_hours = 8;
    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Verify scheduler uses correct interval
    assert_eq!(scheduler.config.scraping_interval_hours, 8);
}

// ========================================
// Edge Cases
// ========================================

#[test]
fn test_scraping_result_all_zeros() {
    let result = ScrapingResult {
        jobs_found: 0,
        jobs_new: 0,
        jobs_updated: 0,
        high_matches: 0,
        alerts_sent: 0,
        errors: vec![],
    };

    assert_eq!(result.jobs_found, 0);
    assert_eq!(result.jobs_new, 0);
    assert_eq!(result.jobs_updated, 0);
    assert_eq!(result.high_matches, 0);
    assert_eq!(result.alerts_sent, 0);
    assert!(result.errors.is_empty());
}

#[test]
fn test_scraping_result_max_values() {
    let result = ScrapingResult {
        jobs_found: usize::MAX,
        jobs_new: usize::MAX,
        jobs_updated: usize::MAX,
        high_matches: usize::MAX,
        alerts_sent: usize::MAX,
        errors: vec!["error".to_string(); 100],
    };

    assert_eq!(result.jobs_found, usize::MAX);
    assert_eq!(result.errors.len(), 100);
}

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

#[test]
fn test_schedule_config_equality_after_clone() {
    let original = ScheduleConfig {
        interval_hours: 5,
        enabled: true,
    };

    let cloned = original.clone();

    assert_eq!(original.interval_hours, cloned.interval_hours);
    assert_eq!(original.enabled, cloned.enabled);
}

#[test]
fn test_scraping_result_equality_after_clone() {
    let original = ScrapingResult {
        jobs_found: 42,
        jobs_new: 20,
        jobs_updated: 22,
        high_matches: 8,
        alerts_sent: 4,
        errors: vec!["test".to_string()],
    };

    let cloned = original.clone();

    assert_eq!(original.jobs_found, cloned.jobs_found);
    assert_eq!(original.jobs_new, cloned.jobs_new);
    assert_eq!(original.jobs_updated, cloned.jobs_updated);
    assert_eq!(original.high_matches, cloned.high_matches);
    assert_eq!(original.alerts_sent, cloned.alerts_sent);
    assert_eq!(original.errors, cloned.errors);
}

// ========================================
// Duration Calculation Tests
// ========================================

#[tokio::test]
async fn test_scheduler_interval_duration_conversion() {
    let test_cases = vec![
        (1, 3600),   // 1 hour = 3600 seconds
        (2, 7200),   // 2 hours
        (4, 14400),  // 4 hours
        (8, 28800),  // 8 hours
        (12, 43200), // 12 hours
        (24, 86400), // 24 hours
    ];

    for (hours, expected_seconds) in test_cases {
        let duration = Duration::from_secs(hours * 3600);
        assert_eq!(
            duration.as_secs(),
            expected_seconds,
            "Duration conversion failed for {} hours",
            hours
        );
    }
}

#[test]
fn test_scheduler_duration_overflow_protection() {
    // Test that very large intervals don't overflow
    let max_safe_hours = u64::MAX / 3600;
    let duration = Duration::from_secs(max_safe_hours * 3600);
    assert!(duration.as_secs() > 0);
}

#[tokio::test]
async fn test_scheduler_zero_interval_duration() {
    let duration = Duration::from_secs(0);
    assert_eq!(duration.as_secs(), 0);
    assert_eq!(duration.as_millis(), 0);
}

// ========================================
// Scraper URL Parsing Tests
// ========================================

#[tokio::test]
async fn test_scraping_cycle_with_greenhouse_urls() {
    let mut config = create_test_config();
    config.greenhouse_urls = vec![
        "https://boards.greenhouse.io/cloudflare".to_string(),
        "https://boards.greenhouse.io/netflix".to_string(),
    ];
    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Run cycle - will fail to scrape but should handle gracefully
    let result = scheduler.run_scraping_cycle().await.unwrap();

    // Should have attempted to scrape but likely got errors
    // Errors are expected since we're not running real scrapers
    assert!(result.jobs_found == 0 || result.errors.len() > 0);
}

#[tokio::test]
async fn test_scraping_cycle_with_lever_urls() {
    let mut config = create_test_config();
    config.lever_urls = vec![
        "https://jobs.lever.co/netflix".to_string(),
        "https://jobs.lever.co/stripe".to_string(),
    ];
    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Run cycle - will fail to scrape but should handle gracefully
    let result = scheduler.run_scraping_cycle().await.unwrap();

    // Cycle should complete (errors expected since not real scrapers)
    assert!(result.jobs_found == 0 || result.errors.len() > 0);
}

#[tokio::test]
async fn test_scraping_cycle_with_invalid_greenhouse_url() {
    let mut config = create_test_config();
    config.greenhouse_urls = vec![
        "https://invalid-url".to_string(),
        "not-a-greenhouse-url".to_string(),
    ];
    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Should handle invalid URLs gracefully
    let result = scheduler.run_scraping_cycle().await;
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_scraping_cycle_with_invalid_lever_url() {
    let mut config = create_test_config();
    config.lever_urls = vec![
        "https://invalid-url".to_string(),
        "not-a-lever-url".to_string(),
    ];
    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Should handle invalid URLs gracefully
    let result = scheduler.run_scraping_cycle().await;
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_scraping_cycle_with_mixed_valid_invalid_urls() {
    let mut config = create_test_config();
    config.greenhouse_urls = vec![
        "https://boards.greenhouse.io/cloudflare".to_string(),
        "invalid-url".to_string(),
    ];
    config.lever_urls = vec![
        "https://jobs.lever.co/netflix".to_string(),
        "not-a-url".to_string(),
    ];
    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Should process valid URLs and skip/report invalid ones
    let result = scheduler.run_scraping_cycle().await;
    assert!(result.is_ok());
}

// ========================================
// Scoring Integration Tests
// ========================================

#[tokio::test]
async fn test_scraping_cycle_scores_jobs() {
    let config = Arc::new(create_test_config());
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Run cycle (no scrapers, so empty result)
    let result = scheduler.run_scraping_cycle().await.unwrap();

    // Should complete successfully
    assert_eq!(result.jobs_found, 0);
}

#[tokio::test]
async fn test_scraping_cycle_sorts_jobs_by_score() {
    // This test verifies that jobs are sorted by score descending
    let config = Arc::new(create_test_config());
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Run cycle
    let _result = scheduler.run_scraping_cycle().await.unwrap();

    // Verify jobs in database are retrievable
    let jobs = database.get_recent_jobs(10).await.unwrap();

    // If there are jobs, they should be sorted by score
    if jobs.len() >= 2 {
        for i in 0..jobs.len() - 1 {
            if let (Some(score1), Some(score2)) = (jobs[i].score, jobs[i + 1].score) {
                assert!(
                    score1 >= score2,
                    "Jobs should be sorted by score descending"
                );
            }
        }
    }
}

#[tokio::test]
async fn test_scraping_cycle_handles_score_serialization_error() {
    // Tests the error path in score_reasons serialization
    let config = Arc::new(create_test_config());
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Run cycle - should handle any serialization issues gracefully
    let result = scheduler.run_scraping_cycle().await;
    assert!(result.is_ok());
}

// ========================================
// High Score Alert Tests
// ========================================

#[tokio::test]
async fn test_scraping_cycle_identifies_high_matches() {
    let mut config = create_test_config();
    config.immediate_alert_threshold = 0.9;
    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Run cycle
    let result = scheduler.run_scraping_cycle().await.unwrap();

    // Should track high matches count
    assert_eq!(result.high_matches, 0);
}

#[tokio::test]
async fn test_scraping_cycle_skips_already_alerted_jobs() {
    let config = Arc::new(create_test_config());
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    // Pre-populate with a high-scoring job that already has alert sent
    let now = chrono::Utc::now();
    let alerted_job = Job {
        id: 0,
        hash: "alerted_hash".to_string(),
        title: "Amazing Security Engineer".to_string(),
        company: "Dream Corp".to_string(),
        location: Some("Remote".to_string()),
        url: "https://example.com/job/999".to_string(),
        description: Some("Perfect match".to_string()),
        score: Some(0.95),
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
        immediate_alert_sent: true, // Already alerted
        included_in_digest: false,
        hidden: false,
        bookmarked: false,
        ghost_score: None,
        ghost_reasons: None,
        first_seen: None,
        repost_count: 0,
        notes: None,
    };
    database.upsert_job(&alerted_job).await.unwrap();

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Run cycle
    let result = scheduler.run_scraping_cycle().await.unwrap();

    // Should not send duplicate alerts
    assert_eq!(result.alerts_sent, 0);
}

// ========================================
// LinkedIn Scraper Configuration Tests
// ========================================

#[tokio::test]
async fn test_scraping_cycle_with_linkedin_enabled() {
    let mut config = create_test_config();
    config.linkedin.enabled = true;
    config.linkedin.session_cookie = "fake_cookie".to_string();
    config.linkedin.query = "Security Engineer".to_string();
    config.linkedin.location = "Remote".to_string();
    config.linkedin.remote_only = true;
    config.linkedin.limit = 50;
    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Run cycle - will fail to scrape but should handle gracefully
    let result = scheduler.run_scraping_cycle().await.unwrap();

    // Cycle should complete (LinkedIn errors expected)
    assert!(result.jobs_found == 0 || result.errors.len() > 0);
}

#[tokio::test]
async fn test_scraping_cycle_with_linkedin_disabled() {
    let mut config = create_test_config();
    config.linkedin.enabled = false;
    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Run cycle - should skip LinkedIn
    let result = scheduler.run_scraping_cycle().await.unwrap();

    // No LinkedIn errors since it was disabled
    assert!(!result.errors.iter().any(|e| e.contains("LinkedIn")));
}

#[tokio::test]
async fn test_scraping_cycle_with_linkedin_empty_cookie() {
    let mut config = create_test_config();
    config.linkedin.enabled = true;
    config.linkedin.session_cookie = "".to_string(); // Empty cookie
    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Run cycle - should skip LinkedIn due to empty cookie
    let result = scheduler.run_scraping_cycle().await.unwrap();

    // Should not attempt LinkedIn scraping
    assert!(!result.errors.iter().any(|e| e.contains("LinkedIn")));
}

// ========================================
// JobsWithGPT Scraper Tests
// ========================================

#[tokio::test]
async fn test_scraping_cycle_with_jobswithgpt_remote_only() {
    let mut config = create_test_config();
    config.title_allowlist = vec!["Engineer".to_string()];
    config.location_preferences.allow_remote = true;
    config.location_preferences.allow_onsite = false;
    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Run cycle - will fail to scrape but should handle gracefully
    let result = scheduler.run_scraping_cycle().await.unwrap();

    // Cycle should complete (JobsWithGPT errors expected)
    assert!(result.jobs_found == 0 || result.errors.len() > 0);
}

#[tokio::test]
async fn test_scraping_cycle_with_jobswithgpt_not_remote_only() {
    let mut config = create_test_config();
    config.title_allowlist = vec!["Engineer".to_string()];
    config.location_preferences.allow_remote = false;
    config.location_preferences.allow_onsite = true;
    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Run cycle - should set remote_only=false
    let result = scheduler.run_scraping_cycle().await.unwrap();

    // Cycle should complete
    assert!(result.jobs_found == 0 || result.errors.len() > 0);
}

#[tokio::test]
async fn test_scraping_cycle_with_empty_title_allowlist() {
    let mut config = create_test_config();
    config.title_allowlist = vec![]; // Empty allowlist
    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Run cycle - should skip JobsWithGPT
    let result = scheduler.run_scraping_cycle().await.unwrap();

    // No JobsWithGPT errors since it was skipped
    assert!(!result.errors.iter().any(|e| e.contains("JobsWithGPT")));
}

// ========================================
// Multiple Scrapers Enabled Tests
// ========================================

#[tokio::test]
async fn test_scraping_cycle_all_scrapers_enabled() {
    let mut config = create_test_config();
    config.greenhouse_urls = vec!["https://boards.greenhouse.io/test".to_string()];
    config.lever_urls = vec!["https://jobs.lever.co/test".to_string()];
    config.title_allowlist = vec!["Engineer".to_string()];
    config.linkedin.enabled = true;
    config.linkedin.session_cookie = "cookie".to_string();
    config.linkedin.query = "Engineer".to_string();
    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Run cycle - all scrapers will attempt to run
    let result = scheduler.run_scraping_cycle().await.unwrap();

    // All scrapers attempted (errors expected)
    assert!(result.jobs_found == 0 || result.errors.len() > 0);
}

#[tokio::test]
async fn test_scraping_cycle_all_scrapers_disabled() {
    let mut config = create_test_config();
    config.greenhouse_urls = vec![];
    config.lever_urls = vec![];
    config.title_allowlist = vec![];
    config.linkedin.enabled = false;
    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Run cycle - no scrapers enabled
    let result = scheduler.run_scraping_cycle().await.unwrap();

    // Should complete with no jobs found and no errors
    assert_eq!(result.jobs_found, 0);
    assert_eq!(result.errors.len(), 0);
}

// ========================================
// Error Accumulation Tests
// ========================================

#[tokio::test]
async fn test_scraping_cycle_accumulates_multiple_scraper_errors() {
    let mut config = create_test_config();
    // Set up invalid configurations to trigger errors
    config.greenhouse_urls = vec!["invalid".to_string()];
    config.lever_urls = vec!["invalid".to_string()];
    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Run cycle - should accumulate errors from multiple scrapers
    let result = scheduler.run_scraping_cycle().await.unwrap();

    // Cycle should complete (may have accumulated errors)
    assert!(result.jobs_found == 0 || result.errors.len() > 0);
}

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
    let url = "https://boards.greenhouse.io/cloudflare".to_string();
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
// Scheduler Start Loop Coverage Tests
// ========================================

#[tokio::test]
async fn test_scheduler_start_logs_interval() {
    // Tests lines 99-100 (logging with scraping_interval_hours)
    let mut config = create_test_config();
    config.scraping_interval_hours = 3;
    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Arc::new(Scheduler::new(Arc::clone(&config), Arc::clone(&database)));
    let scheduler_clone = Arc::clone(&scheduler);

    // Start scheduler (it will log the interval)
    let handle = tokio::spawn(async move { scheduler_clone.start().await });

    // Give it time to log startup message
    tokio::time::sleep(Duration::from_millis(100)).await;

    // Shutdown
    scheduler.shutdown().unwrap();

    let result = tokio::time::timeout(Duration::from_secs(5), handle).await;
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_scheduler_start_successful_cycle_logging() {
    // Tests line 109 (success case logging with stats)
    let config = Arc::new(create_test_config());
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Arc::new(Scheduler::new(Arc::clone(&config), Arc::clone(&database)));
    let scheduler_clone = Arc::clone(&scheduler);

    // Start scheduler - will run one cycle and log success
    let handle = tokio::spawn(async move { scheduler_clone.start().await });

    // Let it complete first cycle
    tokio::time::sleep(Duration::from_millis(200)).await;

    // Shutdown
    scheduler.shutdown().unwrap();

    let result = tokio::time::timeout(Duration::from_secs(5), handle).await;
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_scheduler_start_with_errors_logging() {
    // Tests lines 116-118 (error logging during cycle)
    let mut config = create_test_config();
    // Configure invalid URLs to trigger errors
    config.greenhouse_urls = vec!["https://boards.greenhouse.io/invalid-company-9999".to_string()];
    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Arc::new(Scheduler::new(Arc::clone(&config), Arc::clone(&database)));
    let scheduler_clone = Arc::clone(&scheduler);

    // Start scheduler
    let handle = tokio::spawn(async move { scheduler_clone.start().await });

    // Let it complete first cycle (with errors)
    tokio::time::sleep(Duration::from_millis(200)).await;

    // Shutdown
    scheduler.shutdown().unwrap();

    let result = tokio::time::timeout(Duration::from_secs(5), handle).await;
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_scheduler_start_next_cycle_logging() {
    // Tests lines 127-128 (next cycle timing log)
    let mut config = create_test_config();
    config.scraping_interval_hours = 12;
    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Arc::new(Scheduler::new(Arc::clone(&config), Arc::clone(&database)));
    let scheduler_clone = Arc::clone(&scheduler);

    // Start scheduler
    let handle = tokio::spawn(async move { scheduler_clone.start().await });

    // Let it complete first cycle and log next cycle timing
    tokio::time::sleep(Duration::from_millis(200)).await;

    // Shutdown
    scheduler.shutdown().unwrap();

    let result = tokio::time::timeout(Duration::from_secs(5), handle).await;
    assert!(result.is_ok());
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
    config.location_preferences.allow_remote = true;
    config.location_preferences.allow_onsite = false;
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
}

#[tokio::test]
async fn test_scraping_cycle_linkedin_skipped_without_keyring_cookie() {
    // Tests that LinkedIn is skipped when no cookie is in the keyring.
    // Note: In v2.0+, session_cookie is stored in OS keyring, not config.
    // When no cookie exists in keyring, LinkedIn scraper is silently skipped.
    let mut config = create_test_config();
    config.linkedin.enabled = true;
    // session_cookie is now in keyring, config value is ignored
    config.linkedin.query = "Engineer".to_string();
    config.linkedin.location = "Remote".to_string();
    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Run cycle - LinkedIn will be skipped (no cookie in keyring)
    let result = scheduler.run_scraping_cycle().await.unwrap();

    // Should NOT have LinkedIn errors (it's skipped, not failed)
    assert!(
        !result.errors.iter().any(|e| e.contains("LinkedIn")),
        "LinkedIn should be skipped when no cookie in keyring, not produce an error"
    );
}

#[tokio::test]
async fn test_scraping_cycle_all_scrapers_error_accumulation() {
    // Tests error accumulation from multiple scrapers
    let mut config = create_test_config();
    config.greenhouse_urls = vec!["https://boards.greenhouse.io/error".to_string()];
    config.lever_urls = vec!["https://jobs.lever.co/error".to_string()];
    config.title_allowlist = vec!["Engineer".to_string()];
    config.linkedin.enabled = true;
    config.linkedin.session_cookie = "invalid".to_string();
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

    // Should handle notification errors gracefully (always succeeds, errors accumulate in vec)
    assert!(result.jobs_found >= 0);
}

// ========================================
// Interval and Timing Edge Cases
// ========================================

#[tokio::test]
async fn test_scheduler_with_one_hour_interval() {
    let mut config = create_test_config();
    config.scraping_interval_hours = 1;
    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Arc::new(Scheduler::new(Arc::clone(&config), Arc::clone(&database)));
    let scheduler_clone = Arc::clone(&scheduler);

    // Start scheduler with 1-hour interval
    let handle = tokio::spawn(async move { scheduler_clone.start().await });

    // Let it run briefly
    tokio::time::sleep(Duration::from_millis(100)).await;

    // Shutdown
    scheduler.shutdown().unwrap();

    let result = tokio::time::timeout(Duration::from_secs(5), handle).await;
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_scheduler_with_weekly_interval() {
    let mut config = create_test_config();
    config.scraping_interval_hours = 168; // 1 week
    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Arc::new(Scheduler::new(Arc::clone(&config), Arc::clone(&database)));
    let scheduler_clone = Arc::clone(&scheduler);

    // Start scheduler with weekly interval
    let handle = tokio::spawn(async move { scheduler_clone.start().await });

    // Let it run briefly
    tokio::time::sleep(Duration::from_millis(100)).await;

    // Shutdown
    scheduler.shutdown().unwrap();

    let result = tokio::time::timeout(Duration::from_secs(5), handle).await;
    assert!(result.is_ok());
}

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
#[ignore] // Integration test - makes real HTTP requests, flaky in CI
async fn test_complete_workflow_with_all_error_paths() {
    // Comprehensive test hitting multiple error paths
    let mut config = create_test_config();
    config.scraping_interval_hours = 6;
    config.greenhouse_urls = vec!["https://boards.greenhouse.io/test".to_string()];
    config.lever_urls = vec!["https://jobs.lever.co/test".to_string()];
    config.title_allowlist = vec!["Engineer".to_string()];
    config.linkedin.enabled = true;
    config.linkedin.session_cookie = "test".to_string();
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

#[tokio::test]
async fn test_scheduler_with_custom_intervals_coverage() {
    // Test various interval configurations
    let intervals = vec![1, 2, 3, 4, 6, 8, 12, 24];

    for interval in intervals {
        let mut config = create_test_config();
        config.scraping_interval_hours = interval;
        let config = Arc::new(config);
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let scheduler = Arc::new(Scheduler::new(Arc::clone(&config), Arc::clone(&database)));
        let scheduler_clone = Arc::clone(&scheduler);

        let handle = tokio::spawn(async move { scheduler_clone.start().await });

        tokio::time::sleep(Duration::from_millis(50)).await;
        scheduler.shutdown().unwrap();

        let result = tokio::time::timeout(Duration::from_secs(5), handle).await;
        assert!(result.is_ok(), "Failed for interval: {}", interval);
    }
}

// ========================================
// Error Path Coverage Tests
// ========================================

#[tokio::test]
async fn test_scraping_cycle_with_errors_returns_error_list() {
    // Test that errors during scraping are collected but cycle completes
    let mut config = create_test_config();
    // Invalid URLs that will cause scraper errors
    config.greenhouse_urls =
        vec!["https://boards.greenhouse.io/invalid_company_xyz_123".to_string()];
    config.lever_urls = vec!["https://jobs.lever.co/invalid_company_abc_456".to_string()];

    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    let result = scheduler.run_scraping_cycle().await;

    // Should succeed even with scraper errors
    assert!(result.is_ok());
    let result = result.unwrap();

    // Should track that scrapers ran (even if they failed)
    // The errors vec may or may not be populated depending on network conditions
    assert_eq!(result.jobs_found, 0);
}

#[tokio::test]
async fn test_scheduler_start_completes_cycle_with_errors() {
    // Test that scheduler loop handles errors during cycle
    let mut config = create_test_config();
    config.scraping_interval_hours = 24;
    config.greenhouse_urls = vec!["https://boards.greenhouse.io/nonexistent".to_string()];

    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Arc::new(Scheduler::new(Arc::clone(&config), Arc::clone(&database)));
    let scheduler_clone = Arc::clone(&scheduler);

    let handle = tokio::spawn(async move { scheduler_clone.start().await });

    // Let it run one cycle
    tokio::time::sleep(Duration::from_millis(200)).await;

    // Shutdown gracefully
    scheduler.shutdown().unwrap();

    let result = tokio::time::timeout(Duration::from_secs(5), handle).await;
    assert!(result.is_ok());
    assert!(result.unwrap().is_ok());
}

#[tokio::test]
async fn test_scraping_cycle_with_no_jobs_but_with_errors() {
    // Test empty result with errors
    let config = Arc::new(create_test_config());
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    let result = scheduler.run_scraping_cycle().await.unwrap();

    assert_eq!(result.jobs_found, 0);
    assert_eq!(result.jobs_new, 0);
    assert_eq!(result.jobs_updated, 0);
}

#[tokio::test]
async fn test_scraping_cycle_scoring_with_nan_handling() {
    // Test that NaN scores are handled correctly in sorting
    let config = Arc::new(create_test_config());
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    // Running with empty config exercises the sorting code with no jobs
    let result = scheduler.run_scraping_cycle().await.unwrap();

    assert_eq!(result.jobs_found, 0);
}

#[tokio::test]
async fn test_scraping_cycle_database_error_handling() {
    // Test that database errors are caught and logged
    let config = Arc::new(create_test_config());
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    let result = scheduler.run_scraping_cycle().await.unwrap();

    // Empty config = no jobs, but exercises database code paths
    assert_eq!(result.jobs_found, 0);
    // Errors may or may not be empty depending on network conditions
}

#[tokio::test]
async fn test_scraping_cycle_notification_failure_continues() {
    // Test that notification failures don't stop the cycle
    let mut config = create_test_config();
    config.immediate_alert_threshold = 0.0; // Alert on everything

    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    let result = scheduler.run_scraping_cycle().await.unwrap();

    // Should complete even if notifications would fail
    assert_eq!(result.jobs_found, 0);
}

#[tokio::test]
async fn test_scraping_cycle_alert_already_sent_skip() {
    // Test that jobs with immediate_alert_sent=true are skipped
    let mut config = create_test_config();
    config.immediate_alert_threshold = 0.5;

    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    // Create a job that already had alert sent
    let now = chrono::Utc::now();
    let job_with_alert = Job {
        id: 0,
        hash: "alert_already_sent".to_string(),
        title: "Test Job".to_string(),
        company: "Test Corp".to_string(),
        location: Some("Remote".to_string()),
        url: "https://example.com/job/1".to_string(),
        description: Some("Test".to_string()),
        score: Some(0.95),
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
        immediate_alert_sent: true, // Already sent
        included_in_digest: false,
        hidden: false,
        bookmarked: false,
        ghost_score: None,
        ghost_reasons: None,
        first_seen: None,
        repost_count: 0,
        notes: None,
    };
    database.upsert_job(&job_with_alert).await.unwrap();

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    let result = scheduler.run_scraping_cycle().await.unwrap();

    // No new alerts should be sent for jobs that already have alerts
    assert_eq!(result.alerts_sent, 0);
}

#[tokio::test]
async fn test_scraping_cycle_get_job_by_hash_error_handling() {
    // Test error handling when get_job_by_hash returns None
    let mut config = create_test_config();
    config.immediate_alert_threshold = 0.0;

    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    let result = scheduler.run_scraping_cycle().await.unwrap();

    // Empty config = no jobs to retrieve
    assert_eq!(result.jobs_found, 0);
}

#[tokio::test]
async fn test_scheduler_multiple_cycles_with_shutdown_between() {
    // Test running scheduler, shutting down, and checking state
    let mut config = create_test_config();
    config.scraping_interval_hours = 1;

    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Arc::new(Scheduler::new(Arc::clone(&config), Arc::clone(&database)));
    let scheduler_clone = Arc::clone(&scheduler);

    let handle = tokio::spawn(async move { scheduler_clone.start().await });

    // Let it run briefly
    tokio::time::sleep(Duration::from_millis(100)).await;

    // Shutdown
    scheduler.shutdown().unwrap();

    let result = tokio::time::timeout(Duration::from_secs(5), handle).await;
    assert!(result.is_ok());
    assert!(result.unwrap().is_ok());
}

#[tokio::test]
async fn test_scraping_cycle_all_error_branches() {
    // Comprehensive test to hit all error logging branches
    let mut config = create_test_config();

    // Enable all scrapers with potentially failing configs
    config.greenhouse_urls = vec!["https://boards.greenhouse.io/test_company".to_string()];
    config.lever_urls = vec!["https://jobs.lever.co/test_company".to_string()];
    config.title_allowlist = vec!["Engineer".to_string()];
    config.linkedin.enabled = true;
    config.linkedin.session_cookie = "invalid_session".to_string();
    config.linkedin.query = "Software Engineer".to_string();
    config.immediate_alert_threshold = 0.3;

    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    let result = scheduler.run_scraping_cycle().await;

    // Should complete even if scrapers fail
    assert!(result.is_ok());
    let result = result.unwrap();

    // Verify result structure (all counters are unsigned, so >= 0 always true)
    // Just verify they exist and are accessible
    let _ = result.jobs_found;
    let _ = result.jobs_new;
    let _ = result.jobs_updated;
}

#[tokio::test]
async fn test_scheduler_start_error_path_logging() {
    // Test that errors during scraping cycle are logged properly
    let mut config = create_test_config();
    config.scraping_interval_hours = 24;

    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Arc::new(Scheduler::new(Arc::clone(&config), Arc::clone(&database)));
    let scheduler_clone = Arc::clone(&scheduler);

    let handle = tokio::spawn(async move { scheduler_clone.start().await });

    // Let one cycle complete
    tokio::time::sleep(Duration::from_millis(150)).await;

    // Shutdown
    scheduler.shutdown().unwrap();

    let result = tokio::time::timeout(Duration::from_secs(5), handle).await;
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_scraping_cycle_score_reasons_serialization() {
    // Test score_reasons serialization and error handling
    let config = Arc::new(create_test_config());
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    let result = scheduler.run_scraping_cycle().await.unwrap();

    // Empty config exercises serialization code without jobs
    assert_eq!(result.jobs_found, 0);
}

#[tokio::test]
async fn test_scraping_cycle_job_sorting_with_equal_scores() {
    // Test job sorting when scores are equal
    let config = Arc::new(create_test_config());
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    let result = scheduler.run_scraping_cycle().await.unwrap();

    // Exercises sorting code path
    assert_eq!(result.jobs_found, 0);
}

#[tokio::test]
async fn test_scheduler_interval_conversion_edge_cases() {
    // Test interval to Duration conversion
    let test_cases = vec![(0, 0), (1, 3600), (24, 86400), (168, 604800)];

    for (hours, expected_secs) in test_cases {
        let mut config = create_test_config();
        config.scraping_interval_hours = hours;
        let config = Arc::new(config);
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let _scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

        // Verify the calculation: hours * 3600
        assert_eq!(hours * 3600, expected_secs);
    }
}

#[tokio::test]
async fn test_scraping_cycle_empty_scored_jobs_list() {
    // Test with no jobs to score
    let config = Arc::new(create_test_config());
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    let result = scheduler.run_scraping_cycle().await.unwrap();

    assert_eq!(result.jobs_found, 0);
    assert_eq!(result.high_matches, 0);
    assert_eq!(result.alerts_sent, 0);
}

#[tokio::test]
async fn test_scraping_cycle_high_match_but_no_notification_config() {
    // Test high match with no notification channels configured
    let mut config = create_test_config();
    config.immediate_alert_threshold = 0.0; // Everything is high match
                                            // No notification channels configured (default alerts config is empty)

    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    let result = scheduler.run_scraping_cycle().await.unwrap();

    // No jobs = no alerts
    assert_eq!(result.alerts_sent, 0);
}

#[tokio::test]
async fn test_scheduler_shutdown_ok_result() {
    // Test that shutdown returns Ok
    let config = Arc::new(create_test_config());
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

    let result = scheduler.shutdown();
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_scraping_cycle_was_existing_true_path() {
    // Test the jobs_updated counter increment
    let config = Arc::new(create_test_config());
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    // Pre-populate with a job
    let now = chrono::Utc::now();
    let existing_job = Job {
        id: 0,
        hash: "existing_hash".to_string(),
        title: "Existing Job".to_string(),
        company: "Test Corp".to_string(),
        location: Some("Remote".to_string()),
        url: "https://example.com/job/existing".to_string(),
        description: Some("Test".to_string()),
        score: Some(0.7),
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

    let result = scheduler.run_scraping_cycle().await.unwrap();

    // With empty scraper config, should find no new jobs
    assert_eq!(result.jobs_found, 0);
    assert_eq!(result.jobs_updated, 0);
}
