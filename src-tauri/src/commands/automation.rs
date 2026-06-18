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
#[cfg(test)]
use crate::core::url_security::validate_external_http_url;
use crate::core::url_security::{sanitize_url_for_logging, validate_external_http_url_for_fetch};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tauri::State;

mod profile_resume;

const UNSUPPORTED_PREPARE_FORM_TARGET: &str =
    "Prepare Form only works on recognized application sites. Open this page yourself, or apply manually.";

pub use profile_resume::ApplicationResumeFileSelection;
use profile_resume::{
    application_resume_dir, delete_managed_application_resume_file,
    prepare_application_profile_resume_input, resume_file_display_name,
    select_application_resume_file as select_application_resume_file_impl,
    trusted_application_resume_path,
};

#[cfg(test)]
fn prepare_form_target(job_url: &str) -> Result<(String, AtsPlatform), String> {
    let job_url = validate_external_http_url(job_url)
        .map(|url| url.to_string())
        .map_err(|reason| format!("Cannot open that job link. {reason}"))?;

    let platform = AtsDetector::detect_from_url(&job_url);
    if platform == AtsPlatform::Unknown {
        return Err(UNSUPPORTED_PREPARE_FORM_TARGET.to_string());
    }

    Ok((job_url, platform))
}

async fn prepare_form_target_for_fill(job_url: &str) -> Result<(String, AtsPlatform), String> {
    let job_url = validate_external_http_url_for_fetch(job_url)
        .await
        .map(|url| url.to_string())
        .map_err(|reason| format!("Cannot open that job link. {reason}"))?;

    let platform = AtsDetector::detect_from_url(&job_url);
    if platform == AtsPlatform::Unknown {
        return Err(UNSUPPORTED_PREPARE_FORM_TARGET.to_string());
    }

    Ok((job_url, platform))
}

fn application_page_matches_platform(page_url: &str, expected_platform: &AtsPlatform) -> bool {
    let detected = AtsDetector::detect_from_url(page_url);
    detected != AtsPlatform::Unknown && detected == *expected_platform
}

async fn verify_application_form_page_url(
    page_url: Option<String>,
    expected_platform: &AtsPlatform,
) -> Result<(), String> {
    let page_url = page_url.ok_or_else(|| {
        "Could not confirm the application page stayed on a supported site.".to_string()
    })?;

    let page_url = validate_external_http_url_for_fetch(&page_url)
        .await
        .map(|url| url.to_string())
        .map_err(|reason| format!("Stopped before filling the form. {reason}"))?;

    if !application_page_matches_platform(&page_url, expected_platform) {
        return Err(
            "Stopped before filling the form because the page moved to a different site."
                .to_string(),
        );
    }

    Ok(())
}

fn has_stored_path(path: Option<&str>) -> bool {
    path.is_some_and(|path| !path.trim().is_empty())
}

// ============================================================================
// Profile Management Commands
// ============================================================================

/// Select a resume with the native file picker and copy it into app-owned storage.
#[tauri::command]
pub async fn select_application_resume_file(
    app: tauri::AppHandle,
) -> Result<Option<ApplicationResumeFileSelection>, String> {
    select_application_resume_file_impl(app).await
}

/// Upsert (create or update) the application profile
#[tauri::command]
pub async fn upsert_application_profile(
    input: ApplicationProfileInput,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    tracing::info!("Command: upsert_application_profile");

    let manager = ProfileManager::new(state.database.pool().clone());
    let managed_resume_dir = application_resume_dir();
    upsert_application_profile_with_resume_cleanup(input, &manager, &managed_resume_dir).await
}

async fn upsert_application_profile_with_resume_cleanup(
    input: ApplicationProfileInput,
    manager: &ProfileManager,
    managed_resume_dir: &Path,
) -> Result<i64, String> {
    let previous_resume_path = manager
        .get_profile()
        .await
        .map_err(|e| user_friendly_error("Failed to save profile", e))?
        .and_then(|profile| profile.resume_file_path);

    let input = prepare_application_profile_resume_input(input, managed_resume_dir)?;
    let requested_resume_change =
        input.clear_resume_file.unwrap_or(false) || input.resume_file_path.is_some();
    let next_resume_path = input.resume_file_path.clone();

    match manager.upsert_profile(&input).await {
        Ok(profile_id) => {
            if requested_resume_change
                && previous_resume_path.as_deref().map(str::trim)
                    != next_resume_path.as_deref().map(str::trim)
            {
                delete_managed_application_resume_file(
                    previous_resume_path.as_deref(),
                    managed_resume_dir,
                )?;
            }
            Ok(profile_id)
        }
        Err(error) => {
            delete_managed_application_resume_file(next_resume_path.as_deref(), managed_resume_dir)
                .ok();
            Err(user_friendly_error("Failed to save profile", error))
        }
    }
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
    pub full_name: String,
    pub email: String,
    pub phone: Option<String>,
    pub linkedin_url: Option<String>,
    pub github_url: Option<String>,
    pub portfolio_url: Option<String>,
    pub website_url: Option<String>,
    pub has_resume_file: bool,
    pub resume_file_name: Option<String>,
    pub us_work_authorized: bool,
    pub requires_sponsorship: bool,
    pub max_applications_per_day: i32,
    pub require_manual_approval: bool,
}

impl From<ApplicationProfile> for ApplicationProfileResponse {
    fn from(p: ApplicationProfile) -> Self {
        Self {
            full_name: p.full_name,
            email: p.email,
            phone: p.phone,
            linkedin_url: p.linkedin_url,
            github_url: p.github_url,
            portfolio_url: p.portfolio_url,
            website_url: p.website_url,
            has_resume_file: p
                .resume_file_path
                .as_deref()
                .is_some_and(|path| !path.trim().is_empty()),
            resume_file_name: p
                .resume_file_path
                .as_deref()
                .and_then(resume_file_display_name),
            us_work_authorized: p.us_work_authorized,
            requires_sponsorship: p.requires_sponsorship,
            max_applications_per_day: p.max_applications_per_day,
            require_manual_approval: p.require_manual_approval,
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
    pub has_screenshot: bool,
    pub has_confirmation_screenshot: bool,
    pub automation_duration_ms: Option<i64>,
    pub user_approved: bool,
    pub submitted_at: Option<String>,
    pub created_at: String,
}

impl From<ApplicationAttempt> for AttemptResponse {
    fn from(a: ApplicationAttempt) -> Self {
        let has_screenshot = has_stored_path(a.screenshot_path.as_deref());
        let has_confirmation_screenshot =
            has_stored_path(a.confirmation_screenshot_path.as_deref());

        Self {
            id: a.id,
            job_hash: a.job_hash,
            application_id: a.application_id,
            status: a.status.as_str().to_string(),
            ats_platform: a.ats_platform.as_str().to_string(),
            error_message: a.error_message,
            has_screenshot,
            has_confirmation_screenshot,
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
    let (job_url, platform) = prepare_form_target_for_fill(&job_url).await?;
    tracing::info!("Detected application platform: {}", platform.as_str());

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

    verify_application_form_page_url(
        page.current_url()
            .await
            .map_err(|e| user_friendly_error("Failed to confirm job page", e))?,
        &platform,
    )
    .await?;

    // Create automation attempt for tracking only after the page stays on a trusted application site.
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

    // Get profile only after the page is confirmed to still be on the supported site.
    let profile_manager = ProfileManager::new(state.database.pool().clone());
    let profile = profile_manager
        .get_profile()
        .await
        .map_err(|e| user_friendly_error("Failed to load profile", e))?
        .ok_or("No application profile configured. Open Application Assist from the sidebar and save your profile details first.")?;

    // Get saved screening answers for matching questions.
    let screening_answers = profile_manager
        .get_screening_answers()
        .await
        .map_err(|e| user_friendly_error("Failed to load screening answers", e))?;

    tracing::info!(
        "Loaded {} screening answer patterns",
        screening_answers.len()
    );

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

    verify_application_form_page_url(
        page.current_url()
            .await
            .map_err(|e| user_friendly_error("Failed to confirm job page", e))?,
        &platform,
    )
    .await?;

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
mod tests;

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
            let screenshot_path: Option<String> = row.get("screenshot_path");
            let confirmation_screenshot_path: Option<String> =
                row.get("confirmation_screenshot_path");
            AttemptResponse {
                id: row.get("id"),
                job_hash: row.get("job_hash"),
                application_id: row.get("application_id"),
                status: row.get("status"),
                ats_platform: row.get("ats_platform"),
                error_message: row.get("error_message"),
                has_screenshot: has_stored_path(screenshot_path.as_deref()),
                has_confirmation_screenshot: has_stored_path(
                    confirmation_screenshot_path.as_deref(),
                ),
                automation_duration_ms: row.get("automation_duration_ms"),
                user_approved: row.get::<i32, _>("user_approved") != 0,
                submitted_at,
                created_at,
            }
        })
        .collect();

    Ok(attempts)
}

pub mod answer_learning;

pub use answer_learning::{
    AnswerStatisticsResponse, AnswerSuggestionResponse, ModificationExampleResponse,
};

#[tauri::command]
pub async fn get_suggested_answers(
    question: String,
    limit: Option<usize>,
    state: State<'_, AppState>,
) -> Result<Vec<AnswerSuggestionResponse>, String> {
    let limit = validate_optional_command_limit_usize(limit, 5)?;
    answer_learning::get_suggested_answers(question, Some(limit), state).await
}

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
    answer_learning::record_answer_usage(
        screening_answer_id,
        question_text,
        answer_filled,
        was_modified,
        modified_to,
        job_hash,
        application_attempt_id,
        state,
    )
    .await
}

#[tauri::command]
pub async fn get_answer_statistics(
    pattern: String,
    state: State<'_, AppState>,
) -> Result<Option<AnswerStatisticsResponse>, String> {
    answer_learning::get_answer_statistics(pattern, state).await
}

#[tauri::command]
pub async fn clear_answer_history(
    pattern: Option<String>,
    state: State<'_, AppState>,
) -> Result<usize, String> {
    answer_learning::clear_answer_history(pattern, state).await
}

#[cfg(test)]
mod response_tests;
