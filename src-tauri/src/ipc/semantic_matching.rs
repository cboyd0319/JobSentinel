//! Local semantic matching diagnostics.

#[cfg(feature = "embedded-ml")]
use crate::desktop;
#[cfg(feature = "embedded-ml")]
use crate::desktop::{load_model_manifest, model_lock_hash, ModelKind, ModelManager, ModelSpec};
#[cfg(feature = "embedded-ml")]
use crate::ipc::errors::user_friendly_error;

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub(crate) enum SemanticMatchingRuntimeStatus {
    #[cfg(feature = "embedded-ml")]
    Ready,
    #[cfg(feature = "embedded-ml")]
    NeedsModelDownload,
    #[cfg(not(feature = "embedded-ml"))]
    DisabledInThisBuild,
}

#[derive(Debug, Clone, serde::Serialize)]
pub(crate) struct SemanticMatchingDiagnostics {
    pub build_enabled: bool,
    pub runtime_status: SemanticMatchingRuntimeStatus,
    pub active_profile: String,
    pub privacy_mode: String,
    pub manifest_hash: Option<String>,
    pub models: Vec<SemanticMatchingModelDiagnostic>,
    pub scoring_signals: Vec<SemanticMatchingSignal>,
    pub eval_contract: Vec<String>,
    pub user_action: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub(crate) struct SemanticMatchingModelDiagnostic {
    pub id: String,
    pub role: String,
    pub repo: String,
    pub revision: String,
    pub backend: String,
    pub license: String,
    pub dimension: Option<usize>,
    pub max_tokens: usize,
    pub required_files: usize,
    pub required_files_present: usize,
    pub locked_size_bytes: Option<u64>,
    pub downloaded: bool,
    pub required_for_qwen3_runtime: bool,
}

#[derive(Debug, Clone, serde::Serialize)]
pub(crate) struct SemanticMatchingSignal {
    pub id: String,
    pub label: String,
    pub state: String,
    pub explanation: String,
}

#[tauri::command]
pub(crate) async fn get_semantic_matching_diagnostics(
) -> Result<SemanticMatchingDiagnostics, String> {
    semantic_matching_diagnostics()
}

#[cfg(not(feature = "embedded-ml"))]
fn semantic_matching_diagnostics() -> Result<SemanticMatchingDiagnostics, String> {
    Ok(SemanticMatchingDiagnostics {
        build_enabled: false,
        runtime_status: SemanticMatchingRuntimeStatus::DisabledInThisBuild,
        active_profile: "Built-in local matching rules".to_string(),
        privacy_mode: "Local only. No resume or job text leaves this device.".to_string(),
        manifest_hash: None,
        models: Vec::new(),
        scoring_signals: base_scoring_signals(),
        eval_contract: base_eval_contract(),
        user_action: Some(
            "This app build uses the built-in local matching rules. Advanced local model diagnostics appear in embedded-ML builds."
                .to_string(),
        ),
    })
}

#[cfg(feature = "embedded-ml")]
fn semantic_matching_diagnostics() -> Result<SemanticMatchingDiagnostics, String> {
    let manifest = load_model_manifest()
        .map_err(|error| user_friendly_error("Failed to read local model lock", error))?;
    let manager = ModelManager::new(desktop::get_data_dir());

    let mut models = Vec::new();
    for model in &manifest.models {
        models.push(model_diagnostic(&manager, &manifest, model));
    }

    let qwen3_models_ready = manifest
        .default_embedding()
        .is_some_and(|model| manager.is_model_downloaded_for(model))
        && manifest
            .default_reranker()
            .is_some_and(|model| manager.is_model_downloaded_for(model));
    let runtime_status = if qwen3_models_ready {
        SemanticMatchingRuntimeStatus::Ready
    } else {
        SemanticMatchingRuntimeStatus::NeedsModelDownload
    };

    Ok(SemanticMatchingDiagnostics {
        build_enabled: true,
        runtime_status,
        active_profile: "Qwen3 embedding plus Qwen3 reranker, with built-in local fallback"
            .to_string(),
        privacy_mode: "Local only. Model downloads fetch model files only and never send resume or job-search data."
            .to_string(),
        manifest_hash: Some(model_lock_hash()),
        models,
        scoring_signals: base_scoring_signals(),
        eval_contract: base_eval_contract(),
        user_action: (!qwen3_models_ready).then_some(
            "Download the pinned local models before using Qwen3 semantic matching.".to_string(),
        ),
    })
}

#[cfg(feature = "embedded-ml")]
fn model_diagnostic(
    manager: &ModelManager,
    manifest: &crate::desktop::ModelManifest,
    model: &ModelSpec,
) -> SemanticMatchingModelDiagnostic {
    let required_files = model.required_files().count();
    let required_files_present = manager.required_files_present(model);
    let downloaded = manager.is_model_downloaded_for(model);

    SemanticMatchingModelDiagnostic {
        id: model.id.clone(),
        role: model_role(manifest, model).to_string(),
        repo: model.repo.clone(),
        revision: model.revision.clone(),
        backend: model.backend.clone(),
        license: model.license.clone(),
        dimension: model.dimension,
        max_tokens: model.max_tokens,
        required_files,
        required_files_present,
        locked_size_bytes: locked_size_bytes(model),
        downloaded,
        required_for_qwen3_runtime: model.id == manifest.defaults.embedding
            || model.id == manifest.defaults.reranker,
    }
}

#[cfg(feature = "embedded-ml")]
fn model_role(manifest: &crate::desktop::ModelManifest, model: &ModelSpec) -> &'static str {
    if model.id == manifest.defaults.embedding {
        "Default embedding"
    } else if model.id == manifest.defaults.reranker {
        "Default reranker"
    } else if model.id == manifest.defaults.legacy_runtime_embedding {
        "Legacy direct matcher"
    } else {
        match model.kind {
            ModelKind::Embedding => "Embedding",
            ModelKind::Reranker => "Reranker",
        }
    }
}

#[cfg(feature = "embedded-ml")]
fn locked_size_bytes(model: &ModelSpec) -> Option<u64> {
    let mut total = 0_u64;
    for file in &model.files {
        total = total.checked_add(file.size_bytes?)?;
    }
    Some(total)
}

fn base_scoring_signals() -> Vec<SemanticMatchingSignal> {
    vec![
        signal(
            "exact_skills",
            "Exact skills",
            "Always on",
            "Matches visible skills and aliases before any model estimate is used.",
        ),
        signal(
            "required_coverage",
            "Must-have coverage",
            "Always on",
            "Caps a match when required skills, credentials, location, or pay do not line up.",
        ),
        signal(
            "seniority",
            "Seniority fit",
            "Always on",
            "Checks whether the resume evidence fits the level of the posting.",
        ),
        signal(
            "qwen3_embedding",
            "Qwen3 semantic retrieval",
            "Embedded-ML builds",
            "Finds related evidence after the pinned local model files are downloaded and verified.",
        ),
        signal(
            "qwen3_reranker",
            "Qwen3 reranker",
            "Embedded-ML builds",
            "Reranks only a bounded top set of candidate evidence so broad searches stay controlled.",
        ),
    ]
}

fn signal(id: &str, label: &str, state: &str, explanation: &str) -> SemanticMatchingSignal {
    SemanticMatchingSignal {
        id: id.to_string(),
        label: label.to_string(),
        state: state.to_string(),
        explanation: explanation.to_string(),
    }
}

fn base_eval_contract() -> Vec<String> {
    vec![
        "Direct evidence must outrank keyword-only near misses.".to_string(),
        "Hard blockers must cap otherwise strong-looking matches.".to_string(),
        "Role-family and seniority checks must cover technical and non-technical work.".to_string(),
        "Fairness checks must avoid rewarding a candidate for matching only a single narrow profile.".to_string(),
        "Generated advice must stay separate from real job evidence.".to_string(),
    ]
}

#[cfg(test)]
mod tests {
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
    fn diagnostics_report_qwen3_model_lock_entries() {
        let diagnostics = semantic_matching_diagnostics().expect("diagnostics should build");

        assert!(diagnostics.build_enabled);
        assert_eq!(diagnostics.manifest_hash.as_deref().map(str::len), Some(64));
        assert!(diagnostics
            .models
            .iter()
            .any(|model| model.id == "qwen3-embedding-0.6b"
                && model.role == "Default embedding"
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
}
