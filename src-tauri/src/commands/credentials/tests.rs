use super::*;
use crate::core::db::Database;

async fn test_credentials() -> CredentialService {
    let database = Database::connect_memory().await.unwrap();
    database.migrate().await.unwrap();
    CredentialService::with_fixed_master_key(database.pool().clone(), [17_u8; 32], false)
}

async fn test_credentials_with_pool() -> (Database, CredentialService) {
    let database = Database::connect_memory().await.unwrap();
    database.migrate().await.unwrap();
    let credentials =
        CredentialService::with_fixed_master_key(database.pool().clone(), [17_u8; 32], false);
    (database, credentials)
}

#[tokio::test]
async fn invalid_credential_key_error_does_not_echo_input() {
    let credentials = test_credentials().await;
    let secret_like_key = "slack_webhook=https://hooks.slack.com/services/T/B/secret";
    let err = store_credential_with_service(
        secret_like_key.to_string(),
        "ignored".to_string(),
        &credentials,
    )
    .await
    .unwrap_err();

    assert_eq!(err, UNKNOWN_CREDENTIAL_KEY);
    assert!(
        !err.contains("secret"),
        "invalid key error must not echo frontend input: {err}"
    );
}

#[tokio::test]
async fn linkedin_cookie_storage_is_disabled_before_keyring() {
    let credentials = test_credentials().await;
    let cookie = "legacy-session-value";
    let err = store_credential_with_service(
        "linkedin_cookie".to_string(),
        cookie.to_string(),
        &credentials,
    )
    .await
    .unwrap_err();

    assert_eq!(err, LINKEDIN_CREDENTIALS_DISABLED);
    assert!(
        !err.contains(&cookie),
        "validation error must not echo cookie value: {err}"
    );
}

#[tokio::test]
async fn linkedin_cookie_expiry_storage_is_disabled_before_keyring() {
    let credentials = test_credentials().await;
    let expiry = "2099-01-01T00:00:00Z";
    let err = store_credential_with_service(
        "linkedin_cookie_expiry".to_string(),
        expiry.to_string(),
        &credentials,
    )
    .await
    .unwrap_err();

    assert_eq!(err, LINKEDIN_CREDENTIALS_DISABLED);
    assert!(
        !err.contains(expiry),
        "validation error must not echo expiry value: {err}"
    );
}

#[tokio::test]
async fn disabled_linkedin_credential_presence_returns_false() {
    let credentials = test_credentials().await;
    assert!(
        !has_credential_with_service("linkedin_cookie".to_string(), &credentials)
            .await
            .unwrap()
    );
}

#[tokio::test]
async fn credential_unlock_status_defaults_to_system_mode_without_keyring() {
    let credentials = test_credentials().await;

    let status = get_credential_unlock_status_with_service(&credentials)
        .await
        .unwrap();

    assert_eq!(status.mode, "system");
    assert!(!status.configured);
    assert!(status.unlocked);
}

#[tokio::test]
async fn passphrase_mode_locks_restarted_service_until_unlock() {
    let (database, credentials) = test_credentials_with_pool().await;

    store_credential_with_service(
        "smtp_password".to_string(),
        "mail-password".to_string(),
        &credentials,
    )
    .await
    .unwrap();
    enable_credential_passphrase_with_service("correct battery staple".to_string(), &credentials)
        .await
        .unwrap();

    let restarted =
        CredentialService::with_fixed_master_key(database.pool().clone(), [17_u8; 32], false);
    let locked_status = get_credential_unlock_status_with_service(&restarted)
        .await
        .unwrap();
    assert_eq!(locked_status.mode, "passphrase");
    assert!(locked_status.configured);
    assert!(!locked_status.unlocked);

    assert!(
        has_credential_with_service("smtp_password".to_string(), &restarted)
            .await
            .unwrap()
    );
    let locked_err = restarted
        .retrieve(CredentialKey::SmtpPassword)
        .await
        .unwrap_err();
    assert!(
        !locked_err.contains("mail-password"),
        "locked vault error must not echo stored secret: {locked_err}"
    );

    unlock_credential_vault_with_service("correct battery staple".to_string(), &restarted)
        .await
        .unwrap();

    assert_eq!(
        restarted
            .retrieve(CredentialKey::SmtpPassword)
            .await
            .unwrap(),
        Some("mail-password".to_string())
    );
}

#[tokio::test]
async fn wrong_passphrase_error_does_not_echo_input() {
    let (database, credentials) = test_credentials_with_pool().await;
    enable_credential_passphrase_with_service("correct battery staple".to_string(), &credentials)
        .await
        .unwrap();

    let restarted =
        CredentialService::with_fixed_master_key(database.pool().clone(), [17_u8; 32], false);
    let err = unlock_credential_vault_with_service("wrong secret value".to_string(), &restarted)
        .await
        .unwrap_err();

    assert_eq!(err, "Passphrase could not unlock credential storage");
    assert!(!err.contains("wrong secret value"));
}

#[tokio::test]
async fn passphrase_mode_can_return_to_system_locking() {
    let (database, credentials) = test_credentials_with_pool().await;
    enable_credential_passphrase_with_service("correct battery staple".to_string(), &credentials)
        .await
        .unwrap();

    disable_credential_passphrase_with_service("correct battery staple".to_string(), &credentials)
        .await
        .unwrap();

    let restarted =
        CredentialService::with_fixed_master_key(database.pool().clone(), [17_u8; 32], false);
    let status = get_credential_unlock_status_with_service(&restarted)
        .await
        .unwrap();
    assert_eq!(status.mode, "system");
    assert!(!status.configured);
    assert!(status.unlocked);
}

#[tokio::test]
async fn slack_webhook_validation_rejects_wrong_host_before_keyring() {
    let credentials = test_credentials().await;
    let err = store_credential_with_service(
        "slack_webhook".to_string(),
        "https://evil.example/services/T/B/secret".to_string(),
        &credentials,
    )
    .await
    .unwrap_err();

    assert_eq!(
        err,
        "Paste the full Slack connection link copied from Slack. If you are not sure, leave it blank and set it up later."
    );
    assert!(
        !err.contains("secret") && !err.contains("evil.example"),
        "validation error must not echo webhook value: {err}"
    );
}

#[tokio::test]
async fn discord_webhook_validation_rejects_wrong_path_before_keyring() {
    let credentials = test_credentials().await;
    let err = store_credential_with_service(
        "discord_webhook".to_string(),
        "https://discord.com/webhooks/123/secret".to_string(),
        &credentials,
    )
    .await
    .unwrap_err();

    assert_eq!(
        err,
        "Paste the full Discord connection link copied from Discord. If you are not sure, leave it blank and set it up later."
    );
    assert!(
        !err.contains("secret") && !err.contains("123"),
        "validation error must not echo webhook value: {err}"
    );
}

#[tokio::test]
async fn teams_webhook_validation_rejects_embedded_credentials_before_keyring() {
    let credentials = test_credentials().await;
    let err = store_credential_with_service(
        "teams_webhook".to_string(),
        "https://user:secret@outlook.office.com/webhook/abc".to_string(),
        &credentials,
    )
    .await
    .unwrap_err();

    assert_eq!(
        err,
        "Paste the full Teams connection link copied from Teams. If you are not sure, leave it blank and set it up later."
    );
    assert!(
        !err.contains("secret") && !err.contains("abc"),
        "validation error must not echo webhook value: {err}"
    );
}
