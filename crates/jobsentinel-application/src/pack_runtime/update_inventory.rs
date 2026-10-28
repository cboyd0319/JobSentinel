//! Re-verifies every retained pack artifact before assessing an application update.

use super::{load_tested_artifact, production_trusted_publishers, PackRuntimeEnvironment};
use jobsentinel_domain::v3_signed_packs::VerifiedPackRelease;
use jobsentinel_storage::{v3_pack_lifecycle::PackReleaseState, Database};

pub(crate) async fn update_pack_inventory(
    database: &Database,
    runtime: &PackRuntimeEnvironment,
) -> anyhow::Result<(Vec<VerifiedPackRelease>, Vec<String>)> {
    let mut verified = Vec::new();
    let mut identities = Vec::new();
    for stream in database.list_pack_management().await? {
        identities.push(serde_json::to_string(&(
            &stream.publisher_key_id,
            &stream.publisher_public_key_sha256,
            &stream.pack_id,
            stream.generation,
            stream.high_water_sequence,
            stream.active_release_sequence,
            stream.rollback_release_sequence,
            format!("{:?}", stream.availability),
            stream.cleanup_pending,
        ))?);
        for release in stream.releases {
            if release.lifecycle_state == PackReleaseState::Removed
                && !release.artifact_cleanup_pending
            {
                continue;
            }
            anyhow::ensure!(
                verified.len() < 1024,
                "Pack update inventory exceeds its limit"
            );
            let stored = database
                .get_stored_pack_release(
                    &stream.publisher_key_id,
                    &stream.pack_id,
                    release.release_sequence,
                )
                .await?;
            let (artifact, _, _) = load_tested_artifact(
                runtime.artifact_root(),
                &stored,
                production_trusted_publishers(),
                chrono::Utc::now().date_naive(),
            )
            .map_err(|_| anyhow::anyhow!("Retained pack cannot be verified for update"))?;
            identities.push(serde_json::to_string(&(
                artifact.release_id(),
                artifact.signed_release_sha256(),
                release.release_sequence,
                format!("{:?}", release.lifecycle_state),
                release.artifact_cleanup_pending,
            ))?);
            verified.push(artifact);
        }
    }
    identities.sort();
    Ok((verified, identities))
}
