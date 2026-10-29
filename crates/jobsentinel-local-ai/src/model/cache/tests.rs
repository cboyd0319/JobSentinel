//! Verifies cache state, integrity, safe repair and governed cleanup.

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
    assert_eq!(
        manager.cache_health_for(&spec),
        ModelCacheHealth::Incomplete
    );
    manager
        .finalize_verified_cache(&load_model_manifest().unwrap(), &spec)
        .unwrap();
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

#[test]
fn repair_removes_only_an_integrity_invalid_cache() {
    let app_data_dir = tempfile::tempdir().unwrap();
    let manager = ModelManager::new(app_data_dir.path().to_path_buf());
    let spec = synthetic_spec();
    let model_dir = manager.model_cache_dir(&spec);
    std::fs::create_dir_all(&model_dir).unwrap();
    std::fs::write(model_dir.join("config.json"), CONFIG).unwrap();
    std::fs::write(model_dir.join("model.safetensors"), b"tampered").unwrap();

    manager.remove_integrity_invalid_cache(&spec).unwrap();

    assert!(!model_dir.exists());
}

#[test]
fn default_cache_repair_removes_a_tampered_lock_owned_cache() {
    let app_data_dir = tempfile::tempdir().unwrap();
    let manager = ModelManager::new(app_data_dir.path().to_path_buf());
    let spec = ModelManager::default_embedding_model_spec().unwrap();
    let file = spec.required_files().next().unwrap();
    let file_path = manager.model_file_path(&spec, file);
    std::fs::create_dir_all(file_path.parent().unwrap()).unwrap();
    std::fs::write(file_path, b"tampered").unwrap();

    manager.repair_invalid_default_cache(&spec.id).unwrap();

    assert!(!manager.model_cache_dir(&spec).exists());
}

#[test]
fn default_cache_removal_deletes_only_the_governed_qwen3_caches() {
    let app_data_dir = tempfile::tempdir().unwrap();
    let manager = ModelManager::new(app_data_dir.path().to_path_buf());
    let embedding = ModelManager::default_embedding_model_spec().unwrap();
    let reranker = ModelManager::default_reranker_model_spec().unwrap();
    let legacy = ModelManager::runtime_model_spec().unwrap();
    let xet_cache = app_data_dir.path().join("ml_models").join(".xet");

    for spec in [&embedding, &reranker, &legacy] {
        let model_dir = manager.model_cache_dir(spec);
        std::fs::create_dir_all(model_dir.join(".download")).unwrap();
        std::fs::write(model_dir.join(".download").join("partial"), b"partial").unwrap();
    }
    std::fs::create_dir_all(&xet_cache).unwrap();
    std::fs::write(xet_cache.join("chunk"), b"temporary").unwrap();

    assert!(manager.remove_default_semantic_model_caches().unwrap());
    assert!(!manager.model_cache_dir(&embedding).exists());
    assert!(!manager.model_cache_dir(&reranker).exists());
    assert!(manager.model_cache_dir(&legacy).exists());
    assert!(!xet_cache.exists());
    assert!(!manager.remove_default_semantic_model_caches().unwrap());
}

#[test]
fn default_cache_removal_deletes_stale_revision_and_lock_caches() {
    let app_data_dir = tempfile::tempdir().unwrap();
    let manager = ModelManager::new(app_data_dir.path().to_path_buf());
    let embedding = ModelManager::default_embedding_model_spec().unwrap();
    let stale = app_data_dir
        .path()
        .join("ml_models")
        .join(&embedding.id)
        .join("0000000000000000000000000000000000000000")
        .join("stale-lock-hash");
    std::fs::create_dir_all(&stale).unwrap();
    std::fs::write(stale.join("model.safetensors"), b"stale").unwrap();

    assert!(manager.cache_exists_for(&embedding));
    assert!(manager.remove_default_semantic_model_caches().unwrap());
    assert!(!app_data_dir
        .path()
        .join("ml_models")
        .join(&embedding.id)
        .exists());
}

#[cfg(unix)]
#[test]
fn default_cache_removal_rejects_a_symlinked_cache_root() {
    use std::os::unix::fs::symlink;

    let app_data_dir = tempfile::tempdir().unwrap();
    let outside = tempfile::tempdir().unwrap();
    let manager = ModelManager::new(app_data_dir.path().to_path_buf());
    let embedding = ModelManager::default_embedding_model_spec().unwrap();
    let cache_root = manager.model_cache_dir(&embedding);
    std::fs::create_dir_all(cache_root.parent().unwrap()).unwrap();
    std::fs::write(outside.path().join("keep"), b"private").unwrap();
    symlink(outside.path(), &cache_root).unwrap();

    assert!(manager.remove_default_semantic_model_caches().is_err());
    assert_eq!(
        std::fs::read(outside.path().join("keep")).unwrap(),
        b"private"
    );
}

#[test]
fn repair_rejects_missing_incomplete_and_ready_caches() {
    let app_data_dir = tempfile::tempdir().unwrap();
    let manager = ModelManager::new(app_data_dir.path().to_path_buf());
    let spec = synthetic_spec();
    let model_dir = manager.model_cache_dir(&spec);

    assert!(manager.remove_integrity_invalid_cache(&spec).is_err());

    std::fs::create_dir_all(&model_dir).unwrap();
    std::fs::write(model_dir.join("config.json"), CONFIG).unwrap();
    assert!(manager.remove_integrity_invalid_cache(&spec).is_err());

    std::fs::write(model_dir.join("model.safetensors"), WEIGHTS).unwrap();
    assert!(manager.remove_integrity_invalid_cache(&spec).is_err());
    assert!(model_dir.exists());
}

#[test]
fn default_cache_repair_rejects_unknown_legacy_and_path_like_ids() {
    let app_data_dir = tempfile::tempdir().unwrap();
    let manager = ModelManager::new(app_data_dir.path().to_path_buf());
    let legacy_id = ModelManager::runtime_model_spec().unwrap().id;

    for model_id in ["unknown-model", "../qwen3-embedding-0.6b", &legacy_id] {
        let error = manager
            .repair_invalid_default_cache(model_id)
            .unwrap_err()
            .to_string();
        assert_eq!(error, MODEL_CACHE_NOT_REPAIRABLE);
        assert!(!error.contains(model_id));
    }

    assert!(!app_data_dir.path().join("ml_models").exists());
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

#[cfg(unix)]
#[test]
fn repair_rejects_a_symlinked_cache_root_without_deleting_its_target() {
    use std::os::unix::fs::symlink;

    let app_data_dir = tempfile::tempdir().unwrap();
    let outside = tempfile::tempdir().unwrap();
    symlink(outside.path(), app_data_dir.path().join("ml_models")).unwrap();
    let manager = ModelManager::new(app_data_dir.path().to_path_buf());
    let spec = synthetic_spec();
    let model_dir = manager.model_cache_dir(&spec);
    std::fs::create_dir_all(&model_dir).unwrap();
    std::fs::write(model_dir.join("config.json"), CONFIG).unwrap();
    std::fs::write(model_dir.join("model.safetensors"), b"tampered").unwrap();

    assert!(manager.remove_integrity_invalid_cache(&spec).is_err());
    assert!(model_dir.exists());
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

#[test]
fn prior_lock_artifacts_are_verified_reused_and_preserved() {
    let root = tempfile::tempdir().unwrap();
    let manager = ModelManager::new(root.path().to_path_buf());
    let spec = synthetic_spec();
    let current = manager.model_cache_dir(&spec);
    let old = current.parent().unwrap().join("a".repeat(64));
    std::fs::create_dir_all(&old).unwrap();
    std::fs::write(old.join("config.json"), CONFIG).unwrap();
    std::fs::write(old.join("model.safetensors"), WEIGHTS).unwrap();
    std::fs::write(old.join(".jobsentinel-model.json"), b"retained metadata").unwrap();
    assert!(manager.reuse_verified_artifacts(&spec).unwrap());
    manager
        .finalize_verified_cache(&load_model_manifest().unwrap(), &spec)
        .unwrap();
    assert_eq!(manager.cache_health_for(&spec), ModelCacheHealth::Ready);
    assert_eq!(std::fs::read(old.join("config.json")).unwrap(), CONFIG);
    assert_eq!(
        std::fs::read(old.join(".jobsentinel-model.json")).unwrap(),
        b"retained metadata"
    );
    #[cfg(unix)]
    {
        use std::os::unix::fs::MetadataExt;
        assert_eq!(
            std::fs::metadata(old.join("model.safetensors"))
                .unwrap()
                .ino(),
            std::fs::metadata(current.join("model.safetensors"))
                .unwrap()
                .ino()
        );
    }
}

#[test]
fn corrupted_prior_lock_artifacts_are_not_reused() {
    let root = tempfile::tempdir().unwrap();
    let manager = ModelManager::new(root.path().to_path_buf());
    let spec = synthetic_spec();
    let current = manager.model_cache_dir(&spec);
    let old = current.parent().unwrap().join("a".repeat(64));
    std::fs::create_dir_all(&old).unwrap();
    std::fs::write(old.join("config.json"), CONFIG).unwrap();
    std::fs::write(old.join("model.safetensors"), b"corrupt").unwrap();
    assert!(!manager.reuse_verified_artifacts(&spec).unwrap());
    assert!(!current.exists());
}

#[test]
fn retained_metadata_must_match_its_own_lock_and_current_spec() {
    let root = tempfile::tempdir().unwrap();
    let manager = ModelManager::new(root.path().to_path_buf());
    let spec = synthetic_spec();
    let current = manager.model_cache_dir(&spec);
    std::fs::create_dir_all(&current).unwrap();
    manager
        .write_cache_metadata(
            &current,
            &load_model_manifest().unwrap(),
            &spec,
            "unknown".into(),
            "unknown".into(),
        )
        .unwrap();
    assert!(manager
        .verified_cache_metadata_at(&spec, &current, &"a".repeat(64))
        .is_err());
    let old_lock = model_lock_hash();
    assert!(manager
        .verified_cache_metadata_at(&spec, &current, &old_lock)
        .is_ok());
    std::fs::write(current.join(".jobsentinel-model.json"), b"{}").unwrap();
    assert!(manager
        .verified_cache_metadata_at(&spec, &current, &old_lock)
        .is_err());
}

#[tokio::test]
#[ignore = "requires an existing governed MiniLM cache in JOBSENTINEL_MINILM_TEST_CACHE; never downloads"]
async fn governed_old_lock_reuses_artifacts_and_remains_in_inventory() {
    let root = std::path::PathBuf::from(
        std::env::var_os("JOBSENTINEL_MINILM_TEST_CACHE").expect("explicit existing model cache"),
    );
    let manager = ModelManager::new(root);
    let spec = ModelManager::runtime_model_spec().unwrap();
    assert!(manager.reuse_verified_artifacts(&spec).unwrap());
    manager
        .finalize_verified_cache(&load_model_manifest().unwrap(), &spec)
        .unwrap();
    assert!(manager.is_model_downloaded_for(&spec));
    let (formats, identities) = manager.update_identity_inventory().unwrap();
    assert!(formats.len() >= 2 && identities.len() == formats.len());
}

#[test]
fn metadata_repair_preserves_verified_current_cache_and_retained_bytes() {
    let root = tempfile::tempdir().unwrap();
    let manager = ModelManager::new(root.path().to_path_buf());
    let spec = synthetic_spec();
    let current = manager.model_cache_dir(&spec);
    let old = current.parent().unwrap().join("b".repeat(64));
    for cache in [&current, &old] {
        std::fs::create_dir_all(cache).unwrap();
        std::fs::write(cache.join("config.json"), CONFIG).unwrap();
        std::fs::write(cache.join("model.safetensors"), WEIGHTS).unwrap();
    }
    manager
        .finalize_verified_cache(&load_model_manifest().unwrap(), &spec)
        .unwrap();
    let before = std::fs::read(current.join(".jobsentinel-model.json")).unwrap();
    std::fs::write(old.join(".jobsentinel-model.json"), b"malformed").unwrap();
    for file in spec.required_files() {
        verified_retained_file(&old, file).unwrap();
    }
    std::fs::create_dir(manager.model_quarantine_dir().unwrap()).unwrap();
    manager.repair_invalid_cache_for_spec(&spec).unwrap();
    assert_eq!(manager.cache_health_for(&spec), ModelCacheHealth::Ready);
    assert_eq!(
        std::fs::read(current.join(".jobsentinel-model.json")).unwrap(),
        before
    );
    assert_eq!(
        std::fs::read(current.join("model.safetensors")).unwrap(),
        WEIGHTS
    );
    assert!(!old.exists());
    let quarantine = std::fs::read_dir(root.path().join("ml_models_quarantine"))
        .unwrap()
        .next()
        .unwrap()
        .unwrap()
        .path()
        .join("cache");
    assert_eq!(
        std::fs::read(quarantine.join("model.safetensors")).unwrap(),
        WEIGHTS
    );
    assert_eq!(
        std::fs::read(quarantine.join(".jobsentinel-model.json")).unwrap(),
        b"malformed"
    );
    assert!(manager.has_quarantined_model_cache());
    assert!(manager.remove_default_semantic_model_caches().unwrap());
    assert!(!manager.has_quarantined_model_cache());
    assert!(!root.path().join("ml_models_quarantine").exists());
    assert_eq!(
        std::fs::read(current.join("model.safetensors")).unwrap(),
        WEIGHTS
    );
}

#[test]
fn metadata_repair_does_not_bypass_remaining_weight_verification() {
    let root = tempfile::tempdir().unwrap();
    let manager = ModelManager::new(root.path().to_path_buf());
    let spec = synthetic_spec();
    let old_lock = "c".repeat(64);
    let old = manager
        .model_cache_dir(&spec)
        .parent()
        .unwrap()
        .join(&old_lock);
    std::fs::create_dir_all(&old).unwrap();
    manager
        .write_cache_metadata(
            &old,
            &load_model_manifest().unwrap(),
            &spec,
            "unknown".into(),
            "unknown".into(),
        )
        .unwrap();
    let path = old.join(".jobsentinel-model.json");
    let mut metadata: serde_json::Value =
        serde_json::from_slice(&std::fs::read(&path).unwrap()).unwrap();
    metadata["manifest_hash"] = old_lock.clone().into();
    std::fs::write(&path, serde_json::to_vec(&metadata).unwrap()).unwrap();
    assert!(manager
        .verified_cache_metadata_at(&spec, &old, &old_lock)
        .is_ok());
    assert_eq!(
        manager.quarantine_invalid_retained_metadata(&spec).unwrap(),
        0
    );
    assert!(old.exists());
    assert!(verified_retained_file(&old, spec.required_files().next().unwrap()).is_err());
    assert!(!manager.is_model_downloaded_for(&spec));
}
