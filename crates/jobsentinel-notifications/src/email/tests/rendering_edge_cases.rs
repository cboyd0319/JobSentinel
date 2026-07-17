use super::*;

#[test]
fn test_html_email_with_empty_string_location() {
    let mut notification = notification_fixture();
    notification.job.location = Some("".to_string());

    let html = format_html_email(&notification.job, &notification.score);

    assert!(html.contains("<td style=\"padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;\">\n                        \n                    </td>"));
}

#[test]
fn test_text_email_with_empty_string_location() {
    let mut notification = notification_fixture();
    notification.job.location = Some("".to_string());

    let text = format_text_email(&notification.job, &notification.score);

    assert!(text.contains("LOCATION: "));
}

#[test]
fn test_salary_formatting_large_values() {
    let mut notification = notification_fixture();
    notification.job.salary_min = Some(500000);
    notification.job.salary_max = Some(800000);

    let html = format_html_email(&notification.job, &notification.score);

    assert!(html.contains("$500,000 - $800,000"));
}

#[test]
fn test_salary_formatting_small_values() {
    let mut notification = notification_fixture();
    notification.job.salary_min = Some(30000);
    notification.job.salary_max = Some(50000);

    let text = format_text_email(&notification.job, &notification.score);

    assert!(text.contains("$30,000 - $50,000"));
}

#[test]
fn test_html_email_reason_with_html_like_text() {
    let mut notification = notification_fixture();
    notification.score.reasons = vec!["Matches <keyword>".to_string(), "Has & symbol".to_string()];

    let html = format_html_email(&notification.job, &notification.score);

    assert!(html.contains(LOCAL_MATCH_DETAILS_MESSAGE));
    assert!(!html.contains("Matches &lt;keyword&gt;"));
    assert!(!html.contains("Has &amp; symbol"));
}

#[test]
fn test_text_email_preserves_exact_formatting() {
    let notification = notification_fixture();
    let text = format_text_email(&notification.job, &notification.score);

    assert!(text.starts_with("🎯 HIGH MATCH JOB ALERT"));
    assert!(text.contains("\n\nCOMPANY:"));
    assert!(text.contains("\n\nWHY THIS MATCHES:"));
}

#[test]
fn test_html_email_with_zero_salary() {
    let mut notification = notification_fixture();
    notification.job.salary_min = Some(0);
    notification.job.salary_max = Some(0);

    let html = format_html_email(&notification.job, &notification.score);

    assert!(html.contains("$0,000 - $0,000"));
}

#[test]
fn test_html_email_emojis_preserved() {
    let notification = notification_fixture();
    let html = format_html_email(&notification.job, &notification.score);

    assert!(html.contains("🎯"));
}

#[test]
fn test_text_email_emojis_preserved() {
    let notification = notification_fixture();
    let text = format_text_email(&notification.job, &notification.score);

    assert!(text.contains("🎯"));
}
