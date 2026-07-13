use super::*;
use crate::core::{
    scoring::{JobScore, ScoreBreakdown},
    Job,
};
use chrono::Utc;

fn create_test_notification() -> Notification {
    Notification {
        job: Job {
            id: 1,
            hash: "test123".to_string(),
            title: "Care Coordinator".to_string(),
            company: "Community Care Network".to_string(),
            url: "https://example.com/jobs/123".to_string(),
            location: Some("Remote".to_string()),
            description: Some("Support patients and families with care planning".to_string()),
            score: Some(0.95),
            score_reasons: None,
            source: "greenhouse".to_string(),
            remote: Some(true),
            salary_min: Some(180000),
            salary_max: Some(220000),
            currency: Some("USD".to_string()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            last_seen: Utc::now(),
            times_seen: 1,
            immediate_alert_sent: false,
            hidden: false,
            bookmarked: false,
            ghost_score: None,
            ghost_reasons: None,
            first_seen: None,
            repost_count: 0,
            notes: None,
            included_in_digest: false,
        },
        score: JobScore {
            total: 0.95,
            breakdown: ScoreBreakdown {
                skills: 0.40,
                salary: 0.25,
                location: 0.20,
                company: 0.05,
                recency: 0.05,
            },
            reasons: vec![
                "Title matches: Care Coordinator".to_string(),
                "Keyword match: case management".to_string(),
                "Salary 120% of target (100% credit)".to_string(),
                "Remote job (matches preference)".to_string(),
            ],
        },
    }
}

#[test]
fn test_html_email_formatting() {
    let notification = create_test_notification();
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
    let notification = create_test_notification();
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
    let mut notification = create_test_notification();
    notification.job.salary_min = None;
    notification.job.salary_max = None;

    let html = format_html_email(&notification.job, &notification.score);
    assert!(html.contains("Not specified"));
}

#[test]
fn test_html_email_handles_min_salary_only() {
    let mut notification = create_test_notification();
    notification.job.salary_max = None;

    let html = format_html_email(&notification.job, &notification.score);
    assert!(html.contains("$180,000+"));
}

#[test]
fn test_html_email_handles_missing_location() {
    let mut notification = create_test_notification();
    notification.job.location = None;

    let html = format_html_email(&notification.job, &notification.score);
    assert!(html.contains("N/A"));
}

#[test]
fn test_html_email_keeps_match_reasons_local() {
    let notification = create_test_notification();
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
    let notification = create_test_notification();
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
    let mut notification = create_test_notification();
    notification.job.salary_min = None;
    notification.job.salary_max = None;

    let text = format_text_email(&notification.job, &notification.score);
    assert!(text.contains("Not specified"));
}

#[test]
fn test_text_email_handles_min_salary_only() {
    let mut notification = create_test_notification();
    notification.job.salary_max = None;

    let text = format_text_email(&notification.job, &notification.score);
    assert!(text.contains("$180,000+"));
}

#[test]
fn test_text_email_handles_missing_location() {
    let mut notification = create_test_notification();
    notification.job.location = None;

    let text = format_text_email(&notification.job, &notification.score);
    assert!(text.contains("N/A"));
}

#[test]
fn test_html_email_no_remote_badge() {
    let mut notification = create_test_notification();
    notification.job.remote = Some(false);

    let html = format_html_email(&notification.job, &notification.score);
    assert!(
        !html.contains("REMOTE"),
        "Non-remote job should not have REMOTE badge"
    );
}

#[test]
fn test_html_email_handles_none_remote() {
    let mut notification = create_test_notification();
    notification.job.remote = None;

    let html = format_html_email(&notification.job, &notification.score);
    assert!(
        !html.contains("REMOTE"),
        "Job with None remote should not have REMOTE badge"
    );
}

#[test]
fn test_text_email_remote_no() {
    let mut notification = create_test_notification();
    notification.job.remote = Some(false);

    let text = format_text_email(&notification.job, &notification.score);
    assert!(text.contains("REMOTE: No"));
}

#[test]
fn test_html_email_score_formatting() {
    let mut notification = create_test_notification();

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
    let mut notification = create_test_notification();

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
    let notification = create_test_notification();
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
    let notification = create_test_notification();
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
    let mut notification = create_test_notification();
    notification.score.reasons = vec![];

    let html = format_html_email(&notification.job, &notification.score);
    assert!(
        html.contains("Why this matches"),
        "Should have 'Why this matches' header even with empty reasons"
    );
}

#[test]
fn test_text_email_empty_reasons() {
    let mut notification = create_test_notification();
    notification.score.reasons = vec![];

    let text = format_text_email(&notification.job, &notification.score);
    assert!(
        text.contains("WHY THIS MATCHES:"),
        "Should have 'WHY THIS MATCHES' header even with empty reasons"
    );
}

#[test]
fn test_html_email_url_appears_in_link() {
    let notification = create_test_notification();
    let html = format_html_email(&notification.job, &notification.score);

    // URL should appear in the href attribute
    assert!(html.contains(&format!("href=\"{}\"", notification.job.url)));
}

#[test]
fn test_text_email_url_appears() {
    let notification = create_test_notification();
    let text = format_text_email(&notification.job, &notification.score);

    assert!(text.contains("VIEW JOB: https://example.com/jobs/123"));
}

#[test]
fn test_salary_formatting_edge_cases() {
    // Test with various salary values (note: format! uses comma separator for thousands)
    let test_cases = vec![
        (Some(100000), Some(150000), "$100,000 - $150,000"),
        (Some(250000), Some(300000), "$250,000 - $300,000"),
        (Some(75000), None, "$75,000+"),
    ];

    for (min, max, expected) in test_cases {
        let salary_display = if let (Some(min_val), Some(max_val)) = (min, max) {
            format!("${},000 - ${},000", min_val / 1000, max_val / 1000)
        } else if let Some(min_val) = min {
            format!("${},000+", min_val / 1000)
        } else {
            "Not specified".to_string()
        };

        assert_eq!(salary_display, expected);
    }
}

#[test]
fn test_html_email_with_special_characters() {
    let mut notification = create_test_notification();
    notification.job.title = "Care Coordinator & Intake Lead".to_string();
    notification.job.company = "Community Care Network <North Clinic>".to_string();

    let html = format_html_email(&notification.job, &notification.score);

    assert!(html.contains("Care Coordinator &amp; Intake Lead"));
    assert!(html.contains("Community Care Network &lt;North Clinic&gt;"));
}

#[test]
fn test_text_email_with_special_characters() {
    let mut notification = create_test_notification();
    notification.job.title = "Care Coordinator & Intake Lead".to_string();
    notification.job.company = "Community Care Network <North Clinic>".to_string();

    let text = format_text_email(&notification.job, &notification.score);

    assert!(text.contains("Care Coordinator & Intake Lead"));
    assert!(text.contains("Community Care Network <North Clinic>"));
}

#[test]
fn test_html_email_with_unicode() {
    let mut notification = create_test_notification();
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
    let mut notification = create_test_notification();
    notification.job.title = "Entwickler 中文 日本語".to_string();
    notification.job.company = "グローバル株式会社".to_string();

    let text = format_text_email(&notification.job, &notification.score);

    assert!(text.contains("Entwickler 中文 日本語"));
    assert!(text.contains("グローバル株式会社"));
}

#[test]
fn test_html_email_with_long_title() {
    let mut notification = create_test_notification();
    notification.job.title =
        "Regional Senior Lead Care Coordination Program Operations Support Services Director"
            .to_string();

    let html = format_html_email(&notification.job, &notification.score);

    assert!(html.contains("Regional Senior Lead Care"));
}

#[test]
fn test_text_email_with_long_location() {
    let mut notification = create_test_notification();
    notification.job.location = Some(
        "San Francisco Bay Area, California, United States (Remote within PST timezone)"
            .to_string(),
    );

    let text = format_text_email(&notification.job, &notification.score);

    assert!(text.contains("San Francisco Bay Area, California"));
}

#[test]
fn test_html_email_with_newlines_in_reasons() {
    let mut notification = create_test_notification();
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
    let mut notification = create_test_notification();
    notification.score.reasons = vec![
        r#"Matches "preferred" keyword"#.to_string(),
        "Uses 'best practices'".to_string(),
    ];

    let text = format_text_email(&notification.job, &notification.score);

    assert!(text.contains(LOCAL_MATCH_DETAILS_MESSAGE));
    assert!(!text.contains(r#"Matches "preferred" keyword"#));
    assert!(!text.contains("Uses 'best practices'"));
}

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

mod more;
