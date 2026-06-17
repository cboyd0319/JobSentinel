//! Credential storage integration test
//!
//! Tests that disabled credential paths stay non-interactive by default. Live
//! OS keyring roundtrips are opt-in because macOS Keychain and equivalent
//! stores can prompt the user.

use jobsentinel::commands::linkedin_auth::disconnect_linkedin;
use jobsentinel::core::credentials::{CredentialKey, CredentialStore};
use keyring::{Entry, Error as KeyringError};

const SECURE_STORAGE_UNAVAILABLE: &str =
    "JobSentinel could not use your device's secure storage. Check system permission prompts, then try again.";
const LINKEDIN_CREDENTIAL_STORAGE_DISABLED: &str =
    "LinkedIn automatic monitoring is disabled by JobSentinel source policy";
const LIVE_KEYRING_TESTS_ENV: &str = "JOBSENTINEL_LIVE_KEYRING_TESTS";
const SERVICE_NAME: &str = "JobSentinel";

struct LegacyLinkedInCleanup;

impl Drop for LegacyLinkedInCleanup {
    fn drop(&mut self) {
        let _ = delete_raw_legacy_credential(CredentialKey::LinkedInCookie);
        let _ = delete_raw_legacy_credential(CredentialKey::LinkedInCookieExpiry);
    }
}

fn assert_error_is_sanitized(error: &str, secret: &str) {
    assert!(
        !error.contains(secret),
        "credential errors must not echo secret values: {error}"
    );
}

fn live_keyring_tests_enabled() -> bool {
    std::env::var(LIVE_KEYRING_TESTS_ENV).is_ok_and(|value| value == "1")
}

fn require_live_keyring_test(label: &str) -> bool {
    if live_keyring_tests_enabled() {
        true
    } else {
        eprintln!(
            "skipping {label}; set {LIVE_KEYRING_TESTS_ENV}=1 to run live OS keyring integration tests"
        );
        false
    }
}

fn raw_legacy_entry(key: CredentialKey) -> Result<Entry, String> {
    Entry::new(SERVICE_NAME, key.as_str()).map_err(|_| SECURE_STORAGE_UNAVAILABLE.to_string())
}

fn seed_raw_legacy_credential(key: CredentialKey, value: &str) -> Result<(), String> {
    raw_legacy_entry(key)?
        .set_password(value)
        .map_err(|_| SECURE_STORAGE_UNAVAILABLE.to_string())
}

fn raw_legacy_credential_exists(key: CredentialKey) -> Result<bool, String> {
    match raw_legacy_entry(key)?.get_password() {
        Ok(_) => Ok(true),
        Err(KeyringError::NoEntry) => Ok(false),
        Err(_) => Err(SECURE_STORAGE_UNAVAILABLE.to_string()),
    }
}

fn delete_raw_legacy_credential(key: CredentialKey) -> Result<(), String> {
    match raw_legacy_entry(key)?.delete_credential() {
        Ok(()) | Err(KeyringError::NoEntry) => Ok(()),
        Err(_) => Err(SECURE_STORAGE_UNAVAILABLE.to_string()),
    }
}

fn roundtrip_or_accept_locked_store(key: CredentialKey, test_value: &str, label: &str) {
    let _ = CredentialStore::delete(key);

    match CredentialStore::store(key, test_value) {
        Ok(()) => {}
        Err(error) if error == SECURE_STORAGE_UNAVAILABLE => {
            assert_error_is_sanitized(&error, test_value);
            return;
        }
        Err(error) => panic!("Failed to store {label} credential: {error:?}"),
    }

    let retrieved = CredentialStore::retrieve(key);
    assert!(
        retrieved.is_ok(),
        "Failed to retrieve {label} credential: {:?}",
        retrieved
    );
    assert_eq!(retrieved.unwrap(), Some(test_value.to_string()));

    let delete_result = CredentialStore::delete(key);
    assert!(
        delete_result.is_ok(),
        "Failed to delete {label} credential: {:?}",
        delete_result
    );

    let after_delete = CredentialStore::retrieve(key);
    assert!(after_delete.is_ok());
    assert_eq!(after_delete.unwrap(), None);
}

#[test]
fn test_slack_webhook_credential() {
    if !require_live_keyring_test("Slack webhook keyring roundtrip") {
        return;
    }

    let test_value = "https://hooks.slack.com/services/TEST/TEST/TEST123";

    roundtrip_or_accept_locked_store(CredentialKey::SlackWebhook, test_value, "Slack webhook");
}

#[test]
fn test_discord_webhook_credential() {
    if !require_live_keyring_test("Discord webhook keyring roundtrip") {
        return;
    }

    let test_value = "https://discord.com/api/webhooks/test/token123";

    roundtrip_or_accept_locked_store(CredentialKey::DiscordWebhook, test_value, "Discord webhook");
}

#[test]
fn test_teams_webhook_credential() {
    if !require_live_keyring_test("Teams webhook keyring roundtrip") {
        return;
    }

    let test_value = "https://outlook.office.com/webhook/test/IncomingWebhook/abc123";

    roundtrip_or_accept_locked_store(CredentialKey::TeamsWebhook, test_value, "Teams webhook");
}

#[test]
fn test_telegram_bot_token_credential() {
    if !require_live_keyring_test("Telegram bot token keyring roundtrip") {
        return;
    }

    let test_value = "123456789:ABCdefGHIjklMNOpqrsTUVwxyz";

    roundtrip_or_accept_locked_store(
        CredentialKey::TelegramBotToken,
        test_value,
        "Telegram bot token",
    );
}

#[test]
fn test_linkedin_cookie_credential() {
    let test_value = "AQEDAQRlbmNyeXB0ZWQtdGVzdC1jb29raWUtdmFsdWU";

    let result = CredentialStore::store(CredentialKey::LinkedInCookie, test_value);
    assert!(
        result.is_err(),
        "LinkedIn credential storage should stay disabled"
    );
    let error = result.unwrap_err();
    assert_eq!(error, LINKEDIN_CREDENTIAL_STORAGE_DISABLED);
    assert_error_is_sanitized(&error, test_value);

    let retrieved = CredentialStore::retrieve(CredentialKey::LinkedInCookie)
        .expect("disabled LinkedIn retrieval should not touch the keyring");
    assert_eq!(retrieved, None);

    let exists = CredentialStore::exists(CredentialKey::LinkedInCookie)
        .expect("disabled LinkedIn status should not touch the keyring");
    assert!(!exists);
}

#[tokio::test]
async fn test_disconnect_linkedin_deletes_legacy_cookie_and_expiry_entries() {
    if !require_live_keyring_test("legacy LinkedIn keyring cleanup") {
        return;
    }

    let _cleanup = LegacyLinkedInCleanup;
    let cookie_secret = "AQEDAQRlegacy-session-cookie";
    let expiry_secret = "2099-01-01T00:00:00Z";

    let _ = delete_raw_legacy_credential(CredentialKey::LinkedInCookie);
    let _ = delete_raw_legacy_credential(CredentialKey::LinkedInCookieExpiry);

    if let Err(error) = seed_raw_legacy_credential(CredentialKey::LinkedInCookie, cookie_secret) {
        assert_eq!(error, SECURE_STORAGE_UNAVAILABLE);
        assert_error_is_sanitized(&error, cookie_secret);
        return;
    }
    if let Err(error) =
        seed_raw_legacy_credential(CredentialKey::LinkedInCookieExpiry, expiry_secret)
    {
        assert_eq!(error, SECURE_STORAGE_UNAVAILABLE);
        assert_error_is_sanitized(&error, expiry_secret);
        return;
    }

    assert!(raw_legacy_credential_exists(CredentialKey::LinkedInCookie).unwrap());
    assert!(raw_legacy_credential_exists(CredentialKey::LinkedInCookieExpiry).unwrap());

    disconnect_linkedin()
        .await
        .expect("legacy LinkedIn cleanup should delete cookie and expiry entries");

    assert!(!raw_legacy_credential_exists(CredentialKey::LinkedInCookie).unwrap());
    assert!(!raw_legacy_credential_exists(CredentialKey::LinkedInCookieExpiry).unwrap());
}

#[test]
fn test_usajobs_api_key_credential() {
    if !require_live_keyring_test("USAJobs API key keyring roundtrip") {
        return;
    }

    let test_value = "xABC123defGHI456jklMNO789pqrSTU";

    roundtrip_or_accept_locked_store(CredentialKey::UsaJobsApiKey, test_value, "USAJobs API key");
}
