//! Machine Learning Tauri Commands
//!
//! Commands for model download, status checking, and semantic matching.

#![cfg(feature = "embedded-ml")]

use crate::commands::AppState;
use crate::core::ml::{ModelManager, ModelStatus, SemanticMatcher};
use crate::platforms;
use tauri::State;

/// Download the ML model from HuggingFace Hub
#[tauri::command]
pub async fn download_ml_model() -> Result<String, String> {
    tracing::info!("Command: download_ml_model");

    let app_data_dir = platforms::get_data_dir();
    let manager = ModelManager::new(app_data_dir);

    // Check if already downloaded
    if manager.is_model_downloaded() {
        tracing::info!("Model already downloaded");
        return Ok("Model already downloaded".to_string());
    }

    // Download model
    tracing::info!("Starting model download from HuggingFace Hub");
    let model_path = manager
        .download_model()
        .await
        .map_err(|e| format!("Failed to download model: {}", e))?;

    tracing::info!("Model downloaded successfully to {:?}", model_path);
    Ok(format!("Model downloaded to {:?}", model_path))
}

/// Get ML model status
#[tauri::command]
pub async fn get_ml_status() -> Result<ModelStatus, String> {
    tracing::info!("Command: get_ml_status");

    let app_data_dir = platforms::get_data_dir();
    let manager = ModelManager::new(app_data_dir);
    Ok(manager.get_status())
}

/// Perform semantic skill matching
#[tauri::command]
pub async fn semantic_match_skills(
    user_skills: Vec<String>,
    job_requirements: Vec<String>,
) -> Result<serde_json::Value, String> {
    tracing::info!(
        "Command: semantic_match_skills ({} user skills, {} job requirements)",
        user_skills.len(),
        job_requirements.len()
    );

    let app_data_dir = platforms::get_data_dir();
    let matcher = SemanticMatcher::new(app_data_dir)
        .map_err(|e| format!("Failed to create matcher: {}", e))?;

    let result = matcher
        .match_skills(&user_skills, &job_requirements)
        .map_err(|e| format!("Failed to match skills: {}", e))?;

    serde_json::to_value(&result)
        .map_err(|e| format!("Failed to serialize result: {}", e))
}

/// Enhanced resume matching with semantic understanding
#[tauri::command]
pub async fn match_resume_semantic(
    resume_id: i64,
    job_hash: String,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    tracing::info!(
        "Command: match_resume_semantic (resume: {}, job: {})",
        resume_id,
        job_hash
    );

    // Get app data directory
    let app_data_dir = platforms::get_data_dir();

    // Check if ML is available
    let manager = ModelManager::new(app_data_dir.clone());
    if !manager.is_model_downloaded() {
        return Err("ML model not downloaded. Call download_ml_model() first.".to_string());
    }

    // Get user skills from resume
    let user_skills = sqlx::query!(
        r#"
        SELECT skill_name
        FROM user_skills
        WHERE resume_id = ?
        "#,
        resume_id
    )
    .fetch_all(state.database.pool())
    .await
    .map_err(|e| format!("Failed to fetch user skills: {}", e))?
    .into_iter()
    .map(|row| row.skill_name)
    .collect::<Vec<_>>();

    // Get job requirements
    let job_skills = sqlx::query!(
        r#"
        SELECT skill_name
        FROM job_skills
        WHERE job_hash = ?
        "#,
        job_hash
    )
    .fetch_all(state.database.pool())
    .await
    .map_err(|e| format!("Failed to fetch job skills: {}", e))?
    .into_iter()
    .map(|row| row.skill_name)
    .collect::<Vec<_>>();

    // Perform semantic matching
    let matcher = SemanticMatcher::new(app_data_dir)
        .map_err(|e| format!("Failed to create matcher: {}", e))?;

    let result = matcher
        .match_skills(&user_skills, &job_skills)
        .map_err(|e| format!("Failed to match skills: {}", e))?;

    serde_json::to_value(&result)
        .map_err(|e| format!("Failed to serialize result: {}", e))
}
