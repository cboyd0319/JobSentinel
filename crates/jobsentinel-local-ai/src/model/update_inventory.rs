//! Inspects every retained governed model cache without downloading, repairing, or deleting it.

use super::{load_model_manifest, ModelManager};
use anyhow::{ensure, Result};
use std::path::{Path, PathBuf};

impl ModelManager {
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
                        .find(|spec| self.model_cache_dir(spec) == cache)
                        .ok_or_else(|| anyhow::anyhow!("Unknown retained model cache"))?;
                    self.verify_model_cache(spec)?;
                    let (data, bytes) = self.verified_cache_metadata(spec)?;
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
}
