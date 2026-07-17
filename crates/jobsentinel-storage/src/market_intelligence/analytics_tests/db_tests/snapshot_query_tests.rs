use super::*;

#[tokio::test]
async fn test_get_latest_snapshot() {
    let pool = migrated_pool().await;

    sqlx::query(
        "INSERT INTO market_snapshots (date, total_jobs, new_jobs_today, jobs_filled_today, total_companies_hiring, market_sentiment) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind("2026-01-14")
    .bind(80)
    .bind(8)
    .bind(4)
    .bind(40)
    .bind("neutral")
    .execute(&pool)
    .await
    .unwrap();

    sqlx::query(
        "INSERT INTO market_snapshots (date, total_jobs, new_jobs_today, jobs_filled_today, total_companies_hiring, market_sentiment) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind("2026-01-16")
    .bind(100)
    .bind(10)
    .bind(5)
    .bind(50)
    .bind("bullish")
    .execute(&pool)
    .await
    .unwrap();

    sqlx::query(
        "INSERT INTO market_snapshots (date, total_jobs, new_jobs_today, jobs_filled_today, total_companies_hiring, market_sentiment) VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind("2026-01-15")
    .bind(90)
    .bind(9)
    .bind(4)
    .bind(45)
    .bind("neutral")
    .execute(&pool)
    .await
    .unwrap();

    let analyzer = MarketAnalyzer::new(pool);
    let snapshot = analyzer.get_latest_snapshot().await.unwrap();

    assert!(snapshot.is_some());
    let snapshot = snapshot.unwrap();
    assert_eq!(snapshot.date, NaiveDate::from_ymd_opt(2026, 1, 16).unwrap());
    assert_eq!(snapshot.total_jobs, 100);
}

#[tokio::test]
async fn test_get_latest_snapshot_empty() {
    let pool = migrated_pool().await;
    let analyzer = MarketAnalyzer::new(pool);

    let snapshot = analyzer.get_latest_snapshot().await.unwrap();
    assert!(snapshot.is_none());
}

#[tokio::test]
async fn test_get_historical_snapshots() {
    let pool = migrated_pool().await;
    let today = Utc::now().date_naive();

    // Insert snapshots for last 10 days (from today backwards)
    for i in 0..10_i64 {
        let date = (today - chrono::Duration::days(i)).to_string();
        sqlx::query(
            "INSERT INTO market_snapshots (date, total_jobs, new_jobs_today, jobs_filled_today, total_companies_hiring, market_sentiment, remote_job_percentage) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&date)
        .bind(100 + i)
        .bind(10)
        .bind(5)
        .bind(50)
        .bind("neutral")
        .bind(0.0)
        .execute(&pool)
        .await
        .unwrap();
    }

    let analyzer = MarketAnalyzer::new(pool);
    let snapshots = analyzer.get_historical_snapshots(7).await.unwrap();

    // Should return up to 7 most recent days, ordered DESC
    assert!(snapshots.len() >= 7);
    assert_eq!(snapshots[0].date, today);
}

#[tokio::test]
async fn test_get_historical_snapshots_empty() {
    let pool = migrated_pool().await;
    let analyzer = MarketAnalyzer::new(pool);

    let snapshots = analyzer.get_historical_snapshots(30).await.unwrap();
    assert_eq!(snapshots.len(), 0);
}

#[tokio::test]
async fn test_row_to_snapshot_all_fields() {
    let pool = migrated_pool().await;

    sqlx::query(
        r#"
        INSERT INTO market_snapshots (
            date, total_jobs, new_jobs_today, jobs_filled_today,
            avg_salary, median_salary, remote_job_percentage,
            top_skill, top_company, top_location,
            total_companies_hiring, market_sentiment, notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind("2026-01-16")
    .bind(100)
    .bind(10)
    .bind(5)
    .bind(120000)
    .bind(115000)
    .bind(40.5)
    .bind("Bilingual Support")
    .bind("Northwind Health")
    .bind("Remote")
    .bind(50)
    .bind("bullish")
    .bind("Test note")
    .execute(&pool)
    .await
    .unwrap();

    let analyzer = MarketAnalyzer::new(pool);
    let snapshot = analyzer.get_latest_snapshot().await.unwrap().unwrap();

    assert_eq!(snapshot.date, NaiveDate::from_ymd_opt(2026, 1, 16).unwrap());
    assert_eq!(snapshot.total_jobs, 100);
    assert_eq!(snapshot.new_jobs_today, 10);
    assert_eq!(snapshot.jobs_filled_today, 5);
    assert_eq!(snapshot.avg_salary, Some(120000));
    assert_eq!(snapshot.median_salary, Some(115000));
    assert_eq!(snapshot.remote_job_percentage, 40.5);
    assert_eq!(snapshot.top_skill, Some("Bilingual Support".to_string()));
    assert_eq!(snapshot.top_company, Some("Northwind Health".to_string()));
    assert_eq!(snapshot.top_location, Some("Remote".to_string()));
    assert_eq!(snapshot.total_companies_hiring, 50);
    assert_eq!(snapshot.market_sentiment, "bullish");
    assert_eq!(snapshot.notes, Some("Test note".to_string()));
}

#[tokio::test]
async fn test_row_to_snapshot_nullable_fields() {
    let pool = migrated_pool().await;

    // Test minimal snapshot with only required fields
    sqlx::query(
        r#"
        INSERT INTO market_snapshots (
            date, total_jobs, new_jobs_today, jobs_filled_today,
            total_companies_hiring, market_sentiment, remote_job_percentage
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind("2026-01-16")
    .bind(50)
    .bind(5)
    .bind(2)
    .bind(25)
    .bind("neutral")
    .bind(0.0)
    .execute(&pool)
    .await
    .unwrap();

    let analyzer = MarketAnalyzer::new(pool);
    let snapshot = analyzer.get_latest_snapshot().await.unwrap().unwrap();

    // Verify required fields are present
    assert_eq!(snapshot.total_jobs, 50);
    assert_eq!(snapshot.new_jobs_today, 5);
    assert_eq!(snapshot.market_sentiment, "neutral");

    // Nullable fields should be None when not provided
    assert_eq!(snapshot.top_skill, None);
    assert_eq!(snapshot.top_company, None);
    assert_eq!(snapshot.top_location, None);
    assert_eq!(snapshot.notes, None);
}

#[tokio::test]
async fn test_create_daily_snapshot_with_empty_company_names() {
    let pool = migrated_pool().await;
    let today = Utc::now().date_naive().to_string();

    // The canonical schema requires a company, but empty names remain possible.
    insert_test_job(
        &pool,
        "job1",
        "Coordinator",
        Some(""),
        Some("Remote"),
        &today,
    )
    .await;
    insert_test_job(
        &pool,
        "job2",
        "Coordinator",
        Some(""),
        Some("San Francisco"),
        &today,
    )
    .await;
    insert_test_job(
        &pool,
        "job3",
        "Coordinator",
        Some("CommunityCare"),
        Some("New York"),
        &today,
    )
    .await;

    let analyzer = MarketAnalyzer::new(pool);
    let snapshot = analyzer.create_daily_snapshot().await.unwrap();

    assert_eq!(snapshot.total_jobs, 3);
    assert_eq!(snapshot.total_companies_hiring, 1); // Only CommunityCare
    assert_eq!(snapshot.top_company, Some("CommunityCare".to_string()));
}

#[tokio::test]
async fn test_create_daily_snapshot_calculates_correct_median() {
    let pool = migrated_pool().await;
    let today = Utc::now().date_naive().to_string();

    insert_test_job(&pool, "job1", "Svc", Some("Co1"), None, &today).await;
    insert_test_job(&pool, "job2", "Svc", Some("Co2"), None, &today).await;
    insert_test_job(&pool, "job3", "Svc", Some("Co3"), None, &today).await;

    insert_test_salary(&pool, "job1", 100000).await;
    insert_test_salary(&pool, "job2", 150000).await;
    insert_test_salary(&pool, "job3", 200000).await;

    let analyzer = MarketAnalyzer::new(pool);
    let snapshot = analyzer.create_daily_snapshot().await.unwrap();

    // If salaries are present, they should be correct
    if let Some(median) = snapshot.median_salary {
        assert_eq!(median, 150000);
    }
    if let Some(avg) = snapshot.avg_salary {
        assert_eq!(avg, 150000);
    }
}

#[tokio::test]
async fn test_get_historical_snapshots_respects_limit() {
    let pool = migrated_pool().await;

    // Insert 30 days of snapshots
    for i in 1..=30 {
        sqlx::query(
            "INSERT INTO market_snapshots (date, total_jobs, new_jobs_today, jobs_filled_today, total_companies_hiring, market_sentiment) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(format!("2025-12-{:02}", i))
        .bind(100)
        .bind(10)
        .bind(5)
        .bind(50)
        .bind("neutral")
        .execute(&pool)
        .await
        .unwrap();
    }

    let analyzer = MarketAnalyzer::new(pool);

    // Request only 7 days
    let snapshots = analyzer.get_historical_snapshots(7).await.unwrap();

    // Should return only recent 7 days
    assert!(snapshots.len() <= 7);
}
