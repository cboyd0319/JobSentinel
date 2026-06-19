use super::*;

fn valid_application_profile_input() -> ApplicationProfileInput {
    ApplicationProfileInput {
        full_name: "Jordan Lee".to_string(),
        email: "jordan@example.com".to_string(),
        phone: None,
        linkedin_url: None,
        github_url: None,
        portfolio_url: None,
        website_url: None,
        default_resume_id: None,
        resume_file_path: None,
        resume_file_token: None,
        clear_resume_file: None,
        default_cover_letter_template: None,
        us_work_authorized: true,
        requires_sponsorship: false,
        max_applications_per_day: 10,
        require_manual_approval: true,
    }
}

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
fn prepare_form_target_accepts_expanded_recognized_application_site() {
    let (url, platform) = prepare_form_target(
        "https://jobs.smartrecruiters.com/ExampleCompany/123-security-engineer",
    )
    .expect("recognized target");

    assert!(url.starts_with("https://jobs.smartrecruiters.com/ExampleCompany/123"));
    assert_eq!(platform, AtsPlatform::SmartRecruiters);
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
fn prepare_form_target_rejects_plain_http_application_site() {
    let err = prepare_form_target("http://jobs.lever.co/example/123").unwrap_err();

    assert!(err.contains("https required"));
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

#[tokio::test]
async fn upsert_application_profile_cleans_replaced_and_cleared_managed_resume_files() {
    let database = crate::core::db::Database::connect_memory()
        .await
        .expect("test database");
    database.migrate().await.expect("migrations");
    let manager = ProfileManager::new(database.pool().clone());
    let managed_dir = tempfile::tempdir().unwrap();

    let old_token = "7d9d16a1-2e5d-4b32-9eb2-bfbffb4ee871--old-resume.pdf";
    let new_token = "9f65f13d-6f6e-4bf7-a6ee-6982edfb93c5--new-resume.pdf";
    let old_resume = managed_dir.path().join(old_token);
    let new_resume = managed_dir.path().join(new_token);
    std::fs::write(&old_resume, b"old").unwrap();
    std::fs::write(&new_resume, b"new").unwrap();

    manager
        .upsert_profile(&ApplicationProfileInput {
            resume_file_path: Some(old_resume.to_string_lossy().to_string()),
            ..valid_application_profile_input()
        })
        .await
        .unwrap();

    upsert_application_profile_with_resume_cleanup(
        ApplicationProfileInput {
            resume_file_token: Some(new_token.to_string()),
            ..valid_application_profile_input()
        },
        &manager,
        managed_dir.path(),
    )
    .await
    .unwrap();

    assert!(!old_resume.exists());
    assert!(new_resume.exists());
    assert_eq!(
        manager
            .get_profile()
            .await
            .unwrap()
            .unwrap()
            .resume_file_path,
        Some(new_resume.to_string_lossy().to_string())
    );

    upsert_application_profile_with_resume_cleanup(
        ApplicationProfileInput {
            clear_resume_file: Some(true),
            ..valid_application_profile_input()
        },
        &manager,
        managed_dir.path(),
    )
    .await
    .unwrap();

    assert!(!new_resume.exists());
    assert_eq!(
        manager
            .get_profile()
            .await
            .unwrap()
            .unwrap()
            .resume_file_path,
        None
    );
}
