//! Slack Notifications
//!
//! Sends rich-formatted job alerts to Slack via incoming webhooks.

use super::{
    notification_job_href, validate_webhook_url_security_parts, Notification,
    LOCAL_MATCH_DETAILS_MESSAGE, NOTIFICATION_HTTP_TIMEOUT,
};
use anyhow::{anyhow, Result};
use serde_json::json;

/// Validate Slack webhook URL format
///
/// Ensures the URL is a legitimate Slack webhook to prevent data exfiltration.
fn validate_webhook_url(url: &str) -> Result<()> {
    // Parse URL first to validate host/origin, not just string prefix
    // This prevents bypass attacks like "https://evil.com?https://hooks.slack.com/services/..."
    let url_parsed =
        url::Url::parse(url).map_err(|_| anyhow!("Paste the full Slack connection link."))?;

    // Ensure HTTPS
    if url_parsed.scheme() != "https" {
        return Err(anyhow!("Paste the full Slack connection link."));
    }

    validate_webhook_url_security_parts(&url_parsed)?;

    // Ensure correct host (validate host BEFORE checking string prefix)
    if url_parsed.host_str() != Some("hooks.slack.com") {
        return Err(anyhow!(
            "Paste the full Slack connection link copied from Slack."
        ));
    }

    // Ensure path starts with /services/
    if !url_parsed.path().starts_with("/services/") {
        return Err(anyhow!(
            "Paste the full Slack connection link copied from Slack."
        ));
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

/// Build match details section without exporting private local scoring reasons.
fn build_match_details_section_block() -> serde_json::Value {
    json!({
        "type": "section",
        "text": {
            "type": "mrkdwn",
            "text": format!("*Why this matches:*\n{}", LOCAL_MATCH_DETAILS_MESSAGE)
        }
    })
}

#[cfg(test)]
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
fn build_actions_block(job_url: &str) -> Option<serde_json::Value> {
    let href = notification_job_href(job_url)?;

    Some(json!({
        "type": "actions",
        "elements": [
            {
                "type": "button",
                "text": {
                    "type": "plain_text",
                    "text": "View Job"
                },
                "url": href,
                "style": "primary"
            }
        ]
    }))
}

/// Build complete Slack message payload
fn build_slack_payload(notification: &Notification) -> serde_json::Value {
    let mut blocks = vec![
        build_header_block(&notification.job.title),
        build_fields_section_block(notification),
        build_match_details_section_block(),
    ];

    if let Some(actions) = build_actions_block(&notification.job.url) {
        blocks.push(actions);
    }

    json!({ "blocks": blocks })
}

/// Send Slack notification
pub async fn send_slack_notification(webhook_url: &str, notification: &Notification) -> Result<()> {
    // Validate webhook URL before sending
    validate_webhook_url(webhook_url)?;

    // Build Slack message with blocks
    let payload = build_slack_payload(notification);

    // Send POST request to Slack webhook with DNS/IP validation and pinned resolution.
    let response = jobsentinel_network::post_external_https_json(
        webhook_url,
        NOTIFICATION_HTTP_TIMEOUT,
        &payload,
    )
    .await
    .map_err(|error| anyhow!("Slack webhook request failed: {error}"))?;

    if !(200..300).contains(&response.status) {
        return Err(anyhow::anyhow!("Slack webhook failed: {}", response.status));
    }

    Ok(())
}

/// Validate Slack webhook URL
pub async fn validate_webhook(webhook_url: &str) -> Result<bool> {
    // First validate the URL format
    validate_webhook_url(webhook_url)?;

    // Send a test message with DNS/IP validation and pinned resolution.
    let response = jobsentinel_network::post_external_https_json(
        webhook_url,
        NOTIFICATION_HTTP_TIMEOUT,
        &json!({"text": "JobSentinel: Webhook validation successful ✅"}),
    )
    .await
    .map_err(|error| anyhow!("Slack webhook validation failed: {error}"))?;

    Ok((200..300).contains(&response.status))
}

#[cfg(test)]
#[path = "slack_tests.rs"]
mod tests;
