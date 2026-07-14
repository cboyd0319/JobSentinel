use crate::commands::errors::user_friendly_error;
use crate::commands::AppState;
use crate::core::automation::{
    AtsDetector, AtsPlatform, AutomationManager, AutomationStatus, BrowserManager, FillResult,
    FormFiller, ProfileManager,
};
#[cfg(test)]
use crate::core::url_security::validate_external_https_url;
use crate::core::url_security::{sanitize_url_for_logging, validate_external_https_url_for_fetch};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, LazyLock};
use tauri::State;
use tokio::sync::Mutex;

use super::profile_resume::{application_resume_dir, trusted_application_resume_path};
use super::{has_stored_path, AttemptResponse};

const UNSUPPORTED_PREPARE_FORM_TARGET: &str =
    "Prepare Form only works on recognized application sites. Open this page yourself, or apply manually.";

/// Global browser manager instance
static BROWSER_MANAGER: LazyLock<Arc<Mutex<BrowserManager>>> =
    LazyLock::new(|| Arc::new(Mutex::new(BrowserManager::new())));

/// Launch the browser for form filling
///
/// Opens a visible Chrome browser window that the user can observe.
#[tauri::command]
pub(crate) async fn launch_automation_browser() -> Result<(), String> {
    tracing::info!("Command: launch_automation_browser");

    let manager = BROWSER_MANAGER.lock().await;
    manager
        .launch()
        .await
        .map_err(|e| user_friendly_error("Failed to launch browser", e))
}

/// Close the application review browser
#[tauri::command]
pub(crate) async fn close_automation_browser() -> Result<(), String> {
    tracing::info!("Command: close_automation_browser");

    let manager = BROWSER_MANAGER.lock().await;
    manager
        .close()
        .await
        .map_err(|e| user_friendly_error("Failed to close browser", e))
}

/// Check if browser is running
#[tauri::command]
pub(crate) async fn is_browser_running() -> Result<bool, String> {
    let manager = BROWSER_MANAGER.lock().await;
    Ok(manager.is_running().await)
}

#[cfg(test)]
pub(super) fn prepare_form_target(job_url: &str) -> Result<(String, AtsPlatform), String> {
    let job_url = validate_external_https_url(job_url)
        .map(|url| url.to_string())
        .map_err(|reason| format!("Cannot open that job link. {reason}"))?;

    let platform = AtsDetector::detect_from_url(&job_url);
    if platform == AtsPlatform::Unknown {
        return Err(UNSUPPORTED_PREPARE_FORM_TARGET.to_string());
    }

    Ok((job_url, platform))
}

async fn prepare_form_target_for_fill(job_url: &str) -> Result<(String, AtsPlatform), String> {
    let job_url = validate_external_https_url_for_fetch(job_url)
        .await
        .map(|url| url.to_string())
        .map_err(|reason| format!("Cannot open that job link. {reason}"))?;

    let platform = AtsDetector::detect_from_url(&job_url);
    if platform == AtsPlatform::Unknown {
        return Err(UNSUPPORTED_PREPARE_FORM_TARGET.to_string());
    }

    Ok((job_url, platform))
}

pub(super) fn application_page_matches_platform(
    page_url: &str,
    expected_platform: &AtsPlatform,
) -> bool {
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

    let page_url = validate_external_https_url_for_fetch(&page_url)
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

/// Fill a job application form
///
/// 1. Navigates to the job URL
/// 2. Detects ATS platform
/// 3. Fills form fields from profile and screening answers
/// 4. Creates automation attempt for tracking
/// 5. Returns what was filled
/// 6. User reviews and clicks submit manually
#[tauri::command]
pub(crate) async fn fill_application_form(
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

    let manager = BROWSER_MANAGER.lock().await;
    if !manager.is_running().await {
        manager
            .launch()
            .await
            .map_err(|e| user_friendly_error("Failed to launch browser", e))?;
    }

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

    let profile_manager = ProfileManager::new(state.database.pool().clone());
    let profile = profile_manager
        .get_profile()
        .await
        .map_err(|e| user_friendly_error("Failed to load profile", e))?
        .ok_or("No application profile configured. Open Application Assist from the sidebar and save your profile details first.")?;

    let screening_answers = profile_manager
        .get_screening_answers()
        .await
        .map_err(|e| user_friendly_error("Failed to load screening answers", e))?;

    tracing::info!(
        "Loaded {} screening answer patterns",
        screening_answers.len()
    );

    let _resume_path = trusted_application_resume_path(
        profile.resume_file_path.as_deref(),
        &application_resume_dir(),
    )?;

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

/// Extended fill result with tracking info
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct FillResultWithAttempt {
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
pub(crate) async fn mark_attempt_submitted(
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
pub(crate) async fn get_attempts_for_job(
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
