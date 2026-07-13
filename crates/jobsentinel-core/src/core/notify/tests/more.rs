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

#[test]
fn test_provider_failure_summary_omits_error_body() {
    let secret_body = "Care Coordinator at Community Care Network https://example.com/jobs/123";
    let summary = format_provider_failure_summary(
        reqwest::StatusCode::BAD_REQUEST,
        Some(secret_body.chars().count()),
    );

    assert!(summary.contains("400 Bad Request"));
    assert!(summary.contains("provider error body omitted"));
    assert!(!summary.contains("Care Coordinator"));
    assert!(!summary.contains("Community Care Network"));
    assert!(!summary.contains("https://example.com/jobs/123"));
}

#[test]
fn test_provider_failure_summary_handles_unreadable_body() {
    let summary = format_provider_failure_summary(reqwest::StatusCode::TOO_MANY_REQUESTS, None);

    assert_eq!(
        summary,
        "status 429 Too Many Requests; provider error body unavailable"
    );
}

#[tokio::test]
async fn test_notification_http_client_blocks_loopback_destination() {
    let error = notification_http_client_for_url("https://127.0.0.1/webhook")
        .await
        .expect_err("loopback notification destinations should be blocked");

    assert!(
        error
            .to_string()
            .contains("Blocked notification destination"),
        "{error}"
    );
}

#[tokio::test]
async fn test_notification_http_client_accepts_public_https_ip_destination() {
    let (_client, url) = notification_http_client_for_url("https://93.184.216.34/webhook")
        .await
        .expect("public HTTPS IP destinations should build a client");

    assert_eq!(url.as_str(), "https://93.184.216.34/webhook");
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
