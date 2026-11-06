//! Proves release CLI sidecars interoperate with the actual update preflight using synthetic trust.
use super::*;
use jobsentinel_domain::contracts::Platform;
use std::{path::Path, process::Command};

#[test]
fn release_cli_candidates_pass_preflight_and_refuse_tampering(
) -> Result<(), Box<dyn std::error::Error>> {
    let root = tempfile::tempdir()?;
    let script = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../scripts/release/sign-update-candidate.mjs");
    // Public fixture seed [41; 32], encoded as Ed25519 PKCS#8; never a production identity.
    let fixture_key = "MC4CAQAwBQYDK2VwBCIEICkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkp";
    for (platform, extension) in [
        (Platform::Macos, "pkg"),
        (Platform::Windows, "msi"),
        (Platform::Linux, "deb"),
    ] {
        let (mut manifest, mut installed) = test_support::fixture();
        manifest.edition.platform = platform;
        manifest.compatibility.database_schema = 3;
        manifest.readers.database.max = 3;
        manifest.maximum_source = ReleaseVersion([3, 0, 0]);
        installed.edition.platform = platform;
        let (_, _, publishers) = test_support::signed(&manifest);
        let mut spec = serde_json::to_value(&manifest)?;
        let object = spec.as_object_mut().ok_or("metadata object")?;
        for key in [
            "schema",
            "publisher_key_id",
            "package_sha256",
            "package_bytes",
        ] {
            object.remove(key);
        }
        let package = root.path().join(format!("candidate.{extension}"));
        let metadata_input = root.path().join(format!("spec-{extension}.json"));
        std::fs::write(&package, b"package")?;
        std::fs::write(&metadata_input, serde_json::to_vec(&spec)?)?;
        let output = Command::new("node")
            .arg(&script)
            .arg("--package")
            .arg(&package)
            .arg("--metadata")
            .arg(&metadata_input)
            .args([
                "--publisher-key-id",
                "release-test",
                "--expected-public-key-hex",
            ])
            .arg(hex::encode(publishers[0].public_key))
            .args(["--key-env", "JOBSENTINEL_TEST_UPDATE_KEY"])
            .env("JOBSENTINEL_TEST_UPDATE_KEY", fixture_key)
            .output()?;
        assert!(output.status.success(), "update producer failed");
        assert!(output.stdout.is_empty());
        assert!(output.stderr.is_empty());
        let metadata = std::fs::read(package.with_extension(format!("{extension}.manifest.json")))?;
        let signature =
            std::fs::read_to_string(package.with_extension(format!("{extension}.sig")))?;
        let bytes = std::fs::read(&package)?;
        let before = installed.clone();
        let candidate = preflight_update(&metadata, &signature, &bytes, &publishers, &installed)?;
        assert_eq!(candidate.manifest().edition.platform, platform);
        assert_eq!(candidate.manifest().version, ReleaseVersion([3, 1, 0]));
        assert_eq!(installed, before);
        assert_eq!(
            preflight_update(&metadata, &signature, b"changed", &publishers, &installed).err(),
            Some(UpdatePreflightError::Integrity)
        );
        let mut changed_metadata = metadata.clone();
        changed_metadata.push(b' ');
        assert_eq!(
            preflight_update(
                &changed_metadata,
                &signature,
                &bytes,
                &publishers,
                &installed
            )
            .err(),
            Some(UpdatePreflightError::Trust)
        );
        let changed_signature = "00".repeat(64);
        assert_eq!(
            preflight_update(
                &metadata,
                &changed_signature,
                &bytes,
                &publishers,
                &installed
            )
            .err(),
            Some(UpdatePreflightError::Trust)
        );
        installed.migration = manifest.readers.migration.max + 1;
        assert_eq!(
            preflight_update(&metadata, &signature, &bytes, &publishers, &installed).err(),
            Some(UpdatePreflightError::Compatibility)
        );
    }
    Ok(())
}
