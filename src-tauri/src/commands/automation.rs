//! Application Automation Tauri Commands
//!
//! Commands for One-Click Apply automation (form filling without auto-submit).
//!
//! **Features:**
//! - Profile management (contact info, work authorization)
//! - Screening answer configuration
//! - Automation attempt tracking
//! - ATS platform detection

use crate::commands::AppState;
use crate::core::automation::{
    ats_detector::AtsDetector,
    profile::{ApplicationProfileInput, ProfileManager, ScreeningAnswer},
    ApplicationAttempt, AtsPlatform, AutomationManager, AutomationStats,
};
use serde::{Deserialize, Serialize};
use tauri::State;

// ============================================================================
// Profile Management Commands
// ============================================================================

/// Upsert (create or update) the application profile
#[tauri::command]
pub async fn upsert_application_profile(
    input: ApplicationProfileInput,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    tracing::info!("Command: upsert_application_profile");

    let manager = ProfileManager::new(state.database.pool().clone());
    manager
        .upsert_profile(&input)
        .await
        .map_err(|e| format!("Failed to save profile: {}", e))
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
        Err(e) => Err(format!("Failed to get profile: {}", e)),
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
    pub default_cover_letter_template: Option<String>,
    pub us_work_authorized: bool,
    pub requires_sponsorship: bool,
    pub max_applications_per_day: i32,
    pub require_manual_approval: bool,
    pub created_at: String,
    pub updated_at: String,
}

impl From<crate::core::automation::ApplicationProfile> for ApplicationProfileResponse {
    fn from(p: crate::core::automation::ApplicationProfile) -> Self {
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
        "Command: upsert_screening_answer (pattern: {})",
        question_pattern
    );

    let manager = ProfileManager::new(state.database.pool().clone());
    manager
        .upsert_screening_answer(&question_pattern, &answer, &answer_type, notes.as_deref())
        .await
        .map_err(|e| format!("Failed to save screening answer: {}", e))
}

/// Get all screening answers
#[tauri::command]
pub async fn get_screening_answers(
    state: State<'_, AppState>,
) -> Result<Vec<ScreeningAnswerResponse>, String> {
    tracing::info!("Command: get_screening_answers");

    let manager = ProfileManager::new(state.database.pool().clone());
    match manager.get_screening_answers().await {
        Ok(answers) => Ok(answers.into_iter().map(ScreeningAnswerResponse::from).collect()),
        Err(e) => Err(format!("Failed to get screening answers: {}", e)),
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
    tracing::info!("Command: find_answer_for_question (question: {})", question);

    let manager = ProfileManager::new(state.database.pool().clone());
    manager
        .find_answer_for_question(&question)
        .await
        .map_err(|e| format!("Failed to find answer: {}", e))
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
    tracing::info!(
        "Command: create_automation_attempt (job: {}, platform: {})",
        job_hash,
        ats_platform
    );

    let manager = AutomationManager::new(state.database.pool().clone());
    let platform = AtsPlatform::from_str(&ats_platform);

    manager
        .create_attempt(&job_hash, platform)
        .await
        .map_err(|e| format!("Failed to create automation attempt: {}", e))
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
        Err(e) => Err(format!("Failed to get attempt: {}", e)),
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
        .map_err(|e| format!("Failed to approve attempt: {}", e))
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
        .map_err(|e| format!("Failed to cancel attempt: {}", e))
}

/// Get pending automation attempts (approved and ready to process)
#[tauri::command]
pub async fn get_pending_attempts(
    limit: Option<usize>,
    state: State<'_, AppState>,
) -> Result<Vec<AttemptResponse>, String> {
    tracing::info!("Command: get_pending_attempts");

    let manager = AutomationManager::new(state.database.pool().clone());
    match manager.get_pending_attempts(limit.unwrap_or(10)).await {
        Ok(attempts) => Ok(attempts.into_iter().map(AttemptResponse::from).collect()),
        Err(e) => Err(format!("Failed to get pending attempts: {}", e)),
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
        .map_err(|e| format!("Failed to get automation stats: {}", e))
}

// ============================================================================
// ATS Detection Commands
// ============================================================================

/// Detect ATS platform from a URL
#[tauri::command]
pub async fn detect_ats_platform(url: String) -> Result<AtsDetectionResponse, String> {
    tracing::info!("Command: detect_ats_platform (url: {})", url);

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
static BROWSER_MANAGER: Lazy<Arc<Mutex<BrowserManager>>> = Lazy::new(|| {
    Arc::new(Mutex::new(BrowserManager::new()))
});

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
        .map_err(|e| format!("Failed to launch browser: {}", e))
}

/// Close the automation browser
#[tauri::command]
pub async fn close_automation_browser() -> Result<(), String> {
    tracing::info!("Command: close_automation_browser");

    let manager = BROWSER_MANAGER.lock().await;
    manager
        .close()
        .await
        .map_err(|e| format!("Failed to close browser: {}", e))
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
/// 3. Fills form fields from profile
/// 4. Returns what was filled
/// 5. User reviews and clicks submit manually
#[tauri::command]
pub async fn fill_application_form(
    job_url: String,
    state: State<'_, AppState>,
) -> Result<FillResult, String> {
    tracing::info!("Command: fill_application_form (url: {})", job_url);

    // Get profile
    let profile_manager = ProfileManager::new(state.database.pool().clone());
    let profile = profile_manager
        .get_profile()
        .await
        .map_err(|e| format!("Failed to get profile: {}", e))?
        .ok_or("No application profile configured. Please set up your profile first.")?;

    // Launch browser if not running
    let manager = BROWSER_MANAGER.lock().await;
    if !manager.is_running().await {
        manager
            .launch()
            .await
            .map_err(|e| format!("Failed to launch browser: {}", e))?;
    }

    // Create new page and navigate
    let page = manager
        .new_page(&job_url)
        .await
        .map_err(|e| format!("Failed to open page: {}", e))?;

    // Detect ATS platform
    let platform = AtsDetector::detect_from_url(&job_url);
    tracing::info!("Detected ATS platform: {:?}", platform);

    // Get resume path if configured (TODO: export from resume builder)
    let resume_path = None; // Will be implemented when resume builder exports are integrated

    // Create form filler and fill the form
    // The profile from ProfileManager is already ApplicationProfile with DateTime fields
    let filler = FormFiller::new(profile, resume_path);

    let result = filler
        .fill_page(&page, &platform)
        .await
        .map_err(|e| format!("Failed to fill form: {}", e))?;

    tracing::info!(
        "Form fill complete: {} fields filled, {} unfilled, captcha: {}",
        result.filled_fields.len(),
        result.unfilled_fields.len(),
        result.captcha_detected
    );

    Ok(result)
}

/// Take a screenshot of the current browser page
#[tauri::command]
pub async fn take_automation_screenshot(path: String) -> Result<(), String> {
    tracing::info!("Command: take_automation_screenshot (path: {})", path);

    // Note: This is a placeholder - we'd need to track the current page
    // For now, users can use OS screenshot tools
    Err("Screenshot functionality requires active page context".to_string())
}
