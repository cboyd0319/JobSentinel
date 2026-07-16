//! Credential-vault key access through the platform owner.

use super::vault::MASTER_KEY_LEN;

#[cfg(test)]
pub(super) use jobsentinel_platform::CredentialVaultKeyBackend as VaultKeyBackend;
#[cfg(test)]
pub(super) use jobsentinel_platform::CredentialVaultKeyStoragePolicy as VaultKeyStoragePolicy;

#[cfg(test)]
pub(super) const fn runtime_policy() -> VaultKeyStoragePolicy {
    jobsentinel_platform::credential_vault_key_storage_policy()
}

pub(super) async fn store_vault_key(key: &[u8]) -> Result<(), String> {
    jobsentinel_platform::store_credential_vault_key(key).await
}

pub(super) async fn delete_vault_key() -> Result<(), String> {
    jobsentinel_platform::delete_credential_vault_key().await
}

pub(super) async fn load_vault_key(
    create_if_missing: bool,
) -> Result<[u8; MASTER_KEY_LEN], String> {
    jobsentinel_platform::load_credential_vault_key(create_if_missing).await
}

#[cfg(test)]
pub(super) fn decode_vault_key(encoded_key: &str) -> Result<[u8; MASTER_KEY_LEN], String> {
    jobsentinel_platform::decode_credential_vault_key(encoded_key)
}
