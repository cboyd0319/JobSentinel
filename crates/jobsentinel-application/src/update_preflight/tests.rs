//! Exercises authenticated update assessment and refusal without mutable installed state.

use super::*;
use jobsentinel_domain::contracts::{Architecture, Platform};
use jobsentinel_security::sign_ed25519_for_test;

pub(super) use super::test_support::{fixture, signed};

#[test]
fn authenticated_candidate_preserves_installed_state() {
    let (manifest, installed) = fixture();
    let before = installed.clone();
    let (bytes, signature, publishers) = signed(&manifest);
    let result = preflight_update(&bytes, &signature, b"package", &publishers, &installed)
        .expect("compatible candidate");
    assert_eq!(result.manifest().version, ReleaseVersion([3, 1, 0]));
    assert_eq!(installed, before);
}

#[test]
fn rejects_untrusted_revoked_ambiguous_and_tampered_publishers() {
    let (manifest, installed) = fixture();
    let (mut bytes, signature, mut publishers) = signed(&manifest);
    assert_eq!(
        preflight_update(&bytes, &signature, b"package", &[], &installed).unwrap_err(),
        UpdatePreflightError::Trust
    );
    publishers[0].revoked = true;
    assert_eq!(
        preflight_update(&bytes, &signature, b"package", &publishers, &installed).unwrap_err(),
        UpdatePreflightError::Trust
    );
    publishers[0].revoked = false;
    publishers.push(ReleasePublisher {
        key_id: publishers[0].key_id.clone(),
        public_key: publishers[0].public_key,
        revoked: false,
    });
    assert_eq!(
        preflight_update(&bytes, &signature, b"package", &publishers, &installed).unwrap_err(),
        UpdatePreflightError::Trust
    );
    publishers.pop();
    bytes.push(b' ');
    assert_eq!(
        preflight_update(&bytes, &signature, b"package", &publishers, &installed).unwrap_err(),
        UpdatePreflightError::Trust
    );
}

#[test]
fn refuses_changed_or_truncated_package_and_wrong_signing_context() {
    let (manifest, installed) = fixture();
    let (bytes, signature, publishers) = signed(&manifest);
    for package in [b"packagE".as_slice(), b"packag".as_slice()] {
        assert_eq!(
            preflight_update(&bytes, &signature, package, &publishers, &installed).unwrap_err(),
            UpdatePreflightError::Integrity
        );
    }
    let (_, signature) = sign_ed25519_for_test(&[41; 32], &bytes).expect("test key");
    assert_eq!(
        preflight_update(
            &bytes,
            &hex::encode(signature),
            b"package",
            &publishers,
            &installed
        )
        .unwrap_err(),
        UpdatePreflightError::Trust
    );
}

#[test]
fn refuses_every_incompatible_local_component_and_platform() {
    let (manifest, installed) = fixture();
    let (bytes, signature, publishers) = signed(&manifest);
    for index in 0..12 {
        let mut local = installed.clone();
        match index {
            0 => local.database = 3,
            1 => local.migration = 30,
            2 => local.pack.push(3),
            3 => local.model.push(3),
            4 => local.browser.push(3),
            5 => local.region.push(3),
            6 => local.backup = 3,
            7 => local.export = 3,
            8 => local.edition.platform = Platform::Windows,
            9 => local.edition.architecture = Architecture::X86_64,
            10 => local.version = ReleaseVersion([2, 9, 5]),
            _ => local.edition.edition = jobsentinel_domain::manifests::Edition::Developer,
        }
        let before = local.clone();
        assert_eq!(
            preflight_update(&bytes, &signature, b"package", &publishers, &local).unwrap_err(),
            UpdatePreflightError::Compatibility,
            "case {index}"
        );
        assert_eq!(local, before);
    }
}

#[test]
fn compatible_v3_rollback_refuses_newer_migrations_without_restoring_data() {
    let (mut manifest, mut installed) = fixture();
    manifest.version = ReleaseVersion([3, 0, 0]);
    manifest.edition.artifact_version = "3.0.0".into();
    manifest.compatibility.app_version = "3.0.0".into();
    installed.version = ReleaseVersion([3, 1, 0]);
    installed.edition.artifact_version = "3.1.0".into();
    let (bytes, signature, publishers) = signed(&manifest);
    assert!(preflight_update(&bytes, &signature, b"package", &publishers, &installed).is_ok());
    installed.migration = 30;
    assert_eq!(
        preflight_update(&bytes, &signature, b"package", &publishers, &installed).unwrap_err(),
        UpdatePreflightError::Compatibility
    );
}

#[test]
fn malformed_metadata_is_bounded_and_versions_cannot_disagree() {
    let (manifest, installed) = fixture();
    let (_, signature, publishers) = signed(&manifest);
    assert_eq!(
        preflight_update(
            &vec![b' '; MAX_METADATA_BYTES + 1],
            &signature,
            b"package",
            &publishers,
            &installed
        )
        .unwrap_err(),
        UpdatePreflightError::Metadata
    );
    for index in 0..9 {
        let mut invalid = manifest.clone();
        match index {
            0 => invalid.edition.artifact_version = "3.2.0".into(),
            1 => invalid.compatibility.app_version = "3.2.0".into(),
            2 => invalid.minimum_source = ReleaseVersion([2, 9, 5]),
            3 => invalid.readers.region = FormatRange { min: 2, max: 1 },
            4 => invalid.schema = "jobsentinel.update-candidate.v2".into(),
            5 => invalid.edition.rollback_supported = false,
            6 => invalid.readers.database = FormatRange { min: 1, max: 1 },
            7 => invalid.readers.backup = FormatRange { min: 2, max: 2 },
            _ => invalid.readers.export = FormatRange { min: 2, max: 2 },
        }
        let (bytes, signature, publishers) = signed(&invalid);
        assert_eq!(
            preflight_update(&bytes, &signature, b"package", &publishers, &installed).unwrap_err(),
            UpdatePreflightError::Metadata
        );
    }
}

#[test]
fn newer_writer_formats_are_allowed_only_when_candidate_reads_current_data() {
    let (mut manifest, installed) = fixture();
    manifest.compatibility.database_schema = 3;
    manifest.readers.database.max = 3;
    manifest.compatibility.backup.format_version = 2;
    manifest.compatibility.export.format_version = 2;
    let (bytes, signature, publishers) = signed(&manifest);
    assert!(preflight_update(&bytes, &signature, b"package", &publishers, &installed).is_ok());
    manifest.readers.database.min = 3;
    let (bytes, signature, publishers) = signed(&manifest);
    assert_eq!(
        preflight_update(&bytes, &signature, b"package", &publishers, &installed).unwrap_err(),
        UpdatePreflightError::Compatibility
    );
}

#[tokio::test]
async fn inventory_reads_database_and_refuses_unknown_model_cache() {
    let root = tempfile::tempdir().expect("root");
    let database = jobsentinel_storage::Database::connect_memory()
        .await
        .expect("database");
    database.migrate().await.expect("migrations");
    let state = collect_installed_update_state(&database, root.path())
        .await
        .expect("inventory");
    assert_eq!(state.database, 2);
    assert!(state.migration >= 29);
    assert_eq!(state.version, ReleaseVersion([3, 0, 0]));
    assert!(state.model.is_empty());
    std::fs::create_dir_all(root.path().join("ml_models/unknown")).expect("unknown cache");
    assert!(collect_installed_update_state(&database, root.path())
        .await
        .is_err());
}

#[test]
fn retained_pack_app_dependencies_refuse_candidate_even_when_schema_is_readable() {
    let (manifest, mut installed) = fixture();
    installed
        .pack_app_versions
        .push((ReleaseVersion([3, 0, 0]), ReleaseVersion([3, 0, 9])));
    let (bytes, signature, publishers) = signed(&manifest);
    assert_eq!(
        preflight_update(&bytes, &signature, b"package", &publishers, &installed).unwrap_err(),
        UpdatePreflightError::Compatibility
    );
}
