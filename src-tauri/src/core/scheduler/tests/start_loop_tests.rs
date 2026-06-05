use super::*;

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
