use super::*;
use chrono::Utc;

#[test]
fn test_skill_growth_calculation() {
    let today = Utc::now().date_naive();
    let prev = SkillDemandTrend {
        id: 1,
        skill_name: "Scheduling".to_string(),
        date: today,
        mention_count: 100,
        job_count: 50,
        avg_salary: Some(120000),
        median_salary: Some(115000),
        top_company: None,
        top_location: None,
    };

    let curr = SkillDemandTrend {
        id: 2,
        skill_name: "Scheduling".to_string(),
        date: today,
        mention_count: 150,
        job_count: 75,
        avg_salary: Some(125000),
        median_salary: Some(120000),
        top_company: None,
        top_location: None,
    };

    assert_eq!(curr.calculate_growth(&prev), 50.0);
    assert!(curr.is_trending_up(&prev, 25.0));
}

#[test]
fn test_salary_trend_growth() {
    let today = Utc::now().date_naive();
    let trend = SalaryTrend {
        id: 1,
        job_title_normalized: "case manager".to_string(),
        location_normalized: "san francisco, ca".to_string(),
        date: today,
        min_salary: 100000,
        p25_salary: 120000,
        median_salary: 150000,
        p75_salary: 180000,
        max_salary: 250000,
        avg_salary: 155000,
        sample_size: 100,
        salary_growth_pct: Some(12.5),
    };

    assert!(trend.is_growing());
    assert!(trend.is_significant_growth());
    assert_eq!(
        trend.range_description(),
        "$100,000-$250,000 (median: $150,000)"
    );
}

#[test]
fn test_role_demand_analysis() {
    let today = Utc::now().date_naive();
    let role = RoleDemandTrend {
        id: 1,
        job_title_normalized: "case manager".to_string(),
        date: today,
        job_count: 500,
        avg_salary: Some(150000),
        median_salary: Some(145000),
        top_company: Some("CommunityCare".to_string()),
        top_location: Some("Remote".to_string()),
        avg_experience_years: Some(4.5),
        remote_percentage: Some(65.0),
        demand_trend: Some("rising".to_string()),
    };

    assert!(role.is_high_demand(100));
    assert!(role.is_remote_friendly());
    assert_eq!(role.trend_direction(), "rising");
}

#[test]
fn test_company_hiring_velocity() {
    let today = Utc::now().date_naive();
    let velocity = CompanyHiringVelocity {
        id: 1,
        company_name: "County Services".to_string(),
        date: today,
        jobs_posted_count: 25,
        jobs_filled_count: 15,
        jobs_active_count: 50,
        avg_days_to_fill: Some(30.0),
        top_role: Some("Case Manager".to_string()),
        top_location: Some("Remote".to_string()),
        is_actively_hiring: true,
        hiring_trend: Some("increasing".to_string()),
    };

    assert!(velocity.is_aggressive_hiring());
    assert_eq!(velocity.fill_rate(), 60.0);
}

#[test]
fn test_location_density() {
    let today = Utc::now().date_naive();
    let density = LocationJobDensity {
        id: 1,
        location_normalized: "san francisco, ca".to_string(),
        city: Some("San Francisco".to_string()),
        state: Some("CA".to_string()),
        country: "US".to_string(),
        date: today,
        job_count: 1000,
        remote_job_count: 400,
        avg_salary: Some(160000),
        median_salary: Some(150000),
        top_skill: Some("CRM".to_string()),
        top_company: Some("Metro Transit".to_string()),
        top_role: Some("Case Manager".to_string()),
        latitude: Some(37.7749),
        longitude: Some(-122.4194),
    };

    assert_eq!(density.remote_percentage(), 40.0);
    assert!(density.is_hot_market(500));
    assert_eq!(density.location_display(), "San Francisco, CA");
}

#[test]
fn test_skill_growth_zero_previous() {
    let today = Utc::now().date_naive();
    let prev = SkillDemandTrend {
        id: 1,
        skill_name: "Bilingual Support".to_string(),
        date: today,
        mention_count: 0,
        job_count: 0,
        avg_salary: None,
        median_salary: None,
        top_company: None,
        top_location: None,
    };

    let curr = SkillDemandTrend {
        id: 2,
        skill_name: "Bilingual Support".to_string(),
        date: today,
        mention_count: 50,
        job_count: 25,
        avg_salary: Some(130000),
        median_salary: Some(125000),
        top_company: None,
        top_location: None,
    };

    assert_eq!(curr.calculate_growth(&prev), 0.0);
}

#[test]
fn test_skill_negative_growth() {
    let today = Utc::now().date_naive();
    let prev = SkillDemandTrend {
        id: 1,
        skill_name: "Paper Intake".to_string(),
        date: today,
        mention_count: 200,
        job_count: 100,
        avg_salary: Some(100000),
        median_salary: Some(95000),
        top_company: None,
        top_location: None,
    };

    let curr = SkillDemandTrend {
        id: 2,
        skill_name: "Paper Intake".to_string(),
        date: today,
        mention_count: 100,
        job_count: 50,
        avg_salary: Some(90000),
        median_salary: Some(85000),
        top_company: None,
        top_location: None,
    };

    assert_eq!(curr.calculate_growth(&prev), -50.0);
    assert!(!curr.is_trending_up(&prev, 25.0));
}

#[test]
fn test_skill_exact_threshold() {
    let today = Utc::now().date_naive();
    let prev = SkillDemandTrend {
        id: 1,
        skill_name: "Inventory Planning".to_string(),
        date: today,
        mention_count: 100,
        job_count: 50,
        avg_salary: Some(120000),
        median_salary: Some(115000),
        top_company: None,
        top_location: None,
    };

    let curr = SkillDemandTrend {
        id: 2,
        skill_name: "Inventory Planning".to_string(),
        date: today,
        mention_count: 125,
        job_count: 62,
        avg_salary: Some(125000),
        median_salary: Some(120000),
        top_company: None,
        top_location: None,
    };

    assert_eq!(curr.calculate_growth(&prev), 25.0);
    assert!(curr.is_trending_up(&prev, 25.0));
}

#[test]
fn test_salary_trend_no_growth() {
    let today = Utc::now().date_naive();
    let trend = SalaryTrend {
        id: 1,
        job_title_normalized: "support specialist".to_string(),
        location_normalized: "remote".to_string(),
        date: today,
        min_salary: 80000,
        p25_salary: 100000,
        median_salary: 120000,
        p75_salary: 140000,
        max_salary: 180000,
        avg_salary: 125000,
        sample_size: 50,
        salary_growth_pct: Some(0.0),
    };

    assert!(!trend.is_growing());
    assert!(!trend.is_significant_growth());
}

#[test]
fn test_salary_trend_negative_growth() {
    let today = Utc::now().date_naive();
    let trend = SalaryTrend {
        id: 1,
        job_title_normalized: "customer support specialist".to_string(),
        location_normalized: "austin, tx".to_string(),
        date: today,
        min_salary: 70000,
        p25_salary: 85000,
        median_salary: 100000,
        p75_salary: 115000,
        max_salary: 140000,
        avg_salary: 102000,
        sample_size: 30,
        salary_growth_pct: Some(-5.5),
    };

    assert!(!trend.is_growing());
    assert!(!trend.is_significant_growth());
}

#[test]
fn test_salary_range_formatting() {
    let today = Utc::now().date_naive();
    let trend = SalaryTrend {
        id: 1,
        job_title_normalized: "senior program coordinator".to_string(),
        location_normalized: "seattle, wa".to_string(),
        date: today,
        min_salary: 150000,
        p25_salary: 175000,
        median_salary: 200000,
        p75_salary: 225000,
        max_salary: 300000,
        avg_salary: 205000,
        sample_size: 100,
        salary_growth_pct: Some(15.5),
    };

    assert_eq!(
        trend.range_description(),
        "$150,000-$300,000 (median: $200,000)"
    );
}

#[test]
fn test_role_demand_low_threshold() {
    let today = Utc::now().date_naive();
    let role = RoleDemandTrend {
        id: 1,
        job_title_normalized: "niche specialist".to_string(),
        date: today,
        job_count: 50,
        avg_salary: Some(130000),
        median_salary: Some(125000),
        top_company: None,
        top_location: None,
        avg_experience_years: Some(5.0),
        remote_percentage: Some(40.0),
        demand_trend: Some("stable".to_string()),
    };

    assert!(!role.is_high_demand(100));
    assert!(role.is_high_demand(25));
    assert!(!role.is_remote_friendly());
}

#[test]
fn test_role_demand_no_trend() {
    let today = Utc::now().date_naive();
    let role = RoleDemandTrend {
        id: 1,
        job_title_normalized: "consultant".to_string(),
        date: today,
        job_count: 200,
        avg_salary: Some(140000),
        median_salary: Some(135000),
        top_company: None,
        top_location: None,
        avg_experience_years: Some(7.0),
        remote_percentage: None,
        demand_trend: None,
    };

    assert_eq!(role.trend_direction(), "unknown");
    assert!(!role.is_remote_friendly());
}

#[test]
fn test_company_hiring_velocity_zero_posted() {
    let today = Utc::now().date_naive();
    let velocity = CompanyHiringVelocity {
        id: 1,
        company_name: "SlowCorp".to_string(),
        date: today,
        jobs_posted_count: 0,
        jobs_filled_count: 5,
        jobs_active_count: 10,
        avg_days_to_fill: Some(45.0),
        top_role: None,
        top_location: None,
        is_actively_hiring: false,
        hiring_trend: Some("decreasing".to_string()),
    };

    assert!(!velocity.is_aggressive_hiring());
    assert_eq!(velocity.fill_rate(), 0.0);
}

#[test]
fn test_company_hiring_velocity_exact_threshold() {
    let today = Utc::now().date_naive();
    let velocity = CompanyHiringVelocity {
        id: 1,
        company_name: "ThresholdCorp".to_string(),
        date: today,
        jobs_posted_count: 10,
        jobs_filled_count: 5,
        jobs_active_count: 25,
        avg_days_to_fill: Some(30.0),
        top_role: Some("Program Coordinator".to_string()),
        top_location: Some("Remote".to_string()),
        is_actively_hiring: true,
        hiring_trend: Some("stable".to_string()),
    };

    assert!(velocity.is_aggressive_hiring());
    assert_eq!(velocity.fill_rate(), 50.0);
}

#[test]
fn test_location_density_zero_jobs() {
    let today = Utc::now().date_naive();
    let density = LocationJobDensity {
        id: 1,
        location_normalized: "nowhere, xx".to_string(),
        city: Some("Nowhere".to_string()),
        state: Some("XX".to_string()),
        country: "US".to_string(),
        date: today,
        job_count: 0,
        remote_job_count: 0,
        avg_salary: None,
        median_salary: None,
        top_skill: None,
        top_company: None,
        top_role: None,
        latitude: None,
        longitude: None,
    };

    assert_eq!(density.remote_percentage(), 0.0);
    assert!(!density.is_hot_market(10));
}

#[test]
fn test_location_density_100_percent_remote() {
    let today = Utc::now().date_naive();
    let density = LocationJobDensity {
        id: 1,
        location_normalized: "remote".to_string(),
        city: None,
        state: None,
        country: "Global".to_string(),
        date: today,
        job_count: 500,
        remote_job_count: 500,
        avg_salary: Some(145000),
        median_salary: Some(140000),
        top_skill: Some("Scheduling".to_string()),
        top_company: Some("Remote Support Co".to_string()),
        top_role: Some("Customer Support Lead".to_string()),
        latitude: None,
        longitude: None,
    };

    assert_eq!(density.remote_percentage(), 100.0);
    assert_eq!(density.location_display(), "remote");
}

#[test]
fn test_location_display_without_state() {
    let today = Utc::now().date_naive();
    let density = LocationJobDensity {
        id: 1,
        location_normalized: "london".to_string(),
        city: Some("London".to_string()),
        state: None,
        country: "UK".to_string(),
        date: today,
        job_count: 750,
        remote_job_count: 200,
        avg_salary: Some(80000),
        median_salary: Some(75000),
        top_skill: Some("Bilingual Support".to_string()),
        top_company: Some("Public Benefit Office".to_string()),
        top_role: Some("Operations Coordinator".to_string()),
        latitude: Some(51.5074),
        longitude: Some(-0.1278),
    };

    assert_eq!(density.location_display(), "london");
}

#[test]
fn test_format_thousands() {
    assert_eq!(format_thousands(1000), "1,000");
    assert_eq!(format_thousands(10000), "10,000");
    assert_eq!(format_thousands(100000), "100,000");
    assert_eq!(format_thousands(1000000), "1,000,000");
    assert_eq!(format_thousands(999), "999");
    assert_eq!(format_thousands(0), "0");
}
