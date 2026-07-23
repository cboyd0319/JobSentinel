use chrono::NaiveDate;
use jobsentinel_domain::{
    v3_contracts::SchemaId,
    v3_manifests::{PackExecutionClass, PackManifest, PackType, PrivacyLabel},
    v3_signed_packs::TrustedPublisherKey,
};
use jobsentinel_security::sign_ed25519_for_test;
use jobsentinel_storage::v3_pack_lifecycle::{PackQuarantineReason, PackReleaseState};
use jobsentinel_storage::{v3_pack_lifecycle::PackAvailability, Database};
use serde_json::json;
use sha2::{Digest, Sha256};

use crate::pack_runtime::{
    activate_pack_artifact, disable_pack_artifact, enable_pack_artifact,
    reconcile_active_pack_artifacts, rollback_pack_artifact, stage_pack_artifact,
    uninstall_pack_artifacts, PackReviewState,
};

const PUBLISHER_ID: &str = "jobsentinel-test-source-v1";
const PACK_ID: &str = "jobsentinel.test.synthetic-source";

fn signed_source_pack(sequence: u64) -> (TrustedPublisherKey, Vec<u8>) {
    let (public_key, _) = sign_ed25519_for_test(&[7; 32], &[]).unwrap();
    let publisher = TrustedPublisherKey {
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
    };
    let payload = valid_source_payload();
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
    let (_, signature) = sign_ed25519_for_test(&[7; 32], &signing_bytes).unwrap();
    let envelope = serde_json::to_vec(&json!({
        "schema": "jobsentinel.v3.signed-pack-envelope.v1",
        "publisher_key_id": PUBLISHER_ID,
        "signed_release": signed_release,
        "signature": hex::encode(signature)
    }))
    .unwrap();
    (publisher, envelope)
}

async fn stage_and_activate(
    database: &Database,
    artifact_root: &std::path::Path,
    publisher: &TrustedPublisherKey,
    sequence: u64,
) -> crate::pack_runtime::PackInstallReview {
    let (_, envelope) = signed_source_pack(sequence);
    let staged = stage_pack_artifact(
        database,
        artifact_root,
        &envelope,
        std::slice::from_ref(publisher),
        NaiveDate::from_ymd_opt(2026, 7, 20).unwrap(),
    )
    .await
    .unwrap();
    activate_pack_artifact(
        database,
        artifact_root,
        PUBLISHER_ID,
        PACK_ID,
        sequence,
        staged.generation,
        std::slice::from_ref(publisher),
        NaiveDate::from_ymd_opt(2026, 7, 20).unwrap(),
    )
    .await
    .unwrap()
}

fn valid_source_payload() -> String {
    serde_json::to_string(&json!({
        "schema": "jobsentinel.v3.pack-payload.v1",
        "pack_type": "source",
        "policy": {
            "source_id": "synthetic-official-jobs",
            "source_class": "official_public_api",
            "access": "disabled",
            "request_limit_per_hour": 0,
            "user_review_required": false,
            "policy_ref": "synthetic-official-jobs-v1",
            "revision": 1,
            "restriction_reason_code": null,
            "reviewed_at": "2026-07-19T00:00:00Z"
        },
        "manifest_json": include_str!(
            "../../jobsentinel-domain/src/fixtures/v3_source_manifest_v1.json"
        ),
        "fixtures": [
            {
                "path": "crates/jobsentinel-domain/src/fixtures/source_simulator/synthetic_official_list.json",
                "content": include_str!(
                    "../../jobsentinel-domain/src/fixtures/source_simulator/synthetic_official_list.json"
                )
            },
            {
                "path": "crates/jobsentinel-domain/src/fixtures/source_simulator/synthetic_official_detail.json",
                "content": include_str!(
                    "../../jobsentinel-domain/src/fixtures/source_simulator/synthetic_official_detail.json"
                )
            },
            {
                "path": "crates/jobsentinel-domain/src/fixtures/source_reviews/synthetic_official_v1.json",
                "content": include_str!(
                    "../../jobsentinel-domain/src/fixtures/source_reviews/synthetic_official_v1.json"
                )
            }
        ]
    }))
    .unwrap()
}

fn walk_files(root: &std::path::Path) -> Vec<std::path::PathBuf> {
    let mut pending = vec![root.to_path_buf()];
    let mut files = Vec::new();
    while let Some(path) = pending.pop() {
        for entry in std::fs::read_dir(path).unwrap().flatten() {
            if entry.file_type().unwrap().is_dir() {
                pending.push(entry.path());
            } else if entry.file_type().unwrap().is_file() {
                files.push(entry.path());
            }
        }
    }
    files
}

mod integrity;
mod lifecycle;
mod recovery;
