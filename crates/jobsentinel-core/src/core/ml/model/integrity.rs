use crate::core::logging::path_label_for_logging;
use crate::core::ml::MlError;
use anyhow::{Context, Result};
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
