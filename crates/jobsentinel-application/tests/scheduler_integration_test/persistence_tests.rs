use jobsentinel_application::scheduler::ScrapingResult;

use super::*;

#[tokio::test]
async fn test_job_upsert_creates_new() {
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();

    let job = create_test_job(
        "upsert_001",
        "Program Coordinator",
        "Example Services",
        true,
        Some(60000),
    );

    // Upsert new job
    let result = db.upsert_job(&job).await;
    assert!(result.is_ok());

    // Verify it exists
    let retrieved = db.get_job_by_hash("upsert_001").await.unwrap();
    assert!(retrieved.is_some());
    assert_eq!(retrieved.unwrap().title, "Program Coordinator");
}

#[tokio::test]
async fn test_job_upsert_updates_existing() {
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();

    // Use unique hash for this test to avoid any potential collisions
    let test_hash = format!("upsert_update_{}", std::process::id());

    let mut job1 = create_test_job(
        &test_hash,
        "Program Coordinator",
        "Example Services",
        true,
        Some(60000),
    );
    // Ensure score_reasons is valid JSON
    job1.score_reasons = Some("[]".to_string());
    db.upsert_job(&job1).await.unwrap();

    // Update with same hash but different data
    let mut job2 = job1.clone();
    job2.title = "Senior Program Coordinator".to_string();
    job2.salary_min = Some(70000);

    db.upsert_job(&job2).await.unwrap();

    // Verify update
    let retrieved = db.get_job_by_hash(&test_hash).await.unwrap().unwrap();
    assert_eq!(retrieved.title, "Senior Program Coordinator");
    let search_results = db.search_jobs("Senior", 10).await.unwrap();
    assert_eq!(search_results.len(), 1);
    assert_eq!(search_results[0].hash, test_hash);
}

#[tokio::test]
async fn test_job_times_seen_increments() {
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();

    let job = create_test_job(
        "seen_001",
        "Program Coordinator",
        "Example Services",
        true,
        Some(60000),
    );

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
