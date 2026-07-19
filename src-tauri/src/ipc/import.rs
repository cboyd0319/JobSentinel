//! Thin Tauri adapter for reviewed job-page imports.

use crate::bootstrap::AppState;
use crate::desktop::sanitize_url_for_logging;
use crate::ipc::errors::user_friendly_error;
use jobsentinel_application::{
    confirm_job_import as confirm_reviewed_job_import, employer_discovery_review_grant,
    prepare_job_import_target, preview_job_import as stage_job_import, ImportError,
    ImportedJobSummary, JobImportPreview,
};
use tauri::State;
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
use tokio::sync::oneshot;

#[tauri::command]
#[tracing::instrument(skip(app, state, url), fields(url = %sanitize_url_for_logging(&url)), level = "info")]
pub(crate) async fn preview_job_import(
    app: tauri::AppHandle,
    url: String,
    state: State<'_, AppState>,
) -> Result<JobImportPreview, String> {
    let canonical_url =
        prepare_job_import_target(&url).map_err(|error| format_import_error(&error))?;
    if !confirm_native_job_link_fetch(&app, &canonical_url).await? {
        return Err("Job link check was canceled. No request was sent.".to_string());
    }
    let preview = stage_job_import(
        state.database.as_ref(),
        &state.pending_url_imports,
        &canonical_url,
        employer_discovery_review_grant(),
    )
    .await
    .map_err(|error| format_import_error(&error))?;

    tracing::info!(
        title_chars = preview.title.chars().count(),
        company_chars = preview.company.chars().count(),
        already_exists = preview.already_exists,
        missing_fields = preview.missing_fields.len(),
        "Job import preview staged"
    );
    Ok(preview)
}

#[tauri::command]
#[tracing::instrument(skip(state, import_id), level = "info")]
pub(crate) async fn confirm_job_import(
    import_id: String,
    state: State<'_, AppState>,
) -> Result<ImportedJobSummary, String> {
    confirm_reviewed_job_import(
        state.database.as_ref(),
        &state.pending_url_imports,
        &import_id,
    )
    .await
    .map_err(|error| format_import_error(&error))
}

fn job_link_review_message(url: &str) -> String {
    format!(
        "Check this public page?\n\n{}\n\nJobSentinel will make one HTTPS request without \
         browser cookies or account credentials. Nothing is saved until you review the result.",
        sanitize_url_for_logging(url)
    )
}

async fn confirm_native_job_link_fetch(app: &tauri::AppHandle, url: &str) -> Result<bool, String> {
    let (decision, received) = oneshot::channel();
    app.dialog()
        .message(job_link_review_message(url))
        .title("Check Job Link")
        .kind(MessageDialogKind::Warning)
        .buttons(MessageDialogButtons::OkCancelCustom(
            "Check Page".to_string(),
            "Cancel".to_string(),
        ))
        .show(move |approved| {
            let _ = decision.send(approved);
        });
    received
        .await
        .map_err(|_| "Job link confirmation could not be completed.".to_string())
}

fn format_import_error(error: &ImportError) -> String {
    match error {
        ImportError::NoSchemaOrgData => {
            "Could not read this page as a single job posting. Open one job posting, copy its browser address, or save the job with the details JobSentinel can find.".to_string()
        }
        ImportError::MultipleJobPostings(count) => {
            format!(
                "Found {} job postings on this page. Please use a more specific URL that links to a single job.",
                count
            )
        }
        ImportError::MissingRequiredField { field } => {
            format!("Missing required information: {}. This job posting may be incomplete.", field)
        }
        ImportError::Timeout => {
            "This took too long. Check your internet connection and try again.".to_string()
        }
        ImportError::InvalidUrl(message) if message == "Blocked insecure URL: https required" => {
            "Paste an https job posting link from your browser address bar.".to_string()
        }
        ImportError::InvalidUrl(_) => {
            "Paste the full job link from your browser address bar.".to_string()
        }
        ImportError::RedirectBlocked { .. } => {
            "The job link redirects to another page. Paste the final public job posting link from your browser address bar.".to_string()
        }
        ImportError::HttpStatus(status) => {
            format!("The website returned an error: {status}")
        }
        ImportError::HttpRequest => {
            "Failed to fetch the page. Please check the URL and try again.".to_string()
        }
        ImportError::HttpBodyRead(crate::desktop::HttpBodyReadError::ResponseTooLarge {
            max_bytes,
            ..
        }) => format!(
            "The job page response is too large to import safely. Maximum size is {} MiB.",
            max_bytes / (1024 * 1024)
        ),
        ImportError::HttpBodyRead(error) => {
            user_friendly_error("Failed to read the job page response", error)
        }
        ImportError::HtmlParseError(_) | ImportError::InvalidJsonLd(_) => {
            "Could not read this as one job posting. Open one job posting and copy its browser address.".to_string()
        }
        ImportError::DatabaseError(details) => {
            user_friendly_error("Database operation failed", details)
        }
        ImportError::AlreadyExists => {
            "This job is already in your saved jobs.".to_string()
        }
        ImportError::PendingImportNotFound => {
            "This job preview expired. Check the job link again before saving.".to_string()
        }
        ImportError::SourcePolicyBlocked {
            visible_capture_allowed: true,
        } => "JobSentinel cannot fetch this pasted link. Open it in your browser and use visible Browser Import or manual entry.".to_string(),
        ImportError::SourcePolicyBlocked {
            visible_capture_allowed: false,
        } => "JobSentinel cannot fetch or capture this source. Open it in your browser or use manual entry.".to_string(),
        ImportError::SourceReviewRequired => {
            "Review the destination before JobSentinel checks this page.".to_string()
        }
        ImportError::SourceAuthorizationUnavailable => {
            "Job link checks are paused because the reviewed source policy changed. Restart JobSentinel and try again.".to_string()
        }
    }
}

#[cfg(test)]
#[path = "import_tests.rs"]
mod tests;
