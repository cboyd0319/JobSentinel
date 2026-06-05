use super::*;

#[test]
fn test_sanitize_automation_log_url_removes_sensitive_parts() {
    let sanitized = sanitize_url_for_logging(
        "https://user:pass@example.com/jobs/123?token=secret&session=abc#private",
    );

    assert_eq!(sanitized, "https://example.com/jobs/123");
}

#[test]
fn test_sanitize_automation_log_url_truncates_long_path() {
    let sanitized =
        sanitize_url_for_logging(&format!("https://example.com/jobs/{}", "a".repeat(120)));

    assert!(sanitized.starts_with("https://example.com/jobs/"));
    assert!(sanitized.ends_with("..."));
    assert!(sanitized.len() <= 83);
}

#[test]
fn test_sanitize_automation_log_url_handles_invalid_url() {
    let sanitized = sanitize_url_for_logging("not a url with token=secret");

    assert_eq!(sanitized, "<invalid-url>");
}

#[test]
fn prepare_form_target_accepts_recognized_application_site() {
    let (url, platform) =
        prepare_form_target("https://jobs.lever.co/example/123").expect("recognized target");

    assert!(url.starts_with("https://jobs.lever.co/example/123"));
    assert_eq!(platform, AtsPlatform::Lever);
}

#[test]
fn prepare_form_target_rejects_unknown_application_site() {
    let err = prepare_form_target("https://example.com/apply").unwrap_err();

    assert!(err.contains("recognized application sites"));
}

#[test]
fn prepare_form_target_rejects_unsafe_application_site() {
    let err = prepare_form_target("http://localhost:3000/apply").unwrap_err();

    assert!(err.contains("Cannot open that job link"));
}

#[test]
fn application_page_match_accepts_same_platform_url() {
    assert!(application_page_matches_platform(
        "https://jobs.lever.co/example/123",
        &AtsPlatform::Lever
    ));
}

#[test]
fn application_page_match_rejects_cross_platform_redirect() {
    assert!(!application_page_matches_platform(
        "https://boards.greenhouse.io/example/jobs/123",
        &AtsPlatform::Lever
    ));
}

#[test]
fn application_page_match_rejects_unknown_or_lookalike_url() {
    assert!(!application_page_matches_platform(
        "https://example.com/apply",
        &AtsPlatform::Lever
    ));
    assert!(!application_page_matches_platform(
        "https://jobs.lever.co.evil.example/apply",
        &AtsPlatform::Lever
    ));
}

#[test]
fn attempt_response_exposes_screenshot_presence_not_paths() {
    let attempt = ApplicationAttempt {
        id: 1,
        job_hash: "job_hash".to_string(),
        application_id: None,
        status: AutomationStatus::Pending,
        ats_platform: AtsPlatform::Greenhouse,
        error_message: None,
        screenshot_path: Some("private/apply.png".to_string()),
        confirmation_screenshot_path: None,
        automation_duration_ms: Some(1200),
        user_approved: false,
        submitted_at: None,
        created_at: chrono::Utc::now(),
    };

    let response = AttemptResponse::from(attempt);
    let json = serde_json::to_string(&response).unwrap();

    assert!(response.has_screenshot);
    assert!(!response.has_confirmation_screenshot);
    assert!(json.contains("hasScreenshot"));
    assert!(!json.contains("private/apply.png"));
    assert!(!json.contains("screenshotPath"));
}
