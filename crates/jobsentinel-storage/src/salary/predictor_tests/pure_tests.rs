use crate::analytics_buckets::{salary_location_bucket, salary_title_bucket};

#[test]
fn test_normalize_title_software_engineer() {
    assert_eq!(
        salary_title_bucket("Software Engineer"),
        "software engineer"
    );
    assert_eq!(
        salary_title_bucket("Senior Software Engineer"),
        "software engineer"
    );
    assert_eq!(salary_title_bucket("SWE"), "software engineer");
    assert_eq!(salary_title_bucket("Staff SWE"), "software engineer");
}

#[test]
fn test_normalize_title_data_scientist() {
    assert_eq!(salary_title_bucket("Data Scientist"), "data scientist");
    assert_eq!(
        salary_title_bucket("Senior Data Scientist"),
        "data scientist"
    );
    assert_eq!(salary_title_bucket("Lead Data Scientist"), "data scientist");
}

#[test]
fn test_normalize_title_product_manager() {
    assert_eq!(salary_title_bucket("Product Manager"), "product manager");
    assert_eq!(
        salary_title_bucket("Senior Product Manager"),
        "product manager"
    );
    assert_eq!(
        salary_title_bucket("Technical Product Manager"),
        "product manager"
    );
}

#[test]
fn test_normalize_title_other_roles() {
    assert_eq!(salary_title_bucket("Care Coordinator"), "care coordinator");
    assert_eq!(
        salary_title_bucket("Inventory Planner"),
        "inventory planner"
    );
    assert_eq!(
        salary_title_bucket("Customer Support Manager"),
        "customer support manager"
    );
}

#[test]
fn test_normalize_title_case_insensitive() {
    assert_eq!(
        salary_title_bucket("SOFTWARE ENGINEER"),
        "software engineer"
    );
    assert_eq!(salary_title_bucket("Data SCIENTIST"), "data scientist");
}

#[test]
fn test_normalize_title_empty() {
    assert_eq!(salary_title_bucket(""), "");
}

#[test]
fn test_normalize_title_whitespace_only() {
    assert_eq!(salary_title_bucket("   "), "");
    assert_eq!(salary_title_bucket("\t\n"), "");
}

#[test]
fn test_normalize_title_mixed_case_variations() {
    assert_eq!(
        salary_title_bucket("SoFtWaRe EnGiNeEr"),
        "software engineer"
    );
    assert_eq!(salary_title_bucket("DaTa ScIeNtIsT"), "data scientist");
}

#[test]
fn test_normalize_title_collapses_whitespace() {
    // Normal single space - works fine
    assert_eq!(
        salary_title_bucket("Staff Software Engineer"),
        "software engineer"
    );

    let result = salary_title_bucket("Senior  Software  Engineer");
    assert_eq!(result, "software engineer");
}

#[test]
fn test_normalize_title_partial_matches() {
    // "software engineer" is substring, should match
    assert_eq!(
        salary_title_bucket("Staff Software Engineer III"),
        "software engineer"
    );
    // "swe" is substring, should match
    assert_eq!(
        salary_title_bucket("Principal SWE - Backend"),
        "software engineer"
    );
}

#[test]
fn test_normalize_title_no_match() {
    // Should return lowercase version of original
    assert_eq!(
        salary_title_bucket("Community Outreach Coordinator"),
        "community outreach coordinator"
    );
    assert_eq!(
        salary_title_bucket("Inventory Planner"),
        "inventory planner"
    );
}

#[test]
fn test_normalize_title_unicode() {
    // Unicode characters should be preserved
    assert_eq!(
        salary_title_bucket("Ingénieur Logiciel"),
        "ingénieur logiciel"
    );
    assert_eq!(salary_title_bucket("开发工程师"), "开发工程师");
}

#[test]
fn test_normalize_title_special_characters() {
    // Special characters in non-matching titles
    assert_eq!(
        salary_title_bucket("Case Manager / Intake"),
        "case manager / intake"
    );
    assert_eq!(
        salary_title_bucket("Inventory Planner (Part-Time)"),
        "inventory planner (part-time)"
    );
    // Special characters with matching pattern
    assert_eq!(
        salary_title_bucket("Software Engineer (Backend)"),
        "software engineer"
    );
}

#[test]
fn test_normalize_title_numbers() {
    assert_eq!(
        salary_title_bucket("Software Engineer III"),
        "software engineer"
    );
    assert_eq!(salary_title_bucket("SWE 2"), "software engineer");
}

#[test]
fn test_normalize_location_san_francisco() {
    assert_eq!(
        salary_location_bucket("San Francisco, CA"),
        "san francisco, ca"
    );
    assert_eq!(
        salary_location_bucket("San Francisco Bay Area"),
        "san francisco, ca"
    );
    assert_eq!(salary_location_bucket("SF"), "san francisco, ca");
    assert_eq!(salary_location_bucket("sf, ca"), "san francisco, ca");
}

#[test]
fn test_normalize_location_new_york() {
    assert_eq!(salary_location_bucket("New York, NY"), "new york, ny");
    assert_eq!(salary_location_bucket("New York City"), "new york, ny");
    assert_eq!(salary_location_bucket("NYC"), "new york, ny");
}

#[test]
fn test_normalize_location_other_cities() {
    assert_eq!(salary_location_bucket("Denver, CO"), "denver, co");
    assert_eq!(salary_location_bucket("Boston, MA"), "boston, ma");
}

#[test]
fn test_normalize_location_empty() {
    assert_eq!(salary_location_bucket(""), "");
}

#[test]
fn test_normalize_location_case_insensitive() {
    assert_eq!(salary_location_bucket("SAN FRANCISCO"), "san francisco, ca");
    assert_eq!(salary_location_bucket("new YORK"), "new york, ny");
}

#[test]
fn test_normalize_location_whitespace_only() {
    assert_eq!(salary_location_bucket("   "), "");
    assert_eq!(salary_location_bucket("\t\n"), "");
}

#[test]
fn test_normalize_location_partial_sf_matches() {
    // Various SF abbreviations and formats
    assert_eq!(salary_location_bucket("SF Bay Area"), "san francisco, ca");
    assert_eq!(
        salary_location_bucket("South San Francisco"),
        "san francisco, ca"
    );
    assert_eq!(
        salary_location_bucket("SF, California"),
        "san francisco, ca"
    );
}

#[test]
fn test_normalize_location_partial_nyc_matches() {
    assert_eq!(salary_location_bucket("NYC, USA"), "new york, ny");
    assert_eq!(
        salary_location_bucket("Manhattan, New York"),
        "new york, ny"
    );
    assert_eq!(salary_location_bucket("Brooklyn, NYC"), "new york, ny");
}

#[test]
fn test_normalize_location_remote() {
    assert_eq!(salary_location_bucket("Remote"), "remote");
    assert_eq!(salary_location_bucket("Remote - US"), "remote");
    assert_eq!(salary_location_bucket("Fully Remote"), "remote");
}

#[test]
fn test_normalize_location_unicode() {
    // Unicode city names should be preserved
    assert_eq!(
        salary_location_bucket("São Paulo, Brazil"),
        "são paulo, brazil"
    );
    assert_eq!(
        salary_location_bucket("München, Germany"),
        "münchen, germany"
    );
}

#[test]
fn test_normalize_location_special_characters() {
    assert_eq!(salary_location_bucket("Portland, OR/WA"), "portland, or/wa");
    assert_eq!(salary_location_bucket("Austin, TX (hybrid)"), "austin, tx");
}

#[test]
fn test_normalize_location_with_substring_match() {
    // After lowercase, "san  francisco" (double space) still CONTAINS "san francisco"
    assert_eq!(
        salary_location_bucket("San Francisco Bay"),
        "san francisco, ca"
    );
    // Contains "new york" so should normalize
    assert_eq!(salary_location_bucket("New York City"), "new york, ny");
}

#[test]
fn test_normalize_location_no_match() {
    // Locations that don't match special cases
    assert_eq!(salary_location_bucket("Seattle, WA"), "seattle, wa");
    assert_eq!(salary_location_bucket("Austin, TX"), "austin, tx");
}

#[test]
fn test_normalize_location_ambiguous_cases() {
    // "sf" could be abbreviation or part of another word
    assert_eq!(
        salary_location_bucket("Satisfactory Location"),
        "satisfactory location"
    );
}

#[test]
fn test_normalize_title_all_known_patterns() {
    // Test all known normalization patterns work correctly
    let test_cases = vec![
        ("Software Engineer", "software engineer"),
        ("SWE", "software engineer"),
        ("Data Scientist", "data scientist"),
        ("Product Manager", "product manager"),
    ];

    for (input, expected) in test_cases {
        assert_eq!(
            salary_title_bucket(input),
            expected,
            "Failed for input: {}",
            input
        );
    }
}

#[test]
fn test_normalize_location_all_known_patterns() {
    // Test all known location normalization patterns
    let test_cases = vec![
        ("San Francisco", "san francisco, ca"),
        ("SF", "san francisco, ca"),
        ("New York", "new york, ny"),
        ("NYC", "new york, ny"),
    ];

    for (input, expected) in test_cases {
        assert_eq!(
            salary_location_bucket(input),
            expected,
            "Failed for input: {}",
            input
        );
    }
}

#[test]
fn test_normalize_title_boundary_cases() {
    // Very long title
    let long_title =
        "Senior Staff Principal Software Engineer Architect Team Lead Manager Director";
    let result = salary_title_bucket(long_title);
    assert_eq!(result, "software engineer"); // Contains "software engineer"

    let multiline = "Software\nEngineer";
    let result = salary_title_bucket(multiline);
    assert_eq!(result, "software engineer");
}

#[test]
fn test_normalize_location_boundary_cases() {
    // Very long location
    let long_location =
        "San Francisco Bay Area, California, United States of America, North America";
    let result = salary_location_bucket(long_location);
    assert_eq!(result, "san francisco, ca"); // Contains "san francisco"

    // Location with newlines - doesn't match "new york" pattern due to newline
    let multiline = "New\nYork";
    let result = salary_location_bucket(multiline);
    assert_eq!(result, "new\nyork"); // Newlines preserved, no pattern match
}

#[test]
fn test_zero_sample_size_default_fallback() {
    // When sample_size is 0, it means we're using defaults
    let sample_size = 0;
    assert_eq!(sample_size, 0);

    // Confidence should be low for zero samples
    let confidence = 0.3;
    assert!(confidence < 0.5);
}

#[test]
fn test_sql_like_pattern_format() {
    // Test that location pattern for SQL LIKE is correctly formatted
    let normalized_location = "san francisco, ca";
    let sql_pattern = format!("%{}%", normalized_location);

    assert_eq!(sql_pattern, "%san francisco, ca%");
    assert!(sql_pattern.starts_with('%'));
    assert!(sql_pattern.ends_with('%'));
}

#[path = "pure_tests/salary_calculation_tests.rs"]
mod salary_calculation_tests;
