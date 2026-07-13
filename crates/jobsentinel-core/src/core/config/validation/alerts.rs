use crate::core::config::types::Config;
use crate::core::config::validation::is_valid_email;
use crate::core::config::validation_error::{ValidationError, ValidationErrors};

/// Validate alert configuration
pub(super) fn validate_alerts(config: &Config, errors: &mut ValidationErrors) {
    const MAX_EMAIL_LENGTH: usize = 100;
    const MAX_HOSTNAME_LENGTH: usize = 100;
    const MAX_CHAT_ID_LENGTH: usize = 50;

    // Validate Email configuration if enabled
    if config.alerts.email.enabled {
        if config.alerts.email.smtp_server.is_empty() {
            errors.add(ValidationError::required_field(
                "alerts.email.smtp_server",
                "required when email alerts are enabled",
            ));
        } else if config.alerts.email.smtp_server.len() > MAX_HOSTNAME_LENGTH {
            errors.add(ValidationError::too_long(
                "alerts.email.smtp_server",
                config.alerts.email.smtp_server.len(),
                MAX_HOSTNAME_LENGTH,
            ));
        }

        // Port 0 is accepted here because serde applies the stored default when loading config.

        if config.alerts.email.smtp_username.is_empty() {
            errors.add(ValidationError::required_field(
                "alerts.email.smtp_username",
                "required when email alerts are enabled",
            ));
        }

        if config.alerts.email.from_email.is_empty() {
            errors.add(ValidationError::required_field(
                "alerts.email.from_email",
                "required when email alerts are enabled",
            ));
        } else if !is_valid_email(&config.alerts.email.from_email) {
            errors.add(ValidationError::invalid_email(
                "alerts.email.from_email",
                &config.alerts.email.from_email,
            ));
        }

        if config.alerts.email.to_emails.is_empty() {
            errors.add(ValidationError::required_field(
                "alerts.email.to_emails",
                "at least one recipient email is required when email alerts are enabled",
            ));
        } else {
            for (i, email) in config.alerts.email.to_emails.iter().enumerate() {
                if email.is_empty() {
                    errors.add(ValidationError::empty_string(format!(
                        "alerts.email.to_emails[{}]",
                        i
                    )));
                } else if !is_valid_email(email) {
                    errors.add(ValidationError::invalid_email(
                        format!("alerts.email.to_emails[{}]", i),
                        email,
                    ));
                } else if email.len() > MAX_EMAIL_LENGTH {
                    errors.add(ValidationError::too_long(
                        format!("alerts.email.to_emails[{}]", i),
                        email.len(),
                        MAX_EMAIL_LENGTH,
                    ));
                }
            }
        }
    }

    // Validate Discord configuration
    if config.alerts.discord.enabled {
        if let Some(user_id) = &config.alerts.discord.user_id_to_mention {
            // Discord user IDs are numeric strings, typically 17-19 digits.
            if !user_id.chars().all(|c| c.is_ascii_digit()) {
                errors.add(ValidationError::invalid_value(
                    "alerts.discord.user_id_to_mention",
                    user_id,
                    "must be a numeric string (Discord user ID)",
                ));
            }
        }
    }

    // Validate Telegram configuration
    if config.alerts.telegram.enabled {
        if config.alerts.telegram.chat_id.is_empty() {
            errors.add(ValidationError::required_field(
                "alerts.telegram.chat_id",
                "required when Telegram alerts are enabled",
            ));
        } else if config.alerts.telegram.chat_id.len() > MAX_CHAT_ID_LENGTH {
            errors.add(ValidationError::too_long(
                "alerts.telegram.chat_id",
                config.alerts.telegram.chat_id.len(),
                MAX_CHAT_ID_LENGTH,
            ));
        }
    }
}
