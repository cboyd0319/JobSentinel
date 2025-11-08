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
