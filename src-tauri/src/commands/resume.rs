//! Resume matching Tauri commands
//!
//! Commands for resume upload, skill extraction, job-resume matching,
//! resume builder, and ATS analysis.

use crate::commands::errors::user_friendly_error;
use crate::commands::limits::validate_optional_command_limit_i64;
use crate::commands::AppState;
use crate::core::logging::path_label_for_logging;
use crate::core::resume::{
    AtsAnalysisResult, AtsAnalyzer, AtsResumeData, BuilderContactInfo, BuilderEducation,
    BuilderExperience, BuilderResumeData, ExportResumeData, MatchResult, MatchResultWithJob,
    NewSkill, Resume, ResumeBuilder, ResumeExporter, ResumeMatcher, SkillEntry, SkillUpdate,
    Template, TemplateId, TemplateRenderer, UserSkill,
};
use crate::platforms;
use chrono::{DateTime, Utc};
use serde::Serialize;
use std::path::{Path, PathBuf};
use tauri::State;
use tauri_plugin_dialog::DialogExt;
use uuid::Uuid;

const MAX_JSON_RESUME_IMPORT_BYTES: u64 = 5 * 1024 * 1024;
const MAX_SELECTED_RESUME_UPLOAD_BYTES: u64 = 10 * 1024 * 1024;
const MANAGED_RESUME_UPLOAD_DIR: &str = "resume-uploads";
const MAX_RESUME_TEXT_PREVIEW_CHARS: usize = 6_000;
const SUPPORTED_RESUME_UPLOAD_EXTENSIONS: &[&str] = &["pdf", "docx", "txt", "md"];

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

/// Upload and parse a resume
#[tauri::command]
pub async fn upload_resume(
    name: String,
    file_path: String,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    let _ = (name, state);
    reject_renderer_resume_file_path(&file_path)?;
    unreachable!("renderer resume file path rejection always returns an error")
}

/// Select, copy, and parse a local resume without exposing source paths to renderer IPC.
#[tauri::command]
pub async fn select_and_upload_resume(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<Option<i64>, String> {
    let Some(file_path) = app
        .dialog()
        .file()
        .add_filter("Resume", SUPPORTED_RESUME_UPLOAD_EXTENSIONS)
        .blocking_pick_file()
    else {
        return Ok(None);
    };

    let source_path = file_path
        .into_path()
        .map_err(|_| "Could not read the selected resume file.".to_string())?;
    let (name, managed_path) = copy_selected_resume_to_managed_storage(&source_path)?;
    let resume_id = upload_resume_from_managed_path(name, managed_path, state).await?;

    Ok(Some(resume_id))
}

async fn upload_resume_from_managed_path(
    name: String,
    file_path: PathBuf,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    tracing::info!(
        name_chars = name.chars().count(),
        file_path = %path_label_for_logging(&file_path),
        "Command: upload_resume"
    );

    let matcher = ResumeMatcher::new(state.database.pool().clone());
    matcher
        .upload_resume(&name, &file_path.to_string_lossy())
        .await
        .map_err(|e| user_friendly_error("Failed to upload resume", e))
}

/// Import resume from JSON Resume format
#[tauri::command]
pub async fn import_json_resume(
    name: String,
    json_string: String,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    tracing::info!(
        name_chars = name.chars().count(),
        json_chars = json_string.chars().count(),
        "Command: import_json_resume"
    );

    let matcher = ResumeMatcher::new(state.database.pool().clone());
    matcher
        .import_json_resume(name, &json_string)
        .await
        .map_err(|e| user_friendly_error("Failed to import JSON Resume", e))
}

/// Import resume from a JSON Resume file selected by the user.
#[tauri::command]
pub async fn import_json_resume_file(
    name: String,
    file_path: String,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    let _ = (name, state);
    reject_renderer_resume_file_path(&file_path)?;
    unreachable!("renderer resume file path rejection always returns an error")
}

/// Select and import a JSON Resume file without exposing source paths to renderer IPC.
#[tauri::command]
pub async fn select_and_import_json_resume(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<Option<i64>, String> {
    let Some(file_path) = app
        .dialog()
        .file()
        .add_filter("Resume App Export", &["json"])
        .blocking_pick_file()
    else {
        return Ok(None);
    };

    let path = file_path
        .into_path()
        .map_err(|_| "Could not read the selected resume file.".to_string())?;
    let name = selected_resume_name(&path, "Resume");
    let resume_id = import_json_resume_from_selected_path(name, &path, state).await?;

    Ok(Some(resume_id))
}

async fn import_json_resume_from_selected_path(
    name: String,
    path: &Path,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    tracing::info!(
        name_chars = name.chars().count(),
        file_path = %path_label_for_logging(path),
        "Command: import_json_resume_file"
    );

    if !has_json_extension(path) {
        return Err(
            "Choose a structured resume file exported from JobSentinel or another resume tool."
                .to_string(),
        );
    }

    let metadata = tokio::fs::metadata(path).await.map_err(|_| {
        "JobSentinel could not read that resume file. Choose another structured resume file or check that the file is still available.".to_string()
    })?;

    if !metadata.is_file() {
        return Err(
            "Choose a structured resume file exported from JobSentinel or another resume tool."
                .to_string(),
        );
    }

    if metadata.len() > MAX_JSON_RESUME_IMPORT_BYTES {
        return Err(
            "That resume file is too large for import. Choose a smaller structured resume file."
                .to_string(),
        );
    }

    let json_string = tokio::fs::read_to_string(path).await.map_err(|_| {
        "JobSentinel could not read that resume file. Choose another structured resume file or check that the file is still available.".to_string()
    })?;

    tracing::info!(
        name_chars = name.chars().count(),
        json_chars = json_string.chars().count(),
        "Command: import_json_resume_file loaded local file"
    );

    let matcher = ResumeMatcher::new(state.database.pool().clone());
    matcher
        .import_json_resume(name, &json_string)
        .await
        .map_err(|e| user_friendly_error("Failed to import structured resume", e))
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

fn has_json_extension(path: &Path) -> bool {
    path.extension()
        .and_then(|extension| extension.to_str())
        .is_some_and(|extension| extension.eq_ignore_ascii_case("json"))
}

fn supported_resume_extension(path: &Path) -> Option<String> {
    let extension = path.extension()?.to_str()?.to_ascii_lowercase();
    SUPPORTED_RESUME_UPLOAD_EXTENSIONS
        .contains(&extension.as_str())
        .then_some(extension)
}

fn reject_renderer_resume_file_path(_file_path: &str) -> Result<(), String> {
    Err("Choose Resume inside JobSentinel so the app can handle the file privately.".to_string())
}

fn managed_resume_upload_dir() -> PathBuf {
    platforms::get_data_dir().join(MANAGED_RESUME_UPLOAD_DIR)
}

fn selected_resume_name(path: &Path, fallback: &str) -> String {
    path.file_stem()
        .and_then(|value| value.to_str())
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(ToOwned::to_owned)
        .unwrap_or_else(|| fallback.to_string())
}

fn safe_resume_upload_file_name(path: &Path) -> String {
    let raw_stem = selected_resume_name(path, "resume");
    let mut safe_stem = String::new();
    let mut previous_dash = false;

    for ch in raw_stem.chars() {
        let next = if ch.is_ascii_alphanumeric() || ch == '_' || ch == '-' {
            previous_dash = false;
            Some(ch)
        } else if ch.is_ascii_whitespace() || ch == '.' {
            if previous_dash {
                None
            } else {
                previous_dash = true;
                Some('-')
            }
        } else if previous_dash {
            None
        } else {
            previous_dash = true;
            Some('-')
        };

        if let Some(ch) = next {
            safe_stem.push(ch);
        }

        if safe_stem.len() >= 80 {
            break;
        }
    }

    let safe_stem = safe_stem.trim_matches('-');
    let safe_stem = if safe_stem.is_empty() {
        "resume"
    } else {
        safe_stem
    };

    let extension = supported_resume_extension(path).unwrap_or_else(|| "resume".to_string());
    format!("{}--{safe_stem}.{extension}", Uuid::new_v4())
}

fn validate_selected_resume(path: &Path) -> Result<(), String> {
    if supported_resume_extension(path).is_none() {
        return Err("Choose a PDF, DOCX, TXT, or Markdown resume file.".to_string());
    }

    let metadata = std::fs::metadata(path)
        .map_err(|_| "JobSentinel could not read that resume file.".to_string())?;
    if !metadata.is_file() {
        return Err("Choose a resume file, not a folder.".to_string());
    }

    if metadata.len() > MAX_SELECTED_RESUME_UPLOAD_BYTES {
        return Err(
            "That resume file is too large for local review. Choose a file under 10 MB or export a smaller readable PDF, DOCX, TXT, or Markdown resume."
                .to_string(),
        );
    }

    Ok(())
}

fn copy_selected_resume_to_managed_storage(path: &Path) -> Result<(String, PathBuf), String> {
    validate_selected_resume(path)?;
    let name = selected_resume_name(path, "Resume");
    let managed_dir = managed_resume_upload_dir();
    std::fs::create_dir_all(&managed_dir)
        .map_err(|_| "Could not prepare local resume storage.".to_string())?;
    let destination = managed_dir.join(safe_resume_upload_file_name(path));
    std::fs::copy(path, &destination)
        .map_err(|_| "Could not copy the selected resume file.".to_string())?;

    Ok((name, destination))
}

/// Delete a resume
#[tauri::command]
pub async fn delete_resume(resume_id: i64, state: State<'_, AppState>) -> Result<(), String> {
    tracing::info!("Command: delete_resume (id: {})", resume_id);

    let matcher = ResumeMatcher::new(state.database.pool().clone());
    matcher
        .delete_resume(resume_id)
        .await
        .map_err(|e| user_friendly_error("Failed to delete resume", e))
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
            "JobSentinel could not find readable text in the active resume. Add a PDF, DOCX, TXT, or Markdown resume with readable text, or use Import from Resume App."
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

    Ok(AtsAnalyzer::analyze_text_for_job(
        readable_text,
        &skill_names,
        &job_description,
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
