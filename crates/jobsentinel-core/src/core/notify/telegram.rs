//! Telegram Notifications via Bot API
//!
//! Sends formatted job alerts to Telegram using the Bot API with Markdown.

use super::{
    notification_http_client_for_url, notification_job_href, notification_provider_failure_summary,
    Notification, LOCAL_JOB_LINK_MESSAGE, LOCAL_MATCH_DETAILS_MESSAGE,
};
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

    if !token_part
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-')
    {
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
    let is_valid_number = chat_id
        .strip_prefix('-')
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

    // Send POST request to Telegram Bot API with DNS/IP validation and pinned resolution.
    let (client, api_url) = notification_http_client_for_url(&api_url).await?;

    let response = client
        .post(api_url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| anyhow!("Telegram API request failed: {}", e.without_url()))?;

    if !response.status().is_success() {
        let error_summary =
            notification_provider_failure_summary(response, "https://api.telegram.org/sendMessage")
                .await;
        return Err(anyhow!("Telegram API failed: {}", error_summary));
    }

    Ok(())
}

/// Format message for Telegram using MarkdownV2
///
/// Note: MarkdownV2 requires escaping these characters: _*[]()~`>#+-=|{}.!
fn format_telegram_message(
    job: &crate::core::Job,
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

    let reasons = format!("  {}", escape(LOCAL_MATCH_DETAILS_MESSAGE));
    let job_link = notification_job_href(&job.url)
        .map(|href| format!("[View Full Job Posting]({})", href))
        .unwrap_or_else(|| escape(LOCAL_JOB_LINK_MESSAGE));

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

{}

_Sent by JobSentinel • Job Search Assistant_"#,
        title,
        company,
        score_percent,
        company,
        location,
        salary_display,
        source,
        remote,
        reasons,
        job_link
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

    let (client, api_url) = notification_http_client_for_url(&api_url).await?;

    let response = client
        .post(api_url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| anyhow!("Telegram API request failed: {}", e.without_url()))?;

    if !response.status().is_success() {
        let error_summary =
            notification_provider_failure_summary(response, "https://api.telegram.org/sendMessage")
                .await;
        return Err(anyhow!("Telegram API error: {}", error_summary));
    }

    Ok(true)
}

#[cfg(test)]
mod tests;
