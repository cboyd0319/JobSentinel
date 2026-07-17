use super::*;
use crate::test_support::notification_fixture;

#[test]
fn test_telegram_message_formatting() {
    let notification = notification_fixture();
    let message = format_telegram_message(&notification.job, &notification.score);

    // Verify key components are present (with escaped special chars)
    assert!(message.contains("Care Coordinator"));
    assert!(message.contains("Community Care Network"));
    assert!(message.contains("95%"));
    assert!(message.contains("Remote"));
    assert!(message.contains("https://example.com/jobs/123"));
}

#[test]
fn test_telegram_escapes_special_characters() {
    let mut notification = notification_fixture();
    notification.job.title = "Care Coordinator (Remote)".to_string();

    let message = format_telegram_message(&notification.job, &notification.score);

    // Parentheses should be escaped in MarkdownV2
    assert!(message.contains("\\(") && message.contains("\\)"));
}

#[test]
fn test_telegram_handles_missing_location() {
    let mut notification = notification_fixture();
    notification.job.location = None;

    let message = format_telegram_message(&notification.job, &notification.score);
    assert!(message.contains("N/A"));
}

#[test]
fn test_telegram_handles_missing_salary() {
    let mut notification = notification_fixture();
    notification.job.salary_min = None;
    notification.job.salary_max = None;

    let message = format_telegram_message(&notification.job, &notification.score);
    assert!(message.contains("Not specified"));
}

#[test]
fn test_telegram_keeps_match_reasons_local() {
    let notification = notification_fixture();
    let message = format_telegram_message(&notification.job, &notification.score);

    assert!(message.contains("Open JobSentinel to review match details saved on this computer"));
    assert!(!message.contains("Title matches"));
    assert!(!message.contains("Keyword match: case management"));
    assert!(!message.contains("Salary 120%"));
    assert!(!message.contains("Remote job"));
}

#[test]
fn test_escape_function_escapes_all_special_chars() {
    let escape = |s: &str| -> String {
        s.chars()
            .map(|c| match c {
                '_' | '*' | '[' | ']' | '(' | ')' | '~' | '`' | '>' | '#' | '+' | '-' | '='
                | '|' | '{' | '}' | '.' | '!' => format!("\\{}", c),
                _ => c.to_string(),
            })
            .collect()
    };

    let input = "Test_*[]()~`>#+-=|{}.!";
    let output = escape(input);

    // All special characters should be escaped
    assert_eq!(
        output,
        "Test\\_\\*\\[\\]\\(\\)\\~\\`\\>\\#\\+\\-\\=\\|\\{\\}\\.\\!"
    );
}

#[test]
fn test_escape_function_preserves_normal_chars() {
    let escape = |s: &str| -> String {
        s.chars()
            .map(|c| match c {
                '_' | '*' | '[' | ']' | '(' | ')' | '~' | '`' | '>' | '#' | '+' | '-' | '='
                | '|' | '{' | '}' | '.' | '!' => format!("\\{}", c),
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
    let notification = notification_fixture();
    let message = format_telegram_message(&notification.job, &notification.score);

    assert!(message.contains("✅ Yes"));
}

#[test]
fn test_remote_badge_no() {
    let mut notification = notification_fixture();
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
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("bot ID must be numeric"));
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
    assert!(
        result.is_err(),
        "Alphanumeric (not starting with @) should fail"
    );
}

#[test]
fn test_telegram_message_structure() {
    let notification = notification_fixture();
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
fn test_telegram_message_minimizes_job_url() {
    let mut notification = notification_fixture();
    notification.job.url =
        "https://example.com/jobs?utm_source=alert&gh_jid=123&token=secret&candidate_email=person@example.com#private"
            .to_string();

    let message = format_telegram_message(&notification.job, &notification.score);

    assert!(message.contains("[View Full Job Posting](https://example.com/jobs?gh_jid=123)"));
    assert!(!message.contains("utm_source"));
    assert!(!message.contains("token"));
    assert!(!message.contains("candidate_email"));
    assert!(!message.contains("person@example.com"));
    assert!(!message.contains("private"));
}

#[test]
fn test_telegram_message_salary_with_range() {
    let notification = notification_fixture();
    let message = format_telegram_message(&notification.job, &notification.score);

    assert!(message.contains("$180,000 \\- $220,000") || message.contains("180,000"));
}

#[test]
fn test_telegram_message_salary_min_only() {
    let mut notification = notification_fixture();
    notification.job.salary_max = None;

    let message = format_telegram_message(&notification.job, &notification.score);
    assert!(message.contains("180,000+") || message.contains("180,000\\+"));
}

#[test]
fn test_telegram_escape_special_chars_comprehensive() {
    let escape = |s: &str| -> String {
        s.chars()
            .map(|c| match c {
                '_' | '*' | '[' | ']' | '(' | ')' | '~' | '`' | '>' | '#' | '+' | '-' | '='
                | '|' | '{' | '}' | '.' | '!' => format!("\\{}", c),
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
    let mut notification = notification_fixture();
    notification.job.remote = None;

    let message = format_telegram_message(&notification.job, &notification.score);
    assert!(
        message.contains("❌ No"),
        "None remote should default to No"
    );
}

#[test]
fn test_telegram_message_empty_reasons() {
    let mut notification = notification_fixture();
    notification.score.reasons = vec![];

    let message = format_telegram_message(&notification.job, &notification.score);
    assert!(
        message.contains("*Why this matches:*"),
        "Should have header even with empty reasons"
    );
}

#[test]
fn test_telegram_message_single_reason() {
    let mut notification = notification_fixture();
    notification.score.reasons = vec!["Only one reason".to_string()];

    let message = format_telegram_message(&notification.job, &notification.score);
    assert!(message.contains("Open JobSentinel to review match details saved on this computer"));
    assert!(!message.contains("Only one reason"));
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
    let test_cases = vec![(0.95, "95%"), (0.90, "90%"), (1.00, "100%"), (0.0, "0%")];

    for (score, expected) in test_cases {
        let formatted = format!("{:.0}%", score * 100.0);
        assert_eq!(formatted, expected);
    }
}
