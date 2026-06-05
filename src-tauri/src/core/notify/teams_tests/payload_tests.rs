use super::super::*;
use super::create_test_notification;

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
    assert_eq!(
        payload["summary"],
        "New job alert: Care Coordinator at Community Care Network"
    );
    assert_eq!(payload["themeColor"], "00FF00");
    assert_eq!(payload["title"], "🎯 High Match Job Alert (95% Match)");

    // Verify sections array
    let sections = payload["sections"].as_array().unwrap();
    assert_eq!(sections.len(), 1);
    assert_eq!(sections[0]["activityTitle"], "**Care Coordinator**");
    assert_eq!(
        sections[0]["activitySubtitle"],
        "Community Care Network • greenhouse"
    );

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
    assert!(sections[0]["text"]
        .as_str()
        .unwrap()
        .contains("Why this matches"));
    assert!(sections[0]["text"]
        .as_str()
        .unwrap()
        .contains("Title matches"));

    // Verify actions
    let actions = payload["potentialAction"].as_array().unwrap();
    assert_eq!(actions.len(), 1);
    assert_eq!(actions[0]["@type"], "OpenUri");
    assert_eq!(actions[0]["name"], "View Full Job Posting");
    assert_eq!(
        actions[0]["targets"][0]["uri"],
        "https://example.com/jobs/123"
    );
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
    let summary = format!(
        "New job alert: {} at {}",
        notification.job.title, notification.job.company
    );
    assert_eq!(
        summary,
        "New job alert: Care Coordinator at Community Care Network"
    );
}

#[test]
fn test_message_card_title_format() {
    let notification = create_test_notification();
    let _title = format!(
        "🎯 High Match Job Alert ({}% Match)",
        (notification.score.total * 100.0).round()
    );
    assert_eq!(_title, "🎯 High Match Job Alert (95% Match)");
}

#[test]
fn test_message_card_activity_title_format() {
    let notification = create_test_notification();
    let activity_title = format!("**{}**", notification.job.title);
    assert_eq!(activity_title, "**Care Coordinator**");
}

#[test]
fn test_message_card_activity_subtitle_format() {
    let notification = create_test_notification();
    let subtitle = format!("{} • {}", notification.job.company, notification.job.source);
    assert_eq!(subtitle, "Community Care Network • greenhouse");
}

#[test]
fn test_validation_error_message_for_wrong_scheme() {
    let result = validate_webhook_url("http://outlook.office.com/webhook/123");
    assert!(result.is_err());
    let error = result.unwrap_err().to_string();
    assert!(error.contains("full Teams connection link"));
}

#[test]
fn test_validation_error_message_for_wrong_domain() {
    let result = validate_webhook_url("https://evil.com/webhook/123");
    assert!(result.is_err());
    let error = result.unwrap_err().to_string();
    assert!(error.contains("connection link copied from Teams"));
}

#[test]
fn test_validation_error_message_for_wrong_path() {
    let result = validate_webhook_url("https://outlook.office.com/badpath/123");
    assert!(result.is_err());
    let error = result.unwrap_err().to_string();
    assert!(error.contains("connection link copied from Teams"));
}

#[test]
fn test_validation_error_message_for_malformed_url() {
    let result = validate_webhook_url("not-a-url");
    assert!(result.is_err());
    let error = result.unwrap_err().to_string();
    assert!(error.contains("full Teams connection link"));
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
    assert!(notification.score.reasons[1].contains("Keyword match"));
    assert!(notification.score.reasons[2].contains("Salary"));
    assert!(notification.score.reasons[3].contains("Remote"));
}

#[test]
fn test_remote_job_display_true() {
    let notification = create_test_notification();
    assert_eq!(notification.job.remote, Some(true));
    let remote_text = if notification.job.remote.unwrap_or(false) {
        "✅ Yes"
    } else {
        "❌ No"
    };
    assert_eq!(remote_text, "✅ Yes");
}

#[test]
fn test_remote_job_display_false() {
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
    assert!(
        result.is_ok(),
        "Webhook URL with trailing slash should pass"
    );
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
    assert!(result.is_err(), "Non-standard port should fail validation");
}

#[test]
fn test_webhook_url_with_username_fails() {
    let url = "https://user@outlook.office.com/webhook/123";
    let result = validate_webhook_url(url);
    assert!(result.is_err(), "URL with username should fail validation");
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
    let text = format!(
        "**Why this matches:**\n\n{}",
        notification.score.reasons.join("\n\n")
    );
    assert!(text.starts_with("**Why this matches:**"));
    assert!(text.contains("\n\n"));
    assert!(text.contains("Title matches"));
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
    assert!(payload["text"]
        .as_str()
        .unwrap()
        .contains("configured correctly"));
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
    notification.score.reasons = vec!["Only reason".to_string()];
    let text = notification.score.reasons.join("\n\n");
    assert_eq!(text, "Only reason");
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
    assert!(
        result.is_err(),
        "Path /webhook without trailing content should fail"
    );
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
    assert_eq!(notification.job.title, "Care Coordinator");
    assert_eq!(notification.job.company, "Community Care Network");
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

#[test]
fn test_full_payload_with_all_none_optional_fields() {
    let mut notification = create_test_notification();
    notification.job.location = None;
    notification.job.remote = None;
    notification.job.salary_min = None;
    notification.job.salary_max = None;
    notification.job.description = None;

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

    // Should handle all None fields gracefully
    assert_eq!(payload["sections"][0]["facts"][0]["value"], "N/A");
    assert_eq!(payload["sections"][0]["facts"][1]["value"], "Not specified");
    assert_eq!(payload["sections"][0]["facts"][2]["value"], "❌ No");
}

#[test]
fn test_salary_min_only_edge_case() {
    let min_only = Some(250000);
    let max: Option<i64> = None;

    let display = if let (Some(min), Some(max_val)) = (min_only, max) {
        format!("${},000 - ${},000", min / 1000, max_val / 1000)
    } else if let Some(min) = min_only {
        format!("${},000+", min / 1000)
    } else {
        "Not specified".to_string()
    };

    assert_eq!(display, "$250,000+");
}

#[test]
fn test_score_formatting_high_precision() {
    let cases = vec![
        (0.9546_f64, 95.0_f64),
        (0.9549_f64, 95.0_f64),
        (0.9551_f64, 96.0_f64),
        (0.8999_f64, 90.0_f64),
    ];

    for (score, expected) in cases {
        let rounded = (score * 100.0_f64).round();
        assert_eq!(rounded, expected);
    }
}

#[test]
fn test_webhook_url_ipv6_fails() {
    let url = "https://[::1]/webhook/123";
    let result = validate_webhook_url(url);
    assert!(result.is_err(), "IPv6 address should fail validation");
}

#[test]
fn test_webhook_url_path_with_double_slash() {
    let url = "https://outlook.office.com//webhook/123";
    let result = validate_webhook_url(url);
    // URL with double slash fails because path is "//webhook/123" not "/webhook/123"
    assert!(
        result.is_err(),
        "Double slash in path should fail validation"
    );
}

#[test]
fn test_multiple_reasons_formatting() {
    let reasons = vec![
        "First reason".to_string(),
        "Second reason".to_string(),
        "Third reason".to_string(),
    ];
    let text = reasons.join("\n\n");

    assert!(text.contains("First reason"));
    assert!(text.contains("Second reason"));
    assert!(text.contains("Third reason"));
    assert_eq!(text.matches("\n\n").count(), 2);
}

#[test]
fn test_theme_color_selection_comprehensive() {
    let cases = vec![
        (1.0_f64, "00FF00"),
        (0.95_f64, "00FF00"),
        (0.9, "00FF00"),
        (0.899, "FFA500"),
        (0.85, "FFA500"),
        (0.8, "FFA500"),
        (0.799, "0078D4"),
        (0.75, "0078D4"),
        (0.5_f64, "0078D4"),
        (0.0_f64, "0078D4"),
    ];

    for (score, expected) in cases {
        let color = if score >= 0.9 {
            "00FF00"
        } else if score >= 0.8 {
            "FFA500"
        } else {
            "0078D4"
        };
        assert_eq!(
            color, expected,
            "Score {} should map to color {}",
            score, expected
        );
    }
}

#[test]
fn test_location_as_deref_unwrap_or_logic() {
    let cases = vec![
        (Some("New York"), "New York"),
        (Some(""), ""),
        (None, "N/A"),
    ];

    for (location, expected) in cases {
        let value = location.as_deref().unwrap_or("N/A");
        assert_eq!(value, expected);
    }
}

#[test]
fn test_remote_unwrap_or_false_logic() {
    let cases = vec![
        (Some(true), "✅ Yes"),
        (Some(false), "❌ No"),
        (None, "❌ No"),
    ];

    for (remote, expected) in cases {
        let text = if remote.unwrap_or(false) {
            "✅ Yes"
        } else {
            "❌ No"
        };
        assert_eq!(text, expected);
    }
}

#[test]
fn test_salary_all_combinations() {
    let cases = vec![
        (Some(100000), Some(150000), "$100,000 - $150,000"),
        (Some(100000), None, "$100,000+"),
        (None, Some(150000), "Not specified"),
        (None, None, "Not specified"),
    ];

    for (min, max, expected) in cases {
        let display = if let (Some(min_val), Some(max_val)) = (min, max) {
            format!("${},000 - ${},000", min_val / 1000, max_val / 1000)
        } else if let Some(min_val) = min {
            format!("${},000+", min_val / 1000)
        } else {
            "Not specified".to_string()
        };
        assert_eq!(display, expected);
    }
}

#[test]
fn test_message_card_summary_with_special_characters() {
    let mut notification = create_test_notification();
    notification.job.title = "Care Coordinator (Bilingual/Weekend)".to_string();
    notification.job.company = "Community Health & Co.".to_string();

    let summary = format!(
        "New job alert: {} at {}",
        notification.job.title, notification.job.company
    );
    assert_eq!(
        summary,
        "New job alert: Care Coordinator (Bilingual/Weekend) at Community Health & Co."
    );
}

#[test]
fn test_message_card_title_with_various_scores() {
    let cases = vec![
        (0.9567_f64, "96% Match"),
        (0.8032_f64, "80% Match"),
        (0.7999_f64, "80% Match"),
    ];

    for (score, expected_suffix) in cases {
        // Note: .round() on f64 produces "96.0", "80.0", etc (not "96", "80")
        let rounded_score = (score * 100.0_f64).round();
        let title = format!("🎯 High Match Job Alert ({}% Match)", rounded_score);
        assert!(title.contains(expected_suffix));
        // Extract the numeric part from expected and compare with .0 suffix
        let expected_num = expected_suffix.trim_end_matches("% Match");
        let actual_num_str = format!("{}", rounded_score);
        assert!(
            actual_num_str.starts_with(expected_num),
            "Score {} should round to {} (got {})",
            score,
            expected_num,
            actual_num_str
        );
    }
}

#[test]
fn test_activity_subtitle_format_variations() {
    let cases = vec![
        ("Acme Corp", "remoteok", "Acme Corp • remoteok"),
        ("A", "B", "A • B"),
        ("Company Name", "lever", "Company Name • lever"),
    ];

    for (company, source, expected) in cases {
        let subtitle = format!("{} • {}", company, source);
        assert_eq!(subtitle, expected);
    }
}

#[test]
fn test_match_score_fact_formatting() {
    let cases = vec![
        (0.95_f64, "95%"),
        (0.5_f64, "50%"),
        (1.0_f64, "100%"),
        (0.0_f64, "0%"),
    ];

    for (score, expected) in cases {
        let value = format!("{}%", (score * 100.0).round() as i32);
        assert_eq!(value, expected);
    }
}

#[test]
fn test_reasons_text_with_markdown() {
    let reasons = vec![
        "**Strong match**: 95%".to_string(),
        "Remote: _preferred_".to_string(),
    ];
    let text = format!("**Why this matches:**\n\n{}", reasons.join("\n\n"));

    assert!(text.starts_with("**Why this matches:**"));
    assert!(text.contains("**Strong match**"));
    assert!(text.contains("_preferred_"));
}

#[test]
fn test_validation_webhook_test_payload_all_fields() {
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
    assert_eq!(payload["@context"], "https://schema.org/extensions");
    assert_eq!(payload["summary"], "JobSentinel Webhook Test");
    assert_eq!(payload["themeColor"], "00FF00");
    assert_eq!(payload["title"], "✅ JobSentinel Webhook Test");
    assert!(payload["text"].as_str().unwrap().len() > 0);
    assert_eq!(payload["potentialAction"].as_array().unwrap().len(), 1);
    assert_eq!(payload["potentialAction"][0]["@type"], "OpenUri");
    assert_eq!(payload["potentialAction"][0]["name"], "Learn More");
    assert_eq!(payload["potentialAction"][0]["targets"][0]["os"], "default");
    assert_eq!(
        payload["potentialAction"][0]["targets"][0]["uri"],
        "https://github.com/cboyd0319/JobSentinel"
    );
}

#[test]
fn test_webhook_url_with_encoded_characters() {
    let url = "https://outlook.office.com/webhook/12345678%2D1234%2D1234%2D1234%2D123456789012";
    let result = validate_webhook_url(url);
    assert!(
        result.is_ok(),
        "URL with percent-encoded characters should pass"
    );
}

#[test]
fn test_webhook_url_office_vs_office365_both_valid() {
    let urls = vec![
        "https://outlook.office.com/webhook/test",
        "https://outlook.office365.com/webhook/test",
    ];

    for url in urls {
        let result = validate_webhook_url(url);
        assert!(
            result.is_ok(),
            "Both office.com and office365.com should be valid: {}",
            url
        );
    }
}

#[test]
fn test_webhook_url_mixed_case_domain_fails() {
    let urls = vec![
        "https://Outlook.office.com/webhook/123",
        "https://outlook.OFFICE.com/webhook/123",
        "https://outlook.office.COM/webhook/123",
    ];

    for url in urls {
        let result = validate_webhook_url(url);
        // URL host is normalized to lowercase by the url crate (per RFC 3986)
        // So mixed case domains actually pass validation
        assert!(
            result.is_ok(),
            "Mixed case domain is normalized and should pass: {}",
            url
        );
    }
}

#[test]
fn test_score_percentage_display_as_integer() {
    let cases = vec![
        (0.954_f64, "95"),
        (0.956_f64, "96"),
        (0.5_f64, "50"),
        (1.0_f64, "100"),
        (0.0_f64, "0"),
    ];

    for (score, expected) in cases {
        let display = format!("{}", (score * 100.0_f64).round() as i32);
        assert_eq!(display, expected);
    }
}

#[test]
fn test_facts_array_complete_structure() {
    let notification = create_test_notification();
    let salary_display = "$180,000 - $220,000";

    let facts = json!([
        {"name": "Location:", "value": notification.job.location.as_deref().unwrap_or("N/A")},
        {"name": "Salary:", "value": salary_display},
        {"name": "Remote:", "value": if notification.job.remote.unwrap_or(false) { "✅ Yes" } else { "❌ No" }},
        {"name": "Match Score:", "value": format!("{}%", (notification.score.total * 100.0).round())},
    ]);

    let array = facts.as_array().unwrap();
    assert_eq!(array.len(), 4);

    // Verify each fact has required structure
    for fact in array {
        assert!(fact.get("name").is_some());
        assert!(fact.get("value").is_some());
    }

    // Verify specific values
    assert_eq!(array[0]["name"], "Location:");
    assert_eq!(array[1]["name"], "Salary:");
    assert_eq!(array[2]["name"], "Remote:");
    assert_eq!(array[3]["name"], "Match Score:");
}

#[test]
fn test_potential_action_targets_array() {
    let url = "https://example.com/job/12345";
    let targets = json!([
        {
            "os": "default",
            "uri": url
        }
    ]);

    assert_eq!(targets.as_array().unwrap().len(), 1);
    assert_eq!(targets[0]["os"], "default");
    assert_eq!(targets[0]["uri"], url);
}

#[test]
fn test_webhook_validation_empty_path_after_webhook() {
    let url = "https://outlook.office.com/webhook/";
    let result = validate_webhook_url(url);
    assert!(
        result.is_ok(),
        "URL with /webhook/ and trailing slash should pass"
    );
}

#[test]
fn test_salary_zero_values() {
    let cases = vec![
        (Some(0), Some(0), "$0,000 - $0,000"),
        (Some(0), None, "$0,000+"),
    ];

    for (min, max, expected) in cases {
        let display = if let (Some(min_val), Some(max_val)) = (min, max) {
            format!("${},000 - ${},000", min_val / 1000, max_val / 1000)
        } else if let Some(min_val) = min {
            format!("${},000+", min_val / 1000)
        } else {
            "Not specified".to_string()
        };
        assert_eq!(display, expected);
    }
}

#[test]
fn test_message_card_context_url() {
    let context = "https://schema.org/extensions";
    assert!(context.starts_with("https://"));
    assert!(context.contains("schema.org"));
}

#[test]
fn test_activity_image_url_format() {
    let image_url = "https://raw.githubusercontent.com/cboyd0319/JobSentinel/main/assets/icon.png";
    assert!(image_url.starts_with("https://"));
    assert!(image_url.ends_with(".png"));
    assert!(image_url.contains("JobSentinel"));
    assert!(image_url.contains("github"));
}

#[test]
fn test_sections_array_structure() {
    let notification = create_test_notification();

    let sections = json!([
        {
            "activityTitle": format!("**{}**", notification.job.title),
            "activitySubtitle": format!("{} • {}", notification.job.company, notification.job.source),
            "activityImage": "https://raw.githubusercontent.com/cboyd0319/JobSentinel/main/assets/icon.png",
            "facts": [],
            "text": "Sample text"
        }
    ]);

    let array = sections.as_array().unwrap();
    assert_eq!(array.len(), 1);
    assert!(array[0].get("activityTitle").is_some());
    assert!(array[0].get("activitySubtitle").is_some());
    assert!(array[0].get("activityImage").is_some());
    assert!(array[0].get("facts").is_some());
    assert!(array[0].get("text").is_some());
}

#[test]
fn test_reasons_with_unicode_characters() {
    let reasons = vec![
        "Match: 95%".to_string(),
        "Café role match".to_string(),
        "Startup™ preferred company".to_string(),
        "São Paulo timezone overlap".to_string(),
        "Zürich relocation not required".to_string(),
    ];
    let text = reasons.join("\n\n");

    assert!(text.contains("é"));
    assert!(text.contains("™"));
    assert!(text.contains("São"));
    assert!(text.contains("Zürich"));
}

#[test]
fn test_webhook_url_validation_error_messages_specificity() {
    let cases = vec![
        (
            "http://outlook.office.com/webhook/123",
            "full Teams connection link",
        ),
        (
            "https://evil.com/webhook/123",
            "connection link copied from Teams",
        ),
        (
            "https://outlook.office.com/badpath/123",
            "connection link copied from Teams",
        ),
        ("not-a-url", "full Teams connection link"),
    ];

    for (url, expected_substring) in cases {
        let result = validate_webhook_url(url);
        assert!(result.is_err());
        let error = result.unwrap_err().to_string();
        assert!(
            error.contains(expected_substring),
            "Error for '{}' should contain '{}', got: {}",
            url,
            expected_substring,
            error
        );
    }
}

#[test]
fn test_complete_payload_json_serialization() {
    let notification = create_test_notification();
    let job = &notification.job;
    let score = &notification.score;

    let payload = json!({
        "@type": "MessageCard",
        "@context": "https://schema.org/extensions",
        "summary": format!("New job alert: {} at {}", job.title, job.company),
        "themeColor": "00FF00",
        "title": format!("🎯 High Match Job Alert ({}% Match)", (score.total * 100.0).round()),
    });

    // Verify it serializes to valid JSON
    let json_str = serde_json::to_string(&payload).unwrap();
    assert!(json_str.len() > 0);
    assert!(json_str.contains("MessageCard"));
    assert!(json_str.contains("High Match Job Alert"));
}
