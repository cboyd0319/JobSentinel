//! Discord Notifications via Webhooks
//!
//! Sends rich-formatted job alerts to Discord using webhooks with embeds.

use super::{
    notification_job_href, notification_provider_failure_summary,
    validate_webhook_url_security_parts, Notification, LOCAL_MATCH_DETAILS_MESSAGE,
};
use crate::core::config::DiscordConfig;
use anyhow::{anyhow, Result};
use serde_json::json;

/// Validate Discord webhook URL format
fn validate_webhook_url(url: &str) -> Result<()> {
    // Parse URL first to validate host/origin, not just string prefix
    // This prevents bypass attacks like "https://evil.com?https://discord.com/api/webhooks/..."
    let url_parsed =
        url::Url::parse(url).map_err(|_| anyhow!("Paste the full Discord connection link."))?;

    // Ensure HTTPS
    if url_parsed.scheme() != "https" {
        return Err(anyhow!("Paste the full Discord connection link."));
    }

    validate_webhook_url_security_parts(&url_parsed)?;

    // Ensure correct host (validate host BEFORE checking string prefix)
    let host = url_parsed
        .host_str()
        .ok_or_else(|| anyhow!("Paste the full Discord connection link copied from Discord."))?;
    if host != "discord.com" && host != "discordapp.com" {
        return Err(anyhow!(
            "Paste the full Discord connection link copied from Discord."
        ));
    }

    // Ensure path starts with /api/webhooks/
    if !url_parsed.path().starts_with("/api/webhooks/") {
        return Err(anyhow!(
            "Paste the full Discord connection link copied from Discord."
        ));
    }

    Ok(())
}

fn build_discord_payload(config: &DiscordConfig, notification: &Notification) -> serde_json::Value {
    let job = &notification.job;
    let score = &notification.score;

    let color = if score.total >= 0.9 {
        0x10b981 // Green
    } else if score.total >= 0.8 {
        0xf59e0b // Yellow/Amber
    } else {
        0x3b82f6 // Blue
    };

    // Format salary display
    let salary_display = if let (Some(min), Some(max)) = (job.salary_min, job.salary_max) {
        format!("${},000 - ${},000", min / 1000, max / 1000)
    } else if let Some(min) = job.salary_min {
        format!("${},000+", min / 1000)
    } else {
        "Not specified".to_string()
    };

    let mut embed = json!({
        "title": format!("🎯 {} - {}", job.title, job.company),
        "description": format!("**{}% Match** • {}", (score.total * 100.0).round(), job.source),
        "color": color,
        "fields": [
            {
                "name": "📍 Location",
                "value": job.location.as_deref().unwrap_or("N/A"),
                "inline": true
            },
            {
                "name": "💰 Salary",
                "value": salary_display,
                "inline": true
            },
            {
                "name": "🏢 Remote",
                "value": if job.remote.unwrap_or(false) { "✅ Yes" } else { "❌ No" },
                "inline": true
            },
            {
                "name": "✨ Why this matches",
                "value": LOCAL_MATCH_DETAILS_MESSAGE,
                "inline": false
            }
        ],
        "footer": {
            "text": "JobSentinel • Job Search Assistant"
        },
        "timestamp": chrono::Utc::now().to_rfc3339()
    });

    if let Some(href) = notification_job_href(&job.url) {
        embed["url"] = json!(href);
    }

    let mut payload = json!({
        "embeds": [embed]
    });

    if let Some(user_id) = &config.user_id_to_mention {
        payload["content"] = json!(format!("<@{}>", user_id));
    }

    payload
}

/// Send Discord notification via webhook
pub async fn send_discord_notification(
    config: &DiscordConfig,
    notification: &Notification,
) -> Result<()> {
    // Validate webhook URL before sending
    validate_webhook_url(&config.webhook_url)?;

    let payload = build_discord_payload(config, notification);

    // Send POST request to Discord webhook with timeout
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()?;

    let response = client
        .post(&config.webhook_url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| anyhow!("Discord webhook request failed: {}", e.without_url()))?;

    if !response.status().is_success() {
        let error_summary =
            notification_provider_failure_summary(response, "https://discord.com/api/webhooks")
                .await;
        return Err(anyhow!("Discord webhook failed: {}", error_summary));
    }

    Ok(())
}

/// Validate Discord webhook by sending a test message
pub async fn validate_webhook(webhook_url: &str) -> Result<bool> {
    // First validate the URL format
    validate_webhook_url(webhook_url)?;

    // Send a test message
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()?;

    let payload = json!({
        "embeds": [{
            "title": "✅ JobSentinel Webhook Test",
            "description": "Your Discord webhook is configured correctly!",
            "color": 0x10b981,
            "footer": {
                "text": "JobSentinel • Job Search Assistant"
            },
            "timestamp": chrono::Utc::now().to_rfc3339()
        }]
    });

    let response = client
        .post(webhook_url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| anyhow!("Discord webhook validation failed: {}", e.without_url()))?;

    Ok(response.status().is_success())
}

#[cfg(test)]
#[path = "discord_tests.rs"]
mod tests;
