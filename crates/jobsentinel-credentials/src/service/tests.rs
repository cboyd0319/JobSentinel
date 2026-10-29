//! Verifies isolated vault access, lock failures and non-interactive credential metadata.

use super::*;
use jobsentinel_storage::Database;

async fn test_service() -> CredentialService {
    let database = Database::connect_memory().await.unwrap();
    database.migrate().await.unwrap();
    CredentialService::with_fixed_master_key(database.credentials(), [9_u8; 32])
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
async fn service_status_uses_only_vault_rows() {
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
            CredentialService::with_fixed_master_key(database.credentials(), [9_u8; 32]);
        (database, credentials)
    };

    credentials
        .enable_passphrase_lock("correct battery staple")
        .await
        .unwrap();

    let restarted = CredentialService::with_fixed_master_key(database.credentials(), [9_u8; 32]);
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

#[tokio::test]
async fn locked_credentials_never_fall_back_to_an_os_item() {
    let database = Database::connect_memory().await.unwrap();
    database.migrate().await.unwrap();
    let service = CredentialService::with_fixed_master_key(database.credentials(), [9; 32]);
    service
        .store(CredentialKey::SmtpPassword, "private-test-value")
        .await
        .unwrap();
    service
        .enable_passphrase_lock("correct battery staple")
        .await
        .unwrap();
    let restarted = CredentialService::with_fixed_master_key(database.credentials(), [9; 32]);
    let error = restarted
        .retrieve(CredentialKey::SmtpPassword)
        .await
        .unwrap_err();
    assert_eq!(error, secure_storage_error());
    assert!(!error.contains("private-test-value"));
    assert_eq!(
        restarted
            .retrieve(CredentialKey::TeamsWebhook)
            .await
            .unwrap(),
        None
    );
    assert!(restarted.master_key.get().is_none());
}

#[tokio::test]
async fn unavailable_repository_fails_before_native_key_access() {
    let database = Database::connect_memory().await.unwrap();
    database.migrate().await.unwrap();
    let service = CredentialService::new(database.credentials());
    database.close().await;
    assert_eq!(
        service
            .retrieve(CredentialKey::SmtpPassword)
            .await
            .unwrap_err(),
        secure_storage_error()
    );
    assert!(service.master_key.get().is_none());
}

#[tokio::test]
async fn app_unlock_rechecks_passphrase_with_a_warm_vault_key() {
    let service = test_service().await;
    service
        .store(CredentialKey::SmtpPassword, "private-test-value")
        .await
        .unwrap();
    service
        .enable_passphrase_lock("correct battery staple")
        .await
        .unwrap();
    assert!(service.master_key.get().is_some());
    service.prepare_app_lock().await.unwrap();

    for passphrase in [None, Some(""), Some("wrong secret phrase")] {
        let error = service.verify_app_unlock(passphrase).await.unwrap_err();
        assert!(!error.contains("private-test-value"));
        assert!(!error.contains("wrong secret phrase"));
    }
    service
        .verify_app_unlock(Some("correct battery staple"))
        .await
        .unwrap();
    assert_eq!(
        service.retrieve(CredentialKey::SmtpPassword).await.unwrap(),
        Some("private-test-value".into())
    );
    let restarted = CredentialService::with_fixed_master_key(service.repository.clone(), [9; 32]);
    restarted.prepare_app_lock().await.unwrap();
    assert!(restarted.master_key.get().is_none());
    restarted
        .verify_app_unlock(Some("correct battery staple"))
        .await
        .unwrap();
    assert_eq!(
        restarted
            .retrieve(CredentialKey::SmtpPassword)
            .await
            .unwrap(),
        Some("private-test-value".into())
    );
}

#[tokio::test]
async fn app_unlock_does_not_treat_a_fixed_key_as_user_presence() {
    let service = test_service().await;
    service.master_key(true).await.unwrap();
    for error in [
        service.prepare_app_lock().await.unwrap_err(),
        service.verify_app_unlock(None).await.unwrap_err(),
        service
            .verify_app_unlock(Some("unconfigured passphrase"))
            .await
            .unwrap_err(),
    ] {
        assert!(error.contains("passphrase"));
    }
}

#[tokio::test]
async fn portable_vault_roundtrips_without_host_keys_and_rechecks_passphrases() {
    let database = Database::connect_memory().await.unwrap();
    database.migrate().await.unwrap();
    let repository = database.credentials();
    let passphrase = "portable correct battery staple";
    let service = CredentialService::new_portable(repository.clone(), passphrase)
        .await
        .unwrap();
    service
        .store(CredentialKey::SmtpPassword, "portable-test-value")
        .await
        .unwrap();
    let wrapped = repository.load_key_wrap().await.unwrap();
    assert!(
        CredentialService::new_portable(repository.clone(), "wrong portable passphrase")
            .await
            .is_err()
    );
    assert_eq!(repository.load_key_wrap().await.unwrap(), wrapped);
    assert!(service
        .verify_app_unlock(Some("wrong portable passphrase"))
        .await
        .is_err());
    service.verify_app_unlock(Some(passphrase)).await.unwrap();
    assert!(service.enable_passphrase_lock(passphrase).await.is_err());
    assert!(service.disable_passphrase_lock(passphrase).await.is_err());
    assert_eq!(repository.load_key_wrap().await.unwrap(), wrapped);
    drop(service);
    let reopened = CredentialService::new_portable(repository.clone(), passphrase)
        .await
        .unwrap();
    let status = reopened.unlock_status().await.unwrap();
    assert_eq!(status.mode, CredentialUnlockMode::Passphrase);
    assert!(status.configured && status.unlocked);
    assert_eq!(
        reopened
            .retrieve(CredentialKey::SmtpPassword)
            .await
            .unwrap(),
        Some("portable-test-value".into())
    );
    reopened.delete(CredentialKey::SmtpPassword).await.unwrap();
    assert!(!repository
        .secret_exists(CredentialKey::SmtpPassword.as_str())
        .await
        .unwrap());
}

#[tokio::test]
async fn portable_vault_refuses_lost_wrapping_with_any_saved_secret() {
    let database = Database::connect_memory().await.unwrap();
    database.migrate().await.unwrap();
    let repository = database.credentials();
    let record = jobsentinel_storage::CredentialSecretRecord {
        algorithm: "xchacha20poly1305".into(),
        key_version: 1,
        nonce: vec![1; 24],
        ciphertext: vec![2; 32],
    };
    repository
        .store_secret("unknown-portable-key", record.clone())
        .await
        .unwrap();
    assert!(
        CredentialService::new_portable(repository.clone(), "portable correct battery staple")
            .await
            .is_err()
    );
    assert!(repository.load_key_wrap().await.unwrap().is_none());
    assert_eq!(
        repository
            .load_secret("unknown-portable-key")
            .await
            .unwrap(),
        Some(record)
    );
}

#[tokio::test]
async fn portable_vault_never_falls_back_to_system_when_wrapping_is_removed() {
    let database = Database::connect_memory().await.unwrap();
    database.migrate().await.unwrap();
    let service =
        CredentialService::new_portable(database.credentials(), "portable correct battery staple")
            .await
            .unwrap();
    passphrase::delete_config(&service.repository)
        .await
        .unwrap();
    assert!(service.prepare_app_lock().await.is_err());
    assert!(service.verify_app_unlock(None).await.is_err());
    assert!(service.unlock_status().await.is_err());
    assert!(service
        .disable_passphrase_lock("portable correct battery staple")
        .await
        .is_err());
}
