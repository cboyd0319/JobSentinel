use std::{collections::BTreeSet, fmt};

use chrono::{DateTime, TimeDelta, Utc};
use jobsentinel_domain::{
    v3_source_authorization::SourceGrantState,
    v3_source_manifest::{SourceOperation, SourcePermission},
};
use jobsentinel_security::redacted_secret_for_debug;
use thiserror::Error;
use url::Url;
use uuid::Uuid;
use zeroize::Zeroize;

use super::constant_time_ascii_eq;

pub const COMPANION_PROTOCOL_VERSION: u16 = 1;
const COMPANION_PAIRING_LIFETIME_MINUTES: i64 = 10;
const MAX_COMPANION_REQUESTS_PER_PAIRING: usize = 64;

#[derive(Clone, PartialEq, Eq)]
pub struct CompanionPairingCode {
    pub protocol_version: u16,
    pub pairing_id: String,
    pub client_id: String,
    pub source_id: String,
    pub policy_ref: String,
    pub policy_revision: u32,
    pub operations: Vec<SourceOperation>,
    pub origin: String,
    pub token: String,
    pub expires_at: DateTime<Utc>,
}

impl fmt::Debug for CompanionPairingCode {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("CompanionPairingCode")
            .field("protocol_version", &self.protocol_version)
            .field("pairing_id", &self.pairing_id)
            .field("client_id", &self.client_id)
            .field("source_id", &self.source_id)
            .field("policy_ref", &self.policy_ref)
            .field("policy_revision", &self.policy_revision)
            .field("operations", &self.operations)
            .field("origin", &self.origin)
            .field("token", &redacted_secret_for_debug(&self.token))
            .field("expires_at", &self.expires_at)
            .finish()
    }
}

impl Drop for CompanionPairingCode {
    fn drop(&mut self) {
        self.token.zeroize();
    }
}

#[derive(Clone, PartialEq, Eq)]
pub struct CompanionRequest {
    pub protocol_version: u16,
    pub pairing_id: String,
    pub client_id: String,
    pub source_id: String,
    pub policy_ref: String,
    pub policy_revision: u32,
    pub operation: SourceOperation,
    pub origin: String,
    pub nonce: String,
    pub token: String,
}

impl fmt::Debug for CompanionRequest {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("CompanionRequest")
            .field("protocol_version", &self.protocol_version)
            .field("pairing_id", &self.pairing_id)
            .field("client_id", &self.client_id)
            .field("source_id", &self.source_id)
            .field("policy_ref", &self.policy_ref)
            .field("policy_revision", &self.policy_revision)
            .field("operation", &self.operation)
            .field("origin", &self.origin)
            .field("nonce", &self.nonce)
            .field("token", &redacted_secret_for_debug(&self.token))
            .finish()
    }
}

impl Drop for CompanionRequest {
    fn drop(&mut self) {
        self.token.zeroize();
    }
}

#[derive(Debug, Clone, Copy, Error, PartialEq, Eq)]
pub enum CompanionPairingError {
    #[error("The browser pairing request is invalid.")]
    Invalid,
    #[error("The browser pairing request is outside its approved scope.")]
    ScopeMismatch,
    #[error("The browser pairing code is invalid.")]
    Unauthorized,
    #[error("The browser pairing code expired.")]
    Expired,
    #[error("The browser pairing was revoked.")]
    Revoked,
    #[error("The browser pairing request was already used.")]
    Replay,
    #[error("The browser pairing request limit was reached.")]
    CapacityReached,
}

pub struct CompanionPairing {
    code: CompanionPairingCode,
    used_nonces: BTreeSet<String>,
    revoked: bool,
}

impl fmt::Debug for CompanionPairing {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("CompanionPairing")
            .field("code", &self.code)
            .field("used_nonce_count", &self.used_nonces.len())
            .field("revoked", &self.revoked)
            .finish()
    }
}

impl CompanionPairing {
    pub fn issue(
        client_id: &str,
        source_id: &str,
        policy_ref: &str,
        policy_revision: u32,
        origin: &str,
        operations: Vec<SourceOperation>,
        now: DateTime<Utc>,
    ) -> Result<(Self, CompanionPairingCode), CompanionPairingError> {
        if !valid_identifier(client_id)
            || !valid_identifier(source_id)
            || !valid_identifier(policy_ref)
            || policy_revision == 0
            || operations.is_empty()
            || operations.len() > 2
            || operations
                .iter()
                .any(|operation| !browser_operation(*operation))
            || operations
                .iter()
                .enumerate()
                .any(|(index, operation)| operations[..index].contains(operation))
        {
            return Err(CompanionPairingError::Invalid);
        }
        let origin = normalized_origin(origin)?;
        let expires_at = now
            .checked_add_signed(TimeDelta::minutes(COMPANION_PAIRING_LIFETIME_MINUTES))
            .ok_or(CompanionPairingError::Invalid)?;
        let code = CompanionPairingCode {
            protocol_version: COMPANION_PROTOCOL_VERSION,
            pairing_id: Uuid::new_v4().to_string(),
            client_id: client_id.to_string(),
            source_id: source_id.to_string(),
            policy_ref: policy_ref.to_string(),
            policy_revision,
            operations,
            origin,
            token: format!("{}{}", Uuid::new_v4(), Uuid::new_v4()),
            expires_at,
        };
        Ok((
            Self {
                code: code.clone(),
                used_nonces: BTreeSet::new(),
                revoked: false,
            },
            code,
        ))
    }

    pub fn authorize(
        &mut self,
        request: &CompanionRequest,
        now: DateTime<Utc>,
    ) -> Result<SourceGrantState, CompanionPairingError> {
        if self.revoked {
            return Err(CompanionPairingError::Revoked);
        }
        if now >= self.code.expires_at {
            return Err(CompanionPairingError::Expired);
        }
        if request.protocol_version != self.code.protocol_version
            || request.pairing_id != self.code.pairing_id
            || request.client_id != self.code.client_id
            || request.source_id != self.code.source_id
            || request.policy_ref != self.code.policy_ref
            || request.policy_revision != self.code.policy_revision
            || !self.code.operations.contains(&request.operation)
            || normalized_origin(&request.origin)? != self.code.origin
        {
            return Err(CompanionPairingError::ScopeMismatch);
        }
        if !constant_time_ascii_eq(&request.token, &self.code.token) {
            return Err(CompanionPairingError::Unauthorized);
        }
        if !valid_identifier(&request.nonce) {
            return Err(CompanionPairingError::Invalid);
        }
        if self.used_nonces.contains(&request.nonce) {
            return Err(CompanionPairingError::Replay);
        }
        if self.used_nonces.len() >= MAX_COMPANION_REQUESTS_PER_PAIRING {
            return Err(CompanionPairingError::CapacityReached);
        }
        self.used_nonces.insert(request.nonce.clone());
        Ok(SourceGrantState::Granted {
            source_id: self.code.source_id.clone(),
            policy_ref: self.code.policy_ref.clone(),
            permission: SourcePermission::PairedBrowserGrant,
            operation: request.operation,
            policy_revision: self.code.policy_revision,
        })
    }

    pub fn revoke(&mut self) {
        self.revoked = true;
        self.code.token.zeroize();
        self.used_nonces.clear();
    }

    #[cfg(test)]
    fn secret_is_empty(&self) -> bool {
        self.code.token.is_empty()
    }
}

fn browser_operation(operation: SourceOperation) -> bool {
    matches!(
        operation,
        SourceOperation::VisiblePageCapture | SourceOperation::AppliedLogging
    )
}

fn valid_identifier(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 128
        && value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'.' | b'_' | b':' | b'-'))
}

fn normalized_origin(value: &str) -> Result<String, CompanionPairingError> {
    let url = Url::parse(value).map_err(|_| CompanionPairingError::Invalid)?;
    if !matches!(url.scheme(), "http" | "https")
        || !url.username().is_empty()
        || url.password().is_some()
        || url.path() != "/"
        || url.query().is_some()
        || url.fragment().is_some()
    {
        return Err(CompanionPairingError::Invalid);
    }
    Ok(url.origin().ascii_serialization())
}

#[cfg(test)]
mod tests {
    use chrono::{TimeDelta, TimeZone, Utc};
    use jobsentinel_domain::{
        v3_source_authorization::SourceGrantState,
        v3_source_manifest::{SourceOperation, SourcePermission},
    };

    use super::*;

    fn issued_pairing() -> (
        CompanionPairing,
        CompanionPairingCode,
        chrono::DateTime<Utc>,
    ) {
        let now = Utc.with_ymd_and_hms(2026, 7, 19, 12, 0, 0).unwrap();
        let (pairing, code) = CompanionPairing::issue(
            "browser-client-1",
            "restricted-jobs",
            "restricted-jobs-policy",
            3,
            "https://jobs.example",
            vec![SourceOperation::VisiblePageCapture],
            now,
        )
        .unwrap();
        (pairing, code, now)
    }

    fn request(code: &CompanionPairingCode, nonce: &str) -> CompanionRequest {
        CompanionRequest {
            protocol_version: code.protocol_version,
            pairing_id: code.pairing_id.clone(),
            client_id: code.client_id.clone(),
            source_id: code.source_id.clone(),
            policy_ref: code.policy_ref.clone(),
            policy_revision: code.policy_revision,
            operation: SourceOperation::VisiblePageCapture,
            origin: code.origin.clone(),
            nonce: nonce.to_string(),
            token: code.token.clone(),
        }
    }

    #[test]
    fn pairing_binds_scope_and_rejects_replay_without_consuming_failed_nonces() {
        let (mut pairing, code, now) = issued_pairing();
        assert_eq!(
            pairing.authorize(&request(&code, "nonce-1"), now).unwrap(),
            SourceGrantState::Granted {
                source_id: code.source_id.clone(),
                policy_ref: code.policy_ref.clone(),
                permission: SourcePermission::PairedBrowserGrant,
                operation: SourceOperation::VisiblePageCapture,
                policy_revision: code.policy_revision,
            }
        );
        assert_eq!(
            pairing.authorize(&request(&code, "nonce-1"), now),
            Err(CompanionPairingError::Replay)
        );

        let mut wrong_client = request(&code, "nonce-2");
        wrong_client.client_id = "browser-client-2".to_string();
        assert_eq!(
            pairing.authorize(&wrong_client, now),
            Err(CompanionPairingError::ScopeMismatch)
        );
        let mut wrong_source = request(&code, "nonce-2");
        wrong_source.source_id = "other-source".to_string();
        assert_eq!(
            pairing.authorize(&wrong_source, now),
            Err(CompanionPairingError::ScopeMismatch)
        );
        let mut wrong_operation = request(&code, "nonce-2");
        wrong_operation.operation = SourceOperation::AppliedLogging;
        assert_eq!(
            pairing.authorize(&wrong_operation, now),
            Err(CompanionPairingError::ScopeMismatch)
        );
        let mut wrong_origin = request(&code, "nonce-2");
        wrong_origin.origin = "https://other.example".to_string();
        assert_eq!(
            pairing.authorize(&wrong_origin, now),
            Err(CompanionPairingError::ScopeMismatch)
        );
        let mut wrong_token = request(&code, "nonce-2");
        wrong_token.token = "wrong-token".to_string();
        assert_eq!(
            pairing.authorize(&wrong_token, now),
            Err(CompanionPairingError::Unauthorized)
        );
        assert!(pairing.authorize(&request(&code, "nonce-2"), now).is_ok());
    }

    #[test]
    fn pairing_expiry_and_revocation_fail_closed_and_clear_the_secret() {
        let (mut pairing, code, now) = issued_pairing();
        assert_eq!(
            pairing.authorize(&request(&code, "nonce-1"), now + TimeDelta::minutes(10)),
            Err(CompanionPairingError::Expired)
        );

        pairing.revoke();
        assert!(pairing.secret_is_empty());
        assert_eq!(
            pairing.authorize(&request(&code, "nonce-2"), now),
            Err(CompanionPairingError::Revoked)
        );
    }

    #[test]
    fn pairing_issue_rejects_unsafe_or_excessive_scope() {
        let now = Utc.with_ymd_and_hms(2026, 7, 19, 12, 0, 0).unwrap();
        assert_eq!(
            CompanionPairing::issue(
                "browser-client-1",
                "restricted-jobs",
                "restricted-jobs-policy",
                3,
                "https://jobs.example/path?token=private",
                vec![SourceOperation::VisiblePageCapture],
                now,
            )
            .unwrap_err(),
            CompanionPairingError::Invalid
        );
        assert_eq!(
            CompanionPairing::issue(
                "browser-client-1",
                "restricted-jobs",
                "restricted-jobs-policy",
                3,
                "https://jobs.example",
                vec![SourceOperation::ScheduledCheck],
                now,
            )
            .unwrap_err(),
            CompanionPairingError::Invalid
        );
        assert_eq!(
            CompanionPairing::issue(
                "browser-client-1",
                "restricted-jobs",
                "restricted-jobs-policy",
                3,
                "https://jobs.example",
                vec![SourceOperation::VisiblePageCapture],
                chrono::DateTime::<Utc>::MAX_UTC,
            )
            .unwrap_err(),
            CompanionPairingError::Invalid
        );
    }

    #[test]
    fn pairing_debug_output_never_exposes_the_secret() {
        let (pairing, code, _) = issued_pairing();
        let request = request(&code, "nonce-1");
        let output = format!("{pairing:?}\n{code:?}\n{request:?}");

        assert!(!output.contains(&code.token));
        assert!(output.contains("[REDACTED]"));
    }
}
