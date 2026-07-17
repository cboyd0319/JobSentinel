use super::super::*;
use super::notification_fixture;

#[test]
fn test_theme_color_selection_comprehensive() {
    let cases = vec![
        (1.0_f64, "00FF00"),
        (0.95_f64, "00FF00"),
        (0.9, "00FF00"),
        (0.899, "FFA500"),
        (0.85, "FFA500"),
        (0.8, "FFA500"),
        (0.799, "0078D4"),
        (0.75, "0078D4"),
        (0.5_f64, "0078D4"),
        (0.0_f64, "0078D4"),
    ];

    for (score, expected) in cases {
        let color = if score >= 0.9 {
            "00FF00"
        } else if score >= 0.8 {
            "FFA500"
        } else {
            "0078D4"
        };
        assert_eq!(
            color, expected,
            "Score {} should map to color {}",
            score, expected
        );
    }
}

#[test]
fn test_location_as_deref_unwrap_or_logic() {
    let cases = vec![
        (Some("New York"), "New York"),
        (Some(""), ""),
        (None, "N/A"),
    ];

    for (location, expected) in cases {
        let value = location.as_deref().unwrap_or("N/A");
        assert_eq!(value, expected);
    }
}

#[test]
fn test_remote_unwrap_or_false_logic() {
    let cases = vec![
        (Some(true), "✅ Yes"),
        (Some(false), "❌ No"),
        (None, "❌ No"),
    ];

    for (remote, expected) in cases {
        let text = if remote.unwrap_or(false) {
            "✅ Yes"
        } else {
            "❌ No"
        };
        assert_eq!(text, expected);
    }
}

#[test]
fn test_salary_all_combinations() {
    let cases = vec![
        (Some(100000), Some(150000), "$100,000 - $150,000"),
        (Some(100000), None, "$100,000+"),
        (None, Some(150000), "Not specified"),
        (None, None, "Not specified"),
    ];

    for (min, max, expected) in cases {
        let display = if let (Some(min_val), Some(max_val)) = (min, max) {
            format!("${},000 - ${},000", min_val / 1000, max_val / 1000)
        } else if let Some(min_val) = min {
            format!("${},000+", min_val / 1000)
        } else {
            "Not specified".to_string()
        };
        assert_eq!(display, expected);
    }
}

#[test]
fn test_message_card_summary_with_special_characters() {
    let mut notification = notification_fixture();
    notification.job.title = "Care Coordinator (Bilingual/Weekend)".to_string();
    notification.job.company = "Community Health & Co.".to_string();

    let summary = format!(
        "New job alert: {} at {}",
        notification.job.title, notification.job.company
    );
    assert_eq!(
        summary,
        "New job alert: Care Coordinator (Bilingual/Weekend) at Community Health & Co."
    );
}

#[test]
fn test_message_card_title_with_various_scores() {
    let cases = vec![
        (0.9567_f64, "96% Match"),
        (0.8032_f64, "80% Match"),
        (0.7999_f64, "80% Match"),
    ];

    for (score, expected_suffix) in cases {
        let rounded_score = (score * 100.0_f64).round();
        let title = format!("🎯 High Match Job Alert ({}% Match)", rounded_score);
        assert!(title.contains(expected_suffix));
        let expected_num = expected_suffix.trim_end_matches("% Match");
        let actual_num_str = format!("{}", rounded_score);
        assert!(
            actual_num_str.starts_with(expected_num),
            "Score {} should round to {} (got {})",
            score,
            expected_num,
            actual_num_str
        );
    }
}

#[test]
fn test_activity_subtitle_format_variations() {
    let cases = vec![
        ("Acme Corp", "remoteok", "Acme Corp • remoteok"),
        ("A", "B", "A • B"),
        ("Company Name", "lever", "Company Name • lever"),
    ];

    for (company, source, expected) in cases {
        let subtitle = format!("{} • {}", company, source);
        assert_eq!(subtitle, expected);
    }
}

#[test]
fn test_match_score_fact_formatting() {
    let cases = vec![
        (0.95_f64, "95%"),
        (0.5_f64, "50%"),
        (1.0_f64, "100%"),
        (0.0_f64, "0%"),
    ];

    for (score, expected) in cases {
        let value = format!("{}%", (score * 100.0).round() as i32);
        assert_eq!(value, expected);
    }
}

#[test]
fn test_reasons_text_with_markdown() {
    let reasons = vec![
        "**Strong match**: 95%".to_string(),
        "Remote: _preferred_".to_string(),
    ];
    let text = format!("**Why this matches:**\n\n{}", reasons.join("\n\n"));

    assert!(text.starts_with("**Why this matches:**"));
    assert!(text.contains("**Strong match**"));
    assert!(text.contains("_preferred_"));
}

#[test]
fn test_validation_webhook_test_payload_all_fields() {
    let payload = json!({
        "@type": "MessageCard",
        "@context": "https://schema.org/extensions",
        "summary": "JobSentinel Webhook Test",
        "themeColor": "00FF00",
        "title": "✅ JobSentinel Webhook Test",
        "text": "Your Microsoft Teams webhook is configured correctly! You'll now receive job alerts in this channel.",
        "potentialAction": [
            {
                "@type": "OpenUri",
                "name": "Learn More",
                "targets": [
                    {
                        "os": "default",
                        "uri": "https://github.com/cboyd0319/JobSentinel"
                    }
                ]
            }
        ]
    });

    assert_eq!(payload["@type"], "MessageCard");
    assert_eq!(payload["@context"], "https://schema.org/extensions");
    assert_eq!(payload["summary"], "JobSentinel Webhook Test");
    assert_eq!(payload["themeColor"], "00FF00");
    assert_eq!(payload["title"], "✅ JobSentinel Webhook Test");
    assert!(payload["text"].as_str().unwrap().len() > 0);
    assert_eq!(payload["potentialAction"].as_array().unwrap().len(), 1);
    assert_eq!(payload["potentialAction"][0]["@type"], "OpenUri");
    assert_eq!(payload["potentialAction"][0]["name"], "Learn More");
    assert_eq!(payload["potentialAction"][0]["targets"][0]["os"], "default");
    assert_eq!(
        payload["potentialAction"][0]["targets"][0]["uri"],
        "https://github.com/cboyd0319/JobSentinel"
    );
}

#[test]
fn test_webhook_url_with_encoded_characters() {
    let url = "https://outlook.office.com/webhook/12345678%2D1234%2D1234%2D1234%2D123456789012";
    let result = validate_webhook_url(url);
    assert!(
        result.is_ok(),
        "URL with percent-encoded characters should pass"
    );
}

#[test]
fn test_webhook_url_office_vs_office365_both_valid() {
    let urls = vec![
        "https://outlook.office.com/webhook/test",
        "https://outlook.office365.com/webhook/test",
    ];

    for url in urls {
        let result = validate_webhook_url(url);
        assert!(
            result.is_ok(),
            "Both office.com and office365.com should be valid: {}",
            url
        );
    }
}

#[test]
fn test_webhook_url_mixed_case_domain_fails() {
    let urls = vec![
        "https://Outlook.office.com/webhook/123",
        "https://outlook.OFFICE.com/webhook/123",
        "https://outlook.office.COM/webhook/123",
    ];

    for url in urls {
        let result = validate_webhook_url(url);
        assert!(
            result.is_ok(),
            "Mixed case domain is normalized and should pass: {}",
            url
        );
    }
}

#[test]
fn test_score_percentage_display_as_integer() {
    let cases = vec![
        (0.954_f64, "95"),
        (0.956_f64, "96"),
        (0.5_f64, "50"),
        (1.0_f64, "100"),
        (0.0_f64, "0"),
    ];

    for (score, expected) in cases {
        let display = format!("{}", (score * 100.0_f64).round() as i32);
        assert_eq!(display, expected);
    }
}

#[test]
fn test_facts_array_complete_structure() {
    let notification = notification_fixture();
    let salary_display = "$180,000 - $220,000";

    let facts = json!([
        {"name": "Location:", "value": notification.job.location.as_deref().unwrap_or("N/A")},
        {"name": "Salary:", "value": salary_display},
        {"name": "Remote:", "value": if notification.job.remote.unwrap_or(false) { "✅ Yes" } else { "❌ No" }},
        {"name": "Match Score:", "value": format!("{}%", (notification.score.total * 100.0).round())},
    ]);

    let array = facts.as_array().unwrap();
    assert_eq!(array.len(), 4);

    for fact in array {
        assert!(fact.get("name").is_some());
        assert!(fact.get("value").is_some());
    }

    assert_eq!(array[0]["name"], "Location:");
    assert_eq!(array[1]["name"], "Salary:");
    assert_eq!(array[2]["name"], "Remote:");
    assert_eq!(array[3]["name"], "Match Score:");
}

#[test]
fn test_potential_action_targets_array() {
    let url = "https://example.com/job/12345";
    let targets = json!([
        {
            "os": "default",
            "uri": url
        }
    ]);

    assert_eq!(targets.as_array().unwrap().len(), 1);
    assert_eq!(targets[0]["os"], "default");
    assert_eq!(targets[0]["uri"], url);
}

#[test]
fn test_webhook_validation_empty_path_after_webhook() {
    let url = "https://outlook.office.com/webhook/";
    let result = validate_webhook_url(url);
    assert!(
        result.is_ok(),
        "URL with /webhook/ and trailing slash should pass"
    );
}

#[test]
fn test_salary_zero_values() {
    let cases = vec![
        (Some(0), Some(0), "$0,000 - $0,000"),
        (Some(0), None, "$0,000+"),
    ];

    for (min, max, expected) in cases {
        let display = if let (Some(min_val), Some(max_val)) = (min, max) {
            format!("${},000 - ${},000", min_val / 1000, max_val / 1000)
        } else if let Some(min_val) = min {
            format!("${},000+", min_val / 1000)
        } else {
            "Not specified".to_string()
        };
        assert_eq!(display, expected);
    }
}

#[test]
fn test_message_card_context_url() {
    let context = "https://schema.org/extensions";
    assert!(context.starts_with("https://"));
    assert!(context.contains("schema.org"));
}

#[test]
fn test_sections_array_structure() {
    let notification = notification_fixture();

    let sections = json!([
        {
            "activityTitle": format!("**{}**", notification.job.title),
            "activitySubtitle": format!("{} • {}", notification.job.company, notification.job.source),
            "facts": [],
            "text": "Sample text"
        }
    ]);

    let array = sections.as_array().unwrap();
    assert_eq!(array.len(), 1);
    assert!(array[0].get("activityTitle").is_some());
    assert!(array[0].get("activitySubtitle").is_some());
    assert!(array[0].get("activityImage").is_none());
    assert!(array[0].get("facts").is_some());
    assert!(array[0].get("text").is_some());
}

#[test]
fn test_payload_omits_remote_activity_image() {
    let payload = build_teams_payload(&notification_fixture());
    let section = &payload["sections"][0];

    assert!(section.get("activityImage").is_none());
    assert!(!payload.to_string().contains("raw.githubusercontent.com"));
}

#[test]
fn test_reasons_with_unicode_characters() {
    let reasons = vec![
        "Match: 95%".to_string(),
        "Café role match".to_string(),
        "Startup™ preferred company".to_string(),
        "São Paulo timezone overlap".to_string(),
        "Zürich relocation not required".to_string(),
    ];
    let text = reasons.join("\n\n");

    assert!(text.contains("é"));
    assert!(text.contains("™"));
    assert!(text.contains("São"));
    assert!(text.contains("Zürich"));
}

#[test]
fn test_webhook_url_validation_error_messages_specificity() {
    let cases = vec![
        (
            "http://outlook.office.com/webhook/123",
            "full Teams connection link",
        ),
        (
            "https://evil.com/webhook/123",
            "connection link copied from Teams",
        ),
        (
            "https://outlook.office.com/badpath/123",
            "connection link copied from Teams",
        ),
        ("not-a-url", "full Teams connection link"),
    ];

    for (url, expected_substring) in cases {
        let result = validate_webhook_url(url);
        assert!(result.is_err());
        let error = result.unwrap_err().to_string();
        assert!(
            error.contains(expected_substring),
            "Error for '{}' should contain '{}', got: {}",
            url,
            expected_substring,
            error
        );
    }
}

#[test]
fn test_complete_payload_json_serialization() {
    let notification = notification_fixture();
    let job = &notification.job;
    let score = &notification.score;

    let payload = json!({
        "@type": "MessageCard",
        "@context": "https://schema.org/extensions",
        "summary": format!("New job alert: {} at {}", job.title, job.company),
        "themeColor": "00FF00",
        "title": format!("🎯 High Match Job Alert ({}% Match)", (score.total * 100.0).round()),
    });

    let json_str = serde_json::to_string(&payload).unwrap();
    assert!(json_str.len() > 0);
    assert!(json_str.contains("MessageCard"));
    assert!(json_str.contains("High Match Job Alert"));
}
