//! Microsoft Teams Notifications via Webhooks
//!
//! Sends formatted job alerts to Microsoft Teams using Incoming Webhooks.

use super::Notification;
use anyhow::{anyhow, Result};
use serde_json::json;

/// Validate Teams webhook URL format
fn validate_webhook_url(url: &str) -> Result<()> {
    // Check if URL starts with Teams' webhook domains
    if !url.starts_with("https://outlook.office.com/webhook/")
        && !url.starts_with("https://outlook.office365.com/webhook/")
    {
        return Err(anyhow!(
            "Invalid Teams webhook URL. Must start with 'https://outlook.office.com/webhook/' or 'https://outlook.office365.com/webhook/'"
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
    if host != "outlook.office.com" && host != "outlook.office365.com" {
        return Err(anyhow!(
            "Webhook URL must use outlook.office.com or outlook.office365.com domain"
        ));
    }

    // Ensure path starts with /webhook/
    if !url_parsed.path().starts_with("/webhook/") {
        return Err(anyhow!("Invalid Teams webhook path"));
    }

    Ok(())
}

/// Send Teams notification via webhook
///
/// Uses the MessageCard format for compatibility with most Teams setups.
/// Newer Adaptive Cards format could be added in the future.
pub async fn send_teams_notification(
    webhook_url: &str,
    notification: &Notification,
) -> Result<()> {
    // Validate webhook URL before sending
    validate_webhook_url(webhook_url)?;

    let job = &notification.job;
    let score = &notification.score;

    // Determine theme color based on score
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

    // Build MessageCard payload
    // See: https://docs.microsoft.com/en-us/outlook/actionable-messages/message-card-reference
    let payload = json!({
        "@type": "MessageCard",
        "@context": "https://schema.org/extensions",
        "summary": format!("New job alert: {} at {}", job.title, job.company),
        "themeColor": theme_color,
        "title": format!("🎯 High Match Job Alert ({}% Match)", (score.total * 100.0).round()),
        "sections": [
            {
                "activityTitle": format!("**{}**", job.title),
                "activitySubtitle": format!("{} • {}", job.company, job.source),
                "activityImage": "https://raw.githubusercontent.com/cboyd0319/JobSentinel/main/assets/icon.png",
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
                "text": format!("**Why this matches:**\n\n{}", score.reasons.join("\n\n"))
            }
        ],
        "potentialAction": [
            {
                "@type": "OpenUri",
                "name": "View Full Job Posting",
                "targets": [
                    {
                        "os": "default",
                        "uri": job.url
                    }
                ]
            }
        ]
    });

    // Send POST request to Teams webhook with timeout
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()?;

    let response = client.post(webhook_url).json(&payload).send().await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(anyhow!(
            "Teams webhook failed with status {}: {}",
            status,
            error_text
        ));
    }

    Ok(())
}

/// Validate Teams webhook by sending a test message
pub async fn validate_webhook(webhook_url: &str) -> Result<bool> {
    // First validate the URL format
    validate_webhook_url(webhook_url)?;

    // Send a test message
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()?;

    let payload = json!({
        "@type": "MessageCard",
        "@context": "https://schema.org/extensions",
        "summary": "JobSentinel Webhook Test",
        "themeColor": "00FF00",
        "title": "✅ JobSentinel Webhook Test",
        "text": "Your Microsoft Teams webhook is configured correctly! You'll now receive job alerts in this channel.",
        "potentialAction": [
            {
                "@type": "OpenUri",
                "name": "Learn More",
                "targets": [
                    {
                        "os": "default",
                        "uri": "https://github.com/cboyd0319/JobSentinel"
                    }
                ]
            }
        ]
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
                hidden: false,
                bookmarked: false,
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
    fn test_valid_office_com_webhook_url_passes() {
        let valid_url = "https://outlook.office.com/webhook/12345678-1234-1234-1234-123456789012@12345678-1234-1234-1234-123456789012/IncomingWebhook/abcdef/12345678-1234-1234-1234-123456789012";
        let result = validate_webhook_url(valid_url);
        assert!(result.is_ok(), "Valid outlook.office.com webhook URL should pass validation");
    }

    #[test]
    fn test_valid_office365_com_webhook_url_passes() {
        let valid_url = "https://outlook.office365.com/webhook/12345678-1234-1234-1234-123456789012@12345678-1234-1234-1234-123456789012/IncomingWebhook/abcdef/12345678-1234-1234-1234-123456789012";
        let result = validate_webhook_url(valid_url);
        assert!(result.is_ok(), "Valid outlook.office365.com webhook URL should pass validation");
    }

    #[test]
    fn test_invalid_scheme_fails() {
        let invalid_url = "http://outlook.office.com/webhook/123/456";
        let result = validate_webhook_url(invalid_url);
        assert!(result.is_err(), "HTTP (not HTTPS) webhook should fail");
        assert!(result.unwrap_err().to_string().contains("https://outlook.office"));
    }

    #[test]
    fn test_wrong_domain_fails() {
        let invalid_url = "https://evil.com/webhook/123/456";
        let result = validate_webhook_url(invalid_url);
        assert!(result.is_err(), "Wrong domain should fail validation");
        assert!(result.unwrap_err().to_string().contains("outlook.office"));
    }

    #[test]
    fn test_wrong_path_fails() {
        let invalid_url = "https://outlook.office.com/wrong/123/456";
        let result = validate_webhook_url(invalid_url);
        assert!(result.is_err(), "Wrong path should fail validation");
        assert!(result.unwrap_err().to_string().contains("webhook"));
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
    fn test_theme_color_for_high_score() {
        let notification = create_test_notification();
        let score = notification.score.total;

        let theme_color = if score >= 0.9 {
            "00FF00"
        } else if score >= 0.8 {
            "FFA500"
        } else {
            "0078D4"
        };

        assert_eq!(theme_color, "00FF00", "Score of 95% should use green color");
    }

    #[test]
    fn test_theme_color_for_medium_score() {
        let mut notification = create_test_notification();
        notification.score.total = 0.85;
        let score = notification.score.total;

        let theme_color = if score >= 0.9 {
            "00FF00"
        } else if score >= 0.8 {
            "FFA500"
        } else {
            "0078D4"
        };

        assert_eq!(theme_color, "FFA500", "Score of 85% should use orange color");
    }

    #[test]
    fn test_theme_color_for_low_score() {
        let mut notification = create_test_notification();
        notification.score.total = 0.75;
        let score = notification.score.total;

        let theme_color = if score >= 0.9 {
            "00FF00"
        } else if score >= 0.8 {
            "FFA500"
        } else {
            "0078D4"
        };

        assert_eq!(theme_color, "0078D4", "Score of 75% should use Microsoft blue color");
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
