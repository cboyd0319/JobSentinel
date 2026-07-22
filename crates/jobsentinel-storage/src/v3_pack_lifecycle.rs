use std::{error::Error, fmt};

use anyhow::{anyhow, Result};
use chrono::Utc;
use jobsentinel_domain::{
    v3_manifests::{PackExecutionClass, PackType},
    v3_signed_packs::{TrustedPublisherKey, VerifiedPackRelease},
};
use sha2::{Digest, Sha256};
use sqlx::{FromRow, Sqlite, Transaction};

use crate::Database;

#[derive(Debug)]
enum PackLifecycleError {
    Invalid,
    Revoked,
    Downgrade,
    Equivocation,
    Corrupt,
}

impl fmt::Display for PackLifecycleError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(match self {
            Self::Invalid => "pack lifecycle input is invalid",
            Self::Revoked => "pack publisher is revoked",
            Self::Downgrade => "pack release is older than the retained high-water mark",
            Self::Equivocation => "pack publisher reused a release sequence",
            Self::Corrupt => "stored pack lifecycle state is invalid",
        })
    }
}

impl Error for PackLifecycleError {}

pub fn pack_lifecycle_error_kind(error: &anyhow::Error) -> Option<&'static str> {
    Some(match error.downcast_ref::<PackLifecycleError>()? {
        PackLifecycleError::Invalid => "invalid",
        PackLifecycleError::Revoked => "revoked",
        PackLifecycleError::Downgrade => "downgrade",
        PackLifecycleError::Equivocation => "equivocation",
        PackLifecycleError::Corrupt => "corrupt",
    })
}

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

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PackStageOutcome {
    Staged(PackStream),
    Replay(PackStream),
}

#[derive(FromRow)]
struct PackStreamRow {
    publisher_key_id: String,
    pack_id: String,
    high_water_sequence: i64,
    active_release_sequence: Option<i64>,
    rollback_release_sequence: Option<i64>,
    availability: String,
    generation: i64,
}

impl Database {
    pub async fn stage_verified_pack(
        &self,
        release: &VerifiedPackRelease,
        publisher: &TrustedPublisherKey,
    ) -> Result<PackStageOutcome> {
        validate_stage_input(release, publisher)?;
        let sequence = i64::try_from(release.release_sequence()).map_err(|_| invalid())?;
        let public_key_sha256 = hex::encode(Sha256::digest(publisher.public_key));
        let now = Utc::now().to_rfc3339();
        let mut transaction = self.pool().begin().await?;

        sqlx::query(
            "INSERT INTO v3_pack_publishers (
                publisher_key_id, public_key_sha256, trust_state,
                revoked_at, created_at, updated_at
             ) VALUES (?, ?, 'trusted', NULL, ?, ?)
             ON CONFLICT(publisher_key_id) DO NOTHING",
        )
        .bind(&publisher.publisher_key_id)
        .bind(&public_key_sha256)
        .bind(&now)
        .bind(&now)
        .execute(&mut *transaction)
        .await?;
        let (stored_key_sha256, trust_state): (String, String) = sqlx::query_as(
            "SELECT public_key_sha256, trust_state
             FROM v3_pack_publishers
             WHERE publisher_key_id = ?",
        )
        .bind(&publisher.publisher_key_id)
        .fetch_one(&mut *transaction)
        .await?;
        if stored_key_sha256 != public_key_sha256 {
            return Err(equivocation());
        }
        if trust_state != "trusted" {
            return Err(revoked());
        }

        if let Some(stored_digest) = sqlx::query_scalar::<_, String>(
            "SELECT signed_release_sha256
             FROM v3_pack_releases
             WHERE publisher_key_id = ?
               AND pack_id = ?
               AND release_sequence = ?",
        )
        .bind(release.publisher_key_id())
        .bind(&release.manifest().pack_id)
        .bind(sequence)
        .fetch_optional(&mut *transaction)
        .await?
        {
            if stored_digest != release.signed_release_sha256() {
                return Err(equivocation());
            }
            let stream = fetch_stream(&mut transaction, release).await?;
            transaction.commit().await?;
            return Ok(PackStageOutcome::Replay(stream));
        }

        let high_water = sqlx::query_scalar::<_, i64>(
            "SELECT high_water_sequence
             FROM v3_pack_streams
             WHERE publisher_key_id = ? AND pack_id = ?",
        )
        .bind(release.publisher_key_id())
        .bind(&release.manifest().pack_id)
        .fetch_optional(&mut *transaction)
        .await?;
        if high_water.is_some_and(|value| sequence <= value) {
            return Err(downgrade());
        }

        sqlx::query(
            "INSERT INTO v3_pack_streams (
                publisher_key_id, pack_id, high_water_sequence,
                high_water_signed_release_sha256, active_release_sequence,
                rollback_release_sequence, availability, generation,
                created_at, updated_at
             ) VALUES (?, ?, 0, NULL, NULL, NULL, 'quarantined', 0, ?, ?)
             ON CONFLICT(publisher_key_id, pack_id) DO NOTHING",
        )
        .bind(release.publisher_key_id())
        .bind(&release.manifest().pack_id)
        .bind(&now)
        .bind(&now)
        .execute(&mut *transaction)
        .await?;

        sqlx::query(
            "INSERT INTO v3_pack_releases (
                publisher_key_id, pack_id, release_sequence, release_id,
                signed_release_sha256, payload_sha256, pack_version,
                pack_type, execution_class, lifecycle_state,
                quarantine_reason, self_tested_at, created_at, updated_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'staged', NULL, NULL, ?, ?)",
        )
        .bind(release.publisher_key_id())
        .bind(&release.manifest().pack_id)
        .bind(sequence)
        .bind(release.release_id())
        .bind(release.signed_release_sha256())
        .bind(&release.manifest().payload_sha256)
        .bind(release.pack_version())
        .bind(pack_type_text(release.manifest().pack_type)?)
        .bind(execution_class_text(release.manifest().execution_class))
        .bind(&now)
        .bind(&now)
        .execute(&mut *transaction)
        .await?;

        let stream = fetch_stream(&mut transaction, release).await?;
        transaction.commit().await?;
        Ok(PackStageOutcome::Staged(stream))
    }
}

async fn fetch_stream(
    transaction: &mut Transaction<'_, Sqlite>,
    release: &VerifiedPackRelease,
) -> Result<PackStream> {
    let row = sqlx::query_as::<_, PackStreamRow>(
        "SELECT publisher_key_id, pack_id, high_water_sequence,
                active_release_sequence, rollback_release_sequence,
                availability, generation
         FROM v3_pack_streams
         WHERE publisher_key_id = ? AND pack_id = ?",
    )
    .bind(release.publisher_key_id())
    .bind(&release.manifest().pack_id)
    .fetch_one(&mut **transaction)
    .await?;
    stream_from_row(row)
}

fn stream_from_row(row: PackStreamRow) -> Result<PackStream> {
    Ok(PackStream {
        publisher_key_id: row.publisher_key_id,
        pack_id: row.pack_id,
        high_water_sequence: u64::try_from(row.high_water_sequence).map_err(|_| corrupt())?,
        active_release_sequence: row
            .active_release_sequence
            .map(u64::try_from)
            .transpose()
            .map_err(|_| corrupt())?,
        rollback_release_sequence: row
            .rollback_release_sequence
            .map(u64::try_from)
            .transpose()
            .map_err(|_| corrupt())?,
        availability: match row.availability.as_str() {
            "ready" => PackAvailability::Ready,
            "disabled" => PackAvailability::Disabled,
            "quarantined" => PackAvailability::Quarantined,
            "removed" => PackAvailability::Removed,
            _ => return Err(corrupt()),
        },
        generation: u64::try_from(row.generation).map_err(|_| corrupt())?,
    })
}

fn validate_stage_input(
    release: &VerifiedPackRelease,
    publisher: &TrustedPublisherKey,
) -> Result<()> {
    release.manifest().validate().map_err(|_| invalid())?;
    release
        .manifest()
        .verify_payload(release.payload().as_bytes())
        .map_err(|_| invalid())?;
    if publisher.revoked {
        return Err(revoked());
    }
    if publisher.publisher_key_id != release.publisher_key_id()
        || release.publisher_key_id() != release.manifest().publisher_key_id
        || hex::encode(Sha256::digest(publisher.public_key))
            != release.publisher_public_key_sha256()
        || publisher.pack_type != release.manifest().pack_type
        || publisher.execution_class != release.manifest().execution_class
        || release.release_sequence() == 0
        || release.release_id()
            != format!(
                "{}:{}:{}",
                release.publisher_key_id(),
                release.manifest().pack_id,
                release.release_sequence()
            )
        || !is_sha256(release.signed_release_sha256())
        || !is_sha256(release.publisher_public_key_sha256())
    {
        return Err(invalid());
    }
    Ok(())
}

fn pack_type_text(pack_type: PackType) -> Result<&'static str> {
    match pack_type {
        PackType::Skill => Ok("skill"),
        PackType::Agent => Ok("agent"),
        PackType::Workflow => Ok("workflow"),
        PackType::Source => Ok("source"),
        PackType::Evaluation => Ok("evaluation"),
        PackType::Role
        | PackType::Region
        | PackType::Rubric
        | PackType::Template
        | PackType::OsHelper => Err(invalid()),
    }
}

const fn execution_class_text(execution_class: PackExecutionClass) -> &'static str {
    match execution_class {
        PackExecutionClass::StaticContent => "static_content",
        PackExecutionClass::ReviewedTypedWorkflow => "reviewed_typed_workflow",
    }
}

fn is_sha256(value: &str) -> bool {
    value.len() == 64
        && value
            .bytes()
            .all(|byte| byte.is_ascii_hexdigit() && !byte.is_ascii_uppercase())
}

fn invalid() -> anyhow::Error {
    anyhow!(PackLifecycleError::Invalid)
}

fn revoked() -> anyhow::Error {
    anyhow!(PackLifecycleError::Revoked)
}

fn downgrade() -> anyhow::Error {
    anyhow!(PackLifecycleError::Downgrade)
}

fn equivocation() -> anyhow::Error {
    anyhow!(PackLifecycleError::Equivocation)
}

fn corrupt() -> anyhow::Error {
    anyhow!(PackLifecycleError::Corrupt)
}
