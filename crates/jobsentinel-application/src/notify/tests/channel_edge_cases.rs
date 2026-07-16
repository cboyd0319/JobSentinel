use super::*;

#[test]
fn test_job_source_validation() {
    let notification = create_test_notification();

    // Source should be a known scraper
    let valid_sources = [
        "greenhouse",
        "lever",
        "linkedin",
        "remoteok",
        "weworkremotely",
        "hn_hiring",
        "yc_startup",
        "dice",
        "builtin",
        "usajobs",
        "jobswithgpt",
    ];
    assert!(
        valid_sources.contains(&notification.job.source.as_str()),
        "Job source should be a known scraper"
    );
}

#[test]
fn test_notification_job_not_hidden() {
    let notification = create_test_notification();

    assert!(
        !notification.job.hidden,
        "High-scoring jobs for alerts should not be hidden"
    );
}

#[test]
fn test_notification_alert_not_sent_initially() {
    let notification = create_test_notification();

    assert!(
        !notification.job.immediate_alert_sent,
        "New job should not have alert sent yet"
    );
}

#[test]
fn test_notification_times_seen_positive() {
    let notification = create_test_notification();

    assert!(
        notification.job.times_seen > 0,
        "Job should have been seen at least once"
    );
}

#[test]
fn test_notification_company_not_empty() {
    let notification = create_test_notification();

    assert!(
        !notification.job.company.is_empty(),
        "Company name should not be empty"
    );
}

#[test]
fn test_notification_title_not_empty() {
    let notification = create_test_notification();

    assert!(
        !notification.job.title.is_empty(),
        "Job title should not be empty"
    );
}

// Note: Tests for actual HTTP notification sending are in the individual modules
// (slack.rs, discord.rs, teams.rs, telegram.rs, email.rs) as they require
// mocking HTTP clients or integration testing with real endpoints.
//
// The NotificationService::send_immediate_alert method's HTTP orchestration would require:
// - Mock HTTP servers (wiremock/mockito crates)
// - Integration tests with test webhooks
// - Testing the error handling with simulated failures
//
// These are better suited for integration tests rather than unit tests.
