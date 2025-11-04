//! Slack Notifications
//!
//! Sends rich-formatted job alerts to Slack via incoming webhooks.

use super::Notification;
use anyhow::Result;
use serde_json::json;

/// Send Slack notification
pub async fn send_slack_notification(
    webhook_url: &str,
    notification: &Notification,
) -> Result<()> {
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

    // Send POST request to Slack webhook
    let client = reqwest::Client::new();
    let response = client
        .post(webhook_url)
        .json(&payload)
        .send()
        .await?;

    if !response.status().is_success() {
        return Err(anyhow::anyhow!("Slack webhook failed: {}", response.status()));
    }

    Ok(())
}

/// Validate Slack webhook URL
pub async fn validate_webhook(webhook_url: &str) -> Result<bool> {
    // Send a test message
    let client = reqwest::Client::new();
    let response = client
        .post(webhook_url)
        .json(&json!({"text": "JobSentinel: Webhook validation successful ✅"}))
        .send()
        .await?;

    Ok(response.status().is_success())
}
