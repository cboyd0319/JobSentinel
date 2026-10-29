//! Inventories retained models and explicitly quarantines old caches with invalid metadata.

use super::{cache::verified_retained_file, load_model_manifest, ModelManager};
use anyhow::{ensure, Result};
use std::path::{Path, PathBuf};

impl ModelManager {
    /// The native caller prepares this directory with the platform private-directory owner.
    pub fn model_quarantine_dir(&self) -> Result<PathBuf> {
        let path = self
            .cache_dir
            .parent()
            .ok_or_else(|| anyhow::anyhow!("Invalid model cache root"))?
            .join("ml_models_quarantine");
        match std::fs::symlink_metadata(&path) {
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
            Ok(metadata) => ensure!(metadata.file_type().is_dir(), "Unsafe model quarantine"),
            Err(error) => return Err(error.into()),
        }
        Ok(path)
    }

    pub fn has_quarantined_model_cache(&self) -> bool {
        self.model_quarantine_dir().is_ok_and(|path| {
            std::fs::read_dir(path).is_ok_and(|mut entries| entries.next().is_some())
        })
    }

    pub fn retained_metadata_repair_count(&self, model_id: &str) -> Result<usize> {
        let manifest = load_model_manifest()?;
        let spec = manifest
            .models
            .iter()
            .find(|spec| spec.id == model_id)
            .ok_or_else(|| anyhow::anyhow!("Unknown governed model"))?;
        self.invalid_retained_metadata(spec)
            .map(|caches| caches.len())
    }

    pub(super) fn quarantine_invalid_retained_metadata(
        &self,
        spec: &crate::ModelSpec,
    ) -> Result<usize> {
        let caches = self.invalid_retained_metadata(spec)?;
        if caches.is_empty() {
            return Ok(0);
        }
        let quarantine = self.model_quarantine_dir()?;
        ensure!(
            std::fs::symlink_metadata(&quarantine)?.file_type().is_dir(),
            "Model quarantine must be prepared privately"
        );
        for cache in &caches {
            super::cache::ensure_symlink_free(cache)?;
        }
        for cache in &caches {
            let retained = tempfile::Builder::new()
                .prefix("retained-")
                .tempdir_in(&quarantine)?;
            std::fs::rename(cache, retained.path().join("cache"))?;
            let _retained_path = retained.keep();
        }
        Ok(caches.len())
    }

    fn invalid_retained_metadata(&self, spec: &crate::ModelSpec) -> Result<Vec<PathBuf>> {
        let model = self.cache_dir.join(&spec.id);
        let revision = model.join(&spec.revision);
        for path in [&self.cache_dir, &model, &revision] {
            match std::fs::symlink_metadata(path) {
                Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(vec![]),
                Ok(metadata) => ensure!(
                    metadata.file_type().is_dir(),
                    "Unsafe retained model directory"
                ),
                Err(error) => return Err(error.into()),
            }
        }
        let mut invalid = Vec::new();
        let mut seen = 0;
        for cache in directories(&revision, &mut seen)? {
            let lock = cache
                .file_name()
                .and_then(|name| name.to_str())
                .filter(|name| {
                    name.len() == 64 && name.bytes().all(|byte| byte.is_ascii_hexdigit())
                })
                .ok_or_else(|| anyhow::anyhow!("Unknown retained model cache"))?;
            if cache != self.model_cache_dir(spec)
                && self.verified_cache_metadata_at(spec, &cache, lock).is_err()
            {
                invalid.push(cache);
            }
        }
        Ok(invalid)
    }

    pub fn update_format_inventory(&self) -> Result<Vec<u64>> {
        self.update_identity_inventory().map(|(formats, _)| formats)
    }

    pub fn update_identity_inventory(&self) -> Result<(Vec<u64>, Vec<String>)> {
        use sha2::{Digest, Sha256};
        let manifest = load_model_manifest()?;
        let mut formats = Vec::new();
        let mut identities = Vec::new();
        let mut seen = 0;
        for model in directories(&self.cache_dir, &mut seen)? {
            if model.file_name().is_some_and(|name| name == ".xet") {
                continue;
            }
            ensure!(
                manifest
                    .models
                    .iter()
                    .any(|spec| self.cache_dir.join(&spec.id) == model),
                "Unknown retained model"
            );
            let revisions = directories(&model, &mut seen)?;
            for revision in revisions {
                ensure!(
                    manifest.models.iter().any(|spec| self
                        .cache_dir
                        .join(&spec.id)
                        .join(&spec.revision)
                        == revision),
                    "Unknown model revision"
                );
                let caches = directories(&revision, &mut seen)?;
                for cache in caches {
                    let spec = manifest
                        .models
                        .iter()
                        .find(|spec| self.cache_dir.join(&spec.id).join(&spec.revision) == revision)
                        .ok_or_else(|| anyhow::anyhow!("Unknown retained model cache"))?;
                    let lock = cache
                        .file_name()
                        .and_then(|name| name.to_str())
                        .filter(|name| {
                            name.len() == 64 && name.bytes().all(|byte| byte.is_ascii_hexdigit())
                        })
                        .ok_or_else(|| anyhow::anyhow!("Unknown retained model cache"))?;
                    if cache == self.model_cache_dir(spec) {
                        self.verify_model_cache(spec)?;
                    } else {
                        for file in spec.required_files() {
                            verified_retained_file(&cache, file)?;
                        }
                    }
                    let (data, bytes) = self.verified_cache_metadata_at(spec, &cache, lock)?;
                    identities.push(serde_json::to_string(&(
                        &data.model_id,
                        &data.revision,
                        &data.backend,
                        &data.manifest_hash,
                        hex::encode(Sha256::digest(&bytes)),
                    ))?);
                    formats.push(u64::from(data.manifest_version));
                }
            }
        }
        identities.sort();
        formats.sort_unstable();
        Ok((formats, identities))
    }
}

fn directories(path: &Path, seen: &mut usize) -> Result<Vec<PathBuf>> {
    ensure!(
        std::fs::symlink_metadata(path)?.file_type().is_dir(),
        "Invalid model cache directory"
    );
    let mut children = Vec::new();
    for entry in std::fs::read_dir(path)? {
        *seen += 1;
        ensure!(*seen <= 256, "Model inventory exceeds its limit");
        let entry = entry?;
        ensure!(entry.file_type()?.is_dir(), "Unexpected model cache entry");
        children.push(entry.path());
    }
    Ok(children)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn repaired_scaffold_and_transfer_cache_are_not_retained_models() {
        let root = tempfile::tempdir().expect("root");
        let manager = ModelManager::new(root.path().to_path_buf());
        std::fs::create_dir_all(manager.cache_dir.join(".xet")).expect("transfer cache");
        std::fs::write(manager.cache_dir.join(".xet/chunk"), b"transfer").expect("chunk");
        assert!(manager
            .update_format_inventory()
            .expect("transfer cache")
            .is_empty());
        let manifest = load_model_manifest().expect("manifest");
        let spec = manifest.default_embedding().expect("embedding");
        let cache = manager.model_cache_dir(spec);
        std::fs::create_dir_all(&cache).expect("cache");
        assert!(manager.update_format_inventory().is_err());
        for file in spec.required_files() {
            let path = manager.model_file_path(spec, file);
            std::fs::create_dir_all(path.parent().expect("parent")).expect("parent directory");
            std::fs::write(path, b"corrupt").expect("corrupt fixture");
        }
        manager
            .repair_invalid_default_cache(&spec.id)
            .expect("repair");
        assert!(manager
            .update_format_inventory()
            .expect("repaired scaffold")
            .is_empty());
        std::fs::create_dir(manager.cache_dir.join("unknown")).expect("unknown model");
        assert!(manager.update_format_inventory().is_err());
    }

    #[test]
    fn explicit_repair_quarantines_malformed_old_metadata_without_marking_models_ready() {
        let root = tempfile::tempdir().unwrap();
        let manager = ModelManager::new(root.path().to_path_buf());
        let manifest = load_model_manifest().unwrap();
        let spec = manifest.default_embedding().unwrap();
        let prior = manager
            .model_cache_dir(spec)
            .parent()
            .unwrap()
            .join("a".repeat(64));
        std::fs::create_dir_all(&prior).unwrap();
        std::fs::write(prior.join(".jobsentinel-model.json"), b"{broken").unwrap();
        std::fs::write(
            prior.join("model.safetensors"),
            b"retained, unverified bytes",
        )
        .unwrap();
        assert!(manager
            .verified_cache_metadata_at(spec, &prior, &"a".repeat(64))
            .is_err());
        assert!(manager.update_identity_inventory().is_err());
        std::fs::create_dir(manager.model_quarantine_dir().unwrap()).unwrap();
        manager.repair_invalid_default_cache(&spec.id).unwrap();
        assert_eq!(
            manager.update_identity_inventory().unwrap(),
            (vec![], vec![])
        );
        assert!(!manager.is_default_semantic_runtime_downloaded());
        assert!(!prior.exists());
        let quarantine = root.path().join("ml_models_quarantine");
        let retained = std::fs::read_dir(quarantine)
            .unwrap()
            .next()
            .unwrap()
            .unwrap()
            .path()
            .join("cache");
        assert_eq!(
            std::fs::read(retained.join("model.safetensors")).unwrap(),
            b"retained, unverified bytes"
        );
        assert_eq!(
            std::fs::read(retained.join(".jobsentinel-model.json")).unwrap(),
            b"{broken"
        );
    }

    #[cfg(unix)]
    #[test]
    fn metadata_repair_refuses_a_symlinked_quarantine_root() {
        let root = tempfile::tempdir().unwrap();
        let outside = tempfile::tempdir().unwrap();
        let manager = ModelManager::new(root.path().to_path_buf());
        let manifest = load_model_manifest().unwrap();
        let spec = manifest.default_embedding().unwrap();
        let prior = manager
            .model_cache_dir(spec)
            .parent()
            .unwrap()
            .join("d".repeat(64));
        std::fs::create_dir_all(&prior).unwrap();
        std::fs::write(prior.join(".jobsentinel-model.json"), b"broken").unwrap();
        std::os::unix::fs::symlink(outside.path(), root.path().join("ml_models_quarantine"))
            .unwrap();
        assert!(manager.repair_invalid_default_cache(&spec.id).is_err());
        assert!(prior.exists());
        assert!(std::fs::read_dir(outside.path()).unwrap().next().is_none());
    }
}
