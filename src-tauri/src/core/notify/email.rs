//! Email Notifications via SMTP
//!
//! Sends rich HTML-formatted job alerts via email using SMTP.

use super::Notification;
use crate::core::config::EmailConfig;
use anyhow::{anyhow, Context, Result};
use lettre::{
    message::{header::ContentType, Mailbox},
    transport::smtp::authentication::Credentials,
    Message, SmtpTransport, Transport,
};

/// Send email notification
pub async fn send_email_notification(
    config: &EmailConfig,
    notification: &Notification,
) -> Result<()> {
    let job = &notification.job;
    let score = &notification.score;

    // Build email recipients
    let to_addresses: Vec<Mailbox> = config
        .to_emails
        .iter()
        .map(|email| email.parse())
        .collect::<Result<Vec<_>, _>>()
        .context("Invalid recipient email address")?;

    // Parse from address
    let from_address: Mailbox = config
        .from_email
        .parse()
        .context("Invalid from email address")?;

    // Generate HTML email body
    let html_body = format_html_email(job, score);

    // Generate plain text version (for email clients that don't support HTML)
    let _text_body = format_text_email(job, score);

    // Send to each recipient (some SMTP servers require individual sends)
    for to_address in to_addresses {
        // Build message
        let email = Message::builder()
            .from(from_address.clone())
            .to(to_address)
            .subject(format!(
                "🎯 High Match Job Alert: {} at {}",
                job.title, job.company
            ))
            .header(ContentType::TEXT_HTML)
            .body(html_body.clone())
            .context("Failed to build email message")?;

        // Create SMTP client
        let creds = Credentials::new(config.smtp_username.clone(), config.smtp_password.clone());

        let mailer = if config.use_starttls {
            // STARTTLS (port 587)
            SmtpTransport::starttls_relay(&config.smtp_server)
                .context("Failed to create STARTTLS relay")?
                .credentials(creds)
                .port(config.smtp_port)
                .build()
        } else {
            // Direct TLS/SSL (port 465)
            SmtpTransport::relay(&config.smtp_server)
                .context("Failed to create SMTP relay")?
                .credentials(creds)
                .port(config.smtp_port)
                .build()
        };

        // Send email
        mailer
            .send(&email)
            .context("Failed to send email via SMTP")?;
    }

    Ok(())
}

/// Format email as HTML
fn format_html_email(job: &crate::core::db::Job, score: &crate::core::scoring::JobScore) -> String {
    let salary_display = if let (Some(min), Some(max)) = (job.salary_min, job.salary_max) {
        format!("${},000 - ${},000", min / 1000, max / 1000)
    } else if let Some(min) = job.salary_min {
        format!("${},000+", min / 1000)
    } else {
        "Not specified".to_string()
    };

    let remote_badge = if job.remote.unwrap_or(false) {
        r#"<span style="background: #10b981; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">🌍 REMOTE</span>"#
    } else {
        ""
    };

    format!(
        r#"<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Job Alert</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">🎯 High Match Job Alert</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">JobSentinel found a great opportunity for you</p>
    </div>

    <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none;">
        <div style="background: white; padding: 24px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h2 style="margin: 0 0 16px 0; color: #1f2937; font-size: 20px;">{}</h2>

            <div style="margin-bottom: 16px;">
                <span style="background: #3b82f6; color: white; padding: 6px 12px; border-radius: 16px; font-size: 14px; font-weight: 600;">
                    {} Match
                </span>
                {}
            </div>

            <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
                <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                        <strong style="color: #6b7280;">Company:</strong>
                    </td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                        {}
                    </td>
                </tr>
                <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                        <strong style="color: #6b7280;">Location:</strong>
                    </td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                        {}
                    </td>
                </tr>
                <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                        <strong style="color: #6b7280;">Salary:</strong>
                    </td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                        {}
                    </td>
                </tr>
                <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                        <strong style="color: #6b7280;">Source:</strong>
                    </td>
                    <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                        {}
                    </td>
                </tr>
            </table>

            <div style="margin: 24px 0;">
                <h3 style="margin: 0 0 12px 0; color: #1f2937; font-size: 16px;">Why this matches your preferences:</h3>
                <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
                    {}
                </ul>
            </div>

            <div style="text-align: center; margin-top: 30px;">
                <a href="{}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px;">
                    View Full Job Posting →
                </a>
            </div>
        </div>

        <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px;">
            <p>This alert was sent by <strong>JobSentinel</strong> because this job scored <strong>{:.0}%</strong> match</p>
            <p style="margin-top: 8px; font-size: 12px;">You can adjust your notification preferences in the JobSentinel app settings</p>
        </div>
    </div>
</body>
</html>"#,
        job.title,
        (score.total * 100.0).round(),
        remote_badge,
        job.company,
        job.location.as_deref().unwrap_or("N/A"),
        salary_display,
        job.source,
        score
            .reasons
            .iter()
            .map(|r| format!("<li>{}</li>", r))
            .collect::<Vec<_>>()
            .join("\n                    "),
        job.url,
        score.total * 100.0,
    )
}

/// Format email as plain text (fallback for non-HTML clients)
fn format_text_email(job: &crate::core::db::Job, score: &crate::core::scoring::JobScore) -> String {
    let salary_display = if let (Some(min), Some(max)) = (job.salary_min, job.salary_max) {
        format!("${},000 - ${},000", min / 1000, max / 1000)
    } else if let Some(min) = job.salary_min {
        format!("${},000+", min / 1000)
    } else {
        "Not specified".to_string()
    };

    format!(
        r#"🎯 HIGH MATCH JOB ALERT
{}
Match Score: {:.0}%

COMPANY: {}
LOCATION: {}
SALARY: {}
SOURCE: {}
REMOTE: {}

WHY THIS MATCHES:
{}

VIEW JOB: {}

---
This alert was sent by JobSentinel because this job scored {:.0}% match.
You can adjust your notification preferences in the app settings.
"#,
        job.title,
        score.total * 100.0,
        job.company,
        job.location.as_deref().unwrap_or("N/A"),
        salary_display,
        job.source,
        if job.remote.unwrap_or(false) {
            "Yes"
        } else {
            "No"
        },
        score
            .reasons
            .iter()
            .map(|r| format!("  • {}", r))
            .collect::<Vec<_>>()
            .join("\n"),
        job.url,
        score.total * 100.0,
    )
}

/// Validate email configuration by sending a test email
pub async fn validate_email_config(config: &EmailConfig) -> Result<bool> {
    // Parse addresses
    let from_address: Mailbox = config
        .from_email
        .parse()
        .context("Invalid from email address")?;

    let to_address: Mailbox = config
        .to_emails
        .first()
        .ok_or_else(|| anyhow!("No recipient emails configured"))?
        .parse()
        .context("Invalid recipient email address")?;

    // Build test message
    let email = Message::builder()
        .from(from_address)
        .to(to_address)
        .subject("JobSentinel Email Test")
        .header(ContentType::TEXT_HTML)
        .body(
            r#"<html>
<body style="font-family: Arial, sans-serif; padding: 20px;">
    <h2 style="color: #3b82f6;">✅ Email Configuration Successful!</h2>
    <p>This is a test email from JobSentinel to verify your SMTP settings are working correctly.</p>
    <p>You should now receive job alerts at this email address when high-matching jobs are found.</p>
    <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
    <p style="color: #6b7280; font-size: 14px;">If you did not request this test, please check your JobSentinel settings.</p>
</body>
</html>"#
                .to_string(),
        )
        .context("Failed to build test email")?;

    // Create SMTP client
    let creds = Credentials::new(config.smtp_username.clone(), config.smtp_password.clone());

    let mailer = if config.use_starttls {
        SmtpTransport::starttls_relay(&config.smtp_server)?
            .credentials(creds)
            .port(config.smtp_port)
            .build()
    } else {
        SmtpTransport::relay(&config.smtp_server)?
            .credentials(creds)
            .port(config.smtp_port)
            .build()
    };

    // Send test email
    mailer.send(&email).context("Failed to send test email")?;

    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::{
        db::Job,
        scoring::{JobScore, ScoreBreakdown},
    };
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
    fn test_html_email_formatting() {
        let notification = create_test_notification();
        let html = format_html_email(&notification.job, &notification.score);

        // Verify key components are present
        assert!(html.contains("Senior Rust Engineer"));
        assert!(html.contains("Awesome Corp"));
        assert!(html.contains("95")); // Score percentage
        assert!(html.contains("REMOTE"));
        assert!(html.contains("$180,000 - $220,000"));
        assert!(html.contains("greenhouse"));
        assert!(html.contains("Title matches: Senior Rust Engineer"));
        assert!(html.contains("https://example.com/jobs/123"));
    }

    #[test]
    fn test_text_email_formatting() {
        let notification = create_test_notification();
        let text = format_text_email(&notification.job, &notification.score);

        // Verify key components are present
        assert!(text.contains("Senior Rust Engineer"));
        assert!(text.contains("Awesome Corp"));
        assert!(text.contains("95%"));
        assert!(text.contains("Yes")); // Remote
        assert!(text.contains("$180,000 - $220,000"));
        assert!(text.contains("Title matches: Senior Rust Engineer"));
    }

    #[test]
    fn test_html_email_handles_missing_salary() {
        let mut notification = create_test_notification();
        notification.job.salary_min = None;
        notification.job.salary_max = None;

        let html = format_html_email(&notification.job, &notification.score);
        assert!(html.contains("Not specified"));
    }

    #[test]
    fn test_html_email_handles_min_salary_only() {
        let mut notification = create_test_notification();
        notification.job.salary_max = None;

        let html = format_html_email(&notification.job, &notification.score);
        assert!(html.contains("$180,000+"));
    }

    #[test]
    fn test_html_email_handles_missing_location() {
        let mut notification = create_test_notification();
        notification.job.location = None;

        let html = format_html_email(&notification.job, &notification.score);
        assert!(html.contains("N/A"));
    }

    #[test]
    fn test_html_email_includes_all_reasons() {
        let notification = create_test_notification();
        let html = format_html_email(&notification.job, &notification.score);

        for reason in &notification.score.reasons {
            assert!(
                html.contains(reason),
                "HTML should contain reason: {}",
                reason
            );
        }
    }

    #[test]
    fn test_text_email_includes_all_reasons() {
        let notification = create_test_notification();
        let text = format_text_email(&notification.job, &notification.score);

        for reason in &notification.score.reasons {
            assert!(
                text.contains(reason),
                "Text should contain reason: {}",
                reason
            );
        }
    }

    #[test]
    fn test_text_email_handles_missing_salary() {
        let mut notification = create_test_notification();
        notification.job.salary_min = None;
        notification.job.salary_max = None;

        let text = format_text_email(&notification.job, &notification.score);
        assert!(text.contains("Not specified"));
    }

    #[test]
    fn test_text_email_handles_min_salary_only() {
        let mut notification = create_test_notification();
        notification.job.salary_max = None;

        let text = format_text_email(&notification.job, &notification.score);
        assert!(text.contains("$180,000+"));
    }

    #[test]
    fn test_text_email_handles_missing_location() {
        let mut notification = create_test_notification();
        notification.job.location = None;

        let text = format_text_email(&notification.job, &notification.score);
        assert!(text.contains("N/A"));
    }

    #[test]
    fn test_html_email_no_remote_badge() {
        let mut notification = create_test_notification();
        notification.job.remote = Some(false);

        let html = format_html_email(&notification.job, &notification.score);
        assert!(
            !html.contains("REMOTE"),
            "Non-remote job should not have REMOTE badge"
        );
    }

    #[test]
    fn test_html_email_handles_none_remote() {
        let mut notification = create_test_notification();
        notification.job.remote = None;

        let html = format_html_email(&notification.job, &notification.score);
        assert!(
            !html.contains("REMOTE"),
            "Job with None remote should not have REMOTE badge"
        );
    }

    #[test]
    fn test_text_email_remote_no() {
        let mut notification = create_test_notification();
        notification.job.remote = Some(false);

        let text = format_text_email(&notification.job, &notification.score);
        assert!(text.contains("REMOTE: No"));
    }

    #[test]
    fn test_html_email_score_formatting() {
        let mut notification = create_test_notification();

        // Test various scores
        for (score, expected) in [(0.95, "95"), (0.90, "90"), (1.00, "100"), (0.876, "88")] {
            notification.score.total = score;
            let html = format_html_email(&notification.job, &notification.score);
            assert!(
                html.contains(&format!("{}%", expected)),
                "Score {} should format to {}%",
                score,
                expected
            );
        }
    }

    #[test]
    fn test_text_email_score_formatting() {
        let mut notification = create_test_notification();

        for (score, expected) in [(0.95, "95%"), (0.90, "90%"), (1.00, "100%")] {
            notification.score.total = score;
            let text = format_text_email(&notification.job, &notification.score);
            assert!(
                text.contains(expected),
                "Score {} should format to {}",
                score,
                expected
            );
        }
    }

    #[test]
    fn test_html_email_structure() {
        let notification = create_test_notification();
        let html = format_html_email(&notification.job, &notification.score);

        // Verify HTML structure
        assert!(html.contains("<!DOCTYPE html>"));
        assert!(html.contains("<html>"));
        assert!(html.contains("</html>"));
        assert!(html.contains("<body"));
        assert!(html.contains("</body>"));
    }

    #[test]
    fn test_text_email_structure() {
        let notification = create_test_notification();
        let text = format_text_email(&notification.job, &notification.score);

        // Verify plain text structure
        assert!(text.contains("HIGH MATCH JOB ALERT"));
        assert!(text.contains("COMPANY:"));
        assert!(text.contains("LOCATION:"));
        assert!(text.contains("SALARY:"));
        assert!(text.contains("WHY THIS MATCHES:"));
        assert!(text.contains("VIEW JOB:"));
    }

    #[test]
    fn test_html_email_empty_reasons() {
        let mut notification = create_test_notification();
        notification.score.reasons = vec![];

        let html = format_html_email(&notification.job, &notification.score);
        assert!(
            html.contains("Why this matches"),
            "Should have 'Why this matches' header even with empty reasons"
        );
    }

    #[test]
    fn test_text_email_empty_reasons() {
        let mut notification = create_test_notification();
        notification.score.reasons = vec![];

        let text = format_text_email(&notification.job, &notification.score);
        assert!(
            text.contains("WHY THIS MATCHES:"),
            "Should have 'WHY THIS MATCHES' header even with empty reasons"
        );
    }

    #[test]
    fn test_html_email_url_appears_in_link() {
        let notification = create_test_notification();
        let html = format_html_email(&notification.job, &notification.score);

        // URL should appear in the href attribute
        assert!(html.contains(&format!("href=\"{}\"", notification.job.url)));
    }

    #[test]
    fn test_text_email_url_appears() {
        let notification = create_test_notification();
        let text = format_text_email(&notification.job, &notification.score);

        assert!(text.contains("VIEW JOB: https://example.com/jobs/123"));
    }

    #[test]
    fn test_salary_formatting_edge_cases() {
        // Test with various salary values (note: format! uses comma separator for thousands)
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
    fn test_html_email_with_special_characters() {
        let mut notification = create_test_notification();
        notification.job.title = "Senior Engineer & Tech Lead".to_string();
        notification.job.company = "ABC Corp <New Division>".to_string();

        let html = format_html_email(&notification.job, &notification.score);

        // Should contain the special characters as-is (not HTML-escaped in this implementation)
        assert!(html.contains("Senior Engineer & Tech Lead"));
        assert!(html.contains("ABC Corp <New Division>"));
    }

    #[test]
    fn test_text_email_with_special_characters() {
        let mut notification = create_test_notification();
        notification.job.title = "Senior Engineer & Tech Lead".to_string();
        notification.job.company = "ABC Corp <New Division>".to_string();

        let text = format_text_email(&notification.job, &notification.score);

        assert!(text.contains("Senior Engineer & Tech Lead"));
        assert!(text.contains("ABC Corp <New Division>"));
    }

    #[test]
    fn test_html_email_with_unicode() {
        let mut notification = create_test_notification();
        notification.job.title = "Développeur Senior 🚀".to_string();
        notification.job.company = "Société Française".to_string();
        notification.job.location = Some("Montréal, Québec".to_string());

        let html = format_html_email(&notification.job, &notification.score);

        assert!(html.contains("Développeur Senior 🚀"));
        assert!(html.contains("Société Française"));
        assert!(html.contains("Montréal, Québec"));
    }

    #[test]
    fn test_text_email_with_unicode() {
        let mut notification = create_test_notification();
        notification.job.title = "Entwickler 中文 日本語".to_string();
        notification.job.company = "グローバル株式会社".to_string();

        let text = format_text_email(&notification.job, &notification.score);

        assert!(text.contains("Entwickler 中文 日本語"));
        assert!(text.contains("グローバル株式会社"));
    }

    #[test]
    fn test_html_email_with_long_title() {
        let mut notification = create_test_notification();
        notification.job.title = "Senior Staff Principal Distinguished Principal Architect Lead Engineer Manager Director VP".to_string();

        let html = format_html_email(&notification.job, &notification.score);

        assert!(html.contains("Senior Staff Principal Distinguished"));
    }

    #[test]
    fn test_text_email_with_long_location() {
        let mut notification = create_test_notification();
        notification.job.location = Some(
            "San Francisco Bay Area, California, United States (Remote within PST timezone)"
                .to_string(),
        );

        let text = format_text_email(&notification.job, &notification.score);

        assert!(text.contains("San Francisco Bay Area, California"));
    }

    #[test]
    fn test_html_email_with_newlines_in_reasons() {
        let mut notification = create_test_notification();
        notification.score.reasons = vec![
            "Reason with\nnewline".to_string(),
            "Another reason".to_string(),
        ];

        let html = format_html_email(&notification.job, &notification.score);

        // Should contain the reasons (newlines preserved in HTML)
        assert!(html.contains("Reason with\nnewline"));
        assert!(html.contains("Another reason"));
    }

    #[test]
    fn test_text_email_with_quotes_in_reasons() {
        let mut notification = create_test_notification();
        notification.score.reasons = vec![
            r#"Matches "preferred" keyword"#.to_string(),
            "Uses 'best practices'".to_string(),
        ];

        let text = format_text_email(&notification.job, &notification.score);

        assert!(text.contains(r#"Matches "preferred" keyword"#));
        assert!(text.contains("Uses 'best practices'"));
    }

    #[test]
    fn test_html_email_score_boundary_values() {
        let mut notification = create_test_notification();

        // Test boundary scores
        let test_cases = vec![
            (0.0, "0"),
            (0.01, "1"),
            (0.49, "49"),
            (0.50, "50"),
            (0.999, "100"),
            (0.994, "99"),
            (0.995, "100"),
        ];

        for (score, expected) in test_cases {
            notification.score.total = score;
            let html = format_html_email(&notification.job, &notification.score);
            assert!(
                html.contains(expected),
                "Score {} should contain '{}' in HTML",
                score,
                expected
            );
        }
    }

    #[test]
    fn test_text_email_score_boundary_values() {
        let mut notification = create_test_notification();

        let test_cases = vec![(0.0, "0%"), (0.01, "1%"), (0.50, "50%"), (0.999, "100%")];

        for (score, expected) in test_cases {
            notification.score.total = score;
            let text = format_text_email(&notification.job, &notification.score);
            assert!(
                text.contains(expected),
                "Score {} should format to {}",
                score,
                expected
            );
        }
    }

    #[test]
    fn test_html_email_url_with_query_params() {
        let mut notification = create_test_notification();
        notification.job.url =
            "https://example.com/jobs/123?utm_source=jobsentinel&ref=alert".to_string();

        let html = format_html_email(&notification.job, &notification.score);

        assert!(
            html.contains("href=\"https://example.com/jobs/123?utm_source=jobsentinel&ref=alert\"")
        );
    }

    #[test]
    fn test_text_email_url_with_fragments() {
        let mut notification = create_test_notification();
        notification.job.url = "https://example.com/careers#senior-engineer-role".to_string();

        let text = format_text_email(&notification.job, &notification.score);

        assert!(text.contains("https://example.com/careers#senior-engineer-role"));
    }

    #[test]
    fn test_html_email_multiple_reasons_formatting() {
        let mut notification = create_test_notification();
        notification.score.reasons = vec![
            "First reason".to_string(),
            "Second reason".to_string(),
            "Third reason".to_string(),
            "Fourth reason".to_string(),
            "Fifth reason".to_string(),
        ];

        let html = format_html_email(&notification.job, &notification.score);

        // Each reason should be in an <li> tag
        for reason in &notification.score.reasons {
            assert!(html.contains(&format!("<li>{}</li>", reason)));
        }
    }

    #[test]
    fn test_text_email_multiple_reasons_formatting() {
        let mut notification = create_test_notification();
        notification.score.reasons = vec![
            "First reason".to_string(),
            "Second reason".to_string(),
            "Third reason".to_string(),
        ];

        let text = format_text_email(&notification.job, &notification.score);

        // Each reason should have bullet point
        for reason in &notification.score.reasons {
            assert!(text.contains(&format!("  • {}", reason)));
        }
    }

    #[test]
    fn test_html_email_single_reason() {
        let mut notification = create_test_notification();
        notification.score.reasons = vec!["Only one reason".to_string()];

        let html = format_html_email(&notification.job, &notification.score);

        assert!(html.contains("<li>Only one reason</li>"));
    }

    #[test]
    fn test_text_email_single_reason() {
        let mut notification = create_test_notification();
        notification.score.reasons = vec!["Only one reason".to_string()];

        let text = format_text_email(&notification.job, &notification.score);

        assert!(text.contains("  • Only one reason"));
    }

    #[test]
    fn test_html_email_contains_meta_tags() {
        let notification = create_test_notification();
        let html = format_html_email(&notification.job, &notification.score);

        // Verify HTML meta tags for proper rendering
        assert!(html.contains(r#"<meta charset="UTF-8">"#));
        assert!(html
            .contains(r#"<meta name="viewport" content="width=device-width, initial-scale=1.0">"#));
    }

    #[test]
    fn test_html_email_contains_styling() {
        let notification = create_test_notification();
        let html = format_html_email(&notification.job, &notification.score);

        // Verify inline CSS styles are present
        assert!(html.contains("font-family:"));
        assert!(html.contains("background:"));
        assert!(html.contains("padding:"));
        assert!(html.contains("border-radius:"));
    }

    #[test]
    fn test_html_email_gradient_header() {
        let notification = create_test_notification();
        let html = format_html_email(&notification.job, &notification.score);

        // Verify gradient background is present
        assert!(html.contains("linear-gradient"));
        assert!(html.contains("#667eea"));
        assert!(html.contains("#764ba2"));
    }

    #[test]
    fn test_html_email_call_to_action_button() {
        let notification = create_test_notification();
        let html = format_html_email(&notification.job, &notification.score);

        // Verify CTA button is present with proper styling
        assert!(html.contains("View Full Job Posting"));
        assert!(html.contains("display: inline-block"));
        assert!(html.contains("text-decoration: none"));
    }

    #[test]
    fn test_html_email_source_field() {
        let mut notification = create_test_notification();
        notification.job.source = "linkedin".to_string();

        let html = format_html_email(&notification.job, &notification.score);

        assert!(html.contains("linkedin"));
        assert!(html.contains("Source:"));
    }

    #[test]
    fn test_text_email_source_field() {
        let mut notification = create_test_notification();
        notification.job.source = "indeed".to_string();

        let text = format_text_email(&notification.job, &notification.score);

        assert!(text.contains("SOURCE: indeed"));
    }

    #[test]
    fn test_html_email_remote_badge_styling() {
        let notification = create_test_notification();
        let html = format_html_email(&notification.job, &notification.score);

        // Verify remote badge has green background
        assert!(html.contains("#10b981"));
        assert!(html.contains("🌍 REMOTE"));
    }

    #[test]
    fn test_html_email_match_score_badge() {
        let notification = create_test_notification();
        let html = format_html_email(&notification.job, &notification.score);

        // Verify match score badge styling
        assert!(html.contains("#3b82f6")); // Blue badge color
        assert!(html.contains("95 Match"));
    }

    #[test]
    fn test_text_email_formatting_separators() {
        let notification = create_test_notification();
        let text = format_text_email(&notification.job, &notification.score);

        // Verify text formatting separators
        assert!(text.contains("---"));
        assert!(text.contains("COMPANY:"));
        assert!(text.contains("LOCATION:"));
        assert!(text.contains("SALARY:"));
    }

    #[test]
    fn test_html_email_table_structure() {
        let notification = create_test_notification();
        let html = format_html_email(&notification.job, &notification.score);

        // Verify table structure for job details
        assert!(html.contains("<table"));
        assert!(html.contains("</table>"));
        assert!(html.contains("<tr>"));
        assert!(html.contains("</tr>"));
        assert!(html.contains("<td"));
        assert!(html.contains("</td>"));
    }

    #[test]
    fn test_html_email_footer_text() {
        let notification = create_test_notification();
        let html = format_html_email(&notification.job, &notification.score);

        // Verify footer messaging
        assert!(html.contains("This alert was sent by"));
        assert!(html.contains("JobSentinel"));
        assert!(html.contains("You can adjust your notification preferences"));
    }

    #[test]
    fn test_text_email_footer_text() {
        let notification = create_test_notification();
        let text = format_text_email(&notification.job, &notification.score);

        // Verify footer messaging
        assert!(text.contains("This alert was sent by JobSentinel"));
        assert!(text.contains("You can adjust your notification preferences"));
    }

    #[test]
    fn test_html_email_with_empty_string_location() {
        let mut notification = create_test_notification();
        notification.job.location = Some("".to_string());

        let html = format_html_email(&notification.job, &notification.score);

        // Empty string should be used as-is, not replaced with N/A
        assert!(html.contains("<td style=\"padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;\">\n                        \n                    </td>"));
    }

    #[test]
    fn test_text_email_with_empty_string_location() {
        let mut notification = create_test_notification();
        notification.job.location = Some("".to_string());

        let text = format_text_email(&notification.job, &notification.score);

        // Empty string should be used as-is
        assert!(text.contains("LOCATION: "));
    }

    #[test]
    fn test_salary_formatting_large_values() {
        let mut notification = create_test_notification();
        notification.job.salary_min = Some(500000);
        notification.job.salary_max = Some(800000);

        let html = format_html_email(&notification.job, &notification.score);

        assert!(html.contains("$500,000 - $800,000"));
    }

    #[test]
    fn test_salary_formatting_small_values() {
        let mut notification = create_test_notification();
        notification.job.salary_min = Some(30000);
        notification.job.salary_max = Some(50000);

        let text = format_text_email(&notification.job, &notification.score);

        assert!(text.contains("$30,000 - $50,000"));
    }

    #[test]
    fn test_html_email_reason_with_html_like_text() {
        let mut notification = create_test_notification();
        notification.score.reasons =
            vec!["Matches <keyword>".to_string(), "Has & symbol".to_string()];

        let html = format_html_email(&notification.job, &notification.score);

        // Should preserve the text as-is (no HTML escaping in this implementation)
        assert!(html.contains("Matches <keyword>"));
        assert!(html.contains("Has & symbol"));
    }

    #[test]
    fn test_text_email_preserves_exact_formatting() {
        let notification = create_test_notification();
        let text = format_text_email(&notification.job, &notification.score);

        // Verify exact format structure
        assert!(text.starts_with("🎯 HIGH MATCH JOB ALERT"));
        assert!(text.contains("\n\nCOMPANY:"));
        assert!(text.contains("\n\nWHY THIS MATCHES:"));
    }

    #[test]
    fn test_html_email_with_zero_salary() {
        let mut notification = create_test_notification();
        notification.job.salary_min = Some(0);
        notification.job.salary_max = Some(0);

        let html = format_html_email(&notification.job, &notification.score);

        assert!(html.contains("$0,000 - $0,000"));
    }

    #[test]
    fn test_html_email_emojis_preserved() {
        let notification = create_test_notification();
        let html = format_html_email(&notification.job, &notification.score);

        // Verify emojis are preserved
        assert!(html.contains("🎯"));
    }

    #[test]
    fn test_text_email_emojis_preserved() {
        let notification = create_test_notification();
        let text = format_text_email(&notification.job, &notification.score);

        assert!(text.contains("🎯"));
    }
}
