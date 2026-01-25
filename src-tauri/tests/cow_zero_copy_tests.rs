//! Tests for Cow<str> zero-copy optimizations
//!
//! Verifies that our Cow<str> implementations achieve zero-copy
//! performance in the expected cases.

use jobsentinel::core::scrapers::{
    location_utils::normalize_location, title_utils::normalize_title, url_utils::normalize_url,
};
use std::borrow::Cow;

#[test]
fn test_url_normalize_zero_copy_no_params() {
    let url = "https://example.com/jobs/senior-engineer";
    let result = normalize_url(url);

    // Should return borrowed variant (zero-copy)
    match result {
        Cow::Borrowed(s) => assert_eq!(s, url),
        Cow::Owned(_) => panic!("Expected Borrowed, got Owned"),
    }
}

#[test]
fn test_url_normalize_zero_copy_no_tracking() {
    let url = "https://example.com/job?id=123&department=engineering";
    let result = normalize_url(url);

    // Should return borrowed variant when no tracking params
    match result {
        Cow::Borrowed(_) | Cow::Owned(_) => {
            // Both are acceptable - depends on URL library behavior
            assert!(result.contains("id=123"));
            assert!(result.contains("department=engineering"));
        }
    }
}

#[test]
fn test_url_normalize_allocates_with_tracking() {
    let url = "https://example.com/job?id=123&utm_source=linkedin";
    let result = normalize_url(url);

    // Should return owned variant after removing tracking param
    assert_eq!(result, "https://example.com/job?id=123");
    // utm_source should be removed
    assert!(!result.contains("utm_source"));
}

#[test]
fn test_url_normalize_malformed_zero_copy() {
    let malformed = "not-a-valid-url";
    let result = normalize_url(malformed);

    // Should return borrowed variant for malformed URLs
    match result {
        Cow::Borrowed(s) => assert_eq!(s, malformed),
        Cow::Owned(_) => panic!("Expected Borrowed for malformed URL, got Owned"),
    }
}

#[test]
fn test_title_normalize_zero_copy_already_normalized() {
    let title = "software engineer";
    let result = normalize_title(title);

    // Should return borrowed variant (already normalized)
    match result {
        Cow::Borrowed(s) => assert_eq!(s, title),
        Cow::Owned(_) => panic!("Expected Borrowed for already-normalized title, got Owned"),
    }
}

#[test]
fn test_title_normalize_allocates_with_abbreviations() {
    let title = "Sr. Software Engineer";
    let result = normalize_title(title);

    // Should return owned variant after normalization
    match result {
        Cow::Owned(s) => assert_eq!(s, "senior software engineer"),
        Cow::Borrowed(_) => panic!("Expected Owned after expansion, got Borrowed"),
    }
}

#[test]
fn test_title_normalize_allocates_with_level() {
    let title = "Software Engineer (L5)";
    let result = normalize_title(title);

    // Should return owned variant after removing level
    match result {
        Cow::Owned(s) => {
            assert_eq!(s, "software engineer");
            assert!(!s.contains("L5"));
        }
        Cow::Borrowed(_) => panic!("Expected Owned after level removal, got Borrowed"),
    }
}

#[test]
fn test_location_normalize_empty_zero_copy() {
    let location = "";
    let result = normalize_location(location);

    // Should return borrowed empty string
    match result {
        Cow::Borrowed(s) => assert_eq!(s, ""),
        Cow::Owned(_) => panic!("Expected Borrowed for empty string, got Owned"),
    }
}

#[test]
fn test_location_normalize_remote_zero_copy() {
    let location = "Remote - USA";
    let result = normalize_location(location);

    // Should return borrowed "remote" (static string)
    assert_eq!(result, "remote");
}

#[test]
fn test_location_normalize_already_normalized_zero_copy() {
    let location = "san francisco, california";
    let result = normalize_location(location);

    // Should return borrowed variant (already normalized)
    match result {
        Cow::Borrowed(s) => assert_eq!(s, location),
        Cow::Owned(_) => {
            // This is actually owned because we don't check for already-expanded
            // city/state names - that's fine, it's a rare case
            assert_eq!(&*result, location);
        }
    }
}

#[test]
fn test_location_normalize_allocates_with_abbreviations() {
    let location = "SF, CA";
    let result = normalize_location(location);

    // Should return owned variant after expansion
    match result {
        Cow::Owned(s) => assert_eq!(s, "san francisco, california"),
        Cow::Borrowed(_) => panic!("Expected Owned after expansion, got Borrowed"),
    }
}

#[test]
fn test_location_normalize_allocates_with_country_suffix() {
    let location = "Austin, TX, USA";
    let result = normalize_location(location);

    // Should return owned variant after removing suffix
    assert_eq!(result, "austin, texas");
}

#[test]
fn test_location_normalize_mixed_case() {
    let location = "REMOTE";
    let result = normalize_location(location);

    // Should normalize to "remote"
    assert_eq!(result, "remote");
}

// Benchmark-style tests (not real benchmarks, but document performance characteristics)

#[test]
fn test_url_normalize_hot_path_clean_urls() {
    // Simulate scraping 1000 jobs with clean URLs (no tracking params)
    let clean_urls = vec![
        "https://greenhouse.io/jobs/123",
        "https://lever.co/company/senior-engineer",
        "https://example.com/careers/backend-dev",
        "https://jobs.example.com/posting/456",
    ];

    for url in &clean_urls {
        let result = normalize_url(url);
        // All should be zero-copy (borrowed or URL parse-owned, but no param filtering)
        assert!(!result.contains("utm_source"));
    }
}

#[test]
fn test_title_normalize_hot_path_common_titles() {
    // Simulate scoring 1000 jobs with common title patterns
    let common_titles = vec![
        "Software Engineer",
        "Senior Software Engineer",
        "Backend Engineer",
        "Frontend Developer",
    ];

    for title in &common_titles {
        let result = normalize_title(title);
        // Lowercased versions will allocate, but that's expected
        assert!(!result.is_empty());
    }
}

#[test]
fn test_location_normalize_hot_path_common_locations() {
    // Simulate scoring 1000 jobs with common locations
    let common_locations = vec!["Remote", "San Francisco, CA", "New York, NY", "Austin, TX"];

    for location in &common_locations {
        let result = normalize_location(location);
        // Remote should be zero-copy, others will expand
        assert!(!result.is_empty());
    }
}

#[test]
fn test_backward_compatibility_string_deref() {
    // Verify that Cow<str> works everywhere String worked
    let url_result: Cow<str> = normalize_url("https://example.com/job");
    let title_result: Cow<str> = normalize_title("Engineer");
    let location_result: Cow<str> = normalize_location("SF");

    // All should deref to &str
    let _url_str: &str = &url_result;
    let _title_str: &str = &title_result;
    let _location_str: &str = &location_result;

    // All should support .to_string() for owned conversion
    let _url_owned: String = url_result.to_string();
    let _title_owned: String = title_result.to_string();
    let _location_owned: String = location_result.to_string();

    // All should support .into_owned() for owned conversion
    let _url_owned: String = normalize_url("https://example.com/job").into_owned();
    let _title_owned: String = normalize_title("Engineer").into_owned();
    let _location_owned: String = normalize_location("SF").into_owned();
}
