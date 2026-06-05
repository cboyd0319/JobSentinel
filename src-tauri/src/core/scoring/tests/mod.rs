use super::*;
use crate::core::config::{Config, LocationPreferences};

fn create_test_config() -> Config {
    Config {
        title_allowlist: vec!["Case Manager".to_string()],
        title_blocklist: vec!["Director".to_string()],
        keywords_boost: vec!["Scheduling".to_string(), "CRM".to_string()],
        keywords_exclude: vec!["sales".to_string()],
        location_preferences: LocationPreferences {
            allow_remote: true,
            allow_hybrid: false,
            allow_onsite: false,
            cities: vec![],
            states: vec![],
            country: "US".to_string(),
        },
        salary_floor_usd: 150000,
        salary_target_usd: Some(180000), // Target salary for graduated scoring
        penalize_missing_salary: false,
        auto_refresh: Default::default(),
        immediate_alert_threshold: 0.9,
        scraping_interval_hours: 2,
        alerts: Default::default(),
        greenhouse_urls: vec![],
        lever_urls: vec![],
        linkedin: Default::default(),
        jobswithgpt_endpoint: "https://api.jobswithgpt.com/mcp".to_string(),
        jobswithgpt_approval: Default::default(),
        remoteok: Default::default(),
        weworkremotely: Default::default(),
        builtin: Default::default(),
        hn_hiring: Default::default(),
        dice: Default::default(),
        yc_startup: Default::default(),
        usajobs: Default::default(),
        simplyhired: Default::default(),
        glassdoor: Default::default(),
        ghost_config: None,
        company_whitelist: vec![],
        company_blacklist: vec![],
        use_resume_matching: false,
    }
}

fn create_test_job() -> Job {
    Job {
        id: 1,
        hash: "test".to_string(),
        title: "Case Manager".to_string(),
        company: "CommunityCare".to_string(),
        url: "https://example.com".to_string(),
        location: Some("Remote".to_string()),
        description: Some("We need a Case Manager with Scheduling and CRM experience".to_string()),
        score: None,
        score_reasons: None,
        source: "greenhouse".to_string(),
        remote: Some(true),
        salary_min: Some(160000),
        salary_max: Some(200000),
        currency: Some("USD".to_string()),
        created_at: Utc::now(),
        updated_at: Utc::now(),
        last_seen: Utc::now(),
        times_seen: 1,
        immediate_alert_sent: false,
        hidden: false,
        bookmarked: false,
        ghost_score: None,
        ghost_reasons: None,
        first_seen: None,
        repost_count: 0,
        notes: None,
        included_in_digest: false,
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

mod company_tests;
mod salary_tests;
