use super::*;

#[test]
fn test_company_blacklist() {
    let mut config = create_test_config();
    config.company_blacklist = vec!["BadCompany".to_string(), "WorstCorp".to_string()];
    let mut job = create_test_job();
    job.company = "BadCompany Inc.".to_string();

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    assert_eq!(
        score.breakdown.company, 0.0,
        "Blacklisted company should get 0 score"
    );
    assert!(
        score.reasons.iter().any(|r| r.contains("blocklisted")),
        "Should have blocklisted reason, got: {:?}",
        score.reasons
    );
}

#[test]
fn test_company_whitelist() {
    let mut config = create_test_config();
    config.company_whitelist = vec!["Metro Transit".to_string(), "CommunityCare".to_string()];
    let mut job = create_test_job();
    job.company = "Metro Transit LLC".to_string();

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    // Should get 1.5x bonus (0.10 * 1.5 = 0.15)
    assert!(
        (score.breakdown.company - 0.15).abs() < 0.001,
        "Whitelisted company should get 1.5x bonus"
    );
    assert!(
        score
            .reasons
            .iter()
            .any(|r| r.contains("preferred") && r.contains("+50% bonus")),
        "Should have preferred reason with bonus, got: {:?}",
        score.reasons
    );
}

#[test]
fn test_company_neutral() {
    let mut config = create_test_config();
    config.company_whitelist = vec!["Metro Transit".to_string()];
    config.company_blacklist = vec!["BadCompany".to_string()];
    let mut job = create_test_job();
    job.company = "County Services".to_string(); // Not in either list

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    // Should get full base score
    assert!(
        (score.breakdown.company - 0.10).abs() < 0.001,
        "Neutral company should get base score"
    );
    assert!(
        score.reasons.iter().any(|r| r.contains("neutral")),
        "Should have neutral reason, got: {:?}",
        score.reasons
    );
}

#[test]
fn test_company_no_preferences() {
    let config = create_test_config();
    let job = create_test_job();

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    // Should get full base score
    assert!(
        (score.breakdown.company - 0.10).abs() < 0.001,
        "Should get base score with no preferences configured"
    );
    assert!(
        score
            .reasons
            .iter()
            .any(|r| r.contains("No company preferences configured")),
        "Should have no preferences reason, got: {:?}",
        score.reasons
    );
}

#[test]
fn test_company_fuzzy_matching_case_insensitive() {
    let mut config = create_test_config();
    config.company_whitelist = vec!["communitycare".to_string()];
    let mut job = create_test_job();
    job.company = "COMMUNITYCARE INC".to_string();

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    assert!(
        (score.breakdown.company - 0.15).abs() < 0.001,
        "Case-insensitive fuzzy match should work"
    );
}

#[test]
fn test_company_fuzzy_matching_suffixes() {
    let mut config = create_test_config();
    config.company_blacklist = vec!["BadCorp".to_string()];
    let mut job = create_test_job();

    // Test various suffixes
    let test_cases = vec![
        "BadCorp Inc",
        "BadCorp Inc.",
        "BadCorp LLC",
        "BadCorp Ltd",
        "BadCorp Corporation",
        "BadCorp Co.",
    ];

    for company_name in test_cases {
        job.company = company_name.to_string();
        let engine = ScoringEngine::new(Arc::new(config.clone()));
        let score = engine.score(&job);

        assert_eq!(
            score.breakdown.company, 0.0,
            "Should match '{}' as blocklisted",
            company_name
        );
    }
}

#[test]
fn test_company_partial_match() {
    let mut config = create_test_config();
    config.company_whitelist = vec!["Metro Transit".to_string()];
    let mut job = create_test_job();
    job.company = "Metro Transit Community Services".to_string();

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    // Use approximate comparison for floating point
    assert!(
        (score.breakdown.company - 0.15).abs() < 0.001,
        "Partial match (contains) should work, got: {}",
        score.breakdown.company
    );
}

#[test]
fn test_company_blacklist_takes_precedence() {
    let mut config = create_test_config();
    config.company_whitelist = vec!["BadCompany".to_string()];
    config.company_blacklist = vec!["BadCompany".to_string()];
    let mut job = create_test_job();
    job.company = "BadCompany Inc.".to_string();

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    assert_eq!(
        score.breakdown.company, 0.0,
        "Blacklist should take precedence over whitelist"
    );
    assert!(
        score.reasons.iter().any(|r| r.contains("blocklisted")),
        "Should show blocklisted reason"
    );
}

#[test]
fn test_normalize_company_name() {
    assert_eq!(normalize_company_name("Metro Transit LLC"), "metro transit");
    assert_eq!(
        normalize_company_name("County Services Corporation"),
        "county services"
    );
    assert_eq!(
        normalize_company_name("Neighborhood Health Inc."),
        "neighborhood health"
    );
    assert_eq!(normalize_company_name("Harbor Retail Co"), "harbor retail");
    assert_eq!(normalize_company_name("  Spaces  Inc  "), "spaces");
    assert_eq!(normalize_company_name("Company L.L.C."), "company");
}

#[test]
fn test_fuzzy_match_company() {
    // Exact match after normalization
    assert!(fuzzy_match_company("Metro Transit LLC", "Metro Transit"));
    assert!(fuzzy_match_company(
        "County Services Corporation",
        "County Services Corp"
    ));

    // Partial match
    assert!(fuzzy_match_company(
        "Metro Transit Community Services",
        "Metro Transit"
    ));
    assert!(fuzzy_match_company(
        "Neighborhood Health Inc",
        "Neighborhood Health"
    ));

    // Case insensitive
    assert!(fuzzy_match_company("COMMUNITYCARE INC", "communitycare"));

    // Should not match
    assert!(!fuzzy_match_company("Metro Transit", "Harbor Retail"));
    assert!(!fuzzy_match_company(
        "County Services",
        "Public Benefit Office"
    ));
}

#[test]
fn test_company_scoring_with_multiple_lists() {
    let mut config = create_test_config();
    config.company_whitelist = vec![
        "Metro Transit".to_string(),
        "CommunityCare".to_string(),
        "Harbor Retail".to_string(),
    ];
    config.company_blacklist = vec!["BadCorp".to_string(), "WorstCompany".to_string()];

    let engine = ScoringEngine::new(Arc::new(config));

    // Test whitelisted (use approximate comparison for floating point)
    let mut job = create_test_job();
    job.company = "Harbor Retail Supply Services".to_string();
    let score = engine.score(&job);
    assert!(
        (score.breakdown.company - 0.15).abs() < 0.001,
        "Preferred company should be whitelisted, got: {}",
        score.breakdown.company
    );

    // Test blacklisted
    job.company = "WorstCompany LLC".to_string();
    let score = engine.score(&job);
    assert_eq!(
        score.breakdown.company, 0.0,
        "WorstCompany should be blacklisted"
    );

    // Test neutral (use approximate comparison for floating point)
    job.company = "County Services".to_string();
    let score = engine.score(&job);
    assert!(
        (score.breakdown.company - 0.10).abs() < 0.001,
        "County Services should be neutral, got: {}",
        score.breakdown.company
    );
}
