use super::*;

#[test]
fn test_market_snapshot_bullish_healthy() {
    let snapshot = MarketSnapshot {
        date: Utc::now().date_naive(),
        total_jobs: 8000,
        new_jobs_today: 150,
        jobs_filled_today: 60,
        avg_salary: Some(145000),
        median_salary: Some(140000),
        remote_job_percentage: 50.0,
        top_skill: Some("Scheduling".to_string()),
        top_company: Some("City Outreach".to_string()),
        top_location: Some("Los Angeles, CA".to_string()),
        total_companies_hiring: 500,
        market_sentiment: "bullish".to_string(),
        notes: None,
    };

    assert!(snapshot.is_healthy());
    assert_eq!(snapshot.sentiment_indicator(), "[UP]");
}

#[test]
fn test_market_snapshot_partial_data() {
    let snapshot = MarketSnapshot {
        date: Utc::now().date_naive(),
        total_jobs: 3000,
        new_jobs_today: 50,
        jobs_filled_today: 30,
        avg_salary: None,
        median_salary: None,
        remote_job_percentage: 0.0,
        top_skill: None,
        top_company: Some("StartupCo".to_string()),
        top_location: None,
        total_companies_hiring: 100,
        market_sentiment: "neutral".to_string(),
        notes: None,
    };

    assert!(snapshot.is_healthy());
    assert!(snapshot.avg_salary.is_none());
    assert!(snapshot.median_salary.is_none());
}

#[test]
fn test_market_snapshot_all_none() {
    let snapshot = MarketSnapshot {
        date: Utc::now().date_naive(),
        total_jobs: 0,
        new_jobs_today: 0,
        jobs_filled_today: 0,
        avg_salary: None,
        median_salary: None,
        remote_job_percentage: 0.0,
        top_skill: None,
        top_company: None,
        top_location: None,
        total_companies_hiring: 0,
        market_sentiment: "bearish".to_string(),
        notes: None,
    };

    assert!(!snapshot.is_healthy());
    assert!(snapshot.summary().contains("N/A"));
}

#[test]
fn test_compute_median_fractional_positions() {
    let mut values = vec![1.0, 2.0, 3.0, 4.0, 5.0, 6.0];
    assert_eq!(median(&mut values), Some(3.5));

    let mut values2 = vec![1.0, 2.0, 3.0, 4.0, 5.0];
    assert_eq!(median(&mut values2), Some(3.0));
}
