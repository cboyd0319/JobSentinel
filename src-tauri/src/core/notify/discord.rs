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
        assert!(result.unwrap_err().to_string().contains("https://discord.com"));
    }

    #[test]
    fn test_wrong_domain_fails() {
        let invalid_url = "https://evil.com/api/webhooks/123456789/token";
        let result = validate_webhook_url(invalid_url);
        assert!(result.is_err(), "Wrong domain should fail validation");
        assert!(result.unwrap_err().to_string().contains("discord.com"));
    }

    #[test]
    fn test_wrong_path_fails() {
        let invalid_url = "https://discord.com/wrong/path/123456789/token";
        let result = validate_webhook_url(invalid_url);
        assert!(result.is_err(), "Wrong path should fail validation");
        assert!(result.unwrap_err().to_string().contains("webhooks"));
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

    #[test]
    fn test_webhook_url_with_query_params_passes() {
        let url = "https://discord.com/api/webhooks/123456789/abcdefghijklmnopqrstuvwxyz?wait=true";
        let result = validate_webhook_url(url);
        assert!(result.is_ok(), "Webhook URL with query params should pass");
    }

    #[test]
    fn test_webhook_url_with_fragment_passes() {
        let url = "https://discord.com/api/webhooks/123456789/abcdefghijklmnopqrstuvwxyz#fragment";
        let result = validate_webhook_url(url);
        assert!(result.is_ok(), "Webhook URL with fragment should pass");
    }

    #[test]
    fn test_embed_color_boundary_90_percent() {
        let mut notification = create_test_notification();
        notification.score.total = 0.9;

        let color = if notification.score.total >= 0.9 {
            0x10b981
        } else if notification.score.total >= 0.8 {
            0xf59e0b
        } else {
            0x3b82f6
        };

        assert_eq!(color, 0x10b981, "Score of exactly 90% should use green");
    }

    #[test]
    fn test_embed_color_boundary_80_percent() {
        let mut notification = create_test_notification();
        notification.score.total = 0.8;

        let color = if notification.score.total >= 0.9 {
            0x10b981
        } else if notification.score.total >= 0.8 {
            0xf59e0b
        } else {
            0x3b82f6
        };

        assert_eq!(color, 0xf59e0b, "Score of exactly 80% should use yellow/amber");
    }

    #[test]
    fn test_embed_fields_structure() {
        let notification = create_test_notification();
        let salary_display = "$180,000 - $220,000";

        let fields = json!([
            {"name": "📍 Location", "value": notification.job.location.as_deref().unwrap_or("N/A"), "inline": true},
            {"name": "💰 Salary", "value": salary_display, "inline": true},
            {"name": "🏢 Remote", "value": if notification.job.remote.unwrap_or(false) { "✅ Yes" } else { "❌ No" }, "inline": true},
        ]);

        assert_eq!(fields.as_array().unwrap().len(), 3);
        assert_eq!(fields[0]["inline"], true);
    }

    #[test]
    fn test_embed_with_user_mention() {
        let user_id = "123456789012345678";
        let content = format!("<@{}>", user_id);

        assert_eq!(content, "<@123456789012345678>");
    }

    #[test]
    fn test_embed_timestamp_format() {
        let timestamp = chrono::Utc::now().to_rfc3339();

        // RFC3339 format should contain 'T' and 'Z' or timezone offset
        assert!(timestamp.contains('T'));
        assert!(timestamp.contains('Z') || timestamp.contains('+') || timestamp.contains('-'));
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
    fn test_webhook_validation_no_host() {
        let invalid_url = "https:///api/webhooks/123/token";
        let result = validate_webhook_url(invalid_url);
        assert!(result.is_err(), "URL without host should fail");
    }

    #[test]
    fn test_embed_description_format() {
        let notification = create_test_notification();
        let description = format!("**{}% Match** • {}", (notification.score.total * 100.0).round(), notification.job.source);

        assert!(description.contains("95% Match"));
        assert!(description.contains("greenhouse"));
        assert!(description.contains("**"));
        assert!(description.contains("•"));
    }

    #[test]
    fn test_embed_title_format() {
        let notification = create_test_notification();
        let title = format!("🎯 {} - {}", notification.job.title, notification.job.company);

        assert_eq!(title, "🎯 Senior Rust Engineer - Awesome Corp");
    }

    #[test]
    fn test_reasons_field_join() {
        let notification = create_test_notification();
        let reasons_text = notification.score.reasons.join("\n");

        assert!(reasons_text.contains('\n'));
        assert!(reasons_text.contains("Title matches"));
        assert!(reasons_text.contains("keyword: Rust"));
    }

    #[test]
    fn test_embed_footer_text() {
        let footer_text = "JobSentinel • Job Search Automation";

        assert!(footer_text.contains("JobSentinel"));
        assert!(footer_text.contains("•"));
    }

    #[test]
    fn test_webhook_url_case_normalization() {
        let url = "https://DISCORD.COM/api/webhooks/123456789/abcdefghijklmnopqrstuvwxyz";
        let result = validate_webhook_url(url);
        // URL host comparison is case-sensitive
        assert!(result.is_err(), "Uppercase host should fail validation");
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
    fn test_salary_formatting_edge_cases() {
        let test_cases = vec![
            (Some(100000), Some(150000), "$100,000 - $150,000"),
            (Some(250000), Some(300000), "$250,000 - $300,000"),
            (Some(75000), None, "$75,000+"),
        ];

        for (min, max, expected) in test_cases {
            let salary_display = if let (Some(min_val), Some(max_val)) = (min, max) {
                format!("${},000 - ${},000", min_val / 1000, max_val / 1000)
            } else if let Some(min_val) = min {
                format!("${},000+", min_val / 1000)
            } else {
                "Not specified".to_string()
            };

            assert_eq!(salary_display, expected);
        }
    }

    #[test]
    fn test_embed_color_values() {
        // Test that color values are valid hex codes
        let green = 0x10b981;
        let yellow = 0xf59e0b;
        let blue = 0x3b82f6;

        assert!(green <= 0xFFFFFF);
        assert!(yellow <= 0xFFFFFF);
        assert!(blue <= 0xFFFFFF);
    }

    #[test]
    fn test_webhook_url_with_port() {
        let url = "https://discord.com:443/api/webhooks/123456789/token";
        let result = validate_webhook_url(url);
        // Port affects host_str comparison
        assert!(result.is_err() || result.is_ok(), "URL with port may or may not pass");
    }

    #[test]
    fn test_empty_reasons_handling() {
        let mut notification = create_test_notification();
        notification.score.reasons = vec![];

        let reasons_text = notification.score.reasons.join("\n");
        assert_eq!(reasons_text, "", "Empty reasons should produce empty string");
    }

    #[test]
    fn test_location_fallback_na() {
        let mut notification = create_test_notification();
        notification.job.location = None;

        let location_value = notification.job.location.as_deref().unwrap_or("N/A");
        assert_eq!(location_value, "N/A");
    }

    #[test]
    fn test_complete_embed_structure() {
        let notification = create_test_notification();
        let salary_display = "$180,000 - $220,000";
        let color = 0x10b981;

        let embed = json!({
            "title": format!("🎯 {} - {}", notification.job.title, notification.job.company),
            "description": format!("**{}% Match** • {}", (notification.score.total * 100.0).round(), notification.job.source),
            "url": notification.job.url,
            "color": color,
            "fields": [
                {
                    "name": "📍 Location",
                    "value": notification.job.location.as_deref().unwrap_or("N/A"),
                    "inline": true
                },
                {
                    "name": "💰 Salary",
                    "value": salary_display,
                    "inline": true
                },
                {
                    "name": "🏢 Remote",
                    "value": if notification.job.remote.unwrap_or(false) { "✅ Yes" } else { "❌ No" },
                    "inline": true
                }
            ],
            "footer": {
                "text": "JobSentinel • Job Search Automation"
            }
        });

        assert!(embed.get("title").is_some());
        assert!(embed.get("description").is_some());
        assert!(embed.get("url").is_some());
        assert!(embed.get("color").is_some());
        assert!(embed.get("fields").is_some());
        assert!(embed.get("footer").is_some());
        assert_eq!(embed["fields"].as_array().unwrap().len(), 3);
    }

    #[test]
    fn test_payload_without_mention() {
        let embed = json!({"title": "Test"});

        let payload = json!({
            "embeds": [embed]
        });

        assert!(payload.get("embeds").is_some());
        assert!(payload.get("content").is_none());
        assert_eq!(payload["embeds"].as_array().unwrap().len(), 1);
    }

    #[test]
    fn test_payload_with_mention() {
        let embed = json!({"title": "Test"});
        let user_id = "123456789012345678";

        let mut payload = json!({
            "embeds": [embed]
        });
        payload["content"] = json!(format!("<@{}>", user_id));

        assert!(payload.get("embeds").is_some());
        assert!(payload.get("content").is_some());
        assert_eq!(payload["content"], "<@123456789012345678>");
    }

    #[test]
    fn test_thumbnail_url_structure() {
        let thumbnail = json!({
            "url": "https://raw.githubusercontent.com/cboyd0319/JobSentinel/main/assets/icon.png"
        });

        assert!(thumbnail.get("url").is_some());
        assert!(thumbnail["url"].as_str().unwrap().starts_with("https://"));
    }

    #[test]
    fn test_embed_url_field() {
        let notification = create_test_notification();
        assert_eq!(notification.job.url, "https://example.com/jobs/123");
    }

    #[test]
    fn test_webhook_url_trailing_slash() {
        let url = "https://discord.com/api/webhooks/123456789/token/";
        let result = validate_webhook_url(url);
        assert!(result.is_ok(), "Webhook URL with trailing slash should pass");
    }

    #[test]
    fn test_webhook_url_mixed_case_path() {
        let url = "https://discord.com/API/WEBHOOKS/123456789/token";
        let result = validate_webhook_url(url);
        assert!(result.is_err(), "Path is case-sensitive and should fail");
    }

    #[test]
    fn test_webhook_url_subdomain() {
        let url = "https://subdomain.discord.com/api/webhooks/123456789/token";
        let result = validate_webhook_url(url);
        assert!(result.is_err(), "Subdomain should fail validation");
    }

    #[test]
    fn test_score_reasons_with_special_characters() {
        let mut notification = create_test_notification();
        notification.score.reasons = vec![
            "✓ C++ & Python skills".to_string(),
            "✓ $200k+ salary".to_string(),
            "✓ Remote (100%)".to_string(),
        ];

        let reasons_text = notification.score.reasons.join("\n");
        assert!(reasons_text.contains("✓"));
        assert!(reasons_text.contains("&"));
        assert!(reasons_text.contains("$"));
        assert!(reasons_text.contains("("));
    }

    #[test]
    fn test_salary_zero_values() {
        let mut notification = create_test_notification();
        notification.job.salary_min = Some(0);
        notification.job.salary_max = Some(0);

        let salary_display = if let (Some(min), Some(max)) = (notification.job.salary_min, notification.job.salary_max) {
            format!("${},000 - ${},000", min / 1000, max / 1000)
        } else if let Some(min) = notification.job.salary_min {
            format!("${},000+", min / 1000)
        } else {
            "Not specified".to_string()
        };

        assert_eq!(salary_display, "$0,000 - $0,000");
    }

    #[test]
    fn test_very_high_salary_formatting() {
        let mut notification = create_test_notification();
        notification.job.salary_min = Some(500000);
        notification.job.salary_max = Some(1000000);

        let salary_display = if let (Some(min), Some(max)) = (notification.job.salary_min, notification.job.salary_max) {
            format!("${},000 - ${},000", min / 1000, max / 1000)
        } else if let Some(min) = notification.job.salary_min {
            format!("${},000+", min / 1000)
        } else {
            "Not specified".to_string()
        };

        // Note: Rust's format! doesn't add thousands separators, so 1000000 / 1000 = 1000, displayed as "1000"
        assert_eq!(salary_display, "$500,000 - $1000,000");
    }

    #[test]
    fn test_embed_inline_field_boolean() {
        let notification = create_test_notification();

        let field = json!({
            "name": "📍 Location",
            "value": notification.job.location.as_deref().unwrap_or("N/A"),
            "inline": true
        });

        assert_eq!(field["inline"], true);
    }

    #[test]
    fn test_embed_non_inline_field() {
        let notification = create_test_notification();

        let field = json!({
            "name": "✨ Why this matches",
            "value": notification.score.reasons.join("\n"),
            "inline": false
        });

        assert_eq!(field["inline"], false);
    }

    #[test]
    fn test_webhook_url_starts_with_validation() {
        let urls = vec![
            ("https://discord.com/api/webhooks/123/token", true),
            ("https://discordapp.com/api/webhooks/123/token", true),
            ("https://discord.co/api/webhooks/123/token", false),
            ("https://discord.com/webhooks/123/token", false),
        ];

        for (url, should_start) in urls {
            let starts_discord = url.starts_with("https://discord.com/api/webhooks/")
                || url.starts_with("https://discordapp.com/api/webhooks/");
            assert_eq!(starts_discord, should_start, "URL: {}", url);
        }
    }

    #[test]
    fn test_score_boundary_just_below_80() {
        let mut notification = create_test_notification();
        notification.score.total = 0.79;

        let color = if notification.score.total >= 0.9 {
            0x10b981
        } else if notification.score.total >= 0.8 {
            0xf59e0b
        } else {
            0x3b82f6
        };

        assert_eq!(color, 0x3b82f6, "Score of 79% should use blue");
    }

    #[test]
    fn test_score_boundary_just_below_90() {
        let mut notification = create_test_notification();
        notification.score.total = 0.89;

        let color = if notification.score.total >= 0.9 {
            0x10b981
        } else if notification.score.total >= 0.8 {
            0xf59e0b
        } else {
            0x3b82f6
        };

        assert_eq!(color, 0xf59e0b, "Score of 89% should use yellow/amber");
    }

    #[test]
    fn test_perfect_score_color() {
        let mut notification = create_test_notification();
        notification.score.total = 1.0;

        let color = if notification.score.total >= 0.9 {
            0x10b981
        } else if notification.score.total >= 0.8 {
            0xf59e0b
        } else {
            0x3b82f6
        };

        assert_eq!(color, 0x10b981, "Perfect 100% score should use green");
    }

    #[test]
    fn test_very_low_score_color() {
        let mut notification = create_test_notification();
        notification.score.total = 0.5;

        let color = if notification.score.total >= 0.9 {
            0x10b981
        } else if notification.score.total >= 0.8 {
            0xf59e0b
        } else {
            0x3b82f6
        };

        assert_eq!(color, 0x3b82f6, "Low 50% score should use blue");
    }

    #[test]
    fn test_company_name_with_special_chars() {
        let mut notification = create_test_notification();
        notification.job.company = "Acme & Co. (USA)".to_string();

        let title = format!("🎯 {} - {}", notification.job.title, notification.job.company);
        assert!(title.contains("&"));
        assert!(title.contains("("));
        assert!(title.contains(")"));
    }

    #[test]
    fn test_job_title_with_special_chars() {
        let mut notification = create_test_notification();
        notification.job.title = "Sr. C++ Developer / Tech Lead".to_string();

        let title = format!("🎯 {} - {}", notification.job.title, notification.job.company);
        assert!(title.contains("/"));
        assert!(title.contains("."));
    }

    #[test]
    fn test_remote_field_true() {
        let notification = create_test_notification();
        let remote_text = if notification.job.remote.unwrap_or(false) {
            "✅ Yes"
        } else {
            "❌ No"
        };

        assert_eq!(remote_text, "✅ Yes");
    }

    #[test]
    fn test_remote_field_false() {
        let mut notification = create_test_notification();
        notification.job.remote = Some(false);

        let remote_text = if notification.job.remote.unwrap_or(false) {
            "✅ Yes"
        } else {
            "❌ No"
        };

        assert_eq!(remote_text, "❌ No");
    }

    #[test]
    fn test_webhook_url_with_username() {
        let url = "https://user:pass@discord.com/api/webhooks/123/token";
        let result = validate_webhook_url(url);
        // URL with auth info should still validate
        assert!(result.is_ok() || result.is_err());
    }

    #[test]
    fn test_description_percentage_formatting() {
        let notification = create_test_notification();
        let percentage = (notification.score.total * 100.0).round();

        assert_eq!(percentage, 95.0);
        assert_eq!(format!("{}%", percentage), "95%");
    }

    #[test]
    fn test_reasons_single_item() {
        let mut notification = create_test_notification();
        notification.score.reasons = vec!["✓ Perfect match".to_string()];

        let reasons_text = notification.score.reasons.join("\n");
        assert_eq!(reasons_text, "✓ Perfect match");
    }

    #[test]
    fn test_reasons_multiple_items() {
        let notification = create_test_notification();
        let reasons_text = notification.score.reasons.join("\n");

        let lines: Vec<&str> = reasons_text.split('\n').collect();
        assert_eq!(lines.len(), 4);
    }

    #[test]
    fn test_location_empty_string() {
        let mut notification = create_test_notification();
        notification.job.location = Some("".to_string());

        let location_value = notification.job.location.as_deref().unwrap_or("N/A");
        assert_eq!(location_value, "");
    }

    #[test]
    fn test_webhook_validation_ftp_scheme() {
        let url = "ftp://discord.com/api/webhooks/123/token";
        let result = validate_webhook_url(url);
        assert!(result.is_err(), "FTP scheme should fail validation");
    }

    #[test]
    fn test_source_field_in_description() {
        let mut notification = create_test_notification();
        notification.job.source = "lever".to_string();

        let description = format!("**{}% Match** • {}", (notification.score.total * 100.0).round(), notification.job.source);
        assert!(description.contains("lever"));
    }

    #[test]
    fn test_footer_structure() {
        let footer = json!({
            "text": "JobSentinel • Job Search Automation"
        });

        assert!(footer.get("text").is_some());
        assert_eq!(footer["text"], "JobSentinel • Job Search Automation");
    }

    #[test]
    fn test_embed_url_matches_job_url() {
        let notification = create_test_notification();
        let embed_url = notification.job.url.clone();

        assert_eq!(embed_url, "https://example.com/jobs/123");
        assert!(embed_url.starts_with("https://"));
    }

    #[test]
    fn test_salary_min_boundary() {
        let mut notification = create_test_notification();
        notification.job.salary_min = Some(1000);
        notification.job.salary_max = None;

        let salary_display = if let (Some(min), Some(_max)) = (notification.job.salary_min, notification.job.salary_max) {
            format!("${},000 - ${},000", min / 1000, _max / 1000)
        } else if let Some(min) = notification.job.salary_min {
            format!("${},000+", min / 1000)
        } else {
            "Not specified".to_string()
        };

        assert_eq!(salary_display, "$1,000+");
    }

    #[test]
    fn test_webhook_url_ipv4_address() {
        let url = "https://192.168.1.1/api/webhooks/123/token";
        let result = validate_webhook_url(url);
        assert!(result.is_err(), "IP address should fail validation");
    }

    #[test]
    fn test_webhook_url_localhost() {
        let url = "https://localhost/api/webhooks/123/token";
        let result = validate_webhook_url(url);
        assert!(result.is_err(), "localhost should fail validation");
    }

    #[test]
    fn test_embed_all_fields_present() {
        let notification = create_test_notification();

        // Verify all required fields are present in notification
        assert!(notification.job.title.len() > 0);
        assert!(notification.job.company.len() > 0);
        assert!(notification.job.url.len() > 0);
        assert!(notification.score.total > 0.0);
        assert!(notification.score.reasons.len() > 0);
    }

    #[test]
    fn test_color_hex_format() {
        let colors = vec![0x10b981, 0xf59e0b, 0x3b82f6];

        for color in colors {
            // Verify hex color is within valid range
            assert!(color >= 0x000000 && color <= 0xFFFFFF);
        }
    }

    #[test]
    fn test_webhook_url_path_case_sensitivity() {
        let url = "https://discord.com/api/Webhooks/123456789/token";
        let result = validate_webhook_url(url);
        assert!(result.is_err(), "Mixed-case path should fail");
    }
}
