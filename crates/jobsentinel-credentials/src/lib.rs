//! Defines credential keys and the vault-backed runtime provider with explicit OS-entry deletion.

mod key;
mod passphrase;
mod service;
mod smtp;
mod validation;
mod vault;
mod vault_key_store;

use jobsentinel_platform::SECURE_STORAGE_UNAVAILABLE_MESSAGE;
use validation::{
    is_disabled_credential, reject_disabled_credential_storage, validate_credential_value,
};

pub use key::{CredentialKey, CredentialPresence};
pub use service::{CredentialService, CredentialUnlockMode, CredentialUnlockState};
pub use smtp::{
    decode_smtp_password_for_binding, encode_smtp_password, SmtpCredentialBinding,
    SMTP_CREDENTIAL_REENTRY_REQUIRED,
};

use vault::{SecretVault, SecretVaultError};

const MAX_LINKEDIN_COOKIE_LEN: usize = 500;
const LINKEDIN_CREDENTIAL_STORAGE_DISABLED: &str =
    "JobSentinel does not collect LinkedIn login details or session cookies";
fn secure_storage_error() -> String {
    SECURE_STORAGE_UNAVAILABLE_MESSAGE.to_string()
}

fn delete_os_credential(key: CredentialKey) -> Result<(), String> {
    jobsentinel_platform::delete_device_secret(key.as_str()).map_err(|_| secure_storage_error())
}

#[cfg(test)]
mod tests;
