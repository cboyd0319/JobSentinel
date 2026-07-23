use anyhow::Result;
use sqlx::FromRow;

use super::corrupt;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PackAvailability {
    Ready,
    Disabled,
    Quarantined,
    Removed,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PackStream {
    pub publisher_key_id: String,
    pub pack_id: String,
    pub high_water_sequence: u64,
    pub active_release_sequence: Option<u64>,
    pub rollback_release_sequence: Option<u64>,
    pub availability: PackAvailability,
    pub generation: u64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PackReleaseState {
    Staged,
    SelfTested,
    Ready,
    Quarantined,
    Removed,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PackQuarantineReason {
    SelfTestFailed,
    TrustRevoked,
    Interrupted,
    ArtifactMissing,
    IntegrityFailed,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct StoredPackRelease {
    pub publisher_key_id: String,
    pub pack_id: String,
    pub release_sequence: u64,
    pub signed_release_sha256: String,
    pub lifecycle_state: PackReleaseState,
    pub quarantine_reason: Option<PackQuarantineReason>,
}

#[derive(FromRow)]
pub(super) struct StoredPackReleaseRow {
    pub(super) publisher_key_id: String,
    pub(super) pack_id: String,
    pub(super) release_sequence: i64,
    pub(super) signed_release_sha256: String,
    pub(super) lifecycle_state: String,
    pub(super) quarantine_reason: Option<String>,
}

impl TryFrom<StoredPackReleaseRow> for StoredPackRelease {
    type Error = anyhow::Error;

    fn try_from(row: StoredPackReleaseRow) -> Result<Self> {
        Ok(Self {
            publisher_key_id: row.publisher_key_id,
            pack_id: row.pack_id,
            release_sequence: u64::try_from(row.release_sequence).map_err(|_| corrupt())?,
            signed_release_sha256: row.signed_release_sha256,
            lifecycle_state: pack_release_state(&row.lifecycle_state)?,
            quarantine_reason: row
                .quarantine_reason
                .as_deref()
                .map(pack_quarantine_reason)
                .transpose()?,
        })
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PackStageOutcome {
    Staged(PackStream),
    Replay(PackStream),
}

#[derive(FromRow)]
pub(super) struct PackStreamRow {
    pub(super) publisher_key_id: String,
    pub(super) pack_id: String,
    pub(super) high_water_sequence: i64,
    pub(super) active_release_sequence: Option<i64>,
    pub(super) rollback_release_sequence: Option<i64>,
    pub(super) availability: String,
    pub(super) generation: i64,
}

pub(super) fn pack_release_state(value: &str) -> Result<PackReleaseState> {
    match value {
        "staged" => Ok(PackReleaseState::Staged),
        "self_tested" => Ok(PackReleaseState::SelfTested),
        "ready" => Ok(PackReleaseState::Ready),
        "quarantined" => Ok(PackReleaseState::Quarantined),
        "removed" => Ok(PackReleaseState::Removed),
        _ => Err(corrupt()),
    }
}

pub(super) fn pack_quarantine_reason(value: &str) -> Result<PackQuarantineReason> {
    match value {
        "self_test_failed" => Ok(PackQuarantineReason::SelfTestFailed),
        "trust_revoked" => Ok(PackQuarantineReason::TrustRevoked),
        "interrupted" => Ok(PackQuarantineReason::Interrupted),
        "artifact_missing" => Ok(PackQuarantineReason::ArtifactMissing),
        "integrity_failed" => Ok(PackQuarantineReason::IntegrityFailed),
        _ => Err(corrupt()),
    }
}
