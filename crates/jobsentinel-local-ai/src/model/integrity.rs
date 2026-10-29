//! Verifies governed model files and binds deserialization to the verified bytes.

use crate::MlError;
use anyhow::{Context, Result};
use jobsentinel_security::path_label_for_logging;
use sha2::{Digest, Sha256};
use std::{
    fs::File,
    io::{BufReader, Read},
    path::Path,
};

fn sha256_hex_for_file(path: &Path) -> Result<String> {
    let file = File::open(path).with_context(|| {
        format!(
            "failed to open model file for integrity check: {}",
            path_label_for_logging(path)
        )
    })?;
    let mut reader = BufReader::new(file);
    let mut hasher = Sha256::new();
    let mut buffer = vec![0_u8; 64 * 1024];

    loop {
        let bytes_read = reader.read(&mut buffer).with_context(|| {
            format!(
                "failed to read model file for integrity check: {}",
                path_label_for_logging(path)
            )
        })?;

        if bytes_read == 0 {
            break;
        }

        hasher.update(&buffer[..bytes_read]);
    }

    Ok(hex::encode(hasher.finalize()))
}

pub(super) fn verify_model_file_checksum(path: &Path, expected_sha256: &str) -> Result<()> {
    let actual_sha256 = sha256_hex_for_file(path)?;

    if actual_sha256 != expected_sha256 {
        return Err(
            MlError::DownloadFailed("model file integrity check failed".to_string()).into(),
        );
    }

    Ok(())
}

pub(super) fn read_verified_model_file(
    path: &Path,
    spec: &crate::manifest::ModelFileSpec,
) -> Result<Vec<u8>> {
    let size = spec
        .size_bytes
        .ok_or_else(|| anyhow::anyhow!("Model file size is not governed"))?;
    let file = File::open(path)?;
    let mut bytes = Vec::new();
    file.take(size.saturating_add(1)).read_to_end(&mut bytes)?;
    anyhow::ensure!(
        bytes.len() as u64 == size && hex::encode(Sha256::digest(&bytes)) == spec.sha256,
        "Model file integrity check failed"
    );
    Ok(bytes)
}

#[cfg(test)]
mod verified_reads {
    use super::*;
    #[test]
    fn verified_buffer_is_independent_of_later_path_replacement() {
        let root = tempfile::tempdir().unwrap();
        let path = root.path().join("config.json");
        std::fs::write(&path, b"{}").unwrap();
        let mut spec = crate::manifest::load_model_manifest()
            .unwrap()
            .legacy_runtime_embedding()
            .unwrap()
            .file("config.json")
            .unwrap()
            .clone();
        spec.size_bytes = Some(2);
        spec.sha256 = hex::encode(Sha256::digest(b"{}"));
        let bytes = read_verified_model_file(&path, &spec).unwrap();
        std::fs::write(&path, b"[]").unwrap();
        assert_eq!(
            serde_json::from_slice::<serde_json::Value>(&bytes).unwrap(),
            serde_json::json!({})
        );
        assert!(read_verified_model_file(&path, &spec).is_err());
    }
}
