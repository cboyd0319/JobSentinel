//! Notification formatting and bounded delivery transports.

mod config;
mod discord;
mod email;
mod slack;
mod teams;
mod telegram;

use jobsentinel_domain::{v3_contracts::PayPeriod, Job, ListedPay};
use jobsentinel_intelligence::JobScore;
use jobsentinel_network::ExternalTextResponse;
use jobsentinel_security::canonicalize_user_supplied_job_url;
use serde::{Deserialize, Serialize};
use std::time::Duration;

pub use config::{
    AlertConfig, DesktopConfig, DiscordConfig, EmailConfig, SlackConfig, TeamsConfig,
    TelegramConfig,
};
pub use discord::send_discord_notification;
pub use email::{send_email_notification, validate_email_config};
pub use slack::{send_slack_notification, validate_webhook as validate_slack_webhook};
pub use teams::send_teams_notification;
pub use telegram::send_telegram_notification;

#[cfg(any(test, feature = "test-support"))]
pub mod test_support;

/// A scored job ready for delivery through one or more alert channels.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Notification {
    pub job: Job,
    pub score: JobScore,
}

pub(crate) const LOCAL_MATCH_DETAILS_MESSAGE: &str =
    "Open JobSentinel to review match details saved on this computer.";
pub(crate) const LOCAL_JOB_LINK_MESSAGE: &str = "Open JobSentinel to view the saved job link.";
pub(crate) const NOTIFICATION_HTTP_TIMEOUT: Duration = Duration::from_secs(10);

pub(crate) fn format_salary_range(job: &Job) -> String {
    if let Some(listed_pay) = &job.listed_pay {
        return listed_pay
            .format_amounts()
            .unwrap_or_else(|| "Review pay in JobSentinel.".to_string());
    }

    let (min, max) = (job.salary_min, job.salary_max);
    if min.is_none() && max.is_none() {
        return "Not specified".to_string();
    }

    const MAX_EXACT_F64_INTEGER: i64 = (1_i64 << 53) - 1;
    if [min, max]
        .into_iter()
        .flatten()
        .any(|amount| !(0..=MAX_EXACT_F64_INTEGER).contains(&amount))
    {
        return "Review pay in JobSentinel.".to_string();
    }

    ListedPay {
        min: min.map(|amount| amount as f64),
        max: max.map(|amount| amount as f64),
        currency: job.currency.clone(),
        period: PayPeriod::NotDisclosed,
        qualifiers: Vec::new(),
        raw_text: None,
    }
    .format_amounts()
    .unwrap_or_else(|| "Review pay in JobSentinel.".to_string())
}

#[must_use]
pub fn notification_job_href(url: &str) -> Option<String> {
    canonicalize_user_supplied_job_url(url).ok()
}

pub(crate) fn notification_provider_failure_summary(response: &ExternalTextResponse) -> String {
    let body_chars = response.body.chars().count();
    format!(
        "status {}; provider error body omitted ({} chars)",
        response.status, body_chars
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_support::notification_fixture;
    use jobsentinel_domain::{v3_contracts::PayPeriod, ListedPay, PayQualifier};

    #[test]
    fn legacy_notifications_do_not_invent_a_pay_period() {
        let mut job = notification_fixture().job;
        job.listed_pay = None;
        job.currency = Some("EUR".to_string());
        job.salary_min = Some(50_000);
        job.salary_max = Some(60_000);
        let formatted = format_salary_range(&job);
        assert!(!formatted.contains("annual"));
        assert!(formatted.contains("period not disclosed"));
        assert!(formatted.contains("50000–60000"));
    }

    #[test]
    fn provider_failure_summary_omits_error_body() {
        let secret_body = "Care Coordinator at Community Care Network https://example.com/jobs/123";
        let response = ExternalTextResponse {
            status: 400,
            body: secret_body.to_string(),
            redirect_location: None,
        };

        let summary = notification_provider_failure_summary(&response);

        assert_eq!(
            summary,
            format!(
                "status 400; provider error body omitted ({} chars)",
                secret_body.chars().count()
            )
        );
        assert!(!summary.contains("Care Coordinator"));
        assert!(!summary.contains("Community Care Network"));
    }

    #[test]
    fn salary_range_uses_native_evidence_or_safe_legacy_context() {
        let mut job = notification_fixture().job;
        job.listed_pay = Some(ListedPay {
            min: Some(5_000.0),
            max: Some(7_000.0),
            currency: Some("EUR".to_string()),
            period: PayPeriod::Monthly,
            qualifiers: Vec::new(),
            raw_text: Some("€5,000–€7,000 monthly".to_string()),
        });
        assert_eq!(format_salary_range(&job), "EUR 5000–7000 monthly");

        job.listed_pay = Some(ListedPay {
            min: Some(2_400_000.0),
            max: None,
            currency: Some("INR".to_string()),
            period: PayPeriod::Annual,
            qualifiers: vec![PayQualifier::Ctc],
            raw_text: Some("₹24,00,000 CTC".to_string()),
        });
        assert_eq!(format_salary_range(&job), "INR From 2400000 annual (ctc)");

        job.listed_pay = Some(ListedPay {
            min: None,
            max: Some(220_456.0),
            currency: Some("USD".to_string()),
            period: PayPeriod::Annual,
            qualifiers: Vec::new(),
            raw_text: None,
        });
        assert_eq!(format_salary_range(&job), "USD Up to 220456 annual");

        job.listed_pay = None;
        job.salary_min = Some(180_123);
        job.salary_max = Some(220_456);
        job.currency = Some("USD".to_string());
        assert_eq!(
            format_salary_range(&job),
            "USD 180123–220456 period not disclosed"
        );

        job.currency = None;
        assert_eq!(
            format_salary_range(&job),
            "Currency unknown 180123–220456 period not disclosed"
        );

        job.salary_min = None;
        job.salary_max = Some(220_456);
        job.currency = Some("USD".to_string());
        assert_eq!(
            format_salary_range(&job),
            "USD Up to 220456 period not disclosed"
        );
    }

    #[test]
    fn salary_range_never_emits_raw_only_or_invalid_native_pay() {
        let mut job = notification_fixture().job;
        job.listed_pay = Some(ListedPay {
            min: None,
            max: None,
            currency: Some("USD".to_string()),
            period: PayPeriod::NotDisclosed,
            qualifiers: Vec::new(),
            raw_text: Some("<script>alert('pay')</script>".to_string()),
        });

        let formatted = format_salary_range(&job);
        assert_eq!(formatted, "Review pay in JobSentinel.");
        assert!(!formatted.contains("script"));

        job.listed_pay = Some(ListedPay {
            min: Some(100.0),
            max: None,
            currency: Some("usd".to_string()),
            period: PayPeriod::Annual,
            qualifiers: Vec::new(),
            raw_text: None,
        });
        assert_eq!(format_salary_range(&job), "Review pay in JobSentinel.");
    }
}
