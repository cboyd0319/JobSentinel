//! Credential storage integration test
//!
//! Tests that credentials can be stored and retrieved from the OS keyring.
//! Each test uses a different credential key to avoid race conditions.

use jobsentinel::core::credentials::{CredentialKey, CredentialStore};

#[test]
fn test_slack_webhook_credential() {
    // Clean up first in case previous test failed
    let _ = CredentialStore::delete(CredentialKey::SlackWebhook);

    let test_value = "https://hooks.slack.com/services/TEST/TEST/TEST123";

    // Store credential
    let result = CredentialStore::store(CredentialKey::SlackWebhook, test_value);
    assert!(result.is_ok(), "Failed to store credential: {:?}", result);

    // Retrieve credential
    let retrieved = CredentialStore::retrieve(CredentialKey::SlackWebhook);
    assert!(retrieved.is_ok(), "Failed to retrieve credential: {:?}", retrieved);
    assert_eq!(retrieved.unwrap(), Some(test_value.to_string()));

    // Clean up
    let delete_result = CredentialStore::delete(CredentialKey::SlackWebhook);
    assert!(delete_result.is_ok(), "Failed to delete credential: {:?}", delete_result);

    // Verify deleted
    let after_delete = CredentialStore::retrieve(CredentialKey::SlackWebhook);
    assert!(after_delete.is_ok());
    assert_eq!(after_delete.unwrap(), None);
}

#[test]
fn test_discord_webhook_credential() {
    let _ = CredentialStore::delete(CredentialKey::DiscordWebhook);

    let test_value = "https://discord.com/api/webhooks/test/token123";

    let result = CredentialStore::store(CredentialKey::DiscordWebhook, test_value);
    assert!(result.is_ok(), "Failed to store Discord webhook: {:?}", result);

    let retrieved = CredentialStore::retrieve(CredentialKey::DiscordWebhook);
    assert!(retrieved.is_ok());
    assert_eq!(retrieved.unwrap(), Some(test_value.to_string()));

    let _ = CredentialStore::delete(CredentialKey::DiscordWebhook);
}

#[test]
fn test_teams_webhook_credential() {
    let _ = CredentialStore::delete(CredentialKey::TeamsWebhook);

    let test_value = "https://outlook.office.com/webhook/test/IncomingWebhook/abc123";

    let result = CredentialStore::store(CredentialKey::TeamsWebhook, test_value);
    assert!(result.is_ok(), "Failed to store Teams webhook: {:?}", result);

    let retrieved = CredentialStore::retrieve(CredentialKey::TeamsWebhook);
    assert!(retrieved.is_ok());
    assert_eq!(retrieved.unwrap(), Some(test_value.to_string()));

    let _ = CredentialStore::delete(CredentialKey::TeamsWebhook);
}

#[test]
fn test_telegram_bot_token_credential() {
    let _ = CredentialStore::delete(CredentialKey::TelegramBotToken);

    let test_value = "123456789:ABCdefGHIjklMNOpqrsTUVwxyz";

    let result = CredentialStore::store(CredentialKey::TelegramBotToken, test_value);
    assert!(result.is_ok(), "Failed to store Telegram token: {:?}", result);

    let retrieved = CredentialStore::retrieve(CredentialKey::TelegramBotToken);
    assert!(retrieved.is_ok());
    assert_eq!(retrieved.unwrap(), Some(test_value.to_string()));

    let _ = CredentialStore::delete(CredentialKey::TelegramBotToken);
}
