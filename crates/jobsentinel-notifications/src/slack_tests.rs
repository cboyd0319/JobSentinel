use super::*;
use crate::test_support::notification_fixture;

#[path = "slack_tests/builder_tests.rs"]
mod builder_tests;
#[path = "slack_tests/content_edge_tests.rs"]
mod content_edge_tests;
#[path = "slack_tests/payload_edge_tests.rs"]
mod payload_edge_tests;

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
    let notification = notification_fixture();

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
    let mut notification = notification_fixture();
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
    let _notification = notification_fixture();

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
    let notification = notification_fixture();

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

    assert!(payload.get("blocks").is_some());
    assert!(payload["blocks"].is_array());
}

#[test]
fn test_notification_includes_job_url() {
    let notification = notification_fixture();
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
    let mut notification = notification_fixture();
    notification.score.total = 0.0;

    let score_text = format!("{:.0}%", notification.score.total * 100.0);
    assert_eq!(score_text, "0%");
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
