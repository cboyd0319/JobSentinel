//! Exposes reviewed local model setup, diagnostics and semantic matching.

#![cfg(feature = "embedded-ml")]

use crate::bootstrap::operation::{OperationAdmission, OperationLease, State};
use crate::desktop;
use crate::desktop::path_label_for_logging;
use crate::desktop::{load_model_manifest, ModelManager, ModelStatus, SemanticMatcher};
use crate::ipc::errors::user_friendly_error;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use tauri::{Emitter, Manager};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
use tokio::sync::{oneshot, watch};

mod lifecycle;
pub(crate) use lifecycle::{
    cancel_active_model_work, reserve_inference, reserve_model_lifecycle, InferenceRequest,
};

pub(crate) async fn cancel_resume_review(request_id: String) -> Result<bool, String> {
    lifecycle::cancel_review(request_id)
}

pub(crate) struct MatchingDirectory {
    pub(crate) path: std::path::PathBuf,
    #[cfg(test)]
    _temporary: tempfile::TempDir,
}

pub(crate) fn matching_directory() -> Result<MatchingDirectory, String> {
    #[cfg(test)]
    {
        let temporary = tempfile::tempdir()
            .map_err(|error| user_friendly_error("Could not prepare local matching", error))?;
        Ok(MatchingDirectory {
            path: temporary.path().into(),
            _temporary: temporary,
        })
    }
    #[cfg(not(test))]
    {
        Ok(MatchingDirectory {
            path: desktop::get_data_dir(),
        })
    }
}

#[cfg(test)]
pub(crate) static MODEL_TEST_LOCK: tokio::sync::Mutex<()> = tokio::sync::Mutex::const_new(());

#[derive(Clone, serde::Serialize)]
struct ModelDownloadProgress {
    completed_bytes: u64,
    total_bytes: u64,
}

const PROGRESS_EMIT_STEP_BYTES: u64 = 8 * 1024 * 1024;
const PROGRESS_NEVER_EMITTED: u64 = u64::MAX;

fn should_emit_progress(last_emitted: u64, completed_bytes: u64, total_bytes: u64) -> bool {
    last_emitted == PROGRESS_NEVER_EMITTED
        || completed_bytes >= total_bytes
        || completed_bytes.saturating_sub(last_emitted) >= PROGRESS_EMIT_STEP_BYTES
}

/// Download the default local semantic models from HuggingFace Hub.
#[tauri::command]
pub(crate) async fn download_ml_model(
    app: tauri::AppHandle,
    _operation: State<'_, Arc<OperationAdmission>>,
) -> Result<bool, String> {
    tracing::info!("Command: download_ml_model");
    let (cancel_tx, mut cancel_rx) = watch::channel(false);
    let _reservation = reserve_model_lifecycle(Some(cancel_tx))?;

    let app_data_dir = desktop::get_data_dir();
    let manager = ModelManager::new(app_data_dir);

    if manager.is_default_semantic_runtime_downloaded() {
        manager
            .finalize_default_semantic_metadata()
            .map_err(|_| "Local model metadata could not be repaired".to_string())?;
        tracing::info!("Default semantic models already downloaded");
        return Ok(true);
    }
    if !confirm_model_download(&app).await? {
        return Ok(false);
    }

    tracing::info!("Starting default semantic model download from HuggingFace Hub");
    let progress_app = app.clone();
    let last_emitted = AtomicU64::new(PROGRESS_NEVER_EMITTED);
    let progress = Arc::new(move |completed_bytes, total_bytes| {
        if !should_emit_progress(
            last_emitted.load(Ordering::Relaxed),
            completed_bytes,
            total_bytes,
        ) {
            return;
        }
        last_emitted.store(completed_bytes, Ordering::Relaxed);
        let _ = progress_app.emit(
            "local-model-download-progress",
            ModelDownloadProgress {
                completed_bytes,
                total_bytes,
            },
        );
    });
    let result = tokio::select! {
        result = manager.download_default_semantic_models_with_progress(progress) => {
            result.map(Some)
        }
        changed = cancel_rx.changed() => {
            changed
                .map(|()| None)
                .map_err(|_| anyhow::anyhow!("model download cancellation channel closed"))
        }
    };
    let Some(model_paths) = result
        .map_err(|error| user_friendly_error("Failed to download local matching models", error))?
    else {
        tracing::info!("Local matching model download canceled");
        return Ok(false);
    };

    tracing::info!(
        model_count = model_paths.len(),
        model_paths = ?model_paths.iter().map(path_label_for_logging).collect::<Vec<_>>(),
        "Local matching models downloaded successfully"
    );
    Ok(true)
}

#[tauri::command]
pub(crate) async fn cancel_ml_model_download() -> Result<bool, String> {
    tracing::info!("Command: cancel_ml_model_download");
    Ok(lifecycle::cancel_download())
}

#[tauri::command]
pub(crate) async fn remove_ml_models(
    app: tauri::AppHandle,
    _operation: State<'_, Arc<OperationAdmission>>,
) -> Result<bool, String> {
    tracing::info!("Command: remove_ml_models");
    let _reservation = reserve_model_lifecycle(None)?;
    if !confirm_model_removal(&app).await? {
        return Ok(false);
    }

    ModelManager::new(desktop::get_data_dir())
        .remove_default_semantic_model_caches()
        .map_err(|error| user_friendly_error("Failed to remove local matching models", error))
}

/// Get ML model status
#[tauri::command]
pub(crate) async fn get_ml_status() -> Result<ModelStatus, String> {
    tracing::info!("Command: get_ml_status");

    let app_data_dir = desktop::get_data_dir();
    let manager = ModelManager::new(app_data_dir);
    Ok(manager.get_status())
}

/// Perform semantic skill matching
#[tauri::command]
pub(crate) async fn semantic_match_skills(
    user_skills: Vec<String>,
    job_requirements: Vec<String>,
    operation: State<'_, Arc<OperationAdmission>>,
) -> Result<serde_json::Value, String> {
    semantic_match_skills_inner(user_skills, job_requirements, operation.lease()).await
}

async fn semantic_match_skills_inner(
    user_skills: Vec<String>,
    job_requirements: Vec<String>,
    operation: Arc<OperationLease>,
) -> Result<serde_json::Value, String> {
    tracing::info!(
        "Command: semantic_match_skills ({} user skills, {} job requirements)",
        user_skills.len(),
        job_requirements.len()
    );

    desktop::validate_local_matching_inputs(&user_skills, &job_requirements)
        .map_err(|error| user_friendly_error("Invalid local matching input", error))?;
    #[cfg(test)]
    assert!(
        tests::FORBID_MATCHER_ALLOCATION.try_with(|_| ()).is_err(),
        "input rejection must precede model access"
    );
    let reservation = reserve_model_lifecycle(None)?;
    tokio::task::spawn_blocking(move || {
        let _operation = operation;
        let _reservation = reservation;
        let directory = matching_directory()?;
        let matcher = SemanticMatcher::new(directory.path)
            .map_err(|error| user_friendly_error("Failed to create matcher", error))?;
        let result = matcher
            .match_skills(&user_skills, &job_requirements)
            .map_err(|error| user_friendly_error("Failed to match skills", error))?;
        serde_json::to_value(result)
            .map_err(|error| user_friendly_error("Failed to serialize result", error))
    })
    .await
    .map_err(|error| user_friendly_error("Local matching could not finish", error))?
}

async fn confirm_model_download(app: &tauri::AppHandle) -> Result<bool, String> {
    let manifest = load_model_manifest()
        .map_err(|_| "Local model setup could not be prepared.".to_string())?;
    let models = [
        manifest
            .default_embedding()
            .ok_or_else(|| "Local model setup could not be prepared.".to_string())?,
        manifest
            .default_reranker()
            .ok_or_else(|| "Local model setup could not be prepared.".to_string())?,
    ];
    let bytes = models
        .iter()
        .flat_map(|model| model.required_files())
        .filter_map(|file| file.size_bytes)
        .sum();
    let license = models
        .first()
        .map_or("the model license", |model| model.license.as_str());
    confirm_model_action(
        app,
        "Set Up Stronger Local Matching",
        format!(
            "Download approximately {} of pinned {license} model files from Hugging Face and its file delivery network?\n\n\
             Setup can need additional temporary disk space. \
             Resume text, job data, salary preferences, notes, and application history are not sent. \
             Matching stays on this device. Built-in matching remains available during the download, \
             after cancellation, and if setup fails.",
            format_bytes(bytes)
        ),
        "Download models",
        "Keep built-in matching",
    )
    .await
}

async fn confirm_model_removal(app: &tauri::AppHandle) -> Result<bool, String> {
    confirm_model_action(
        app,
        "Remove Local Models",
        "Remove JobSentinel's downloaded Qwen3 model files, retained quarantined model files, and incomplete download data?\n\n\
         Built-in local matching remains available. Stronger local matching can be downloaded again later.",
        "Remove model files",
        "Keep model files",
    )
    .await
}

async fn confirm_model_action(
    app: &tauri::AppHandle,
    title: &str,
    message: impl Into<String>,
    confirm_label: &str,
    cancel_label: &str,
) -> Result<bool, String> {
    let parent = app
        .get_webview_window("main")
        .ok_or_else(|| "Local model confirmation is unavailable.".to_string())?;
    let (sender, receiver) = oneshot::channel();
    app.dialog()
        .message(message)
        .title(title)
        .kind(MessageDialogKind::Warning)
        .parent(&parent)
        .buttons(MessageDialogButtons::OkCancelCustom(
            confirm_label.to_string(),
            cancel_label.to_string(),
        ))
        .show(move |confirmed| {
            let _ = sender.send(confirmed);
        });
    receiver
        .await
        .map_err(|_| "Local model confirmation could not be completed.".to_string())
}

fn format_bytes(bytes: u64) -> String {
    format!("{:.1} GB", bytes as f64 / 1_000_000_000.0)
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn semantic_match_skills(
        user_skills: Vec<String>,
        job_requirements: Vec<String>,
    ) -> Result<serde_json::Value, String> {
        semantic_match_skills_inner(
            user_skills,
            job_requirements,
            Arc::new(OperationAdmission::default()).admit()?,
        )
        .await
    }

    tokio::task_local! { pub(super) static FORBID_MATCHER_ALLOCATION: (); }

    #[tokio::test]
    async fn oversized_semantic_arguments_are_refused_before_model_access() {
        for skills in [
            vec!["x".repeat(16 * 1024 + 1)],
            vec!["x".into(); 257],
            vec!["x".repeat(16 * 1024); 65],
        ] {
            let result = FORBID_MATCHER_ALLOCATION
                .scope((), semantic_match_skills(skills, vec![]))
                .await;
            assert!(result.is_err());
        }
    }

    #[test]
    fn progress_emission_throttles_between_bounded_steps() {
        assert!(should_emit_progress(PROGRESS_NEVER_EMITTED, 0, 100));
        assert!(!should_emit_progress(
            0,
            PROGRESS_EMIT_STEP_BYTES - 1,
            u64::MAX
        ));
        assert!(should_emit_progress(0, PROGRESS_EMIT_STEP_BYTES, u64::MAX));
        assert!(should_emit_progress(0, 50, 50));
    }

    #[tokio::test]
    async fn model_lifecycle_reservation_blocks_overlap_and_targets_download_cancel() {
        let _serial = MODEL_TEST_LOCK.lock().await;
        let exclusive = reserve_model_lifecycle(None).unwrap();
        assert!(reserve_model_lifecycle(None).is_err());
        assert!(!cancel_ml_model_download().await.unwrap());
        assert!(
            semantic_match_skills(vec!["Rust".into()], vec!["Rust".into()])
                .await
                .is_err()
        );
        drop(exclusive);

        let (cancel_tx, mut cancel_rx) = watch::channel(false);
        let download = reserve_model_lifecycle(Some(cancel_tx)).unwrap();
        assert!(cancel_ml_model_download().await.unwrap());
        cancel_rx.changed().await.unwrap();
        drop(download);

        assert!(reserve_model_lifecycle(None).is_ok());
        let matched = semantic_match_skills(vec!["Rust".into()], vec!["Rust".into()])
            .await
            .unwrap();
        assert_eq!(matched["runtime_profile"], "deterministic_exact");
        assert_eq!(matched["matched_skills"].as_array().unwrap().len(), 1);
    }

    #[tokio::test]
    async fn review_cancel_targets_request_and_retains_worker_reservation() {
        let _serial = MODEL_TEST_LOCK.lock().await;
        let early_id = uuid::Uuid::new_v4().to_string();
        assert!(crate::ipc::resume::cancel_resume_review(early_id.clone())
            .await
            .unwrap());
        let early_token = crate::application::resume::InferenceCancellation::default();
        let early = reserve_inference(Some(early_id), early_token.clone()).unwrap();
        assert!(early_token.check().is_err());
        drop(early);
        let cancellation = crate::application::resume::InferenceCancellation::default();
        let request = InferenceRequest(cancellation.clone());
        let reservation = reserve_inference(
            Some("11111111-1111-4111-8111-111111111111".into()),
            cancellation.clone(),
        )
        .unwrap();
        assert!(
            cancel_resume_review("22222222-2222-4222-8222-222222222222".into())
                .await
                .unwrap()
        );
        assert!(cancellation.check().is_ok());
        assert!(
            cancel_resume_review("11111111-1111-4111-8111-111111111111".into())
                .await
                .unwrap()
        );
        assert!(cancellation.check().is_err());
        assert!(reserve_model_lifecycle(None).is_err());
        drop(reservation);
        assert!(reserve_model_lifecycle(None).is_ok());
        drop(request);
    }

    #[tokio::test]
    async fn dropped_review_signals_worker_without_releasing_its_lease() {
        let _serial = MODEL_TEST_LOCK.lock().await;
        let cancellation = crate::application::resume::InferenceCancellation::default();
        let request = InferenceRequest(cancellation.clone());
        let reservation = reserve_inference(None, cancellation.clone()).unwrap();
        let admission =
            std::sync::Arc::new(crate::bootstrap::operation::OperationAdmission::default());
        let operation = admission.admit().unwrap();
        let (started, ready) = tokio::sync::oneshot::channel();
        let (release, released) = std::sync::mpsc::channel();
        let worker = tokio::task::spawn_blocking(move || {
            let _reservation = reservation;
            let _operation = operation;
            started.send(()).unwrap();
            released.recv().unwrap();
            cancellation.check()
        });
        ready.await.unwrap();
        drop(request);
        assert!(reserve_model_lifecycle(None).is_err());
        let mut drain = std::pin::pin!(admission.close_and_wait());
        assert!(
            tokio::time::timeout(std::time::Duration::from_millis(10), &mut drain)
                .await
                .is_err()
        );
        release.send(()).unwrap();
        assert!(worker.await.unwrap().is_err());
        drain.await.unwrap();
        assert!(reserve_model_lifecycle(None).is_ok());
    }
}
