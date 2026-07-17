//! Microsoft Teams Notifications via Webhooks
//!
//! Sends formatted job alerts to Microsoft Teams using Incoming Webhooks.

use super::{
    notification_job_href, notification_provider_failure_summary, Notification,
    LOCAL_MATCH_DETAILS_MESSAGE, NOTIFICATION_HTTP_TIMEOUT,
};
use anyhow::{anyhow, Result};
use jobsentinel_security::{validate_webhook_target, WebhookTarget};
use serde_json::json;

/// Validate Teams webhook URL format
fn validate_webhook_url(url: &str) -> Result<()> {
    validate_webhook_target(url, WebhookTarget::Teams)
        .map(|_| ())
        .map_err(|_| anyhow!("Paste the full Teams connection link copied from Teams."))
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
