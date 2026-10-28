//! Reports model cache state and atomically finalizes verified cache provenance.

use super::{download::ensure_regular_file_or_missing, ModelManager};
use crate::manifest::{load_model_manifest, model_lock_hash, ModelManifest, ModelSpec};
use anyhow::{Context, Result};
use chrono::Utc;
use std::{
    io::{Read, Write},
    path::Path,
};

pub(super) const MODEL_CACHE_METADATA_FILE: &str = ".jobsentinel-model.json";

/// Read-only health of one governed model cache.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ModelCacheHealth {
    Missing,
    Incomplete,
    IntegrityMismatch,
    Ready,
}

/// Model download and loading status.
#[derive(Debug, Clone, serde::Serialize)]
pub struct ModelStatus {
    pub is_downloaded: bool,
    pub model_size_bytes: Option<u64>,
    pub model_id: String,
    pub revision: String,
    pub backend: String,
    pub manifest_hash: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub(crate) struct ModelCacheMetadata {
    pub manifest_version: u32,
    pub manifest_hash: String,
    pub model_id: String,
    pub kind: String,
    pub repo: String,
    pub revision: String,
    pub source_url: String,
    pub backend: String,
    pub license: String,
    pub downloaded_at: String,
    pub verified_at: String,
}

impl ModelManager {
    pub(super) fn verified_cache_metadata(
        &self,
        spec: &ModelSpec,
    ) -> Result<(ModelCacheMetadata, Vec<u8>)> {
        let path = self.model_cache_dir(spec).join(MODEL_CACHE_METADATA_FILE);
        ensure_regular_file_or_missing(&path)?;
        let mut bytes = Vec::new();
        std::fs::File::open(path)?
            .take(65_537)
            .read_to_end(&mut bytes)?;
        anyhow::ensure!(bytes.len() <= 65_536, "Model metadata exceeds limit");
        let metadata: ModelCacheMetadata = serde_json::from_slice(&bytes)?;
        anyhow::ensure!(
            metadata.manifest_version == load_model_manifest()?.manifest_version
                && metadata.manifest_hash == model_lock_hash()
                && metadata.kind == format!("{:?}", spec.kind)
                && metadata.model_id == spec.id
                && metadata.revision == spec.revision
                && metadata.backend == spec.backend
                && metadata.repo == spec.repo
                && metadata.source_url == spec.source_url
                && metadata.license == spec.license,
            "Model metadata differs from governed model"
        );
        Ok((metadata, bytes))
    }

    /// Repairs interrupted metadata publication using only checksum-verified local files.
    pub fn finalize_default_semantic_metadata(&self) -> Result<()> {
        let manifest = load_model_manifest()?;
        for spec in [manifest.default_embedding(), manifest.default_reranker()] {
            self.finalize_verified_cache(
                &manifest,
                spec.ok_or_else(|| anyhow::anyhow!("Missing governed model"))?,
            )?;
        }
        Ok(())
    }

    pub(super) fn finalize_verified_cache(
        &self,
        manifest: &ModelManifest,
        spec: &ModelSpec,
    ) -> Result<()> {
        self.verify_model_cache(spec)?;
        let directory = self.model_cache_dir(spec);
        let downloaded_at = self
            .verified_cache_metadata(spec)
            .ok()
            .map(|(metadata, _)| metadata.downloaded_at)
            .unwrap_or_else(|| "unknown".to_string());
        self.write_cache_metadata(
            &directory,
            manifest,
            spec,
            downloaded_at,
            Utc::now().to_rfc3339(),
        )
    }

    pub(super) fn write_cache_metadata(
        &self,
        model_dir: &Path,
        manifest: &ModelManifest,
        spec: &ModelSpec,
        downloaded_at: String,
        verified_at: String,
    ) -> Result<()> {
        let metadata = ModelCacheMetadata {
            manifest_version: manifest.manifest_version,
            manifest_hash: model_lock_hash(),
            model_id: spec.id.clone(),
            kind: format!("{:?}", spec.kind),
            repo: spec.repo.clone(),
            revision: spec.revision.clone(),
            source_url: spec.source_url.clone(),
            backend: spec.backend.clone(),
            license: spec.license.clone(),
            downloaded_at,
            verified_at,
        };
        let metadata_json = serde_json::to_vec_pretty(&metadata)
            .context("failed to serialize model cache metadata")?;
        let metadata_path = model_dir.join(MODEL_CACHE_METADATA_FILE);
        ensure_regular_file_or_missing(&metadata_path)?;
        let mut output = tempfile::NamedTempFile::new_in(model_dir)?;
        output.write_all(&metadata_json)?;
        output.as_file().sync_all()?;
        output
            .persist(&metadata_path)
            .context("failed to publish model cache metadata")?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sha2::{Digest, Sha256};
    #[test]
    fn interrupted_metadata_is_rebuilt_without_changing_verified_files() {
        let root = tempfile::tempdir().unwrap();
        let manager = ModelManager::new(root.path().to_path_buf());
        let manifest = load_model_manifest().unwrap();
        let mut spec = manifest.legacy_runtime_embedding().unwrap().clone();
        let cache = manager.model_cache_dir(&spec);
        for file in &mut spec.files {
            file.sha256 = hex::encode(Sha256::digest(b"fixture"));
            file.size_bytes = Some(7);
            let path = cache.join(&file.path);
            std::fs::create_dir_all(path.parent().unwrap()).unwrap();
            std::fs::write(path, b"fixture").unwrap();
        }
        let metadata = manager
            .model_cache_dir(&spec)
            .join(MODEL_CACHE_METADATA_FILE);
        for contents in [None, Some(b"{".as_slice())] {
            if let Some(contents) = contents {
                std::fs::write(&metadata, contents).unwrap();
            }
            manager.finalize_verified_cache(&manifest, &spec).unwrap();
            let repaired: ModelCacheMetadata =
                serde_json::from_slice(&std::fs::read(&metadata).unwrap()).unwrap();
            assert_eq!(repaired.model_id, spec.id);
            assert_eq!(repaired.manifest_hash, model_lock_hash());
            for file in spec.required_files() {
                assert_eq!(
                    std::fs::read(manager.model_file_path(&spec, file)).unwrap(),
                    b"fixture"
                );
            }
        }
        let mut expected: std::collections::BTreeSet<std::ffi::OsString> = spec
            .files
            .iter()
            .map(|file| {
                Path::new(&file.path)
                    .components()
                    .next()
                    .unwrap()
                    .as_os_str()
                    .to_owned()
            })
            .collect();
        expected.insert(MODEL_CACHE_METADATA_FILE.into());
        let actual: std::collections::BTreeSet<_> =
            std::fs::read_dir(manager.model_cache_dir(&spec))
                .unwrap()
                .map(|entry| entry.unwrap().file_name())
                .collect();
        assert_eq!(actual, expected);
    }
}
