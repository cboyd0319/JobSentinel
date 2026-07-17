use super::*;
use crate::{
    config::Config,
    test_support::{minimal_test_config, test_job},
};

fn create_test_config() -> Config {
    let mut config = minimal_test_config();
    config.title_allowlist = vec!["Case Manager".to_string()];
    config.title_blocklist = vec!["Director".to_string()];
    config.keywords_boost = vec!["Scheduling".to_string(), "CRM".to_string()];
    config.keywords_exclude = vec!["sales".to_string()];
    config.salary_floor_usd = 150000;
    config.salary_target_usd = Some(180000);
    config.immediate_alert_threshold = 0.9;
    config
}

fn create_test_job() -> Job {
    Job {
        id: 1,
        url: "https://example.com".to_string(),
        description: Some("We need a Case Manager with Scheduling and CRM experience".to_string()),
        source: "greenhouse".to_string(),
        salary_min: Some(160000),
        salary_max: Some(200000),
        currency: Some("USD".to_string()),
        ..test_job("test", "Case Manager", "CommunityCare")
    }
}

#[test]
fn test_perfect_match() {
    let config = create_test_config();
    let job = create_test_job();
    let engine = ScoringEngine::new(Arc::new(config));

    let score = engine.score(&job);

    // Skills: 40% (title + 2 keywords)
    // Salary: 25% (above floor)
    // Location: 20% (remote)
    // Company: 10% (full)
    // Recency: 5% (fresh)
    // Total: ~100%
    assert!(score.total >= 0.95, "Score should be high: {}", score.total);
}

#[test]
fn test_title_not_in_allowlist() {
    let config = create_test_config();
    let mut job = create_test_job();
    job.title = "Product Manager".to_string();
    // Make salary below floor to reduce total score (must clear salary_max too)
    job.salary_min = Some(100000);
    job.salary_max = None; // Clear salary_max to avoid midpoint calculation

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    // Skills: 0 (title not in allowlist), Salary: ~0.075 (30% tier),
    // Location: 0.20 (remote), Company: 0.10, Recency: 0.05
    // Total: ~0.425
    assert!(
        score.total < 0.5,
        "Score should be low for non-matching title, got: {}",
        score.total
    );
}

#[test]
fn test_salary_too_low() {
    let config = create_test_config();
    let mut job = create_test_job();
    job.salary_min = Some(100000); // 100k vs 180k target = 55.5%, < 70% tier
    job.salary_max = None; // Clear to avoid midpoint calculation

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    // With graduated scoring: 55.5% of target -> 30% credit tier -> 0.25 * 0.3 = 0.075
    assert!(
        score.breakdown.salary > 0.0 && score.breakdown.salary < 0.10,
        "Salary below 70% of target should get 30% credit (0.075), got: {}",
        score.breakdown.salary
    );
}

#[test]
fn test_title_in_blocklist() {
    let config = create_test_config();
    let mut job = create_test_job();
    // Title contains both allowlist term "Case Manager" AND blocklist term "Director"
    // Should fail on blocklist check (which comes after allowlist)
    job.title = "Case Manager Director".to_string();

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    assert_eq!(
        score.breakdown.skills, 0.0,
        "Skills score should be 0 for blocked title"
    );
    // Check for the blocklist reason specifically
    assert!(
        score.reasons.contains(&"Title in blocklist".to_string()),
        "Should have blocklist reason, got: {:?}",
        score.reasons
    );
}

#[test]
fn test_keyword_matching_case_insensitive() {
    let config = create_test_config();
    let mut job = create_test_job();
    job.description = Some("Looking for scheduling and crm experience".to_string());

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    // Should match both keywords despite lowercase
    assert_eq!(
        score.breakdown.skills, 0.40,
        "Should match keywords case-insensitively"
    );
}

#[test]
fn test_keyword_matching_partial() {
    let config = create_test_config();
    let mut job = create_test_job();
    job.description =
        Some("Experience with scheduling-heavy caseloads and CRM systems".to_string());

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    // Should match both keywords partially
    assert_eq!(
        score.breakdown.skills, 0.40,
        "Should match keywords with partial matches"
    );
}

#[test]
fn test_excluded_keyword() {
    let config = create_test_config();
    let mut job = create_test_job();
    job.description =
        Some("Case Manager with sales responsibilities, CRM and Scheduling experience".to_string());

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    assert_eq!(
        score.breakdown.skills, 0.0,
        "Skills score should be 0 for excluded keyword"
    );
    assert!(score
        .reasons
        .contains(&"Contains excluded keyword".to_string()));
}

#[test]
fn test_partial_keyword_match() {
    let config = create_test_config();
    let mut job = create_test_job();
    job.description = Some("Case Manager with CRM experience".to_string()); // Only 1 of 2 keywords

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    // Should get 50% of skills score (1 of 2 keywords)
    assert_eq!(
        score.breakdown.skills, 0.20,
        "Skills score should be 50% for partial match"
    );
}

#[test]
fn test_no_boost_keywords() {
    let mut config = create_test_config();
    config.keywords_boost.clear();
    let job = create_test_job();

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    // Should get full skills score when no boost keywords configured
    assert_eq!(
        score.breakdown.skills, 0.40,
        "Should get full skills score with no boost keywords"
    );
}

#[test]
fn test_location_remote_match() {
    let config = create_test_config();
    let mut job = create_test_job();
    job.remote = Some(true);
    job.location = Some("Remote".to_string());

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    assert_eq!(
        score.breakdown.location, 0.20,
        "Should get full location score for remote match"
    );
    assert!(score.reasons.iter().any(|r| r.contains("Remote job")));
}

#[test]
fn test_location_remote_match_from_taxonomy_description() {
    let config = create_test_config();
    let mut job = create_test_job();
    job.remote = Some(false);
    job.location = Some("Denver, CO".to_string());
    job.description = Some("This is a work from home position.".to_string());

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    assert_eq!(
        score.breakdown.location, 0.20,
        "Should get full location score for remote taxonomy phrase in description"
    );
    assert!(score.reasons.iter().any(|r| r.contains("Remote job")));
}

#[test]
fn test_location_hybrid_taxonomy_takes_priority_over_remote() {
    let config = create_test_config();
    let mut job = create_test_job();
    job.remote = Some(false);
    job.location = Some("Hybrid remote - Denver".to_string());

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    assert_eq!(
        score.breakdown.location, 0.0,
        "Hybrid taxonomy phrases should not score as remote-only matches"
    );
}

#[test]
fn test_location_hybrid_no_match() {
    let config = create_test_config();
    let mut job = create_test_job();
    job.remote = Some(false);
    job.location = Some("Chicago, IL (Hybrid)".to_string());

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    assert_eq!(
        score.breakdown.location, 0.0,
        "Should get 0 location score for hybrid when not allowed"
    );
}

#[test]
fn test_location_onsite_no_match() {
    let config = create_test_config();
    let mut job = create_test_job();
    job.remote = Some(false);
    job.location = Some("Austin, TX".to_string());

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    assert_eq!(
        score.breakdown.location, 0.0,
        "Should get 0 location score for onsite when not allowed"
    );
}

#[test]
fn test_salary_not_specified() {
    let config = create_test_config();
    let mut job = create_test_job();
    job.salary_min = None;
    job.salary_max = None;

    let engine = ScoringEngine::new(Arc::new(config));

    // penalize_missing_salary = false, so 50% credit
    let score = engine.score(&job);

    assert_eq!(
        score.breakdown.salary, 0.125,
        "Should get 50% salary score when not specified"
    );
    assert!(score
        .reasons
        .iter()
        .any(|r| r.contains("Salary not specified")));
}

#[test]
fn test_salary_at_floor() {
    let config = create_test_config();
    let mut job = create_test_job();
    job.salary_min = Some(150000); // 150k vs 180k target = 83.3%, 80-89% tier
    job.salary_max = None; // Clear to avoid midpoint calculation

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    // With graduated scoring: 83.3% of target -> 80% credit tier -> 0.25 * 0.8 = 0.20
    assert!(
        score.breakdown.salary >= 0.18 && score.breakdown.salary <= 0.22,
        "Salary at 83% of target should get 80% credit (~0.20), got: {}",
        score.breakdown.salary
    );
}

#[test]
fn test_no_salary_requirement() {
    let mut config = create_test_config();
    config.salary_floor_usd = 0;
    let mut job = create_test_job();
    job.salary_min = None;

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    assert_eq!(
        score.breakdown.salary, 0.25,
        "Should get full salary score when no requirement"
    );
}

#[test]
fn test_recency_fresh_job() {
    let config = create_test_config();
    let job = create_test_job(); // Created at Utc::now()

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    assert_eq!(
        score.breakdown.recency, 0.05,
        "Should get full recency score for fresh job"
    );
}

#[test]
fn test_recency_old_job() {
    let config = create_test_config();
    let mut job = create_test_job();
    job.created_at = Utc::now() - chrono::Duration::days(45);

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    assert_eq!(
        score.breakdown.recency, 0.0,
        "Should get 0 recency score for jobs older than 30 days"
    );
}

#[test]
fn test_recency_moderate_age() {
    let config = create_test_config();
    let mut job = create_test_job();
    job.created_at = Utc::now() - chrono::Duration::days(15);

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    // Should get partial recency score (between 0 and max)
    assert!(
        score.breakdown.recency > 0.0 && score.breakdown.recency < 0.05,
        "Should get partial recency score for moderately old job, got: {}",
        score.breakdown.recency
    );
}

#[test]
fn test_score_normalization() {
    let config = create_test_config();
    let job = create_test_job();

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    assert!(
        score.total >= 0.0 && score.total <= 1.0,
        "Total score should be between 0 and 1, got: {}",
        score.total
    );
    assert!(
        score.breakdown.skills >= 0.0 && score.breakdown.skills <= 0.40,
        "Skills score should be between 0 and 0.40"
    );
    assert!(
        score.breakdown.salary >= 0.0 && score.breakdown.salary <= 0.25,
        "Salary score should be between 0 and 0.25"
    );
    assert!(
        score.breakdown.location >= 0.0 && score.breakdown.location <= 0.20,
        "Location score should be between 0 and 0.20"
    );
    assert!(
        score.breakdown.company >= 0.0 && score.breakdown.company <= 0.10,
        "Company score should be between 0 and 0.10"
    );
    assert!(
        score.breakdown.recency >= 0.0 && score.breakdown.recency <= 0.05,
        "Recency score should be between 0 and 0.05"
    );
}

mod boundary_tests;

mod component_edge_cases;

mod company_tests;
mod salary_tests;
