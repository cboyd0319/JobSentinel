//! Resume matching Tauri commands
//!
//! Commands for resume upload, skill extraction, job-resume matching,
//! resume builder, and ATS analysis.

use crate::commands::errors::user_friendly_error;
use crate::commands::limits::validate_optional_command_limit_i64;
use crate::commands::AppState;
use crate::core::resume::{
    AtsAnalysisResult, AtsAnalyzer, AtsResumeData, ExportResumeData, MatchResult,
    MatchResultWithJob, NewSkill, Resume, ResumeExporter, ResumeMatcher, SkillUpdate, Template,
    TemplateId, TemplateRenderer, UserSkill,
};
use chrono::{DateTime, Utc};
use serde::Serialize;
use std::path::Path;
use tauri::State;

#[path = "resume_builder_commands.rs"]
pub mod resume_builder_commands;
pub use resume_builder_commands::{
    add_resume_education, add_resume_experience, create_resume_draft, delete_resume_draft,
    delete_resume_education, delete_resume_experience, get_resume_draft, set_resume_skills,
    update_resume_contact, update_resume_summary,
};

#[path = "resume_file_commands.rs"]
mod resume_file_commands;
use resume_file_commands::read_html_resume_source_for_format_review;
pub use resume_file_commands::{
    delete_resume, import_json_resume, import_json_resume_file, select_and_import_json_resume,
    select_and_upload_resume, upload_resume,
};
#[cfg(test)]
use resume_file_commands::{
    delete_resume_with_file_cleanup, has_json_extension, managed_resume_upload_cleanup_path,
    reject_renderer_resume_file_path, safe_resume_upload_file_name, supported_resume_extension,
    validate_selected_resume, MAX_SELECTED_RESUME_UPLOAD_BYTES,
};

const MAX_RESUME_TEXT_PREVIEW_CHARS: usize = 6_000;

#[derive(Debug, Clone, Serialize)]
pub struct ResumeSummary {
    pub id: i64,
    pub name: String,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub format_label: String,
    pub has_readable_text: bool,
    pub readable_text_chars: usize,
}

impl From<Resume> for ResumeSummary {
    fn from(resume: Resume) -> Self {
        let readable_text_chars = resume
            .parsed_text
            .as_deref()
            .map(str::trim)
            .map(|text| text.chars().count())
            .unwrap_or(0);
        let format_label = resume_format_label(&resume);

        Self {
            id: resume.id,
            name: resume.name,
            is_active: resume.is_active,
            created_at: resume.created_at,
            updated_at: resume.updated_at,
            format_label,
            has_readable_text: readable_text_chars > 0,
            readable_text_chars,
        }
    }
}

fn resume_format_label(resume: &Resume) -> String {
    let extension = Path::new(&resume.file_path)
        .extension()
        .and_then(|extension| extension.to_str())
        .or_else(|| {
            Path::new(&resume.name)
                .extension()
                .and_then(|extension| extension.to_str())
        })
        .unwrap_or("")
        .to_ascii_lowercase();

    match extension.as_str() {
        "pdf" => "PDF",
        "docx" => "DOCX",
        "txt" => "Plain text",
        "md" | "markdown" => "Markdown",
        "html" | "htm" => "HTML",
        _ => "Resume file",
    }
    .to_string()
}

#[derive(Debug, Clone, Serialize)]
pub struct ResumeTextPreview {
    pub resume_id: i64,
    pub name: String,
    pub has_text: bool,
    pub text_preview: String,
    pub text_chars: usize,
    pub is_truncated: bool,
}

impl From<Resume> for ResumeTextPreview {
    fn from(resume: Resume) -> Self {
        let text = resume.parsed_text.unwrap_or_default();
        let readable_text = text.trim();
        let text_chars = readable_text.chars().count();
        let text_preview = readable_text
            .chars()
            .take(MAX_RESUME_TEXT_PREVIEW_CHARS)
            .collect::<String>();

        Self {
            resume_id: resume.id,
            name: resume.name,
            has_text: !readable_text.is_empty(),
            is_truncated: text_chars > text_preview.chars().count(),
            text_preview,
            text_chars,
        }
    }
}

/// Get active resume
#[tauri::command]
pub async fn get_active_resume(
    state: State<'_, AppState>,
) -> Result<Option<ResumeSummary>, String> {
    tracing::info!("Command: get_active_resume");

    let matcher = ResumeMatcher::new(state.database.pool().clone());
    matcher
        .get_active_resume()
        .await
        .map(|resume| resume.map(ResumeSummary::from))
        .map_err(|e| user_friendly_error("Failed to get resume", e))
}

/// Get an explicit local preview of readable resume text without file paths.
#[tauri::command]
pub async fn get_resume_text_preview(
    resume_id: i64,
    state: State<'_, AppState>,
) -> Result<ResumeTextPreview, String> {
    tracing::info!(resume_id, "Command: get_resume_text_preview");

    let matcher = ResumeMatcher::new(state.database.pool().clone());
    matcher
        .get_resume(resume_id)
        .await
        .map(ResumeTextPreview::from)
        .map_err(|e| user_friendly_error("Failed to get resume text preview", e))
}

/// Set active resume
#[tauri::command]
pub async fn set_active_resume(resume_id: i64, state: State<'_, AppState>) -> Result<(), String> {
    tracing::info!("Command: set_active_resume (id: {})", resume_id);

    let matcher = ResumeMatcher::new(state.database.pool().clone());
    matcher
        .set_active_resume(resume_id)
        .await
        .map_err(|e| user_friendly_error("Failed to set active resume", e))
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
        .map_err(|e| user_friendly_error("Failed to get skills", e))
}

/// Match resume to a job
#[tauri::command]
pub async fn match_resume_to_job(
    resume_id: i64,
    job_hash: String,
    state: State<'_, AppState>,
) -> Result<MatchResult, String> {
    let job_hash_chars = job_hash.chars().count();
    tracing::info!(resume_id, job_hash_chars, "Command: match_resume_to_job");

    let matcher = ResumeMatcher::new(state.database.pool().clone());
    matcher
        .match_resume_to_job(resume_id, &job_hash)
        .await
        .map_err(|e| user_friendly_error("Failed to match resume", e))
}

/// Get existing match result
#[tauri::command]
pub async fn get_match_result(
    resume_id: i64,
    job_hash: String,
    state: State<'_, AppState>,
) -> Result<Option<MatchResult>, String> {
    let job_hash_chars = job_hash.chars().count();
    tracing::info!(resume_id, job_hash_chars, "Command: get_match_result");

    let matcher = ResumeMatcher::new(state.database.pool().clone());
    matcher
        .get_match_result(resume_id, &job_hash)
        .await
        .map_err(|e| user_friendly_error("Failed to get match result", e))
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

    let limit = validate_optional_command_limit_i64(limit, 10)?;
    let matcher = ResumeMatcher::new(state.database.pool().clone());
    matcher
        .get_recent_matches(resume_id, limit)
        .await
        .map_err(|e| user_friendly_error("Failed to get recent matches", e))
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
        .map_err(|e| user_friendly_error("Failed to update skill", e))
}

/// Delete a user skill
#[tauri::command]
pub async fn delete_user_skill(skill_id: i64, state: State<'_, AppState>) -> Result<(), String> {
    tracing::info!("Command: delete_user_skill (id: {})", skill_id);

    let matcher = ResumeMatcher::new(state.database.pool().clone());
    matcher
        .delete_user_skill(skill_id)
        .await
        .map_err(|e| user_friendly_error("Failed to delete skill", e))
}

/// Add a new skill manually
#[tauri::command]
pub async fn add_user_skill(
    resume_id: i64,
    skill: NewSkill,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    let skill_name_chars = skill.skill_name.chars().count();
    tracing::info!(resume_id, skill_name_chars, "Command: add_user_skill");

    let matcher = ResumeMatcher::new(state.database.pool().clone());
    matcher
        .add_user_skill(resume_id, skill)
        .await
        .map_err(|e| user_friendly_error("Failed to add skill", e))
}

// ============================================================================
// Resume Library Commands (Phase 2)
// ============================================================================

/// List all resumes
#[tauri::command]
pub async fn list_all_resumes(state: State<'_, AppState>) -> Result<Vec<ResumeSummary>, String> {
    tracing::info!("Command: list_all_resumes");

    let matcher = ResumeMatcher::new(state.database.pool().clone());
    matcher
        .list_all_resumes()
        .await
        .map(|resumes| resumes.into_iter().map(ResumeSummary::from).collect())
        .map_err(|e| user_friendly_error("Failed to list resumes", e))
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
    ResumeExporter::export_docx(&resume, template)
        .map_err(|e| user_friendly_error("Failed to export resume", e))
}

/// Export resume to HTML format for browser-based PDF generation
#[tauri::command]
pub fn export_resume_html(
    resume: ExportResumeData,
    template: crate::core::resume::ExportTemplateId,
) -> String {
    tracing::info!("Command: export_resume_html (template: {:?})", template);
    ResumeExporter::export_html(resume, template)
}

/// Export resume to plain text
#[tauri::command]
pub fn export_resume_text(resume: ExportResumeData) -> String {
    tracing::info!("Command: export_resume_text");
    ResumeExporter::export_text(&resume)
}

// ============================================================================
// Resume Analysis Commands
// ============================================================================

/// Analyze resume against a job description for application readability
#[tauri::command]
pub fn analyze_resume_for_job(resume: AtsResumeData, job_description: String) -> AtsAnalysisResult {
    tracing::info!("Command: analyze_resume_for_job");
    AtsAnalyzer::analyze_for_job(&resume, &job_description)
}

/// Analyze the active saved resume against a job description without returning raw resume text.
#[tauri::command]
pub async fn analyze_active_resume_for_job(
    job_description: String,
    state: State<'_, AppState>,
) -> Result<AtsAnalysisResult, String> {
    tracing::info!("Command: analyze_active_resume_for_job");

    if job_description.trim().is_empty() {
        return Err("Paste the job post, then review again.".to_string());
    }

    let matcher = ResumeMatcher::new(state.database.pool().clone());
    let resume = matcher
        .get_active_resume()
        .await
        .map_err(|e| user_friendly_error("Failed to get active resume", e))?
        .ok_or_else(|| "Choose or add a resume before reviewing job fit.".to_string())?;

    let readable_text = resume.parsed_text.as_deref().unwrap_or("").trim();
    if readable_text.is_empty() {
        return Err(
            "JobSentinel could not find readable text in the active resume. Add a PDF, DOCX, TXT, Markdown, or HTML resume with readable text, or use Import from Resume App."
                .to_string(),
        );
    }

    let skill_names = matcher
        .get_user_skills(resume.id)
        .await
        .map_err(|e| user_friendly_error("Failed to get resume skills", e))?
        .into_iter()
        .map(|skill| skill.skill_name)
        .collect::<Vec<_>>();

    let source_text = read_html_resume_source_for_format_review(&resume.file_path);

    Ok(AtsAnalyzer::analyze_text_for_job_with_source(
        readable_text,
        &skill_names,
        &job_description,
        source_text.as_deref(),
    ))
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

#[cfg(test)]
mod tests;
