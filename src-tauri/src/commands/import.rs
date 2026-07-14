//! Thin Tauri adapter for reviewed job-page imports.

use crate::commands::{errors::user_friendly_error, AppState};
use crate::core::{
    import::{
        confirm_job_import as confirm_reviewed_job_import, preview_job_import as stage_job_import,
        ImportError, ImportedJobSummary, JobImportPreview,
    },
    url_security::sanitize_url_for_logging,
};
use tauri::State;

#[tauri::command]
#[tracing::instrument(skip(state, url), fields(url = %sanitize_url_for_logging(&url)), level = "info")]
pub async fn preview_job_import(
    url: String,
    state: State<'_, AppState>,
) -> Result<JobImportPreview, String> {
    let preview = stage_job_import(state.database.as_ref(), &state.pending_url_imports, &url)
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
pub async fn confirm_job_import(
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
        ImportError::HttpError(error) if error.is_connect() => {
            "Could not connect to the website. Please check your internet connection.".to_string()
        }
        ImportError::HttpError(error) if error.is_timeout() => {
            "The request timed out. Please try again.".to_string()
        }
        ImportError::HttpError(error) if error.is_status() => format!(
            "The website returned an error: {}",
            error
                .status()
                .map_or_else(|| "Unknown".to_string(), |status| status.to_string())
        ),
        ImportError::HttpError(_) => {
            "Failed to fetch the page. Please check the URL and try again.".to_string()
        }
        ImportError::HttpBodyRead(crate::core::http_body::HttpBodyReadError::ResponseTooLarge {
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
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn format_import_error_sanitizes_internal_details() {
        let cases = [
            ImportError::InvalidUrl(
                "https://user:pass@example.com/job?token=secret#private".to_string(),
            ),
            ImportError::HtmlParseError("selector failed near private content".to_string()),
            ImportError::InvalidJsonLd("candidate-specific payload".to_string()),
            ImportError::DatabaseError("sqlite locked at a private path".to_string()),
        ];

        for error in cases {
            let message = format_import_error(&error);
            assert!(!message.contains("secret"));
            assert!(!message.contains("private content"));
            assert!(!message.contains("candidate-specific"));
            assert!(!message.contains("private path"));
        }
    }

    #[test]
    fn format_import_error_explains_https_required() {
        let message = format_import_error(&ImportError::InvalidUrl(
            "Blocked insecure URL: https required".to_string(),
        ));

        assert_eq!(
            message,
            "Paste an https job posting link from your browser address bar."
        );
    }

    #[test]
    fn format_import_error_explains_stale_and_duplicate_previews() {
        assert_eq!(
            format_import_error(&ImportError::PendingImportNotFound),
            "This job preview expired. Check the job link again before saving."
        );
        assert_eq!(
            format_import_error(&ImportError::AlreadyExists),
            "This job is already in your saved jobs."
        );
    }
}
