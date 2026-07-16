use jobsentinel_application::scoring::ScoringEngine;

use super::*;

#[tokio::test]
async fn test_scoring_engine_integration() {
    let config = Arc::new(create_test_config());
    let scoring_engine = ScoringEngine::new(Arc::clone(&config));

    // High-quality job: matches title, keywords, remote, good salary
    let mut high_quality_job = create_test_job(
        "hq_001",
        "Senior Care Coordinator",
        "CareBridge",
        true,
        Some(65000),
    );
    high_quality_job.description = Some(
        "Coordinate care plans with CRM, patient scheduling, and case management.".to_string(),
    );

    let score = scoring_engine.score(&high_quality_job);
    assert!(
        score.total > 0.7,
        "High-quality job should score above 0.7, got {}",
        score.total
    );

    // Low-quality job: doesn't match title, onsite, low salary
    let low_quality_job = Job {
        title: "Commission-Only Sales Representative".to_string(),
        remote: Some(false),
        salary_min: Some(30000),
        salary_max: Some(35000),
        location: Some("NYC".to_string()),
        description: Some("Commission-only role with an unpaid trial period.".to_string()),
        ..create_test_job(
            "lq_001",
            "Sales Representative",
            "SalesWorks",
            false,
            Some(30000),
        )
    };

    let score = scoring_engine.score(&low_quality_job);
    assert!(
        score.total < 0.5,
        "Low-quality job should score below 0.5, got {}",
        score.total
    );
}

#[tokio::test]
async fn test_title_matching_scoring() {
    let config = Arc::new(create_test_config());
    let scoring_engine = ScoringEngine::new(Arc::clone(&config));

    // Exact title match
    let mut exact_match = create_test_job("tm_001", "Care Coordinator", "Company", true, None);
    exact_match.description =
        Some("Use CRM records and case management notes to coordinate care.".to_string());
    let score1 = scoring_engine.score(&exact_match);

    // Partial title match
    let mut partial_match = create_test_job(
        "tm_002",
        "Senior Care Coordinator Lead",
        "Company",
        true,
        None,
    );
    partial_match.description =
        Some("Use CRM records and case management notes to coordinate care.".to_string());
    let score2 = scoring_engine.score(&partial_match);

    // No title match
    let no_match = create_test_job("tm_003", "Marketing Manager", "Company", true, None);
    let score3 = scoring_engine.score(&no_match);

    assert!(
        score1.total > score3.total,
        "Exact match should score higher than no match"
    );
    assert!(
        score2.total > score3.total,
        "Partial match should score higher than no match"
    );
}

#[tokio::test]
async fn test_salary_influence_on_scoring() {
    let config = Arc::new(create_test_config());
    let scoring_engine = ScoringEngine::new(Arc::clone(&config));

    // Job with salary above floor
    let good_salary = create_test_job(
        "sal_001",
        "Care Coordinator",
        "CareBridge",
        true,
        Some(65000),
    );
    let score_good = scoring_engine.score(&good_salary);

    // Job with salary below floor
    let bad_salary = create_test_job(
        "sal_002",
        "Care Coordinator",
        "Example Services",
        true,
        Some(30000),
    );
    let score_bad = scoring_engine.score(&bad_salary);

    // Job with no salary
    let no_salary = create_test_job(
        "sal_003",
        "Care Coordinator",
        "Mystery Services",
        true,
        None,
    );
    let score_none = scoring_engine.score(&no_salary);

    assert!(
        score_good.total >= score_bad.total,
        "Job with salary above floor should score >= job below floor"
    );
    assert!(
        (0.0..=1.0).contains(&score_none.total),
        "Job with no salary should still produce a bounded score"
    );
}

#[tokio::test]
async fn test_remote_preference_scoring() {
    let config = Arc::new(create_test_config()); // allow_remote: true, allow_onsite: false
    let scoring_engine = ScoringEngine::new(Arc::clone(&config));

    // Remote job
    let remote_job = create_test_job(
        "rem_001",
        "Care Coordinator",
        "CareBridge",
        true,
        Some(60000),
    );
    let score_remote = scoring_engine.score(&remote_job);

    // Onsite job (config has allow_onsite: false)
    let onsite_job = create_test_job(
        "rem_002",
        "Care Coordinator",
        "CareBridge",
        false,
        Some(60000),
    );
    let score_onsite = scoring_engine.score(&onsite_job);

    assert!(
        score_remote.total >= score_onsite.total,
        "Remote job should score >= onsite when onsite is not allowed"
    );
}
