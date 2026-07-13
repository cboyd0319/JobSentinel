use super::integrity::verify_model_file_checksum;
use super::{fallback_runtime_model_spec, ModelManager, ModelStatus};
use crate::core::ml::manifest::model_lock_hash;
use crate::core::ml::manifest::ModelSpec;
use crate::core::ml::MlError;
use anyhow::{Context, Result};

impl ModelManager {
    /// Check if the legacy runtime embedding model is already downloaded.
    pub fn is_model_downloaded(&self) -> bool {
        let Ok(spec) = Self::runtime_model_spec() else {
            return false;
        };
        self.is_model_downloaded_for(&spec)
    }

    pub(crate) fn is_model_downloaded_for(&self, spec: &ModelSpec) -> bool {
        let model_dir = self.model_cache_dir(spec);

        if !model_dir.exists() {
            return false;
        }

        spec.required_files().all(|file| {
            let path = self.model_file_path(spec, file);
            path.exists() && verify_model_file_checksum(&path, &file.sha256).is_ok()
        })
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
        for file in spec.required_files() {
            let path = self.model_file_path(spec, file);
            if !path.exists() {
                return Err(MlError::ModelNotDownloaded(format!(
                    "required model file is missing: {}",
                    file.path
                ))
                .into());
            }
            verify_model_file_checksum(&path, &file.sha256)
                .context("cached model file failed integrity check")?;
        }

        Ok(())
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
