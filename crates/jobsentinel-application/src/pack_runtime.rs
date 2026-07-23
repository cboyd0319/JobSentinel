//! Signed pack artifact staging and explicit activation.

use std::path::Path;

use anyhow::{anyhow, Result};
use chrono::NaiveDate;
use jobsentinel_domain::{
    v3_manifests::{ApprovalGate, DataCategory, PackAction, PackType, PrivacyLabel},
    v3_pack_payloads::parse_and_self_test_pack_payload,
    v3_signed_packs::{TrustedPublisherKey, VerifiedPackRelease},
};
use jobsentinel_storage::{
    v3_pack_lifecycle::{PackAvailability, PackStageOutcome, PackStream},
    Database,
};
use serde::Serialize;

mod artifact;
mod execution;
mod recovery;

use artifact::{load_tested_artifact, persist_artifact, remove_owned_artifact, ArtifactLoadError};
pub use execution::{
    cancel_reviewed_pack_task, execute_evidence_review_task, prepare_evidence_review_task,
    EvidenceReviewTaskResult, PackTaskReview, PackTaskReviewStep,
};
pub use recovery::{reconcile_active_pack_artifacts, PackArtifactReconciliation};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum PackReviewState {
    NeedsReview,
    Ready,
    Disabled,
    Quarantined,
    Removed,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PackInstallReview {
    pub publisher_key_id: String,
    pub publisher_name: String,
    pub license: String,
    pub pack_id: String,
    pub pack_version: String,
    pub pack_type: PackType,
    pub release_sequence: u64,
    pub privacy_labels: Vec<PrivacyLabel>,
    pub allowed_data_categories: Vec<DataCategory>,
    pub allowed_actions: Vec<PackAction>,
    pub approval_gates: Vec<ApprovalGate>,
    pub uses_external_ai: bool,
    pub state: PackReviewState,
    pub generation: u64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PackArtifactRemoval {
    pub generation: u64,
    pub cleanup_pending: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PackStateChange {
    pub state: PackReviewState,
    pub generation: u64,
}

pub async fn stage_pack_artifact(
    database: &Database,
    artifact_root: &Path,
    envelope: &[u8],
    trusted_publishers: &[TrustedPublisherKey],
    today: NaiveDate,
) -> Result<PackInstallReview> {
    let release = verify_pack(envelope, trusted_publishers)?;
    let publisher = trusted_publishers
        .iter()
        .find(|publisher| publisher.publisher_key_id == release.publisher_key_id())
        .ok_or_else(|| anyhow!("pack publisher is not trusted"))?;
    let staged = match database.stage_verified_pack(&release, publisher).await? {
        PackStageOutcome::Replay(stream) => {
            let state = review_state(stream.availability);
            return Ok(review(&release, stream, state));
        }
        PackStageOutcome::Staged(stream) => stream,
    };
    let tested = match parse_and_self_test_pack_payload(&release, today) {
        Ok(tested) => tested,
        Err(_) => {
            database
                .quarantine_failed_pack_self_test(&release, staged.generation)
                .await?;
            return Err(anyhow!("pack self-test failed"));
        }
    };
    if persist_artifact(artifact_root, &release, envelope).is_err() {
        database
            .quarantine_missing_pack_artifact(&tested, staged.generation)
            .await?;
        return Err(anyhow!("pack artifact could not be stored"));
    }
    let self_tested = database
        .record_pack_self_test(&tested, staged.generation)
        .await?;
    Ok(review(&release, self_tested, PackReviewState::NeedsReview))
}

#[allow(clippy::too_many_arguments)]
pub async fn activate_pack_artifact(
    database: &Database,
    artifact_root: &Path,
    publisher_key_id: &str,
    pack_id: &str,
    release_sequence: u64,
    expected_generation: u64,
    trusted_publishers: &[TrustedPublisherKey],
    today: NaiveDate,
) -> Result<PackInstallReview> {
    let stored = database
        .get_stored_pack_release(publisher_key_id, pack_id, release_sequence)
        .await?;
    let (release, tested, publisher) =
        match load_tested_artifact(artifact_root, &stored, trusted_publishers, today) {
            Ok(loaded) => loaded,
            Err(ArtifactLoadError::Missing) => {
                database
                    .quarantine_unavailable_stored_pack_artifact(&stored, expected_generation)
                    .await?;
                return Err(anyhow!("pack artifact is unavailable"));
            }
            Err(ArtifactLoadError::Invalid) => {
                database
                    .quarantine_invalid_stored_pack_artifact(&stored, expected_generation)
                    .await?;
                return Err(anyhow!("pack artifact verification failed"));
            }
        };
    let active = database
        .activate_self_tested_pack(&tested, publisher, expected_generation)
        .await?;
    Ok(review(&release, active, PackReviewState::Ready))
}

#[allow(clippy::too_many_arguments)]
pub async fn rollback_pack_artifact(
    database: &Database,
    artifact_root: &Path,
    publisher_key_id: &str,
    pack_id: &str,
    expected_generation: u64,
    trusted_publishers: &[TrustedPublisherKey],
    today: NaiveDate,
) -> Result<PackInstallReview> {
    let stream = database.get_pack_stream(publisher_key_id, pack_id).await?;
    let sequence = stream
        .rollback_release_sequence
        .ok_or_else(|| anyhow!("pack rollback is unavailable"))?;
    let stored = database
        .get_stored_pack_release(publisher_key_id, pack_id, sequence)
        .await?;
    let (release, tested, publisher) =
        match load_tested_artifact(artifact_root, &stored, trusted_publishers, today) {
            Ok(loaded) => loaded,
            Err(ArtifactLoadError::Missing) => {
                database
                    .quarantine_unavailable_rollback_pack_artifact(&stored, expected_generation)
                    .await?;
                return Err(anyhow!("pack rollback artifact is unavailable"));
            }
            Err(ArtifactLoadError::Invalid) => {
                database
                    .quarantine_invalid_rollback_pack_artifact(&stored, expected_generation)
                    .await?;
                return Err(anyhow!("pack rollback artifact is invalid"));
            }
        };
    let rolled_back = database
        .rollback_pack(&tested, publisher, expected_generation)
        .await?;
    let state = review_state(rolled_back.availability);
    Ok(review(&release, rolled_back, state))
}

pub async fn disable_pack_artifact(
    database: &Database,
    publisher_key_id: &str,
    pack_id: &str,
    expected_generation: u64,
) -> Result<PackStateChange> {
    let disabled = database
        .disable_pack(publisher_key_id, pack_id, expected_generation)
        .await?;
    Ok(state_change(disabled))
}

#[allow(clippy::too_many_arguments)]
pub async fn enable_pack_artifact(
    database: &Database,
    artifact_root: &Path,
    publisher_key_id: &str,
    pack_id: &str,
    expected_generation: u64,
    trusted_publishers: &[TrustedPublisherKey],
    today: NaiveDate,
) -> Result<PackStateChange> {
    let stream = database.get_pack_stream(publisher_key_id, pack_id).await?;
    let sequence = stream
        .active_release_sequence
        .ok_or_else(|| anyhow!("pack has no active release"))?;
    let stored = database
        .get_stored_pack_release(publisher_key_id, pack_id, sequence)
        .await?;
    let (_, tested, publisher) =
        match load_tested_artifact(artifact_root, &stored, trusted_publishers, today) {
            Ok(loaded) => loaded,
            Err(ArtifactLoadError::Missing) => {
                database
                    .quarantine_unavailable_active_pack_artifact(&stored, expected_generation)
                    .await?;
                return Err(anyhow!("pack artifact is unavailable"));
            }
            Err(ArtifactLoadError::Invalid) => {
                database
                    .quarantine_invalid_active_pack_artifact(&stored, expected_generation)
                    .await?;
                return Err(anyhow!("pack artifact verification failed"));
            }
        };
    let enabled = database
        .enable_pack(&tested, publisher, expected_generation)
        .await?;
    Ok(state_change(enabled))
}

pub async fn uninstall_pack_artifacts(
    database: &Database,
    artifact_root: &Path,
    publisher_key_id: &str,
    pack_id: &str,
    expected_generation: u64,
) -> Result<PackArtifactRemoval> {
    let releases = database
        .list_stored_pack_releases(publisher_key_id, pack_id)
        .await?;
    let stream = database.get_pack_stream(publisher_key_id, pack_id).await?;
    let removed = if stream.availability == PackAvailability::Removed
        && stream.generation == expected_generation
    {
        stream
    } else {
        database
            .uninstall_pack(publisher_key_id, pack_id, expected_generation)
            .await?
    };
    let cleanup_pending = releases
        .iter()
        .any(|release| remove_owned_artifact(artifact_root, release).is_err());
    Ok(PackArtifactRemoval {
        generation: removed.generation,
        cleanup_pending,
    })
}

fn review(
    release: &VerifiedPackRelease,
    stream: PackStream,
    state: PackReviewState,
) -> PackInstallReview {
    let manifest = release.manifest();
    PackInstallReview {
        publisher_key_id: release.publisher_key_id().to_string(),
        publisher_name: release.publisher_name().to_string(),
        license: release.license().to_string(),
        pack_id: manifest.pack_id.clone(),
        pack_version: release.pack_version().to_string(),
        pack_type: manifest.pack_type,
        release_sequence: release.release_sequence(),
        privacy_labels: manifest.privacy_labels.clone(),
        allowed_data_categories: manifest.allowed_data_categories.clone(),
        allowed_actions: manifest.allowed_actions.clone(),
        approval_gates: manifest.approval_gates.clone(),
        uses_external_ai: manifest
            .allowed_actions
            .contains(&PackAction::RequestExternalAi),
        state,
        generation: stream.generation,
    }
}

const fn review_state(availability: PackAvailability) -> PackReviewState {
    match availability {
        PackAvailability::Ready => PackReviewState::Ready,
        PackAvailability::Disabled => PackReviewState::Disabled,
        PackAvailability::Quarantined => PackReviewState::Quarantined,
        PackAvailability::Removed => PackReviewState::Removed,
    }
}

fn state_change(stream: PackStream) -> PackStateChange {
    PackStateChange {
        state: review_state(stream.availability),
        generation: stream.generation,
    }
}

fn verify_pack(
    envelope: &[u8],
    trusted_publishers: &[TrustedPublisherKey],
) -> Result<VerifiedPackRelease> {
    #[cfg(test)]
    {
        return jobsentinel_domain::v3_signed_packs::parse_signed_pack_release_for_runtime_test(
            envelope,
            trusted_publishers,
            "3.0.0",
        )
        .map_err(|_| anyhow!("pack verification failed"));
    }
    #[cfg(not(test))]
    jobsentinel_domain::v3_signed_packs::parse_signed_pack_release(envelope, trusted_publishers)
        .map_err(|_| anyhow!("pack verification failed"))
}
