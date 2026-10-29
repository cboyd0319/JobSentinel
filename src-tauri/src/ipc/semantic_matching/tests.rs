//! Proves model diagnostics, deterministic fallback, and inert model-free inspection.

use super::*;

#[cfg(not(feature = "embedded-ml"))]
#[test]
fn diagnostics_explain_disabled_build_without_private_data() {
    let diagnostics = semantic_matching_diagnostics().expect("diagnostics should build");

    assert!(!diagnostics.build_enabled);
    assert!(matches!(
        diagnostics.runtime_status,
        SemanticMatchingRuntimeStatus::DisabledInThisBuild
    ));
    assert!(diagnostics.models.is_empty());
    assert!(diagnostics.privacy_mode.contains("No resume or job text"));
}

#[cfg(feature = "embedded-ml")]
#[test]
fn fresh_essentials_diagnostics_offer_setup_without_creating_model_files() {
    let app_data = tempfile::tempdir().unwrap();
    let manifest = load_model_manifest().unwrap();
    let manager = ModelManager::new(app_data.path().to_path_buf());

    let diagnostics = semantic_matching_diagnostics_for(&manifest, &manager);

    assert!(diagnostics.build_enabled);
    assert_eq!(
        diagnostics.runtime_status,
        SemanticMatchingRuntimeStatus::NeedsModelDownload
    );
    assert!(diagnostics.models.iter().all(|model| {
        !model.downloaded && !model.cache_present && model.required_files_present == 0
    }));
    assert!(diagnostics.user_action.is_some());
    assert!(std::fs::read_dir(app_data.path()).unwrap().next().is_none());
}

#[cfg(feature = "embedded-ml")]
#[test]
fn diagnostics_report_qwen3_model_lock_entries() {
    let diagnostics = semantic_matching_diagnostics().expect("diagnostics should build");

    assert!(diagnostics.build_enabled);
    assert_eq!(diagnostics.manifest_hash.as_deref().map(str::len), Some(64));
    assert!(diagnostics
        .models
        .iter()
        .any(|model| model.id == "qwen3-embedding-0.6b"
            && model.role == "Default embedding"
            && matches!(
                model.health,
                ModelCacheHealth::Missing | ModelCacheHealth::Ready
            )
            && model.required_for_qwen3_runtime));
    assert!(diagnostics
        .models
        .iter()
        .any(|model| model.id == "qwen3-reranker-0.6b"
            && model.role == "Default reranker"
            && model.required_for_qwen3_runtime));
    assert!(diagnostics
        .scoring_signals
        .iter()
        .any(|signal| signal.id == "qwen3_reranker"));
}

#[cfg(feature = "embedded-ml")]
#[test]
fn qwen3_runtime_status_distinguishes_absent_damaged_and_ready_caches() {
    assert_eq!(
        semantic_runtime_status(
            ModelCacheHealth::Missing,
            ModelCacheHealth::Missing,
            ModelCacheHealth::Missing,
        ),
        SemanticMatchingRuntimeStatus::NeedsModelDownload
    );
    assert_eq!(
        semantic_runtime_status(
            ModelCacheHealth::Incomplete,
            ModelCacheHealth::Missing,
            ModelCacheHealth::Missing,
        ),
        SemanticMatchingRuntimeStatus::Misconfigured
    );
    assert_eq!(
        semantic_runtime_status(
            ModelCacheHealth::IntegrityMismatch,
            ModelCacheHealth::Ready,
            ModelCacheHealth::Ready,
        ),
        SemanticMatchingRuntimeStatus::Misconfigured
    );
    assert_eq!(
        semantic_runtime_status(
            ModelCacheHealth::Ready,
            ModelCacheHealth::Ready,
            ModelCacheHealth::IntegrityMismatch,
        ),
        SemanticMatchingRuntimeStatus::Ready
    );
    assert_eq!(
        semantic_runtime_status(
            ModelCacheHealth::Missing,
            ModelCacheHealth::Missing,
            ModelCacheHealth::IntegrityMismatch,
        ),
        SemanticMatchingRuntimeStatus::Misconfigured
    );
}

#[cfg(feature = "embedded-ml")]
#[test]
fn runtime_copy_names_verified_minilm_instead_of_exact_only_fallback() {
    let (active_profile, user_action) = semantic_runtime_copy(
        SemanticMatchingRuntimeStatus::Misconfigured,
        ModelCacheHealth::Ready,
    );

    assert!(active_profile.contains("MiniLM"));
    assert!(user_action.unwrap().contains("MiniLM"));
    assert!(!active_profile.contains("Exact-only"));
}

#[cfg(feature = "embedded-ml")]
#[test]
fn partial_cache_diagnostics_expose_no_path_or_file_contents() {
    let app_data_dir = tempfile::tempdir().unwrap();
    let manifest = load_model_manifest().unwrap();
    let model = manifest.default_embedding().unwrap();
    let file = model.required_files().next().unwrap();
    let model_file = app_data_dir
        .path()
        .join("ml_models")
        .join(&model.id)
        .join(&model.revision)
        .join(model_lock_hash())
        .join(&file.path);
    std::fs::create_dir_all(model_file.parent().unwrap()).unwrap();
    std::fs::write(&model_file, b"private partial model contents").unwrap();

    let diagnostics = semantic_matching_diagnostics_for(
        &manifest,
        &ModelManager::new(app_data_dir.path().to_path_buf()),
    );
    let serialized = serde_json::to_string(&diagnostics).unwrap();

    assert_eq!(
        diagnostics.runtime_status,
        SemanticMatchingRuntimeStatus::Misconfigured
    );
    assert_eq!(
        diagnostics
            .models
            .iter()
            .find(|diagnostic| diagnostic.id == model.id)
            .unwrap()
            .health,
        ModelCacheHealth::IntegrityMismatch
    );
    assert!(!serialized.contains(&app_data_dir.path().display().to_string()));
    assert!(!serialized.contains("private partial model contents"));
}

#[cfg(feature = "embedded-ml")]
#[test]
fn metadata_repair_is_offered_for_earlier_default_and_legacy_caches() {
    let root = tempfile::tempdir().unwrap();
    let manifest = load_model_manifest().unwrap();
    let manager = ModelManager::new(root.path().to_path_buf());
    for id in [
        &manifest.defaults.embedding,
        &manifest.defaults.legacy_runtime_embedding,
    ] {
        let spec = manifest.models.iter().find(|spec| &spec.id == id).unwrap();
        let prior = root
            .path()
            .join("ml_models")
            .join(id)
            .join(&spec.revision)
            .join("a".repeat(64));
        std::fs::create_dir_all(&prior).unwrap();
        std::fs::write(prior.join(".jobsentinel-model.json"), b"{broken").unwrap();
        let before = semantic_matching_diagnostics_for(&manifest, &manager);
        let model = before.models.iter().find(|model| &model.id == id).unwrap();
        assert!(model.repair_available);
        assert!(!model.downloaded);
        assert_eq!(model.health, ModelCacheHealth::Missing);
        desktop::ensure_private_dir(&manager.model_quarantine_dir().unwrap()).unwrap();
        manager.repair_invalid_default_cache(id).unwrap();
        let after = semantic_matching_diagnostics_for(&manifest, &manager);
        assert!(
            !after
                .models
                .iter()
                .find(|model| &model.id == id)
                .unwrap()
                .repair_available
        );
        assert_eq!(
            after.runtime_status,
            SemanticMatchingRuntimeStatus::NeedsModelDownload
        );
        assert!(after.quarantined_cache_present);
    }
    assert_eq!(
        manager.update_identity_inventory().unwrap(),
        (vec![], vec![])
    );
    let message = model_repair_message("Default embedding", 2, false);
    assert!(message.contains("2 earlier caches"));
    assert!(message.contains("preserving their files"));
    assert!(!message.contains("Remove the damaged current cache"));
    assert!(model_repair_message("Default embedding", 0, true)
        .contains("Remove the damaged current cache"));
}
