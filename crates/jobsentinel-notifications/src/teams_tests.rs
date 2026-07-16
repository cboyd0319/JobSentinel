use super::*;
use chrono::Utc;
use jobsentinel_domain::Job;
use jobsentinel_intelligence::{JobScore, ScoreBreakdown};

#[path = "teams_tests/payload_edge_tests.rs"]
mod payload_edge_tests;
#[path = "teams_tests/payload_structure_tests.rs"]
mod payload_structure_tests;
#[path = "teams_tests/payload_tests.rs"]
mod payload_tests;
#[path = "teams_tests/webhook_validation_tests.rs"]
mod webhook_validation_tests;

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
fn test_theme_color_for_high_score() {
    let notification = create_test_notification();
    let score = notification.score.total;

    let theme_color = if score >= 0.9 {
        "00FF00"
    } else if score >= 0.8 {
        "FFA500"
    } else {
        "0078D4"
    };

    assert_eq!(theme_color, "00FF00", "Score of 95% should use green color");
}

#[test]
fn test_theme_color_for_medium_score() {
    let mut notification = create_test_notification();
    notification.score.total = 0.85;
    let score = notification.score.total;

    let theme_color = if score >= 0.9 {
        "00FF00"
    } else if score >= 0.8 {
        "FFA500"
    } else {
        "0078D4"
    };

    assert_eq!(
        theme_color, "FFA500",
        "Score of 85% should use orange color"
    );
}

#[test]
fn test_theme_color_for_low_score() {
    let mut notification = create_test_notification();
    notification.score.total = 0.75;
    let score = notification.score.total;

    let theme_color = if score >= 0.9 {
        "00FF00"
    } else if score >= 0.8 {
        "FFA500"
    } else {
        "0078D4"
    };

    assert_eq!(
        theme_color, "0078D4",
        "Score of 75% should use Microsoft blue color"
    );
}

#[test]
fn test_salary_formatting_with_range() {
    let notification = create_test_notification();
    let salary_display = if let (Some(min), Some(max)) =
        (notification.job.salary_min, notification.job.salary_max)
    {
        format!("${},000 - ${},000", min / 1000, max / 1000)
    } else if let Some(min) = notification.job.salary_min {
        format!("${},000+", min / 1000)
    } else {
        "Not specified".to_string()
    };

    assert_eq!(salary_display, "$180,000 - $220,000");
}

#[test]
fn test_salary_formatting_with_min_only() {
    let mut notification = create_test_notification();
    notification.job.salary_max = None;

    let salary_display = if let (Some(min), Some(_max)) =
        (notification.job.salary_min, notification.job.salary_max)
    {
        format!("${},000 - ${},000", min / 1000, _max / 1000)
    } else if let Some(min) = notification.job.salary_min {
        format!("${},000+", min / 1000)
    } else {
        "Not specified".to_string()
    };

    assert_eq!(salary_display, "$180,000+");
}

#[test]
fn test_salary_formatting_with_none() {
    let mut notification = create_test_notification();
    notification.job.salary_min = None;
    notification.job.salary_max = None;

    let salary_display = if let (Some(min), Some(max)) =
        (notification.job.salary_min, notification.job.salary_max)
    {
        format!("${},000 - ${},000", min / 1000, max / 1000)
    } else if let Some(min) = notification.job.salary_min {
        format!("${},000+", min / 1000)
    } else {
        "Not specified".to_string()
    };

    assert_eq!(salary_display, "Not specified");
}

#[test]
fn test_webhook_url_with_query_params_passes() {
    let url = "https://outlook.office.com/webhook/12345678-1234-1234-1234-123456789012@12345678-1234-1234-1234-123456789012/IncomingWebhook/abcdef/12345678-1234-1234-1234-123456789012?param=value";
    let result = validate_webhook_url(url);
    assert!(result.is_ok(), "Webhook URL with query params should pass");
}

#[test]
fn test_webhook_url_with_fragment_passes() {
    let url = "https://outlook.office.com/webhook/12345678-1234-1234-1234-123456789012#fragment";
    let result = validate_webhook_url(url);
    assert!(result.is_ok(), "Webhook URL with fragment should pass");
}

#[test]
fn test_theme_color_boundary_90_percent() {
    let mut notification = create_test_notification();
    notification.score.total = 0.9;

    let theme_color = if notification.score.total >= 0.9 {
        "00FF00"
    } else if notification.score.total >= 0.8 {
        "FFA500"
    } else {
        "0078D4"
    };

    assert_eq!(
        theme_color, "00FF00",
        "Score of exactly 90% should use green"
    );
}

#[test]
fn test_theme_color_boundary_80_percent() {
    let mut notification = create_test_notification();
    notification.score.total = 0.8;

    let theme_color = if notification.score.total >= 0.9 {
        "00FF00"
    } else if notification.score.total >= 0.8 {
        "FFA500"
    } else {
        "0078D4"
    };

    assert_eq!(
        theme_color, "FFA500",
        "Score of exactly 80% should use orange"
    );
}

#[test]
fn test_remote_badge_with_none() {
    let mut notification = create_test_notification();
    notification.job.remote = None;

    let remote_text = if notification.job.remote.unwrap_or(false) {
        "✅ Yes"
    } else {
        "❌ No"
    };

    assert_eq!(remote_text, "❌ No", "None remote should default to No");
}

#[test]
fn test_message_card_payload_structure() {
    let notification = create_test_notification();
    let score = notification.score.total;
    let theme_color = if score >= 0.9 {
        "00FF00"
    } else if score >= 0.8 {
        "FFA500"
    } else {
        "0078D4"
    };

    let payload = json!({
        "@type": "MessageCard",
        "@context": "https://schema.org/extensions",
        "themeColor": theme_color,
    });

    assert_eq!(payload["@type"], "MessageCard");
    assert_eq!(payload["@context"], "https://schema.org/extensions");
    assert_eq!(payload["themeColor"], "00FF00");
}

#[test]
fn test_facts_array_structure() {
    let notification = create_test_notification();
    let salary_display = "$180,000 - $220,000";

    let facts = json!([
        {"name": "Location:", "value": notification.job.location.as_deref().unwrap_or("N/A")},
        {"name": "Salary:", "value": salary_display},
        {"name": "Remote:", "value": if notification.job.remote.unwrap_or(false) { "✅ Yes" } else { "❌ No" }},
        {"name": "Match Score:", "value": format!("{}%", (notification.score.total * 100.0).round())},
    ]);

    assert_eq!(facts.as_array().unwrap().len(), 4);
    assert_eq!(facts[0]["name"], "Location:");
    assert_eq!(facts[0]["value"], "Remote");
}

#[test]
fn test_potential_action_structure() {
    let notification = create_test_notification();

    let action = json!({
        "@type": "OpenUri",
        "name": "View Full Job Posting",
        "targets": [
            {
                "os": "default",
                "uri": notification.job.url
            }
        ]
    });

    assert_eq!(action["@type"], "OpenUri");
    assert_eq!(action["targets"][0]["uri"], notification.job.url);
}

#[test]
fn test_teams_payload_minimizes_job_url() {
    let mut notification = create_test_notification();
    notification.job.url =
        "https://example.com/jobs?utm_source=alert&gh_jid=123&token=secret&candidate_email=person@example.com#private"
            .to_string();

    let payload = build_teams_payload(&notification);
    let url = payload["potentialAction"][0]["targets"][0]["uri"]
        .as_str()
        .unwrap();

    assert_eq!(url, "https://example.com/jobs?gh_jid=123");
    assert!(!url.contains("utm_source"));
    assert!(!url.contains("token"));
    assert!(!url.contains("candidate_email"));
    assert!(!url.contains("person@example.com"));
    assert!(!url.contains("private"));
}

#[test]
fn test_webhook_validation_no_host() {
    let invalid_url = "https:///webhook/123/456";
    let result = validate_webhook_url(invalid_url);
    assert!(result.is_err(), "URL without host should fail");
}

#[test]
fn test_reasons_join_with_double_newline() {
    let notification = create_test_notification();
    let reasons_text = notification.score.reasons.join("\n\n");

    // Should have double newlines between reasons
    assert!(reasons_text.contains("\n\n"));
    assert!(reasons_text.contains("Title matches"));
}

#[test]
fn test_score_percentage_rounding() {
    let test_cases = vec![
        (0.954_f64, 95.0),
        (0.956_f64, 96.0),
        (0.875, 88.0),
        (0.999, 100.0),
    ];

    for (score, expected) in test_cases {
        let rounded = (score * 100.0_f64).round();
        assert_eq!(rounded, expected);
    }
}

#[test]
fn test_salary_formatting_large_numbers() {
    let test_cases = vec![(Some(500000), Some(750000), "$500,000 - $750,000")];

    for (min, max, expected) in test_cases {
        let salary_display = if let (Some(min_val), Some(max_val)) = (min, max) {
            format!("${},000 - ${},000", min_val / 1000, max_val / 1000)
        } else {
            "Not specified".to_string()
        };

        assert_eq!(salary_display, expected);
    }
}

#[test]
fn test_webhook_url_case_normalization() {
    let url = "https://OUTLOOK.OFFICE.COM/webhook/12345678-1234-1234-1234-123456789012";
    let result = validate_webhook_url(url);
    // URL hosts normalize to lowercase, so uppercase passes.
    assert!(
        result.is_ok(),
        "Uppercase host is normalized to lowercase and should pass validation"
    );
}
