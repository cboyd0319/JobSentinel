use super::*;
use crate::core::{
    db::Job,
    scoring::{JobScore, ScoreBreakdown},
};
use chrono::Utc;

#[path = "slack_tests/builder_tests.rs"]
mod builder_tests;

/// Helper to create a test notification
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
fn test_valid_webhook_url_passes() {
    let valid_url = "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX";
    let result = validate_webhook_url(valid_url);
    assert!(
        result.is_ok(),
        "Valid Slack webhook URL should pass validation"
    );
}

#[test]
fn test_invalid_scheme_fails() {
    let invalid_url = "http://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX";
    let result = validate_webhook_url(invalid_url);
    assert!(result.is_err(), "HTTP (not HTTPS) webhook should fail");
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("full Slack connection link"));
}

#[test]
fn test_wrong_domain_fails() {
    let invalid_url = "https://evil.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX";
    let result = validate_webhook_url(invalid_url);
    assert!(result.is_err(), "Wrong domain should fail validation");
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("connection link copied from Slack"));
}

#[test]
fn test_wrong_prefix_fails() {
    let invalid_url = "https://hooks.slack.com/wrong/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX";
    let result = validate_webhook_url(invalid_url);
    assert!(result.is_err(), "Wrong path prefix should fail validation");
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("connection link copied from Slack"));
}

#[test]
fn test_malformed_url_fails() {
    let invalid_url = "not a url at all";
    let result = validate_webhook_url(invalid_url);
    assert!(result.is_err(), "Malformed URL should fail validation");
}

#[test]
fn test_empty_url_fails() {
    let result = validate_webhook_url("");
    assert!(result.is_err(), "Empty URL should fail validation");
}

// SECURITY TESTS: URL validation bypass attacks
#[test]
fn test_query_param_bypass_attack_fails() {
    // Attack: Try to bypass validation by putting allowed domain in query param
    let attack_url = "https://evil.com/steal?url=https://hooks.slack.com/services/T00/B00/XXX";
    let result = validate_webhook_url(attack_url);
    assert!(
        result.is_err(),
        "Query param bypass attack should be blocked"
    );
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("connection link copied from Slack"));
}

#[test]
fn test_fragment_bypass_attack_fails() {
    // Attack: Try to bypass validation by putting allowed domain in fragment
    let attack_url = "https://evil.com/steal#https://hooks.slack.com/services/T00/B00/XXX";
    let result = validate_webhook_url(attack_url);
    assert!(result.is_err(), "Fragment bypass attack should be blocked");
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("connection link copied from Slack"));
}

#[test]
fn test_path_bypass_attack_fails() {
    // Attack: Try to bypass validation by embedding allowed domain in path
    let attack_url = "https://evil.com/hooks.slack.com/services/T00/B00/XXX";
    let result = validate_webhook_url(attack_url);
    assert!(result.is_err(), "Path bypass attack should be blocked");
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("connection link copied from Slack"));
}

#[test]
fn test_subdomain_bypass_attack_fails() {
    // Attack: Try to bypass validation using a subdomain of attacker's domain
    let attack_url = "https://hooks.slack.com.evil.com/services/T00/B00/XXX";
    let result = validate_webhook_url(attack_url);
    assert!(result.is_err(), "Subdomain bypass attack should be blocked");
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("connection link copied from Slack"));
}

#[test]
fn test_username_bypass_attack_fails() {
    // Attack: Try to bypass validation using @ in URL
    let attack_url = "https://hooks.slack.com@evil.com/services/T00/B00/XXX";
    let result = validate_webhook_url(attack_url);
    assert!(result.is_err(), "Username bypass attack should be blocked");
}

#[test]
fn test_url_with_query_params_passes() {
    let valid_url =
        "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX?extra=param";
    let result = validate_webhook_url(valid_url);
    // This should pass as long as the base structure is correct
    assert!(result.is_ok(), "Webhook URL with query params should pass");
}

#[test]
fn test_notification_json_structure() {
    let notification = create_test_notification();

    // Build the payload (same as send_slack_notification)
    let payload = json!({
        "blocks": [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": format!("🎯 High Match: {}", notification.job.title),
                }
            },
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
                    },
                    {
                        "type": "mrkdwn",
                        "text": format!("*Score:*\n{:.0}%", notification.score.total * 100.0)
                    },
                    {
                        "type": "mrkdwn",
                        "text": format!("*Source:*\n{}", notification.job.source)
                    }
                ]
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": format!("*Why this matches:*\n{}", notification.score.reasons.join("\n"))
                }
            },
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

    // Verify structure
    assert!(
        payload["blocks"].is_array(),
        "Payload should have blocks array"
    );
    assert_eq!(
        payload["blocks"].as_array().unwrap().len(),
        4,
        "Should have 4 blocks"
    );

    // Verify header block
    let header = &payload["blocks"][0];
    assert_eq!(header["type"], "header");
    assert!(header["text"]["text"]
        .as_str()
        .unwrap()
        .contains("Care Coordinator"));

    // Verify section fields
    let section = &payload["blocks"][1];
    assert_eq!(section["type"], "section");
    assert_eq!(
        section["fields"].as_array().unwrap().len(),
        4,
        "Should have 4 fields"
    );

    // Verify score is formatted correctly
    let score_field = &section["fields"][2];
    assert!(score_field["text"].as_str().unwrap().contains("95%"));

    // Verify actions block
    let actions = &payload["blocks"][3];
    assert_eq!(actions["type"], "actions");
    assert_eq!(actions["elements"][0]["url"], notification.job.url);
}

#[test]
fn test_notification_handles_missing_location() {
    let mut notification = create_test_notification();
    notification.job.location = None;

    // Build payload
    let payload = json!({
        "blocks": [
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": format!("*Location:*\n{}", notification.job.location.as_deref().unwrap_or("N/A"))
                    }
                ]
            }
        ]
    });

    // Should show "N/A" for missing location
    assert!(payload["blocks"][0]["fields"][0]["text"]
        .as_str()
        .unwrap()
        .contains("N/A"));
}

#[test]
fn test_notification_score_formatting() {
    let _notification = create_test_notification();

    // Test various score values
    let test_cases = vec![
        (0.95, "95%"),
        (0.90, "90%"),
        (1.00, "100%"),
        (0.876, "88%"), // Should round
    ];

    for (score, expected) in test_cases {
        let formatted = format!("{:.0}%", score * 100.0);
        assert_eq!(
            formatted, expected,
            "Score {} should format to {}",
            score, expected
        );
    }
}

#[test]
fn test_notification_reasons_join() {
    let notification = create_test_notification();

    let reasons_text = notification.score.reasons.join("\n");

    // Should contain all reasons separated by newlines
    assert!(reasons_text.contains("Title matches"));
    assert!(reasons_text.contains("Keyword match: case management"));
    assert!(reasons_text.contains("Salary"));
    assert!(reasons_text.contains("Remote job"));

    // Should have newlines
    assert!(reasons_text.contains('\n'));
}

#[test]
fn test_webhook_validation_rejects_subdomain() {
    let invalid_url = "https://evil.hooks.slack.com/services/T00000000/B00000000/XXXX";
    let result = validate_webhook_url(invalid_url);
    assert!(
        result.is_err(),
        "Should reject subdomain of hooks.slack.com"
    );
}

#[test]
fn test_webhook_validation_case_sensitive() {
    let invalid_url = "https://HOOKS.SLACK.COM/services/T00000000/B00000000/XXXX";
    let result = validate_webhook_url(invalid_url);
    // URL host is normalized to lowercase by the url crate (per RFC 3986)
    // So uppercase hostnames actually pass validation
    assert!(
        result.is_ok(),
        "Uppercase host is normalized to lowercase and should pass validation"
    );
}

#[test]
fn test_payload_structure_has_required_fields() {
    let notification = create_test_notification();
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

    assert!(payload.get("blocks").is_some());
    assert!(payload["blocks"].is_array());
}

#[test]
fn test_notification_includes_job_url() {
    let notification = create_test_notification();
    let payload = json!({
        "blocks": [
            {
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "url": notification.job.url.clone(),
                    }
                ]
            }
        ]
    });

    assert_eq!(
        payload["blocks"][0]["elements"][0]["url"],
        notification.job.url
    );
}

#[test]
fn test_notification_with_zero_score() {
    let mut notification = create_test_notification();
    notification.score.total = 0.0;

    let score_text = format!("{:.0}%", notification.score.total * 100.0);
    assert_eq!(score_text, "0%");
}

#[test]
fn test_notification_with_perfect_score() {
    let mut notification = create_test_notification();
    notification.score.total = 1.0;

    let score_text = format!("{:.0}%", notification.score.total * 100.0);
    assert_eq!(score_text, "100%");
}

#[test]
fn test_webhook_url_with_fragment_passes() {
    let url = "https://hooks.slack.com/services/T00000000/B00000000/XXXX#fragment";
    let result = validate_webhook_url(url);
    assert!(result.is_ok(), "URL with fragment should pass");
}

#[test]
fn test_webhook_url_without_token_path_fails() {
    let url = "https://hooks.slack.com/services/";
    let result = validate_webhook_url(url);
    // This should still pass URL format validation, just won't work in practice
    assert!(result.is_ok(), "Short path still passes format validation");
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
fn test_validate_webhook_url_with_port() {
    let url = "https://hooks.slack.com:443/services/T00000000/B00000000/XXXX";
    let result = validate_webhook_url(url);
    assert!(result.is_ok(), "Explicit default HTTPS port should pass");
}

#[test]
fn test_validate_webhook_url_with_non_default_port_fails() {
    let url = "https://hooks.slack.com:8080/services/T00000000/B00000000/XXXX";
    let result = validate_webhook_url(url);
    assert!(result.is_err(), "Non-default port should fail validation");
}

#[test]
fn test_webhook_url_long_token() {
    let url =
        "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXXverylong";
    let result = validate_webhook_url(url);
    assert!(result.is_ok(), "Long token should pass validation");
}

#[test]
fn test_webhook_url_with_username_password_fails() {
    let url = "https://user:pass@hooks.slack.com/services/T00000000/B00000000/XXXX";
    let result = validate_webhook_url(url);
    assert!(
        result.is_err(),
        "URL with credentials should fail validation"
    );
}

#[test]
fn test_webhook_url_with_trailing_slash() {
    let url = "https://hooks.slack.com/services/T00000000/B00000000/XXXX/";
    let result = validate_webhook_url(url);
    assert!(result.is_ok(), "URL with trailing slash should pass");
}

#[test]
fn test_webhook_url_mixed_case_path() {
    let url = "https://hooks.slack.com/Services/T00000000/B00000000/XXXX";
    let result = validate_webhook_url(url);
    // Path check is case-sensitive
    assert!(result.is_err(), "Mixed case path should fail");
}

#[test]
fn test_webhook_url_wrong_path_structure() {
    let url = "https://hooks.slack.com/api/services/T00000000";
    let result = validate_webhook_url(url);
    assert!(result.is_err(), "Wrong path structure should fail");
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

#[test]
fn test_notification_all_blocks_have_correct_types() {
    let notification = create_test_notification();

    let payload = json!({
        "blocks": [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": format!("🎯 High Match: {}", notification.job.title),
                }
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": format!("*Company:*\n{}", notification.job.company)},
                    {"type": "mrkdwn", "text": format!("*Location:*\n{}", notification.job.location.as_deref().unwrap_or("N/A"))},
                    {"type": "mrkdwn", "text": format!("*Score:*\n{:.0}%", notification.score.total * 100.0)},
                    {"type": "mrkdwn", "text": format!("*Source:*\n{}", notification.job.source)},
                ]
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": format!("*Why this matches:*\n{}", notification.score.reasons.join("\n"))
                }
            },
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
    let notification = create_test_notification();

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
    let notification = create_test_notification();

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
    let notification = create_test_notification();

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
        let mut notification = create_test_notification();
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
    let mut notification = create_test_notification();
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
    let notification = create_test_notification();

    let payload = json!({
        "blocks": [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": format!("🎯 High Match: {}", notification.job.title),
                }
            },
            {
                "type": "section",
                "fields": [
                    {"type": "mrkdwn", "text": format!("*Company:*\n{}", notification.job.company)},
                    {"type": "mrkdwn", "text": format!("*Location:*\n{}", notification.job.location.as_deref().unwrap_or("N/A"))},
                    {"type": "mrkdwn", "text": format!("*Score:*\n{:.0}%", notification.score.total * 100.0)},
                    {"type": "mrkdwn", "text": format!("*Source:*\n{}", notification.job.source)},
                ]
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": format!("*Why this matches:*\n{}", notification.score.reasons.join("\n"))
                }
            },
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

    // Test that payload serializes to valid JSON
    let json_string = serde_json::to_string(&payload);
    assert!(json_string.is_ok(), "Payload should serialize to JSON");

    // Verify we can deserialize it back
    let deserialized: serde_json::Value = serde_json::from_str(&json_string.unwrap()).unwrap();
    assert_eq!(deserialized, payload);
}

#[test]
fn test_notification_with_empty_string_location() {
    let mut notification = create_test_notification();
    notification.job.location = Some("".to_string());

    let location_display = notification.job.location.as_deref().unwrap_or("N/A");
    // Empty string should be used (not N/A)
    assert_eq!(location_display, "");
}

#[test]
fn test_notification_with_whitespace_only_location() {
    let mut notification = create_test_notification();
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
    let notification = create_test_notification();

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

// Tests for builder functions
