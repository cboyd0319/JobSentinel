//! Authenticates update metadata and checks local compatibility without mutating installed state.

use jobsentinel_domain::{
    v3_contracts::{
        validate_archive_structure, ArchiveKind, ArchiveProtection, CompatibilityManifest, SchemaId,
    },
    v3_manifests::EditionManifest,
};
use serde::{Deserialize, Serialize};

mod availability;
mod inventory;
mod review;
mod startup;
pub use availability::{check_update_availability, UpdateAvailability};
pub use inventory::collect_installed_update_state;
pub use review::{revalidate_update, review_update, ReviewedUpdate};
pub use startup::authorize_update_startup;

const SIGNING_CONTEXT: &[u8] = b"jobsentinel.update-candidate.v1\0";
const MAX_METADATA_BYTES: usize = 64 * 1024;

/// Stable v3 release coordinates; prereleases are not update candidates.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub struct ReleaseVersion(pub [u32; 3]);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct FormatRange {
    pub min: u64,
    pub max: u64,
}

/// Reader compatibility, independent of the candidate's written database schema.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ComponentReaders {
    pub database: FormatRange,
    pub migration: FormatRange,
    pub pack: FormatRange,
    pub model: FormatRange,
    pub browser: FormatRange,
    pub region: FormatRange,
    pub backup: FormatRange,
    pub export: FormatRange,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct UpdateManifest {
    pub schema: String,
    pub publisher_key_id: String,
    pub package_sha256: String,
    pub package_bytes: u64,
    pub version: ReleaseVersion,
    pub minimum_source: ReleaseVersion,
    pub maximum_source: ReleaseVersion,
    pub edition: EditionManifest,
    pub compatibility: CompatibilityManifest,
    pub readers: ComponentReaders,
}

/// Supplied by the application trust owner, never by downloaded metadata or IPC.
#[derive(Debug)]
pub struct ReleasePublisher {
    pub key_id: String,
    pub public_key: [u8; 32],
    pub revoked: bool,
}

/// Observed by Rust owners. Absence of an optional component is an empty version list.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct InstalledUpdateState {
    pub version: ReleaseVersion,
    pub edition: EditionManifest,
    pub database: u64,
    pub migration: u64,
    pub pack: Vec<u64>,
    pub model: Vec<u64>,
    pub browser: Vec<u64>,
    pub region: Vec<u64>,
    pub pack_app_versions: Vec<(ReleaseVersion, ReleaseVersion)>,
    pub pack_identity: Vec<String>,
    pub model_identity: Vec<String>,
    pub backup: u64,
    pub export: u64,
}

/// An assessment, not installation authority: reverify bytes and local state before mutation.
#[derive(Debug)]
pub struct VerifiedUpdateCandidate(UpdateManifest);

impl VerifiedUpdateCandidate {
    pub fn manifest(&self) -> &UpdateManifest {
        &self.0
    }
}

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum UpdatePreflightError {
    #[error("Update metadata is malformed or unsupported")]
    Metadata,
    #[error("Reviewed update or installed components changed; review again")]
    Changed,
    #[error("Installed update inventory is unavailable or inconsistent")]
    Inventory,
    #[error("Update publisher or signature is not trusted")]
    Trust,
    #[error("Update package integrity check failed")]
    Integrity,
    #[error("Update is incompatible with installed components or data")]
    Compatibility,
}

/// Checks a bounded signed metadata document and the exact borrowed package bytes.
/// This function performs no IO and cannot install, migrate, restore or remove anything.
pub fn preflight_update(
    metadata: &[u8],
    signature_hex: &str,
    package: &[u8],
    publishers: &[ReleasePublisher],
    installed: &InstalledUpdateState,
) -> Result<VerifiedUpdateCandidate, UpdatePreflightError> {
    use sha2::{Digest, Sha256};
    let manifest = authenticate_manifest(metadata, signature_hex, publishers)?;
    if manifest.package_bytes != package.len() as u64
        || hex::encode(Sha256::digest(package)) != manifest.package_sha256
    {
        return Err(UpdatePreflightError::Integrity);
    }
    if !compatible(&manifest, installed) {
        return Err(UpdatePreflightError::Compatibility);
    }
    Ok(VerifiedUpdateCandidate(manifest))
}

fn authenticate_manifest(
    metadata: &[u8],
    signature_hex: &str,
    publishers: &[ReleasePublisher],
) -> Result<UpdateManifest, UpdatePreflightError> {
    use jobsentinel_security::verify_ed25519_signature;

    if metadata.is_empty() || metadata.len() > MAX_METADATA_BYTES {
        return Err(UpdatePreflightError::Metadata);
    }
    let manifest: UpdateManifest =
        serde_json::from_slice(metadata).map_err(|_| UpdatePreflightError::Metadata)?;
    let mut matching = publishers
        .iter()
        .filter(|key| key.key_id == manifest.publisher_key_id);
    let publisher = matching.next().ok_or(UpdatePreflightError::Trust)?;
    if publisher.revoked || matching.next().is_some() {
        return Err(UpdatePreflightError::Trust);
    }
    let message = [SIGNING_CONTEXT, metadata].concat();
    verify_ed25519_signature(&publisher.public_key, &message, signature_hex)
        .map_err(|_| UpdatePreflightError::Trust)?;
    validate_metadata(&manifest)?;
    Ok(manifest)
}

fn version_text(version: ReleaseVersion) -> String {
    let [major, minor, patch] = version.0;
    format!("{major}.{minor}.{patch}")
}

fn validate_metadata(manifest: &UpdateManifest) -> Result<(), UpdatePreflightError> {
    let ranges = &manifest.readers;
    if manifest.schema != "jobsentinel.update-candidate.v1"
        || manifest.publisher_key_id.is_empty()
        || manifest.publisher_key_id.len() > 128
        || manifest.package_bytes == 0
        || manifest.package_sha256.len() != 64
        || !manifest
            .package_sha256
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
        || [
            manifest.version,
            manifest.minimum_source,
            manifest.maximum_source,
        ]
        .iter()
        .any(|version| version.0[0] != 3)
        || manifest.minimum_source > manifest.maximum_source
        || manifest.edition.validate().is_err()
        || !candidate_data_contract_valid(&manifest.compatibility)
        || manifest.edition.artifact_version != version_text(manifest.version)
        || manifest.compatibility.app_version != version_text(manifest.version)
        || [
            ranges.database,
            ranges.migration,
            ranges.pack,
            ranges.model,
            ranges.browser,
            ranges.region,
            ranges.backup,
            ranges.export,
        ]
        .iter()
        .any(|range| range.min == 0 || range.min > range.max)
        || ranges.database.max != u64::from(manifest.compatibility.database_schema)
        || !(ranges.backup.min..=ranges.backup.max)
            .contains(&u64::from(manifest.compatibility.backup.format_version))
        || !(ranges.export.min..=ranges.export.max)
            .contains(&u64::from(manifest.compatibility.export.format_version))
    {
        return Err(UpdatePreflightError::Metadata);
    }
    Ok(())
}

// Candidate writers can be newer than this app; current-reader ceilings do not apply here.
fn candidate_data_contract_valid(contract: &CompatibilityManifest) -> bool {
    contract.schema == SchemaId::CompatibilityV1
        && contract.compatibility_line == 3
        && contract.database_schema > 0
        && [
            (
                &contract.backup,
                ArchiveKind::Backup,
                ArchiveProtection::Encrypted,
            ),
            (
                &contract.export,
                ArchiveKind::Export,
                ArchiveProtection::ReviewedPlaintext,
            ),
        ]
        .iter()
        .all(|(archive, kind, protection)| {
            validate_archive_structure(archive, *kind, *protection).is_ok()
        })
}

fn compatible(candidate: &UpdateManifest, local: &InstalledUpdateState) -> bool {
    let readers = &candidate.readers;
    let contains = |range: FormatRange, value| (range.min..=range.max).contains(&value);
    local.version.0[0] == 3
        && local.edition.validate().is_ok()
        && local.edition.artifact_version == version_text(local.version)
        && local.version >= candidate.minimum_source
        && local.version <= candidate.maximum_source
        && local.edition.edition == candidate.edition.edition
        && local.edition.platform == candidate.edition.platform
        && local.edition.architecture == candidate.edition.architecture
        && local
            .pack_app_versions
            .iter()
            .all(|(min, max)| min <= max && candidate.version >= *min && candidate.version <= *max)
        && contains(readers.database, local.database)
        && contains(readers.migration, local.migration)
        && contains(readers.backup, local.backup)
        && contains(readers.export, local.export)
        && [
            (readers.pack, &local.pack),
            (readers.model, &local.model),
            (readers.browser, &local.browser),
            (readers.region, &local.region),
        ]
        .iter()
        .all(|(range, versions)| versions.iter().all(|version| contains(*range, *version)))
}

#[cfg(test)]
mod tests;
