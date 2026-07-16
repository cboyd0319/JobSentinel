use super::*;

#[test]
fn test_salary_above_target_with_bonus() {
    let config = create_test_config();
    let mut job = create_test_job();
    job.salary_min = Some(234000);
    job.salary_max = Some(234000);

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    assert_eq!(
        score.breakdown.salary, 0.30,
        "Salary 130% of target should get capped bonus"
    );
}

#[test]
fn test_salary_90_percent_of_target() {
    let config = create_test_config();
    let mut job = create_test_job();
    job.salary_min = Some(165600);
    job.salary_max = Some(165600);

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    assert_eq!(
        score.breakdown.salary, 0.225,
        "Salary at 92% of target should get 0.9 multiplier"
    );
}

#[test]
fn test_salary_70_percent_of_target() {
    let config = create_test_config();
    let mut job = create_test_job();
    job.salary_min = Some(135000);
    job.salary_max = Some(135000);

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    assert_eq!(
        score.breakdown.salary, 0.15,
        "Salary at 75% of target should get 0.6 multiplier"
    );
}

#[test]
fn test_salary_below_70_percent() {
    let config = create_test_config();
    let mut job = create_test_job();
    job.salary_min = Some(90000);
    job.salary_max = Some(90000);

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    assert_eq!(
        score.breakdown.salary, 0.075,
        "Salary at 50% of target should get 0.3 multiplier"
    );
}

#[test]
fn test_salary_range_uses_midpoint() {
    let config = create_test_config();
    let mut job = create_test_job();
    job.salary_min = Some(160000);
    job.salary_max = Some(200000);

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    assert_eq!(
        score.breakdown.salary, 0.25,
        "Salary range with midpoint at target should get full score"
    );
    assert!(score.reasons.iter().any(|r| r.contains("Salary range")));
}

#[test]
fn test_salary_min_only() {
    let config = create_test_config();
    let mut job = create_test_job();
    job.salary_min = Some(180000);
    job.salary_max = None;

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    assert_eq!(
        score.breakdown.salary, 0.25,
        "Salary min only at target should get full score"
    );
    assert!(score.reasons.iter().any(|r| r.contains("minimum only")));
}

#[test]
fn test_salary_max_only() {
    let config = create_test_config();
    let mut job = create_test_job();
    job.salary_min = None;
    job.salary_max = Some(180000);

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    assert_eq!(
        score.breakdown.salary, 0.25,
        "Salary max only at target should get full score"
    );
    assert!(score.reasons.iter().any(|r| r.contains("maximum only")));
}

#[test]
fn test_salary_penalty_enabled() {
    let mut config = create_test_config();
    config.penalize_missing_salary = true;

    let mut job = create_test_job();
    job.salary_min = None;
    job.salary_max = None;

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    assert_eq!(
        score.breakdown.salary, 0.075,
        "Missing salary with penalty should get 0.3 multiplier"
    );
    assert!(score.reasons.iter().any(|r| r.contains("30% credit")));
}

#[test]
fn test_salary_no_target_uses_floor() {
    let mut config = create_test_config();
    config.salary_target_usd = None;

    let mut job = create_test_job();
    job.salary_min = Some(150000);
    job.salary_max = Some(150000);

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    assert_eq!(
        score.breakdown.salary, 0.25,
        "Salary at floor (when no target) should get full score"
    );
}

#[test]
fn test_salary_above_target_exact_boundaries() {
    let config = create_test_config();
    let mut job = create_test_job();
    job.salary_min = Some(180000);
    job.salary_max = Some(180000);

    let engine = ScoringEngine::new(Arc::new(config));
    let score = engine.score(&job);

    assert_eq!(
        score.breakdown.salary, 0.25,
        "Salary at exactly 100% of target should get full score (1.0)"
    );

    job.salary_min = Some(162000);
    job.salary_max = Some(162000);
    let score = engine.score(&job);
    assert_eq!(
        score.breakdown.salary, 0.225,
        "Salary at exactly 90% of target should get 0.9 multiplier"
    );

    job.salary_min = Some(144000);
    job.salary_max = Some(144000);
    let score = engine.score(&job);
    assert_eq!(
        score.breakdown.salary, 0.20,
        "Salary at exactly 80% of target should get 0.8 multiplier"
    );

    job.salary_min = Some(126000);
    job.salary_max = Some(126000);
    let score = engine.score(&job);
    assert_eq!(
        score.breakdown.salary, 0.15,
        "Salary at exactly 70% of target should get 0.6 multiplier"
    );

    job.salary_min = Some(216000);
    job.salary_max = Some(216000);
    let score = engine.score(&job);
    assert_eq!(
        score.breakdown.salary, 0.30,
        "Salary at exactly 120% of target should get 1.2 multiplier (bonus)"
    );
}
