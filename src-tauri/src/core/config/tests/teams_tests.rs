use super::*;

#[test]
fn test_teams_enabled_with_empty_webhook_passes_validation() {
    // In v2.0+, Teams webhook is stored in OS keyring, not config.
    let mut config = create_valid_config();
    config.alerts.teams.enabled = true;
    config.alerts.teams.webhook_url = "".to_string();

    let result = validate_config(&config);
    assert!(
        result.is_ok(),
        "Empty Teams webhook should pass validation (credential is in keyring)"
    );
}

#[test]
fn test_teams_webhook_format_not_validated_in_config() {
    // In v2.0+, Teams webhook is stored in OS keyring, not config.
    let mut config = create_valid_config();
    config.alerts.teams.enabled = true;
    config.alerts.teams.webhook_url = "https://evil.com/webhook".to_string();

    let result = validate_config(&config);
    assert!(
        result.is_ok(),
        "Teams webhook format not validated in config (validated in keyring)"
    );
}

#[test]
fn test_teams_webhook_length_not_validated_in_config() {
    // In v2.0+, Teams webhook is stored in OS keyring, not config.
    let mut config = create_valid_config();
    config.alerts.teams.enabled = true;
    config.alerts.teams.webhook_url =
        format!("https://outlook.office.com/webhook/{}", "X".repeat(500));

    let result = validate_config(&config);
    assert!(
        result.is_ok(),
        "Teams webhook length not validated in config (validated in keyring)"
    );
}

#[test]
fn test_teams_valid_webhook_office_com_passes() {
    let mut config = create_valid_config();
    config.alerts.teams.enabled = true;
    config.alerts.teams.webhook_url = "https://outlook.office.com/webhook/abc123".to_string();

    assert!(
        validate_config(&config).is_ok(),
        "Valid outlook.office.com webhook should pass"
    );
}

#[test]
fn test_teams_valid_webhook_office365_passes() {
    let mut config = create_valid_config();
    config.alerts.teams.enabled = true;
    config.alerts.teams.webhook_url = "https://outlook.office365.com/webhook/abc123".to_string();

    assert!(
        validate_config(&config).is_ok(),
        "Valid outlook.office365.com webhook should pass"
    );
}

#[test]
fn test_teams_disabled_with_invalid_webhook_passes() {
    let mut config = create_valid_config();
    config.alerts.teams.enabled = false;
    config.alerts.teams.webhook_url = "invalid".to_string();

    assert!(
        validate_config(&config).is_ok(),
        "Invalid Teams webhook should pass when disabled"
    );
}
