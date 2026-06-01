//! Application Automation Tauri Commands
//!
//! Commands for Application Assist with user-controlled submit.
//!
//! **Features:**
//! - Profile management (contact info, work authorization)
//! - Screening answer configuration
//! - Automation attempt tracking
//! - ATS platform detection

use crate::commands::errors::user_friendly_error;
use crate::commands::limits::validate_optional_command_limit_usize;
use crate::commands::AppState;
use crate::core::automation::{
    ats_detector::AtsDetector,
    profile::{ApplicationProfileInput, ProfileManager, ScreeningAnswer},
    ApplicationAttempt, ApplicationProfile, AtsPlatform, AutomationManager, AutomationStats,
    AutomationStatus,
};
use crate::core::url_security::{sanitize_url_for_logging, validate_external_http_url};
use crate::platforms;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tauri::State;
use tauri_plugin_dialog::DialogExt;
use uuid::Uuid;

const APPLICATION_RESUME_DIR: &str = "application-resumes";
const ALLOWED_APPLICATION_RESUME_EXTENSIONS: &[&str] = &["pdf", "docx", "doc"];

fn resume_file_display_name(path: &str) -> Option<String> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return None;
    }

    let name = trimmed
        .rsplit(['/', '\\'])
        .next()
        .map(str::trim)
        .filter(|name| !name.is_empty())?;

    if let Some((token_prefix, display_name)) = name.split_once("--") {
        if Uuid::parse_str(token_prefix).is_ok() && !display_name.trim().is_empty() {
            return Some(display_name.to_string());
        }
    }

    Some(name.to_string())
}

fn resume_reselect_error() -> String {
    "Choose the resume file again before using Application Assist.".to_string()
}

fn application_resume_dir() -> PathBuf {
    platforms::get_data_dir().join(APPLICATION_RESUME_DIR)
}

fn allowed_application_resume_extension(path: &Path) -> Result<&'static str, String> {
    let extension = path
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_ascii_lowercase())
        .ok_or_else(|| "Choose a PDF, DOCX, or DOC resume file.".to_string())?;

    ALLOWED_APPLICATION_RESUME_EXTENSIONS
        .iter()
        .copied()
        .find(|allowed| *allowed == extension)
        .ok_or_else(|| "Choose a PDF, DOCX, or DOC resume file.".to_string())
}

fn safe_resume_file_name(path: &Path, extension: &str) -> String {
    let raw_stem = path
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("resume");
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

    format!("{safe_stem}.{extension}")
}

fn validate_application_resume_token(token: &str) -> Result<&str, String> {
    let trimmed = token.trim();
    if trimmed.is_empty() || trimmed != token {
        return Err(resume_reselect_error());
    }

    if trimmed.contains(['/', '\\', ':']) || trimmed.contains("..") {
        return Err(resume_reselect_error());
    }

    let Some((uuid_part, display_name)) = trimmed.split_once("--") else {
        return Err(resume_reselect_error());
    };

    Uuid::parse_str(uuid_part).map_err(|_| resume_reselect_error())?;

    if display_name.is_empty()
        || display_name.len() > 120
        || display_name.starts_with('.')
        || display_name.ends_with('.')
    {
        return Err(resume_reselect_error());
    }

    allowed_application_resume_extension(Path::new(display_name))?;

    Ok(trimmed)
}

fn resolve_application_resume_path(managed_dir: &Path, token: &str) -> Result<PathBuf, String> {
    let token = validate_application_resume_token(token)?;
    Ok(managed_dir.join(token))
}

fn prepare_application_profile_resume_input(
    mut input: ApplicationProfileInput,
    managed_dir: &Path,
) -> Result<ApplicationProfileInput, String> {
    if input.clear_resume_file.unwrap_or(false) {
        input.resume_file_path = None;
        input.resume_file_token = None;
        return Ok(input);
    }

    if input
        .resume_file_path
        .as_deref()
        .is_some_and(|path| !path.trim().is_empty())
    {
        return Err("Choose the resume file with Browse before saving.".to_string());
    }
    input.resume_file_path = None;

    if let Some(token) = input
        .resume_file_token
        .as_deref()
        .map(str::trim)
        .filter(|token| !token.is_empty())
    {
        let managed_path = resolve_application_resume_path(managed_dir, token)?;
        if !managed_path.is_file() {
            return Err(resume_reselect_error());
        }
        input.resume_file_path = Some(managed_path.to_string_lossy().to_string());
    }
    input.resume_file_token = None;

    Ok(input)
}

fn trusted_application_resume_path(
    stored_path: Option<&str>,
    managed_dir: &Path,
) -> Result<Option<PathBuf>, String> {
    let Some(stored_path) = stored_path.map(str::trim).filter(|path| !path.is_empty()) else {
        return Ok(None);
    };

    let stored_path = PathBuf::from(stored_path);
    let file_name = stored_path
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(resume_reselect_error)?;
    let expected_path = resolve_application_resume_path(managed_dir, file_name)?;

    let canonical_dir = managed_dir
        .canonicalize()
        .map_err(|_| resume_reselect_error())?;
    let canonical_stored = stored_path
        .canonicalize()
        .map_err(|_| resume_reselect_error())?;
    let canonical_expected = expected_path
        .canonicalize()
        .map_err(|_| resume_reselect_error())?;

    if canonical_stored != canonical_expected || !canonical_stored.starts_with(canonical_dir) {
        return Err(resume_reselect_error());
    }

    Ok(Some(canonical_stored))
}

fn copy_selected_resume_to_managed_storage(
    source_path: &Path,
) -> Result<ApplicationResumeFileSelection, String> {
    let extension = allowed_application_resume_extension(source_path)?;
    let metadata = std::fs::metadata(source_path)
        .map_err(|_| "Could not read the selected resume file.".to_string())?;
    if !metadata.is_file() {
        return Err("Choose a resume file, not a folder.".to_string());
    }

    let display_name = safe_resume_file_name(source_path, extension);
    let token = format!("{}--{}", Uuid::new_v4(), display_name);
    let managed_dir = application_resume_dir();
    std::fs::create_dir_all(&managed_dir)
        .map_err(|_| "Could not prepare local resume storage.".to_string())?;
    let destination = resolve_application_resume_path(&managed_dir, &token)?;
    std::fs::copy(source_path, &destination)
        .map_err(|_| "Could not copy the selected resume file.".to_string())?;

    Ok(ApplicationResumeFileSelection {
        token,
        file_name: display_name,
    })
}

// ============================================================================
// Profile Management Commands
// ============================================================================

/// Backend-owned resume selection result. Renderer receives only display data
/// and an opaque app-owned token, never the user's source file path.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplicationResumeFileSelection {
    pub token: String,
    pub file_name: String,
}

/// Select a resume with the native file picker and copy it into app-owned storage.
#[tauri::command]
pub async fn select_application_resume_file(
    app: tauri::AppHandle,
) -> Result<Option<ApplicationResumeFileSelection>, String> {
    let Some(file_path) = app
        .dialog()
        .file()
        .add_filter("Resume", ALLOWED_APPLICATION_RESUME_EXTENSIONS)
        .blocking_pick_file()
    else {
        return Ok(None);
    };

    let source_path = file_path
        .into_path()
        .map_err(|_| "Could not read the selected resume file.".to_string())?;

    copy_selected_resume_to_managed_storage(&source_path).map(Some)
}

/// Upsert (create or update) the application profile
#[tauri::command]
pub async fn upsert_application_profile(
    input: ApplicationProfileInput,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    tracing::info!("Command: upsert_application_profile");

    let input = prepare_application_profile_resume_input(input, &application_resume_dir())?;
    let manager = ProfileManager::new(state.database.pool().clone());
    manager
        .upsert_profile(&input)
        .await
        .map_err(|e| user_friendly_error("Failed to save profile", e))
}

/// Get the current application profile
#[tauri::command]
pub async fn get_application_profile(
    state: State<'_, AppState>,
) -> Result<Option<ApplicationProfileResponse>, String> {
    tracing::info!("Command: get_application_profile");

    let manager = ProfileManager::new(state.database.pool().clone());
    match manager.get_profile().await {
        Ok(Some(profile)) => Ok(Some(ApplicationProfileResponse::from(profile))),
        Ok(None) => Ok(None),
        Err(e) => Err(user_friendly_error("Failed to get profile", e)),
    }
}

/// Check whether an application profile exists without returning profile data
#[tauri::command]
pub async fn has_application_profile(state: State<'_, AppState>) -> Result<bool, String> {
    tracing::info!("Command: has_application_profile");

    let manager = ProfileManager::new(state.database.pool().clone());
    manager
        .has_profile()
        .await
        .map_err(|e| user_friendly_error("Failed to check profile", e))
}

/// Get only the profile fields needed for a user-facing application preview
#[tauri::command]
pub async fn get_application_profile_preview(
    state: State<'_, AppState>,
) -> Result<Option<ApplicationProfilePreviewResponse>, String> {
    tracing::info!("Command: get_application_profile_preview");

    let manager = ProfileManager::new(state.database.pool().clone());
    match manager.get_profile().await {
        Ok(Some(profile)) => Ok(Some(ApplicationProfilePreviewResponse::from(profile))),
        Ok(None) => Ok(None),
        Err(e) => Err(user_friendly_error("Failed to get profile preview", e)),
    }
}

/// Response type for application profile (frontend-friendly)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplicationProfileResponse {
    pub id: i64,
    pub full_name: String,
    pub email: String,
    pub phone: Option<String>,
    pub linkedin_url: Option<String>,
    pub github_url: Option<String>,
    pub portfolio_url: Option<String>,
    pub website_url: Option<String>,
    pub default_resume_id: Option<i64>,
    pub has_resume_file: bool,
    pub resume_file_name: Option<String>,
    pub default_cover_letter_template: Option<String>,
    pub us_work_authorized: bool,
    pub requires_sponsorship: bool,
    pub max_applications_per_day: i32,
    pub require_manual_approval: bool,
    pub created_at: String,
    pub updated_at: String,
}

impl From<ApplicationProfile> for ApplicationProfileResponse {
    fn from(p: ApplicationProfile) -> Self {
        Self {
            id: p.id,
            full_name: p.full_name,
            email: p.email,
            phone: p.phone,
            linkedin_url: p.linkedin_url,
            github_url: p.github_url,
            portfolio_url: p.portfolio_url,
            website_url: p.website_url,
            default_resume_id: p.default_resume_id,
            has_resume_file: p
                .resume_file_path
                .as_deref()
                .is_some_and(|path| !path.trim().is_empty()),
            resume_file_name: p
                .resume_file_path
                .as_deref()
                .and_then(resume_file_display_name),
            default_cover_letter_template: p.default_cover_letter_template,
            us_work_authorized: p.us_work_authorized,
            requires_sponsorship: p.requires_sponsorship,
            max_applications_per_day: p.max_applications_per_day,
            require_manual_approval: p.require_manual_approval,
            created_at: p.created_at.to_rfc3339(),
            updated_at: p.updated_at.to_rfc3339(),
        }
    }
}

/// Minimal profile preview response for non-settings UI surfaces.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplicationProfilePreviewResponse {
    pub full_name: String,
    pub email: String,
    pub phone: Option<String>,
    pub linkedin_url: Option<String>,
    pub github_url: Option<String>,
    pub portfolio_url: Option<String>,
    pub website_url: Option<String>,
    pub us_work_authorized: bool,
    pub requires_sponsorship: bool,
}

impl From<ApplicationProfile> for ApplicationProfilePreviewResponse {
    fn from(p: ApplicationProfile) -> Self {
        Self {
            full_name: p.full_name,
            email: p.email,
            phone: p.phone,
            linkedin_url: p.linkedin_url,
            github_url: p.github_url,
            portfolio_url: p.portfolio_url,
            website_url: p.website_url,
            us_work_authorized: p.us_work_authorized,
            requires_sponsorship: p.requires_sponsorship,
        }
    }
}

// ============================================================================
// Screening Answer Commands
// ============================================================================

/// Add or update a screening answer pattern
#[tauri::command]
pub async fn upsert_screening_answer(
    question_pattern: String,
    answer: String,
    answer_type: String,
    notes: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    tracing::info!(
        question_pattern_chars = question_pattern.chars().count(),
        answer_type,
        has_notes = notes.is_some(),
        "Command: upsert_screening_answer"
    );

    let manager = ProfileManager::new(state.database.pool().clone());
    manager
        .upsert_screening_answer(&question_pattern, &answer, &answer_type, notes.as_deref())
        .await
        .map_err(|e| user_friendly_error("Failed to save screening answer", e))
}

/// Get all screening answers
#[tauri::command]
pub async fn get_screening_answers(
    state: State<'_, AppState>,
) -> Result<Vec<ScreeningAnswerResponse>, String> {
    tracing::info!("Command: get_screening_answers");

    let manager = ProfileManager::new(state.database.pool().clone());
    match manager.get_screening_answers().await {
        Ok(answers) => Ok(answers
            .into_iter()
            .map(ScreeningAnswerResponse::from)
            .collect()),
        Err(e) => Err(user_friendly_error("Failed to get screening answers", e)),
    }
}

/// Response type for screening answers (frontend-friendly)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScreeningAnswerResponse {
    pub id: i64,
    pub question_pattern: String,
    pub answer: String,
    pub answer_type: Option<String>,
    pub notes: Option<String>,
    pub times_used: i32,
    pub times_modified: i32,
    pub confidence_score: f64,
    pub last_used_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl From<ScreeningAnswer> for ScreeningAnswerResponse {
    fn from(a: ScreeningAnswer) -> Self {
        Self {
            id: a.id,
            question_pattern: a.question_pattern,
            answer: a.answer,
            answer_type: a.answer_type,
            notes: a.notes,
            times_used: a.times_used,
            times_modified: a.times_modified,
            confidence_score: a.confidence_score,
            last_used_at: a.last_used_at.map(|dt| dt.to_rfc3339()),
            created_at: a.created_at.to_rfc3339(),
            updated_at: a.updated_at.to_rfc3339(),
        }
    }
}

/// Find the best answer for a specific question
#[tauri::command]
pub async fn find_answer_for_question(
    question: String,
    state: State<'_, AppState>,
) -> Result<Option<String>, String> {
    tracing::info!(
        question_chars = question.chars().count(),
        "Command: find_answer_for_question"
    );

    let manager = ProfileManager::new(state.database.pool().clone());
    manager
        .find_answer_for_question(&question)
        .await
        .map_err(|e| user_friendly_error("Failed to find answer", e))
}

// ============================================================================
// Automation Attempt Commands
// ============================================================================

/// Create a new automation attempt for a job
#[tauri::command]
pub async fn create_automation_attempt(
    job_hash: String,
    ats_platform: String,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    let platform = AtsPlatform::from_str(&ats_platform);

    tracing::info!(
        job_hash_chars = job_hash.chars().count(),
        ats_platform = platform.as_str(),
        "Command: create_automation_attempt"
    );

    let manager = AutomationManager::new(state.database.pool().clone());

    manager
        .create_attempt(&job_hash, platform)
        .await
        .map_err(|e| user_friendly_error("Failed to create automation attempt", e))
}

/// Get an automation attempt by ID
#[tauri::command]
pub async fn get_automation_attempt(
    attempt_id: i64,
    state: State<'_, AppState>,
) -> Result<AttemptResponse, String> {
    tracing::info!("Command: get_automation_attempt (id: {})", attempt_id);

    let manager = AutomationManager::new(state.database.pool().clone());
    match manager.get_attempt(attempt_id).await {
        Ok(attempt) => Ok(AttemptResponse::from(attempt)),
        Err(e) => Err(user_friendly_error("Failed to get attempt", e)),
    }
}

/// Response type for automation attempts (frontend-friendly)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AttemptResponse {
    pub id: i64,
    pub job_hash: String,
    pub application_id: Option<i64>,
    pub status: String,
    pub ats_platform: String,
    pub error_message: Option<String>,
    pub screenshot_path: Option<String>,
    pub confirmation_screenshot_path: Option<String>,
    pub automation_duration_ms: Option<i64>,
    pub user_approved: bool,
    pub submitted_at: Option<String>,
    pub created_at: String,
}

impl From<ApplicationAttempt> for AttemptResponse {
    fn from(a: ApplicationAttempt) -> Self {
        Self {
            id: a.id,
            job_hash: a.job_hash,
            application_id: a.application_id,
            status: a.status.as_str().to_string(),
            ats_platform: a.ats_platform.as_str().to_string(),
            error_message: a.error_message,
            screenshot_path: a.screenshot_path,
            confirmation_screenshot_path: a.confirmation_screenshot_path,
            automation_duration_ms: a.automation_duration_ms,
            user_approved: a.user_approved,
            submitted_at: a.submitted_at.map(|dt| dt.to_rfc3339()),
            created_at: a.created_at.to_rfc3339(),
        }
    }
}

/// Approve an automation attempt (user reviewed and approved)
#[tauri::command]
pub async fn approve_automation_attempt(
    attempt_id: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    tracing::info!("Command: approve_automation_attempt (id: {})", attempt_id);

    let manager = AutomationManager::new(state.database.pool().clone());
    manager
        .approve_attempt(attempt_id)
        .await
        .map_err(|e| user_friendly_error("Failed to approve attempt", e))
}

/// Cancel an automation attempt
#[tauri::command]
pub async fn cancel_automation_attempt(
    attempt_id: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    tracing::info!("Command: cancel_automation_attempt (id: {})", attempt_id);

    let manager = AutomationManager::new(state.database.pool().clone());
    manager
        .update_status(
            attempt_id,
            crate::core::automation::AutomationStatus::Cancelled,
            Some("Cancelled by user"),
        )
        .await
        .map_err(|e| user_friendly_error("Failed to cancel attempt", e))
}

/// Get pending automation attempts (approved and ready to process)
#[tauri::command]
pub async fn get_pending_attempts(
    limit: Option<usize>,
    state: State<'_, AppState>,
) -> Result<Vec<AttemptResponse>, String> {
    tracing::info!("Command: get_pending_attempts");

    let limit = validate_optional_command_limit_usize(limit, 10)?;
    let manager = AutomationManager::new(state.database.pool().clone());
    match manager.get_pending_attempts(limit).await {
        Ok(attempts) => Ok(attempts.into_iter().map(AttemptResponse::from).collect()),
        Err(e) => Err(user_friendly_error("Failed to get pending attempts", e)),
    }
}

/// Get automation statistics
#[tauri::command]
pub async fn get_automation_stats(state: State<'_, AppState>) -> Result<AutomationStats, String> {
    tracing::info!("Command: get_automation_stats");

    let manager = AutomationManager::new(state.database.pool().clone());
    manager
        .get_stats()
        .await
        .map_err(|e| user_friendly_error("Failed to get automation stats", e))
}

// ============================================================================
// ATS Detection Commands
// ============================================================================

/// Detect ATS platform from a URL
#[tauri::command]
pub async fn detect_ats_platform(url: String) -> Result<AtsDetectionResponse, String> {
    tracing::info!(
        "Command: detect_ats_platform (url: {})",
        sanitize_url_for_logging(&url)
    );

    let platform = AtsDetector::detect_from_url(&url);
    let common_fields = AtsDetector::get_common_fields(&platform)
        .into_iter()
        .map(String::from)
        .collect();
    let notes = AtsDetector::get_automation_notes(&platform);

    Ok(AtsDetectionResponse {
        platform: platform.as_str().to_string(),
        common_fields,
        automation_notes: Some(notes.to_string()),
    })
}

/// ATS detection response
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AtsDetectionResponse {
    pub platform: String,
    pub common_fields: Vec<String>,
    pub automation_notes: Option<String>,
}

/// Detect ATS platform from HTML content
#[tauri::command]
pub async fn detect_ats_from_html(html: String) -> Result<String, String> {
    tracing::info!("Command: detect_ats_from_html");

    let platform = AtsDetector::detect_from_html(&html);
    Ok(platform.as_str().to_string())
}

// ============================================================================
// Browser Control Commands (Phase 2)
// ============================================================================

use crate::core::automation::browser::{BrowserManager, FillResult};
use crate::core::automation::form_filler::FormFiller;
use once_cell::sync::Lazy;
use std::sync::Arc;
use tokio::sync::Mutex;

/// Global browser manager instance
static BROWSER_MANAGER: Lazy<Arc<Mutex<BrowserManager>>> =
    Lazy::new(|| Arc::new(Mutex::new(BrowserManager::new())));

/// Launch the browser for form filling
///
/// Opens a visible Chrome browser window that the user can observe.
#[tauri::command]
pub async fn launch_automation_browser() -> Result<(), String> {
    tracing::info!("Command: launch_automation_browser");

    let manager = BROWSER_MANAGER.lock().await;
    manager
        .launch()
        .await
        .map_err(|e| user_friendly_error("Failed to launch browser", e))
}

/// Close the application review browser
#[tauri::command]
pub async fn close_automation_browser() -> Result<(), String> {
    tracing::info!("Command: close_automation_browser");

    let manager = BROWSER_MANAGER.lock().await;
    manager
        .close()
        .await
        .map_err(|e| user_friendly_error("Failed to close browser", e))
}

/// Check if browser is running
#[tauri::command]
pub async fn is_browser_running() -> Result<bool, String> {
    let manager = BROWSER_MANAGER.lock().await;
    Ok(manager.is_running().await)
}

/// Fill a job application form
///
/// 1. Navigates to the job URL
/// 2. Detects ATS platform
/// 3. Fills form fields from profile and screening answers
/// 4. Creates automation attempt for tracking
/// 5. Returns what was filled
/// 6. User reviews and clicks submit manually
#[tauri::command]
pub async fn fill_application_form(
    job_url: String,
    job_hash: Option<String>,
    state: State<'_, AppState>,
) -> Result<FillResultWithAttempt, String> {
    tracing::info!(
        "Command: fill_application_form (url: {})",
        sanitize_url_for_logging(&job_url)
    );
    let start_time = std::time::Instant::now();
    let job_url = validate_external_http_url(&job_url)
        .map(|url| url.to_string())
        .map_err(|reason| format!("Cannot open that job link. {reason}"))?;

    // Get profile
    let profile_manager = ProfileManager::new(state.database.pool().clone());
    let profile = profile_manager
        .get_profile()
        .await
        .map_err(|e| user_friendly_error("Failed to load profile", e))?
        .ok_or("No application profile configured. Open Application Assist from the sidebar and save your profile details first.")?;

    // Get saved screening answers for matching questions
    let screening_answers = profile_manager
        .get_screening_answers()
        .await
        .map_err(|e| user_friendly_error("Failed to load screening answers", e))?;

    tracing::info!(
        "Loaded {} screening answer patterns",
        screening_answers.len()
    );

    // Detect ATS platform
    let platform = AtsDetector::detect_from_url(&job_url);
    tracing::info!("Detected ATS platform: {:?}", platform);

    // Create automation attempt for tracking (if job_hash provided)
    let attempt_id = if let Some(ref hash) = job_hash {
        let automation_manager = AutomationManager::new(state.database.pool().clone());
        match automation_manager
            .create_attempt(hash, platform.clone())
            .await
        {
            Ok(id) => {
                tracing::info!("Created automation attempt #{}", id);
                Some(id)
            }
            Err(e) => {
                tracing::warn!(
                    error = %user_friendly_error("Failed to create automation attempt", e),
                    "Skipped automation-attempt tracking"
                );
                None
            }
        }
    } else {
        None
    };

    // Launch browser if not running
    let manager = BROWSER_MANAGER.lock().await;
    if !manager.is_running().await {
        manager
            .launch()
            .await
            .map_err(|e| user_friendly_error("Failed to launch browser", e))?;
    }

    // Create new page and navigate
    let page = manager
        .new_page(&job_url)
        .await
        .map_err(|e| user_friendly_error("Failed to open job page", e))?;

    // Validate saved resume state without uploading it. Resume attachment stays manual.
    let _resume_path = trusted_application_resume_path(
        profile.resume_file_path.as_deref(),
        &application_resume_dir(),
    )?;

    // Create form filler with screening answers and fill the form
    let filler = FormFiller::new(profile, None).with_screening_answers(screening_answers);

    let result = filler
        .fill_page(&page, &platform)
        .await
        .map_err(|e| user_friendly_error("Failed to fill application form", e))?;

    let duration_ms = start_time.elapsed().as_millis() as i64;

    tracing::info!(
        "Form fill complete in {}ms: {} fields filled, {} unfilled, captcha: {}",
        duration_ms,
        result.filled_fields.len(),
        result.unfilled_fields.len(),
        result.captcha_detected
    );

    // Update attempt status
    if let Some(id) = attempt_id {
        let automation_manager = AutomationManager::new(state.database.pool().clone());
        let status = if result.captcha_detected || result.ready_for_review {
            AutomationStatus::AwaitingApproval
        } else {
            AutomationStatus::Failed
        };

        let _ = automation_manager
            .update_status(id, status, result.error_message.as_deref())
            .await;
    }

    Ok(FillResultWithAttempt {
        fill_result: result,
        attempt_id,
        duration_ms,
        ats_platform: platform.as_str().to_string(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sanitize_automation_log_url_removes_sensitive_parts() {
        let sanitized = sanitize_url_for_logging(
            "https://user:pass@example.com/jobs/123?token=secret&session=abc#private",
        );

        assert_eq!(sanitized, "https://example.com/jobs/123");
    }

    #[test]
    fn test_sanitize_automation_log_url_truncates_long_path() {
        let sanitized =
            sanitize_url_for_logging(&format!("https://example.com/jobs/{}", "a".repeat(120)));

        assert!(sanitized.starts_with("https://example.com/jobs/"));
        assert!(sanitized.ends_with("..."));
        assert!(sanitized.len() <= 83);
    }

    #[test]
    fn test_sanitize_automation_log_url_handles_invalid_url() {
        let sanitized = sanitize_url_for_logging("not a url with token=secret");

        assert_eq!(sanitized, "<invalid-url>");
    }
}

/// Extended fill result with tracking info
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FillResultWithAttempt {
    #[serde(flatten)]
    pub fill_result: FillResult,
    /// Automation attempt ID for tracking (if job_hash was provided)
    pub attempt_id: Option<i64>,
    /// Time taken in milliseconds
    pub duration_ms: i64,
    /// Detected ATS platform
    pub ats_platform: String,
}

/// Mark an automation attempt as submitted by the user
///
/// Called when user confirms they clicked the submit button on the form.
#[tauri::command]
pub async fn mark_attempt_submitted(
    attempt_id: i64,
    state: State<'_, AppState>,
) -> Result<(), String> {
    tracing::info!("Command: mark_attempt_submitted (id: {})", attempt_id);

    let manager = AutomationManager::new(state.database.pool().clone());
    manager
        .mark_submitted(attempt_id)
        .await
        .map_err(|e| user_friendly_error("Failed to mark attempt as submitted", e))
}

/// Get all automation attempts for a job
///
/// OPTIMIZATION: Added LIMIT clause to prevent unbounded result sets.
/// Most jobs will have 1-3 attempts; cap at 100 for safety.
#[tauri::command]
pub async fn get_attempts_for_job(
    job_hash: String,
    state: State<'_, AppState>,
) -> Result<Vec<AttemptResponse>, String> {
    tracing::info!(
        job_hash_chars = job_hash.chars().count(),
        "Command: get_attempts_for_job"
    );

    let rows = sqlx::query(
        r#"
        SELECT id, job_hash, application_id, status, ats_platform,
               error_message, screenshot_path, confirmation_screenshot_path,
               automation_duration_ms, user_approved, submitted_at, created_at
        FROM application_attempts
        WHERE job_hash = ?
        ORDER BY created_at DESC
        LIMIT 100
        "#,
    )
    .bind(&job_hash)
    .fetch_all(state.database.pool())
    .await
    .map_err(|e| user_friendly_error("Failed to get attempts", e))?;

    use sqlx::Row;
    let attempts: Vec<AttemptResponse> = rows
        .into_iter()
        .map(|row| {
            let submitted_at: Option<String> = row.get("submitted_at");
            let created_at: String = row.get("created_at");
            AttemptResponse {
                id: row.get("id"),
                job_hash: row.get("job_hash"),
                application_id: row.get("application_id"),
                status: row.get("status"),
                ats_platform: row.get("ats_platform"),
                error_message: row.get("error_message"),
                screenshot_path: row.get("screenshot_path"),
                confirmation_screenshot_path: row.get("confirmation_screenshot_path"),
                automation_duration_ms: row.get("automation_duration_ms"),
                user_approved: row.get::<i32, _>("user_approved") != 0,
                submitted_at,
                created_at,
            }
        })
        .collect();

    Ok(attempts)
}

// ============================================================================
// Screening Answer Learning Commands
// ============================================================================

use crate::core::automation::answer_learning::{
    AnswerLearningManager, AnswerSource, AnswerStatistics, AnswerSuggestion,
};

/// Get suggested answers for a screening question
///
/// Returns ranked suggestions based on:
/// - Manual patterns (from screening_answers table)
/// - Learned patterns (from user modifications)
/// - Historical answers (from similar questions)
#[tauri::command]
pub async fn get_suggested_answers(
    question: String,
    limit: Option<usize>,
    state: State<'_, AppState>,
) -> Result<Vec<AnswerSuggestionResponse>, String> {
    tracing::info!(
        question_chars = question.chars().count(),
        limit = ?limit,
        "Command: get_suggested_answers"
    );

    let limit = validate_optional_command_limit_usize(limit, 5)?;
    let manager = AnswerLearningManager::new(state.database.pool().clone());
    let suggestions = manager
        .get_suggested_answers(&question, limit)
        .await
        .map_err(|e| user_friendly_error("Failed to get suggestions", e))?;

    Ok(suggestions
        .into_iter()
        .map(AnswerSuggestionResponse::from)
        .collect())
}

/// Record that a screening answer was used
///
/// Tracks usage and user modifications for learning.
/// If `was_modified` is true, the system learns from the correction.
#[tauri::command]
pub async fn record_answer_usage(
    screening_answer_id: Option<i64>,
    question_text: String,
    answer_filled: String,
    was_modified: bool,
    modified_to: Option<String>,
    job_hash: Option<String>,
    application_attempt_id: Option<i64>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    tracing::info!(
        "Command: record_answer_usage (pattern_id: {:?}, modified: {})",
        screening_answer_id,
        was_modified
    );

    let manager = AnswerLearningManager::new(state.database.pool().clone());
    manager
        .record_answer_usage(
            screening_answer_id,
            &question_text,
            &answer_filled,
            was_modified,
            modified_to.as_deref(),
            job_hash.as_deref(),
            application_attempt_id,
        )
        .await
        .map_err(|e| user_friendly_error("Failed to record usage", e))
}

/// Get statistics for a specific answer pattern
///
/// Shows usage metrics, modification rate, confidence score, and recent modifications.
#[tauri::command]
pub async fn get_answer_statistics(
    pattern: String,
    state: State<'_, AppState>,
) -> Result<Option<AnswerStatisticsResponse>, String> {
    tracing::info!(
        pattern_chars = pattern.chars().count(),
        "Command: get_answer_statistics"
    );

    let manager = AnswerLearningManager::new(state.database.pool().clone());
    match manager.get_answer_statistics(&pattern).await {
        Ok(Some(stats)) => Ok(Some(AnswerStatisticsResponse::from(stats))),
        Ok(None) => Ok(None),
        Err(e) => Err(user_friendly_error("Failed to get statistics", e)),
    }
}

/// Clear answer history (optionally for a specific pattern)
///
/// Removes usage history and resets statistics.
/// If `pattern` is None, clears all history.
#[tauri::command]
pub async fn clear_answer_history(
    pattern: Option<String>,
    state: State<'_, AppState>,
) -> Result<usize, String> {
    tracing::info!(
        has_pattern = pattern.is_some(),
        pattern_chars = pattern
            .as_ref()
            .map_or(0, |pattern| pattern.chars().count()),
        "Command: clear_answer_history"
    );

    let manager = AnswerLearningManager::new(state.database.pool().clone());
    manager
        .clear_answer_history(pattern.as_deref())
        .await
        .map_err(|e| user_friendly_error("Failed to clear history", e))
}

// Response types for learning commands

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnswerSuggestionResponse {
    pub answer: String,
    pub confidence: f64,
    pub source: AnswerSourceResponse,
    pub times_used: i32,
    pub times_modified: i32,
    pub last_used_days_ago: Option<i32>,
    pub modification_rate: f64,
}

impl From<AnswerSuggestion> for AnswerSuggestionResponse {
    fn from(s: AnswerSuggestion) -> Self {
        Self {
            answer: s.answer,
            confidence: s.confidence,
            source: AnswerSourceResponse::from(s.source),
            times_used: s.times_used,
            times_modified: s.times_modified,
            last_used_days_ago: s.last_used_days_ago,
            modification_rate: s.modification_rate,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum AnswerSourceResponse {
    Manual {
        #[serde(rename = "answerId")]
        answer_id: i64,
    },
    Learned {
        #[serde(rename = "learnedId")]
        learned_id: i64,
    },
    Historical,
}

impl From<AnswerSource> for AnswerSourceResponse {
    fn from(source: AnswerSource) -> Self {
        match source {
            AnswerSource::Manual { answer_id, .. } => Self::Manual { answer_id },
            AnswerSource::Learned { learned_id, .. } => Self::Learned { learned_id },
            AnswerSource::Historical { .. } => Self::Historical,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AnswerStatisticsResponse {
    pub times_used: i32,
    pub times_modified: i32,
    pub modification_rate: f64,
    pub confidence_score: f64,
    pub last_used_at: Option<String>,
    pub created_at: String,
    pub recent_modifications: Vec<ModificationExampleResponse>,
}

impl From<AnswerStatistics> for AnswerStatisticsResponse {
    fn from(stats: AnswerStatistics) -> Self {
        Self {
            times_used: stats.times_used,
            times_modified: stats.times_modified,
            modification_rate: stats.modification_rate,
            confidence_score: stats.confidence_score,
            last_used_at: stats.last_used_at.map(|d| d.to_rfc3339()),
            created_at: stats.created_at.to_rfc3339(),
            recent_modifications: stats
                .recent_modifications
                .into_iter()
                .map(ModificationExampleResponse::from)
                .collect(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModificationExampleResponse {
    pub before_chars: usize,
    pub after_chars: usize,
    pub question_chars: usize,
    pub modified_at: String,
}

impl From<crate::core::automation::answer_learning::ModificationExample>
    for ModificationExampleResponse
{
    fn from(ex: crate::core::automation::answer_learning::ModificationExample) -> Self {
        Self {
            before_chars: ex.original_answer.chars().count(),
            after_chars: ex.modified_to.chars().count(),
            question_chars: ex.question_text.chars().count(),
            modified_at: ex.modified_at.to_rfc3339(),
        }
    }
}

#[cfg(test)]
mod response_tests {
    use super::*;

    fn profile_with_resume_path(path: Option<String>) -> ApplicationProfile {
        ApplicationProfile {
            id: 1,
            full_name: "Jordan Lee".to_string(),
            email: "jordan@example.com".to_string(),
            phone: None,
            linkedin_url: None,
            github_url: None,
            portfolio_url: None,
            website_url: None,
            default_resume_id: None,
            resume_file_path: path,
            default_cover_letter_template: None,
            us_work_authorized: true,
            requires_sponsorship: false,
            max_applications_per_day: 10,
            require_manual_approval: true,
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        }
    }

    #[test]
    fn application_profile_response_redacts_resume_file_path() {
        let response = ApplicationProfileResponse::from(profile_with_resume_path(Some(
            "/Users/jordan/private/client-resume.pdf".to_string(),
        )));

        let json = serde_json::to_string(&response).unwrap();
        assert!(response.has_resume_file);
        assert_eq!(
            response.resume_file_name,
            Some("client-resume.pdf".to_string())
        );
        assert!(json.contains("client-resume.pdf"));
        assert!(!json.contains("/Users/jordan/private"));
        assert!(!json.contains("resumeFilePath"));
    }

    #[test]
    fn application_profile_response_handles_windows_resume_paths() {
        let response = ApplicationProfileResponse::from(profile_with_resume_path(Some(
            "C:\\Users\\Jordan\\Desktop\\resume.docx".to_string(),
        )));

        let json = serde_json::to_string(&response).unwrap();
        assert_eq!(response.resume_file_name, Some("resume.docx".to_string()));
        assert!(!json.contains("C:\\\\Users"));
    }

    fn valid_profile_input() -> ApplicationProfileInput {
        ApplicationProfileInput {
            full_name: "Jordan Lee".to_string(),
            email: "jordan@example.com".to_string(),
            phone: None,
            linkedin_url: None,
            github_url: None,
            portfolio_url: None,
            website_url: None,
            default_resume_id: None,
            resume_file_path: None,
            resume_file_token: None,
            clear_resume_file: None,
            default_cover_letter_template: None,
            us_work_authorized: true,
            requires_sponsorship: false,
            max_applications_per_day: 10,
            require_manual_approval: true,
        }
    }

    #[test]
    fn application_profile_resume_input_rejects_renderer_file_paths() {
        let managed_dir = tempfile::tempdir().unwrap();
        let input = ApplicationProfileInput {
            resume_file_path: Some("/Users/jordan/private/resume.pdf".to_string()),
            ..valid_profile_input()
        };

        let err = prepare_application_profile_resume_input(input, managed_dir.path()).unwrap_err();

        assert!(err.contains("Choose"));
        assert!(err.contains("resume"));
    }

    #[test]
    fn application_profile_resume_input_accepts_managed_tokens() {
        let managed_dir = tempfile::tempdir().unwrap();
        let token = "7d9d16a1-2e5d-4b32-9eb2-bfbffb4ee871--new-resume.docx";
        let managed_resume = managed_dir.path().join(token);
        std::fs::write(&managed_resume, b"resume").unwrap();
        let input = ApplicationProfileInput {
            resume_file_token: Some(token.to_string()),
            ..valid_profile_input()
        };

        let prepared = prepare_application_profile_resume_input(input, managed_dir.path()).unwrap();

        assert_eq!(
            prepared.resume_file_path,
            Some(managed_resume.to_string_lossy().to_string())
        );
        assert_eq!(prepared.resume_file_token, None);
    }

    #[test]
    fn application_profile_resume_path_rejects_existing_unmanaged_paths() {
        let managed_dir = tempfile::tempdir().unwrap();
        let outside_dir = tempfile::tempdir().unwrap();
        let outside_resume = outside_dir.path().join("resume.pdf");
        std::fs::write(&outside_resume, b"resume").unwrap();

        let err = trusted_application_resume_path(
            Some(outside_resume.to_string_lossy().as_ref()),
            managed_dir.path(),
        )
        .unwrap_err();

        let err = err.to_ascii_lowercase();
        assert!(err.contains("choose"));
        assert!(err.contains("resume"));
    }

    #[test]
    fn application_profile_response_shows_resume_name_without_token_prefix() {
        let response = ApplicationProfileResponse::from(profile_with_resume_path(Some(
            "/local/app/application-resumes/7d9d16a1-2e5d-4b32-9eb2-bfbffb4ee871--jordan-resume.pdf"
                .to_string(),
        )));

        let json = serde_json::to_string(&response).unwrap();

        assert_eq!(
            response.resume_file_name,
            Some("jordan-resume.pdf".to_string())
        );
        assert!(!json.contains("7d9d16a1"));
        assert!(!json.contains("/local/app"));
    }

    #[test]
    fn answer_statistics_response_omits_raw_answer_history() {
        let modified_at = chrono::DateTime::parse_from_rfc3339("2026-06-01T12:00:00Z")
            .unwrap()
            .with_timezone(&chrono::Utc);
        let stats = AnswerStatistics {
            pattern: "(?i)salary|compensation".to_string(),
            answer: "My salary floor is 120000".to_string(),
            times_used: 3,
            times_modified: 1,
            modification_rate: 1.0 / 3.0,
            confidence_score: 0.75,
            last_used_at: Some(modified_at),
            created_at: modified_at,
            recent_modifications: vec![
                crate::core::automation::answer_learning::ModificationExample {
                    original_answer: "Expected salary 110000".to_string(),
                    modified_to: "Expected salary 120000".to_string(),
                    question_text: "What salary range do you need?".to_string(),
                    modified_at,
                },
            ],
        };

        let response = AnswerStatisticsResponse::from(stats);
        let json = serde_json::to_string(&response).unwrap();

        assert_eq!(response.times_used, 3);
        assert_eq!(response.recent_modifications[0].before_chars, 22);
        assert_eq!(response.recent_modifications[0].after_chars, 22);
        assert_eq!(response.recent_modifications[0].question_chars, 30);
        assert!(!json.contains("salary|compensation"));
        assert!(!json.contains("salary floor"));
        assert!(!json.contains("Expected salary"));
        assert!(!json.contains("What salary range"));
        assert!(!json.contains("originalAnswer"));
        assert!(!json.contains("modifiedTo"));
        assert!(!json.contains("questionText"));
    }

    #[test]
    fn answer_suggestion_source_omits_raw_patterns_and_history_questions() {
        let manual = AnswerSuggestion {
            answer: "Yes".to_string(),
            confidence: 0.9,
            source: AnswerSource::Manual {
                pattern: "(?i)authorized.*work".to_string(),
                answer_id: 7,
            },
            times_used: 2,
            times_modified: 0,
            last_used_days_ago: Some(1),
            modification_rate: 0.0,
        };
        let historical = AnswerSuggestion {
            answer: "Expected salary 120000".to_string(),
            confidence: 0.6,
            source: AnswerSource::Historical {
                original_question: "What salary range do you need?".to_string(),
            },
            times_used: 1,
            times_modified: 0,
            last_used_days_ago: None,
            modification_rate: 0.0,
        };

        let manual_json = serde_json::to_string(&AnswerSuggestionResponse::from(manual)).unwrap();
        let historical_json =
            serde_json::to_string(&AnswerSuggestionResponse::from(historical)).unwrap();

        assert!(manual_json.contains("\"type\":\"manual\""));
        assert!(manual_json.contains("\"answerId\":7"));
        assert!(!manual_json.contains("authorized"));
        assert!(!manual_json.contains("pattern"));
        assert!(historical_json.contains("\"type\":\"historical\""));
        assert!(!historical_json.contains("originalQuestion"));
        assert!(!historical_json.contains("What salary range"));
    }
}
