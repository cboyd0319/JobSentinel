//! Discord Notifications via Webhooks
//!
//! Sends rich-formatted job alerts to Discord using webhooks with embeds.

use super::{
    notification_job_href, notification_provider_failure_summary,
    validate_webhook_url_security_parts, Notification, LOCAL_MATCH_DETAILS_MESSAGE,
    NOTIFICATION_HTTP_TIMEOUT,
};
use crate::DiscordConfig;
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
    if !is_supported_discord_webhook_host(host) {
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

fn is_supported_discord_webhook_host(host: &str) -> bool {
    matches!(
        host.to_ascii_lowercase().as_str(),
        "discord.com" | "discordapp.com" | "hooks.discord.com"
    )
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

    // Send POST request to Discord webhook with DNS/IP validation and pinned resolution.
    let response = jobsentinel_network::post_external_https_json(
        &config.webhook_url,
        NOTIFICATION_HTTP_TIMEOUT,
        &payload,
    )
    .await
    .map_err(|error| anyhow!("Discord webhook request failed: {error}"))?;

    if !(200..300).contains(&response.status) {
        let error_summary = notification_provider_failure_summary(&response);
        return Err(anyhow!("Discord webhook failed: {}", error_summary));
    }

    Ok(())
}

#[cfg(test)]
#[path = "discord_tests.rs"]
mod tests;
