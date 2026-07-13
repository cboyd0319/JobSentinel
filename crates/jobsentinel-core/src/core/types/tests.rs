use super::*;

#[test]
fn test_job_hash_validation() {
    // Valid hash
    let valid_hash = "a".repeat(64);
    assert!(JobHash::new(valid_hash).is_ok());

    // Invalid length
    let short_hash = "a".repeat(63);
    assert!(JobHash::new(short_hash).is_err());

    // Invalid characters
    let invalid_hash = "x".repeat(63) + "!";
    assert!(JobHash::new(invalid_hash).is_err());
}

#[test]
fn test_match_score_validation() {
    assert!(MatchScore::new(0.5).is_ok());
    assert!(MatchScore::new(0.0).is_ok());
    assert!(MatchScore::new(1.0).is_ok());
    assert!(MatchScore::new(-0.1).is_err());
    assert!(MatchScore::new(1.1).is_err());
}

#[test]
fn test_ghost_score_thresholds() {
    let ghost = GhostScore::new(0.6).unwrap();
    assert!(ghost.is_likely_ghost());
    assert!(!ghost.is_warning());

    let warning = GhostScore::new(0.4).unwrap();
    assert!(!warning.is_likely_ghost());
    assert!(warning.is_warning());

    let safe = GhostScore::new(0.2).unwrap();
    assert!(!safe.is_likely_ghost());
    assert!(!safe.is_warning());
}

#[test]
fn test_salary_formatting() {
    let salary = Salary::new(120000);
    assert_eq!(salary.format(), "$120000");
}

#[test]
fn test_match_score_percentage() {
    let score = MatchScore::new(0.75).unwrap();
    assert_eq!(score.as_percentage(), "75%");
}

#[test]
fn test_milliseconds_conversion() {
    let ms = Milliseconds::new(5000);
    assert_eq!(ms.as_seconds(), 5.0);
}

#[test]
fn test_minutes_conversion() {
    let mins = Minutes::new(120);
    assert_eq!(mins.as_hours(), 2.0);
}

#[test]
fn test_hours_conversion() {
    let hours = Hours::new(48);
    assert_eq!(hours.as_days(), 2.0);
}

#[test]
fn test_id_types_not_interchangeable() {
    let job_id = JobId(1);
    let app_id = ApplicationId(1);

    // This should not compile if uncommented:
    // let _ = job_id == app_id;

    // But we can still extract the raw values:
    assert_eq!(job_id.0, app_id.0);
}
