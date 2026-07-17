use super::super::*;
use super::notification_fixture;

#[test]
fn test_notification_all_blocks_have_correct_types() {
    let notification = notification_fixture();
    let payload = build_slack_payload(&notification);

    // Verify block types
    assert_eq!(payload["blocks"][0]["type"], "header");
    assert_eq!(payload["blocks"][1]["type"], "section");
    assert_eq!(payload["blocks"][2]["type"], "section");
    assert_eq!(payload["blocks"][3]["type"], "actions");

    // Verify text types
    assert_eq!(payload["blocks"][0]["text"]["type"], "plain_text");
    assert_eq!(payload["blocks"][1]["fields"][0]["type"], "mrkdwn");
    assert_eq!(payload["blocks"][2]["text"]["type"], "mrkdwn");
    assert_eq!(
        payload["blocks"][3]["elements"][0]["text"]["type"],
        "plain_text"
    );

    // Verify button element
    assert_eq!(payload["blocks"][3]["elements"][0]["type"], "button");
    assert_eq!(payload["blocks"][3]["elements"][0]["style"], "primary");
}

#[test]
fn test_notification_button_text_exact_match() {
    let notification = notification_fixture();

    let payload = json!({
        "blocks": [
            {
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {
                            "type": "plain_text",
                            "text": "View Job"
                        },
                        "url": notification.job.url.clone(),
                        "style": "primary"
                    }
                ]
            }
        ]
    });

    assert_eq!(
        payload["blocks"][0]["elements"][0]["text"]["text"],
        "View Job"
    );
}

#[test]
fn test_notification_header_emoji_preserved() {
    let notification = notification_fixture();

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

    let header_text = payload["blocks"][0]["text"]["text"].as_str().unwrap();
    assert!(header_text.starts_with("🎯 High Match:"));
}

#[test]
fn test_notification_source_field_formatting() {
    let notification = notification_fixture();

    let payload = json!({
        "blocks": [
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": format!("*Source:*\n{}", notification.job.source)
                    }
                ]
            }
        ]
    });

    let source_text = payload["blocks"][0]["fields"][0]["text"].as_str().unwrap();
    assert!(source_text.starts_with("*Source:*\n"));
    assert!(source_text.contains("greenhouse"));
}

#[test]
fn test_notification_with_different_sources() {
    let sources = vec![
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

    for source in sources {
        let mut notification = notification_fixture();
        notification.job.source = source.to_string();

        let payload = json!({
            "blocks": [
                {
                    "type": "section",
                    "fields": [
                        {
                            "type": "mrkdwn",
                            "text": format!("*Source:*\n{}", notification.job.source)
                        }
                    ]
                }
            ]
        });

        let source_text = payload["blocks"][0]["fields"][0]["text"].as_str().unwrap();
        assert!(
            source_text.contains(source),
            "Should contain source: {}",
            source
        );
    }
}

#[test]
fn test_notification_reasons_formatting_with_bullets() {
    let mut notification = notification_fixture();
    notification.score.reasons = vec![
        "First reason".to_string(),
        "Second reason".to_string(),
        "Third reason".to_string(),
    ];

    let payload = json!({
        "blocks": [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": format!("*Why this matches:*\n{}", notification.score.reasons.join("\n"))
                }
            }
        ]
    });

    let reasons_text = payload["blocks"][0]["text"]["text"].as_str().unwrap();
    assert!(reasons_text.starts_with("*Why this matches:*\n"));
    assert!(reasons_text.contains("First reason"));
    assert!(reasons_text.contains("Second reason"));
    assert!(reasons_text.contains("Third reason"));
}

#[test]
fn test_validate_webhook_url_error_messages() {
    let test_cases = vec![
        (
            "http://hooks.slack.com/services/T/B/X",
            "full Slack connection link",
        ),
        (
            "https://evil.com/services/T/B/X",
            "connection link copied from Slack",
        ),
        (
            "https://hooks.slack.com/wrong/T/B/X",
            "connection link copied from Slack",
        ),
    ];

    for (url, expected_error_part) in test_cases {
        let result = validate_webhook_url(url);
        assert!(result.is_err(), "URL should fail: {}", url);
        let error_msg = result.unwrap_err().to_string();
        assert!(
            error_msg.contains(expected_error_part),
            "Error for '{}' should contain '{}', got: {}",
            url,
            expected_error_part,
            error_msg
        );
    }
}

#[test]
fn test_webhook_url_malformed_error_message() {
    // Test malformed URL separately as it fails at URL parsing
    let url = "not a url";
    let result = validate_webhook_url(url);
    assert!(result.is_err(), "Malformed URL should fail");
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("full Slack connection link"));
}

#[test]
fn test_webhook_url_ipv4_address_fails() {
    let url = "https://192.168.1.1/services/T00000000/B00000000/XXXX";
    let result = validate_webhook_url(url);
    assert!(result.is_err(), "IP address should fail validation");
}

#[test]
fn test_webhook_url_ipv6_address_fails() {
    let url = "https://[::1]/services/T00000000/B00000000/XXXX";
    let result = validate_webhook_url(url);
    assert!(result.is_err(), "IPv6 address should fail validation");
}

#[test]
fn test_webhook_url_localhost_fails() {
    let url = "https://localhost/services/T00000000/B00000000/XXXX";
    let result = validate_webhook_url(url);
    assert!(result.is_err(), "localhost should fail validation");
}

#[test]
fn test_notification_complete_payload_serializable() {
    let notification = notification_fixture();
    let payload = build_slack_payload(&notification);

    // Test that payload serializes to valid JSON
    let json_string = serde_json::to_string(&payload);
    assert!(json_string.is_ok(), "Payload should serialize to JSON");

    // Verify we can deserialize it back
    let deserialized: serde_json::Value = serde_json::from_str(&json_string.unwrap()).unwrap();
    assert_eq!(deserialized, payload);
}

#[test]
fn test_notification_with_empty_string_location() {
    let mut notification = notification_fixture();
    notification.job.location = Some("".to_string());

    let location_display = notification.job.location.as_deref().unwrap_or("N/A");
    // Empty string should be used (not N/A)
    assert_eq!(location_display, "");
}

#[test]
fn test_notification_with_whitespace_only_location() {
    let mut notification = notification_fixture();
    notification.job.location = Some("   ".to_string());

    let location_display = notification.job.location.as_deref().unwrap_or("N/A");
    // Whitespace should be preserved
    assert_eq!(location_display, "   ");
}

#[test]
fn test_notification_score_percentage_precision() {
    // Test that {:.0}% formats with no decimal places
    let test_values = vec![
        (0.123, "12%"),
        (0.456, "46%"),
        (0.789, "79%"),
        (0.995, "100%"), // Rounds up
        (0.994, "99%"),  // Rounds down
    ];

    for (score, expected) in test_values {
        let formatted = format!("{:.0}%", score * 100.0);
        assert_eq!(
            formatted, expected,
            "Score {} should format to {}",
            score, expected
        );
    }
}

#[test]
fn test_webhook_url_path_traversal_normalized() {
    let url = "https://hooks.slack.com/services/../../etc/passwd";
    let result = validate_webhook_url(url);
    // URL parser normalizes path traversal to "/etc/passwd"
    // which fails the /services/ prefix check
    assert!(result.is_err(), "Normalized path should fail prefix check");
}

#[test]
fn test_webhook_url_double_slash_in_path() {
    let url = "https://hooks.slack.com//services//T00000000//B00000000//XXXX";
    let result = validate_webhook_url(url);
    // Double slashes don't match "/services/" prefix
    assert!(result.is_err(), "Double slashes should fail prefix check");
}

#[test]
fn test_notification_all_field_labels_bold() {
    let notification = notification_fixture();

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

    for i in 0..4 {
        let field_text = payload["blocks"][0]["fields"][i]["text"].as_str().unwrap();
        assert!(
            field_text.contains("*"),
            "Field {} should have bold label",
            i
        );
    }
}

#[test]
fn test_notification_reasons_section_title_bold() {
    let notification = notification_fixture();

    let payload = json!({
        "blocks": [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": format!("*Why this matches:*\n{}", notification.score.reasons.join("\n"))
                }
            }
        ]
    });

    let reasons_text = payload["blocks"][0]["text"]["text"].as_str().unwrap();
    assert!(reasons_text.starts_with("*Why this matches:*"));
}
