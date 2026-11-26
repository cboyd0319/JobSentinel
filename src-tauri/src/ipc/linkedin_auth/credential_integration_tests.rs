//! Verifies current vault roundtrips and delete-only LinkedIn cleanup without OS-store access.

use super::disconnect_linkedin_with_credentials;
use crate::application::credentials::{CredentialKey, CredentialService};
use crate::desktop::Database;

async fn credentials() -> CredentialService {
    let database = Database::connect_memory().await.unwrap();
    database.migrate().await.unwrap();
    CredentialService::with_fixed_master_key(database.credentials(), [42; 32])
}

#[tokio::test]
async fn current_vault_roundtrips_and_deletes_credentials() {
    let credentials = credentials().await;
    credentials
        .store(CredentialKey::SmtpPassword, "test-mail-password")
        .await
        .unwrap();
    assert_eq!(
        credentials
            .retrieve(CredentialKey::SmtpPassword)
            .await
            .unwrap()
            .as_deref(),
        Some("test-mail-password")
    );
    assert!(credentials
        .exists(CredentialKey::SmtpPassword)
        .await
        .unwrap());
    credentials
        .delete(CredentialKey::SmtpPassword)
        .await
        .unwrap();
    assert_eq!(
        credentials
            .retrieve(CredentialKey::SmtpPassword)
            .await
            .unwrap(),
        None
    );
}

#[tokio::test]
async fn linkedin_storage_rejection_does_not_expose_input() {
    let credentials = credentials().await;
    for key in [
        CredentialKey::LinkedInCookie,
        CredentialKey::LinkedInCookieExpiry,
    ] {
        let error = credentials
            .store(key, "private-test-input")
            .await
            .unwrap_err();
        assert!(!error.contains("private-test-input"));
        assert_eq!(credentials.retrieve(key).await.unwrap(), None);
    }
}

#[tokio::test]
async fn retired_linkedin_cleanup_is_idempotent_for_vault_rows() {
    let credentials = credentials().await;
    disconnect_linkedin_with_credentials(&credentials)
        .await
        .unwrap();
    disconnect_linkedin_with_credentials(&credentials)
        .await
        .unwrap();
}
