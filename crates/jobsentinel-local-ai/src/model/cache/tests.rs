use super::*;
use crate::ModelFileSpec;
use sha2::{Digest, Sha256};

const CONFIG: &[u8] = b"synthetic config";
const WEIGHTS: &[u8] = b"synthetic weights";

#[test]
fn model_cache_health_distinguishes_missing_incomplete_invalid_and_ready() {
    let app_data_dir = tempfile::tempdir().unwrap();
    let manager = ModelManager::new(app_data_dir.path().to_path_buf());
    let spec = synthetic_spec();
    let model_dir = manager.model_cache_dir(&spec);

    assert_eq!(manager.cache_health_for(&spec), ModelCacheHealth::Missing);

    std::fs::create_dir_all(&model_dir).unwrap();
    std::fs::write(model_dir.join("config.json"), CONFIG).unwrap();
    assert_eq!(
        manager.cache_health_for(&spec),
        ModelCacheHealth::Incomplete
    );

    std::fs::write(model_dir.join("model.safetensors"), b"tampered").unwrap();
    assert_eq!(
        manager.cache_health_for(&spec),
        ModelCacheHealth::IntegrityMismatch
    );

    std::fs::write(model_dir.join("model.safetensors"), WEIGHTS).unwrap();
    assert_eq!(manager.cache_health_for(&spec), ModelCacheHealth::Ready);
}

#[test]
fn model_cache_health_rejects_non_files_and_wrong_sizes() {
    let app_data_dir = tempfile::tempdir().unwrap();
    let manager = ModelManager::new(app_data_dir.path().to_path_buf());
    let spec = synthetic_spec();
    let model_dir = manager.model_cache_dir(&spec);
    let config_path = model_dir.join("config.json");

    std::fs::create_dir_all(&config_path).unwrap();
    assert_eq!(
        manager.cache_health_for(&spec),
        ModelCacheHealth::IntegrityMismatch
    );
    assert_eq!(manager.required_files_present(&spec), 0);

    std::fs::remove_dir(&config_path).unwrap();
    std::fs::write(&config_path, [CONFIG, b"oversized"].concat()).unwrap();
    assert_eq!(
        manager.cache_health_for(&spec),
        ModelCacheHealth::IntegrityMismatch
    );
    assert_eq!(manager.required_files_present(&spec), 0);
}

#[test]
fn model_cache_health_rejects_specs_without_required_files() {
    let app_data_dir = tempfile::tempdir().unwrap();
    let manager = ModelManager::new(app_data_dir.path().to_path_buf());
    let mut spec = synthetic_spec();
    spec.files.clear();

    assert_eq!(manager.cache_health_for(&spec), ModelCacheHealth::Missing);
    assert_eq!(manager.required_files_present(&spec), 0);
}

#[cfg(unix)]
#[test]
fn model_cache_health_rejects_symlinks_and_unreadable_files() {
    use std::os::unix::fs::{symlink, PermissionsExt};

    let app_data_dir = tempfile::tempdir().unwrap();
    let manager = ModelManager::new(app_data_dir.path().to_path_buf());
    let spec = synthetic_spec();
    let model_dir = manager.model_cache_dir(&spec);
    std::fs::create_dir_all(&model_dir).unwrap();
    let target = app_data_dir.path().join("outside-model-cache");
    std::fs::write(&target, CONFIG).unwrap();
    symlink(&target, model_dir.join("config.json")).unwrap();
    std::fs::write(model_dir.join("model.safetensors"), WEIGHTS).unwrap();

    assert_eq!(
        manager.cache_health_for(&spec),
        ModelCacheHealth::IntegrityMismatch
    );
    assert_eq!(manager.required_files_present(&spec), 1);

    std::fs::remove_file(model_dir.join("config.json")).unwrap();
    std::fs::write(model_dir.join("config.json"), CONFIG).unwrap();
    set_mode(&model_dir.join("config.json"), 0o000);
    assert_eq!(
        manager.cache_health_for(&spec),
        ModelCacheHealth::IntegrityMismatch
    );
    set_mode(&model_dir.join("config.json"), 0o600);

    fn set_mode(path: &std::path::Path, mode: u32) {
        let mut permissions = std::fs::metadata(path).unwrap().permissions();
        permissions.set_mode(mode);
        std::fs::set_permissions(path, permissions).unwrap();
    }
}

fn synthetic_spec() -> ModelSpec {
    let mut spec = ModelManager::runtime_model_spec().unwrap();
    spec.id = "synthetic-cache-health".to_string();
    spec.files = vec![
        required_file("config.json", CONFIG),
        required_file("model.safetensors", WEIGHTS),
    ];
    spec
}

fn required_file(path: &str, contents: &[u8]) -> ModelFileSpec {
    ModelFileSpec {
        path: path.to_string(),
        sha256: hex::encode(Sha256::digest(contents)),
        size_bytes: Some(contents.len() as u64),
        required: true,
    }
}
