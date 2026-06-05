use super::*;

// Remote inference tests
#[test]
fn test_infer_remote_from_title_remote() {
    assert!(LeverScraper::infer_remote(
        "Care Coordinator (Remote)",
        None
    ));
    assert!(LeverScraper::infer_remote(
        "REMOTE - Program Coordinator",
        None
    ));
    assert!(LeverScraper::infer_remote(
        "Inventory Planner - remote",
        None
    ));
}

#[test]
fn test_infer_remote_from_title_wfh() {
    assert!(LeverScraper::infer_remote(
        "Program Coordinator (Work From Home)",
        None
    ));
    assert!(LeverScraper::infer_remote(
        "WFH - Public Health Analyst",
        None
    ));
}

#[test]
fn test_infer_remote_from_location_remote() {
    assert!(LeverScraper::infer_remote(
        "Program Coordinator",
        Some("Remote")
    ));
    assert!(LeverScraper::infer_remote(
        "Care Coordinator",
        Some("Remote - US")
    ));
    assert!(LeverScraper::infer_remote(
        "Inventory Planner",
        Some("REMOTE")
    ));
}

#[test]
fn test_infer_remote_from_location_anywhere() {
    assert!(LeverScraper::infer_remote(
        "Care Coordinator",
        Some("Anywhere")
    ));
    assert!(LeverScraper::infer_remote(
        "Program Coordinator",
        Some("anywhere in USA")
    ));
}

#[test]
fn test_infer_remote_from_location_worldwide() {
    assert!(LeverScraper::infer_remote(
        "Public Health Analyst",
        Some("Worldwide")
    ));
    assert!(LeverScraper::infer_remote(
        "Inventory Planner",
        Some("worldwide - remote")
    ));
}

#[test]
fn test_infer_remote_false_for_onsite() {
    assert!(!LeverScraper::infer_remote(
        "Customer Support Manager",
        Some("San Francisco")
    ));
    assert!(!LeverScraper::infer_remote(
        "Program Coordinator",
        Some("New York, NY")
    ));
    assert!(!LeverScraper::infer_remote(
        "Inventory Planner",
        Some("Seattle")
    ));
}

#[test]
fn test_infer_remote_false_no_indicators() {
    assert!(!LeverScraper::infer_remote("Care Coordinator", None));
    assert!(!LeverScraper::infer_remote(
        "Inventory Planner",
        Some("Boston")
    ));
}

#[test]
fn test_infer_remote_case_insensitive() {
    assert!(LeverScraper::infer_remote(
        "Care Coordinator (REMOTE)",
        None
    ));
    assert!(LeverScraper::infer_remote("Planner", Some("ReMoTe")));
}

#[test]
fn test_infer_remote_from_combined_indicators() {
    // Both title and location indicate remote
    assert!(LeverScraper::infer_remote(
        "Remote Senior Care Coordinator",
        Some("Remote - Global")
    ));

    // Title says remote, location doesn't
    assert!(LeverScraper::infer_remote(
        "Remote Program Coordinator",
        Some("San Francisco")
    ));

    // Location says remote, title doesn't
    assert!(LeverScraper::infer_remote(
        "Senior Public Health Analyst",
        Some("Remote - US")
    ));

    // Neither indicates remote
    assert!(!LeverScraper::infer_remote(
        "Senior Public Health Analyst",
        Some("New York, NY")
    ));
}

#[test]
fn test_infer_remote_edge_cases() {
    // "remote" as part of a larger word should still match
    assert!(LeverScraper::infer_remote("remotely", None));

    // Multiple remote indicators
    assert!(LeverScraper::infer_remote(
        "Remote Work From Home Care Coordinator",
        Some("Anywhere")
    ));

    // Empty location
    assert!(!LeverScraper::infer_remote("Care Coordinator", Some("")));

    // None location with non-remote title
    assert!(!LeverScraper::infer_remote("Senior Care Coordinator", None));
}
