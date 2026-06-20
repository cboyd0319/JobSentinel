use super::integrity::verify_model_file_checksum;
use super::status::MODEL_CACHE_METADATA_FILE;
use super::{ModelCacheMetadata, ModelManager};
use crate::core::logging::path_label_for_logging;
use crate::core::ml::manifest::{load_model_manifest, model_lock_hash, ModelManifest, ModelSpec};
use crate::core::ml::MlError;
use anyhow::{Context, Result};
use chrono::Utc;
use hf_hub::{api::tokio::Api, Repo, RepoType};
use std::path::{Path, PathBuf};

impl ModelManager {
    /// Download the legacy runtime embedding model from Hugging Face Hub.
    pub async fn download_model(&self) -> Result<PathBuf> {
        let manifest = load_model_manifest()?;
        let spec = manifest.legacy_runtime_embedding().ok_or_else(|| {
            MlError::ModelLoadFailed("runtime model lock entry missing".to_string())
        })?;
        self.download_model_spec(&manifest, spec).await
    }

    pub async fn download_model_by_id(&self, model_id: &str) -> Result<PathBuf> {
        let manifest = load_model_manifest()?;
        let spec = manifest.model(model_id).ok_or_else(|| {
            MlError::ModelLoadFailed("requested model lock entry missing".to_string())
        })?;
        self.download_model_spec(&manifest, spec).await
    }

    async fn download_model_spec(
        &self,
        manifest: &ModelManifest,
        spec: &ModelSpec,
    ) -> Result<PathBuf> {
        tracing::info!(
            model_id = spec.id,
            revision = spec.revision,
            "Downloading model from HuggingFace Hub"
        );

        std::fs::create_dir_all(&self.cache_dir).context("Failed to create cache directory")?;

        let api = Api::new().map_err(|_e| {
            MlError::DownloadFailed("Failed to initialize model download client".to_string())
        })?;

        let repo = api.repo(Repo::with_revision(
            spec.repo.clone(),
            RepoType::Model,
            spec.revision.clone(),
        ));

        let model_dir = self.model_cache_dir(spec);
        std::fs::create_dir_all(&model_dir).context("Failed to create model directory")?;

        let downloaded_at = Utc::now().to_rfc3339();
        for file in &spec.files {
            tracing::info!(
                file = file.path,
                required = file.required,
                "Downloading model file"
            );

            let remote_path = match repo.get(&file.path).await {
                Ok(path) => path,
                Err(_error) if !file.required => {
                    tracing::warn!(file = file.path, "Optional model file was not downloaded");
                    continue;
                }
                Err(_error) => {
                    return Err(MlError::DownloadFailed(format!(
                        "Failed to download required model file: {}",
                        file.path
                    ))
                    .into());
                }
            };

            let target_path = self.model_file_path(spec, file);
            if let Some(parent) = target_path.parent() {
                std::fs::create_dir_all(parent).context("Failed to create model file directory")?;
            }
            std::fs::copy(&remote_path, &target_path)
                .with_context(|| format!("Failed to copy {} to cache", file.path))?;

            if let Err(error) = verify_model_file_checksum(&target_path, &file.sha256) {
                let _ = std::fs::remove_file(&target_path);
                return Err(error.context(format!(
                    "Downloaded model file failed integrity check: {}",
                    file.path
                )));
            }
        }

        self.verify_model_cache(spec)?;
        let verified_at = Utc::now().to_rfc3339();
        self.write_cache_metadata(&model_dir, manifest, spec, downloaded_at, verified_at)?;

        tracing::info!(
            model_dir = %path_label_for_logging(&model_dir),
            "Model downloaded successfully"
        );
        Ok(model_dir)
    }

    fn write_cache_metadata(
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
        std::fs::write(model_dir.join(MODEL_CACHE_METADATA_FILE), metadata_json)
            .context("failed to write model cache metadata")?;
        Ok(())
    }
}
