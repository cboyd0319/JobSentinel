//! Machine Learning Tauri Commands
//!
//! Commands for model download, status checking, and semantic matching.

#![cfg(feature = "embedded-ml")]

use crate::bootstrap::AppState;
use crate::desktop;
use crate::desktop::path_label_for_logging;
use crate::desktop::{ModelManager, ModelStatus, SemanticMatcher};
use crate::ipc::errors::user_friendly_error;
use tauri::State;

/// Download the default local semantic models from HuggingFace Hub.
#[tauri::command]
pub(crate) async fn download_ml_model() -> Result<String, String> {
    tracing::info!("Command: download_ml_model");

    let app_data_dir = desktop::get_data_dir();
    let manager = ModelManager::new(app_data_dir);

    if manager.is_default_semantic_runtime_downloaded() {
        tracing::info!("Default semantic models already downloaded");
        return Ok("Local matching models already downloaded".to_string());
    }

    tracing::info!("Starting default semantic model download from HuggingFace Hub");
    let model_paths = manager
        .download_default_semantic_models()
        .await
        .map_err(|e| user_friendly_error("Failed to download local matching models", e))?;

    tracing::info!(
        model_count = model_paths.len(),
        model_paths = ?model_paths.iter().map(path_label_for_logging).collect::<Vec<_>>(),
        "Local matching models downloaded successfully"
    );
    Ok("Local matching models downloaded successfully".to_string())
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
) -> Result<serde_json::Value, String> {
    tracing::info!(
        "Command: semantic_match_skills ({} user skills, {} job requirements)",
        user_skills.len(),
        job_requirements.len()
    );

    let app_data_dir = desktop::get_data_dir();
    let matcher = SemanticMatcher::new(app_data_dir)
        .map_err(|e| user_friendly_error("Failed to create matcher", e))?;

    let result = matcher
        .match_skills(&user_skills, &job_requirements)
        .map_err(|e| user_friendly_error("Failed to match skills", e))?;

    serde_json::to_value(&result).map_err(|e| user_friendly_error("Failed to serialize result", e))
}

/// Enhanced resume matching with semantic understanding
#[tauri::command]
pub(crate) async fn match_resume_semantic(
    resume_id: i64,
    job_hash: String,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    tracing::info!(
        resume_id,
        job_hash_chars = job_hash.chars().count(),
        "Command: match_resume_semantic"
    );

    // Get app data directory
    let app_data_dir = desktop::get_data_dir();

    let resume_matcher = state.database.resume_matcher();
    let user_skills = resume_matcher
        .get_user_skills(resume_id)
        .await
        .map_err(|e| user_friendly_error("Failed to fetch user skills", e))?
        .into_iter()
        .map(|skill| skill.skill_name)
        .collect::<Vec<_>>();

    let job_skills = resume_matcher
        .get_job_skill_names(&job_hash)
        .await
        .map_err(|e| user_friendly_error("Failed to fetch job skills", e))?;

    let matcher = SemanticMatcher::new(app_data_dir)
        .map_err(|e| user_friendly_error("Failed to create matcher", e))?;

    let result = matcher
        .match_skills(&user_skills, &job_skills)
        .map_err(|e| user_friendly_error("Failed to match skills", e))?;

    serde_json::to_value(&result).map_err(|e| user_friendly_error("Failed to serialize result", e))
}
