//! Proves regional review remains signature, lifecycle, and generation bound.

use super::*;
use crate::pack_runtime::open_active_region_pack;

const TODAY: NaiveDate = NaiveDate::from_ymd_opt(2026, 7, 20).unwrap();

#[tokio::test]
async fn signed_starter_fixtures_survive_region_activation_and_review() {
    let today = NaiveDate::from_ymd_opt(2026, 9, 11).unwrap();
    let fixtures = [
        (
            include_str!("../../../jobsentinel-domain/src/fixtures/region_manifests/uk_v1.json"),
            include_str!(
                "../../../jobsentinel-domain/src/fixtures/region_manifests/uk_starter_v1.json"
            ),
        ),
        (
            include_str!("../../../jobsentinel-domain/src/fixtures/region_manifests/eu_v1.json"),
            include_str!(
                "../../../jobsentinel-domain/src/fixtures/region_manifests/eu_starter_v1.json"
            ),
        ),
        (
            include_str!("../../../jobsentinel-domain/src/fixtures/region_manifests/india_v1.json"),
            include_str!(
                "../../../jobsentinel-domain/src/fixtures/region_manifests/india_starter_v1.json"
            ),
        ),
    ];
    for (manifest_json, starter_json) in fixtures {
        let database = Database::connect_memory().await.unwrap();
        database.migrate().await.unwrap();
        let artifact_root = tempfile::tempdir().unwrap();
        let starter_data: serde_json::Value = serde_json::from_str(starter_json).unwrap();
        let manifest =
            jobsentinel_domain::v3_contracts::parse_region_manifest(manifest_json, today).unwrap();
        serde_json::from_value::<jobsentinel_domain::RegionStarterData>(starter_data.clone())
            .unwrap()
            .validate(&manifest, today)
            .unwrap_or_else(|error| panic!("{}: {error}", manifest.region_id));
        let payload = json!({
            "schema": "jobsentinel.v3.pack-payload.v1", "pack_type": "region",
            "manifest_json": manifest_json, "starter_data": starter_data,
        });
        let (publisher, envelope) = signed_region_payload(1, &payload.to_string());
        let trusted = std::slice::from_ref(&publisher);
        let staged =
            stage_pack_artifact(&database, artifact_root.path(), &envelope, trusted, today)
                .await
                .unwrap();
        let active = activate_pack_artifact(
            &database,
            artifact_root.path(),
            REGION_PUBLISHER_ID,
            REGION_PACK_ID,
            1,
            staged.generation,
            trusted,
            today,
        )
        .await
        .unwrap();
        let opened = open_active_region_pack(
            &database,
            artifact_root.path(),
            REGION_PUBLISHER_ID,
            REGION_PACK_ID,
            active.generation,
            trusted,
            today,
        )
        .await
        .unwrap();
        let projected = serde_json::to_value(opened).unwrap();
        assert_eq!(projected["schema"], "jobsentinel.v3.region-manifest.v1");
        assert_eq!(projected["region_id"], starter_data["region_id"]);
        assert_eq!(projected["starter_data"], starter_data);
    }
}

#[tokio::test]
async fn regional_review_requires_the_exact_ready_generation_through_lifecycle_changes() {
    let database = Database::connect_memory().await.unwrap();
    database.migrate().await.unwrap();
    let artifact_root = tempfile::tempdir().unwrap();
    let (publisher, first) = signed_region_pack(1);
    let staged = stage_pack_artifact(
        &database,
        artifact_root.path(),
        &first,
        std::slice::from_ref(&publisher),
        TODAY,
    )
    .await
    .unwrap();

    assert!(open_active_region_pack(
        &database,
        artifact_root.path(),
        REGION_PUBLISHER_ID,
        REGION_PACK_ID,
        staged.generation,
        std::slice::from_ref(&publisher),
        TODAY,
    )
    .await
    .is_err());

    let active = activate_pack_artifact(
        &database,
        artifact_root.path(),
        REGION_PUBLISHER_ID,
        REGION_PACK_ID,
        1,
        staged.generation,
        std::slice::from_ref(&publisher),
        TODAY,
    )
    .await
    .unwrap();
    let region = open_active_region_pack(
        &database,
        artifact_root.path(),
        REGION_PUBLISHER_ID,
        REGION_PACK_ID,
        active.generation,
        std::slice::from_ref(&publisher),
        TODAY,
    )
    .await
    .unwrap();
    assert_eq!(region.manifest.region_id, "uk");
    assert!(region.manifest.incomplete_coverage);
    assert_eq!(
        serde_json::to_value(&region).unwrap(),
        serde_json::to_value(&region.manifest).unwrap()
    );
    assert!(open_active_region_pack(
        &database,
        artifact_root.path(),
        REGION_PUBLISHER_ID,
        REGION_PACK_ID,
        staged.generation,
        std::slice::from_ref(&publisher),
        TODAY,
    )
    .await
    .is_err());

    let disabled = disable_pack_artifact(
        &database,
        REGION_PUBLISHER_ID,
        REGION_PACK_ID,
        active.generation,
    )
    .await
    .unwrap();
    assert!(open_active_region_pack(
        &database,
        artifact_root.path(),
        REGION_PUBLISHER_ID,
        REGION_PACK_ID,
        disabled.generation,
        std::slice::from_ref(&publisher),
        TODAY,
    )
    .await
    .is_err());
    let enabled = enable_pack_artifact(
        &database,
        artifact_root.path(),
        REGION_PUBLISHER_ID,
        REGION_PACK_ID,
        disabled.generation,
        std::slice::from_ref(&publisher),
        TODAY,
    )
    .await
    .unwrap();
    assert_eq!(
        open_active_region_pack(
            &database,
            artifact_root.path(),
            REGION_PUBLISHER_ID,
            REGION_PACK_ID,
            enabled.generation,
            std::slice::from_ref(&publisher),
            TODAY,
        )
        .await
        .unwrap()
        .manifest
        .region_id,
        "uk"
    );

    let (_, upgrade) = signed_region_pack(3);
    let update = stage_pack_artifact(
        &database,
        artifact_root.path(),
        &upgrade,
        std::slice::from_ref(&publisher),
        TODAY,
    )
    .await
    .unwrap();
    let upgraded = activate_pack_artifact(
        &database,
        artifact_root.path(),
        REGION_PUBLISHER_ID,
        REGION_PACK_ID,
        3,
        update.generation,
        std::slice::from_ref(&publisher),
        TODAY,
    )
    .await
    .unwrap();
    let rolled_back = rollback_pack_artifact(
        &database,
        artifact_root.path(),
        REGION_PUBLISHER_ID,
        REGION_PACK_ID,
        upgraded.generation,
        std::slice::from_ref(&publisher),
        TODAY,
    )
    .await
    .unwrap();
    assert_eq!(rolled_back.release_sequence, 1);
    let removed = uninstall_pack_artifacts(
        &database,
        artifact_root.path(),
        REGION_PUBLISHER_ID,
        REGION_PACK_ID,
        rolled_back.generation,
    )
    .await
    .unwrap();
    assert!(open_active_region_pack(
        &database,
        artifact_root.path(),
        REGION_PUBLISHER_ID,
        REGION_PACK_ID,
        removed.generation,
        std::slice::from_ref(&publisher),
        TODAY,
    )
    .await
    .is_err());
}

#[tokio::test]
async fn regional_review_fails_closed_when_artifact_or_trust_changes() {
    for trust_revoked in [false, true] {
        let database = Database::connect_memory().await.unwrap();
        database.migrate().await.unwrap();
        let artifact_root = tempfile::tempdir().unwrap();
        let (publisher, envelope) = signed_region_pack(1);
        let staged = stage_pack_artifact(
            &database,
            artifact_root.path(),
            &envelope,
            std::slice::from_ref(&publisher),
            TODAY,
        )
        .await
        .unwrap();
        let active = activate_pack_artifact(
            &database,
            artifact_root.path(),
            REGION_PUBLISHER_ID,
            REGION_PACK_ID,
            1,
            staged.generation,
            std::slice::from_ref(&publisher),
            TODAY,
        )
        .await
        .unwrap();
        let trusted = if trust_revoked {
            TrustedPublisherKey {
                revoked: true,
                ..publisher.clone()
            }
        } else {
            std::fs::write(walk_files(artifact_root.path()).pop().unwrap(), b"altered").unwrap();
            publisher
        };

        assert!(open_active_region_pack(
            &database,
            artifact_root.path(),
            REGION_PUBLISHER_ID,
            REGION_PACK_ID,
            active.generation,
            std::slice::from_ref(&trusted),
            TODAY,
        )
        .await
        .is_err());
        assert_eq!(
            database
                .get_pack_stream(REGION_PUBLISHER_ID, REGION_PACK_ID)
                .await
                .unwrap()
                .availability,
            PackAvailability::Quarantined
        );
    }
}
