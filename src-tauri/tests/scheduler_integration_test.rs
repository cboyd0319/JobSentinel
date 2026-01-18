//! Scheduler Integration Tests
//!
//! Tests the complete scheduling workflow:
//! - Scraping cycle orchestration
//! - Job scoring pipeline
//! - Database persistence
//! - Error aggregation
//! - Graceful shutdown

use jobsentinel::core::{
    config::{Config, LocationPreferences},
    db::{Database, Job},
    scheduler::{ScheduleConfig, Scheduler, ScrapingResult},
    scoring::ScoringEngine,
};
use std::sync::Arc;
use std::time::Duration;

/// Helper to create a minimal test config
fn create_test_config() -> Config {
    Config {
        title_allowlist: vec![
            "Security Engineer".to_string(),
            "Rust Developer".to_string(),
            "Backend Engineer".to_string(),
        ],
        title_blocklist: vec!["Manager".to_string(), "Director".to_string()],
        keywords_boost: vec![
            "Rust".to_string(),
            "Security".to_string(),
            "Kubernetes".to_string(),
        ],
        keywords_exclude: vec!["PHP".to_string(), "Wordpress".to_string()],
        location_preferences: LocationPreferences {
            allow_remote: true,
            allow_hybrid: true,
            allow_onsite: false,
            cities: vec!["San Francisco".to_string(), "Seattle".to_string()],
            states: vec!["CA".to_string(), "WA".to_string()],
            country: "US".to_string(),
        },
        salary_floor_usd: 120000,
        salary_target_usd: None,
        penalize_missing_salary: false,
        auto_refresh: Default::default(),
        immediate_alert_threshold: 0.85,
        scraping_interval_hours: 2,
        alerts: Default::default(),
        greenhouse_urls: vec![],
        lever_urls: vec![],
        linkedin: Default::default(),
        indeed: Default::default(),
        jobswithgpt_endpoint: "https://api.jobswithgpt.com/mcp".to_string(),
        remoteok: Default::default(),
        wellfound: Default::default(),
        weworkremotely: Default::default(),
        builtin: Default::default(),
        hn_hiring: Default::default(),
        dice: Default::default(),
        yc_startup: Default::default(),
        ziprecruiter: Default::default(),
        ghost_config: None,
        use_resume_matching: false,
        company_whitelist: vec![],
        company_blacklist: vec![],
    }
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
        id: 0,
        hash: hash.to_string(),
        title: title.to_string(),
        company: company.to_string(),
        url: format!("https://example.com/job/{}", hash),
        location: if remote {
            Some("Remote".to_string())
        } else {
            Some("San Francisco, CA".to_string())
        },
        // Use title-based description to avoid interfering with search tests
        description: Some(format!("Job description for {} at {}.", title, company)),
        score: None,
        score_reasons: None,
        source: "test".to_string(),
        remote: Some(remote),
        salary_min,
        salary_max: salary_min.map(|s| s + 50000),
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

    // Verify all result fields are accessible
    let _jobs_found = result.jobs_found;
    let _jobs_new = result.jobs_new;
    let _jobs_updated = result.jobs_updated;
    let _high_matches = result.high_matches;
    let _alerts_sent = result.alerts_sent;
    let _errors = &result.errors;

    // Should be zero-initialized for empty config
    assert!(result.jobs_found >= 0);
    assert!(result.high_matches <= result.jobs_found);
}

// ============================================================================
// Scoring Integration Tests
// ============================================================================

#[tokio::test]
async fn test_scoring_engine_integration() {
    let config = Arc::new(create_test_config());
    let scoring_engine = ScoringEngine::new(Arc::clone(&config));

    // High-quality job: matches title, keywords, remote, good salary
    let high_quality_job = create_test_job(
        "hq_001",
        "Senior Rust Security Engineer",
        "TechCorp",
        true,
        Some(150000),
    );

    let score = scoring_engine.score(&high_quality_job);
    assert!(
        score.total > 0.7,
        "High-quality job should score above 0.7, got {}",
        score.total
    );

    // Low-quality job: doesn't match title, onsite, low salary
    let low_quality_job = Job {
        title: "PHP WordPress Developer".to_string(),
        remote: Some(false),
        salary_min: Some(50000),
        salary_max: Some(60000),
        location: Some("NYC".to_string()),
        ..create_test_job("lq_001", "PHP Developer", "AgencyCorp", false, Some(50000))
    };

    let score = scoring_engine.score(&low_quality_job);
    assert!(
        score.total < 0.5,
        "Low-quality job should score below 0.5, got {}",
        score.total
    );
}

#[tokio::test]
async fn test_title_matching_scoring() {
    let config = Arc::new(create_test_config());
    let scoring_engine = ScoringEngine::new(Arc::clone(&config));

    // Exact title match
    let exact_match = create_test_job("tm_001", "Security Engineer", "Company", true, None);
    let score1 = scoring_engine.score(&exact_match);

    // Partial title match
    let partial_match = create_test_job(
        "tm_002",
        "Senior Security Engineer Lead",
        "Company",
        true,
        None,
    );
    let score2 = scoring_engine.score(&partial_match);

    // No title match
    let no_match = create_test_job("tm_003", "Marketing Manager", "Company", true, None);
    let score3 = scoring_engine.score(&no_match);

    assert!(
        score1.total > score3.total,
        "Exact match should score higher than no match"
    );
    assert!(
        score2.total > score3.total,
        "Partial match should score higher than no match"
    );
}

#[tokio::test]
async fn test_salary_influence_on_scoring() {
    let config = Arc::new(create_test_config());
    let scoring_engine = ScoringEngine::new(Arc::clone(&config));

    // Job with salary above floor
    let good_salary = create_test_job("sal_001", "Rust Developer", "TechCorp", true, Some(150000));
    let score_good = scoring_engine.score(&good_salary);

    // Job with salary below floor
    let bad_salary = create_test_job(
        "sal_002",
        "Rust Developer",
        "StartupCorp",
        true,
        Some(80000),
    );
    let score_bad = scoring_engine.score(&bad_salary);

    // Job with no salary
    let no_salary = create_test_job("sal_003", "Rust Developer", "MystCorp", true, None);
    let score_none = scoring_engine.score(&no_salary);

    assert!(
        score_good.total >= score_bad.total,
        "Job with salary above floor should score >= job below floor"
    );
    // No salary shouldn't be penalized as harshly as explicitly low salary
}

#[tokio::test]
async fn test_remote_preference_scoring() {
    let config = Arc::new(create_test_config()); // allow_remote: true, allow_onsite: false
    let scoring_engine = ScoringEngine::new(Arc::clone(&config));

    // Remote job
    let remote_job = create_test_job("rem_001", "Rust Developer", "TechCorp", true, Some(140000));
    let score_remote = scoring_engine.score(&remote_job);

    // Onsite job (config has allow_onsite: false)
    let onsite_job = create_test_job("rem_002", "Rust Developer", "TechCorp", false, Some(140000));
    let score_onsite = scoring_engine.score(&onsite_job);

    assert!(
        score_remote.total >= score_onsite.total,
        "Remote job should score >= onsite when onsite is not allowed"
    );
}

// ============================================================================
// Database Persistence Tests
// ============================================================================

#[tokio::test]
async fn test_job_upsert_creates_new() {
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();

    let job = create_test_job(
        "upsert_001",
        "Test Engineer",
        "TestCorp",
        true,
        Some(120000),
    );

    // Upsert new job
    let result = db.upsert_job(&job).await;
    assert!(result.is_ok());

    // Verify it exists
    let retrieved = db.get_job_by_hash("upsert_001").await.unwrap();
    assert!(retrieved.is_some());
    assert_eq!(retrieved.unwrap().title, "Test Engineer");
}

#[tokio::test]
#[ignore = "Unexplained SQLite corruption in test binary - same test passes in lib tests (see test_upsert_job_update)"]
async fn test_job_upsert_updates_existing() {
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();

    // Use unique hash for this test to avoid any potential collisions
    let test_hash = format!("upsert_update_{}", std::process::id());

    let mut job1 = create_test_job(&test_hash, "Test Engineer", "TestCorp", true, Some(120000));
    // Ensure score_reasons is valid JSON
    job1.score_reasons = Some("[]".to_string());
    db.upsert_job(&job1).await.unwrap();

    // Update with same hash but different data
    let mut job2 = job1.clone();
    job2.title = "Senior Test Engineer".to_string();
    job2.salary_min = Some(150000);

    db.upsert_job(&job2).await.unwrap();

    // Verify update
    let retrieved = db.get_job_by_hash(&test_hash).await.unwrap().unwrap();
    assert_eq!(retrieved.title, "Senior Test Engineer");
}

#[tokio::test]
async fn test_job_times_seen_increments() {
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();

    let job = create_test_job("seen_001", "Test Engineer", "TestCorp", true, Some(120000));

    // First upsert
    db.upsert_job(&job).await.unwrap();
    let first = db.get_job_by_hash("seen_001").await.unwrap().unwrap();
    let initial_times_seen = first.times_seen;

    // Second upsert (should increment times_seen)
    db.upsert_job(&job).await.unwrap();
    let second = db.get_job_by_hash("seen_001").await.unwrap().unwrap();

    assert!(
        second.times_seen > initial_times_seen,
        "times_seen should increment on re-upsert"
    );
}

// ============================================================================
// Error Aggregation Tests
// ============================================================================

#[tokio::test]
async fn test_scraping_result_error_collection() {
    // Create a result with errors manually to test error handling
    let result = ScrapingResult {
        jobs_found: 10,
        jobs_new: 5,
        jobs_updated: 3,
        high_matches: 2,
        alerts_sent: 1,
        errors: vec![
            "Greenhouse scraper failed: timeout".to_string(),
            "Lever scraper failed: rate limited".to_string(),
        ],
    };

    assert_eq!(result.errors.len(), 2);
    assert!(result.errors[0].contains("Greenhouse"));
    assert!(result.errors[1].contains("Lever"));

    // Jobs should still be reported even with errors
    assert_eq!(result.jobs_found, 10);
}

// ============================================================================
// Concurrent Operations Tests
// ============================================================================

#[tokio::test]
async fn test_concurrent_job_upserts() {
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    // Create 20 concurrent upsert operations
    let handles: Vec<_> = (0..20)
        .map(|i| {
            let db_clone = Arc::clone(&database);
            tokio::spawn(async move {
                let job = create_test_job(
                    &format!("concurrent_{}", i),
                    &format!("Engineer {}", i),
                    &format!("Company {}", i),
                    i % 2 == 0,
                    Some(100000 + (i * 5000) as i64),
                );
                db_clone.upsert_job(&job).await
            })
        })
        .collect();

    // Wait for all operations
    let results: Vec<_> = futures::future::join_all(handles).await;

    // All should succeed
    for result in results {
        assert!(result.is_ok(), "Spawn should succeed");
        assert!(result.unwrap().is_ok(), "Upsert should succeed");
    }

    // Verify all jobs were inserted
    let stats = database.get_statistics().await.unwrap();
    assert_eq!(stats.total_jobs, 20);
}

#[tokio::test]
async fn test_concurrent_scheduler_operations() {
    let config = Arc::new(create_test_config());
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    // Run 5 scraping cycles concurrently
    let handles: Vec<_> = (0..5)
        .map(|_| {
            let config_clone = Arc::clone(&config);
            let db_clone = Arc::clone(&database);
            tokio::spawn(async move {
                let scheduler = Scheduler::new(config_clone, db_clone);
                scheduler.run_scraping_cycle().await
            })
        })
        .collect();

    let results: Vec<_> = futures::future::join_all(handles).await;

    // All should complete without panic
    for result in results {
        assert!(result.is_ok(), "Spawn should succeed");
        assert!(result.unwrap().is_ok(), "Scraping cycle should succeed");
    }
}

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
            "Rust Security Engineer",
            "SecureCorp",
            true,
            Some(150000),
        ),
        create_test_job(
            "search_002",
            "Python Developer",
            "PyCorp",
            true,
            Some(120000),
        ),
        create_test_job(
            "search_003",
            "Rust Backend Developer",
            "BackendCorp",
            true,
            Some(140000),
        ),
    ];

    for job in &jobs {
        db.upsert_job(job).await.unwrap();
    }

    // Search for Rust jobs (should match title containing "Rust")
    let results = db.search_jobs("Rust", 10).await.unwrap();

    // Should find exactly 2 Rust jobs by title
    assert_eq!(results.len(), 2, "Should find exactly 2 Rust jobs");

    let titles: Vec<_> = results.iter().map(|j| j.title.as_str()).collect();
    assert!(titles.contains(&"Rust Security Engineer"));
    assert!(titles.contains(&"Rust Backend Developer"));
    assert!(!titles.contains(&"Python Developer"));
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
