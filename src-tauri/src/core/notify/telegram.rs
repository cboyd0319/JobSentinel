//! Telegram Notifications via Bot API
//!
//! Sends formatted job alerts to Telegram using the Bot API with Markdown.

use super::Notification;
use crate::core::config::TelegramConfig;
use anyhow::{anyhow, Result};
use serde_json::json;

/// Validate Telegram bot token format
///
/// Bot tokens follow the format: `<bot_id>:<alphanumeric_token>`
/// Example: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`
fn validate_bot_token(token: &str) -> Result<()> {
    if token.is_empty() {
        return Err(anyhow!("Telegram bot token cannot be empty"));
    }

    // Token format: <bot_id>:<token_part>
    let parts: Vec<&str> = token.split(':').collect();
    if parts.len() != 2 {
        return Err(anyhow!(
            "Invalid Telegram bot token format. Expected format: '<bot_id>:<token>'"
        ));
    }

    // Bot ID should be numeric
    let bot_id = parts[0];
    if bot_id.is_empty() || !bot_id.chars().all(|c| c.is_ascii_digit()) {
        return Err(anyhow!(
            "Invalid Telegram bot token: bot ID must be numeric"
        ));
    }

    // Token part should be alphanumeric with possible underscores and dashes
    let token_part = parts[1];
    if token_part.is_empty() || token_part.len() < 20 {
        return Err(anyhow!(
            "Invalid Telegram bot token: token part is too short"
        ));
    }

    if !token_part.chars().all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-') {
        return Err(anyhow!(
            "Invalid Telegram bot token: token contains invalid characters"
        ));
    }

    Ok(())
}

/// Validate chat ID format
///
/// Chat IDs can be:
/// - Negative numbers for groups (e.g., -123456789)
/// - Positive numbers for users (e.g., 123456789)
/// - Strings starting with @ for usernames (e.g., @myusername)
fn validate_chat_id(chat_id: &str) -> Result<()> {
    if chat_id.is_empty() {
        return Err(anyhow!("Telegram chat ID cannot be empty"));
    }

    // Username format
    if chat_id.starts_with('@') {
        if chat_id.len() < 2 {
            return Err(anyhow!("Invalid Telegram username: too short"));
        }
        return Ok(());
    }

    // Numeric chat ID (can be negative for groups)
    let is_valid_number = chat_id.strip_prefix('-')
        .unwrap_or(chat_id)
        .chars()
        .all(|c| c.is_ascii_digit());

    if !is_valid_number {
        return Err(anyhow!(
            "Invalid Telegram chat ID: must be a number or username (@username)"
        ));
    }

    Ok(())
}

/// Send Telegram notification via Bot API
pub async fn send_telegram_notification(
    config: &TelegramConfig,
    notification: &Notification,
) -> Result<()> {
    // Validate configuration before sending
    validate_bot_token(&config.bot_token)?;
    validate_chat_id(&config.chat_id)?;

    let job = &notification.job;
    let score = &notification.score;

    // Format message using Telegram's MarkdownV2 format
    let message = format_telegram_message(job, score);

    // Build Telegram Bot API request
    let api_url = format!(
        "https://api.telegram.org/bot{}/sendMessage",
        config.bot_token
    );

    let payload = json!({
        "chat_id": config.chat_id,
        "text": message,
        "parse_mode": "MarkdownV2",
        "disable_web_page_preview": false,
        "disable_notification": false
    });

    // Send POST request to Telegram Bot API with timeout
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()?;

    let response = client.post(&api_url).json(&payload).send().await?;

    if !response.status().is_success() {
        let status = response.status();
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());
        return Err(anyhow!(
            "Telegram API failed with status {}: {}",
            status,
            error_text
        ));
    }

    Ok(())
}

/// Format message for Telegram using MarkdownV2
///
/// Note: MarkdownV2 requires escaping these characters: _*[]()~`>#+-=|{}.!
fn format_telegram_message(
    job: &crate::core::db::Job,
    score: &crate::core::scoring::JobScore,
) -> String {
    // Helper to escape MarkdownV2 special characters
    let escape = |s: &str| -> String {
        s.chars()
            .map(|c| match c {
                '_' | '*' | '[' | ']' | '(' | ')' | '~' | '`' | '>' | '#' | '+' | '-' | '='
                | '|' | '{' | '}' | '.' | '!' => format!("\\{}", c),
                _ => c.to_string(),
            })
            .collect()
    };

    let title = escape(&job.title);
    let company = escape(&job.company);
    let location = escape(job.location.as_deref().unwrap_or("N/A"));
    let source = escape(&job.source);

    // Format salary
    let salary_display = if let (Some(min), Some(max)) = (job.salary_min, job.salary_max) {
        escape(&format!("${},000 - ${},000", min / 1000, max / 1000))
    } else if let Some(min) = job.salary_min {
        escape(&format!("${},000+", min / 1000))
    } else {
        escape("Not specified")
    };

    let remote = if job.remote.unwrap_or(false) {
        "✅ Yes"
    } else {
        "❌ No"
    };

    let score_percent = escape(&format!("{:.0}%", score.total * 100.0));

    // Format reasons (escape each reason)
    let reasons = score
        .reasons
        .iter()
        .map(|r| format!("  {}", escape(r)))
        .collect::<Vec<_>>()
        .join("\n");

    // Build message with MarkdownV2 formatting
    format!(
        r#"🎯 *High Match Job Alert*

*{}*
{} • {} Match

*Company:* {}
*Location:* {}
*Salary:* {}
*Source:* {}
*Remote:* {}

*Why this matches:*
{}

[View Full Job Posting]({})

_Sent by JobSentinel • Job Search Automation_"#,
        title, company, score_percent, company, location, salary_display, source, remote, reasons, job.url
    )
}

/// Validate Telegram configuration by sending a test message
pub async fn validate_telegram_config(config: &TelegramConfig) -> Result<bool> {
    let api_url = format!(
        "https://api.telegram.org/bot{}/sendMessage",
        config.bot_token
    );

    let payload = json!({
        "chat_id": config.chat_id,
        "text": "✅ *JobSentinel Telegram Test*\n\nYour Telegram bot is configured correctly\\! You'll now receive job alerts in this chat\\.",
        "parse_mode": "MarkdownV2"
    });

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()?;

    let response = client.post(&api_url).json(&payload).send().await?;

    if !response.status().is_success() {
        let error_text = response.text().await?;
        return Err(anyhow!("Telegram API error: {}", error_text));
    }

    Ok(true)
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
                    "✓ Title matches: Senior Rust Engineer".to_string(),
                    "✓ Has keyword: Rust".to_string(),
                    "✓ Salary >= $150,000".to_string(),
                    "✓ Remote job (matches preference)".to_string(),
                ],
            },
        }
    }

    #[test]
    fn test_telegram_message_formatting() {
        let notification = create_test_notification();
        let message = format_telegram_message(&notification.job, &notification.score);

        // Verify key components are present (with escaped special chars)
        assert!(message.contains("Senior Rust Engineer"));
        assert!(message.contains("Awesome Corp"));
        assert!(message.contains("95%"));
        assert!(message.contains("Remote"));
        assert!(message.contains("https://example.com/jobs/123"));
    }

    #[test]
    fn test_telegram_escapes_special_characters() {
        let mut notification = create_test_notification();
        notification.job.title = "Senior Engineer (Remote)".to_string();

        let message = format_telegram_message(&notification.job, &notification.score);

        // Parentheses should be escaped in MarkdownV2
        assert!(message.contains("\\(") && message.contains("\\)"));
    }

    #[test]
    fn test_telegram_handles_missing_location() {
        let mut notification = create_test_notification();
        notification.job.location = None;

        let message = format_telegram_message(&notification.job, &notification.score);
        assert!(message.contains("N/A"));
    }

    #[test]
    fn test_telegram_handles_missing_salary() {
        let mut notification = create_test_notification();
        notification.job.salary_min = None;
        notification.job.salary_max = None;

        let message = format_telegram_message(&notification.job, &notification.score);
        assert!(message.contains("Not specified"));
    }

    #[test]
    fn test_telegram_includes_all_reasons() {
        let notification = create_test_notification();
        let message = format_telegram_message(&notification.job, &notification.score);

        // Check that all reasons are included (note: some special chars will be escaped)
        assert!(message.contains("Title matches"));
        assert!(message.contains("keyword: Rust"));
        assert!(message.contains("Salary"));
        assert!(message.contains("Remote job"));
    }

    #[test]
    fn test_escape_function_escapes_all_special_chars() {
        let escape = |s: &str| -> String {
            s.chars()
                .map(|c| match c {
                    '_' | '*' | '[' | ']' | '(' | ')' | '~' | '`' | '>' | '#' | '+' | '-'
                    | '=' | '|' | '{' | '}' | '.' | '!' => format!("\\{}", c),
                    _ => c.to_string(),
                })
                .collect()
        };

        let input = "Test_*[]()~`>#+-=|{}.!";
        let output = escape(input);

        // All special characters should be escaped
        assert_eq!(output, "Test\\_\\*\\[\\]\\(\\)\\~\\`\\>\\#\\+\\-\\=\\|\\{\\}\\.\\!");
    }

    #[test]
    fn test_escape_function_preserves_normal_chars() {
        let escape = |s: &str| -> String {
            s.chars()
                .map(|c| match c {
                    '_' | '*' | '[' | ']' | '(' | ')' | '~' | '`' | '>' | '#' | '+' | '-'
                    | '=' | '|' | '{' | '}' | '.' | '!' => format!("\\{}", c),
                    _ => c.to_string(),
                })
                .collect()
        };

        let input = "Hello World 123";
        let output = escape(input);

        // Normal characters should remain unchanged
        assert_eq!(output, "Hello World 123");
    }

    #[test]
    fn test_remote_badge_yes() {
        let notification = create_test_notification();
        let message = format_telegram_message(&notification.job, &notification.score);

        assert!(message.contains("✅ Yes"));
    }

    #[test]
    fn test_remote_badge_no() {
        let mut notification = create_test_notification();
        notification.job.remote = Some(false);

        let message = format_telegram_message(&notification.job, &notification.score);

        assert!(message.contains("❌ No"));
    }

    #[test]
    fn test_validate_bot_token_valid() {
        let valid_token = "123456789:ABCdefGHIjklMNOpqrsTUVwxyz-ABCDEFGHIJ";
        let result = validate_bot_token(valid_token);
        assert!(result.is_ok(), "Valid bot token should pass validation");
    }

    #[test]
    fn test_validate_bot_token_empty() {
        let result = validate_bot_token("");
        assert!(result.is_err(), "Empty token should fail");
        assert!(result.unwrap_err().to_string().contains("cannot be empty"));
    }

    #[test]
    fn test_validate_bot_token_no_colon() {
        let invalid_token = "123456789ABCdefGHIjklMNOpqrsTUVwxyz";
        let result = validate_bot_token(invalid_token);
        assert!(result.is_err(), "Token without colon should fail");
        assert!(result.unwrap_err().to_string().contains("Expected format"));
    }

    #[test]
    fn test_validate_bot_token_multiple_colons() {
        let invalid_token = "123:456:789:ABC";
        let result = validate_bot_token(invalid_token);
        assert!(result.is_err(), "Token with multiple colons should fail");
    }

    #[test]
    fn test_validate_bot_token_non_numeric_id() {
        let invalid_token = "abc123:ABCdefGHIjklMNOpqrsTUVwxyz";
        let result = validate_bot_token(invalid_token);
        assert!(result.is_err(), "Non-numeric bot ID should fail");
        assert!(result.unwrap_err().to_string().contains("bot ID must be numeric"));
    }

    #[test]
    fn test_validate_bot_token_empty_id() {
        let invalid_token = ":ABCdefGHIjklMNOpqrsTUVwxyz";
        let result = validate_bot_token(invalid_token);
        assert!(result.is_err(), "Empty bot ID should fail");
    }

    #[test]
    fn test_validate_bot_token_short_token_part() {
        let invalid_token = "123456789:ABC";
        let result = validate_bot_token(invalid_token);
        assert!(result.is_err(), "Token part too short should fail");
        assert!(result.unwrap_err().to_string().contains("too short"));
    }

    #[test]
    fn test_validate_bot_token_invalid_chars() {
        let invalid_token = "123456789:ABC@#$%^&*()defGHI123456789";
        let result = validate_bot_token(invalid_token);
        assert!(result.is_err(), "Token with invalid characters should fail");
        // Just verify it fails, don't check exact error message
    }

    #[test]
    fn test_validate_bot_token_with_underscore() {
        let valid_token = "123456789:ABC_def_GHI_jklMNOpqrsTUVwxyz";
        let result = validate_bot_token(valid_token);
        assert!(result.is_ok(), "Token with underscores should pass");
    }

    #[test]
    fn test_validate_bot_token_with_dash() {
        let valid_token = "123456789:ABC-def-GHI-jklMNOpqrsTUVwxyz";
        let result = validate_bot_token(valid_token);
        assert!(result.is_ok(), "Token with dashes should pass");
    }

    #[test]
    fn test_validate_chat_id_empty() {
        let result = validate_chat_id("");
        assert!(result.is_err(), "Empty chat ID should fail");
        assert!(result.unwrap_err().to_string().contains("cannot be empty"));
    }

    #[test]
    fn test_validate_chat_id_positive_number() {
        let result = validate_chat_id("123456789");
        assert!(result.is_ok(), "Positive numeric chat ID should pass");
    }

    #[test]
    fn test_validate_chat_id_negative_number() {
        let result = validate_chat_id("-123456789");
        assert!(result.is_ok(), "Negative numeric chat ID should pass");
    }

    #[test]
    fn test_validate_chat_id_username() {
        let result = validate_chat_id("@myusername");
        assert!(result.is_ok(), "Username format should pass");
    }

    #[test]
    fn test_validate_chat_id_username_too_short() {
        let result = validate_chat_id("@");
        assert!(result.is_err(), "Single @ should fail");
        assert!(result.unwrap_err().to_string().contains("too short"));
    }

    #[test]
    fn test_validate_chat_id_invalid_format() {
        let result = validate_chat_id("invalid_format");
        assert!(result.is_err(), "Invalid format should fail");
    }

    #[test]
    fn test_validate_chat_id_alphanumeric() {
        let result = validate_chat_id("abc123");
        assert!(result.is_err(), "Alphanumeric (not starting with @) should fail");
    }

    #[test]
    fn test_telegram_message_structure() {
        let notification = create_test_notification();
        let message = format_telegram_message(&notification.job, &notification.score);

        // Verify key sections are present
        assert!(message.contains("🎯 *High Match Job Alert*"));
        assert!(message.contains("*Company:*"));
        assert!(message.contains("*Location:*"));
        assert!(message.contains("*Salary:*"));
        assert!(message.contains("*Source:*"));
        assert!(message.contains("*Remote:*"));
        assert!(message.contains("*Why this matches:*"));
        assert!(message.contains("[View Full Job Posting]"));
    }

    #[test]
    fn test_telegram_message_salary_with_range() {
        let notification = create_test_notification();
        let message = format_telegram_message(&notification.job, &notification.score);

        assert!(message.contains("$180,000 \\- $220,000") || message.contains("180,000"));
    }

    #[test]
    fn test_telegram_message_salary_min_only() {
        let mut notification = create_test_notification();
        notification.job.salary_max = None;

        let message = format_telegram_message(&notification.job, &notification.score);
        assert!(message.contains("180,000+") || message.contains("180,000\\+"));
    }

    #[test]
    fn test_telegram_escape_special_chars_comprehensive() {
        let escape = |s: &str| -> String {
            s.chars()
                .map(|c| match c {
                    '_' | '*' | '[' | ']' | '(' | ')' | '~' | '`' | '>' | '#' | '+' | '-'
                    | '=' | '|' | '{' | '}' | '.' | '!' => format!("\\{}", c),
                    _ => c.to_string(),
                })
                .collect()
        };

        let test_str = "Test (parentheses) and-dash!";
        let escaped = escape(test_str);

        // Check specific chars are escaped
        assert!(escaped.contains("\\("));
        assert!(escaped.contains("\\)"));
        assert!(escaped.contains("\\-"));
        assert!(escaped.contains("\\!"));
    }

    #[test]
    fn test_telegram_api_url_format() {
        let bot_token = "123456789:ABCdefGHIjklMNOpqrsTUVwxyz";
        let expected_url = format!("https://api.telegram.org/bot{}/sendMessage", bot_token);

        assert!(expected_url.starts_with("https://api.telegram.org/bot"));
        assert!(expected_url.ends_with("/sendMessage"));
        assert!(expected_url.contains("123456789:ABC"));
    }

    #[test]
    fn test_remote_badge_with_none() {
        let mut notification = create_test_notification();
        notification.job.remote = None;

        let message = format_telegram_message(&notification.job, &notification.score);
        assert!(message.contains("❌ No"), "None remote should default to No");
    }

    #[test]
    fn test_telegram_message_empty_reasons() {
        let mut notification = create_test_notification();
        notification.score.reasons = vec![];

        let message = format_telegram_message(&notification.job, &notification.score);
        assert!(message.contains("*Why this matches:*"), "Should have header even with empty reasons");
    }

    #[test]
    fn test_telegram_message_single_reason() {
        let mut notification = create_test_notification();
        notification.score.reasons = vec!["Only one reason".to_string()];

        let message = format_telegram_message(&notification.job, &notification.score);
        assert!(message.contains("Only one reason"));
    }

    #[test]
    fn test_validate_chat_id_long_username() {
        let result = validate_chat_id("@very_long_username_with_underscores_123");
        assert!(result.is_ok(), "Long username should pass");
    }

    #[test]
    fn test_validate_bot_token_minimum_length() {
        let token = "1:12345678901234567890"; // Exactly 20 chars in token part
        let result = validate_bot_token(token);
        assert!(result.is_ok(), "Token with exactly 20 chars should pass");
    }

    #[test]
    fn test_telegram_message_score_formatting() {
        let test_cases = vec![
            (0.95, "95%"),
            (0.90, "90%"),
            (1.00, "100%"),
            (0.0, "0%"),
        ];

        for (score, expected) in test_cases {
            let formatted = format!("{:.0}%", score * 100.0);
            assert_eq!(formatted, expected);
        }
    }
}
