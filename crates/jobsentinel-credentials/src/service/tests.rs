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
async fn existing_vault_ciphertext_never_gets_a_replacement_key() {
    use crate::vault_key_store::test_key;
    let database = Database::connect_memory().await.unwrap();
    database.migrate().await.unwrap();
    CredentialService::with_fixed_master_key(database.credentials(), [9; 32])
        .store(CredentialKey::SmtpPassword, "mail-password")
        .await
        .unwrap();
    test_key::reset();
    let service = CredentialService::new(database.credentials());
    let webhook = "https://hooks.slack.com/services/T/B/C";
    assert!(service
        .store(CredentialKey::SlackWebhook, webhook)
        .await
        .is_err());
    assert!(service
        .enable_passphrase_lock("correct horse battery staple")
        .await
        .is_err());
    assert_eq!(test_key::writes(), 0);
    assert!(!service.exists(CredentialKey::SlackWebhook).await.unwrap());
}

#[tokio::test]
async fn empty_vault_creates_its_key_exactly_once() {
    use crate::vault_key_store::test_key;
    let database = Database::connect_memory().await.unwrap();
    database.migrate().await.unwrap();
    test_key::reset();
    for (key, value) in [
        (CredentialKey::SmtpPassword, "mail-password"),
        (
            CredentialKey::SlackWebhook,
            "https://hooks.slack.com/services/T/B/C",
        ),
    ] {
        let service = CredentialService::new(database.credentials());
        service.store(key, value).await.unwrap();
    }
    assert_eq!(test_key::writes(), 1);
}

#[tokio::test]
async fn concurrent_first_stores_share_one_vault_key() {
    use crate::vault_key_store::test_key;
    let database = Database::connect_memory().await.unwrap();
    database.migrate().await.unwrap();
    test_key::reset();
    test_key::hold_creators_for_a_race();
    let first = CredentialService::new(database.credentials());
    let second = CredentialService::new(database.credentials());
    let webhook = "https://hooks.slack.com/services/T/B/C";
    let (stored_first, stored_second) = tokio::join!(
        first.store(CredentialKey::SmtpPassword, "mail-password"),
        second.store(CredentialKey::SlackWebhook, webhook),
    );
    stored_first.unwrap();
    stored_second.unwrap();
    assert_eq!(test_key::writes(), 1);
    let reader = CredentialService::new(database.credentials());
    let smtp = reader.retrieve(CredentialKey::SmtpPassword).await.unwrap();
    assert_eq!(smtp.as_deref(), Some("mail-password"));
    let slack = reader.retrieve(CredentialKey::SlackWebhook).await.unwrap();
    assert_eq!(slack.as_deref(), Some(webhook));
}

#[tokio::test]
async fn concurrent_first_loads_share_one_native_read() {
    use crate::vault_key_store::test_key;
    let database = Database::connect_memory().await.unwrap();
    database.migrate().await.unwrap();
    test_key::reset();
    vault_key_store::store_vault_key(&[5; MASTER_KEY_LEN])
        .await
        .unwrap();
    let first = CredentialService::new(database.credentials());
    let second = CredentialService::new(database.credentials());
    let (first_key, second_key) = tokio::join!(first.master_key(false), second.master_key(false));
    assert_eq!(**first_key.unwrap(), [5; MASTER_KEY_LEN]);
    assert_eq!(**second_key.unwrap(), [5; MASTER_KEY_LEN]);
    assert_eq!(test_key::reads(), 1);
}

#[tokio::test]
async fn later_creator_reuses_the_process_key_after_a_spurious_miss() {
    use crate::vault_key_store::test_key;
    let database = Database::connect_memory().await.unwrap();
    database.migrate().await.unwrap();
    test_key::reset();
    let first = CredentialService::new(database.credentials());
    first.master_key(true).await.unwrap();
    test_key::miss_next_read();
    CredentialService::new(database.credentials())
        .store(CredentialKey::SmtpPassword, "mail-password")
        .await
        .unwrap();
    assert_eq!(test_key::writes(), 1);
    let smtp = first.retrieve(CredentialKey::SmtpPassword).await.unwrap();
    assert_eq!(smtp.as_deref(), Some("mail-password"));
}

#[tokio::test]
async fn creator_rechecks_passphrase_mode_under_the_lock() {
    use crate::vault_key_store::test_key;
    let database = Database::connect_memory().await.unwrap();
    database.migrate().await.unwrap();
    test_key::reset();
    let repository = database.credentials();
    // A passphrase enable that finished after this creator's unlocked pre-check.
    passphrase::wrap_key(
        &repository,
        "correct horse battery staple",
        [7; MASTER_KEY_LEN],
    )
    .await
    .unwrap();
    let mut cached = vault_key_store::cache().lock().await;
    assert!(load_vault_key_locked(&mut cached, &repository, true)
        .await
        .is_err());
    assert_eq!(test_key::writes(), 0);
}

#[tokio::test]
async fn passphrase_lock_changes_clear_the_process_key() {
    use crate::vault_key_store::test_key;
    let database = Database::connect_memory().await.unwrap();
    database.migrate().await.unwrap();
    test_key::reset();
    let passphrase = "correct horse battery staple";
    let service = CredentialService::new(database.credentials());
    service
        .store(CredentialKey::SmtpPassword, "mail-password")
        .await
        .unwrap();
    service.enable_passphrase_lock(passphrase).await.unwrap();
    assert!(vault_key_store::cache().lock().await.is_none());
    assert!(vault_key_store::load_vault_key(false).await.is_err());
    let restarted = CredentialService::new(database.credentials());
    restarted.disable_passphrase_lock(passphrase).await.unwrap();
    assert!(vault_key_store::cache().lock().await.is_none());
    let reader = CredentialService::new(database.credentials());
    let smtp = reader.retrieve(CredentialKey::SmtpPassword).await.unwrap();
    assert_eq!(smtp.as_deref(), Some("mail-password"));
}

#[tokio::test]
async fn dropped_first_store_finishes_its_key_before_another_creator_starts() {
    use crate::vault_key_store::test_key;
    let database = Database::connect_memory().await.unwrap();
    database.migrate().await.unwrap();
    test_key::reset();
    test_key::hold_creators_for_a_race();
    let service = CredentialService::new(database.credentials());
    // Drop the first store only once its creator is running, whatever holds the global lock.
    let creator_started = async {
        while test_key::creators() == 0 {
            tokio::task::yield_now().await;
        }
    };
    tokio::select! {
        _ = service.store(CredentialKey::SmtpPassword, "mail-password") => panic!("store finished"),
        () = creator_started => {}
    }
    service
        .store(CredentialKey::SmtpPassword, "mail-password")
        .await
        .unwrap();
    assert_eq!(test_key::creators(), 1);
    assert_eq!(test_key::writes(), 1);
}
