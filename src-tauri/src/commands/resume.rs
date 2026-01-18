//! Resume matching Tauri commands
//!
//! Commands for resume upload, skill extraction, job-resume matching,
//! resume builder, and ATS analysis.

use crate::commands::AppState;
use crate::core::resume::{
    AtsAnalysisResult, AtsAnalyzer, AtsResumeData, BuilderContactInfo, BuilderEducation,
    BuilderExperience, BuilderResumeData, ExportResumeData, MatchResult, MatchResultWithJob,
    NewSkill, Resume, ResumeBuilder, ResumeExporter, ResumeMatcher, SkillEntry, SkillUpdate,
    Template, TemplateId, TemplateRenderer, UserSkill,
};
use tauri::State;

/// Upload and parse a resume
#[tauri::command]
pub async fn upload_resume(
    name: String,
    file_path: String,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    tracing::info!(
        "Command: upload_resume (name: {}, path: {})",
        name,
        file_path
    );

    let matcher = ResumeMatcher::new(state.database.pool().clone());
    matcher
        .upload_resume(&name, &file_path)
        .await
        .map_err(|e| format!("Failed to upload resume: {}", e))
}

/// Get active resume
#[tauri::command]
pub async fn get_active_resume(state: State<'_, AppState>) -> Result<Option<Resume>, String> {
    tracing::info!("Command: get_active_resume");

    let matcher = ResumeMatcher::new(state.database.pool().clone());
    matcher
        .get_active_resume()
        .await
        .map_err(|e| format!("Failed to get resume: {}", e))
}

/// Set active resume
#[tauri::command]
pub async fn set_active_resume(resume_id: i64, state: State<'_, AppState>) -> Result<(), String> {
    tracing::info!("Command: set_active_resume (id: {})", resume_id);

    let matcher = ResumeMatcher::new(state.database.pool().clone());
    matcher
        .set_active_resume(resume_id)
        .await
        .map_err(|e| format!("Failed to set active resume: {}", e))
}

/// Get user skills from active resume
#[tauri::command]
pub async fn get_user_skills(
    resume_id: i64,
    state: State<'_, AppState>,
) -> Result<Vec<UserSkill>, String> {
    tracing::info!("Command: get_user_skills (resume_id: {})", resume_id);

    let matcher = ResumeMatcher::new(state.database.pool().clone());
    matcher
        .get_user_skills(resume_id)
        .await
        .map_err(|e| format!("Failed to get skills: {}", e))
}

/// Match resume to a job
#[tauri::command]
pub async fn match_resume_to_job(
    resume_id: i64,
    job_hash: String,
    state: State<'_, AppState>,
) -> Result<MatchResult, String> {
    tracing::info!(
        "Command: match_resume_to_job (resume: {}, job: {})",
        resume_id,
        job_hash
    );

    let matcher = ResumeMatcher::new(state.database.pool().clone());
    matcher
        .match_resume_to_job(resume_id, &job_hash)
        .await
        .map_err(|e| format!("Failed to match resume: {}", e))
}

/// Get existing match result
#[tauri::command]
pub async fn get_match_result(
    resume_id: i64,
    job_hash: String,
    state: State<'_, AppState>,
) -> Result<Option<MatchResult>, String> {
    tracing::info!(
        "Command: get_match_result (resume: {}, job: {})",
        resume_id,
        job_hash
    );

    let matcher = ResumeMatcher::new(state.database.pool().clone());
    matcher
        .get_match_result(resume_id, &job_hash)
        .await
        .map_err(|e| format!("Failed to get match result: {}", e))
}

/// Get recent match results for a resume
#[tauri::command]
pub async fn get_recent_matches(
    resume_id: i64,
    limit: Option<i64>,
    state: State<'_, AppState>,
) -> Result<Vec<MatchResultWithJob>, String> {
    tracing::info!(
        "Command: get_recent_matches (resume: {}, limit: {:?})",
        resume_id,
        limit
    );

    let matcher = ResumeMatcher::new(state.database.pool().clone());
    matcher
        .get_recent_matches(resume_id, limit.unwrap_or(10))
        .await
        .map_err(|e| format!("Failed to get recent matches: {}", e))
}

// ============================================================================
// Skill Management Commands (Phase 1: Skill Validation UI)
// ============================================================================

/// Update an existing user skill
#[tauri::command]
pub async fn update_user_skill(
    skill_id: i64,
    updates: SkillUpdate,
    state: State<'_, AppState>,
) -> Result<(), String> {
    tracing::info!("Command: update_user_skill (id: {})", skill_id);

    let matcher = ResumeMatcher::new(state.database.pool().clone());
    matcher
        .update_user_skill(skill_id, updates)
        .await
        .map_err(|e| format!("Failed to update skill: {}", e))
}

/// Delete a user skill
#[tauri::command]
pub async fn delete_user_skill(skill_id: i64, state: State<'_, AppState>) -> Result<(), String> {
    tracing::info!("Command: delete_user_skill (id: {})", skill_id);

    let matcher = ResumeMatcher::new(state.database.pool().clone());
    matcher
        .delete_user_skill(skill_id)
        .await
        .map_err(|e| format!("Failed to delete skill: {}", e))
}

/// Add a new skill manually
#[tauri::command]
pub async fn add_user_skill(
    resume_id: i64,
    skill: NewSkill,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    tracing::info!(
        "Command: add_user_skill (resume: {}, skill: {})",
        resume_id,
        skill.skill_name
    );

    let matcher = ResumeMatcher::new(state.database.pool().clone());
    matcher
        .add_user_skill(resume_id, skill)
        .await
        .map_err(|e| format!("Failed to add skill: {}", e))
}

// ============================================================================
// Resume Library Commands (Phase 2)
// ============================================================================

/// List all resumes
#[tauri::command]
pub async fn list_all_resumes(state: State<'_, AppState>) -> Result<Vec<Resume>, String> {
    tracing::info!("Command: list_all_resumes");

    let matcher = ResumeMatcher::new(state.database.pool().clone());
    matcher
        .list_all_resumes()
        .await
        .map_err(|e| format!("Failed to list resumes: {}", e))
}

/// Delete a resume
#[tauri::command]
pub async fn delete_resume(resume_id: i64, state: State<'_, AppState>) -> Result<(), String> {
    tracing::info!("Command: delete_resume (id: {})", resume_id);

    let matcher = ResumeMatcher::new(state.database.pool().clone());
    matcher
        .delete_resume(resume_id)
        .await
        .map_err(|e| format!("Failed to delete resume: {}", e))
}

// ============================================================================
// Resume Builder Commands
// ============================================================================

/// Create a new empty resume draft
#[tauri::command]
pub async fn create_resume_draft(state: State<'_, AppState>) -> Result<i64, String> {
    tracing::info!("Command: create_resume_draft");

    let builder = ResumeBuilder::new(state.database.pool().clone());
    builder
        .create_resume()
        .await
        .map_err(|e| format!("Failed to create resume draft: {}", e))
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
        .map_err(|e| format!("Failed to get resume draft: {}", e))
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
        .map_err(|e| format!("Failed to update contact: {}", e))
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
        .map_err(|e| format!("Failed to update summary: {}", e))
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
        .map_err(|e| format!("Failed to add experience: {}", e))
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
        .map_err(|e| format!("Failed to delete experience: {}", e))
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
        .map_err(|e| format!("Failed to add education: {}", e))
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
        .map_err(|e| format!("Failed to delete education: {}", e))
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
        .map_err(|e| format!("Failed to set skills: {}", e))
}

/// Delete a resume draft
#[tauri::command]
pub async fn delete_resume_draft(resume_id: i64, state: State<'_, AppState>) -> Result<(), String> {
    tracing::info!("Command: delete_resume_draft (id: {})", resume_id);

    let builder = ResumeBuilder::new(state.database.pool().clone());
    builder
        .delete_resume(resume_id)
        .await
        .map_err(|e| format!("Failed to delete resume draft: {}", e))
}

// ============================================================================
// Template Commands
// ============================================================================

/// List available resume templates
#[tauri::command]
pub fn list_resume_templates() -> Vec<Template> {
    tracing::info!("Command: list_resume_templates");
    TemplateRenderer::list_templates()
}

/// Render resume to HTML using a template
#[tauri::command]
pub fn render_resume_html(
    resume: crate::core::resume::ResumeData,
    template_id: TemplateId,
) -> String {
    tracing::info!("Command: render_resume_html (template: {:?})", template_id);
    TemplateRenderer::render_html(&resume, template_id)
}

/// Render resume to plain text
#[tauri::command]
pub fn render_resume_text(resume: crate::core::resume::ResumeData) -> String {
    tracing::info!("Command: render_resume_text");
    TemplateRenderer::render_plain_text(&resume)
}

// ============================================================================
// Export Commands
// ============================================================================

/// Export resume to DOCX format
#[tauri::command]
pub fn export_resume_docx(
    resume: ExportResumeData,
    template: crate::core::resume::ExportTemplateId,
) -> Result<Vec<u8>, String> {
    tracing::info!("Command: export_resume_docx");
    ResumeExporter::export_docx(&resume, template).map_err(|e| format!("Export failed: {}", e))
}

/// Export resume to HTML format for browser-based PDF generation
#[tauri::command]
pub fn export_resume_html(
    resume: ExportResumeData,
    template: crate::core::resume::ExportTemplateId,
) -> String {
    tracing::info!("Command: export_resume_html (template: {:?})", template);
    ResumeExporter::export_html(&resume, template)
}

/// Export resume to plain text
#[tauri::command]
pub fn export_resume_text(resume: ExportResumeData) -> String {
    tracing::info!("Command: export_resume_text");
    ResumeExporter::export_text(&resume)
}

// ============================================================================
// ATS Analysis Commands
// ============================================================================

/// Analyze resume against a job description for ATS compatibility
#[tauri::command]
pub fn analyze_resume_for_job(resume: AtsResumeData, job_description: String) -> AtsAnalysisResult {
    tracing::info!("Command: analyze_resume_for_job");
    AtsAnalyzer::analyze_for_job(&resume, &job_description)
}

/// Analyze resume format without job context
#[tauri::command]
pub fn analyze_resume_format(resume: AtsResumeData) -> AtsAnalysisResult {
    tracing::info!("Command: analyze_resume_format");
    AtsAnalyzer::analyze_format(&resume)
}

/// Extract keywords from a job description
#[tauri::command]
pub fn extract_job_keywords(
    job_description: String,
) -> Vec<(String, crate::core::resume::KeywordImportance)> {
    tracing::info!("Command: extract_job_keywords");
    AtsAnalyzer::extract_job_keywords(&job_description)
}

/// Get ATS power words for bullet points
#[tauri::command]
pub fn get_ats_power_words() -> Vec<&'static str> {
    tracing::info!("Command: get_ats_power_words");
    AtsAnalyzer::get_power_words()
}

/// Improve a bullet point with ATS suggestions
#[tauri::command]
pub fn improve_bullet_point(bullet: String, job_context: Option<String>) -> String {
    tracing::info!("Command: improve_bullet_point");
    AtsAnalyzer::improve_bullet(&bullet, job_context.as_deref())
}
