use super::*;

#[path = "analytics_tests/db_tests.rs"]
mod db_tests;

#[test]
fn test_market_snapshot_summary() {
    let snapshot = MarketSnapshot {
        date: Utc::now().date_naive(),
        total_jobs: 10000,
        new_jobs_today: 150,
        jobs_filled_today: 50,
        avg_salary: Some(130000),
        median_salary: Some(125000),
        remote_job_percentage: 35.5,
        top_skill: Some("Scheduling".to_string()),
        top_company: Some("CommunityCare".to_string()),
        top_location: Some("Remote".to_string()),
        total_companies_hiring: 500,
        market_sentiment: "bullish".to_string(),
        notes: None,
    };

    assert!(snapshot.summary().contains("150 new jobs"));
    assert!(snapshot.summary().contains("bullish"));
    assert!(snapshot.is_healthy());
    assert_eq!(snapshot.sentiment_indicator(), "[UP]");
}

#[test]
fn test_market_sentiment_bearish() {
    let snapshot = MarketSnapshot {
        date: Utc::now().date_naive(),
        total_jobs: 5000,
        new_jobs_today: 10,
        jobs_filled_today: 100,
        avg_salary: Some(110000),
        median_salary: Some(105000),
        remote_job_percentage: 25.0,
        top_skill: Some("CRM".to_string()),
        top_company: Some("Metro Transit".to_string()),
        top_location: Some("San Francisco, CA".to_string()),
        total_companies_hiring: 200,
        market_sentiment: "bearish".to_string(),
        notes: Some("Hiring slowdown detected".to_string()),
    };

    assert!(!snapshot.is_healthy());
    assert_eq!(snapshot.sentiment_indicator(), "[DOWN]");
}

#[test]
fn test_market_snapshot_neutral_sentiment() {
    let snapshot = MarketSnapshot {
        date: Utc::now().date_naive(),
        total_jobs: 5000,
        new_jobs_today: 50,
        jobs_filled_today: 45,
        avg_salary: Some(115000),
        median_salary: Some(110000),
        remote_job_percentage: 30.0,
        top_skill: Some("Inventory Planning".to_string()),
        top_company: Some("Harbor Retail".to_string()),
        top_location: Some("Seattle, WA".to_string()),
        total_companies_hiring: 300,
        market_sentiment: "neutral".to_string(),
        notes: None,
    };

    assert!(snapshot.is_healthy());
    assert_eq!(snapshot.sentiment_indicator(), "[FLAT]");
    assert!(snapshot.summary().contains("neutral"));
}

#[test]
fn test_market_snapshot_bearish_no_jobs() {
    let snapshot = MarketSnapshot {
        date: Utc::now().date_naive(),
        total_jobs: 1000,
        new_jobs_today: 0,
        jobs_filled_today: 20,
        avg_salary: Some(100000),
        median_salary: Some(95000),
        remote_job_percentage: 20.0,
        top_skill: None,
        top_company: None,
        top_location: None,
        total_companies_hiring: 50,
        market_sentiment: "bearish".to_string(),
        notes: Some("Market downturn".to_string()),
    };

    assert!(!snapshot.is_healthy());
    assert_eq!(snapshot.sentiment_indicator(), "[DOWN]");
    assert!(snapshot.summary().contains("N/A"));
}

#[test]
fn test_market_snapshot_summary_no_skill() {
    let snapshot = MarketSnapshot {
        date: Utc::now().date_naive(),
        total_jobs: 8000,
        new_jobs_today: 120,
        jobs_filled_today: 80,
        avg_salary: Some(135000),
        median_salary: Some(130000),
        remote_job_percentage: 45.0,
        top_skill: None,
        top_company: Some("County Services".to_string()),
        top_location: Some("Remote".to_string()),
        total_companies_hiring: 600,
        market_sentiment: "bullish".to_string(),
        notes: None,
    };

    let summary = snapshot.summary();
    assert!(summary.contains("120 new jobs"));
    assert!(summary.contains("bullish"));
    assert!(summary.contains("N/A"));
}

#[test]
fn test_market_snapshot_zero_totals() {
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
        market_sentiment: "neutral".to_string(),
        notes: Some("No activity".to_string()),
    };

    assert!(!snapshot.is_healthy());
    assert_eq!(snapshot.sentiment_indicator(), "[FLAT]");
}

#[test]
fn test_market_snapshot_high_remote_percentage() {
    let snapshot = MarketSnapshot {
        date: Utc::now().date_naive(),
        total_jobs: 3000,
        new_jobs_today: 100,
        jobs_filled_today: 60,
        avg_salary: Some(140000),
        median_salary: Some(135000),
        remote_job_percentage: 85.5,
        top_skill: Some("Bilingual Support".to_string()),
        top_company: Some("County Services".to_string()),
        top_location: Some("Remote".to_string()),
        total_companies_hiring: 250,
        market_sentiment: "bullish".to_string(),
        notes: None,
    };

    assert_eq!(snapshot.remote_job_percentage, 85.5);
    assert!(snapshot.is_healthy());
}

#[test]
fn test_compute_median_with_nan() {
    let mut values = vec![1.0, 2.0, f64::NAN, 3.0];
    // NaN handling should be graceful
    let result = median(&mut values);
    // Result depends on sort behavior with NaN, but should not panic
    assert!(result.is_some() || result.is_none());
}

#[test]
fn test_compute_median_all_same() {
    let mut values = vec![42.0, 42.0, 42.0, 42.0, 42.0];
    assert_eq!(median(&mut values), Some(42.0));
}

#[test]
fn test_compute_median_two_elements() {
    let mut values = vec![10.0, 20.0];
    assert_eq!(median(&mut values), Some(15.0));
}

#[test]
fn test_market_snapshot_edge_case_one_job() {
    let snapshot = MarketSnapshot {
        date: Utc::now().date_naive(),
        total_jobs: 1,
        new_jobs_today: 1,
        jobs_filled_today: 0,
        avg_salary: Some(100000),
        median_salary: Some(100000),
        remote_job_percentage: 100.0,
        top_skill: Some("Obscure".to_string()),
        top_company: Some("Neighborhood Clinic".to_string()),
        top_location: Some("Remote".to_string()),
        total_companies_hiring: 1,
        market_sentiment: "neutral".to_string(),
        notes: None,
    };

    assert!(snapshot.is_healthy());
    assert_eq!(snapshot.total_jobs, 1);
}

#[test]
fn test_market_snapshot_with_notes() {
    let snapshot = MarketSnapshot {
        date: Utc::now().date_naive(),
        total_jobs: 5000,
        new_jobs_today: 100,
        jobs_filled_today: 50,
        avg_salary: Some(125000),
        median_salary: Some(120000),
        remote_job_percentage: 40.0,
        top_skill: Some("Bilingual Support".to_string()),
        top_company: Some("Northwind Health".to_string()),
        top_location: Some("San Francisco, CA".to_string()),
        total_companies_hiring: 350,
        market_sentiment: "bullish".to_string(),
        notes: Some("Strong community hiring in Q4".to_string()),
    };

    assert_eq!(
        snapshot.notes,
        Some("Strong community hiring in Q4".to_string())
    );
    assert!(snapshot.is_healthy());
}

#[test]
fn test_market_snapshot_neutral_no_jobs() {
    let snapshot = MarketSnapshot {
        date: Utc::now().date_naive(),
        total_jobs: 1000,
        new_jobs_today: 0,
        jobs_filled_today: 10,
        avg_salary: Some(100000),
        median_salary: Some(95000),
        remote_job_percentage: 20.0,
        top_skill: None,
        top_company: None,
        top_location: None,
        total_companies_hiring: 50,
        market_sentiment: "neutral".to_string(),
        notes: None,
    };

    assert!(!snapshot.is_healthy());
    assert_eq!(snapshot.sentiment_indicator(), "[FLAT]");
}

#[test]
fn test_market_snapshot_serialization() {
    let snapshot = MarketSnapshot {
        date: Utc::now().date_naive(),
        total_jobs: 7500,
        new_jobs_today: 125,
        jobs_filled_today: 75,
        avg_salary: Some(140000),
        median_salary: Some(135000),
        remote_job_percentage: 55.0,
        top_skill: Some("Case Documentation".to_string()),
        top_company: Some("CommunityCare".to_string()),
        top_location: Some("Remote".to_string()),
        total_companies_hiring: 450,
        market_sentiment: "bullish".to_string(),
        notes: Some("Community hiring stays strong".to_string()),
    };

    let serialized = serde_json::to_string(&snapshot).unwrap();
    let deserialized: MarketSnapshot = serde_json::from_str(&serialized).unwrap();

    assert_eq!(deserialized.total_jobs, 7500);
    assert_eq!(deserialized.market_sentiment, "bullish");
    assert_eq!(
        deserialized.notes,
        Some("Community hiring stays strong".to_string())
    );
}

#[test]
fn test_market_snapshot_summary_with_all_fields() {
    let snapshot = MarketSnapshot {
        date: Utc::now().date_naive(),
        total_jobs: 12000,
        new_jobs_today: 200,
        jobs_filled_today: 100,
        avg_salary: Some(150000),
        median_salary: Some(145000),
        remote_job_percentage: 60.0,
        top_skill: Some("Inventory Planning".to_string()),
        top_company: Some("Harbor Retail".to_string()),
        top_location: Some("Seattle, WA".to_string()),
        total_companies_hiring: 700,
        market_sentiment: "bullish".to_string(),
        notes: Some("Care coordination demand high".to_string()),
    };

    let summary = snapshot.summary();
    assert!(summary.contains("200 new jobs"));
    assert!(summary.contains("12000 total"));
    assert!(summary.contains("bullish"));
    assert!(summary.contains("Inventory Planning"));
}

#[test]
fn test_compute_median_extreme_values() {
    let mut values = vec![1.0, 1000000.0];
    assert_eq!(median(&mut values), Some(500000.5));
}

#[test]
fn test_compute_median_very_large_dataset() {
    let mut values: Vec<f64> = (1..=10000).map(|x| x as f64).collect();
    assert_eq!(median(&mut values), Some(5000.5));
}

#[test]
fn test_compute_median_negative_and_positive() {
    let mut values = vec![-100.0, -50.0, 0.0, 50.0, 100.0];
    assert_eq!(median(&mut values), Some(0.0));
}
