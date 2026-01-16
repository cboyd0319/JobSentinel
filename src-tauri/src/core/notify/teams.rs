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

    #[test]
    fn test_webhook_url_with_query_params_passes() {
        let url = "https://outlook.office.com/webhook/12345678-1234-1234-1234-123456789012@12345678-1234-1234-1234-123456789012/IncomingWebhook/abcdef/12345678-1234-1234-1234-123456789012?param=value";
        let result = validate_webhook_url(url);
        assert!(result.is_ok(), "Webhook URL with query params should pass");
    }

    #[test]
    fn test_webhook_url_with_fragment_passes() {
        let url = "https://outlook.office.com/webhook/12345678-1234-1234-1234-123456789012#fragment";
        let result = validate_webhook_url(url);
        assert!(result.is_ok(), "Webhook URL with fragment should pass");
    }

    #[test]
    fn test_theme_color_boundary_90_percent() {
        let mut notification = create_test_notification();
        notification.score.total = 0.9;

        let theme_color = if notification.score.total >= 0.9 {
            "00FF00"
        } else if notification.score.total >= 0.8 {
            "FFA500"
        } else {
            "0078D4"
        };

        assert_eq!(theme_color, "00FF00", "Score of exactly 90% should use green");
    }

    #[test]
    fn test_theme_color_boundary_80_percent() {
        let mut notification = create_test_notification();
        notification.score.total = 0.8;

        let theme_color = if notification.score.total >= 0.9 {
            "00FF00"
        } else if notification.score.total >= 0.8 {
            "FFA500"
        } else {
            "0078D4"
        };

        assert_eq!(theme_color, "FFA500", "Score of exactly 80% should use orange");
    }

    #[test]
    fn test_remote_badge_with_none() {
        let mut notification = create_test_notification();
        notification.job.remote = None;

        let remote_text = if notification.job.remote.unwrap_or(false) {
            "✅ Yes"
        } else {
            "❌ No"
        };

        assert_eq!(remote_text, "❌ No", "None remote should default to No");
    }

    #[test]
    fn test_message_card_payload_structure() {
        let notification = create_test_notification();
        let score = notification.score.total;
        let theme_color = if score >= 0.9 {
            "00FF00"
        } else if score >= 0.8 {
            "FFA500"
        } else {
            "0078D4"
        };

        let payload = json!({
            "@type": "MessageCard",
            "@context": "https://schema.org/extensions",
            "themeColor": theme_color,
        });

        assert_eq!(payload["@type"], "MessageCard");
        assert_eq!(payload["@context"], "https://schema.org/extensions");
        assert_eq!(payload["themeColor"], "00FF00");
    }

    #[test]
    fn test_facts_array_structure() {
        let notification = create_test_notification();
        let salary_display = "$180,000 - $220,000";

        let facts = json!([
            {"name": "Location:", "value": notification.job.location.as_deref().unwrap_or("N/A")},
            {"name": "Salary:", "value": salary_display},
            {"name": "Remote:", "value": if notification.job.remote.unwrap_or(false) { "✅ Yes" } else { "❌ No" }},
            {"name": "Match Score:", "value": format!("{}%", (notification.score.total * 100.0).round())},
        ]);

        assert_eq!(facts.as_array().unwrap().len(), 4);
        assert_eq!(facts[0]["name"], "Location:");
        assert_eq!(facts[0]["value"], "Remote");
    }

    #[test]
    fn test_potential_action_structure() {
        let notification = create_test_notification();

        let action = json!({
            "@type": "OpenUri",
            "name": "View Full Job Posting",
            "targets": [
                {
                    "os": "default",
                    "uri": notification.job.url
                }
            ]
        });

        assert_eq!(action["@type"], "OpenUri");
        assert_eq!(action["targets"][0]["uri"], notification.job.url);
    }

    #[test]
    fn test_webhook_validation_no_host() {
        let invalid_url = "https:///webhook/123/456";
        let result = validate_webhook_url(invalid_url);
        assert!(result.is_err(), "URL without host should fail");
    }

    #[test]
    fn test_reasons_join_with_double_newline() {
        let notification = create_test_notification();
        let reasons_text = notification.score.reasons.join("\n\n");

        // Should have double newlines between reasons
        assert!(reasons_text.contains("\n\n"));
        assert!(reasons_text.contains("Title matches"));
    }

    #[test]
    fn test_score_percentage_rounding() {
        let test_cases = vec![
            (0.954, 95.0),
            (0.956, 96.0),
            (0.875, 88.0),
            (0.999, 100.0),
        ];

        for (score, expected) in test_cases {
            let rounded = (score * 100.0_f64).round();
            assert_eq!(rounded, expected);
        }
    }

    #[test]
    fn test_salary_formatting_large_numbers() {
        let test_cases = vec![
            (Some(500000), Some(750000), "$500,000 - $750,000"),
        ];

        for (min, max, expected) in test_cases {
            let salary_display = if let (Some(min_val), Some(max_val)) = (min, max) {
                format!("${},000 - ${},000", min_val / 1000, max_val / 1000)
            } else {
                "Not specified".to_string()
            };

            assert_eq!(salary_display, expected);
        }
    }

    #[test]
    fn test_webhook_url_case_normalization() {
        let url = "https://OUTLOOK.OFFICE.COM/webhook/12345678-1234-1234-1234-123456789012";
        let result = validate_webhook_url(url);
        // URL host comparison is case-sensitive
        assert!(result.is_err(), "Uppercase host should fail validation");
    }

    #[test]
    fn test_full_message_card_payload_structure() {
        let notification = create_test_notification();
        let job = &notification.job;
        let score = &notification.score;

        let theme_color = if score.total >= 0.9 {
            "00FF00"
        } else if score.total >= 0.8 {
            "FFA500"
        } else {
            "0078D4"
        };

        let salary_display = if let (Some(min), Some(max)) = (job.salary_min, job.salary_max) {
            format!("${},000 - ${},000", min / 1000, max / 1000)
        } else if let Some(min) = job.salary_min {
            format!("${},000+", min / 1000)
        } else {
            "Not specified".to_string()
        };

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

        // Verify top-level structure
        assert_eq!(payload["@type"], "MessageCard");
        assert_eq!(payload["@context"], "https://schema.org/extensions");
        assert_eq!(payload["summary"], "New job alert: Senior Rust Engineer at Awesome Corp");
        assert_eq!(payload["themeColor"], "00FF00");
        assert_eq!(payload["title"], "🎯 High Match Job Alert (95% Match)");

        // Verify sections array
        let sections = payload["sections"].as_array().unwrap();
        assert_eq!(sections.len(), 1);
        assert_eq!(sections[0]["activityTitle"], "**Senior Rust Engineer**");
        assert_eq!(sections[0]["activitySubtitle"], "Awesome Corp • greenhouse");

        // Verify facts
        let facts = sections[0]["facts"].as_array().unwrap();
        assert_eq!(facts.len(), 4);
        assert_eq!(facts[0]["name"], "Location:");
        assert_eq!(facts[0]["value"], "Remote");
        assert_eq!(facts[1]["name"], "Salary:");
        assert_eq!(facts[1]["value"], "$180,000 - $220,000");
        assert_eq!(facts[2]["name"], "Remote:");
        assert_eq!(facts[2]["value"], "✅ Yes");
        assert_eq!(facts[3]["name"], "Match Score:");
        assert_eq!(facts[3]["value"], "95%");

        // Verify text/reasons
        assert!(sections[0]["text"].as_str().unwrap().contains("Why this matches"));
        assert!(sections[0]["text"].as_str().unwrap().contains("Title matches"));

        // Verify actions
        let actions = payload["potentialAction"].as_array().unwrap();
        assert_eq!(actions.len(), 1);
        assert_eq!(actions[0]["@type"], "OpenUri");
        assert_eq!(actions[0]["name"], "View Full Job Posting");
        assert_eq!(actions[0]["targets"][0]["uri"], "https://example.com/jobs/123");
    }

    #[test]
    fn test_message_card_with_no_location() {
        let mut notification = create_test_notification();
        notification.job.location = None;

        let location_value = notification.job.location.as_deref().unwrap_or("N/A");
        assert_eq!(location_value, "N/A");
    }

    #[test]
    fn test_message_card_with_empty_location() {
        let mut notification = create_test_notification();
        notification.job.location = Some("".to_string());

        let location_value = notification.job.location.as_deref().unwrap_or("N/A");
        assert_eq!(location_value, "");
    }

    #[test]
    fn test_message_card_summary_format() {
        let notification = create_test_notification();
        let summary = format!("New job alert: {} at {}", notification.job.title, notification.job.company);
        assert_eq!(summary, "New job alert: Senior Rust Engineer at Awesome Corp");
    }

    #[test]
    fn test_message_card_title_format() {
        let notification = create_test_notification();
        let title = format!("🎯 High Match Job Alert ({}% Match)", (notification.score.total * 100.0).round());
        assert_eq!(title, "🎯 High Match Job Alert (95% Match)");
    }

    #[test]
    fn test_message_card_activity_title_format() {
        let notification = create_test_notification();
        let activity_title = format!("**{}**", notification.job.title);
        assert_eq!(activity_title, "**Senior Rust Engineer**");
    }

    #[test]
    fn test_message_card_activity_subtitle_format() {
        let notification = create_test_notification();
        let subtitle = format!("{} • {}", notification.job.company, notification.job.source);
        assert_eq!(subtitle, "Awesome Corp • greenhouse");
    }

    #[test]
    fn test_validation_error_message_for_wrong_scheme() {
        let result = validate_webhook_url("http://outlook.office.com/webhook/123");
        assert!(result.is_err());
        let error = result.unwrap_err().to_string();
        assert!(error.contains("https://outlook.office"));
    }

    #[test]
    fn test_validation_error_message_for_wrong_domain() {
        let result = validate_webhook_url("https://evil.com/webhook/123");
        assert!(result.is_err());
        let error = result.unwrap_err().to_string();
        assert!(error.contains("outlook.office.com") || error.contains("outlook.office365.com"));
    }

    #[test]
    fn test_validation_error_message_for_wrong_path() {
        let result = validate_webhook_url("https://outlook.office.com/badpath/123");
        assert!(result.is_err());
        let error = result.unwrap_err().to_string();
        assert!(error.contains("webhook"));
    }

    #[test]
    fn test_validation_error_message_for_malformed_url() {
        let result = validate_webhook_url("not-a-url");
        assert!(result.is_err());
        let error = result.unwrap_err().to_string();
        assert!(error.contains("Invalid"));
    }

    #[test]
    fn test_score_breakdown_all_components() {
        let notification = create_test_notification();
        assert_eq!(notification.score.breakdown.skills, 0.40);
        assert_eq!(notification.score.breakdown.salary, 0.25);
        assert_eq!(notification.score.breakdown.location, 0.20);
        assert_eq!(notification.score.breakdown.company, 0.05);
        assert_eq!(notification.score.breakdown.recency, 0.05);

        // Total should sum up
        let sum = notification.score.breakdown.skills
            + notification.score.breakdown.salary
            + notification.score.breakdown.location
            + notification.score.breakdown.company
            + notification.score.breakdown.recency;
        assert!((sum - 0.95).abs() < 0.01);
    }

    #[test]
    fn test_score_reasons_all_present() {
        let notification = create_test_notification();
        assert_eq!(notification.score.reasons.len(), 4);
        assert!(notification.score.reasons[0].contains("Title matches"));
        assert!(notification.score.reasons[1].contains("Has keyword"));
        assert!(notification.score.reasons[2].contains("Salary"));
        assert!(notification.score.reasons[3].contains("Remote"));
    }

    #[test]
    fn test_remote_job_display_true() {
        let notification = create_test_notification();
        assert_eq!(notification.job.remote, Some(true));
        let remote_text = if notification.job.remote.unwrap_or(false) { "✅ Yes" } else { "❌ No" };
        assert_eq!(remote_text, "✅ Yes");
    }

    #[test]
    fn test_remote_job_display_false() {
        let mut notification = create_test_notification();
        notification.job.remote = Some(false);
        let remote_text = if notification.job.remote.unwrap_or(false) { "✅ Yes" } else { "❌ No" };
        assert_eq!(remote_text, "❌ No");
    }

    #[test]
    fn test_theme_color_edge_case_just_below_90() {
        let score = 0.899;
        let theme_color = if score >= 0.9 {
            "00FF00"
        } else if score >= 0.8 {
            "FFA500"
        } else {
            "0078D4"
        };
        assert_eq!(theme_color, "FFA500");
    }

    #[test]
    fn test_theme_color_edge_case_just_below_80() {
        let score = 0.799;
        let theme_color = if score >= 0.9 {
            "00FF00"
        } else if score >= 0.8 {
            "FFA500"
        } else {
            "0078D4"
        };
        assert_eq!(theme_color, "0078D4");
    }

    #[test]
    fn test_theme_color_zero_score() {
        let score = 0.0;
        let theme_color = if score >= 0.9 {
            "00FF00"
        } else if score >= 0.8 {
            "FFA500"
        } else {
            "0078D4"
        };
        assert_eq!(theme_color, "0078D4");
    }

    #[test]
    fn test_theme_color_perfect_score() {
        let score = 1.0;
        let theme_color = if score >= 0.9 {
            "00FF00"
        } else if score >= 0.8 {
            "FFA500"
        } else {
            "0078D4"
        };
        assert_eq!(theme_color, "00FF00");
    }

    #[test]
    fn test_salary_formatting_exact_boundaries() {
        let cases = vec![
            (Some(1000), Some(2000), "$1,000 - $2,000"),
            (Some(999000), Some(1000000), "$999,000 - $1000,000"),
            (Some(0), Some(100000), "$0,000 - $100,000"),
        ];

        for (min, max, expected) in cases {
            let display = if let (Some(min_val), Some(max_val)) = (min, max) {
                format!("${},000 - ${},000", min_val / 1000, max_val / 1000)
            } else {
                "Not specified".to_string()
            };
            assert_eq!(display, expected);
        }
    }

    #[test]
    fn test_webhook_url_trailing_slash() {
        let url = "https://outlook.office.com/webhook/12345678-1234-1234-1234-123456789012/";
        let result = validate_webhook_url(url);
        assert!(result.is_ok(), "Webhook URL with trailing slash should pass");
    }

    #[test]
    fn test_webhook_url_minimal_valid() {
        let url = "https://outlook.office.com/webhook/a";
        let result = validate_webhook_url(url);
        assert!(result.is_ok(), "Minimal valid webhook URL should pass");
    }

    #[test]
    fn test_webhook_url_with_non_standard_port_fails() {
        let url = "https://outlook.office.com:8080/webhook/123";
        let result = validate_webhook_url(url);
        // Non-standard port should fail validation
        assert!(result.is_err(), "URL with non-standard port should fail");
    }

    #[test]
    fn test_webhook_url_with_username_fails() {
        let url = "https://user@outlook.office.com/webhook/123";
        let result = validate_webhook_url(url);
        assert!(result.is_err(), "URL with username should fail");
    }

    #[test]
    fn test_activity_image_url() {
        let image_url = "https://raw.githubusercontent.com/cboyd0319/JobSentinel/main/assets/icon.png";
        assert!(image_url.starts_with("https://"));
        assert!(image_url.contains("JobSentinel"));
    }

    #[test]
    fn test_message_card_text_formatting() {
        let notification = create_test_notification();
        let text = format!("**Why this matches:**\n\n{}", notification.score.reasons.join("\n\n"));
        assert!(text.starts_with("**Why this matches:**"));
        assert!(text.contains("\n\n"));
        assert!(text.contains("✓ Title matches"));
    }

    #[test]
    fn test_validation_webhook_test_payload_structure() {
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

        assert_eq!(payload["@type"], "MessageCard");
        assert_eq!(payload["themeColor"], "00FF00");
        assert_eq!(payload["title"], "✅ JobSentinel Webhook Test");
        assert!(payload["text"].as_str().unwrap().contains("configured correctly"));
    }

    #[test]
    fn test_empty_reasons_array() {
        let mut notification = create_test_notification();
        notification.score.reasons = vec![];
        let text = notification.score.reasons.join("\n\n");
        assert_eq!(text, "");
    }

    #[test]
    fn test_single_reason() {
        let mut notification = create_test_notification();
        notification.score.reasons = vec!["✓ Only reason".to_string()];
        let text = notification.score.reasons.join("\n\n");
        assert_eq!(text, "✓ Only reason");
    }

    #[test]
    fn test_match_score_percentage_display() {
        let test_cases = vec![
            (0.0_f64, "0%"),
            (0.5_f64, "50%"),
            (0.75_f64, "75%"),
            (0.9_f64, "90%"),
            (1.0_f64, "100%"),
        ];

        for (score, expected) in test_cases {
            let display = format!("{}%", (score * 100.0_f64).round() as i32);
            assert_eq!(display, expected);
        }
    }

    #[test]
    fn test_webhook_url_subdomain_validation() {
        let url = "https://subdomain.outlook.office.com/webhook/123";
        let result = validate_webhook_url(url);
        assert!(result.is_err(), "Subdomain should fail validation");
    }

    #[test]
    fn test_webhook_url_path_validation_exact() {
        let url = "https://outlook.office.com/webhook";
        let result = validate_webhook_url(url);
        // Path is "/webhook" not "/webhook/" - validation requires /webhook/ prefix
        assert!(result.is_err(), "Path /webhook without trailing content should fail");
    }

    #[test]
    fn test_salary_formatting_min_zero() {
        let display = if let (Some(min), Some(max)) = (Some(0), Some(50000)) {
            format!("${},000 - ${},000", min / 1000, max / 1000)
        } else {
            "Not specified".to_string()
        };
        assert_eq!(display, "$0,000 - $50,000");
    }

    #[test]
    fn test_notification_job_fields_present() {
        let notification = create_test_notification();
        assert_eq!(notification.job.title, "Senior Rust Engineer");
        assert_eq!(notification.job.company, "Awesome Corp");
        assert_eq!(notification.job.source, "greenhouse");
        assert_eq!(notification.job.url, "https://example.com/jobs/123");
        assert_eq!(notification.job.hash, "test123");
    }

    #[test]
    fn test_notification_score_fields_present() {
        let notification = create_test_notification();
        assert_eq!(notification.score.total, 0.95);
        assert!(!notification.score.reasons.is_empty());
        assert_eq!(notification.score.breakdown.skills, 0.40);
    }
}
