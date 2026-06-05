use super::*;

#[tokio::test]
async fn test_calculate_market_sentiment_no_history() {
    let pool = setup_test_db().await;
    let analyzer = MarketAnalyzer::new(pool);

    let sentiment = analyzer.calculate_market_sentiment(100, 50).await.unwrap();
    assert_eq!(sentiment, "neutral");
}

#[tokio::test]
async fn test_calculate_market_sentiment_bullish() {
    let pool = setup_test_db().await;

    // Insert historical snapshots using relative dates (last 7 days)
    let today = chrono::Utc::now().date_naive();
    for i in 1..=7 {
        let date = today - chrono::Duration::days(i);
        sqlx::query(
            "INSERT INTO market_snapshots (date, total_jobs, new_jobs_today, jobs_filled_today, total_companies_hiring, market_sentiment) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(date.to_string())
        .bind(100)
        .bind(50)
        .bind(10)
        .bind(50)
        .bind("neutral")
        .execute(&pool)
        .await
        .unwrap();
    }

    let analyzer = MarketAnalyzer::new(pool);

    // 120% increase from average of 50
    let sentiment = analyzer.calculate_market_sentiment(110, 10).await.unwrap();
    assert_eq!(sentiment, "bullish");
}

#[tokio::test]
async fn test_calculate_market_sentiment_bearish() {
    let pool = setup_test_db().await;

    // Insert historical snapshots using relative dates (last 7 days)
    let today = chrono::Utc::now().date_naive();
    for i in 1..=7 {
        let date = today - chrono::Duration::days(i);
        sqlx::query(
            "INSERT INTO market_snapshots (date, total_jobs, new_jobs_today, jobs_filled_today, total_companies_hiring, market_sentiment) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(date.to_string())
        .bind(100)
        .bind(100)
        .bind(10)
        .bind(50)
        .bind("neutral")
        .execute(&pool)
        .await
        .unwrap();
    }

    let analyzer = MarketAnalyzer::new(pool);

    // 60% decrease from average of 100
    let sentiment = analyzer.calculate_market_sentiment(40, 10).await.unwrap();
    assert_eq!(sentiment, "bearish");
}

#[tokio::test]
async fn test_calculate_market_sentiment_neutral() {
    let pool = setup_test_db().await;

    // Insert historical snapshots using relative dates (last 7 days)
    let today = chrono::Utc::now().date_naive();
    for i in 1..=7 {
        let date = today - chrono::Duration::days(i);
        sqlx::query(
            "INSERT INTO market_snapshots (date, total_jobs, new_jobs_today, jobs_filled_today, total_companies_hiring, market_sentiment) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(date.to_string())
        .bind(100)
        .bind(100)
        .bind(10)
        .bind(50)
        .bind("neutral")
        .execute(&pool)
        .await
        .unwrap();
    }

    let analyzer = MarketAnalyzer::new(pool);

    // 10% increase from average of 100
    let sentiment = analyzer.calculate_market_sentiment(110, 10).await.unwrap();
    assert_eq!(sentiment, "neutral");
}
