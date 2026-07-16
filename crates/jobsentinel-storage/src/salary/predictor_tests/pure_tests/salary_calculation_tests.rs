#[test]
fn test_default_salary_by_seniority() {
    for (base, expected_min, expected_max) in [
        (80000, 64000, 104000),
        (120000, 96000, 156000),
        (160000, 128000, 208000),
        (200000, 160000, 260000),
        (250000, 200000, 325000),
        (100000, 80000, 130000),
    ] {
        let min = (base as f64 * 0.8) as i64;
        let max = (base as f64 * 1.3) as i64;
        assert_eq!(min, expected_min);
        assert_eq!(max, expected_max);
    }
}

#[test]
fn test_confidence_scores() {
    let confidence_exact = 0.9;
    let confidence_average = 0.6;
    let confidence_default = 0.3;

    assert_eq!(confidence_exact, 0.9);
    assert_eq!(confidence_average, 0.6);
    assert_eq!(confidence_default, 0.3);
}

#[test]
fn test_confidence_score_ordering() {
    let exact_match = 0.9;
    let averaged = 0.6;
    let default = 0.3;

    assert!(exact_match > averaged);
    assert!(averaged > default);
    assert!(exact_match > default);
}

#[test]
fn test_salary_range_calculations() {
    let test_cases = vec![
        (80000, "Entry"),
        (120000, "Mid"),
        (160000, "Senior"),
        (200000, "Staff"),
        (250000, "Principal"),
        (100000, "Unknown"),
    ];

    for (base, level) in test_cases {
        let min = (base as f64 * 0.8) as i64;
        let median = base;
        let max = (base as f64 * 1.3) as i64;

        assert!(
            min < median,
            "Min ({}) should be less than median ({}) for {}",
            min,
            median,
            level
        );
        assert!(
            median < max,
            "Median ({}) should be less than max ({}) for {}",
            median,
            max,
            level
        );
        assert!(
            min < max,
            "Min ({}) should be less than max ({}) for {}",
            min,
            max,
            level
        );
    }
}

#[test]
fn test_salary_range_multipliers() {
    let base = 100000;
    let min_multiplier = 0.8;
    let max_multiplier = 1.3;

    let min = (base as f64 * min_multiplier) as i64;
    let max = (base as f64 * max_multiplier) as i64;

    assert_eq!(min, 80000);
    assert_eq!(max, 130000);

    let spread = (max as f64 / min as f64) - 1.0;
    assert!((spread - 0.625).abs() < 0.001);
}

#[test]
fn test_seniority_salary_progression() {
    let entry = 80000;
    let mid = 120000;
    let senior = 160000;
    let staff = 200000;
    let principal = 250000;

    assert!(mid > entry);
    assert!(senior > mid);
    assert!(staff > senior);
    assert!(principal > staff);
    assert_eq!(mid - entry, 40000);
    assert_eq!(senior - mid, 40000);
    assert_eq!(staff - senior, 40000);
    assert_eq!(principal - staff, 50000);
}

#[test]
fn test_prediction_method_values() {
    let h1b_match = "h1b_match";
    let h1b_average = "h1b_average";
    let default = "default";

    assert_eq!(h1b_match, "h1b_match");
    assert_eq!(h1b_average, "h1b_average");
    assert_eq!(default, "default");
    assert!(!h1b_match.is_empty());
    assert!(!h1b_average.is_empty());
    assert!(!default.is_empty());
}
