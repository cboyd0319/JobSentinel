//! Microsoft Teams Notifications via Webhooks
//!
//! Sends formatted job alerts to Microsoft Teams using Incoming Webhooks.

use super::{
    notification_job_href, notification_provider_failure_summary,
    validate_webhook_url_security_parts, Notification, LOCAL_MATCH_DETAILS_MESSAGE,
    NOTIFICATION_HTTP_TIMEOUT,
};
use anyhow::{anyhow, Result};
use serde_json::json;

/// Validate Teams webhook URL format
fn validate_webhook_url(url: &str) -> Result<()> {
    // Parse URL first to validate host/origin, not just string prefix
    // This prevents bypass attacks like "https://evil.com?https://outlook.office.com/webhook/..."
    let url_parsed =
        url::Url::parse(url).map_err(|_| anyhow!("Paste the full Teams connection link."))?;

    // Ensure HTTPS
    if url_parsed.scheme() != "https" {
        return Err(anyhow!("Paste the full Teams connection link."));
    }

    validate_webhook_url_security_parts(&url_parsed)?;

    // Ensure correct host and path (validate host BEFORE checking string prefix)
    let host = url_parsed
        .host_str()
        .ok_or_else(|| anyhow!("Paste the full Teams connection link copied from Teams."))?;

    if !is_supported_teams_webhook_target(&url_parsed, host) {
        return Err(anyhow!(
            "Paste the full Teams connection link copied from Teams."
        ));
    }

    Ok(())
}

fn is_supported_teams_webhook_target(url: &url::Url, host: &str) -> bool {
    let host = host.to_ascii_lowercase();
    let path = url.path();
    let has_generated_path = path.len() > 1;

    let legacy_connector = matches!(
        host.as_str(),
        "outlook.office.com" | "outlook.office365.com"
    ) && path.starts_with("/webhook/");
    let current_connector =
        host.ends_with(".webhook.office.com") && host != "webhook.office.com" && has_generated_path;
    let workflow_trigger =
        host.ends_with(".logic.azure.com") && host != "logic.azure.com" && has_generated_path;

    legacy_connector || current_connector || workflow_trigger
}

fn build_teams_payload(notification: &Notification) -> serde_json::Value {
    let job = &notification.job;
    let score = &notification.score;

    let theme_color = if score.total >= 0.9 {
        "00FF00" // Green
    } else if score.total >= 0.8 {
        "FFA500" // Orange
    } else {
        "0078D4" // Microsoft Blue
    };

    // Format salary display
    let salary_display = if let (Some(min), Some(max)) = (job.salary_min, job.salary_max) {
        format!("${},000 - ${},000", min / 1000, max / 1000)
    } else if let Some(min) = job.salary_min {
        format!("${},000+", min / 1000)
    } else {
        "Not specified".to_string()
    };

    let mut payload = json!({
        "@type": "MessageCard",
        "@context": "https://schema.org/extensions",
        "summary": format!("New job alert: {} at {}", job.title, job.company),
        "themeColor": theme_color,
        "title": format!("🎯 High Match Job Alert ({}% Match)", (score.total * 100.0).round()),
        "sections": [
            {
                "activityTitle": format!("**{}**", job.title),
                "activitySubtitle": format!("{} • {}", job.company, job.source),
                "facts": [
                    {
                        "name": "Location:",
                        "value": job.location.as_deref().unwrap_or("N/A")
                    },
                    {
                        "name": "Salary:",
                        "value": salary_display
                    },
                    {
                        "name": "Remote:",
                        "value": if job.remote.unwrap_or(false) { "✅ Yes" } else { "❌ No" }
                    },
                    {
                        "name": "Match Score:",
                        "value": format!("{}%", (score.total * 100.0).round())
                    }
                ],
                "text": format!("**Why this matches:**\n\n{}", LOCAL_MATCH_DETAILS_MESSAGE)
            }
        ]
    });

    if let Some(href) = notification_job_href(&job.url) {
        payload["potentialAction"] = json!([
             {
                "@type": "OpenUri",
                "name": "View Full Job Posting",
                "targets": [
                    {
                        "os": "default",
                        "uri": href
                    }
                ]
            }
        ]);
    }

    payload
}

/// Send Teams notification via webhook
///
/// Uses the MessageCard format for compatibility with most Teams setups.
/// Newer Adaptive Cards format could be added in the future.
pub async fn send_teams_notification(webhook_url: &str, notification: &Notification) -> Result<()> {
    // Validate webhook URL before sending
    validate_webhook_url(webhook_url)?;

    let payload = build_teams_payload(notification);

    // Send POST request to Teams webhook with DNS/IP validation and pinned resolution.
    let response = jobsentinel_network::post_external_https_json(
        webhook_url,
        NOTIFICATION_HTTP_TIMEOUT,
        &payload,
    )
    .await
    .map_err(|error| anyhow!("Teams webhook request failed: {error}"))?;

    if !(200..300).contains(&response.status) {
        let error_summary = notification_provider_failure_summary(&response);
        return Err(anyhow!("Teams webhook failed: {}", error_summary));
    }

    Ok(())
}

#[cfg(test)]
#[path = "teams_tests.rs"]
mod tests;
