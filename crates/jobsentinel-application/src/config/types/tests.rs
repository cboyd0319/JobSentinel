use super::*;

// ========================================================================
// Security: Debug trait must NOT leak secrets (CWE-532)
// ========================================================================

#[test]
fn test_email_config_debug_does_not_leak_password() {
    let config = EmailConfig {
        smtp_password: "super_secret_p@ssw0rd!".to_string(),
        smtp_username: "user@example.com".to_string(),
        ..Default::default()
    };
    let debug_output = format!("{:?}", config);
    assert!(
        !debug_output.contains("super_secret_p@ssw0rd!"),
        "EmailConfig Debug output must not contain password. Got: {}",
        debug_output
    );
}

#[test]
fn test_linkedin_config_ignores_legacy_session_cookie() {
    let config: LinkedInConfig = serde_json::from_value(serde_json::json!({
        "enabled": false,
        "session_cookie": "AQEDARAbc123_secret_cookie_value",
        "query": "manager",
        "location": "Remote",
        "remote_only": true,
        "limit": 25
    }))
    .expect("legacy LinkedIn config should deserialize");

    let debug_output = format!("{:?}", config);
    assert!(
        !debug_output.contains("AQEDARAbc123_secret_cookie_value"),
        "LinkedInConfig Debug output must not contain legacy session cookie. Got: {}",
        debug_output
    );
    assert_eq!(config.query, "manager");
    assert_eq!(config.location, "Remote");

    let serialized = serde_json::to_value(&config).expect("config should serialize");
    assert!(
        serialized.get("session_cookie").is_none(),
        "LinkedInConfig serialization must omit legacy session_cookie. Got: {}",
        serialized
    );
}

#[test]
fn test_discord_config_debug_does_not_leak_webhook() {
    let config = DiscordConfig {
        webhook_url: "https://discord.com/api/webhooks/123/secret-token".to_string(),
        ..Default::default()
    };
    let debug_output = format!("{:?}", config);
    assert!(
        !debug_output.contains("secret-token"),
        "DiscordConfig Debug output must not contain webhook URL. Got: {}",
        debug_output
    );
}

#[test]
fn test_telegram_config_debug_does_not_leak_token() {
    let config = TelegramConfig {
        bot_token: "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11".to_string(),
        ..Default::default()
    };
    let debug_output = format!("{:?}", config);
    assert!(
        !debug_output.contains("ABC-DEF1234ghIkl"),
        "TelegramConfig Debug output must not contain bot token. Got: {}",
        debug_output
    );
}

#[test]
fn test_teams_config_debug_does_not_leak_webhook() {
    let config = TeamsConfig {
        webhook_url: "https://outlook.office.com/webhook/secret-guid".to_string(),
        ..Default::default()
    };
    let debug_output = format!("{:?}", config);
    assert!(
        !debug_output.contains("secret-guid"),
        "TeamsConfig Debug output must not contain webhook URL. Got: {}",
        debug_output
    );
}

#[test]
fn test_slack_config_debug_does_not_leak_webhook() {
    let config = SlackConfig {
        webhook_url: "https://hooks.slack.com/services/T00/B00/xxxx-secret".to_string(),
        ..Default::default()
    };
    let debug_output = format!("{:?}", config);
    assert!(
        !debug_output.contains("xxxx-secret"),
        "SlackConfig Debug output must not contain webhook URL. Got: {}",
        debug_output
    );
}

#[test]
fn test_usajobs_config_debug_does_not_leak_api_key() {
    let config = UsaJobsConfig {
        api_key: "usajobs-secret-api-key".to_string(),
        email: "user@example.com".to_string(),
        ..Default::default()
    };
    let debug_output = format!("{:?}", config);
    assert!(
        !debug_output.contains("usajobs-secret-api-key"),
        "USAJobsConfig Debug output must not contain API key. Got: {}",
        debug_output
    );
}

// Verify that non-secret fields ARE still visible in Debug output
#[test]
fn test_email_config_debug_shows_non_secret_fields() {
    let config = EmailConfig {
        smtp_server: "smtp.gmail.com".to_string(),
        smtp_password: "secret".to_string(),
        ..Default::default()
    };
    let debug_output = format!("{:?}", config);
    assert!(
        debug_output.contains("smtp.gmail.com"),
        "Non-secret fields should still appear in Debug output"
    );
}
