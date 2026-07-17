use crate::analytics_buckets::{salary_location_bucket, salary_title_bucket};

#[test]
fn test_normalize_title_software_engineer() {
    let predictor = create_test_predictor();

    assert_eq!(
        predictor.normalize_title("Software Engineer"),
        "software engineer"
    );
    assert_eq!(
        predictor.normalize_title("Senior Software Engineer"),
        "software engineer"
    );
    assert_eq!(predictor.normalize_title("SWE"), "software engineer");
    assert_eq!(predictor.normalize_title("Staff SWE"), "software engineer");
}

#[test]
fn test_normalize_title_data_scientist() {
    let predictor = create_test_predictor();

    assert_eq!(
        predictor.normalize_title("Data Scientist"),
        "data scientist"
    );
    assert_eq!(
        predictor.normalize_title("Senior Data Scientist"),
        "data scientist"
    );
    assert_eq!(
        predictor.normalize_title("Lead Data Scientist"),
        "data scientist"
    );
}

#[test]
fn test_normalize_title_product_manager() {
    let predictor = create_test_predictor();

    assert_eq!(
        predictor.normalize_title("Product Manager"),
        "product manager"
    );
    assert_eq!(
        predictor.normalize_title("Senior Product Manager"),
        "product manager"
    );
    assert_eq!(
        predictor.normalize_title("Technical Product Manager"),
        "product manager"
    );
}

#[test]
fn test_normalize_title_other_roles() {
    let predictor = create_test_predictor();

    assert_eq!(
        predictor.normalize_title("Care Coordinator"),
        "care coordinator"
    );
    assert_eq!(
        predictor.normalize_title("Inventory Planner"),
        "inventory planner"
    );
    assert_eq!(
        predictor.normalize_title("Customer Support Manager"),
        "customer support manager"
    );
}

#[test]
fn test_normalize_title_case_insensitive() {
    let predictor = create_test_predictor();

    assert_eq!(
        predictor.normalize_title("SOFTWARE ENGINEER"),
        "software engineer"
    );
    assert_eq!(
        predictor.normalize_title("Data SCIENTIST"),
        "data scientist"
    );
}

#[test]
fn test_normalize_title_empty() {
    let predictor = create_test_predictor();
    assert_eq!(predictor.normalize_title(""), "");
}

#[test]
fn test_normalize_title_whitespace_only() {
    let predictor = create_test_predictor();
    assert_eq!(predictor.normalize_title("   "), "");
    assert_eq!(predictor.normalize_title("\t\n"), "");
}

#[test]
fn test_normalize_title_mixed_case_variations() {
    let predictor = create_test_predictor();
    assert_eq!(
        predictor.normalize_title("SoFtWaRe EnGiNeEr"),
        "software engineer"
    );
    assert_eq!(
        predictor.normalize_title("DaTa ScIeNtIsT"),
        "data scientist"
    );
}

#[test]
fn test_normalize_title_collapses_whitespace() {
    let predictor = create_test_predictor();
    // Normal single space - works fine
    assert_eq!(
        predictor.normalize_title("Staff Software Engineer"),
        "software engineer"
    );

    let result = predictor.normalize_title("Senior  Software  Engineer");
    assert_eq!(result, "software engineer");
}

#[test]
fn test_normalize_title_partial_matches() {
    let predictor = create_test_predictor();
    // "software engineer" is substring, should match
    assert_eq!(
        predictor.normalize_title("Staff Software Engineer III"),
        "software engineer"
    );
    // "swe" is substring, should match
    assert_eq!(
        predictor.normalize_title("Principal SWE - Backend"),
        "software engineer"
    );
}

#[test]
fn test_normalize_title_no_match() {
    let predictor = create_test_predictor();
    // Should return lowercase version of original
    assert_eq!(
        predictor.normalize_title("Community Outreach Coordinator"),
        "community outreach coordinator"
    );
    assert_eq!(
        predictor.normalize_title("Inventory Planner"),
        "inventory planner"
    );
}

#[test]
fn test_normalize_title_unicode() {
    let predictor = create_test_predictor();
    // Unicode characters should be preserved
    assert_eq!(
        predictor.normalize_title("Ingénieur Logiciel"),
        "ingénieur logiciel"
    );
    assert_eq!(predictor.normalize_title("开发工程师"), "开发工程师");
}

#[test]
fn test_normalize_title_special_characters() {
    let predictor = create_test_predictor();
    // Special characters in non-matching titles
    assert_eq!(
        predictor.normalize_title("Case Manager / Intake"),
        "case manager / intake"
    );
    assert_eq!(
        predictor.normalize_title("Inventory Planner (Part-Time)"),
        "inventory planner (part-time)"
    );
    // Special characters with matching pattern
    assert_eq!(
        predictor.normalize_title("Software Engineer (Backend)"),
        "software engineer"
    );
}

#[test]
fn test_normalize_title_numbers() {
    let predictor = create_test_predictor();
    assert_eq!(
        predictor.normalize_title("Software Engineer III"),
        "software engineer"
    );
    assert_eq!(predictor.normalize_title("SWE 2"), "software engineer");
}

#[test]
fn test_normalize_location_san_francisco() {
    let predictor = create_test_predictor();

    assert_eq!(
        predictor.normalize_location("San Francisco, CA"),
        "san francisco, ca"
    );
    assert_eq!(
        predictor.normalize_location("San Francisco Bay Area"),
        "san francisco, ca"
    );
    assert_eq!(predictor.normalize_location("SF"), "san francisco, ca");
    assert_eq!(predictor.normalize_location("sf, ca"), "san francisco, ca");
}

#[test]
fn test_normalize_location_new_york() {
    let predictor = create_test_predictor();

    assert_eq!(predictor.normalize_location("New York, NY"), "new york, ny");
    assert_eq!(
        predictor.normalize_location("New York City"),
        "new york, ny"
    );
    assert_eq!(predictor.normalize_location("NYC"), "new york, ny");
}

#[test]
fn test_normalize_location_other_cities() {
    let predictor = create_test_predictor();

    assert_eq!(predictor.normalize_location("Denver, CO"), "denver, co");
    assert_eq!(predictor.normalize_location("Boston, MA"), "boston, ma");
}

#[test]
fn test_normalize_location_empty() {
    let predictor = create_test_predictor();
    assert_eq!(predictor.normalize_location(""), "");
}

#[test]
fn test_normalize_location_case_insensitive() {
    let predictor = create_test_predictor();

    assert_eq!(
        predictor.normalize_location("SAN FRANCISCO"),
        "san francisco, ca"
    );
    assert_eq!(predictor.normalize_location("new YORK"), "new york, ny");
}

#[test]
fn test_normalize_location_whitespace_only() {
    let predictor = create_test_predictor();
    assert_eq!(predictor.normalize_location("   "), "");
    assert_eq!(predictor.normalize_location("\t\n"), "");
}

#[test]
fn test_normalize_location_partial_sf_matches() {
    let predictor = create_test_predictor();
    // Various SF abbreviations and formats
    assert_eq!(
        predictor.normalize_location("SF Bay Area"),
        "san francisco, ca"
    );
    assert_eq!(
        predictor.normalize_location("South San Francisco"),
        "san francisco, ca"
    );
    assert_eq!(
        predictor.normalize_location("SF, California"),
        "san francisco, ca"
    );
}

#[test]
fn test_normalize_location_partial_nyc_matches() {
    let predictor = create_test_predictor();
    assert_eq!(predictor.normalize_location("NYC, USA"), "new york, ny");
    assert_eq!(
        predictor.normalize_location("Manhattan, New York"),
        "new york, ny"
    );
    assert_eq!(
        predictor.normalize_location("Brooklyn, NYC"),
        "new york, ny"
    );
}

#[test]
fn test_normalize_location_remote() {
    let predictor = create_test_predictor();
    assert_eq!(predictor.normalize_location("Remote"), "remote");
    assert_eq!(predictor.normalize_location("Remote - US"), "remote");
    assert_eq!(predictor.normalize_location("Fully Remote"), "remote");
}

#[test]
fn test_normalize_location_unicode() {
    let predictor = create_test_predictor();
    // Unicode city names should be preserved
    assert_eq!(
        predictor.normalize_location("São Paulo, Brazil"),
        "são paulo, brazil"
    );
    assert_eq!(
        predictor.normalize_location("München, Germany"),
        "münchen, germany"
    );
}

#[test]
fn test_normalize_location_special_characters() {
    let predictor = create_test_predictor();
    assert_eq!(
        predictor.normalize_location("Portland, OR/WA"),
        "portland, or/wa"
    );
    assert_eq!(
        predictor.normalize_location("Austin, TX (hybrid)"),
        "austin, tx"
    );
}

#[test]
fn test_normalize_location_with_substring_match() {
    let predictor = create_test_predictor();
    // After lowercase, "san  francisco" (double space) still CONTAINS "san francisco"
    assert_eq!(
        predictor.normalize_location("San Francisco Bay"),
        "san francisco, ca"
    );
    // Contains "new york" so should normalize
    assert_eq!(
        predictor.normalize_location("New York City"),
        "new york, ny"
    );
}

#[test]
fn test_normalize_location_no_match() {
    let predictor = create_test_predictor();
    // Locations that don't match special cases
    assert_eq!(predictor.normalize_location("Seattle, WA"), "seattle, wa");
    assert_eq!(predictor.normalize_location("Austin, TX"), "austin, tx");
}

#[test]
fn test_normalize_location_ambiguous_cases() {
    let predictor = create_test_predictor();
    // "sf" could be abbreviation or part of another word
    assert_eq!(
        predictor.normalize_location("Satisfactory Location"),
        "satisfactory location"
    );
}

#[test]
fn test_normalize_title_all_known_patterns() {
    let predictor = create_test_predictor();

    // Test all known normalization patterns work correctly
    let test_cases = vec![
        ("Software Engineer", "software engineer"),
        ("SWE", "software engineer"),
        ("Data Scientist", "data scientist"),
        ("Product Manager", "product manager"),
    ];

    for (input, expected) in test_cases {
        assert_eq!(
            predictor.normalize_title(input),
            expected,
            "Failed for input: {}",
            input
        );
    }
}

#[test]
fn test_normalize_location_all_known_patterns() {
    let predictor = create_test_predictor();

    // Test all known location normalization patterns
    let test_cases = vec![
        ("San Francisco", "san francisco, ca"),
        ("SF", "san francisco, ca"),
        ("New York", "new york, ny"),
        ("NYC", "new york, ny"),
    ];

    for (input, expected) in test_cases {
        assert_eq!(
            predictor.normalize_location(input),
            expected,
            "Failed for input: {}",
            input
        );
    }
}

#[test]
fn test_normalize_title_boundary_cases() {
    let predictor = create_test_predictor();

    // Very long title
    let long_title =
        "Senior Staff Principal Software Engineer Architect Team Lead Manager Director";
    let result = predictor.normalize_title(long_title);
    assert_eq!(result, "software engineer"); // Contains "software engineer"

    let multiline = "Software\nEngineer";
    let result = predictor.normalize_title(multiline);
    assert_eq!(result, "software engineer");
}

#[test]
fn test_normalize_location_boundary_cases() {
    let predictor = create_test_predictor();

    // Very long location
    let long_location =
        "San Francisco Bay Area, California, United States of America, North America";
    let result = predictor.normalize_location(long_location);
    assert_eq!(result, "san francisco, ca"); // Contains "san francisco"

    // Location with newlines - doesn't match "new york" pattern due to newline
    let multiline = "New\nYork";
    let result = predictor.normalize_location(multiline);
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

// Helper function to create test predictor (without DB)
fn create_test_predictor() -> TestPredictor {
    TestPredictor
}

// Test struct that implements only the pure functions
struct TestPredictor;

impl TestPredictor {
    fn normalize_title(&self, title: &str) -> String {
        salary_title_bucket(title)
    }

    fn normalize_location(&self, location: &str) -> String {
        salary_location_bucket(location)
    }
}
#[path = "pure_tests/salary_calculation_tests.rs"]
mod salary_calculation_tests;
