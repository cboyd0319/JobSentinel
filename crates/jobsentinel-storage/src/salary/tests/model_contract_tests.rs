use super::*;

#[test]
fn test_seniority_level_serde() {
    let level = SeniorityLevel::Senior;
    let json = serde_json::to_string(&level).unwrap();
    assert_eq!(json, r#""Senior""#);

    let deserialized: SeniorityLevel = serde_json::from_str(&json).unwrap();
    assert_eq!(deserialized, SeniorityLevel::Senior);
}

#[test]
fn test_salary_prediction_creation() {
    let prediction = SalaryPrediction {
        job_hash: "test_hash_123".to_string(),
        predicted_min: 100000,
        predicted_max: 180000,
        predicted_median: 140000,
        confidence_score: 0.85,
        prediction_method: "h1b_benchmark".to_string(),
        data_points_used: 42,
        created_at: Utc::now(),
    };

    assert_eq!(prediction.job_hash, "test_hash_123");
    assert_eq!(prediction.predicted_min, 100000);
    assert_eq!(prediction.predicted_max, 180000);
    assert_eq!(prediction.predicted_median, 140000);
    assert_eq!(prediction.confidence_score, 0.85);
    assert_eq!(prediction.data_points_used, 42);
}

#[test]
fn test_salary_prediction_serde() {
    let prediction = SalaryPrediction {
        job_hash: "abc123".to_string(),
        predicted_min: 120000,
        predicted_max: 160000,
        predicted_median: 140000,
        confidence_score: 0.9,
        prediction_method: "ml_model".to_string(),
        data_points_used: 100,
        created_at: Utc::now(),
    };

    let json = serde_json::to_string(&prediction).unwrap();
    let deserialized: SalaryPrediction = serde_json::from_str(&json).unwrap();

    assert_eq!(deserialized.job_hash, "abc123");
    assert_eq!(deserialized.predicted_min, 120000);
    assert_eq!(deserialized.predicted_max, 160000);
    assert_eq!(deserialized.predicted_median, 140000);
    assert_eq!(deserialized.confidence_score, 0.9);
    assert_eq!(deserialized.prediction_method, "ml_model");
    assert_eq!(deserialized.data_points_used, 100);
}

#[test]
fn test_offer_comparison_creation() {
    let comparison = OfferComparison {
        offer_id: 1,
        company: "CommunityCare".to_string(),
        base_salary: 150000,
        total_compensation: 180000,
        market_median: Some(140000),
        market_position: "at_market".to_string(),
        recommendation: "Fair offer. Consider negotiating for 10-15% more.".to_string(),
    };

    assert_eq!(comparison.offer_id, 1);
    assert_eq!(comparison.company, "CommunityCare");
    assert_eq!(comparison.base_salary, 150000);
    assert_eq!(comparison.total_compensation, 180000);
    assert_eq!(comparison.market_median, Some(140000));
    assert_eq!(comparison.market_position, "at_market");
}

#[test]
fn test_offer_comparison_without_market_data() {
    let comparison = OfferComparison {
        offer_id: 2,
        company: "Harbor Retail".to_string(),
        base_salary: 130000,
        total_compensation: 150000,
        market_median: None,
        market_position: "unknown".to_string(),
        recommendation: "Insufficient data for recommendation.".to_string(),
    };

    assert_eq!(comparison.market_median, None);
    assert_eq!(comparison.market_position, "unknown");
    assert_eq!(
        comparison.recommendation,
        "Insufficient data for recommendation."
    );
}

#[test]
fn test_seniority_level_clone() {
    let level = SeniorityLevel::Senior;
    let cloned = level.clone();
    assert_eq!(level, cloned);
}

#[test]
fn test_seniority_level_debug() {
    let level = SeniorityLevel::Principal;
    let debug_str = format!("{level:?}");
    assert!(debug_str.contains("Principal"));
}
