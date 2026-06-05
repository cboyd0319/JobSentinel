//! Resume Builder Tauri commands.

use crate::commands::errors::user_friendly_error;
use crate::commands::AppState;
use crate::core::resume::{
    BuilderContactInfo, BuilderEducation, BuilderExperience, BuilderResumeData, ResumeBuilder,
    SkillEntry,
};
use tauri::State;

/// Create a new empty resume draft
#[tauri::command]
pub async fn create_resume_draft(state: State<'_, AppState>) -> Result<i64, String> {
    tracing::info!("Command: create_resume_draft");

    let builder = ResumeBuilder::new(state.database.pool().clone());
    builder
        .create_resume()
        .await
        .map_err(|e| user_friendly_error("Failed to create resume draft", e))
}

/// Get a resume draft by ID
#[tauri::command]
pub async fn get_resume_draft(
    resume_id: i64,
    state: State<'_, AppState>,
) -> Result<Option<BuilderResumeData>, String> {
    tracing::info!("Command: get_resume_draft (id: {})", resume_id);

    let builder = ResumeBuilder::new(state.database.pool().clone());
    builder
        .get_resume(resume_id)
        .await
        .map_err(|e| user_friendly_error("Failed to get resume draft", e))
}

/// Update contact information in a resume draft
#[tauri::command]
pub async fn update_resume_contact(
    resume_id: i64,
    contact: BuilderContactInfo,
    state: State<'_, AppState>,
) -> Result<(), String> {
    tracing::info!("Command: update_resume_contact (id: {})", resume_id);

    let builder = ResumeBuilder::new(state.database.pool().clone());
    builder
        .update_contact(resume_id, contact)
        .await
        .map_err(|e| user_friendly_error("Failed to update contact", e))
}

/// Update professional summary in a resume draft
#[tauri::command]
pub async fn update_resume_summary(
    resume_id: i64,
    summary: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    tracing::info!("Command: update_resume_summary (id: {})", resume_id);

    let builder = ResumeBuilder::new(state.database.pool().clone());
    builder
        .update_summary(resume_id, summary)
        .await
        .map_err(|e| user_friendly_error("Failed to update summary", e))
}

/// Add work experience to a resume draft
#[tauri::command]
pub async fn add_resume_experience(
    resume_id: i64,
    experience: BuilderExperience,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    tracing::info!("Command: add_resume_experience (id: {})", resume_id);

    let builder = ResumeBuilder::new(state.database.pool().clone());
    builder
        .add_experience(resume_id, experience)
        .await
        .map_err(|e| user_friendly_error("Failed to add experience", e))
}

/// Delete work experience from a resume draft
#[tauri::command]
pub async fn delete_resume_experience(
    resume_id: i64,
    experience_id: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    tracing::info!(
        "Command: delete_resume_experience (resume: {}, exp: {})",
        resume_id,
        experience_id
    );

    let builder = ResumeBuilder::new(state.database.pool().clone());
    builder
        .delete_experience(resume_id, experience_id)
        .await
        .map_err(|e| user_friendly_error("Failed to delete experience", e))
}

/// Add education to a resume draft
#[tauri::command]
pub async fn add_resume_education(
    resume_id: i64,
    education: BuilderEducation,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    tracing::info!("Command: add_resume_education (id: {})", resume_id);

    let builder = ResumeBuilder::new(state.database.pool().clone());
    builder
        .add_education(resume_id, education)
        .await
        .map_err(|e| user_friendly_error("Failed to add education", e))
}

/// Delete education from a resume draft
#[tauri::command]
pub async fn delete_resume_education(
    resume_id: i64,
    education_id: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    tracing::info!(
        "Command: delete_resume_education (resume: {}, edu: {})",
        resume_id,
        education_id
    );

    let builder = ResumeBuilder::new(state.database.pool().clone());
    builder
        .delete_education(resume_id, education_id)
        .await
        .map_err(|e| user_friendly_error("Failed to delete education", e))
}

/// Set skills for a resume draft (replaces existing)
#[tauri::command]
pub async fn set_resume_skills(
    resume_id: i64,
    skills: Vec<SkillEntry>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    tracing::info!("Command: set_resume_skills (id: {})", resume_id);

    let builder = ResumeBuilder::new(state.database.pool().clone());
    builder
        .set_skills(resume_id, skills)
        .await
        .map_err(|e| user_friendly_error("Failed to set skills", e))
}

/// Delete a resume draft
#[tauri::command]
pub async fn delete_resume_draft(resume_id: i64, state: State<'_, AppState>) -> Result<(), String> {
    tracing::info!("Command: delete_resume_draft (id: {})", resume_id);

    let builder = ResumeBuilder::new(state.database.pool().clone());
    builder
        .delete_resume(resume_id)
        .await
        .map_err(|e| user_friendly_error("Failed to delete resume draft", e))
}
