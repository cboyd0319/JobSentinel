use super::integrity::verify_model_file_checksum;
use super::{
    fallback_runtime_model_spec,
    status::{ModelCacheHealth, ModelStatus},
    ModelManager,
};
use crate::manifest::{load_model_manifest, model_lock_hash, ModelFileSpec, ModelSpec};
use crate::MlError;
use anyhow::Result;
use std::io::ErrorKind;

#[derive(Clone, Copy, PartialEq, Eq)]
enum RequiredFilePresence {
    Missing,
    Invalid,
    Present,
}

const MODEL_CACHE_NOT_REPAIRABLE: &str = "local model cache cannot be repaired";

impl ModelManager {
    /// Check if the legacy runtime embedding model is already downloaded.
    pub fn is_model_downloaded(&self) -> bool {
        let Ok(spec) = Self::runtime_model_spec() else {
            return false;
        };
        self.is_model_downloaded_for(&spec)
    }

    /// Return whether every required file exists and matches the model lock.
    pub fn is_model_downloaded_for(&self, spec: &ModelSpec) -> bool {
        self.cache_health_for(spec) == ModelCacheHealth::Ready
    }

    /// Inspect required model files without returning paths or raw errors.
    pub fn cache_health_for(&self, spec: &ModelSpec) -> ModelCacheHealth {
        let required_files = spec.required_files().collect::<Vec<_>>();
        if required_files.is_empty() {
            return ModelCacheHealth::Missing;
        }

        let mut missing = 0;
        for file in &required_files {
            match self.required_file_presence(spec, file) {
                RequiredFilePresence::Missing => missing += 1,
                RequiredFilePresence::Invalid => {
                    return ModelCacheHealth::IntegrityMismatch;
                }
                RequiredFilePresence::Present => {}
            }
        }

        if missing == required_files.len() {
            return ModelCacheHealth::Missing;
        }
        if missing > 0 {
            return ModelCacheHealth::Incomplete;
        }
        if required_files.iter().all(|file| {
            verify_model_file_checksum(&self.model_file_path(spec, file), &file.sha256).is_ok()
        }) {
            ModelCacheHealth::Ready
        } else {
            ModelCacheHealth::IntegrityMismatch
        }
    }

    /// Count required files present in the private model cache.
    pub fn required_files_present(&self, spec: &ModelSpec) -> usize {
        spec.required_files()
            .filter(|file| self.required_file_presence(spec, file) == RequiredFilePresence::Present)
            .count()
    }

    fn required_file_presence(
        &self,
        spec: &ModelSpec,
        file: &ModelFileSpec,
    ) -> RequiredFilePresence {
        let path = self.model_file_path(spec, file);
        let metadata = match std::fs::symlink_metadata(path) {
            Ok(metadata) => metadata,
            Err(error) if error.kind() == ErrorKind::NotFound => {
                return RequiredFilePresence::Missing;
            }
            Err(_) => return RequiredFilePresence::Invalid,
        };
        if !metadata.file_type().is_file()
            || file
                .size_bytes
                .is_some_and(|expected| metadata.len() != expected)
        {
            RequiredFilePresence::Invalid
        } else {
            RequiredFilePresence::Present
        }
    }

    pub fn is_default_embedding_downloaded(&self) -> bool {
        let Ok(spec) = Self::default_embedding_model_spec() else {
            return false;
        };
        self.is_model_downloaded_for(&spec)
    }

    pub fn is_default_reranker_downloaded(&self) -> bool {
        let Ok(spec) = Self::default_reranker_model_spec() else {
            return false;
        };
        self.is_model_downloaded_for(&spec)
    }

    pub fn is_default_semantic_runtime_downloaded(&self) -> bool {
        self.is_default_embedding_downloaded() && self.is_default_reranker_downloaded()
    }

    /// Remove one integrity-invalid default cache selected by its lock-owned ID.
    pub fn repair_invalid_default_cache(&self, model_id: &str) -> Result<()> {
        let manifest = load_model_manifest()?;
        let spec = [manifest.default_embedding(), manifest.default_reranker()]
            .into_iter()
            .flatten()
            .find(|spec| spec.id == model_id)
            .ok_or_else(|| anyhow::anyhow!(MODEL_CACHE_NOT_REPAIRABLE))?;
        self.remove_integrity_invalid_cache(spec)
    }

    fn remove_integrity_invalid_cache(&self, spec: &ModelSpec) -> Result<()> {
        if self.cache_health_for(spec) != ModelCacheHealth::IntegrityMismatch {
            anyhow::bail!(MODEL_CACHE_NOT_REPAIRABLE);
        }

        let model_root = self.cache_dir.join(&spec.id);
        let revision_root = model_root.join(&spec.revision);
        let cache_root = revision_root.join(model_lock_hash());
        for directory in [&self.cache_dir, &model_root, &revision_root, &cache_root] {
            let metadata = std::fs::symlink_metadata(directory)
                .map_err(|_| anyhow::anyhow!(MODEL_CACHE_NOT_REPAIRABLE))?;
            if !metadata.file_type().is_dir() {
                anyhow::bail!(MODEL_CACHE_NOT_REPAIRABLE);
            }
        }

        std::fs::remove_dir_all(cache_root).map_err(|_| anyhow::anyhow!(MODEL_CACHE_NOT_REPAIRABLE))
    }

    /// Get model status for the default semantic runtime.
    pub fn get_status(&self) -> ModelStatus {
        let embedding_spec =
            Self::default_embedding_model_spec().unwrap_or_else(|_| fallback_runtime_model_spec());
        let reranker_spec = Self::default_reranker_model_spec().ok();
        let is_downloaded = reranker_spec
            .as_ref()
            .map(|reranker| {
                self.is_model_downloaded_for(&embedding_spec)
                    && self.is_model_downloaded_for(reranker)
            })
            .unwrap_or(false);

        let model_size_bytes = if is_downloaded {
            model_size_bytes(self, &embedding_spec)
                .zip(
                    reranker_spec
                        .as_ref()
                        .and_then(|spec| model_size_bytes(self, spec)),
                )
                .map(|(embedding, reranker)| embedding + reranker)
        } else {
            None
        };

        ModelStatus {
            is_downloaded,
            model_size_bytes,
            model_id: reranker_spec
                .as_ref()
                .map(|reranker| format!("{}+{}", embedding_spec.id, reranker.id))
                .unwrap_or_else(|| embedding_spec.id.clone()),
            revision: reranker_spec
                .as_ref()
                .map(|reranker| format!("{}+{}", embedding_spec.revision, reranker.revision))
                .unwrap_or_else(|| embedding_spec.revision.clone()),
            backend: reranker_spec
                .as_ref()
                .map(|reranker| format!("{}+{}", embedding_spec.backend, reranker.backend))
                .unwrap_or_else(|| embedding_spec.backend.clone()),
            manifest_hash: model_lock_hash(),
        }
    }

    pub(super) fn verify_model_cache(&self, spec: &ModelSpec) -> Result<()> {
        match self.cache_health_for(spec) {
            ModelCacheHealth::Ready => Ok(()),
            ModelCacheHealth::Missing | ModelCacheHealth::Incomplete => Err(
                MlError::ModelNotDownloaded("required model cache is incomplete".to_string())
                    .into(),
            ),
            ModelCacheHealth::IntegrityMismatch => {
                Err(MlError::ModelLoadFailed("cached model validation failed".to_string()).into())
            }
        }
    }
}

fn model_size_bytes(manager: &ModelManager, spec: &ModelSpec) -> Option<u64> {
    let weights = spec.file("model.safetensors")?;
    manager
        .model_file_path(spec, weights)
        .metadata()
        .ok()
        .map(|m| m.len())
}

#[cfg(test)]
mod tests;
