use std::sync::{Arc, RwLock};

use chrono::Utc;
use serde_json::json;

use crate::bookmarklet::{
    pending::{
        queue_pending_bookmarklet_imports, remove_pending_bookmarklet_imports,
        selected_pending_bookmarklet_imports, BookmarkletImportConfirmResult,
        BookmarkletImportQueueResult, PendingBookmarkletImport, PendingBookmarkletImports,
    },
    BookmarkletJobData, BookmarkletRepository,
};
use jobsentinel_domain::{calculate_job_hash, Job};
use jobsentinel_security::canonicalize_user_supplied_job_url;

use super::{
    bookmarklet_job_values, bookmarklet_payload_matches_request_origin,
    consume_valid_bookmarklet_token, json_error_response, BookmarkletAuthState,
    BOOKMARKLET_DATABASE_FAILURE_MESSAGE, BOOKMARKLET_UNAUTHORIZED_MESSAGE,
    INVALID_BOOKMARKLET_PAYLOAD_MESSAGE, MAX_BOOKMARKLET_COMPANY_LENGTH,
    MAX_BOOKMARKLET_DESCRIPTION_LENGTH, MAX_BOOKMARKLET_LOCATION_LENGTH,
    MAX_BOOKMARKLET_TITLE_LENGTH, MAX_BOOKMARKLET_URL_LENGTH,
};

/// Handle import request
pub(super) async fn handle_import_request(
    request: &str,
    auth_state: &Arc<RwLock<BookmarkletAuthState>>,
    pending_imports: PendingBookmarkletImports,
    repository: Arc<dyn BookmarkletRepository>,
) -> (String, String) {
    let body = if let Some(body_start) = request.find("\r\n\r\n") {
        &request[body_start + 4..]
    } else {
        return (
            json_error_response("Invalid request format"),
            "application/json".to_string(),
        );
    };

    let body_value: serde_json::Value = match serde_json::from_str(body) {
        Ok(data) => data,
        Err(e) => {
            tracing::error!(
                line = e.line(),
                column = e.column(),
                "Failed to parse bookmarklet job data"
            );
            return (
                json_error_response(INVALID_BOOKMARKLET_PAYLOAD_MESSAGE),
                "application/json".to_string(),
            );
        }
    };

    if !bookmarklet_payload_matches_request_origin(request, &body_value) {
        return (
            json_error_response("Invalid browser import origin"),
            "application/json".to_string(),
        );
    }

    if !consume_valid_bookmarklet_token(auth_state, request, &body_value, Utc::now()) {
        return (
            json_error_response(BOOKMARKLET_UNAUTHORIZED_MESSAGE),
            "application/json".to_string(),
        );
    }

    let batch_mode = body_value.get("jobs").is_some();
    let job_values = match bookmarklet_job_values(&body_value) {
        Ok(values) => values,
        Err(message) => {
            return (json_error_response(message), "application/json".to_string());
        }
    };
    let mut job_data_values = Vec::with_capacity(job_values.len());

    for job_value in job_values {
        let job_data: BookmarkletJobData = match serde_json::from_value(job_value) {
            Ok(data) => data,
            Err(_) => {
                tracing::error!("Failed to parse bookmarklet job data");
                return (
                    json_error_response(INVALID_BOOKMARKLET_PAYLOAD_MESSAGE),
                    "application/json".to_string(),
                );
            }
        };

        if let Err(message) = job_data.validate() {
            return (json_error_response(message), "application/json".to_string());
        }

        job_data_values.push(job_data);
    }

    let queue_result = match queue_bookmarklet_jobs_for_review(
        repository.as_ref(),
        &pending_imports,
        job_data_values,
        batch_mode,
    )
    .await
    {
        Ok(result) => result,
        Err(message) => {
            return (json_error_response(message), "application/json".to_string());
        }
    };

    if batch_mode {
        return (
            json!({
                "success": true,
                "message": "Jobs ready for review",
                "pending": queue_result.pending,
                "skipped": queue_result.skipped,
            })
            .to_string(),
            "application/json".to_string(),
        );
    }

    (
        json!({
            "success": true,
            "message": "Job ready for review",
            "pending": queue_result.pending,
            "skipped": queue_result.skipped,
        })
        .to_string(),
        "application/json".to_string(),
    )
}

async fn queue_bookmarklet_jobs_for_review(
    repository: &dyn BookmarkletRepository,
    pending_imports: &PendingBookmarkletImports,
    job_data_values: Vec<BookmarkletJobData>,
    batch_mode: bool,
) -> Result<BookmarkletImportQueueResult, String> {
    let mut pending_jobs = Vec::with_capacity(job_data_values.len());
    let mut skipped = 0usize;

    for job_data in job_data_values {
        let job_data = normalize_bookmarklet_job_data(job_data)?;
        let job_hash = bookmarklet_job_hash(&job_data);

        match repository.job_exists_by_hash(&job_hash).await {
            Ok(true) if batch_mode => {
                skipped += 1;
                continue;
            }
            Ok(true) => {
                return Err("Job already exists in database".to_string());
            }
            Ok(false) => {}
            Err(_e) => {
                tracing::error!(
                    error_kind = "database",
                    "Database error checking bookmarklet job existence"
                );
                return Err(BOOKMARKLET_DATABASE_FAILURE_MESSAGE.to_string());
            }
        }

        pending_jobs.push(PendingBookmarkletImport::new(job_hash, job_data));
    }

    let mut result = queue_pending_bookmarklet_imports(pending_imports, pending_jobs);
    result.skipped += skipped;
    Ok(result)
}

pub async fn confirm_pending_bookmarklet_imports(
    repository: &dyn BookmarkletRepository,
    pending_imports: &PendingBookmarkletImports,
    ids: &[String],
) -> Result<BookmarkletImportConfirmResult, String> {
    let selected = selected_pending_bookmarklet_imports(pending_imports, ids);
    if selected.is_empty() {
        return Ok(BookmarkletImportConfirmResult {
            imported: 0,
            skipped: 0,
        });
    }

    let mut confirmed_ids = Vec::new();
    let mut imported = 0usize;
    let mut skipped = 0usize;

    for pending_import in selected {
        match store_bookmarklet_job(repository, pending_import.job_data()).await {
            Ok(Some(_job_id)) => {
                imported += 1;
                confirmed_ids.push(pending_import.id().to_string());
            }
            Ok(None) => {
                skipped += 1;
                confirmed_ids.push(pending_import.id().to_string());
            }
            Err(message) => return Err(message),
        }
    }

    remove_pending_bookmarklet_imports(pending_imports, &confirmed_ids);

    Ok(BookmarkletImportConfirmResult { imported, skipped })
}

pub fn discard_pending_bookmarklet_imports(
    pending_imports: &PendingBookmarkletImports,
    ids: &[String],
) -> usize {
    remove_pending_bookmarklet_imports(pending_imports, ids)
}

async fn store_bookmarklet_job(
    repository: &dyn BookmarkletRepository,
    job_data: BookmarkletJobData,
) -> Result<Option<i64>, String> {
    let job_data = normalize_bookmarklet_job_data(job_data)?;
    let title = job_data.title.clone();
    let company = job_data.get_company().unwrap_or_default();
    let description = if job_data.description.trim().is_empty() {
        None
    } else {
        Some(job_data.description.trim().to_string())
    };
    let location = job_data
        .get_location()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());
    let remote = job_data.is_remote();
    let url = job_data.url.clone();

    let job_hash = bookmarklet_job_hash(&job_data);

    match repository.job_exists_by_hash(&job_hash).await {
        Ok(true) => {
            return Ok(None);
        }
        Ok(false) => {}
        Err(_e) => {
            tracing::error!(
                error_kind = "database",
                "Database error checking bookmarklet job existence"
            );
            return Err(BOOKMARKLET_DATABASE_FAILURE_MESSAGE.to_string());
        }
    }

    let created_at = Utc::now();
    let job = Job {
        id: 0,
        hash: job_hash.clone(),
        title: title.clone(),
        company: company.clone(),
        url: url.clone(),
        location: location.clone(),
        description: description.clone(),
        score: None,
        score_reasons: None,
        source: "bookmarklet".to_string(),
        remote: Some(remote),
        salary_min: None,
        salary_max: None,
        currency: None,
        created_at,
        updated_at: created_at,
        last_seen: created_at,
        times_seen: 1,
        immediate_alert_sent: false,
        included_in_digest: false,
        hidden: false,
        bookmarked: false,
        notes: None,
        ghost_score: None,
        ghost_reasons: None,
        first_seen: Some(created_at),
        repost_count: 0,
    };

    match repository.upsert_job(&job).await {
        Ok(job_id) => {
            tracing::info!(
                job_id,
                job_hash_len = job_hash.len(),
                title_chars = title.chars().count(),
                company_chars = company.chars().count(),
                has_location = location.is_some(),
                remote,
                "Job imported from bookmarklet"
            );
            Ok(Some(job_id))
        }
        Err(_e) => {
            tracing::error!(
                error_kind = "database",
                "Database error inserting bookmarklet job"
            );
            Err(BOOKMARKLET_DATABASE_FAILURE_MESSAGE.to_string())
        }
    }
}

fn normalize_bookmarklet_job_data(
    mut job_data: BookmarkletJobData,
) -> Result<BookmarkletJobData, String> {
    job_data.validate()?;

    job_data.title = job_data.title.trim().to_string();
    job_data.company = job_data
        .get_company()
        .map(|value| value.trim().to_string())
        .unwrap_or_default();
    job_data.description = job_data.description.trim().to_string();
    job_data.location = job_data
        .get_location()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());
    job_data.url = canonicalize_bookmarklet_job_url(job_data.url.trim())
        .map_err(|_| "Job link must be a public https address".to_string())?;
    validate_bookmarklet_job_storage_lengths(&job_data)?;

    Ok(job_data)
}

fn validate_bookmarklet_job_storage_lengths(job_data: &BookmarkletJobData) -> Result<(), String> {
    if job_data.title.len() > MAX_BOOKMARKLET_TITLE_LENGTH
        || job_data.company.len() > MAX_BOOKMARKLET_COMPANY_LENGTH
        || job_data.url.len() > MAX_BOOKMARKLET_URL_LENGTH
        || job_data
            .location
            .as_ref()
            .is_some_and(|location| location.len() > MAX_BOOKMARKLET_LOCATION_LENGTH)
        || job_data.description.len() > MAX_BOOKMARKLET_DESCRIPTION_LENGTH
    {
        return Err(BOOKMARKLET_DATABASE_FAILURE_MESSAGE.to_string());
    }

    Ok(())
}

fn bookmarklet_job_hash(job_data: &BookmarkletJobData) -> String {
    let company = job_data.get_company().unwrap_or_default();
    let location = job_data.get_location();

    calculate_job_hash(
        &company,
        &job_data.title,
        location.as_deref(),
        &job_data.url,
    )
}

fn canonicalize_bookmarklet_job_url(value: &str) -> Result<String, String> {
    let canonical = canonicalize_user_supplied_job_url(value)?;
    let Ok(mut parsed) = url::Url::parse(&canonical) else {
        return Ok(canonical);
    };

    if parsed.host_str().is_some_and(|host| {
        host.eq_ignore_ascii_case("linkedin.com") || host.ends_with(".linkedin.com")
    }) {
        parsed.set_query(None);
        parsed.set_fragment(None);
        return Ok(parsed.to_string());
    }

    Ok(canonical)
}
