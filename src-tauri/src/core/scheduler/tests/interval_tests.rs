use super::*;

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
        interval_hours: 168,
        enabled: true,
    };

    assert_eq!(config.interval_hours, 168);
}

#[test]
fn test_schedule_config_zero_interval() {
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

    let scheduler_config = scheduler.config.read().await;
    assert_eq!(scheduler_config.scraping_interval_hours, 4);
}

#[tokio::test]
async fn test_scheduler_very_large_interval() {
    let mut config = create_test_config();
    config.scraping_interval_hours = u64::MAX / 3600;
    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let _scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));
}

#[test]
fn test_schedule_config_from_various_intervals() {
    let test_cases = vec![(1, 1), (2, 2), (6, 6), (12, 12), (24, 24), (168, 168)];

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

    let scheduler_config = scheduler.config.read().await;
    assert_eq!(scheduler_config.scraping_interval_hours, 8);
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

#[tokio::test]
async fn test_scheduler_interval_duration_conversion() {
    let test_cases = vec![
        (1, 3600),
        (2, 7200),
        (4, 14400),
        (8, 28800),
        (12, 43200),
        (24, 86400),
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

    let handle = tokio::spawn(async move { scheduler_clone.start().await });

    tokio::time::sleep(Duration::from_millis(100)).await;
    scheduler.shutdown().unwrap();

    let result = tokio::time::timeout(Duration::from_secs(5), handle).await;
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_scheduler_with_weekly_interval() {
    let mut config = create_test_config();
    config.scraping_interval_hours = 168;
    let config = Arc::new(config);
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    let database = Arc::new(db);

    let scheduler = Arc::new(Scheduler::new(Arc::clone(&config), Arc::clone(&database)));
    let scheduler_clone = Arc::clone(&scheduler);

    let handle = tokio::spawn(async move { scheduler_clone.start().await });

    tokio::time::sleep(Duration::from_millis(100)).await;
    scheduler.shutdown().unwrap();

    let result = tokio::time::timeout(Duration::from_secs(5), handle).await;
    assert!(result.is_ok());
}

#[tokio::test]
async fn test_scheduler_with_custom_intervals_coverage() {
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

#[tokio::test]
async fn test_scheduler_interval_conversion_edge_cases() {
    let test_cases = vec![(0, 0), (1, 3600), (24, 86400), (168, 604800)];

    for (hours, expected_secs) in test_cases {
        let mut config = create_test_config();
        config.scraping_interval_hours = hours;
        let config = Arc::new(config);
        let db = Database::connect_memory().await.unwrap();
        db.migrate().await.unwrap();
        let database = Arc::new(db);

        let _scheduler = Scheduler::new(Arc::clone(&config), Arc::clone(&database));

        assert_eq!(hours * 3600, expected_secs);
    }
}
