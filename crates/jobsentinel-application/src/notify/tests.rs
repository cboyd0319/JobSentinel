use super::*;
use crate::{
    config::{AlertConfig, DiscordConfig, EmailConfig, SlackConfig, TeamsConfig, TelegramConfig},
    credentials::{
        encode_smtp_password, CredentialKey, CredentialService, SmtpCredentialBinding,
        SMTP_CREDENTIAL_REENTRY_REQUIRED,
    },
    scoring::ScoreBreakdown,
};
use jobsentinel_notifications::test_support::notification_fixture;
use jobsentinel_storage::Database;

/// Build a disabled config.
fn create_disabled_config() -> Arc<Config> {
    let mut config = crate::test_support::minimal_test_config();
    config.auto_refresh.enabled = false;
    config.immediate_alert_threshold = 0.9;
    config.jobswithgpt_endpoint.clear();
    config.alerts = AlertConfig {
        slack: SlackConfig {
            enabled: false,
            webhook_url: String::new(),
        },
        email: EmailConfig {
            enabled: false,
            smtp_server: String::new(),
            smtp_port: 587,
            smtp_username: String::new(),
            smtp_password: String::new(),
            from_email: String::new(),
            to_emails: vec![],
            use_starttls: true,
        },
        discord: DiscordConfig {
            enabled: false,
            webhook_url: String::new(),
            user_id_to_mention: None,
        },
        telegram: TelegramConfig {
            enabled: false,
            bot_token: String::new(),
            chat_id: String::new(),
        },
        teams: TeamsConfig {
            enabled: false,
            webhook_url: String::new(),
        },
        desktop: crate::config::DesktopConfig {
            enabled: false,
            show_when_focused: false,
            play_sound: false,
        },
    };
    Arc::new(config)
}

#[test]
fn test_notification_serialization() {
    let notification = notification_fixture();

    // Test that Notification can be serialized to JSON
    let json = serde_json::to_string(&notification).expect("Should serialize");
    assert!(json.contains("Care Coordinator"));
    assert!(json.contains("Community Care Network"));

    // Test deserialization
    let deserialized: Notification = serde_json::from_str(&json).expect("Should deserialize");
    assert_eq!(deserialized.job.title, notification.job.title);
    assert_eq!(deserialized.score.total, notification.score.total);
}

#[test]
fn test_notification_service_creation() {
    let config = create_disabled_config();
    let _service = NotificationService::new(config.clone());

    // Verify service holds the config
    assert_eq!(Arc::strong_count(&config), 2); // One in service, one in test
}

#[test]
fn test_notification_with_missing_optional_fields() {
    let mut notification = notification_fixture();
    notification.job.location = None;
    notification.job.description = None;
    notification.job.salary_min = None;
    notification.job.salary_max = None;
    notification.job.currency = None;
    notification.job.remote = None;

    // Should serialize without errors
    let json = serde_json::to_string(&notification).expect("Should serialize with missing fields");

    // Verify JSON was created
    assert!(!json.is_empty(), "JSON should not be empty");

    // Deserialize to verify round-trip works
    let deserialized: Notification =
        serde_json::from_str(&json).expect("Should deserialize with missing fields");
    assert_eq!(deserialized.job.location, None);
    assert_eq!(deserialized.job.description, None);
    assert_eq!(deserialized.job.salary_min, None);
    assert_eq!(deserialized.job.salary_max, None);
    assert_eq!(deserialized.job.currency, None);
    assert_eq!(deserialized.job.remote, None);
}

#[test]
fn test_score_breakdown_sums_correctly() {
    let notification = notification_fixture();
    let breakdown = &notification.score.breakdown;

    let sum = breakdown.skills
        + breakdown.salary
        + breakdown.location
        + breakdown.company
        + breakdown.recency;

    // Should sum to approximately the total score (allowing for floating point precision)
    // Note: breakdown doesn't necessarily sum to 1.0, but to the total score
    assert!(
        (sum - notification.score.total).abs() < 0.001,
        "Breakdown should sum to total score {}, got {}",
        notification.score.total,
        sum
    );
}

#[test]
fn test_score_reasons_not_empty() {
    let notification = notification_fixture();

    assert!(
        !notification.score.reasons.is_empty(),
        "Score reasons should not be empty"
    );
    assert!(
        notification.score.reasons.len() >= 1,
        "Should have at least one reason"
    );
}

#[test]
fn test_job_hash_uniqueness() {
    let notification1 = notification_fixture();
    let mut notification2 = notification_fixture();
    notification2.job.hash = "different_hash".to_string();

    assert_ne!(
        notification1.job.hash, notification2.job.hash,
        "Different jobs should have different hashes"
    );
}

#[test]
fn test_notification_clone() {
    let notification = notification_fixture();
    let cloned = notification.clone();

    assert_eq!(notification.job.title, cloned.job.title);
    assert_eq!(notification.score.total, cloned.score.total);
    assert_eq!(notification.job.hash, cloned.job.hash);
}

#[test]
fn test_notification_debug_format() {
    let notification = notification_fixture();
    let debug_str = format!("{:?}", notification);

    // Debug format should include key fields
    assert!(debug_str.contains("Notification"));
}

#[test]
fn test_salary_range_validation() {
    let notification = notification_fixture();

    if let (Some(min), Some(max)) = (notification.job.salary_min, notification.job.salary_max) {
        assert!(max >= min, "Max salary should be >= min salary");
    }
}

#[test]
fn test_score_total_in_valid_range() {
    let notification = notification_fixture();

    assert!(notification.score.total >= 0.0, "Score should be >= 0.0");
    assert!(notification.score.total <= 1.0, "Score should be <= 1.0");
}

#[test]
fn test_score_breakdown_in_valid_ranges() {
    let notification = notification_fixture();
    let breakdown = &notification.score.breakdown;

    assert!(breakdown.skills >= 0.0 && breakdown.skills <= 1.0);
    assert!(breakdown.salary >= 0.0 && breakdown.salary <= 1.0);
    assert!(breakdown.location >= 0.0 && breakdown.location <= 1.0);
    assert!(breakdown.company >= 0.0 && breakdown.company <= 1.0);
    assert!(breakdown.recency >= 0.0 && breakdown.recency <= 1.0);
}

#[test]
fn test_notification_with_zero_score() {
    let mut notification = notification_fixture();
    notification.score.total = 0.0;
    notification.score.breakdown = ScoreBreakdown {
        skills: 0.0,
        salary: 0.0,
        location: 0.0,
        company: 0.0,
        recency: 0.0,
    };
    notification.score.reasons = vec!["No matches found".to_string()];

    assert_eq!(notification.score.total, 0.0);
    assert!(!notification.score.reasons.is_empty());
}

#[test]
fn test_notification_url_validation() {
    let notification = notification_fixture();

    // URL should be parseable
    assert!(
        url::Url::parse(&notification.job.url).is_ok(),
        "Job URL should be valid"
    );
}

#[test]
fn test_notification_job_href_minimizes_private_url_parts() {
    let href = notification_job_href(
        "https://example.com/jobs?utm_source=alert&gh_jid=123&token=secret&candidate_email=person@example.com#private",
    )
    .expect("public job link should be usable");

    assert_eq!(href, "https://example.com/jobs?gh_jid=123");
    assert!(!href.contains("utm_source"));
    assert!(!href.contains("token"));
    assert!(!href.contains("candidate_email"));
    assert!(!href.contains("person@example.com"));
    assert!(!href.contains("private"));
}

#[test]
fn test_notification_job_href_omits_non_public_links() {
    assert!(notification_job_href("http://localhost:3000/private?token=secret").is_none());
    assert!(notification_job_href("javascript:alert(1)").is_none());
}

#[test]
fn test_notification_timestamps_logical() {
    let notification = notification_fixture();

    // created_at should be <= updated_at
    assert!(notification.job.created_at <= notification.job.updated_at);

    // last_seen should be >= created_at
    assert!(notification.job.last_seen >= notification.job.created_at);
}

#[tokio::test]
async fn test_send_immediate_alert_all_channels_disabled() {
    let config = create_disabled_config();
    let service = NotificationService::new(config);
    let notification = notification_fixture();

    // Should succeed when no channels are enabled (nothing to do)
    let result = service.send_immediate_alert(&notification).await;
    assert!(result.is_ok(), "Should succeed when all channels disabled");
}

mod service_and_failure_tests;

mod channel_edge_cases;
