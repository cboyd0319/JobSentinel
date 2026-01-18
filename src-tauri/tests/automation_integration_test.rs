//! Automation Module Integration Tests
//!
//! Tests for the One-Click Apply automation module (v2.0+).
//! This module enables form-filling automation without auto-submit.
//!
//! Test coverage:
//! - ATS platform detection (URL patterns)
//! - Profile data structures
//! - Automation attempt structures
//! - Screening answer matching

use jobsentinel::core::automation::{ats_detector::AtsDetector, AtsPlatform, AutomationStatus};

// ============================================================================
// ATS Detection Tests (URL-based)
// ============================================================================

#[test]
fn test_detect_greenhouse_url() {
    // Greenhouse URL patterns
    assert_eq!(
        AtsDetector::detect_from_url("https://boards.greenhouse.io/company/jobs/123"),
        AtsPlatform::Greenhouse
    );
    assert_eq!(
        AtsDetector::detect_from_url("https://job-boards.greenhouse.io/stripe"),
        AtsPlatform::Greenhouse
    );
}

#[test]
fn test_detect_lever_url() {
    // Lever URL patterns
    assert_eq!(
        AtsDetector::detect_from_url("https://jobs.lever.co/company/abc-123"),
        AtsPlatform::Lever
    );
    assert_eq!(
        AtsDetector::detect_from_url("https://jobs.lever.co/stripe/engineer"),
        AtsPlatform::Lever
    );
}

#[test]
fn test_detect_workday_url() {
    assert_eq!(
        AtsDetector::detect_from_url("https://company.wd5.myworkdayjobs.com/careers"),
        AtsPlatform::Workday
    );
}

#[test]
fn test_detect_unknown_url() {
    assert_eq!(
        AtsDetector::detect_from_url("https://example.com/jobs/123"),
        AtsPlatform::Unknown
    );
    assert_eq!(
        AtsDetector::detect_from_url("https://careers.company.com/apply"),
        AtsPlatform::Unknown
    );
}

// ============================================================================
// ATS Platform Enum Tests
// ============================================================================

#[test]
fn test_ats_platform_to_string() {
    assert_eq!(AtsPlatform::Greenhouse.as_str(), "greenhouse");
    assert_eq!(AtsPlatform::Lever.as_str(), "lever");
    assert_eq!(AtsPlatform::Workday.as_str(), "workday");
    assert_eq!(AtsPlatform::Taleo.as_str(), "taleo");
    assert_eq!(AtsPlatform::Icims.as_str(), "icims");
    assert_eq!(AtsPlatform::BambooHr.as_str(), "bamboohr");
    assert_eq!(AtsPlatform::AshbyHq.as_str(), "ashbyhq");
    assert_eq!(AtsPlatform::Unknown.as_str(), "unknown");
}

#[test]
fn test_ats_platform_from_string() {
    assert_eq!(AtsPlatform::from_str("greenhouse"), AtsPlatform::Greenhouse);
    assert_eq!(AtsPlatform::from_str("lever"), AtsPlatform::Lever);
    assert_eq!(AtsPlatform::from_str("unknown"), AtsPlatform::Unknown);
    assert_eq!(AtsPlatform::from_str("invalid"), AtsPlatform::Unknown);
}

// ============================================================================
// Automation Status Tests
// ============================================================================

#[test]
fn test_automation_status_to_string() {
    assert_eq!(AutomationStatus::Pending.as_str(), "pending");
    assert_eq!(AutomationStatus::InProgress.as_str(), "in_progress");
    assert_eq!(
        AutomationStatus::AwaitingApproval.as_str(),
        "awaiting_approval"
    );
    assert_eq!(AutomationStatus::Submitted.as_str(), "submitted");
    assert_eq!(AutomationStatus::Failed.as_str(), "failed");
    assert_eq!(AutomationStatus::Cancelled.as_str(), "cancelled");
}

#[test]
fn test_automation_status_from_string() {
    assert_eq!(
        AutomationStatus::from_str("pending"),
        AutomationStatus::Pending
    );
    assert_eq!(
        AutomationStatus::from_str("in_progress"),
        AutomationStatus::InProgress
    );
    assert_eq!(
        AutomationStatus::from_str("awaiting_approval"),
        AutomationStatus::AwaitingApproval
    );
    assert_eq!(
        AutomationStatus::from_str("submitted"),
        AutomationStatus::Submitted
    );
    assert_eq!(
        AutomationStatus::from_str("failed"),
        AutomationStatus::Failed
    );
    assert_eq!(
        AutomationStatus::from_str("cancelled"),
        AutomationStatus::Cancelled
    );
    // Invalid status defaults to Failed
    assert_eq!(
        AutomationStatus::from_str("invalid"),
        AutomationStatus::Failed
    );
}

// ============================================================================
// ATS Common Fields Tests
// ============================================================================

#[test]
fn test_greenhouse_common_fields() {
    let fields = AtsDetector::get_common_fields(&AtsPlatform::Greenhouse);
    assert!(fields.contains(&"first_name"));
    assert!(fields.contains(&"last_name"));
    assert!(fields.contains(&"email"));
}

#[test]
fn test_lever_common_fields() {
    let fields = AtsDetector::get_common_fields(&AtsPlatform::Lever);
    assert!(fields.contains(&"name"));
    assert!(fields.contains(&"email"));
}

#[test]
fn test_automation_notes() {
    let notes = AtsDetector::get_automation_notes(&AtsPlatform::Greenhouse);
    assert!(notes.contains("Greenhouse"));

    let notes = AtsDetector::get_automation_notes(&AtsPlatform::Lever);
    assert!(notes.contains("Lever"));
}
