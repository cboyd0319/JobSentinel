use super::*;
use jobsentinel_storage::Database;

async fn test_service() -> CredentialService {
    let database = Database::connect_memory().await.unwrap();
    database.migrate().await.unwrap();
    CredentialService::with_fixed_master_key(database.credentials(), [9_u8; 32], false)
}

#[tokio::test]
async fn service_roundtrips_vault_credentials() {
    let service = test_service().await;

    service
        .store(CredentialKey::SmtpPassword, "mail-password")
        .await
        .unwrap();

    assert!(service.exists(CredentialKey::SmtpPassword).await.unwrap());
    assert_eq!(
        service.retrieve(CredentialKey::SmtpPassword).await.unwrap(),
        Some("mail-password".to_string())
    );
}

#[tokio::test]
async fn service_status_uses_vault_rows_without_legacy_fallback() {
    let service = test_service().await;

    service
        .store(
            CredentialKey::SlackWebhook,
            "https://hooks.slack.com/services/T/B/C",
        )
        .await
        .unwrap();

    let statuses = service.list_status().await;
    let slack = statuses
        .iter()
        .find(|status| status.key == CredentialKey::SlackWebhook)
        .unwrap();
    let email = statuses
        .iter()
        .find(|status| status.key == CredentialKey::SmtpPassword)
        .unwrap();

    assert!(slack.available);
    assert!(slack.exists);
    assert!(email.available);
    assert!(!email.exists);
}

#[tokio::test]
async fn status_checks_do_not_unlock_or_cache_master_key() {
    let (database, credentials) = {
        let database = Database::connect_memory().await.unwrap();
        database.migrate().await.unwrap();
        let credentials =
            CredentialService::with_fixed_master_key(database.credentials(), [9_u8; 32], false);
        (database, credentials)
    };

    credentials
        .enable_passphrase_lock("correct battery staple")
        .await
        .unwrap();

    let restarted =
        CredentialService::with_fixed_master_key(database.credentials(), [9_u8; 32], false);
    assert!(restarted.master_key.get().is_none());

    let lock_status = restarted.unlock_status().await.unwrap();
    assert_eq!(lock_status.mode, CredentialUnlockMode::Passphrase);
    assert!(lock_status.configured);
    assert!(!lock_status.unlocked);
    assert!(restarted.master_key.get().is_none());

    let statuses = restarted.list_status().await;
    assert_eq!(statuses.len(), CredentialKey::all().len());
    assert!(restarted.master_key.get().is_none());
}

#[tokio::test]
async fn service_deletes_vault_rows() {
    let service = test_service().await;

    service
        .store(
            CredentialKey::TelegramBotToken,
            "123456789:ABCdefGHIjklMNOpqrsTUVwxyz",
        )
        .await
        .unwrap();
    service
        .delete(CredentialKey::TelegramBotToken)
        .await
        .unwrap();

    assert!(!service
        .exists(CredentialKey::TelegramBotToken)
        .await
        .unwrap());
    assert_eq!(
        service
            .retrieve(CredentialKey::TelegramBotToken)
            .await
            .unwrap(),
        None
    );
}

#[test]
fn decode_vault_key_rejects_malformed_values_without_echo() {
    let err = vault_key_store::decode_vault_key("not-a-key").unwrap_err();

    assert_eq!(err, secure_storage_error());
    assert!(!err.contains("not-a-key"));
}

#[test]
fn production_vault_key_backend_uses_expected_platform_policy() {
    let policy = vault_key_store::runtime_policy();

    #[cfg(target_os = "macos")]
    {
        assert_eq!(
            policy.backend,
            vault_key_store::VaultKeyBackend::MacosUserPresenceKeychain
        );
        assert!(policy.user_presence_required);
        assert!(policy.device_local);
        assert!(!policy.biometry_current_set);
    }

    #[cfg(not(target_os = "macos"))]
    {
        assert_eq!(
            policy.backend,
            vault_key_store::VaultKeyBackend::GenericKeyring
        );
        assert!(!policy.user_presence_required);
        assert!(!policy.device_local);
        assert!(!policy.biometry_current_set);
    }
}
