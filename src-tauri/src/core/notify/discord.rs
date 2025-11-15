//! Discord Notifications via Webhooks
//!
//! Sends rich-formatted job alerts to Discord using webhooks with embeds.

use super::Notification;
use crate::core::config::DiscordConfig;
use anyhow::{anyhow, Result};
use serde_json::json;

/// Validate Discord webhook URL format
fn validate_webhook_url(url: &str) -> Result<()> {
    // Check if URL starts with Discord's webhook domain
    if !url.starts_with("https://discord.com/api/webhooks/")
        && !url.starts_with("https://discordapp.com/api/webhooks/")
    {
        return Err(anyhow!(
            "Invalid Discord webhook URL. Must start with 'https://discord.com/api/webhooks/' or 'https://discordapp.com/api/webhooks/'"
        ));
    }

    // Validate URL structure
    let url_parsed = url::Url::parse(url).map_err(|e| anyhow!("Invalid URL format: {}", e))?;

    // Ensure HTTPS
    if url_parsed.scheme() != "https" {
        return Err(anyhow!("Webhook URL must use HTTPS"));
    }

    // Ensure correct host
    let host = url_parsed
        .host_str()
        .ok_or_else(|| anyhow!("Invalid webhook URL host"))?;
    if host != "discord.com" && host != "discordapp.com" {
        return Err(anyhow!(
            "Webhook URL must use discord.com or discordapp.com domain"
        ));
    }

    // Ensure path starts with /api/webhooks/
    if !url_parsed.path().starts_with("/api/webhooks/") {
        return Err(anyhow!("Invalid Discord webhook path"));
    }

    Ok(())
}

/// Send Discord notification via webhook
pub async fn send_discord_notification(
    config: &DiscordConfig,
    notification: &Notification,
) -> Result<()> {
    // Validate webhook URL before sending
    validate_webhook_url(&config.webhook_url)?;

    let job = &notification.job;
    let score = &notification.score;

    // Determine embed color based on score (green for high, yellow for medium)
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

    // Build Discord embed
    let mut embed = json!({
        "title": format!("🎯 {} - {}", job.title, job.company),
        "description": format!("**{}% Match** • {}", (score.total * 100.0).round(), job.source),
        "url": job.url,
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
                "value": score.reasons.join("\n"),
                "inline": false
            }
        ],
        "footer": {
            "text": "JobSentinel • Job Search Automation"
        },
        "timestamp": chrono::Utc::now().to_rfc3339()
    });

    // Add thumbnail if we have a company logo (future enhancement)
    // For now, use a generic icon
    embed["thumbnail"] = json!({
        "url": "https://raw.githubusercontent.com/cboyd0319/JobSentinel/main/assets/icon.png"
    });

    // Build payload with optional mention
    let mut payload = json!({
        "embeds": [embed]
    });

    // Add user mention if configured
    if let Some(user_id) = &config.user_id_to_mention {
        payload["content"] = json!(format!("<@{}>", user_id));
    }

    // Send POST request to Discord webhook with timeout
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()?;

    let response = client
        .post(&config.webhook_url)
        .json(&payload)
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response.text().await.unwrap_or_else(|_| "Unknown error".to_string());
        return Err(anyhow!(
            "Discord webhook failed with status {}: {}",
            status,
            error_text
        ));
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
                "text": "JobSentinel • Job Search Automation"
            },
            "timestamp": chrono::Utc::now().to_rfc3339()
        }]
    });

    let response = client.post(webhook_url).json(&payload).send().await?;

    Ok(response.status().is_success())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::{db::Job, scoring::{JobScore, ScoreBreakdown}};
    use chrono::Utc;

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
    fn test_valid_discord_webhook_url_passes() {
        let valid_url = "https://discord.com/api/webhooks/123456789/abcdefghijklmnopqrstuvwxyz";
        let result = validate_webhook_url(valid_url);
        assert!(result.is_ok(), "Valid Discord webhook URL should pass validation");
    }

    #[test]
    fn test_valid_discordapp_webhook_url_passes() {
        let valid_url = "https://discordapp.com/api/webhooks/123456789/abcdefghijklmnopqrstuvwxyz";
        let result = validate_webhook_url(valid_url);
        assert!(result.is_ok(), "Valid discordapp.com webhook URL should pass validation");
    }

    #[test]
    fn test_invalid_scheme_fails() {
        let invalid_url = "http://discord.com/api/webhooks/123456789/token";
        let result = validate_webhook_url(invalid_url);
        assert!(result.is_err(), "HTTP (not HTTPS) webhook should fail");
        assert!(result.unwrap_err().to_string().contains("HTTPS"));
    }

    #[test]
    fn test_wrong_domain_fails() {
        let invalid_url = "https://evil.com/api/webhooks/123456789/token";
        let result = validate_webhook_url(invalid_url);
        assert!(result.is_err(), "Wrong domain should fail validation");
        assert!(result.unwrap_err().to_string().contains("domain"));
    }

    #[test]
    fn test_wrong_path_fails() {
        let invalid_url = "https://discord.com/wrong/path/123456789/token";
        let result = validate_webhook_url(invalid_url);
        assert!(result.is_err(), "Wrong path should fail validation");
        assert!(result.unwrap_err().to_string().contains("path"));
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
    fn test_embed_color_for_high_score() {
        let notification = create_test_notification();
        let score = notification.score.total;

        let color = if score >= 0.9 {
            0x10b981
        } else if score >= 0.8 {
            0xf59e0b
        } else {
            0x3b82f6
        };

        assert_eq!(color, 0x10b981, "Score of 95% should use green color");
    }

    #[test]
    fn test_embed_color_for_medium_score() {
        let mut notification = create_test_notification();
        notification.score.total = 0.85;
        let score = notification.score.total;

        let color = if score >= 0.9 {
            0x10b981
        } else if score >= 0.8 {
            0xf59e0b
        } else {
            0x3b82f6
        };

        assert_eq!(color, 0xf59e0b, "Score of 85% should use yellow/amber color");
    }

    #[test]
    fn test_embed_color_for_low_score() {
        let mut notification = create_test_notification();
        notification.score.total = 0.75;
        let score = notification.score.total;

        let color = if score >= 0.9 {
            0x10b981
        } else if score >= 0.8 {
            0xf59e0b
        } else {
            0x3b82f6
        };

        assert_eq!(color, 0x3b82f6, "Score of 75% should use blue color");
    }

    #[test]
    fn test_salary_formatting_with_range() {
        let notification = create_test_notification();
        let salary_display = if let (Some(min), Some(max)) = (notification.job.salary_min, notification.job.salary_max) {
            format!("${},000 - ${},000", min / 1000, max / 1000)
        } else if let Some(min) = notification.job.salary_min {
            format!("${},000+", min / 1000)
        } else {
            "Not specified".to_string()
        };

        assert_eq!(salary_display, "$180,000 - $220,000");
    }

    #[test]
    fn test_salary_formatting_with_min_only() {
        let mut notification = create_test_notification();
        notification.job.salary_max = None;

        let salary_display = if let (Some(min), Some(_max)) = (notification.job.salary_min, notification.job.salary_max) {
            format!("${},000 - ${},000", min / 1000, _max / 1000)
        } else if let Some(min) = notification.job.salary_min {
            format!("${},000+", min / 1000)
        } else {
            "Not specified".to_string()
        };

        assert_eq!(salary_display, "$180,000+");
    }

    #[test]
    fn test_salary_formatting_with_none() {
        let mut notification = create_test_notification();
        notification.job.salary_min = None;
        notification.job.salary_max = None;

        let salary_display = if let (Some(min), Some(max)) = (notification.job.salary_min, notification.job.salary_max) {
            format!("${},000 - ${},000", min / 1000, max / 1000)
        } else if let Some(min) = notification.job.salary_min {
            format!("${},000+", min / 1000)
        } else {
            "Not specified".to_string()
        };

        assert_eq!(salary_display, "Not specified");
    }
}
