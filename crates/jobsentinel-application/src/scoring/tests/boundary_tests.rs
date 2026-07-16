use super::*;

#[test]
fn test_empty_title() {
    let config = create_test_config();
    let mut job = create_test_job();
    job.title = "".to_string();

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    assert_eq!(
        score.breakdown.skills, 0.0,
        "Should get 0 skills score for empty title"
    );
}

#[test]
fn test_empty_description() {
    let config = create_test_config();
    let mut job = create_test_job();
    job.description = None;

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    // With no description and no keywords matched, score will be 0
    // But the job should still be scored (not crash)
    assert!(
        score.total >= 0.0,
        "Should handle empty description without crashing"
    );
}

#[test]
fn test_immediate_alert_threshold() {
    let config = create_test_config();
    let job = create_test_job();

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    // Perfect match should trigger immediate alert (threshold is 0.9)
    assert!(
        engine.should_alert_immediately(&score),
        "Perfect match should trigger immediate alert"
    );
}

#[test]
fn test_no_immediate_alert_low_score() {
    let config = create_test_config();
    let mut job = create_test_job();
    job.salary_min = Some(100000); // Below floor
    job.description = Some("Basic description".to_string()); // No keywords

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    assert!(
        !engine.should_alert_immediately(&score),
        "Low score should not trigger immediate alert"
    );
}

#[test]
fn test_location_remote_in_title() {
    let config = create_test_config();
    let mut job = create_test_job();
    job.title = "Remote Case Manager".to_string();
    job.remote = None;
    job.location = None;

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    assert_eq!(
        score.breakdown.location, 0.20,
        "Should detect remote from title"
    );
}

#[test]
fn test_location_remote_in_location_string() {
    let config = create_test_config();
    let mut job = create_test_job();
    job.remote = None;
    job.location = Some("United States - Remote".to_string());

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    assert_eq!(
        score.breakdown.location, 0.20,
        "Should detect remote from location string"
    );
}

#[test]
fn test_location_hybrid_match() {
    let mut config = create_test_config();
    config.location_preferences.allow_remote = false;
    config.location_preferences.allow_hybrid = true;
    config.location_preferences.allow_onsite = false;

    let mut job = create_test_job();
    job.remote = Some(false);
    job.location = Some("Chicago, IL (Hybrid)".to_string());

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    assert_eq!(
        score.breakdown.location, 0.20,
        "Should get full location score for hybrid when allowed"
    );
    assert!(score.reasons.iter().any(|r| r.contains("Hybrid job")));
}

#[test]
fn test_location_onsite_match() {
    let mut config = create_test_config();
    config.location_preferences.allow_remote = false;
    config.location_preferences.allow_hybrid = false;
    config.location_preferences.allow_onsite = true;

    let mut job = create_test_job();
    job.remote = Some(false);
    job.location = Some("Austin, TX".to_string());

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    assert_eq!(
        score.breakdown.location, 0.20,
        "Should get full location score for onsite when allowed"
    );
    assert!(score.reasons.iter().any(|r| r.contains("Onsite job")));
}

#[test]
fn test_location_no_location_data() {
    let config = create_test_config();
    let mut job = create_test_job();
    job.remote = None;
    job.location = None;
    job.title = "Case Worker".to_string(); // No "remote" in title

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    // Should be detected as onsite (not remote, not hybrid)
    // But config doesn't allow onsite, so should get 0
    assert_eq!(
        score.breakdown.location, 0.0,
        "Should get 0 when no location data and onsite not allowed"
    );
}

#[test]
fn test_excluded_keyword_in_title() {
    let config = create_test_config();
    let mut job = create_test_job();
    job.title = "Case Manager - Sales".to_string(); // Excluded keyword in title
    job.description = Some("CRM and Scheduling experience".to_string());

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    assert_eq!(
        score.breakdown.skills, 0.0,
        "Skills score should be 0 for excluded keyword in title"
    );
    assert!(score
        .reasons
        .contains(&"Contains excluded keyword".to_string()));
}

#[test]
fn test_recency_exactly_7_days() {
    let config = create_test_config();
    let mut job = create_test_job();
    job.created_at = Utc::now() - chrono::Duration::days(7);

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    assert_eq!(
        score.breakdown.recency, 0.05,
        "Should get full recency score at exactly 7 days"
    );
}

#[test]
fn test_recency_exactly_30_days() {
    let config = create_test_config();
    let mut job = create_test_job();
    job.created_at = Utc::now() - chrono::Duration::days(30);

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    // At 30 days, should get minimal score (almost 0)
    assert!(
        score.breakdown.recency < 0.01,
        "Should get near-zero recency score at 30 days, got: {}",
        score.breakdown.recency
    );
}

#[test]
fn test_empty_allowlist() {
    let mut config = create_test_config();
    config.title_allowlist.clear();
    let job = create_test_job();

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    // With empty allowlist, no titles should match
    assert_eq!(
        score.breakdown.skills, 0.0,
        "Should get 0 skills score with empty allowlist"
    );
    assert!(score
        .reasons
        .contains(&"Title not in allowlist".to_string()));
}

#[test]
fn test_multiple_allowlist_matches() {
    let mut config = create_test_config();
    config.title_allowlist = vec![
        "Case".to_string(),
        "Coordinator".to_string(),
        "Support".to_string(),
    ];
    let mut job = create_test_job();
    job.title = "Senior Case Manager".to_string(); // Matches multiple

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    // Should pass allowlist check (only needs to match one)
    assert!(
        score.breakdown.skills > 0.0,
        "Should pass allowlist with multiple matches"
    );
}

#[test]
fn test_threshold_edge_cases() {
    let mut config = create_test_config();
    config.immediate_alert_threshold = 0.9;
    let job = create_test_job();

    let engine = ScoringEngine::new(Arc::new(config));

    // Test with score exactly at threshold
    let mut score = engine.score(&job);
    score.total = 0.9; // Manually set to threshold
    assert!(
        engine.should_alert_immediately(&score),
        "Should alert at exactly threshold"
    );

    // Test just below threshold
    score.total = 0.899;
    assert!(
        !engine.should_alert_immediately(&score),
        "Should not alert just below threshold"
    );

    // Test above threshold
    score.total = 0.95;
    assert!(
        engine.should_alert_immediately(&score),
        "Should alert above threshold"
    );
}
