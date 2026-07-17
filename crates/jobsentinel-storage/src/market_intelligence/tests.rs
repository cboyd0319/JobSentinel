//! Tests for market intelligence module

use super::*;

#[tokio::test]
async fn test_run_daily_analysis_empty_migrated_database() {
    let database = crate::Database::connect_memory().await.unwrap();
    database.migrate().await.unwrap();
    let market = MarketIntelligence::new(database.pool().clone());

    let snapshot = market.run_daily_analysis().await.unwrap();

    assert_eq!(snapshot.total_jobs, 0);
    assert_eq!(snapshot.new_jobs_today, 0);
    assert_eq!(snapshot.jobs_filled_today, 0);

    let snapshot_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM market_snapshots")
        .fetch_one(database.pool())
        .await
        .unwrap();
    assert_eq!(snapshot_count, 1);
}

#[tokio::test]
async fn test_run_daily_analysis_counts_hidden_jobs_as_market_evidence() {
    let database = crate::Database::connect_memory().await.unwrap();
    database.migrate().await.unwrap();

    sqlx::query(
        r#"
        INSERT INTO jobs (
            hash, title, company, url, source, created_at, updated_at, last_seen, hidden
        )
        VALUES
            ('visible-market-job', 'Office Assistant', 'Market Co', 'https://example.com/visible', 'manual', datetime('now'), datetime('now'), datetime('now'), 0),
            ('hidden-market-job', 'Administrative Assistant', 'Hidden Co', 'https://example.com/hidden', 'manual', datetime('now'), datetime('now'), datetime('now'), 1)
        "#,
    )
    .execute(database.pool())
    .await
    .unwrap();

    let market = MarketIntelligence::new(database.pool().clone());
    let snapshot = market.run_daily_analysis().await.unwrap();

    assert_eq!(snapshot.total_jobs, 2);
    assert_eq!(snapshot.new_jobs_today, 2);
    assert_eq!(snapshot.total_companies_hiring, 2);

    let hidden_company_activity: (i64, i64) = sqlx::query_as(
        r#"
        SELECT jobs_active_count, is_actively_hiring
        FROM company_hiring_velocity
        WHERE company_name = 'Hidden Co'
        "#,
    )
    .fetch_one(database.pool())
    .await
    .unwrap();

    assert_eq!(hidden_company_activity, (1, 1));
}

#[test]
fn test_compute_median_odd_length() {
    let mut values = vec![5.0, 1.0, 3.0];
    assert_eq!(super::computations::compute_median(&mut values), Some(3.0));
}

#[test]
fn test_compute_median_even_length() {
    let mut values = vec![1.0, 2.0, 3.0, 4.0];
    assert_eq!(super::computations::compute_median(&mut values), Some(2.5));
}

#[test]
fn test_compute_median_single_value() {
    let mut values = vec![42.0];
    assert_eq!(super::computations::compute_median(&mut values), Some(42.0));
}

#[test]
fn test_compute_median_empty() {
    let mut values: Vec<f64> = vec![];
    assert_eq!(super::computations::compute_median(&mut values), None);
}

#[test]
fn test_compute_median_unsorted() {
    let mut values = vec![10.0, 5.0, 20.0, 15.0];
    assert_eq!(super::computations::compute_median(&mut values), Some(12.5));
}

#[test]
fn test_compute_median_with_duplicates() {
    let mut values = vec![5.0, 5.0, 5.0];
    assert_eq!(super::computations::compute_median(&mut values), Some(5.0));
}

#[test]
fn test_compute_median_negative_values() {
    let mut values = vec![-10.0, -5.0, 0.0, 5.0];
    assert_eq!(super::computations::compute_median(&mut values), Some(-2.5));
}

#[test]
fn test_compute_median_large_dataset() {
    let mut values: Vec<f64> = (1..=1000).map(|x| x as f64).collect();
    assert_eq!(
        super::computations::compute_median(&mut values),
        Some(500.5)
    );
}

#[test]
fn test_skill_trend_data() {
    let trend = super::queries::SkillTrend {
        skill_name: "Case Management".to_string(),
        total_jobs: 250,
        avg_salary: Some(65000),
        change_percent: 10.0,
        trend_direction: "up".to_string(),
    };

    assert_eq!(trend.skill_name, "Case Management");
    assert_eq!(trend.total_jobs, 250);
    assert_eq!(trend.avg_salary, Some(65000));
}

#[test]
fn test_skill_trend_no_salary() {
    let trend = super::queries::SkillTrend {
        skill_name: "Customer Support".to_string(),
        total_jobs: 500,
        avg_salary: None,
        change_percent: -3.0,
        trend_direction: "flat".to_string(),
    };

    assert!(trend.avg_salary.is_none());
}

#[test]
fn test_company_activity_data() {
    let activity = super::queries::CompanyActivity {
        company_name: "Community Care Network".to_string(),
        total_posted: 50,
        avg_active: 30.5,
        hiring_trend: Some("increasing".to_string()),
        avg_salary: Some(65000),
        growth_rate: 8.5,
    };

    assert_eq!(activity.company_name, "Community Care Network");
    assert_eq!(activity.total_posted, 50);
    assert_eq!(activity.avg_active, 30.5);
    assert_eq!(activity.hiring_trend, Some("increasing".to_string()));
}

#[test]
fn test_company_activity_no_trend() {
    let activity = super::queries::CompanyActivity {
        company_name: "StartupCo".to_string(),
        total_posted: 5,
        avg_active: 3.0,
        hiring_trend: None,
        avg_salary: None,
        growth_rate: 0.0,
    };

    assert!(activity.hiring_trend.is_none());
}

#[test]
fn test_location_heat_data() {
    let heat = super::queries::LocationHeat {
        location: "san francisco, ca".to_string(),
        city: Some("San Francisco".to_string()),
        state: Some("CA".to_string()),
        total_jobs: 1500,
        avg_median_salary: Some(165000),
        remote_percent: 25.0,
    };

    assert_eq!(heat.location, "san francisco, ca");
    assert_eq!(heat.city, Some("San Francisco".to_string()));
    assert_eq!(heat.total_jobs, 1500);
    assert_eq!(heat.avg_median_salary, Some(165000));
}

#[test]
fn test_location_heat_no_salary_data() {
    let heat = super::queries::LocationHeat {
        location: "remote".to_string(),
        city: None,
        state: None,
        total_jobs: 800,
        avg_median_salary: None,
        remote_percent: 100.0,
    };

    assert!(heat.avg_median_salary.is_none());
    assert!(heat.city.is_none());
}

#[test]
fn test_parse_location_city_state() {
    let location = "Seattle, WA";
    let parts: Vec<&str> = location.split(',').map(|s| s.trim()).collect();
    let (city, state) = if parts.len() >= 2 {
        (Some(parts[0].to_string()), Some(parts[1].to_string()))
    } else {
        (Some(location.to_string()), None)
    };
    assert_eq!(city, Some("Seattle".to_string()));
    assert_eq!(state, Some("WA".to_string()));
}

#[test]
fn test_parse_location_city_only() {
    let location = "London";
    let parts: Vec<&str> = location.split(',').map(|s| s.trim()).collect();
    let (city, state) = if parts.len() >= 2 {
        (Some(parts[0].to_string()), Some(parts[1].to_string()))
    } else {
        (Some(location.to_string()), None)
    };
    assert_eq!(city, Some("London".to_string()));
    assert_eq!(state, None);
}

#[test]
fn test_parse_location_with_extra_parts() {
    let location = "New York, NY, USA";
    let parts: Vec<&str> = location.split(',').map(|s| s.trim()).collect();
    let (city, state) = if parts.len() >= 2 {
        (Some(parts[0].to_string()), Some(parts[1].to_string()))
    } else {
        (Some(location.to_string()), None)
    };
    assert_eq!(city, Some("New York".to_string()));
    assert_eq!(state, Some("NY".to_string()));
}

#[test]
fn test_parse_location_empty() {
    let location = "";
    let parts: Vec<&str> = location.split(',').map(|s| s.trim()).collect();
    let (city, state) = if parts.len() >= 2 {
        (Some(parts[0].to_string()), Some(parts[1].to_string()))
    } else {
        (Some(location.to_string()), None)
    };
    assert_eq!(city, Some("".to_string()));
    assert_eq!(state, None);
}

#[test]
fn test_compute_median_with_floats() {
    let mut values = vec![1.5, 2.5, 3.5, 4.5];
    assert_eq!(super::computations::compute_median(&mut values), Some(3.0));
}

#[test]
fn test_compute_median_precision() {
    let mut values = vec![100.1, 100.2, 100.3];
    assert_eq!(
        super::computations::compute_median(&mut values),
        Some(100.2)
    );
}

#[test]
fn test_skill_trend_serialization() {
    let trend = super::queries::SkillTrend {
        skill_name: "Inventory Planning".to_string(),
        total_jobs: 300,
        avg_salary: Some(58000),
        change_percent: 15.5,
        trend_direction: "up".to_string(),
    };

    let serialized = serde_json::to_string(&trend).unwrap();
    let deserialized: super::queries::SkillTrend = serde_json::from_str(&serialized).unwrap();

    assert_eq!(deserialized.skill_name, "Inventory Planning");
    assert_eq!(deserialized.total_jobs, 300);
    assert_eq!(deserialized.avg_salary, Some(58000));
    assert_eq!(deserialized.change_percent, 15.5);
    assert_eq!(deserialized.trend_direction, "up");
}

#[test]
fn test_company_activity_serialization() {
    let activity = super::queries::CompanyActivity {
        company_name: "Microsoft".to_string(),
        total_posted: 100,
        avg_active: 75.5,
        hiring_trend: Some("stable".to_string()),
        avg_salary: Some(180000),
        growth_rate: 12.3,
    };

    let serialized = serde_json::to_string(&activity).unwrap();
    let deserialized: super::queries::CompanyActivity = serde_json::from_str(&serialized).unwrap();

    assert_eq!(deserialized.company_name, "Microsoft");
    assert_eq!(deserialized.total_posted, 100);
    assert_eq!(deserialized.avg_salary, Some(180000));
    assert_eq!(deserialized.growth_rate, 12.3);
}

#[test]
fn test_location_heat_serialization() {
    let heat = super::queries::LocationHeat {
        location: "austin, tx".to_string(),
        city: Some("Austin".to_string()),
        state: Some("TX".to_string()),
        total_jobs: 450,
        avg_median_salary: Some(120000),
        remote_percent: 35.0,
    };

    let serialized = serde_json::to_string(&heat).unwrap();
    let deserialized: super::queries::LocationHeat = serde_json::from_str(&serialized).unwrap();

    assert_eq!(deserialized.location, "austin, tx");
    assert_eq!(deserialized.total_jobs, 450);
    assert_eq!(deserialized.remote_percent, 35.0);
}

#[path = "tests/async_tests.rs"]
mod async_tests;
