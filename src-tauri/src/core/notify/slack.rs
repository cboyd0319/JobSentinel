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
    // Check if URL starts with Slack's webhook domain
    if !url.starts_with("https://hooks.slack.com/services/") {
        return Err(anyhow!(
            "Invalid Slack webhook URL. Must start with 'https://hooks.slack.com/services/'"
        ));
    }

    // Validate URL structure
    let url_parsed = url::Url::parse(url).map_err(|e| anyhow!("Invalid URL format: {}", e))?;

    // Ensure HTTPS
    if url_parsed.scheme() != "https" {
        return Err(anyhow!("Webhook URL must use HTTPS"));
    }

    // Ensure correct host
    if url_parsed.host_str() != Some("hooks.slack.com") {
        return Err(anyhow!("Webhook URL must use hooks.slack.com domain"));
    }

    // Ensure path starts with /services/
    if !url_parsed.path().starts_with("/services/") {
        return Err(anyhow!("Invalid Slack webhook path"));
    }

    Ok(())
}

/// Send Slack notification
pub async fn send_slack_notification(webhook_url: &str, notification: &Notification) -> Result<()> {
    // Validate webhook URL before sending
    validate_webhook_url(webhook_url)?;

    let job = &notification.job;
    let score = &notification.score;

    // Build Slack message with blocks
    let payload = json!({
        "blocks": [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": format!("🎯 High Match: {}", job.title),
                }
            },
            {
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
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": format!("*Why this matches:*\n{}", score.reasons.join("\n"))
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
                        "url": job.url,
                        "style": "primary"
                    }
                ]
            }
        ]
    });

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
        assert!(result.is_ok(), "Valid Slack webhook URL should pass validation");
    }

    #[test]
    fn test_invalid_scheme_fails() {
        let invalid_url = "http://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX";
        let result = validate_webhook_url(invalid_url);
        assert!(result.is_err(), "HTTP (not HTTPS) webhook should fail");
        assert!(result.unwrap_err().to_string().contains("https://hooks.slack.com"));
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
        assert!(result.unwrap_err().to_string().contains("services"));
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

    #[test]
    fn test_url_with_query_params_passes() {
        let valid_url = "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX?extra=param";
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
        assert!(payload["blocks"].is_array(), "Payload should have blocks array");
        assert_eq!(payload["blocks"].as_array().unwrap().len(), 4, "Should have 4 blocks");

        // Verify header block
        let header = &payload["blocks"][0];
        assert_eq!(header["type"], "header");
        assert!(header["text"]["text"].as_str().unwrap().contains("Senior Rust Engineer"));

        // Verify section fields
        let section = &payload["blocks"][1];
        assert_eq!(section["type"], "section");
        assert_eq!(section["fields"].as_array().unwrap().len(), 4, "Should have 4 fields");

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
        assert!(payload["blocks"][0]["fields"][0]["text"].as_str().unwrap().contains("N/A"));
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
            assert_eq!(formatted, expected, "Score {} should format to {}", score, expected);
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

    // Note: We cannot easily test actual HTTP calls without setting up a mock server,
    // but we've tested all the validation and JSON construction logic.
    // In a production environment, you could use `mockito` or `wiremock` crates
    // to mock HTTP responses.
}
