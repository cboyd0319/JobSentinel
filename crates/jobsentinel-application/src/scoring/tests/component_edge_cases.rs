use super::*;

#[test]
fn test_all_preferences_allowed() {
    let mut config = create_test_config();
    config.location_preferences.allow_remote = true;
    config.location_preferences.allow_hybrid = true;
    config.location_preferences.allow_onsite = true;

    // Test remote
    let mut job = create_test_job();
    job.remote = Some(true);
    job.location = Some("Remote".to_string());
    let engine = ScoringEngine::new(Arc::new(config.clone()));
    let score = engine.score(&job);
    assert_eq!(score.breakdown.location, 0.20, "Remote should score full");

    // Test hybrid
    job.remote = Some(false);
    job.location = Some("Hybrid".to_string());
    let score = engine.score(&job);
    assert_eq!(score.breakdown.location, 0.20, "Hybrid should score full");

    // Test onsite
    job.remote = Some(false);
    job.location = Some("Austin, TX".to_string());
    let score = engine.score(&job);
    assert_eq!(score.breakdown.location, 0.20, "Onsite should score full");
}

#[test]
fn test_zero_boost_keywords_match() {
    let mut config = create_test_config();
    config.keywords_boost = vec!["Bilingual".to_string()];
    let mut job = create_test_job();
    job.description = Some("No matching keywords here".to_string());

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    // Should get 0 skills score when no boost keywords match
    assert_eq!(
        score.breakdown.skills, 0.0,
        "Should get 0 skills score when no boost keywords match"
    );
}

#[test]
fn test_recency_boundary_8_days() {
    let config = create_test_config();
    let mut job = create_test_job();
    job.created_at = Utc::now() - chrono::Duration::days(8);

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    // At 8 days, should get partial score (in the decay range)
    assert!(
        score.breakdown.recency > 0.0 && score.breakdown.recency < 0.05,
        "Should get partial recency score at 8 days, got: {}",
        score.breakdown.recency
    );
}

#[test]
fn test_case_sensitivity_comprehensive() {
    let config = create_test_config();
    let mut job = create_test_job();

    // Test uppercase keywords in description
    job.description = Some("SCHEDULING and CRM experience".to_string());
    let engine = ScoringEngine::new(Arc::new(config.clone()));
    let score = engine.score(&job);
    assert_eq!(
        score.breakdown.skills, 0.40,
        "Should match uppercase keywords"
    );

    // Test mixed case in title
    job.title = "cAsE mAnAgEr".to_string();
    let score = engine.score(&job);
    assert!(
        score.breakdown.skills > 0.0,
        "Should match mixed case title"
    );

    // Test excluded keyword in uppercase
    job.description = Some("SALES experience required".to_string());
    let score = engine.score(&job);
    assert_eq!(
        score.breakdown.skills, 0.0,
        "Should exclude uppercase excluded keywords"
    );
}

#[test]
fn test_scoring_consistency() {
    let config = create_test_config();
    let job = create_test_job();
    let engine = ScoringEngine::new(Arc::new(config));

    // Score the same job twice
    let score1 = engine.score(&job);
    let score2 = engine.score(&job);

    assert_eq!(
        score1.total, score2.total,
        "Scoring should be deterministic"
    );
    assert_eq!(
        score1.breakdown.skills, score2.breakdown.skills,
        "Skills breakdown should be consistent"
    );
    assert_eq!(
        score1.breakdown.salary, score2.breakdown.salary,
        "Salary breakdown should be consistent"
    );
}

#[test]
fn test_empty_location_string() {
    let config = create_test_config();
    let mut job = create_test_job();
    job.remote = None;
    job.location = Some("".to_string()); // Empty string

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    // Empty location should be treated as onsite
    // Config doesn't allow onsite, so should get 0
    assert_eq!(
        score.breakdown.location, 0.0,
        "Empty location should be treated as onsite"
    );
}
