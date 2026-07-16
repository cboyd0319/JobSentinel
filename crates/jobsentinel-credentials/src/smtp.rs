//! SMTP credential binding helpers.
//!
//! Stored SMTP passwords are bound to the SMTP server, port, and username they
//! were saved for. This prevents renderer-controlled settings from replaying a
//! saved password to a different SMTP endpoint.

use serde::{Deserialize, Serialize};

pub const SMTP_CREDENTIAL_REENTRY_REQUIRED: &str =
    "Saved email password does not match these SMTP settings. Enter the email app password again, then save.";

const SMTP_SECRET_ENVELOPE_VERSION: u8 = 1;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub struct SmtpCredentialBinding {
    smtp_server: String,
    smtp_port: u16,
    smtp_username: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
struct SmtpSecretEnvelope {
    version: u8,
    binding: SmtpCredentialBinding,
    password: String,
}

impl SmtpCredentialBinding {
    #[must_use]
    pub fn new(smtp_server: &str, smtp_port: u16, smtp_username: &str) -> Self {
        Self {
            smtp_server: normalize_smtp_server(smtp_server),
            smtp_port,
            smtp_username: smtp_username.trim().to_string(),
        }
    }
}

pub fn encode_smtp_password(
    password: &str,
    binding: SmtpCredentialBinding,
) -> Result<String, String> {
    serde_json::to_string(&SmtpSecretEnvelope {
        version: SMTP_SECRET_ENVELOPE_VERSION,
        binding,
        password: password.to_string(),
    })
    .map_err(|_| "Stored email password could not be prepared".to_string())
}

pub fn decode_smtp_password_for_binding(
    stored_value: &str,
    binding: &SmtpCredentialBinding,
) -> Result<String, String> {
    let envelope: SmtpSecretEnvelope =
        serde_json::from_str(stored_value).map_err(|_| SMTP_CREDENTIAL_REENTRY_REQUIRED)?;

    if envelope.version != SMTP_SECRET_ENVELOPE_VERSION || &envelope.binding != binding {
        return Err(SMTP_CREDENTIAL_REENTRY_REQUIRED.to_string());
    }

    Ok(envelope.password)
}

fn normalize_smtp_server(value: &str) -> String {
    value.trim().trim_end_matches('.').to_ascii_lowercase()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn smtp_secret_envelope_roundtrips_for_matching_binding() {
        let binding = SmtpCredentialBinding::new("SMTP.Example.COM.", 587, "user@example.com");

        let stored = encode_smtp_password("mail-secret", binding.clone()).unwrap();

        assert_eq!(
            decode_smtp_password_for_binding(&stored, &binding).unwrap(),
            "mail-secret"
        );
        assert!(!stored.contains("SMTP.Example.COM."));
    }

    #[test]
    fn smtp_secret_envelope_rejects_changed_binding() {
        let stored = encode_smtp_password(
            "mail-secret",
            SmtpCredentialBinding::new("smtp.example.com", 587, "user@example.com"),
        )
        .unwrap();
        let changed = SmtpCredentialBinding::new("attacker.example.com", 587, "user@example.com");

        let err = decode_smtp_password_for_binding(&stored, &changed).unwrap_err();

        assert_eq!(err, SMTP_CREDENTIAL_REENTRY_REQUIRED);
        assert!(!err.contains("mail-secret"));
    }

    #[test]
    fn smtp_plaintext_legacy_secret_requires_reentry() {
        let binding = SmtpCredentialBinding::new("smtp.example.com", 587, "user@example.com");

        let err = decode_smtp_password_for_binding("mail-secret", &binding).unwrap_err();

        assert_eq!(err, SMTP_CREDENTIAL_REENTRY_REQUIRED);
        assert!(!err.contains("mail-secret"));
    }
}
