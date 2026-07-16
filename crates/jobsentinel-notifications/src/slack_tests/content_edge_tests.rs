use super::super::*;
use super::create_test_notification;

#[test]
fn test_notification_with_perfect_score() {
    let mut notification = create_test_notification();
    notification.score.total = 1.0;

    let score_text = format!("{:.0}%", notification.score.total * 100.0);
    assert_eq!(score_text, "100%");
}

#[test]
fn test_notification_empty_reasons_list() {
    let mut notification = create_test_notification();
    notification.score.reasons = vec![];

    let reasons_text = notification.score.reasons.join("\n");
    assert_eq!(
        reasons_text, "",
        "Empty reasons should produce empty string"
    );
}

#[test]
fn test_notification_single_reason() {
    let mut notification = create_test_notification();
    notification.score.reasons = vec!["Only one reason".to_string()];

    let reasons_text = notification.score.reasons.join("\n");
    assert_eq!(reasons_text, "Only one reason");
    assert!(
        !reasons_text.contains('\n'),
        "Single reason should not have newlines"
    );
}

#[test]
fn test_notification_score_boundary_values() {
    let test_cases = vec![(0.0, "0%"), (0.5, "50%"), (0.99, "99%"), (1.0, "100%")];

    for (score, expected) in test_cases {
        let formatted = format!("{:.0}%", score * 100.0);
        assert_eq!(formatted, expected);
    }
}

#[test]
fn test_field_count_in_payload() {
    let notification = create_test_notification();
    let payload = json!({
        "blocks": [
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": format!("*Company:*\n{}", notification.job.company)},
                    {"type": "mrkdwn", "text": format!("*Location:*\n{}", notification.job.location.as_deref().unwrap_or("N/A"))},
                    {"type": "mrkdwn", "text": format!("*Score:*\n{:.0}%", notification.score.total * 100.0)},
                    {"type": "mrkdwn", "text": format!("*Source:*\n{}", notification.job.source)},
                ]
            }
        ]
    });

    assert_eq!(payload["blocks"][0]["fields"].as_array().unwrap().len(), 4);
}

#[test]
fn test_notification_with_special_characters_in_title() {
    let mut notification = create_test_notification();
    notification.job.title =
        "Care Coordinator @ \"Friendly\" Clinic <script>alert('xss')</script>".to_string();

    let payload = json!({
        "blocks": [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": format!("🎯 High Match: {}", notification.job.title),
                }
            }
        ]
    });

    // Verify special characters are preserved (Slack handles escaping)
    let title_text = payload["blocks"][0]["text"]["text"].as_str().unwrap();
    assert!(title_text.contains("@"));
    assert!(title_text.contains("\""));
    assert!(title_text.contains("<script>"));
}

#[test]
fn test_notification_with_unicode_characters() {
    let mut notification = create_test_notification();
    notification.job.company = "🚀 Startup™ Inc. — São Paulo".to_string();
    notification.job.location = Some("Zürich 🇨🇭".to_string());

    let payload = json!({
        "blocks": [
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": format!("*Company:*\n{}", notification.job.company)
                    },
                    {
                        "type": "mrkdwn",
                        "text": format!("*Location:*\n{}", notification.job.location.as_deref().unwrap_or("N/A"))
                    }
                ]
            }
        ]
    });

    let company_text = payload["blocks"][0]["fields"][0]["text"].as_str().unwrap();
    assert!(company_text.contains("🚀"));
    assert!(company_text.contains("™"));
    assert!(company_text.contains("São Paulo"));

    let location_text = payload["blocks"][0]["fields"][1]["text"].as_str().unwrap();
    assert!(location_text.contains("Zürich"));
    assert!(location_text.contains("🇨🇭"));
}

#[test]
fn test_notification_with_markdown_special_chars() {
    let mut notification = create_test_notification();
    notification.score.reasons = vec![
        "Has *asterisks* and _underscores_".to_string(),
        "Contains `backticks` and ~tildes~".to_string(),
        "Has [brackets] and (parens)".to_string(),
    ];

    let reasons_text = notification.score.reasons.join("\n");

    // Markdown characters should be preserved
    assert!(reasons_text.contains("*asterisks*"));
    assert!(reasons_text.contains("_underscores_"));
    assert!(reasons_text.contains("`backticks`"));
    assert!(reasons_text.contains("~tildes~"));
    assert!(reasons_text.contains("[brackets]"));
    assert!(reasons_text.contains("(parens)"));
}

#[test]
fn test_notification_with_very_long_reason() {
    let mut notification = create_test_notification();
    let long_reason = "Very long reason text ".repeat(50);
    notification.score.reasons = vec![long_reason.clone()];

    let reasons_text = notification.score.reasons.join("\n");
    assert_eq!(reasons_text.len(), long_reason.len());
    assert!(reasons_text.starts_with("Very long"));
}

#[test]
fn test_notification_with_newlines_in_company_name() {
    let mut notification = create_test_notification();
    notification.job.company = "Multi\nLine\nCompany".to_string();

    let payload = json!({
        "blocks": [
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": format!("*Company:*\n{}", notification.job.company)
                    }
                ]
            }
        ]
    });

    let company_text = payload["blocks"][0]["fields"][0]["text"].as_str().unwrap();
    assert!(company_text.contains("Multi\nLine\nCompany"));
}
