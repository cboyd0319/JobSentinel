use super::*;

#[test]
fn test_discord_enabled_with_empty_webhook_passes_validation() {
    // In v2.0+, Discord webhook is stored in OS keyring, not config.
    let mut config = create_valid_config();
    config.alerts.discord.enabled = true;
    config.alerts.discord.webhook_url = "".to_string();

    let result = validate_config(&config);
    assert!(
        result.is_ok(),
        "Empty Discord webhook should pass validation (credential is in keyring)"
    );
}

#[test]
fn test_discord_webhook_format_not_validated_in_config() {
    // In v2.0+, Discord webhook is stored in OS keyring, not config.
    let mut config = create_valid_config();
    config.alerts.discord.enabled = true;
    config.alerts.discord.webhook_url = "https://evil.com/webhook".to_string();

    let result = validate_config(&config);
    assert!(
        result.is_ok(),
        "Discord webhook format not validated in config (validated in keyring)"
    );
}

#[test]
fn test_discord_webhook_length_not_validated_in_config() {
    // In v2.0+, Discord webhook is stored in OS keyring, not config.
    let mut config = create_valid_config();
    config.alerts.discord.enabled = true;
    config.alerts.discord.webhook_url =
        format!("https://discord.com/api/webhooks/{}", "X".repeat(500));

    let result = validate_config(&config);
    assert!(
        result.is_ok(),
        "Discord webhook length not validated in config (validated in keyring)"
    );
}

#[test]
fn test_discord_valid_webhook_com_passes() {
    let mut config = create_valid_config();
    config.alerts.discord.enabled = true;
    config.alerts.discord.webhook_url =
        "https://discord.com/api/webhooks/123456789/abcdefg".to_string();

    assert!(
        validate_config(&config).is_ok(),
        "Valid discord.com webhook should pass"
    );
}

#[test]
fn test_discord_valid_webhook_discordapp_passes() {
    let mut config = create_valid_config();
    config.alerts.discord.enabled = true;
    config.alerts.discord.webhook_url =
        "https://discordapp.com/api/webhooks/123456789/abcdefg".to_string();

    assert!(
        validate_config(&config).is_ok(),
        "Valid discordapp.com webhook should pass"
    );
}

#[test]
fn test_discord_disabled_with_invalid_webhook_passes() {
    let mut config = create_valid_config();
    config.alerts.discord.enabled = false;
    config.alerts.discord.webhook_url = "invalid".to_string();

    assert!(
        validate_config(&config).is_ok(),
        "Invalid Discord webhook should pass when disabled"
    );
}

#[test]
fn test_discord_with_user_mention_passes() {
    let mut config = create_valid_config();
    config.alerts.discord.enabled = true;
    config.alerts.discord.webhook_url = "https://discord.com/api/webhooks/123/abc".to_string();
    config.alerts.discord.user_id_to_mention = Some("123456789012345678".to_string());

    assert!(
        validate_config(&config).is_ok(),
        "Discord config with user mention should pass"
    );
}
