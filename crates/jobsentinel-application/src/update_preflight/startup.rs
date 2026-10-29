//! Authenticates target-version startup against the exact persisted signed release before migrations.

use super::{
    authenticate_manifest,
    inventory::{build_edition, parse_version},
    ReleasePublisher, UpdatePreflightError,
};
use jobsentinel_storage::{Database, PreparedUpdate};
use std::path::Path;

/// Returns only an authenticated target journal; storage rechecks full equality under ownership.
pub fn authorize_update_startup(
    database: &Path,
) -> Result<Option<PreparedUpdate>, UpdatePreflightError> {
    let Some(journal) =
        Database::inspect_prepared_update(database).map_err(|_| UpdatePreflightError::Inventory)?
    else {
        return Ok(None);
    };
    let running = build_edition()?;
    if journal.source_version == running.artifact_version {
        return Ok(None);
    }
    verify_target(&journal, &running, ReleasePublisher::production_trust())?;
    Ok(Some(journal))
}

fn verify_target(
    journal: &PreparedUpdate,
    running: &jobsentinel_domain::manifests::EditionManifest,
    publishers: &[ReleasePublisher],
) -> Result<(), UpdatePreflightError> {
    let release = journal
        .signed_release
        .as_ref()
        .ok_or(UpdatePreflightError::Trust)?;
    let manifest =
        authenticate_manifest(release.metadata.as_bytes(), &release.signature, publishers)?;
    let source = parse_version(&journal.source_version)?;
    if journal
        .reconciled_version
        .as_ref()
        .is_some_and(|observed| observed != &journal.target_version)
        || &manifest.edition != running
        || manifest.version != parse_version(&running.artifact_version)?
        || journal.target_version != running.artifact_version
        || manifest.package_sha256 != journal.package_sha256
        || source < manifest.minimum_source
        || source > manifest.maximum_source
        || !(manifest.readers.database.min..=manifest.readers.database.max)
            .contains(&journal.snapshot.database_schema)
        || !(manifest.readers.migration.min..=manifest.readers.migration.max)
            .contains(&journal.snapshot.migration_sequence)
    {
        return Err(UpdatePreflightError::Compatibility);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::update_preflight::tests::{fixture, signed};
    use jobsentinel_storage::{SignedUpdateRelease, UpdateSnapshot};
    #[test]
    fn target_startup_requires_trust_exact_build_and_source_snapshot_compatibility() {
        let (manifest, _) = fixture();
        let (metadata, signature, mut publishers) = signed(&manifest);
        let mut journal = PreparedUpdate {
            staged_package: None,
            phase: jobsentinel_storage::UpdatePreparationPhase::Prepared,
            schema: "jobsentinel.prepared-update.v1".into(),
            source_version: "3.0.0".into(),
            target_version: "3.1.0".into(),
            package_sha256: manifest.package_sha256.clone(),
            reconciled_version: None,
            signed_release: Some(SignedUpdateRelease {
                metadata: String::from_utf8(metadata).unwrap(),
                signature,
            }),
            snapshot: UpdateSnapshot {
                schema: "jobsentinel.update-snapshot.v1".into(),
                operation_id: uuid::Uuid::new_v4().to_string(),
                database_identity: "identity".into(),
                database_schema: 2,
                migration_sequence: 29,
                sha256: "a".repeat(64),
            },
        };
        assert!(verify_target(&journal, &manifest.edition, &publishers).is_ok());
        assert!(verify_target(
            &journal,
            &manifest.edition,
            ReleasePublisher::production_trust()
        )
        .is_err());
        let mut wrong = manifest.edition.clone();
        wrong.artifact_version = "3.1.1".into();
        assert!(verify_target(&journal, &wrong, &publishers).is_err());
        journal.snapshot.migration_sequence = 30;
        assert!(verify_target(&journal, &manifest.edition, &publishers).is_err());
        journal.snapshot.migration_sequence = 29;
        publishers[0].revoked = true;
        assert!(verify_target(&journal, &manifest.edition, &publishers).is_err());
    }
}
