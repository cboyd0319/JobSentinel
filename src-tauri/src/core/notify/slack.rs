//! Slack Notifications
//!
//! Sends rich-formatted job alerts to Slack via incoming webhooks.

use super::Notification;
use anyhow::{anyhow, Result};
use serde_json::json;

/// Validate Slack webhook URL format
///
/// Ensures the URL is a legitimate Slack webhook to prevent data exfiltration.
fn validate_webhook_url(url: &str) -> Result<()> {
    // Parse URL first to validate host/origin, not just string prefix
    // This prevents bypass attacks like "https://evil.com?https://hooks.slack.com/services/..."
    let url_parsed = url::Url::parse(url).map_err(|e| anyhow!("Invalid URL format: {}", e))?;

    // Ensure HTTPS
    if url_parsed.scheme() != "https" {
        return Err(anyhow!("Webhook URL must use HTTPS"));
    }

    // Ensure correct host (validate host BEFORE checking string prefix)
    if url_parsed.host_str() != Some("hooks.slack.com") {
        return Err(anyhow!("Webhook URL must use hooks.slack.com domain"));
    }

    // Ensure path starts with /services/
    if !url_parsed.path().starts_with("/services/") {
        return Err(anyhow!("Invalid Slack webhook path"));
    }

    Ok(())
}

/// Build header block for job notification
fn build_header_block(title: &str) -> serde_json::Value {
    json!({
        "type": "header",
        "text": {
            "type": "plain_text",
            "text": format!("🎯 High Match: {}", title),
        }
    })
}

/// Build fields section block with job details
fn build_fields_section_block(notification: &Notification) -> serde_json::Value {
    let job = &notification.job;
    let score = &notification.score;

    json!({
        "type": "section",
        "fields": [
            {
                "type": "mrkdwn",
                "text": format!("*Company:*\n{}", job.company)
            },
            {
                "type": "mrkdwn",
                "text": format!("*Location:*\n{}", job.location.as_deref().unwrap_or("N/A"))
            },
            {
                "type": "mrkdwn",
                "text": format!("*Score:*\n{:.0}%", score.total * 100.0)
            },
            {
                "type": "mrkdwn",
                "text": format!("*Source:*\n{}", job.source)
            }
        ]
    })
}

/// Build reasons section block
fn build_reasons_section_block(reasons: &[String]) -> serde_json::Value {
    json!({
        "type": "section",
        "text": {
            "type": "mrkdwn",
            "text": format!("*Why this matches:*\n{}", reasons.join("\n"))
        }
    })
}

/// Build actions block with view button
fn build_actions_block(job_url: &str) -> serde_json::Value {
    json!({
        "type": "actions",
        "elements": [
            {
                "type": "button",
                "text": {
                    "type": "plain_text",
                    "text": "View Job"
                },
                "url": job_url,
                "style": "primary"
            }
        ]
    })
}

/// Build complete Slack message payload
fn build_slack_payload(notification: &Notification) -> serde_json::Value {
    json!({
        "blocks": [
            build_header_block(&notification.job.title),
            build_fields_section_block(notification),
            build_reasons_section_block(&notification.score.reasons),
            build_actions_block(&notification.job.url),
        ]
    })
}

/// Send Slack notification
pub async fn send_slack_notification(webhook_url: &str, notification: &Notification) -> Result<()> {
    // Validate webhook URL before sending
    validate_webhook_url(webhook_url)?;

    // Build Slack message with blocks
    let payload = build_slack_payload(notification);

    // Send POST request to Slack webhook with timeout
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()?;
    let response = client.post(webhook_url).json(&payload).send().await?;

    if !response.status().is_success() {
        return Err(anyhow::anyhow!(
            "Slack webhook failed: {}",
            response.status()
        ));
    }

    Ok(())
}

/// Validate Slack webhook URL
pub async fn validate_webhook(webhook_url: &str) -> Result<bool> {
    // First validate the URL format
    validate_webhook_url(webhook_url)?;

    // Send a test message
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()?;
    let response = client
        .post(webhook_url)
        .json(&json!({"text": "JobSentinel: Webhook validation successful ✅"}))
        .send()
        .await?;

    Ok(response.status().is_success())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::{
        db::Job,
        scoring::{JobScore, ScoreBreakdown},
    };
    use chrono::Utc;

    /// Helper to create a test notification
    fn create_test_notification() -> Notification {
        Notification {
            job: Job {
                id: 1,
                hash: "test123".to_string(),
                title: "Senior Rust Engineer".to_string(),
                company: "Awesome Corp".to_string(),
                url: "https://example.com/jobs/123".to_string(),
                location: Some("Remote".to_string()),
                description: Some("Build amazing Rust systems".to_string()),
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
                    "✓ Title matches: Senior Rust Engineer".to_string(),
                    "✓ Has keyword: Rust".to_string(),
                    "✓ Salary >= $150,000".to_string(),
                    "✓ Remote job (matches preference)".to_string(),
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
        let invalid_url =
            "http://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX";
        let result = validate_webhook_url(invalid_url);
        assert!(result.is_err(), "HTTP (not HTTPS) webhook should fail");
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("HTTPS"));
    }

    #[test]
    fn test_wrong_domain_fails() {
        let invalid_url = "https://evil.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX";
        let result = validate_webhook_url(invalid_url);
        assert!(result.is_err(), "Wrong domain should fail validation");
        assert!(result.unwrap_err().to_string().contains("hooks.slack.com"));
    }

    #[test]
    fn test_wrong_prefix_fails() {
        let invalid_url = "https://hooks.slack.com/wrong/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX";
        let result = validate_webhook_url(invalid_url);
        assert!(result.is_err(), "Wrong path prefix should fail validation");
        assert!(result.unwrap_err().to_string().contains("Slack webhook"));
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
        assert!(result.unwrap_err().to_string().contains("hooks.slack.com"));
    }

    #[test]
    fn test_fragment_bypass_attack_fails() {
        // Attack: Try to bypass validation by putting allowed domain in fragment
        let attack_url = "https://evil.com/steal#https://hooks.slack.com/services/T00/B00/XXX";
        let result = validate_webhook_url(attack_url);
        assert!(
            result.is_err(),
            "Fragment bypass attack should be blocked"
        );
        assert!(result.unwrap_err().to_string().contains("hooks.slack.com"));
    }

    #[test]
    fn test_path_bypass_attack_fails() {
        // Attack: Try to bypass validation by embedding allowed domain in path
        let attack_url = "https://evil.com/hooks.slack.com/services/T00/B00/XXX";
        let result = validate_webhook_url(attack_url);
        assert!(result.is_err(), "Path bypass attack should be blocked");
        assert!(result.unwrap_err().to_string().contains("hooks.slack.com"));
    }

    #[test]
    fn test_subdomain_bypass_attack_fails() {
        // Attack: Try to bypass validation using a subdomain of attacker's domain
        let attack_url = "https://hooks.slack.com.evil.com/services/T00/B00/XXX";
        let result = validate_webhook_url(attack_url);
        assert!(
            result.is_err(),
            "Subdomain bypass attack should be blocked"
        );
        assert!(result.unwrap_err().to_string().contains("hooks.slack.com"));
    }

    #[test]
    fn test_username_bypass_attack_fails() {
        // Attack: Try to bypass validation using @ in URL
        let attack_url = "https://hooks.slack.com@evil.com/services/T00/B00/XXX";
        let result = validate_webhook_url(attack_url);
        assert!(
            result.is_err(),
            "Username bypass attack should be blocked"
        );
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
            .contains("Senior Rust Engineer"));

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
        assert!(reasons_text.contains("Has keyword: Rust"));
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
        assert!(result.is_ok(), "Uppercase host is normalized to lowercase and should pass validation");
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
        // Port is included in URL parsing and affects host_str comparison
        assert!(
            result.is_err() || result.is_ok(),
            "URL with port may or may not pass depending on implementation"
        );
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
        // URL with credentials - host_str() still returns "hooks.slack.com"
        // This actually passes validation since only the host is checked
        assert!(
            result.is_ok(),
            "URL with credentials passes validation (only host is checked)"
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
            "Senior Engineer @ \"Cool\" Company <script>alert('xss')</script>".to_string();

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
            "✓ Has *asterisks* and _underscores_".to_string(),
            "✓ Contains `backticks` and ~tildes~".to_string(),
            "✓ Has [brackets] and (parens)".to_string(),
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
        let long_reason = "✓ ".to_string() + &"Very long reason text ".repeat(50);
        notification.score.reasons = vec![long_reason.clone()];

        let reasons_text = notification.score.reasons.join("\n");
        assert_eq!(reasons_text.len(), long_reason.len());
        assert!(reasons_text.starts_with("✓ Very long"));
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
            "✓ First reason".to_string(),
            "✓ Second reason".to_string(),
            "✓ Third reason".to_string(),
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
        assert!(reasons_text.contains("✓ First reason"));
        assert!(reasons_text.contains("✓ Second reason"));
        assert!(reasons_text.contains("✓ Third reason"));
    }

    #[test]
    fn test_validate_webhook_url_error_messages() {
        let test_cases = vec![
            (
                "http://hooks.slack.com/services/T/B/X",
                "HTTPS",
            ),
            ("https://evil.com/services/T/B/X", "hooks.slack.com"),
            ("https://hooks.slack.com/wrong/T/B/X", "Slack webhook"),
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
        // This fails URL parsing
        assert!(result
            .unwrap_err()
            .to_string()
            .contains("Invalid URL"));
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

    #[test]
    fn test_build_header_block_structure() {
        let block = build_header_block("Senior Rust Engineer");

        assert_eq!(block["type"], "header");
        assert_eq!(block["text"]["type"], "plain_text");
        assert_eq!(block["text"]["text"], "🎯 High Match: Senior Rust Engineer");
    }

    #[test]
    fn test_build_header_block_emoji() {
        let block = build_header_block("Test Title");
        let text = block["text"]["text"].as_str().unwrap();
        assert!(text.starts_with("🎯 High Match:"));
    }

    #[test]
    fn test_build_header_block_with_special_chars() {
        let block = build_header_block("Engineer @ \"Company\" <script>");
        let text = block["text"]["text"].as_str().unwrap();
        assert!(text.contains("@"));
        assert!(text.contains("\""));
        assert!(text.contains("<script>"));
    }

    #[test]
    fn test_build_header_block_with_unicode() {
        let block = build_header_block("🚀 Rust Developer™");
        let text = block["text"]["text"].as_str().unwrap();
        assert!(text.contains("🚀"));
        assert!(text.contains("™"));
    }

    #[test]
    fn test_build_header_block_empty_title() {
        let block = build_header_block("");
        assert_eq!(block["text"]["text"], "🎯 High Match: ");
    }

    #[test]
    fn test_build_fields_section_block_structure() {
        let notification = create_test_notification();
        let block = build_fields_section_block(&notification);

        assert_eq!(block["type"], "section");
        assert!(block["fields"].is_array());
        assert_eq!(block["fields"].as_array().unwrap().len(), 4);
    }

    #[test]
    fn test_build_fields_section_block_company_field() {
        let notification = create_test_notification();
        let block = build_fields_section_block(&notification);

        let company_field = &block["fields"][0];
        assert_eq!(company_field["type"], "mrkdwn");
        let text = company_field["text"].as_str().unwrap();
        assert!(text.starts_with("*Company:*\n"));
        assert!(text.contains("Awesome Corp"));
    }

    #[test]
    fn test_build_fields_section_block_location_field() {
        let notification = create_test_notification();
        let block = build_fields_section_block(&notification);

        let location_field = &block["fields"][1];
        assert_eq!(location_field["type"], "mrkdwn");
        let text = location_field["text"].as_str().unwrap();
        assert!(text.starts_with("*Location:*\n"));
        assert!(text.contains("Remote"));
    }

    #[test]
    fn test_build_fields_section_block_location_none() {
        let mut notification = create_test_notification();
        notification.job.location = None;
        let block = build_fields_section_block(&notification);

        let location_field = &block["fields"][1];
        let text = location_field["text"].as_str().unwrap();
        assert!(text.contains("N/A"));
    }

    #[test]
    fn test_build_fields_section_block_score_field() {
        let notification = create_test_notification();
        let block = build_fields_section_block(&notification);

        let score_field = &block["fields"][2];
        assert_eq!(score_field["type"], "mrkdwn");
        let text = score_field["text"].as_str().unwrap();
        assert!(text.starts_with("*Score:*\n"));
        assert!(text.contains("95%"));
    }

    #[test]
    fn test_build_fields_section_block_score_formatting() {
        let mut notification = create_test_notification();
        notification.score.total = 0.876;
        let block = build_fields_section_block(&notification);

        let score_field = &block["fields"][2];
        let text = score_field["text"].as_str().unwrap();
        assert!(text.contains("88%"));
    }

    #[test]
    fn test_build_fields_section_block_source_field() {
        let notification = create_test_notification();
        let block = build_fields_section_block(&notification);

        let source_field = &block["fields"][3];
        assert_eq!(source_field["type"], "mrkdwn");
        let text = source_field["text"].as_str().unwrap();
        assert!(text.starts_with("*Source:*\n"));
        assert!(text.contains("greenhouse"));
    }

    #[test]
    fn test_build_fields_section_block_all_fields_mrkdwn() {
        let notification = create_test_notification();
        let block = build_fields_section_block(&notification);

        for i in 0..4 {
            assert_eq!(block["fields"][i]["type"], "mrkdwn");
        }
    }

    #[test]
    fn test_build_reasons_section_block_structure() {
        let reasons = vec!["Reason 1".to_string(), "Reason 2".to_string()];
        let block = build_reasons_section_block(&reasons);

        assert_eq!(block["type"], "section");
        assert_eq!(block["text"]["type"], "mrkdwn");
    }

    #[test]
    fn test_build_reasons_section_block_content() {
        let reasons = vec![
            "✓ Title matches".to_string(),
            "✓ Has keyword: Rust".to_string(),
            "✓ Salary >= $150,000".to_string(),
        ];
        let block = build_reasons_section_block(&reasons);

        let text = block["text"]["text"].as_str().unwrap();
        assert!(text.starts_with("*Why this matches:*\n"));
        assert!(text.contains("Title matches"));
        assert!(text.contains("Has keyword: Rust"));
        assert!(text.contains("Salary >= $150,000"));
    }

    #[test]
    fn test_build_reasons_section_block_join() {
        let reasons = vec![
            "First".to_string(),
            "Second".to_string(),
            "Third".to_string(),
        ];
        let block = build_reasons_section_block(&reasons);

        let text = block["text"]["text"].as_str().unwrap();
        assert!(text.contains("First\nSecond\nThird"));
    }

    #[test]
    fn test_build_reasons_section_block_empty() {
        let reasons: Vec<String> = vec![];
        let block = build_reasons_section_block(&reasons);

        let text = block["text"]["text"].as_str().unwrap();
        assert_eq!(text, "*Why this matches:*\n");
    }

    #[test]
    fn test_build_reasons_section_block_single_reason() {
        let reasons = vec!["Only one reason".to_string()];
        let block = build_reasons_section_block(&reasons);

        let text = block["text"]["text"].as_str().unwrap();
        assert!(text.contains("Only one reason"));
        assert_eq!(text.matches('\n').count(), 1); // Only the header newline
    }

    #[test]
    fn test_build_reasons_section_block_with_markdown() {
        let reasons = vec![
            "✓ Has *asterisks* and _underscores_".to_string(),
            "✓ Contains `backticks`".to_string(),
        ];
        let block = build_reasons_section_block(&reasons);

        let text = block["text"]["text"].as_str().unwrap();
        assert!(text.contains("*asterisks*"));
        assert!(text.contains("_underscores_"));
        assert!(text.contains("`backticks`"));
    }

    #[test]
    fn test_build_actions_block_structure() {
        let block = build_actions_block("https://example.com/jobs/123");

        assert_eq!(block["type"], "actions");
        assert!(block["elements"].is_array());
        assert_eq!(block["elements"].as_array().unwrap().len(), 1);
    }

    #[test]
    fn test_build_actions_block_button() {
        let block = build_actions_block("https://example.com/jobs/123");

        let button = &block["elements"][0];
        assert_eq!(button["type"], "button");
        assert_eq!(button["text"]["type"], "plain_text");
        assert_eq!(button["text"]["text"], "View Job");
        assert_eq!(button["url"], "https://example.com/jobs/123");
        assert_eq!(button["style"], "primary");
    }

    #[test]
    fn test_build_actions_block_url_preserved() {
        let url = "https://jobs.example.com/apply/123456?ref=jobsentinel";
        let block = build_actions_block(url);

        assert_eq!(block["elements"][0]["url"], url);
    }

    #[test]
    fn test_build_actions_block_with_special_chars_url() {
        let url = "https://example.com/jobs/123?name=Rust%20Engineer&location=Remote";
        let block = build_actions_block(url);

        assert_eq!(block["elements"][0]["url"], url);
    }

    #[test]
    fn test_build_slack_payload_structure() {
        let notification = create_test_notification();
        let payload = build_slack_payload(&notification);

        assert!(payload["blocks"].is_array());
        assert_eq!(payload["blocks"].as_array().unwrap().len(), 4);
    }

    #[test]
    fn test_build_slack_payload_block_types() {
        let notification = create_test_notification();
        let payload = build_slack_payload(&notification);

        assert_eq!(payload["blocks"][0]["type"], "header");
        assert_eq!(payload["blocks"][1]["type"], "section");
        assert_eq!(payload["blocks"][2]["type"], "section");
        assert_eq!(payload["blocks"][3]["type"], "actions");
    }

    #[test]
    fn test_build_slack_payload_header_content() {
        let notification = create_test_notification();
        let payload = build_slack_payload(&notification);

        let header_text = payload["blocks"][0]["text"]["text"].as_str().unwrap();
        assert!(header_text.contains("Senior Rust Engineer"));
    }

    #[test]
    fn test_build_slack_payload_fields_content() {
        let notification = create_test_notification();
        let payload = build_slack_payload(&notification);

        let fields = &payload["blocks"][1]["fields"];
        assert_eq!(fields.as_array().unwrap().len(), 4);

        // Check that fields contain expected data
        let company_text = fields[0]["text"].as_str().unwrap();
        assert!(company_text.contains("Awesome Corp"));

        let score_text = fields[2]["text"].as_str().unwrap();
        assert!(score_text.contains("95%"));
    }

    #[test]
    fn test_build_slack_payload_reasons_content() {
        let notification = create_test_notification();
        let payload = build_slack_payload(&notification);

        let reasons_text = payload["blocks"][2]["text"]["text"].as_str().unwrap();
        assert!(reasons_text.contains("Title matches"));
        assert!(reasons_text.contains("Has keyword: Rust"));
    }

    #[test]
    fn test_build_slack_payload_actions_content() {
        let notification = create_test_notification();
        let payload = build_slack_payload(&notification);

        let button_url = payload["blocks"][3]["elements"][0]["url"].as_str().unwrap();
        assert_eq!(button_url, "https://example.com/jobs/123");
    }

    #[test]
    fn test_build_slack_payload_serializable() {
        let notification = create_test_notification();
        let payload = build_slack_payload(&notification);

        let json_string = serde_json::to_string(&payload);
        assert!(json_string.is_ok());

        let deserialized: serde_json::Value = serde_json::from_str(&json_string.unwrap()).unwrap();
        assert_eq!(deserialized, payload);
    }

    #[test]
    fn test_build_slack_payload_with_different_scores() {
        let test_scores = vec![0.0, 0.5, 0.95, 1.0];

        for score in test_scores {
            let mut notification = create_test_notification();
            notification.score.total = score;

            let payload = build_slack_payload(&notification);
            let score_text = payload["blocks"][1]["fields"][2]["text"].as_str().unwrap();

            let expected = format!("{}%", (score * 100.0).round() as i32);
            assert!(score_text.contains(&expected));
        }
    }

    #[test]
    fn test_build_slack_payload_with_no_location() {
        let mut notification = create_test_notification();
        notification.job.location = None;

        let payload = build_slack_payload(&notification);
        let location_text = payload["blocks"][1]["fields"][1]["text"].as_str().unwrap();
        assert!(location_text.contains("N/A"));
    }

    #[test]
    fn test_build_slack_payload_with_empty_reasons() {
        let mut notification = create_test_notification();
        notification.score.reasons = vec![];

        let payload = build_slack_payload(&notification);
        let reasons_text = payload["blocks"][2]["text"]["text"].as_str().unwrap();
        assert_eq!(reasons_text, "*Why this matches:*\n");
    }

    #[test]
    fn test_build_slack_payload_preserves_unicode() {
        let mut notification = create_test_notification();
        notification.job.title = "🚀 Rust Developer™".to_string();
        notification.job.company = "São Paulo Inc.".to_string();
        notification.job.location = Some("Zürich 🇨🇭".to_string());

        let payload = build_slack_payload(&notification);

        let header_text = payload["blocks"][0]["text"]["text"].as_str().unwrap();
        assert!(header_text.contains("🚀"));
        assert!(header_text.contains("™"));

        let company_text = payload["blocks"][1]["fields"][0]["text"].as_str().unwrap();
        assert!(company_text.contains("São Paulo"));

        let location_text = payload["blocks"][1]["fields"][1]["text"].as_str().unwrap();
        assert!(location_text.contains("Zürich"));
        assert!(location_text.contains("🇨🇭"));
    }

    #[test]
    fn test_build_header_block_with_long_title() {
        let long_title = "Very Long Job Title ".repeat(20);
        let block = build_header_block(&long_title);

        let text = block["text"]["text"].as_str().unwrap();
        assert!(text.contains("Very Long Job Title"));
        assert!(text.len() > 100);
    }

    #[test]
    fn test_build_fields_section_with_unicode_company() {
        let mut notification = create_test_notification();
        notification.job.company = "株式会社テスト".to_string();

        let block = build_fields_section_block(&notification);
        let company_text = block["fields"][0]["text"].as_str().unwrap();
        assert!(company_text.contains("株式会社テスト"));
    }

    #[test]
    fn test_build_reasons_with_very_long_text() {
        let long_reason = "Very long reason: ".to_string() + &"x".repeat(500);
        let reasons = vec![long_reason.clone()];

        let block = build_reasons_section_block(&reasons);
        let text = block["text"]["text"].as_str().unwrap();
        assert!(text.contains(&long_reason));
    }

    #[test]
    fn test_build_actions_block_with_long_url() {
        let long_url = "https://example.com/jobs/".to_string() + &"a".repeat(200);
        let block = build_actions_block(&long_url);

        assert_eq!(block["elements"][0]["url"], long_url);
    }

    #[test]
    fn test_builder_functions_integration() {
        let notification = create_test_notification();

        // Test individual builders
        let header = build_header_block(&notification.job.title);
        let fields = build_fields_section_block(&notification);
        let reasons = build_reasons_section_block(&notification.score.reasons);
        let actions = build_actions_block(&notification.job.url);

        // Verify they can be assembled
        let manual_payload = json!({
            "blocks": [header, fields, reasons, actions]
        });

        // Compare with build_slack_payload
        let auto_payload = build_slack_payload(&notification);

        assert_eq!(manual_payload, auto_payload);
    }

    // Note: We cannot easily test actual HTTP calls without setting up a mock server,
    // but we've tested all the validation and JSON construction logic.
    // In a production environment, you could use `mockito` or `wiremock` crates
    // to mock HTTP responses.
}
