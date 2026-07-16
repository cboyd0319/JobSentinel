use super::*;

#[test]
fn test_html_email_score_boundary_values() {
    let mut notification = create_test_notification();

    // Test boundary scores
    let test_cases = vec![
        (0.0, "0"),
        (0.01, "1"),
        (0.49, "49"),
        (0.50, "50"),
        (0.999, "100"),
        (0.994, "99"),
        (0.995, "100"),
    ];

    for (score, expected) in test_cases {
        notification.score.total = score;
        let html = format_html_email(&notification.job, &notification.score);
        assert!(
            html.contains(expected),
            "Score {} should contain '{}' in HTML",
            score,
            expected
        );
    }
}

#[test]
fn test_text_email_score_boundary_values() {
    let mut notification = create_test_notification();

    let test_cases = vec![(0.0, "0%"), (0.01, "1%"), (0.50, "50%"), (0.999, "100%")];

    for (score, expected) in test_cases {
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
fn test_html_email_url_with_query_params() {
    let mut notification = create_test_notification();
    notification.job.url =
        "https://example.com/jobs/123?utm_source=jobsentinel&gh_jid=123&token=secret&candidate_email=person@example.com#private"
            .to_string();

    let html = format_html_email(&notification.job, &notification.score);

    assert!(html.contains("href=\"https://example.com/jobs/123?gh_jid=123\""));
    assert!(!html.contains("utm_source"));
    assert!(!html.contains("token"));
    assert!(!html.contains("candidate_email"));
    assert!(!html.contains("person@example.com"));
    assert!(!html.contains("private"));
}

#[test]
fn test_html_email_omits_invalid_job_href() {
    let mut notification = create_test_notification();
    notification.job.url = "http://localhost:3000/private".to_string();

    let html = format_html_email(&notification.job, &notification.score);

    assert!(!html.contains("href=\"http://localhost:3000/private\""));
    assert!(html.contains("Open this job in JobSentinel"));
}

#[test]
fn test_text_email_url_with_fragments() {
    let mut notification = create_test_notification();
    notification.job.url =
        "https://example.com/careers?gh_jid=123&token=secret#senior-engineer-role".to_string();

    let text = format_text_email(&notification.job, &notification.score);

    assert!(text.contains("VIEW JOB: https://example.com/careers?gh_jid=123"));
    assert!(!text.contains("token"));
    assert!(!text.contains("senior-engineer-role"));
}

#[test]
fn test_html_email_multiple_reasons_formatting() {
    let mut notification = create_test_notification();
    notification.score.reasons = vec![
        "First reason".to_string(),
        "Second reason".to_string(),
        "Third reason".to_string(),
        "Fourth reason".to_string(),
        "Fifth reason".to_string(),
    ];

    let html = format_html_email(&notification.job, &notification.score);

    assert!(html.contains(&format!("<li>{}</li>", LOCAL_MATCH_DETAILS_MESSAGE)));
    for reason in &notification.score.reasons {
        assert!(!html.contains(reason));
    }
}

#[test]
fn test_text_email_multiple_reasons_formatting() {
    let mut notification = create_test_notification();
    notification.score.reasons = vec![
        "First reason".to_string(),
        "Second reason".to_string(),
        "Third reason".to_string(),
    ];

    let text = format_text_email(&notification.job, &notification.score);

    assert!(text.contains(&format!("  - {}", LOCAL_MATCH_DETAILS_MESSAGE)));
    for reason in &notification.score.reasons {
        assert!(!text.contains(reason));
    }
}

#[test]
fn test_html_email_single_reason() {
    let mut notification = create_test_notification();
    notification.score.reasons = vec!["Only one reason".to_string()];

    let html = format_html_email(&notification.job, &notification.score);

    assert!(html.contains(&format!("<li>{}</li>", LOCAL_MATCH_DETAILS_MESSAGE)));
    assert!(!html.contains("Only one reason"));
}

#[test]
fn test_text_email_single_reason() {
    let mut notification = create_test_notification();
    notification.score.reasons = vec!["Only one reason".to_string()];

    let text = format_text_email(&notification.job, &notification.score);

    assert!(text.contains(&format!("  - {}", LOCAL_MATCH_DETAILS_MESSAGE)));
    assert!(!text.contains("Only one reason"));
}

#[test]
fn test_html_email_contains_meta_tags() {
    let notification = create_test_notification();
    let html = format_html_email(&notification.job, &notification.score);

    // Verify HTML meta tags for proper rendering
    assert!(html.contains(r#"<meta charset="UTF-8">"#));
    assert!(
        html.contains(r#"<meta name="viewport" content="width=device-width, initial-scale=1.0">"#)
    );
}

#[test]
fn test_html_email_contains_styling() {
    let notification = create_test_notification();
    let html = format_html_email(&notification.job, &notification.score);

    // Verify inline CSS styles are present
    assert!(html.contains("font-family:"));
    assert!(html.contains("background:"));
    assert!(html.contains("padding:"));
    assert!(html.contains("border-radius:"));
}

#[test]
fn test_html_email_gradient_header() {
    let notification = create_test_notification();
    let html = format_html_email(&notification.job, &notification.score);

    // Verify gradient background is present
    assert!(html.contains("linear-gradient"));
    assert!(html.contains("#667eea"));
    assert!(html.contains("#764ba2"));
}

#[test]
fn test_html_email_call_to_action_button() {
    let notification = create_test_notification();
    let html = format_html_email(&notification.job, &notification.score);

    // Verify CTA button is present with proper styling
    assert!(html.contains("View Full Job Posting"));
    assert!(html.contains("display: inline-block"));
    assert!(html.contains("text-decoration: none"));
}

#[test]
fn test_html_email_source_field() {
    let mut notification = create_test_notification();
    notification.job.source = "linkedin".to_string();

    let html = format_html_email(&notification.job, &notification.score);

    assert!(html.contains("linkedin"));
    assert!(html.contains("Source:"));
}

#[test]
fn test_text_email_source_field() {
    let mut notification = create_test_notification();
    notification.job.source = "remoteok".to_string();

    let text = format_text_email(&notification.job, &notification.score);

    assert!(text.contains("SOURCE: remoteok"));
}

#[test]
fn test_html_email_remote_badge_styling() {
    let notification = create_test_notification();
    let html = format_html_email(&notification.job, &notification.score);

    // Verify remote badge has green background
    assert!(html.contains("#10b981"));
    assert!(html.contains("🌍 REMOTE"));
}

#[test]
fn test_html_email_match_score_badge() {
    let notification = create_test_notification();
    let html = format_html_email(&notification.job, &notification.score);

    // Verify match score badge styling
    assert!(html.contains("#3b82f6")); // Blue badge color
    assert!(html.contains("95 Match"));
}

#[test]
fn test_text_email_formatting_separators() {
    let notification = create_test_notification();
    let text = format_text_email(&notification.job, &notification.score);

    // Verify text formatting separators
    assert!(text.contains("---"));
    assert!(text.contains("COMPANY:"));
    assert!(text.contains("LOCATION:"));
    assert!(text.contains("SALARY:"));
}

#[test]
fn test_html_email_table_structure() {
    let notification = create_test_notification();
    let html = format_html_email(&notification.job, &notification.score);

    // Verify table structure for job details
    assert!(html.contains("<table"));
    assert!(html.contains("</table>"));
    assert!(html.contains("<tr>"));
    assert!(html.contains("</tr>"));
    assert!(html.contains("<td"));
    assert!(html.contains("</td>"));
}

#[test]
fn test_html_email_footer_text() {
    let notification = create_test_notification();
    let html = format_html_email(&notification.job, &notification.score);

    // Verify footer messaging
    assert!(html.contains("This alert was sent by"));
    assert!(html.contains("JobSentinel"));
    assert!(html.contains("You can adjust your notification preferences"));
}

#[test]
fn test_text_email_footer_text() {
    let notification = create_test_notification();
    let text = format_text_email(&notification.job, &notification.score);

    // Verify footer messaging
    assert!(text.contains("This alert was sent by JobSentinel"));
    assert!(text.contains("You can adjust your notification preferences"));
}
