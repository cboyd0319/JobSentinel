use jobsentinel_domain::{
    v3_contracts::SchemaId,
    v3_manifests::{PackExecutionClass, PackManifest, PackType, PrivacyLabel},
    v3_signed_packs::{
        parse_signed_pack_release_for_runtime_test, TrustedPublisherKey, VerifiedPackRelease,
    },
};
use jobsentinel_security::sign_ed25519_for_test;
use serde_json::json;
use sha2::{Digest, Sha256};

use crate::{
    pack_lifecycle_error_kind,
    test_support::migrated_database,
    v3_pack_lifecycle::{PackAvailability, PackStageOutcome},
};

const PUBLISHER_ID: &str = "jobsentinel-test-source-v1";
const PACK_ID: &str = "jobsentinel.test.synthetic-source";

fn publisher(seed: u8) -> TrustedPublisherKey {
    let (public_key, _) = sign_ed25519_for_test(&[seed; 32], &[]).unwrap();
    TrustedPublisherKey {
        publisher_key_id: PUBLISHER_ID.to_string(),
        public_key,
        revoked: false,
        pack_type: PackType::Source,
        execution_class: PackExecutionClass::StaticContent,
        allowed_privacy_labels: vec![PrivacyLabel::LocalOnly],
        allowed_data_categories: vec![],
        allowed_task_kinds: vec![],
        allowed_actions: vec![],
        allowed_approval_gates: vec![],
        allow_gateway_external_ai: false,
    }
}

fn release(
    sequence: u64,
    signed_content: &str,
    publisher: &TrustedPublisherKey,
) -> VerifiedPackRelease {
    let payload = format!("synthetic source payload {signed_content}");
    let manifest = PackManifest {
        schema: SchemaId::PackManifestV1,
        pack_id: PACK_ID.to_string(),
        pack_type: PackType::Source,
        execution_class: PackExecutionClass::StaticContent,
        publisher_key_id: PUBLISHER_ID.to_string(),
        payload_sha256: hex::encode(Sha256::digest(payload.as_bytes())),
        privacy_labels: vec![PrivacyLabel::LocalOnly],
        allowed_data_categories: vec![],
        allowed_task_kinds: vec![],
        allowed_actions: vec![],
        approval_gates: vec![],
        gateway_policy_id: None,
    };
    let signed_release = serde_json::to_string(&json!({
        "release_id": format!("{PUBLISHER_ID}:{PACK_ID}:{sequence}"),
        "pack_version": format!("1.0.{sequence}"),
        "min_v3_app_version": "3.0.0",
        "max_v3_app_version": "3.0.0",
        "release_sequence": sequence,
        "publisher_name": "JobSentinel Test",
        "license": "MIT",
        "manifest_json": serde_json::to_string(&manifest).unwrap(),
        "payload": payload,
        "payload_bytes": payload.len(),
        "fixture_summary": "Synthetic source fixtures",
        "external_destinations": []
    }))
    .unwrap();
    let mut signing_bytes = b"jobsentinel.pack-envelope.v1\0".to_vec();
    for value in [PUBLISHER_ID.as_bytes(), signed_release.as_bytes()] {
        signing_bytes.extend_from_slice(&(value.len() as u64).to_le_bytes());
        signing_bytes.extend_from_slice(value);
    }
    let (public_key, signature) = sign_ed25519_for_test(&[7; 32], &signing_bytes).unwrap();
    assert_eq!(public_key, publisher.public_key);
    let envelope = serde_json::to_vec(&json!({
        "schema": "jobsentinel.v3.signed-pack-envelope.v1",
        "publisher_key_id": PUBLISHER_ID,
        "signed_release": signed_release,
        "signature": hex::encode(signature)
    }))
    .unwrap();
    parse_signed_pack_release_for_runtime_test(&envelope, std::slice::from_ref(publisher), "3.0.0")
        .unwrap()
}

#[tokio::test]
async fn staging_is_monotonic_and_exact_replay_is_inert() {
    let database = migrated_database().await;
    let publisher = publisher(7);
    let first = release(1, "one", &publisher);

    let PackStageOutcome::Staged(staged) = database
        .stage_verified_pack(&first, &publisher)
        .await
        .unwrap()
    else {
        panic!("first release must be staged");
    };
    assert_eq!(staged.high_water_sequence, 1);
    assert_eq!(staged.availability, PackAvailability::Quarantined);
    assert_eq!(staged.generation, 1);

    assert_eq!(
        database
            .stage_verified_pack(&first, &publisher)
            .await
            .unwrap(),
        PackStageOutcome::Replay(staged.clone())
    );

    let equivocation = database
        .stage_verified_pack(&release(1, "different", &publisher), &publisher)
        .await
        .unwrap_err();
    assert_eq!(
        pack_lifecycle_error_kind(&equivocation),
        Some("equivocation")
    );

    let third = database
        .stage_verified_pack(&release(3, "three", &publisher), &publisher)
        .await
        .unwrap();
    assert!(matches!(third, PackStageOutcome::Staged(_)));
    let downgrade = database
        .stage_verified_pack(&release(2, "two", &publisher), &publisher)
        .await
        .unwrap_err();
    assert_eq!(pack_lifecycle_error_kind(&downgrade), Some("downgrade"));

    let PackStageOutcome::Replay(after_replay) = database
        .stage_verified_pack(&first, &publisher)
        .await
        .unwrap()
    else {
        panic!("retained old release must be an inert replay");
    };
    assert_eq!(after_replay.high_water_sequence, 3);
    assert_eq!(after_replay.active_release_sequence, None);
}

#[tokio::test]
async fn staging_requires_the_publisher_key_used_for_verification() {
    let database = migrated_database().await;
    let verified_publisher = publisher(7);
    let verified = release(1, "one", &verified_publisher);

    let error = database
        .stage_verified_pack(&verified, &publisher(8))
        .await
        .unwrap_err();

    assert_eq!(pack_lifecycle_error_kind(&error), Some("invalid"));
}
