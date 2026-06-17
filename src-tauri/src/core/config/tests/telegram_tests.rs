use super::*;

#[test]
fn test_telegram_enabled_with_empty_bot_token_passes_validation() {
    // In v2.9+, Telegram bot token is stored through CredentialService, not config.
    let mut config = create_valid_config();
    config.alerts.telegram.enabled = true;
    config.alerts.telegram.bot_token = "".to_string();
    config.alerts.telegram.chat_id = "123456789".to_string();

    let result = validate_config(&config);
    assert!(
        result.is_ok(),
        "Empty Telegram bot token should pass validation (credential is behind CredentialService)"
    );
}

#[test]
fn test_telegram_enabled_but_empty_chat_id_fails() {
    let mut config = create_valid_config();
    config.alerts.telegram.enabled = true;
    config.alerts.telegram.bot_token = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11".to_string();
    config.alerts.telegram.chat_id = "".to_string();

    let result = validate_config(&config);
    assert!(
        result.is_err(),
        "Empty Telegram chat ID when enabled should fail"
    );
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("Telegram chat ID is required"));
}

#[test]
fn test_telegram_bot_token_length_not_validated_in_config() {
    // In v2.9+, Telegram bot token is stored through CredentialService, not config.
    let mut config = create_valid_config();
    config.alerts.telegram.enabled = true;
    config.alerts.telegram.bot_token = "t".repeat(101);
    config.alerts.telegram.chat_id = "123456789".to_string();

    let result = validate_config(&config);
    assert!(
        result.is_ok(),
        "Telegram bot token length not validated in config (validated by CredentialService)"
    );
}

#[test]
fn test_telegram_chat_id_too_long_fails() {
    let mut config = create_valid_config();
    config.alerts.telegram.enabled = true;
    config.alerts.telegram.bot_token = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11".to_string();
    config.alerts.telegram.chat_id = "c".repeat(51);

    let result = validate_config(&config);
    assert!(result.is_err(), "Telegram chat ID > 50 chars should fail");
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("Telegram chat ID too long"));
}

#[test]
fn test_telegram_disabled_with_invalid_config_passes() {
    let mut config = create_valid_config();
    config.alerts.telegram.enabled = false;
    config.alerts.telegram.bot_token = "".to_string();
    config.alerts.telegram.chat_id = "".to_string();

    assert!(
        validate_config(&config).is_ok(),
        "Invalid Telegram config should pass when disabled"
    );
}

#[test]
fn test_telegram_valid_configuration_passes() {
    let mut config = create_valid_config();
    config.alerts.telegram.enabled = true;
    config.alerts.telegram.bot_token = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11".to_string();
    config.alerts.telegram.chat_id = "123456789".to_string();

    assert!(
        validate_config(&config).is_ok(),
        "Valid Telegram configuration should pass"
    );
}
