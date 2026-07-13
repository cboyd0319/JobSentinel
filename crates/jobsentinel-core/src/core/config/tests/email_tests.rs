use super::*;

#[test]
fn test_email_enabled_but_empty_smtp_server_fails() {
    let mut config = create_valid_config();
    config.alerts.email.enabled = true;
    config.alerts.email.smtp_server = "".to_string();
    config.alerts.email.smtp_username = "user@example.com".to_string();
    config.alerts.email.smtp_password = "password".to_string();
    config.alerts.email.from_email = "from@example.com".to_string();
    config.alerts.email.to_emails = vec!["to@example.com".to_string()];

    let result = validate_config(&config);
    assert!(
        result.is_err(),
        "Empty SMTP server when email enabled should fail"
    );
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("SMTP server is required"));
}

#[test]
fn test_email_enabled_but_empty_username_fails() {
    let mut config = create_valid_config();
    config.alerts.email.enabled = true;
    config.alerts.email.smtp_server = "smtp.gmail.com".to_string();
    config.alerts.email.smtp_username = "".to_string();
    config.alerts.email.smtp_password = "password".to_string();
    config.alerts.email.from_email = "from@example.com".to_string();
    config.alerts.email.to_emails = vec!["to@example.com".to_string()];

    let result = validate_config(&config);
    assert!(
        result.is_err(),
        "Empty SMTP username when email enabled should fail"
    );
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("SMTP username is required"));
}

#[test]
fn test_email_enabled_with_empty_password_passes_validation() {
    // In v2.9+, SMTP password is stored through CredentialService, not config.
    let mut config = create_valid_config();
    config.alerts.email.enabled = true;
    config.alerts.email.smtp_server = "smtp.gmail.com".to_string();
    config.alerts.email.smtp_username = "user@example.com".to_string();
    config.alerts.email.smtp_password = "".to_string();
    config.alerts.email.from_email = "from@example.com".to_string();
    config.alerts.email.to_emails = vec!["to@example.com".to_string()];

    let result = validate_config(&config);
    assert!(
        result.is_ok(),
        "Empty SMTP password should pass validation (credential is behind CredentialService)"
    );
}

#[test]
fn test_email_enabled_but_empty_from_email_fails() {
    let mut config = create_valid_config();
    config.alerts.email.enabled = true;
    config.alerts.email.smtp_server = "smtp.gmail.com".to_string();
    config.alerts.email.smtp_username = "user@example.com".to_string();
    config.alerts.email.smtp_password = "password".to_string();
    config.alerts.email.from_email = "".to_string();
    config.alerts.email.to_emails = vec!["to@example.com".to_string()];

    let result = validate_config(&config);
    assert!(
        result.is_err(),
        "Empty from email when email enabled should fail"
    );
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("From email address is required"));
}

#[test]
fn test_email_enabled_but_invalid_from_email_fails() {
    let mut config = create_valid_config();
    config.alerts.email.enabled = true;
    config.alerts.email.smtp_server = "smtp.gmail.com".to_string();
    config.alerts.email.smtp_username = "user@example.com".to_string();
    config.alerts.email.smtp_password = "password".to_string();
    config.alerts.email.from_email = "invalidemail".to_string();
    config.alerts.email.to_emails = vec!["to@example.com".to_string()];

    let result = validate_config(&config);
    assert!(result.is_err(), "Invalid from email format should fail");
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("Invalid from email format"));
}

#[test]
fn test_email_enabled_but_no_recipients_fails() {
    let mut config = create_valid_config();
    config.alerts.email.enabled = true;
    config.alerts.email.smtp_server = "smtp.gmail.com".to_string();
    config.alerts.email.smtp_username = "user@example.com".to_string();
    config.alerts.email.smtp_password = "password".to_string();
    config.alerts.email.from_email = "from@example.com".to_string();
    config.alerts.email.to_emails = vec![];

    let result = validate_config(&config);
    assert!(
        result.is_err(),
        "Empty recipient list when email enabled should fail"
    );
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("At least one recipient email is required"));
}

#[test]
fn test_email_enabled_but_invalid_recipient_fails() {
    let mut config = create_valid_config();
    config.alerts.email.enabled = true;
    config.alerts.email.smtp_server = "smtp.gmail.com".to_string();
    config.alerts.email.smtp_username = "user@example.com".to_string();
    config.alerts.email.smtp_password = "password".to_string();
    config.alerts.email.from_email = "from@example.com".to_string();
    config.alerts.email.to_emails = vec!["valid@example.com".to_string(), "invalid".to_string()];

    let result = validate_config(&config);
    assert!(result.is_err(), "Invalid recipient email should fail");
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("Invalid recipient email format"));
}

#[test]
fn test_email_enabled_but_empty_recipient_fails() {
    let mut config = create_valid_config();
    config.alerts.email.enabled = true;
    config.alerts.email.smtp_server = "smtp.gmail.com".to_string();
    config.alerts.email.smtp_username = "user@example.com".to_string();
    config.alerts.email.smtp_password = "password".to_string();
    config.alerts.email.from_email = "from@example.com".to_string();
    config.alerts.email.to_emails = vec!["valid@example.com".to_string(), "".to_string()];

    let result = validate_config(&config);
    assert!(result.is_err(), "Empty recipient email should fail");
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("Recipient email cannot be empty"));
}

#[test]
fn test_email_enabled_but_recipient_too_long_fails() {
    let mut config = create_valid_config();
    config.alerts.email.enabled = true;
    config.alerts.email.smtp_server = "smtp.gmail.com".to_string();
    config.alerts.email.smtp_username = "user@example.com".to_string();
    config.alerts.email.smtp_password = "password".to_string();
    config.alerts.email.from_email = "from@example.com".to_string();
    config.alerts.email.to_emails = vec![format!("{}@example.com", "a".repeat(100))];

    let result = validate_config(&config);
    assert!(result.is_err(), "Recipient email > 100 chars should fail");
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("Recipient email too long"));
}

#[test]
fn test_email_smtp_server_too_long_fails() {
    let mut config = create_valid_config();
    config.alerts.email.enabled = true;
    config.alerts.email.smtp_server = "s".repeat(101);
    config.alerts.email.smtp_username = "user@example.com".to_string();
    config.alerts.email.smtp_password = "password".to_string();
    config.alerts.email.from_email = "from@example.com".to_string();
    config.alerts.email.to_emails = vec!["to@example.com".to_string()];

    let result = validate_config(&config);
    assert!(result.is_err(), "SMTP server name > 100 chars should fail");
    assert!(result
        .unwrap_err()
        .to_string()
        .contains("SMTP server name too long"));
}

#[test]
fn test_email_disabled_with_invalid_config_passes() {
    let mut config = create_valid_config();
    config.alerts.email.enabled = false;
    // Set all fields to invalid values
    config.alerts.email.smtp_server = "".to_string();
    config.alerts.email.smtp_username = "".to_string();
    config.alerts.email.smtp_password = "".to_string();
    config.alerts.email.from_email = "".to_string();
    config.alerts.email.to_emails = vec![];

    assert!(
        validate_config(&config).is_ok(),
        "Invalid email config should pass when disabled"
    );
}

#[test]
fn test_email_valid_configuration_passes() {
    let mut config = create_valid_config();
    config.alerts.email.enabled = true;
    config.alerts.email.smtp_server = "smtp.gmail.com".to_string();
    config.alerts.email.smtp_port = 587;
    config.alerts.email.smtp_username = "user@example.com".to_string();
    config.alerts.email.smtp_password = "app_password_123".to_string();
    config.alerts.email.from_email = "from@example.com".to_string();
    config.alerts.email.to_emails = vec![
        "recipient1@example.com".to_string(),
        "recipient2@example.com".to_string(),
    ];
    config.alerts.email.use_starttls = true;

    assert!(
        validate_config(&config).is_ok(),
        "Valid email configuration should pass"
    );
}
