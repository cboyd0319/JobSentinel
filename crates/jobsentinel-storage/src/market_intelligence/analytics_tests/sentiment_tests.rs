use super::*;

async fn insert_historical_snapshots(pool: &SqlitePool, new_jobs_today: i64) {
    let today = chrono::Utc::now().date_naive();
    for days_ago in 1..=7 {
        let date = today - chrono::Duration::days(days_ago);
        sqlx::query(
            "INSERT INTO market_snapshots (date, total_jobs, new_jobs_today, jobs_filled_today, total_companies_hiring, market_sentiment) VALUES (?, 100, ?, 10, 50, 'neutral')",
        )
        .bind(date.to_string())
        .bind(new_jobs_today)
        .execute(pool)
        .await
        .unwrap();
    }
}

#[tokio::test]
async fn test_calculate_market_sentiment_no_history() {
    let pool = migrated_pool().await;
    let analyzer = MarketAnalyzer::new(pool);

    let sentiment = analyzer.calculate_market_sentiment(100, 50).await.unwrap();
    assert_eq!(sentiment, "neutral");
}

#[tokio::test]
async fn test_calculate_market_sentiment_bullish() {
    let pool = migrated_pool().await;

    insert_historical_snapshots(&pool, 50).await;

    let analyzer = MarketAnalyzer::new(pool);

    // 120% increase from average of 50
    let sentiment = analyzer.calculate_market_sentiment(110, 10).await.unwrap();
    assert_eq!(sentiment, "bullish");
}

#[tokio::test]
async fn test_calculate_market_sentiment_bearish() {
    let pool = migrated_pool().await;

    insert_historical_snapshots(&pool, 100).await;

    let analyzer = MarketAnalyzer::new(pool);

    // 60% decrease from average of 100
    let sentiment = analyzer.calculate_market_sentiment(40, 10).await.unwrap();
    assert_eq!(sentiment, "bearish");
}

#[tokio::test]
async fn test_calculate_market_sentiment_neutral() {
    let pool = migrated_pool().await;

    insert_historical_snapshots(&pool, 100).await;

    let analyzer = MarketAnalyzer::new(pool);

    // 10% increase from average of 100
    let sentiment = analyzer.calculate_market_sentiment(110, 10).await.unwrap();
    assert_eq!(sentiment, "neutral");
}
