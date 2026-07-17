use super::*;
use crate::test_support::notification_fixture;

#[test]
fn test_html_email_formatting() {
    let notification = notification_fixture();
    let html = format_html_email(&notification.job, &notification.score);

    // Verify key components are present
    assert!(html.contains("Care Coordinator"));
    assert!(html.contains("Community Care Network"));
    assert!(html.contains("95")); // Score percentage
    assert!(html.contains("REMOTE"));
    assert!(html.contains("$180,000 - $220,000"));
    assert!(html.contains("greenhouse"));
    assert!(html.contains(LOCAL_MATCH_DETAILS_MESSAGE));
    assert!(!html.contains("Title matches: Care Coordinator"));
    assert!(html.contains("https://example.com/jobs/123"));
}

#[test]
fn test_text_email_formatting() {
    let notification = notification_fixture();
    let text = format_text_email(&notification.job, &notification.score);

    // Verify key components are present
    assert!(text.contains("Care Coordinator"));
    assert!(text.contains("Community Care Network"));
    assert!(text.contains("95%"));
    assert!(text.contains("Yes")); // Remote
    assert!(text.contains("$180,000 - $220,000"));
    assert!(text.contains(LOCAL_MATCH_DETAILS_MESSAGE));
    assert!(!text.contains("Title matches: Care Coordinator"));
}

#[test]
fn test_html_email_handles_missing_salary() {
    let mut notification = notification_fixture();
    notification.job.salary_min = None;
    notification.job.salary_max = None;

    let html = format_html_email(&notification.job, &notification.score);
    assert!(html.contains("Not specified"));
}

#[test]
fn test_html_email_handles_min_salary_only() {
    let mut notification = notification_fixture();
    notification.job.salary_max = None;

    let html = format_html_email(&notification.job, &notification.score);
    assert!(html.contains("$180,000+"));
}

#[test]
fn test_html_email_handles_missing_location() {
    let mut notification = notification_fixture();
    notification.job.location = None;

    let html = format_html_email(&notification.job, &notification.score);
    assert!(html.contains("N/A"));
}

#[test]
fn test_html_email_keeps_match_reasons_local() {
    let notification = notification_fixture();
    let html = format_html_email(&notification.job, &notification.score);

    assert!(html.contains(LOCAL_MATCH_DETAILS_MESSAGE));
    for reason in &notification.score.reasons {
        assert!(
            !html.contains(reason),
            "HTML should not contain raw match reason: {}",
            reason
        );
    }
}

#[test]
fn test_text_email_keeps_match_reasons_local() {
    let notification = notification_fixture();
    let text = format_text_email(&notification.job, &notification.score);

    assert!(text.contains(LOCAL_MATCH_DETAILS_MESSAGE));
    for reason in &notification.score.reasons {
        assert!(
            !text.contains(reason),
            "Text should not contain raw match reason: {}",
            reason
        );
    }
}

#[test]
fn test_text_email_handles_missing_salary() {
    let mut notification = notification_fixture();
    notification.job.salary_min = None;
    notification.job.salary_max = None;

    let text = format_text_email(&notification.job, &notification.score);
    assert!(text.contains("Not specified"));
}

#[test]
fn test_text_email_handles_min_salary_only() {
    let mut notification = notification_fixture();
    notification.job.salary_max = None;

    let text = format_text_email(&notification.job, &notification.score);
    assert!(text.contains("$180,000+"));
}

#[test]
fn test_text_email_handles_missing_location() {
    let mut notification = notification_fixture();
    notification.job.location = None;

    let text = format_text_email(&notification.job, &notification.score);
    assert!(text.contains("N/A"));
}

#[test]
fn test_html_email_no_remote_badge() {
    let mut notification = notification_fixture();
    notification.job.remote = Some(false);

    let html = format_html_email(&notification.job, &notification.score);
    assert!(
        !html.contains("REMOTE"),
        "Non-remote job should not have REMOTE badge"
    );
}

#[test]
fn test_html_email_handles_none_remote() {
    let mut notification = notification_fixture();
    notification.job.remote = None;

    let html = format_html_email(&notification.job, &notification.score);
    assert!(
        !html.contains("REMOTE"),
        "Job with None remote should not have REMOTE badge"
    );
}

#[test]
fn test_text_email_remote_no() {
    let mut notification = notification_fixture();
    notification.job.remote = Some(false);

    let text = format_text_email(&notification.job, &notification.score);
    assert!(text.contains("REMOTE: No"));
}

#[test]
fn test_html_email_score_formatting() {
    let mut notification = notification_fixture();

    // Test various scores
    for (score, expected) in [(0.95, "95"), (0.90, "90"), (1.00, "100"), (0.876, "88")] {
        notification.score.total = score;
        let html = format_html_email(&notification.job, &notification.score);
        assert!(
            html.contains(&format!("{}%", expected)),
            "Score {} should format to {}%",
            score,
            expected
        );
    }
}

#[test]
fn test_text_email_score_formatting() {
    let mut notification = notification_fixture();

    for (score, expected) in [(0.95, "95%"), (0.90, "90%"), (1.00, "100%")] {
        notification.score.total = score;
        let text = format_text_email(&notification.job, &notification.score);
        assert!(
            text.contains(expected),
            "Score {} should format to {}",
            score,
            expected
        );
    }
}

#[test]
fn test_html_email_structure() {
    let notification = notification_fixture();
    let html = format_html_email(&notification.job, &notification.score);

    // Verify HTML structure
    assert!(html.contains("<!DOCTYPE html>"));
    assert!(html.contains("<html>"));
    assert!(html.contains("</html>"));
    assert!(html.contains("<body"));
    assert!(html.contains("</body>"));
}

#[test]
fn test_text_email_structure() {
    let notification = notification_fixture();
    let text = format_text_email(&notification.job, &notification.score);

    // Verify plain text structure
    assert!(text.contains("HIGH MATCH JOB ALERT"));
    assert!(text.contains("COMPANY:"));
    assert!(text.contains("LOCATION:"));
    assert!(text.contains("SALARY:"));
    assert!(text.contains("WHY THIS MATCHES:"));
    assert!(text.contains("VIEW JOB:"));
}

#[test]
fn test_html_email_empty_reasons() {
    let mut notification = notification_fixture();
    notification.score.reasons = vec![];

    let html = format_html_email(&notification.job, &notification.score);
    assert!(
        html.contains("Why this matches"),
        "Should have 'Why this matches' header even with empty reasons"
    );
}

#[test]
fn test_text_email_empty_reasons() {
    let mut notification = notification_fixture();
    notification.score.reasons = vec![];

    let text = format_text_email(&notification.job, &notification.score);
    assert!(
        text.contains("WHY THIS MATCHES:"),
        "Should have 'WHY THIS MATCHES' header even with empty reasons"
    );
}

#[test]
fn test_html_email_url_appears_in_link() {
    let notification = notification_fixture();
    let html = format_html_email(&notification.job, &notification.score);

    // URL should appear in the href attribute
    assert!(html.contains(&format!("href=\"{}\"", notification.job.url)));
}

#[test]
fn test_text_email_url_appears() {
    let notification = notification_fixture();
    let text = format_text_email(&notification.job, &notification.score);

    assert!(text.contains("VIEW JOB: https://example.com/jobs/123"));
}

#[test]
fn test_html_email_with_special_characters() {
    let mut notification = notification_fixture();
    notification.job.title = "Care Coordinator & Intake Lead".to_string();
    notification.job.company = "Community Care Network <North Clinic>".to_string();

    let html = format_html_email(&notification.job, &notification.score);

    assert!(html.contains("Care Coordinator &amp; Intake Lead"));
    assert!(html.contains("Community Care Network &lt;North Clinic&gt;"));
}

#[test]
fn test_text_email_with_special_characters() {
    let mut notification = notification_fixture();
    notification.job.title = "Care Coordinator & Intake Lead".to_string();
    notification.job.company = "Community Care Network <North Clinic>".to_string();

    let text = format_text_email(&notification.job, &notification.score);

    assert!(text.contains("Care Coordinator & Intake Lead"));
    assert!(text.contains("Community Care Network <North Clinic>"));
}

#[test]
fn test_html_email_with_unicode() {
    let mut notification = notification_fixture();
    notification.job.title = "Développeur Senior 🚀".to_string();
    notification.job.company = "Société Française".to_string();
    notification.job.location = Some("Montréal, Québec".to_string());

    let html = format_html_email(&notification.job, &notification.score);

    assert!(html.contains("Développeur Senior 🚀"));
    assert!(html.contains("Société Française"));
    assert!(html.contains("Montréal, Québec"));
}

#[test]
fn test_text_email_with_unicode() {
    let mut notification = notification_fixture();
    notification.job.title = "Entwickler 中文 日本語".to_string();
    notification.job.company = "グローバル株式会社".to_string();

    let text = format_text_email(&notification.job, &notification.score);

    assert!(text.contains("Entwickler 中文 日本語"));
    assert!(text.contains("グローバル株式会社"));
}

#[test]
fn test_html_email_with_long_title() {
    let mut notification = notification_fixture();
    notification.job.title =
        "Regional Senior Lead Care Coordination Program Operations Support Services Director"
            .to_string();

    let html = format_html_email(&notification.job, &notification.score);

    assert!(html.contains("Regional Senior Lead Care"));
}

#[test]
fn test_text_email_with_long_location() {
    let mut notification = notification_fixture();
    notification.job.location = Some(
        "San Francisco Bay Area, California, United States (Remote within PST timezone)"
            .to_string(),
    );

    let text = format_text_email(&notification.job, &notification.score);

    assert!(text.contains("San Francisco Bay Area, California"));
}

#[test]
fn test_html_email_with_newlines_in_reasons() {
    let mut notification = notification_fixture();
    notification.score.reasons = vec![
        "Reason with\nnewline".to_string(),
        "Another reason".to_string(),
    ];

    let html = format_html_email(&notification.job, &notification.score);

    assert!(html.contains(LOCAL_MATCH_DETAILS_MESSAGE));
    assert!(!html.contains("Reason with\nnewline"));
    assert!(!html.contains("Another reason"));
}

#[test]
fn test_text_email_with_quotes_in_reasons() {
    let mut notification = notification_fixture();
    notification.score.reasons = vec![
        r#"Matches "preferred" keyword"#.to_string(),
        "Uses 'best practices'".to_string(),
    ];

    let text = format_text_email(&notification.job, &notification.score);

    assert!(text.contains(LOCAL_MATCH_DETAILS_MESSAGE));
    assert!(!text.contains(r#"Matches "preferred" keyword"#));
    assert!(!text.contains("Uses 'best practices'"));
}

#[path = "tests/content_and_structure_tests.rs"]
mod content_and_structure_tests;
mod rendering_edge_cases;
