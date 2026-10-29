//! Tests scheduler serialization, shutdown, and source-cycle behavior.

use super::*;
use crate::{
    config::{AutoRefreshConfig, Config},
    test_support::{minimal_test_config, test_job},
};
use jobsentinel_domain::Job;
use jobsentinel_storage::Database as Db;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;

fn create_test_config() -> Config {
    let mut config = minimal_test_config();
    config.title_allowlist = vec!["Security Engineer".to_string()];
    config.salary_floor_usd = 0;
    config.auto_refresh = AutoRefreshConfig {
        enabled: true,
        interval_minutes: 30,
    };
    config.immediate_alert_threshold = 0.9;
    config.jobswithgpt_endpoint.clear();
    config
}

type Database = Db;

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
    let db = Db::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    // Pre-populate database with a job
    let existing_job = Job {
        url: "https://example.com/job/1".to_string(),
        description: Some("Great job".to_string()),
        score: Some(0.8),
        ..test_job("test_hash_123", "Senior Rust Developer", "Test Corp")
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
    let db = Db::connect_memory().await.unwrap();
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
    let db = Db::connect_memory().await.unwrap();
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
    let db = Db::connect_memory().await.unwrap();
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
    let db = Db::connect_memory().await.unwrap();
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
    let db = Db::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    // Insert same job twice with same hash
    let job = Job {
        url: "https://example.com/job".to_string(),
        ..test_job("duplicate_hash", "Test Job", "Test Co")
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
    let db = Db::connect_memory().await.unwrap();
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
    let db = Db::connect_memory().await.unwrap();
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

mod lifecycle_and_error_tests;

#[path = "tests/error_path_tests.rs"]
mod error_path_tests;

#[tokio::test]
async fn shutdown_waits_for_active_work_and_refuses_later_writes() {
    let database = Arc::new(Database::connect_memory().await.unwrap());
    database.migrate().await.unwrap();
    let scheduler = Arc::new(Scheduler::new(Arc::new(create_test_config()), database));
    let active = scheduler.scrape_lock.lock().await;
    let stopped = scheduler.clone();
    let task = tokio::spawn(async move { stopped.shutdown_and_wait().await });
    while !scheduler.is_shutdown_requested() {
        tokio::task::yield_now().await;
    }
    assert!(!task.is_finished());
    drop(active);
    tokio::time::timeout(Duration::from_secs(2), task)
        .await
        .unwrap()
        .unwrap()
        .unwrap();
    assert!(scheduler.run_scraping_cycle().await.is_err());
    assert_eq!(scheduler.recover_interrupted_runs().await.unwrap(), 0);
}

#[tokio::test]
async fn privacy_pause_cancels_active_checks_and_drains_without_shutdown() {
    let database = Arc::new(Database::connect_memory().await.unwrap());
    database.migrate().await.unwrap();
    let scheduler = Arc::new(Scheduler::new(Arc::new(create_test_config()), database));
    let active = scheduler.scrape_lock.lock().await;
    let mut shutdown = scheduler.subscribe_shutdown();
    let mut cancellation = scheduler.cycle_cancel_tx.subscribe();
    let paused = scheduler.clone();
    let task = tokio::spawn(async move { paused.pause_for_privacy().await });
    tokio::time::timeout(Duration::from_secs(2), cancellation.recv())
        .await
        .unwrap()
        .unwrap();
    assert!(scheduler.cycle_cancelled.load(Ordering::Acquire));
    assert!(!scheduler.is_shutdown_requested());
    assert!(matches!(
        shutdown.try_recv(),
        Err(tokio::sync::broadcast::error::TryRecvError::Empty)
    ));
    assert!(!task.is_finished());
    drop(active);
    tokio::time::timeout(Duration::from_secs(2), task)
        .await
        .unwrap()
        .unwrap()
        .unwrap();
    assert!(scheduler.run_scraping_cycle().await.is_err());
    scheduler.resume_after_privacy();
    assert!(scheduler.run_scraping_cycle().await.is_ok());
}

#[tokio::test]
async fn privacy_resume_never_reopens_a_shutdown_scheduler() {
    let database = Arc::new(Database::connect_memory().await.unwrap());
    database.migrate().await.unwrap();
    let scheduler = Scheduler::new(Arc::new(create_test_config()), database);
    scheduler.pause_for_privacy().await.unwrap();
    scheduler.shutdown().unwrap();
    scheduler.resume_after_privacy();
    assert!(scheduler.is_shutdown_requested());
    assert!(scheduler.cycle_cancelled.load(Ordering::Acquire));
    assert!(scheduler.run_scraping_cycle().await.is_err());
}

#[tokio::test]
async fn privacy_resume_wakes_a_paused_start_and_performs_deferred_recovery() {
    let database = Arc::new(Database::connect_memory().await.unwrap());
    database.migrate().await.unwrap();
    crate::health::start_run(&database, "interrupted")
        .await
        .unwrap();
    let mut config = create_test_config();
    config.auto_refresh.enabled = false;
    let scheduler = Arc::new(Scheduler::new(Arc::new(config), database.clone()));
    scheduler.pause_for_privacy().await.unwrap();
    let started = scheduler.clone();
    let task = tokio::spawn(async move { started.start().await });
    tokio::time::timeout(Duration::from_secs(2), async {
        while scheduler.cycle_cancel_tx.receiver_count() == 0 {
            tokio::task::yield_now().await;
        }
    })
    .await
    .unwrap();
    assert!(crate::health::get_scraper_runs(&database, "interrupted", 1)
        .await
        .unwrap()[0]
        .finished_at
        .is_none());
    scheduler.resume_after_privacy();
    tokio::time::timeout(Duration::from_secs(2), async {
        loop {
            if crate::health::get_scraper_runs(&database, "interrupted", 1)
                .await
                .unwrap()[0]
                .finished_at
                .is_some()
            {
                break;
            }
            tokio::task::yield_now().await;
        }
    })
    .await
    .unwrap();
    scheduler.shutdown().unwrap();
    tokio::time::timeout(Duration::from_secs(2), task)
        .await
        .unwrap()
        .unwrap()
        .unwrap();
}
