//! Inspects, reuses, removes and reports governed local model cache files.

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
use std::path::PathBuf;

#[derive(Clone, Copy, PartialEq, Eq)]
enum RequiredFilePresence {
    Missing,
    Invalid,
    Present,
}

const MODEL_CACHE_NOT_REPAIRABLE: &str = "local model cache cannot be repaired";
const XET_TRANSFER_CACHE_DIR: &str = ".xet";

impl ModelManager {
    /// Reuses only byte-identical artifacts from an older lock for the same pinned revision.
    pub(super) fn reuse_verified_artifacts(&self, spec: &ModelSpec) -> Result<bool> {
        let Some(model_root) = self.validated_cache_child(&spec.id)? else {
            return Ok(false);
        };
        let revision = model_root.join(&spec.revision);
        match std::fs::symlink_metadata(&revision) {
            Err(error) if error.kind() == ErrorKind::NotFound => return Ok(false),
            Ok(metadata) if metadata.file_type().is_dir() => {}
            _ => anyhow::bail!(MODEL_CACHE_NOT_REPAIRABLE),
        }
        for (index, entry) in std::fs::read_dir(&revision)?.enumerate() {
            anyhow::ensure!(
                index < 64,
                "Model cache history exceeds its inspection limit"
            );
            let entry = entry?;
            let name = entry.file_name();
            let Some(name) = name.to_str() else {
                continue;
            };
            if name == model_lock_hash()
                || name.len() != 64
                || !name.bytes().all(|c| c.is_ascii_hexdigit())
                || !entry.file_type()?.is_dir()
            {
                continue;
            }
            let sources = spec
                .required_files()
                .map(|file| {
                    let source = verified_retained_file(&entry.path(), file)?;
                    Ok((file, source))
                })
                .collect::<Result<Vec<_>>>();
            let Ok(sources) = sources else {
                continue;
            };
            if sources.is_empty() {
                continue;
            }
            for (file, source) in sources {
                let target = self.prepare_model_file_path(spec, file)?;
                if target.exists() && verify_model_file_checksum(&target, &file.sha256).is_ok() {
                    continue;
                }
                if std::fs::hard_link(&source, &target).is_err() {
                    use std::io::Read;
                    let mut temporary = tempfile::NamedTempFile::new_in(
                        target
                            .parent()
                            .ok_or_else(|| anyhow::anyhow!(MODEL_CACHE_NOT_REPAIRABLE))?,
                    )?;
                    let size = file
                        .size_bytes
                        .ok_or_else(|| anyhow::anyhow!("Model size is not governed"))?;
                    let copied = std::io::copy(
                        &mut std::fs::File::open(&source)?.take(size + 1),
                        &mut temporary,
                    )?;
                    anyhow::ensure!(copied == size, "Retained model artifact changed");
                    verify_model_file_checksum(temporary.path(), &file.sha256)?;
                    temporary.persist(&target).map_err(|error| error.error)?;
                }
                verify_model_file_checksum(&target, &file.sha256)?;
            }
            self.verify_model_cache(spec)?;
            return Ok(true);
        }
        Ok(false)
    }

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

    /// A ready cache includes both verified files and valid finalized metadata.
    pub fn cache_health_for(&self, spec: &ModelSpec) -> ModelCacheHealth {
        let files = self.cache_files_health_for(spec);
        if files == ModelCacheHealth::Ready && self.verified_cache_metadata(spec).is_err() {
            ModelCacheHealth::Incomplete
        } else {
            files
        }
    }

    pub(super) fn cache_files_health_for(&self, spec: &ModelSpec) -> ModelCacheHealth {
        match self.validated_cache_root(spec) {
            Err(_) => return ModelCacheHealth::IntegrityMismatch,
            Ok(None) => return ModelCacheHealth::Missing,
            Ok(Some(_)) => {}
        }
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

    pub fn cache_exists_for(&self, spec: &ModelSpec) -> bool {
        std::fs::symlink_metadata(self.cache_dir.join(&spec.id))
            .is_ok_and(|metadata| metadata.is_dir())
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

    /// Explicitly quarantines invalid prior metadata and removes only an integrity-invalid current cache.
    pub fn repair_invalid_default_cache(&self, model_id: &str) -> Result<()> {
        let manifest = load_model_manifest()?;
        let spec = manifest
            .models
            .iter()
            .find(|spec| spec.id == model_id)
            .ok_or_else(|| anyhow::anyhow!(MODEL_CACHE_NOT_REPAIRABLE))?;
        self.repair_invalid_cache_for_spec(spec)
    }

    fn repair_invalid_cache_for_spec(&self, spec: &ModelSpec) -> Result<()> {
        let quarantined = self.quarantine_invalid_retained_metadata(spec)?;
        if self.cache_health_for(spec) == ModelCacheHealth::IntegrityMismatch {
            self.remove_integrity_invalid_cache(spec)
        } else if quarantined > 0 {
            Ok(())
        } else {
            anyhow::bail!(MODEL_CACHE_NOT_REPAIRABLE)
        }
    }

    /// Remove all locally cached data for the governed Qwen3 model identities,
    /// including stale revisions, superseded lock layouts, and explicitly retained quarantine.
    pub fn remove_default_semantic_model_caches(&self) -> Result<bool> {
        let manifest = load_model_manifest()?;
        let specs = [
            manifest
                .default_embedding()
                .ok_or_else(|| anyhow::anyhow!(MODEL_CACHE_NOT_REPAIRABLE))?,
            manifest
                .default_reranker()
                .ok_or_else(|| anyhow::anyhow!(MODEL_CACHE_NOT_REPAIRABLE))?,
        ];
        let mut roots = specs
            .iter()
            .map(|spec| self.validated_cache_child(&spec.id))
            .collect::<Result<Vec<_>>>()?;
        roots.push(self.validated_xet_transfer_cache()?);
        let quarantine = self.model_quarantine_dir()?;
        match std::fs::symlink_metadata(&quarantine) {
            Ok(_) => roots.push(Some(quarantine)),
            Err(error) if error.kind() == ErrorKind::NotFound => {}
            Err(error) => return Err(error.into()),
        }
        let roots = roots.into_iter().flatten().collect::<Vec<_>>();
        for root in &roots {
            ensure_symlink_free(root)?;
        }

        let mut removed = false;
        for root in roots {
            std::fs::remove_dir_all(root)
                .map_err(|_| anyhow::anyhow!(MODEL_CACHE_NOT_REPAIRABLE))?;
            removed = true;
        }
        Ok(removed)
    }

    pub(crate) fn reset_xet_transfer_cache(&self) -> Result<PathBuf> {
        let root = self.cache_dir.join(XET_TRANSFER_CACHE_DIR);
        if let Some(existing) = self.validated_xet_transfer_cache()? {
            std::fs::remove_dir_all(existing)
                .map_err(|_| anyhow::anyhow!(MODEL_CACHE_NOT_REPAIRABLE))?;
        }
        std::fs::create_dir(&root).map_err(|_| anyhow::anyhow!(MODEL_CACHE_NOT_REPAIRABLE))?;
        Ok(root)
    }

    pub(crate) fn clear_xet_transfer_cache(&self) -> Result<()> {
        if let Some(root) = self.validated_xet_transfer_cache()? {
            std::fs::remove_dir_all(root)
                .map_err(|_| anyhow::anyhow!(MODEL_CACHE_NOT_REPAIRABLE))?;
        }
        Ok(())
    }

    fn remove_integrity_invalid_cache(&self, spec: &ModelSpec) -> Result<()> {
        if self.cache_health_for(spec) != ModelCacheHealth::IntegrityMismatch {
            anyhow::bail!(MODEL_CACHE_NOT_REPAIRABLE);
        }

        let cache_root = self
            .validated_cache_root(spec)?
            .ok_or_else(|| anyhow::anyhow!(MODEL_CACHE_NOT_REPAIRABLE))?;
        std::fs::remove_dir_all(cache_root).map_err(|_| anyhow::anyhow!(MODEL_CACHE_NOT_REPAIRABLE))
    }

    fn validated_cache_root(&self, spec: &ModelSpec) -> Result<Option<std::path::PathBuf>> {
        let model_root = self.cache_dir.join(&spec.id);
        let revision_root = model_root.join(&spec.revision);
        let cache_root = revision_root.join(model_lock_hash());
        for directory in [&self.cache_dir, &model_root, &revision_root, &cache_root] {
            match std::fs::symlink_metadata(directory) {
                Err(error) if error.kind() == ErrorKind::NotFound => return Ok(None),
                Ok(metadata) if metadata.file_type().is_dir() => {}
                _ => anyhow::bail!(MODEL_CACHE_NOT_REPAIRABLE),
            }
        }

        Ok(Some(cache_root))
    }

    fn validated_xet_transfer_cache(&self) -> Result<Option<PathBuf>> {
        self.validated_cache_child(XET_TRANSFER_CACHE_DIR)
    }

    fn validated_cache_child(&self, name: &str) -> Result<Option<PathBuf>> {
        let root = self.cache_dir.join(name);
        for directory in [&self.cache_dir, &root] {
            match std::fs::symlink_metadata(directory) {
                Err(error) if error.kind() == ErrorKind::NotFound => return Ok(None),
                Ok(metadata) if metadata.file_type().is_dir() => {}
                _ => anyhow::bail!(MODEL_CACHE_NOT_REPAIRABLE),
            }
        }
        Ok(Some(root))
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
        match self.cache_files_health_for(spec) {
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

pub(super) fn verified_retained_file(
    root: &std::path::Path,
    file: &ModelFileSpec,
) -> Result<PathBuf> {
    let mut path = root.to_path_buf();
    let mut components = std::path::Path::new(&file.path).components().peekable();
    while let Some(component) = components.next() {
        let std::path::Component::Normal(component) = component else {
            anyhow::bail!(MODEL_CACHE_NOT_REPAIRABLE);
        };
        path.push(component);
        let metadata = std::fs::symlink_metadata(&path)?;
        anyhow::ensure!(
            if components.peek().is_some() {
                metadata.file_type().is_dir()
            } else {
                metadata.file_type().is_file() && file.size_bytes == Some(metadata.len())
            },
            "Invalid retained model artifact"
        );
    }
    anyhow::ensure!(path != root, "Invalid retained artifact path");
    verify_model_file_checksum(&path, &file.sha256)?;
    Ok(path)
}

pub(super) fn ensure_symlink_free(path: &std::path::Path) -> Result<()> {
    let metadata =
        std::fs::symlink_metadata(path).map_err(|_| anyhow::anyhow!(MODEL_CACHE_NOT_REPAIRABLE))?;
    if metadata.file_type().is_symlink() {
        anyhow::bail!(MODEL_CACHE_NOT_REPAIRABLE);
    }
    if metadata.is_dir() {
        let entries =
            std::fs::read_dir(path).map_err(|_| anyhow::anyhow!(MODEL_CACHE_NOT_REPAIRABLE))?;
        for entry in entries {
            let entry = entry.map_err(|_| anyhow::anyhow!(MODEL_CACHE_NOT_REPAIRABLE))?;
            ensure_symlink_free(&entry.path())?;
        }
    }
    Ok(())
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
