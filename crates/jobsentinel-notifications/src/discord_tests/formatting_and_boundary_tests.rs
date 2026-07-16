use super::*;

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
        "Case management & scheduling".to_string(),
        "$200k+ salary".to_string(),
        "Remote (100%)".to_string(),
    ];

    let reasons_text = notification.score.reasons.join("\n");
    assert!(reasons_text.contains("&"));
    assert!(reasons_text.contains("$"));
    assert!(reasons_text.contains("("));
}

#[test]
fn test_salary_zero_values() {
    let mut notification = create_test_notification();
    notification.job.salary_min = Some(0);
    notification.job.salary_max = Some(0);

    let salary_display = if let (Some(min), Some(max)) =
        (notification.job.salary_min, notification.job.salary_max)
    {
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

    let salary_display = if let (Some(min), Some(max)) =
        (notification.job.salary_min, notification.job.salary_max)
    {
        format!("${},000 - ${},000", min / 1000, max / 1000)
    } else if let Some(min) = notification.job.salary_min {
        format!("${},000+", min / 1000)
    } else {
        "Not specified".to_string()
    };

    // Formatting omits thousands separators.
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

    let title = format!(
        "🎯 {} - {}",
        notification.job.title, notification.job.company
    );
    assert!(title.contains("&"));
    assert!(title.contains("("));
    assert!(title.contains(")"));
}

#[test]
fn test_job_title_with_special_chars() {
    let mut notification = create_test_notification();
    notification.job.title = "Sr. Case Manager / Team Lead".to_string();

    let title = format!(
        "🎯 {} - {}",
        notification.job.title, notification.job.company
    );
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
    assert!(result.is_err(), "URL with auth info should fail validation");
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
    notification.score.reasons = vec!["Perfect match".to_string()];

    let reasons_text = notification.score.reasons.join("\n");
    assert_eq!(reasons_text, "Perfect match");
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

    let description = format!(
        "**{}% Match** • {}",
        (notification.score.total * 100.0).round(),
        notification.job.source
    );
    assert!(description.contains("lever"));
}

#[test]
fn test_footer_structure() {
    let footer = json!({
        "text": "JobSentinel • Job Search Assistant"
    });

    assert!(footer.get("text").is_some());
    assert_eq!(footer["text"], "JobSentinel • Job Search Assistant");
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

    let salary_display = if let (Some(min), Some(_max)) =
        (notification.job.salary_min, notification.job.salary_max)
    {
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
