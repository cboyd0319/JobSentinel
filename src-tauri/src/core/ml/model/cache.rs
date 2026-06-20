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

    /// Get model status for the legacy runtime embedding model.
    pub fn get_status(&self) -> ModelStatus {
        let spec = Self::runtime_model_spec().unwrap_or_else(|_| fallback_runtime_model_spec());
        let model_path = self.model_cache_dir(&spec);
        let is_downloaded = self.is_model_downloaded();

        let model_size_bytes = if is_downloaded {
            model_path
                .join("model.safetensors")
                .metadata()
                .ok()
                .map(|m| m.len())
        } else {
            None
        };

        ModelStatus {
            is_downloaded,
            model_size_bytes,
            model_id: spec.id,
            revision: spec.revision,
            backend: spec.backend,
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
