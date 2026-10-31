//! Supplies synthetic release fixtures and a fixed public test identity for boundary tests.

use super::*;
use jobsentinel_security::sign_ed25519_for_test;
use sha2::{Digest, Sha256};

pub fn fixture() -> (UpdateManifest, InstalledUpdateState) {
    let edition: EditionManifest = serde_json::from_value(serde_json::json!({
        "schema":"jobsentinel.v3.edition-manifest.v1", "edition":"essentials", "profile":"lighter",
        "artifact_version":"3.1.0", "platform":"macos", "architecture":"aarch64", "compatibility_line":3,
        "rollback_supported":true,"default_components":["deterministic_matching"],"automatic_model_downloads":false
    })).expect("edition fixture");
    let compatibility = serde_json::from_value(serde_json::json!({
        "schema":"jobsentinel.v3.compatibility.v1", "app_version":"3.1.0", "compatibility_line":3,
        "database_schema":2,"backup":{"kind":"backup","format_version":1,"contains_secrets":false,"protection":"encrypted","user_review_required":true},
        "export":{"kind":"export","format_version":1,"contains_secrets":false,"protection":"reviewed_plaintext","user_review_required":true},"vector_backend":"sqlite_blob_v1"
    })).expect("compatibility fixture");
    let range = FormatRange { min: 1, max: 2 };
    let manifest = UpdateManifest {
        schema: "jobsentinel.update-candidate.v1".into(),
        publisher_key_id: "release-test".into(),
        package_sha256: hex::encode(Sha256::digest(b"package")),
        package_bytes: 7,
        version: ReleaseVersion([3, 1, 0]),
        minimum_source: ReleaseVersion([3, 0, 0]),
        maximum_source: ReleaseVersion([3, 2, 0]),
        edition: edition.clone(),
        compatibility,
        readers: ComponentReaders {
            database: range,
            migration: FormatRange { min: 1, max: 29 },
            pack: range,
            model: range,
            browser: range,
            region: range,
            backup: range,
            export: range,
        },
    };
    let mut installed_edition = edition;
    installed_edition.artifact_version = "3.0.0".into();
    (
        manifest,
        InstalledUpdateState {
            version: ReleaseVersion([3, 0, 0]),
            edition: installed_edition,
            database: 2,
            migration: 29,
            pack: vec![1],
            model: vec![1],
            browser: vec![1],
            region: vec![1],
            pack_app_versions: vec![],
            pack_identity: vec![],
            model_identity: vec![],
            backup: 1,
            export: 1,
        },
    )
}

pub fn signed(manifest: &UpdateManifest) -> (Vec<u8>, String, Vec<ReleasePublisher>) {
    let bytes = serde_json::to_vec(manifest).expect("serialize fixture");
    let message = [SIGNING_CONTEXT, bytes.as_slice()].concat();
    let (public_key, signature) = sign_ed25519_for_test(&[41; 32], &message).expect("test key");
    (
        bytes,
        hex::encode(signature),
        vec![ReleasePublisher {
            key_id: "release-test".into(),
            public_key,
            revoked: false,
        }],
    )
}
