use super::*;

#[test]
fn test_enabled_channel_counting_all_disabled() {
    let config = create_disabled_config();

    let enabled_count = [
        config.alerts.slack.enabled,
        config.alerts.email.enabled,
        config.alerts.discord.enabled,
        config.alerts.telegram.enabled,
        config.alerts.teams.enabled,
    ]
    .iter()
    .filter(|&&e| e)
    .count();

    assert_eq!(enabled_count, 0, "All channels should be disabled");
}

#[test]
fn test_enabled_channel_counting_slack_only() {
    let mut config = create_disabled_config();
    Arc::get_mut(&mut config).unwrap().alerts.slack.enabled = true;

    let enabled_count = [
        config.alerts.slack.enabled,
        config.alerts.email.enabled,
        config.alerts.discord.enabled,
        config.alerts.telegram.enabled,
        config.alerts.teams.enabled,
    ]
    .iter()
    .filter(|&&e| e)
    .count();

    assert_eq!(enabled_count, 1, "Only Slack should be enabled");
}

#[test]
fn test_enabled_channel_counting_multiple() {
    let mut config = create_disabled_config();
    let config_mut = Arc::get_mut(&mut config).unwrap();
    config_mut.alerts.slack.enabled = true;
    config_mut.alerts.discord.enabled = true;
    config_mut.alerts.teams.enabled = true;

    let enabled_count = [
        config.alerts.slack.enabled,
        config.alerts.email.enabled,
        config.alerts.discord.enabled,
        config.alerts.telegram.enabled,
        config.alerts.teams.enabled,
    ]
    .iter()
    .filter(|&&e| e)
    .count();

    assert_eq!(enabled_count, 3, "Three channels should be enabled");
}

#[test]
fn test_enabled_channel_counting_all_enabled() {
    let mut config = create_disabled_config();
    let config_mut = Arc::get_mut(&mut config).unwrap();
    config_mut.alerts.slack.enabled = true;
    config_mut.alerts.email.enabled = true;
    config_mut.alerts.discord.enabled = true;
    config_mut.alerts.telegram.enabled = true;
    config_mut.alerts.teams.enabled = true;

    let enabled_count = [
        config.alerts.slack.enabled,
        config.alerts.email.enabled,
        config.alerts.discord.enabled,
        config.alerts.telegram.enabled,
        config.alerts.teams.enabled,
    ]
    .iter()
    .filter(|&&e| e)
    .count();

    assert_eq!(enabled_count, 5, "All five channels should be enabled");
}

#[test]
fn test_notification_service_config_immutability() {
    let config = create_disabled_config();
    let service = NotificationService::new(config.clone());

    // Service should hold a reference to the same config
    assert_eq!(
        service.config.immediate_alert_threshold,
        config.immediate_alert_threshold
    );
    assert_eq!(service.config.salary_floor_usd, config.salary_floor_usd);
}

#[test]
fn test_notification_service_checks_slack_enabled() {
    let mut config = create_disabled_config();
    Arc::get_mut(&mut config).unwrap().alerts.slack.enabled = true;

    let service = NotificationService::new(config);

    assert!(
        service.config.alerts.slack.enabled,
        "Slack should be enabled"
    );
    assert!(
        !service.config.alerts.email.enabled,
        "Email should remain disabled"
    );
}

#[test]
fn test_notification_service_checks_email_enabled() {
    let mut config = create_disabled_config();
    Arc::get_mut(&mut config).unwrap().alerts.email.enabled = true;

    let service = NotificationService::new(config);

    assert!(
        service.config.alerts.email.enabled,
        "Email should be enabled"
    );
    assert!(
        !service.config.alerts.slack.enabled,
        "Slack should remain disabled"
    );
}

async fn test_credentials() -> CredentialService {
    let database = Database::connect_memory().await.unwrap();
    database.migrate().await.unwrap();
    CredentialService::with_fixed_master_key(database.credentials(), [22_u8; 32], false)
}

fn email_config_for(server: &str, username: &str) -> EmailConfig {
    EmailConfig {
        enabled: true,
        smtp_server: server.to_string(),
        smtp_port: 587,
        smtp_username: username.to_string(),
        smtp_password: String::new(),
        from_email: "from@example.com".to_string(),
        to_emails: vec!["to@example.com".to_string()],
        use_starttls: true,
    }
}

#[tokio::test]
async fn runtime_email_resolution_rejects_changed_smtp_binding() {
    let credentials = test_credentials().await;
    let stored = encode_smtp_password(
        "smtp-secret",
        SmtpCredentialBinding::new("smtp.example.com", 587, "user@example.com"),
    )
    .unwrap();
    credentials
        .store(CredentialKey::SmtpPassword, &stored)
        .await
        .unwrap();

    let changed = email_config_for("attacker.example.com", "user@example.com");
    let err = resolve_smtp_password_for_email_config(&changed, &credentials)
        .await
        .unwrap_err()
        .to_string();

    assert_eq!(err, SMTP_CREDENTIAL_REENTRY_REQUIRED);
    assert!(!err.contains("smtp-secret"));
}

#[tokio::test]
async fn runtime_email_resolution_rejects_legacy_unbound_smtp_password() {
    let credentials = test_credentials().await;
    credentials
        .store(CredentialKey::SmtpPassword, "smtp-secret")
        .await
        .unwrap();

    let config = email_config_for("smtp.example.com", "user@example.com");
    let err = resolve_smtp_password_for_email_config(&config, &credentials)
        .await
        .unwrap_err()
        .to_string();

    assert_eq!(err, SMTP_CREDENTIAL_REENTRY_REQUIRED);
    assert!(!err.contains("smtp-secret"));
}

#[test]
fn test_notification_service_checks_discord_enabled() {
    let mut config = create_disabled_config();
    Arc::get_mut(&mut config).unwrap().alerts.discord.enabled = true;

    let service = NotificationService::new(config);

    assert!(
        service.config.alerts.discord.enabled,
        "Discord should be enabled"
    );
    assert!(
        !service.config.alerts.telegram.enabled,
        "Telegram should remain disabled"
    );
}

#[test]
fn test_notification_service_checks_telegram_enabled() {
    let mut config = create_disabled_config();
    Arc::get_mut(&mut config).unwrap().alerts.telegram.enabled = true;

    let service = NotificationService::new(config);

    assert!(
        service.config.alerts.telegram.enabled,
        "Telegram should be enabled"
    );
    assert!(
        !service.config.alerts.teams.enabled,
        "Teams should remain disabled"
    );
}

#[test]
fn test_notification_service_checks_teams_enabled() {
    let mut config = create_disabled_config();
    Arc::get_mut(&mut config).unwrap().alerts.teams.enabled = true;

    let service = NotificationService::new(config);

    assert!(
        service.config.alerts.teams.enabled,
        "Teams should be enabled"
    );
    assert!(
        !service.config.alerts.slack.enabled,
        "Slack should remain disabled"
    );
}

#[test]
fn test_error_message_format_single_channel() {
    let errors = vec!["Slack: delivery failed".to_string()];
    let error_msg = format!("All notification channels failed: {}", errors.join("; "));

    assert!(error_msg.contains("Slack"));
    assert!(error_msg.contains("delivery failed"));
    assert!(
        !error_msg.contains(";;"),
        "Should not have double semicolons"
    );
}

#[test]
fn test_error_message_format_multiple_channels() {
    let errors = vec![
        "Slack: delivery failed".to_string(),
        "Email: credential unavailable".to_string(),
        "Discord: not configured".to_string(),
    ];
    let error_msg = format!("All notification channels failed: {}", errors.join("; "));

    assert!(error_msg.contains("Slack"));
    assert!(error_msg.contains("Email"));
    assert!(error_msg.contains("Discord"));
    assert!(error_msg.contains("; "), "Should have semicolon separators");
    assert_eq!(
        error_msg.matches("; ").count(),
        2,
        "Should have exactly 2 separators for 3 errors"
    );
}

#[test]
fn test_error_collection_empty() {
    let errors: Vec<String> = Vec::new();

    assert!(errors.is_empty(), "Error collection should start empty");
    assert_eq!(errors.len(), 0, "Length should be zero");
}

#[test]
fn test_error_collection_accumulation() {
    let mut errors: Vec<String> = Vec::new();

    errors.push("Slack: delivery failed".to_string());
    assert_eq!(errors.len(), 1);

    errors.push("Email: credential unavailable".to_string());
    assert_eq!(errors.len(), 2);

    errors.push("Discord: not configured".to_string());
    assert_eq!(errors.len(), 3);
}

#[test]
fn test_notification_failure_records_are_sanitized() {
    let mut errors = Vec::new();

    record_notification_delivery_failure(&mut errors, "Slack");
    record_notification_configuration_missing(&mut errors, "Telegram");
    record_notification_credential_failure(&mut errors, "Email");

    assert_eq!(
        errors,
        vec![
            "Slack: delivery failed",
            "Telegram: not configured",
            "Email: credential unavailable",
        ]
    );

    let joined = errors.join("; ");
    assert!(!joined.contains("https://"));
    assert!(!joined.contains("token"));
    assert!(!joined.contains("password"));
    assert!(!joined.contains("webhook"));
}

#[test]
fn test_partial_failure_condition() {
    let errors = vec!["Slack: delivery failed".to_string()];
    let enabled_count = 3; // Slack, Email, Discord enabled

    // Partial failure (1 error out of 3 enabled channels)
    let is_total_failure = errors.len() == enabled_count;
    assert!(
        !is_total_failure,
        "Should not be total failure when only 1 of 3 failed"
    );
}

#[test]
fn test_total_failure_condition() {
    let errors = vec![
        "Slack: delivery failed".to_string(),
        "Email: credential unavailable".to_string(),
        "Discord: not configured".to_string(),
    ];
    let enabled_count = 3;

    // Total failure (all 3 enabled channels failed)
    let is_total_failure = errors.len() == enabled_count;
    assert!(
        is_total_failure,
        "Should be total failure when all enabled channels failed"
    );
}

#[test]
fn test_notification_with_high_score() {
    let mut notification = create_test_notification();
    notification.score.total = 0.98;

    assert!(notification.score.total > 0.9, "Should be high-scoring job");
    assert!(
        notification.score.total <= 1.0,
        "Should not exceed maximum score"
    );
}

#[test]
fn test_notification_with_threshold_score() {
    let mut notification = create_test_notification();
    let config = create_disabled_config();

    notification.score.total = config.immediate_alert_threshold;

    assert_eq!(
        notification.score.total, config.immediate_alert_threshold,
        "Score should exactly match threshold"
    );
}

#[test]
fn test_notification_above_threshold() {
    let mut notification = create_test_notification();
    let config = create_disabled_config();

    notification.score.total = config.immediate_alert_threshold + 0.01;

    assert!(
        notification.score.total > config.immediate_alert_threshold,
        "Score should be above threshold"
    );
}

#[test]
fn test_notification_below_threshold() {
    let mut notification = create_test_notification();
    let config = create_disabled_config();

    notification.score.total = config.immediate_alert_threshold - 0.01;

    assert!(
        notification.score.total < config.immediate_alert_threshold,
        "Score should be below threshold"
    );
}

#[test]
fn test_webhook_url_empty_when_disabled() {
    let config = create_disabled_config();

    assert!(!config.alerts.slack.enabled);
    assert!(config.alerts.slack.webhook_url.is_empty());

    assert!(!config.alerts.discord.enabled);
    assert!(config.alerts.discord.webhook_url.is_empty());

    assert!(!config.alerts.teams.enabled);
    assert!(config.alerts.teams.webhook_url.is_empty());
}
