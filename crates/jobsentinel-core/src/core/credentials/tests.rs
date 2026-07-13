use super::*;

#[test]
fn test_credential_key_roundtrip() {
    for key in CredentialKey::all() {
        let s = key.as_str();
        assert!(!s.is_empty());
        assert!(s.starts_with("jobsentinel_"));
    }
}

#[test]
fn test_credential_key_from_str() {
    assert_eq!(
        "smtp_password".parse::<CredentialKey>().unwrap(),
        CredentialKey::SmtpPassword
    );
    assert_eq!(
        "jobsentinel_slack_webhook"
            .parse::<CredentialKey>()
            .unwrap(),
        CredentialKey::SlackWebhook
    );
    assert!("unknown_key".parse::<CredentialKey>().is_err());
}

#[test]
fn test_invalid_credential_key_error_does_not_echo_input() {
    let secret_like_key = "slack_webhook=https://hooks.slack.com/services/T/B/secret";
    let err = secret_like_key.parse::<CredentialKey>().unwrap_err();

    assert_eq!(err, "invalid credential key");
    assert!(
        !err.contains("secret"),
        "parse error must not echo caller input: {err}"
    );
}

#[test]
fn linkedin_cookie_validation_rejects_oversized_values_without_echo() {
    let cookie = format!("AQ{}", "x".repeat(MAX_LINKEDIN_COOKIE_LEN));
    let err = validate_credential_value(CredentialKey::LinkedInCookie, &cookie).unwrap_err();

    assert_eq!(err, "Legacy LinkedIn credential is too long");
    assert!(
        !err.contains(&cookie),
        "validation error must not echo cookie value: {err}"
    );
}

#[test]
fn linkedin_cookie_validation_rejects_header_separators_without_echo() {
    let cookie = "AQvalidPrefix; other_cookie=secret";
    let err = validate_credential_value(CredentialKey::LinkedInCookie, cookie).unwrap_err();

    assert_eq!(
        err,
        "Legacy LinkedIn credential contains unsupported characters"
    );
    assert!(
        !err.contains("secret"),
        "validation error must not echo cookie value: {err}"
    );
}

#[test]
fn linkedin_cookie_validation_rejects_control_characters_without_echo() {
    let cookie = "AQvalidPrefix\r\nx-secret: value";
    let err = validate_credential_value(CredentialKey::LinkedInCookie, cookie).unwrap_err();

    assert_eq!(
        err,
        "Legacy LinkedIn credential contains unsupported characters"
    );
    assert!(
        !err.contains("x-secret"),
        "validation error must not echo cookie value: {err}"
    );
}

#[test]
fn teams_credential_validation_accepts_current_connector_and_workflow_urls() {
    for url in [
        "https://tenant.webhook.office.com/abc/IncomingWebhook/def/ghi",
        "https://prod-12.westus.logic.azure.com:443/workflows/abc/triggers/manual/paths/invoke",
    ] {
        assert!(
            validate_credential_value(CredentialKey::TeamsWebhook, url).is_ok(),
            "{url} should pass Teams credential validation",
        );
    }
}

#[test]
fn teams_credential_validation_rejects_base_current_hosts() {
    for url in [
        "https://webhook.office.com/abc",
        "https://logic.azure.com/workflows/abc",
        "https://prod-12.westus.logic.azure.com/",
    ] {
        assert!(
            validate_credential_value(CredentialKey::TeamsWebhook, url).is_err(),
            "{url} should fail Teams credential validation",
        );
    }
}

#[test]
fn discord_credential_validation_accepts_hooks_domain() {
    assert!(validate_credential_value(
        CredentialKey::DiscordWebhook,
        "https://hooks.discord.com/api/webhooks/123456789/abcdefghijklmnopqrstuvwxyz",
    )
    .is_ok());
}

#[test]
fn telegram_bot_token_validation_rejects_bad_format_without_echo() {
    let secret_like_value = "telegram-secret-without-colon";
    let err =
        validate_credential_value(CredentialKey::TelegramBotToken, secret_like_value).unwrap_err();

    assert_eq!(
            err,
            "Paste the Telegram bot token copied from BotFather. If you are not sure, leave it blank and set it up later."
        );
    assert!(
        !err.contains(secret_like_value),
        "validation error must not echo token value: {err}"
    );
}

#[test]
fn telegram_bot_token_validation_accepts_token_shape() {
    assert!(validate_credential_value(
        CredentialKey::TelegramBotToken,
        "123456789:ABCdefGHIjklMNOpqrsTUVwxyz-ABCDEFGHIJ",
    )
    .is_ok());
}

#[test]
fn linkedin_credential_storage_is_disabled_before_keyring() {
    let secret = "legacy-session-secret";
    let err = CredentialStore::store(CredentialKey::LinkedInCookie, secret).unwrap_err();

    assert_eq!(err, LINKEDIN_CREDENTIAL_STORAGE_DISABLED);
    assert!(!err.contains(secret));
}

#[test]
fn secure_storage_error_does_not_echo_provider_details() {
    let err = secure_storage_error();

    assert_eq!(err, SECURE_STORAGE_UNAVAILABLE);
    for raw_detail in [
        "keyring",
        "jobsentinel_smtp_password",
        "NoEntry",
        "os error",
        "secret",
        "Failed to",
    ] {
        assert!(
            !err.contains(raw_detail),
            "secure storage error must not echo raw provider details: {err}"
        );
    }
}

#[test]
fn migration_extracts_active_secrets_and_clears_all_legacy_fields() {
    let temp_dir = tempfile::tempdir().unwrap();
    let config_path = temp_dir.path().join("config.json");
    std::fs::write(
        &config_path,
        r#"{
              "alerts": {
                "email": {
                  "smtp_password": "smtp-secret",
                  "smtp_server": "smtp.example.com"
                },
                "telegram": { "bot_token": "telegram-secret" },
                "slack": { "webhook_url": "slack-secret" },
                "discord": { "webhook_url": "discord-secret" },
                "teams": { "webhook_url": "teams-secret" }
              },
              "linkedin": { "session_cookie": "legacy-linkedin-secret" },
              "usajobs": {
                "api_key": "usajobs-secret",
                "email": "user@example.com"
              }
            }"#,
    )
    .unwrap();

    let credentials = extract_plaintext_credentials(&config_path).unwrap();
    let expected = [
        (CredentialKey::SmtpPassword, "smtp-secret"),
        (CredentialKey::TelegramBotToken, "telegram-secret"),
        (CredentialKey::SlackWebhook, "slack-secret"),
        (CredentialKey::DiscordWebhook, "discord-secret"),
        (CredentialKey::TeamsWebhook, "teams-secret"),
        (CredentialKey::UsaJobsApiKey, "usajobs-secret"),
    ];
    assert_eq!(credentials.len(), expected.len());
    for (key, value) in expected {
        assert!(credentials.contains(&(key, value.to_string())));
    }
    assert!(!credentials
        .iter()
        .any(|(key, _)| matches!(key, CredentialKey::LinkedInCookie)));

    clear_config_credentials(&config_path).unwrap();

    let cleaned = std::fs::read_to_string(&config_path).unwrap();
    let cleaned_json: serde_json::Value = serde_json::from_str(&cleaned).unwrap();
    assert_eq!(
        cleaned_json
            .pointer("/alerts/email/smtp_server")
            .and_then(|v| v.as_str()),
        Some("smtp.example.com")
    );
    assert_eq!(
        cleaned_json
            .pointer("/usajobs/email")
            .and_then(|v| v.as_str()),
        Some("user@example.com")
    );
    for pointer in [
        "/alerts/email/smtp_password",
        "/alerts/telegram/bot_token",
        "/alerts/slack/webhook_url",
        "/alerts/discord/webhook_url",
        "/alerts/teams/webhook_url",
        "/linkedin/session_cookie",
        "/usajobs/api_key",
    ] {
        assert!(cleaned_json.pointer(pointer).is_none(), "{pointer}");
    }
}
