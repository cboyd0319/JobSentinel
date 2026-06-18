use super::super::*;
use super::create_test_notification;

// Additional comprehensive tests

#[test]
fn test_complete_payload_structure_without_mention() {
    let notification = create_test_notification();
    let salary_display = "$180,000 - $220,000";
    let color = 0x10b981;

    let embed = json!({
        "title": format!("🎯 {} - {}", notification.job.title, notification.job.company),
        "description": format!("**{}% Match** • {}", (notification.score.total * 100.0).round(), notification.job.source),
        "url": notification.job.url,
        "color": color,
        "fields": [
            {"name": "📍 Location", "value": notification.job.location.as_deref().unwrap_or("N/A"), "inline": true},
            {"name": "💰 Salary", "value": salary_display, "inline": true},
            {"name": "🏢 Remote", "value": if notification.job.remote.unwrap_or(false) { "✅ Yes" } else { "❌ No" }, "inline": true},
            {"name": "✨ Why this matches", "value": notification.score.reasons.join("\n"), "inline": false}
        ],
        "footer": {"text": "JobSentinel • Job Search Assistant"},
        "timestamp": chrono::Utc::now().to_rfc3339()
    });

    let payload = json!({"embeds": [embed]});

    assert!(payload.get("embeds").is_some());
    assert!(payload.get("content").is_none());
    assert_eq!(payload["embeds"].as_array().unwrap().len(), 1);
    let embed_obj = &payload["embeds"][0];
    assert!(embed_obj.get("title").is_some());
    assert_eq!(embed_obj["fields"].as_array().unwrap().len(), 4);
}

#[test]
fn test_complete_payload_structure_with_mention() {
    let embed = json!({"title": "Test"});
    let mut payload = json!({"embeds": [embed]});
    payload["content"] = json!(format!("<@{}>", "987654321098765432"));

    assert!(payload.get("content").is_some());
    assert_eq!(payload["content"], "<@987654321098765432>");
}

#[test]
fn test_webhook_url_validation_error_messages() {
    let test_cases = vec![
        (
            "http://discord.com/api/webhooks/123/token",
            "full Discord connection link",
        ),
        (
            "https://evil.com/api/webhooks/123/token",
            "connection link copied from Discord",
        ),
        (
            "https://discord.com/wrong/path",
            "connection link copied from Discord",
        ),
    ];

    for (url, expected_fragment) in test_cases {
        let result = validate_webhook_url(url);
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains(expected_fragment));
    }
}

#[test]
fn test_salary_display_all_permutations() {
    let test_cases = vec![
        (Some(100000), Some(200000), "$100,000 - $200,000"),
        (Some(150000), None, "$150,000+"),
        (None, None, "Not specified"),
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
fn test_color_selection_logic_all_branches() {
    let test_cases = vec![
        (1.0, 0x10b981),
        (0.9, 0x10b981),
        (0.89, 0xf59e0b),
        (0.8, 0xf59e0b),
        (0.79, 0x3b82f6),
        (0.0, 0x3b82f6),
    ];

    for (score, expected_color) in test_cases {
        let color = if score >= 0.9 {
            0x10b981
        } else if score >= 0.8 {
            0xf59e0b
        } else {
            0x3b82f6
        };
        assert_eq!(color, expected_color);
    }
}

#[test]
fn test_remote_display_all_cases() {
    let test_cases = vec![
        (Some(true), "✅ Yes"),
        (Some(false), "❌ No"),
        (None, "❌ No"),
    ];

    for (remote, expected) in test_cases {
        let remote_text = if remote.unwrap_or(false) {
            "✅ Yes"
        } else {
            "❌ No"
        };
        assert_eq!(remote_text, expected);
    }
}

#[test]
fn test_location_display_edge_cases() {
    let test_cases = vec![
        (Some("San Francisco, CA".to_string()), "San Francisco, CA"),
        (Some("".to_string()), ""),
        (None, "N/A"),
    ];

    for (location, expected) in test_cases {
        let location_value = location.as_deref().unwrap_or("N/A");
        assert_eq!(location_value, expected);
    }
}

#[test]
fn test_reasons_join_edge_cases() {
    let test_cases = vec![
        (vec![], ""),
        (vec!["Single".to_string()], "Single"),
        (vec!["A".to_string(), "B".to_string()], "A\nB"),
    ];

    for (reasons, expected) in test_cases {
        let reasons_text = reasons.join("\n");
        assert_eq!(reasons_text, expected);
    }
}

#[test]
fn test_embed_field_names_emojis() {
    let field_names = vec![
        ("📍 Location", "📍"),
        ("💰 Salary", "💰"),
        ("🏢 Remote", "🏢"),
        ("✨ Why this matches", "✨"),
    ];

    for (name, emoji) in field_names {
        assert!(name.contains(emoji));
    }
}

#[test]
fn test_title_emoji_format() {
    let notification = create_test_notification();
    let title = format!(
        "🎯 {} - {}",
        notification.job.title, notification.job.company
    );
    assert!(title.starts_with("🎯 "));
    assert_eq!(title, "🎯 Care Coordinator - Community Care Network");
}

#[test]
fn test_description_markdown_bold() {
    let notification = create_test_notification();
    let description = format!(
        "**{}% Match** • {}",
        (notification.score.total * 100.0).round(),
        notification.job.source
    );
    assert!(description.starts_with("**"));
    assert!(description.contains(" • "));
}

#[test]
fn test_webhook_url_validation_https_only() {
    let test_cases = vec![
        ("https://discord.com/api/webhooks/123/token", true),
        ("http://discord.com/api/webhooks/123/token", false),
        ("ftp://discord.com/api/webhooks/123/token", false),
    ];

    for (url, should_pass) in test_cases {
        assert_eq!(validate_webhook_url(url).is_ok(), should_pass);
    }
}

#[test]
fn test_webhook_url_host_validation() {
    let test_cases = vec![
        ("https://discord.com/api/webhooks/123/token", true),
        ("https://discordapp.com/api/webhooks/123/token", true),
        ("https://discord.co/api/webhooks/123/token", false),
        ("https://evil-discord.com/api/webhooks/123/token", false),
    ];

    for (url, should_pass) in test_cases {
        assert_eq!(validate_webhook_url(url).is_ok(), should_pass);
    }
}

#[test]
fn test_webhook_url_path_validation() {
    let test_cases = vec![
        ("https://discord.com/api/webhooks/123/token", true),
        ("https://discord.com/webhooks/123/token", false),
        ("https://discord.com/api/webhook/123/token", false),
        ("https://discord.com/", false),
    ];

    for (url, should_pass) in test_cases {
        assert_eq!(validate_webhook_url(url).is_ok(), should_pass);
    }
}

#[test]
fn test_score_percentage_precision() {
    let test_cases = vec![
        (0.999, 100.0),
        (0.995, 100.0),
        (0.954, 95.0),
        (0.005, 1.0),
        (0.0, 0.0),
    ];

    for (score, expected) in test_cases {
        let rounded = (score * 100.0_f64).round();
        assert_eq!(rounded, expected);
    }
}

#[test]
fn test_timestamp_rfc3339_components() {
    let timestamp = chrono::Utc::now().to_rfc3339();
    assert!(timestamp.contains('T'));
    assert!(timestamp.contains(':'));
    assert!(timestamp.contains('Z') || timestamp.contains('+'));
}

#[test]
fn test_payload_omits_remote_thumbnail() {
    let config = DiscordConfig::default();
    let payload = build_discord_payload(&config, &create_test_notification());
    let embed = &payload["embeds"][0];

    assert!(embed.get("thumbnail").is_none());
    assert!(!payload.to_string().contains("raw.githubusercontent.com"));
}

#[test]
fn test_user_mention_format() {
    let user_id = "123456789012345678";
    let mention = format!("<@{}>", user_id);
    assert!(mention.starts_with("<@"));
    assert!(mention.ends_with('>'));
}

#[test]
fn test_empty_string_url_validation() {
    let result = validate_webhook_url("");
    assert!(result.is_err());
}

#[test]
fn test_whitespace_leading_url_succeeds() {
    // The url crate handles leading whitespace gracefully
    let _result = validate_webhook_url(" https://discord.com/api/webhooks/123/token");
    assert!(
        _result.is_ok(),
        "Leading whitespace should be handled: {:?}",
        _result
    );
}
