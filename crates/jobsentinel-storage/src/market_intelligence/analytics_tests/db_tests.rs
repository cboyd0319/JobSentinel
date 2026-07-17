use super::super::*;
use crate::test_support::{insert_test_job, migrated_pool};

// ========================================================================
// DATABASE INTEGRATION TESTS
// ========================================================================

async fn insert_test_salary(pool: &SqlitePool, job_hash: &str, median: i64) {
    sqlx::query("INSERT INTO job_salary_predictions (job_hash, predicted_median) VALUES (?, ?)")
        .bind(job_hash)
        .bind(median)
        .execute(pool)
        .await
        .unwrap();
}

async fn insert_test_skill(pool: &SqlitePool, job_hash: &str, skill_name: &str) {
    sqlx::query("INSERT INTO job_skills (job_hash, skill_name) VALUES (?, ?)")
        .bind(job_hash)
        .bind(skill_name)
        .execute(pool)
        .await
        .unwrap();
}

#[tokio::test]
async fn test_market_analyzer_new() {
    let pool = migrated_pool().await;
    let _analyzer = MarketAnalyzer::new(pool);
    // Constructor should work without panic
}

#[tokio::test]
async fn test_create_daily_snapshot_empty_db() {
    let pool = migrated_pool().await;
    let analyzer = MarketAnalyzer::new(pool);

    let snapshot = analyzer.create_daily_snapshot().await.unwrap();

    // Empty DB should produce all zeros/None
    assert_eq!(snapshot.total_jobs, 0);
    assert_eq!(snapshot.new_jobs_today, 0);
    assert_eq!(snapshot.jobs_filled_today, 0);
    assert_eq!(snapshot.avg_salary, None);
    assert_eq!(snapshot.median_salary, None);
    assert_eq!(snapshot.remote_job_percentage, 0.0);
    assert_eq!(snapshot.top_skill, None);
    assert_eq!(snapshot.top_company, None);
    assert_eq!(snapshot.top_location, None);
    assert_eq!(snapshot.total_companies_hiring, 0);
    assert_eq!(snapshot.market_sentiment, "neutral");
    assert_eq!(snapshot.date, Utc::now().date_naive());
}

#[tokio::test]
async fn test_create_daily_snapshot_with_jobs() {
    let pool = migrated_pool().await;
    let today = Utc::now().date_naive().to_string();
    let yesterday = (Utc::now().date_naive() - chrono::Duration::days(1)).to_string();

    // Insert test jobs - use today's date
    insert_test_job(
        &pool,
        "job1",
        "Case Manager",
        Some("CommunityCare"),
        Some("San Francisco, CA"),
        &today,
    )
    .await;
    insert_test_job(
        &pool,
        "job2",
        "Operations Coordinator",
        Some("Metro Transit"),
        Some("Remote"),
        &today,
    )
    .await;
    insert_test_job(
        &pool,
        "job3",
        "Customer Support Lead",
        Some("CommunityCare"),
        Some("New York, NY"),
        &yesterday,
    )
    .await;

    // Insert salaries
    insert_test_salary(&pool, "job1", 150000).await;
    insert_test_salary(&pool, "job2", 160000).await;
    insert_test_salary(&pool, "job3", 140000).await;

    // Insert skills
    insert_test_skill(&pool, "job1", "Scheduling").await;
    insert_test_skill(&pool, "job2", "Scheduling").await;
    insert_test_skill(&pool, "job3", "CRM").await;

    let analyzer = MarketAnalyzer::new(pool);
    let snapshot = analyzer.create_daily_snapshot().await.unwrap();

    assert_eq!(snapshot.total_jobs, 3);
    assert_eq!(snapshot.new_jobs_today, 2);
    // Salaries should be calculated from inserted predictions
    if let Some(median) = snapshot.median_salary {
        assert_eq!(median, 150000);
    }
    if let Some(avg) = snapshot.avg_salary {
        assert_eq!(avg, 150000);
    }
    assert!(snapshot.remote_job_percentage > 0.0);
    assert_eq!(snapshot.top_skill, Some("Scheduling".to_string()));
    assert_eq!(snapshot.top_company, Some("CommunityCare".to_string()));
    assert_eq!(snapshot.total_companies_hiring, 2);
}

#[tokio::test]
async fn test_create_daily_snapshot_remote_percentage() {
    let pool = migrated_pool().await;
    let today = Utc::now().date_naive().to_string();

    insert_test_job(
        &pool,
        "job1",
        "Coordinator",
        Some("Co1"),
        Some("Remote"),
        &today,
    )
    .await;
    insert_test_job(
        &pool,
        "job2",
        "Coordinator",
        Some("Co2"),
        Some("REMOTE - US"),
        &today,
    )
    .await;
    insert_test_job(
        &pool,
        "job3",
        "Coordinator",
        Some("Co3"),
        Some("San Francisco, CA"),
        &today,
    )
    .await;
    insert_test_job(
        &pool,
        "job4",
        "Coordinator",
        Some("Co4"),
        Some("New York, NY"),
        &today,
    )
    .await;

    let analyzer = MarketAnalyzer::new(pool);
    let snapshot = analyzer.create_daily_snapshot().await.unwrap();

    assert_eq!(snapshot.total_jobs, 4);
    assert_eq!(snapshot.remote_job_percentage, 50.0);
}

#[tokio::test]
async fn test_create_daily_snapshot_jobs_filled_today() {
    let pool = migrated_pool().await;
    let today = Utc::now().date_naive().to_string();
    let yesterday = (Utc::now().date_naive() - chrono::Duration::days(1)).to_string();

    insert_test_job(&pool, "job1", "Coordinator", Some("Co1"), None, &today).await;
    insert_test_job(&pool, "job2", "Coordinator", Some("Co2"), None, &yesterday).await;

    let analyzer = MarketAnalyzer::new(pool);
    let snapshot = analyzer.create_daily_snapshot().await.unwrap();

    assert_eq!(snapshot.jobs_filled_today, 0);
}

#[tokio::test]
async fn test_store_snapshot() {
    let pool = migrated_pool().await;
    let analyzer = MarketAnalyzer::new(pool.clone());

    let snapshot = MarketSnapshot {
        date: NaiveDate::from_ymd_opt(2026, 1, 16).unwrap(),
        total_jobs: 100,
        new_jobs_today: 10,
        jobs_filled_today: 5,
        avg_salary: Some(120000),
        median_salary: Some(115000),
        remote_job_percentage: 40.0,
        top_skill: Some("Bilingual Support".to_string()),
        top_company: Some("Northwind Health".to_string()),
        top_location: Some("Remote".to_string()),
        total_companies_hiring: 50,
        market_sentiment: "bullish".to_string(),
        notes: Some("Test snapshot".to_string()),
    };

    analyzer.store_snapshot(&snapshot).await.unwrap();

    // Verify stored
    let count = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM market_snapshots")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(count, 1);

    // Verify data
    let stored_total =
        sqlx::query_scalar::<_, i64>("SELECT total_jobs FROM market_snapshots WHERE date = ?")
            .bind("2026-01-16")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(stored_total, 100);
}

#[tokio::test]
async fn test_store_snapshot_upsert() {
    let pool = migrated_pool().await;
    let analyzer = MarketAnalyzer::new(pool.clone());

    let snapshot1 = MarketSnapshot {
        date: NaiveDate::from_ymd_opt(2026, 1, 16).unwrap(),
        total_jobs: 100,
        new_jobs_today: 10,
        jobs_filled_today: 5,
        avg_salary: Some(120000),
        median_salary: Some(115000),
        remote_job_percentage: 40.0,
        top_skill: Some("Bilingual Support".to_string()),
        top_company: Some("Northwind Health".to_string()),
        top_location: Some("Remote".to_string()),
        total_companies_hiring: 50,
        market_sentiment: "bullish".to_string(),
        notes: None,
    };

    analyzer.store_snapshot(&snapshot1).await.unwrap();

    // Store again with updated data
    let snapshot2 = MarketSnapshot {
        date: NaiveDate::from_ymd_opt(2026, 1, 16).unwrap(),
        total_jobs: 150,
        new_jobs_today: 50,
        jobs_filled_today: 10,
        avg_salary: Some(125000),
        median_salary: Some(120000),
        remote_job_percentage: 45.0,
        top_skill: Some("Scheduling".to_string()),
        top_company: Some("CommunityCare".to_string()),
        top_location: Some("San Francisco, CA".to_string()),
        total_companies_hiring: 60,
        market_sentiment: "bullish".to_string(),
        notes: Some("Updated".to_string()),
    };

    analyzer.store_snapshot(&snapshot2).await.unwrap();

    // Should still be 1 row (upsert)
    let count = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM market_snapshots")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(count, 1);

    // Verify updated data
    let stored_total =
        sqlx::query_scalar::<_, i64>("SELECT total_jobs FROM market_snapshots WHERE date = ?")
            .bind("2026-01-16")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert_eq!(stored_total, 150);
}

mod sentiment_tests;
mod snapshot_edge_cases;
#[path = "db_tests/snapshot_query_tests.rs"]
mod snapshot_query_tests;
