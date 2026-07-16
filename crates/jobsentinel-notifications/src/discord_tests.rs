use super::*;
use chrono::Utc;
use jobsentinel_domain::Job;
use jobsentinel_intelligence::{JobScore, ScoreBreakdown};

#[path = "discord_tests/display_tests.rs"]
mod display_tests;
#[path = "discord_tests/payload_tests.rs"]
mod payload_tests;
#[path = "discord_tests/webhook_url_tests.rs"]
mod webhook_url_tests;

fn create_test_notification() -> Notification {
    Notification {
        job: Job {
            id: 1,
            hash: "test123".to_string(),
            title: "Care Coordinator".to_string(),
            company: "Community Care Network".to_string(),
            url: "https://example.com/jobs/123".to_string(),
            location: Some("Remote".to_string()),
            description: Some("Support patients and families with care planning".to_string()),
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
            ghost_score: None,
            ghost_reasons: None,
            first_seen: None,
            repost_count: 0,
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
                "Title matches: Care Coordinator".to_string(),
                "Keyword match: case management".to_string(),
                "Salary 120% of target (100% credit)".to_string(),
                "Remote job (matches preference)".to_string(),
            ],
        },
    }
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
    let description = format!(
        "**{}% Match** • {}",
        (notification.score.total * 100.0).round(),
        notification.job.source
    );

    assert!(description.contains("95% Match"));
    assert!(description.contains("greenhouse"));
    assert!(description.contains("**"));
    assert!(description.contains("•"));
}

#[test]
fn test_embed_title_format() {
    let notification = create_test_notification();
    let title = format!(
        "🎯 {} - {}",
        notification.job.title, notification.job.company
    );

    assert_eq!(title, "🎯 Care Coordinator - Community Care Network");
}

#[test]
fn test_reasons_field_join() {
    let notification = create_test_notification();
    let reasons_text = notification.score.reasons.join("\n");

    assert!(reasons_text.contains('\n'));
    assert!(reasons_text.contains("Title matches"));
    assert!(reasons_text.contains("Keyword match: case management"));
}

#[test]
fn test_embed_footer_text() {
    let footer_text = "JobSentinel • Job Search Assistant";

    assert!(footer_text.contains("JobSentinel"));
    assert!(footer_text.contains("•"));
}

#[test]
fn test_webhook_url_case_normalization() {
    let url = "https://DISCORD.COM/api/webhooks/123456789/abcdefghijklmnopqrstuvwxyz";
    let result = validate_webhook_url(url);
    // URL host is normalized to lowercase by the url crate (per RFC 3986)
    // So uppercase hostnames actually pass validation
    assert!(
        result.is_ok(),
        "Uppercase host is normalized to lowercase and should pass validation"
    );
}

#[test]
fn test_score_percentage_rounding() {
    let test_cases = vec![(0.954, 95.0), (0.956, 96.0), (0.875, 88.0), (0.999, 100.0)];

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
    assert!(result.is_ok(), "Explicit default HTTPS port should pass");
}

#[test]
fn test_webhook_url_with_non_default_port_fails() {
    let url = "https://discord.com:8080/api/webhooks/123456789/token";
    let result = validate_webhook_url(url);
    assert!(result.is_err(), "Non-default port should fail validation");
}

#[test]
fn test_empty_reasons_handling() {
    let mut notification = create_test_notification();
    notification.score.reasons = vec![];

    let reasons_text = notification.score.reasons.join("\n");
    assert_eq!(
        reasons_text, "",
        "Empty reasons should produce empty string"
    );
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
            "text": "JobSentinel • Job Search Assistant"
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
fn test_discord_payload_minimizes_job_url() {
    let mut notification = create_test_notification();
    notification.job.url =
        "https://example.com/jobs?utm_source=alert&gh_jid=123&token=secret&candidate_email=person@example.com#private"
            .to_string();
    let config = DiscordConfig {
        enabled: true,
        webhook_url: "https://discord.com/api/webhooks/123/token".to_string(),
        user_id_to_mention: None,
    };

    let payload = build_discord_payload(&config, &notification);
    let url = payload["embeds"][0]["url"].as_str().unwrap();

    assert_eq!(url, "https://example.com/jobs?gh_jid=123");
    assert!(!url.contains("utm_source"));
    assert!(!url.contains("token"));
    assert!(!url.contains("candidate_email"));
    assert!(!url.contains("person@example.com"));
    assert!(!url.contains("private"));
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
fn test_embed_url_field() {
    let notification = create_test_notification();
    assert_eq!(notification.job.url, "https://example.com/jobs/123");
}

#[test]
fn test_webhook_url_trailing_slash() {
    let url = "https://discord.com/api/webhooks/123456789/token/";
    let result = validate_webhook_url(url);
    assert!(
        result.is_ok(),
        "Webhook URL with trailing slash should pass"
    );
}

#[test]
fn test_webhook_url_mixed_case_path() {
    let url = "https://discord.com/API/WEBHOOKS/123456789/token";
    let result = validate_webhook_url(url);
    assert!(result.is_err(), "Path is case-sensitive and should fail");
}

#[path = "discord_tests/formatting_and_boundary_tests.rs"]
mod formatting_and_boundary_tests;
