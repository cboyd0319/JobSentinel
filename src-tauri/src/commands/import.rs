//! Job import commands
//!
//! Tauri commands for importing jobs from external URLs via Schema.org parsing.

use crate::commands::{errors::user_friendly_error, AppState};
use crate::core::url_security::{canonicalize_user_supplied_job_url, sanitize_url_for_logging};
use crate::core::{
    calculate_job_hash,
    import::{
        fetch_job_page, parse_schema_org_job_posting, salary::parse_schema_org_salary,
        schema_org::create_preview, ImportError, JobImportPreview,
    },
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use tauri::State;

/// Preview a job import from a URL
///
/// Fetches the URL, parses Schema.org data, and returns a preview
/// without actually importing the job. User can review before confirming.
#[tauri::command]
#[tracing::instrument(skip(state, url), fields(url = %sanitize_url_for_logging(&url)), level = "info")]
pub async fn preview_job_import(
    url: String,
    state: State<'_, AppState>,
) -> Result<JobImportPreview, String> {
    tracing::info!("Previewing job import from URL");
    let canonical_url = canonicalize_import_url(&url).map_err(|e| format_import_error(&e))?;

    // Fetch the page HTML
    let html = fetch_job_page(&canonical_url)
        .await
        .map_err(|e| format_import_error(&e))?;

    // Parse Schema.org JobPosting data
    let postings = parse_schema_org_job_posting(&html).map_err(|e| format_import_error(&e))?;

    // If multiple postings found, return error (user needs to clarify)
    if postings.len() > 1 {
        return Err(format!(
            "Found {} job postings on this page. Unable to determine which to import automatically. Please use a more specific URL.",
            postings.len()
        ));
    }

    let posting = &postings[0];
    let location = posting
        .job_location
        .as_ref()
        .and_then(extract_location_string);

    // Check if job already exists in database
    let job_hash = calculate_job_hash(
        posting
            .hiring_organization
            .as_ref()
            .and_then(|o| o.name.as_deref())
            .unwrap_or(""),
        posting.title.as_deref().unwrap_or(""),
        location.as_deref(),
        &canonical_url,
    );

    let already_exists = state
        .database
        .job_exists_by_hash(&job_hash)
        .await
        .unwrap_or(false);

    // Create preview
    let preview = create_preview(posting, canonical_url, already_exists)
        .map_err(|e| format_import_error(&e))?;

    tracing::info!(
        title_chars = preview.title.chars().count(),
        company_chars = preview.company.chars().count(),
        already_exists = already_exists,
        missing_fields = preview.missing_fields.len(),
        "Import preview created"
    );

    Ok(preview)
}

/// Import a job from a URL
///
/// Fetches the URL, parses Schema.org data, and imports the job into the database.
/// Returns only the created job id.
#[tauri::command]
#[tracing::instrument(skip(state, url), fields(url = %sanitize_url_for_logging(&url)), level = "info")]
pub async fn import_job_from_url(
    url: String,
    state: State<'_, AppState>,
) -> Result<ImportedJobSummary, String> {
    tracing::info!("Importing job from URL");
    let canonical_url = canonicalize_import_url(&url).map_err(|e| format_import_error(&e))?;

    // Fetch the page HTML
    let html = fetch_job_page(&canonical_url)
        .await
        .map_err(|e| format_import_error(&e))?;

    // Parse Schema.org JobPosting data
    let postings = parse_schema_org_job_posting(&html).map_err(|e| format_import_error(&e))?;

    // If multiple postings found, return error
    if postings.len() > 1 {
        return Err(format!(
            "Found {} job postings on this page. Unable to determine which to import automatically. Please use a more specific URL.",
            postings.len()
        ));
    }

    let posting = &postings[0];

    // Validate required fields
    let title = posting
        .title
        .as_ref()
        .ok_or_else(|| "Missing required field: title".to_string())?;

    let company = posting
        .hiring_organization
        .as_ref()
        .and_then(|o| o.name.as_ref())
        .ok_or_else(|| "Missing required field: company name".to_string())?;

    // Extract location
    let location = posting
        .job_location
        .as_ref()
        .and_then(extract_location_string);

    // Calculate job hash for deduplication
    let job_hash = calculate_job_hash(company, title, location.as_deref(), &canonical_url);

    // Check if job already exists
    if state
        .database
        .job_exists_by_hash(&job_hash)
        .await
        .unwrap_or(false)
    {
        return Err("This job already exists in your database".to_string());
    }

    // Extract description
    let description = posting.description.clone();

    // Extract salary range
    let (salary_min, salary_max, currency) = extract_salary_info(&posting.base_salary);

    // Check if remote
    let remote = posting
        .job_location_type
        .as_ref()
        .is_some_and(|t| t == "TELECOMMUTE");

    // Parse date posted
    let created_at = posting
        .date_posted
        .as_ref()
        .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
        .map(|dt| dt.with_timezone(&Utc))
        .unwrap_or_else(Utc::now);

    // Insert into database
    let result = sqlx::query(
        r#"
        INSERT INTO jobs (
            hash, title, company, url, location, description,
            source, remote, salary_min, salary_max, currency,
            created_at, updated_at, last_seen, times_seen
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(&job_hash)
    .bind(title)
    .bind(company)
    .bind(&canonical_url)
    .bind(&location)
    .bind(&description)
    .bind("import")
    .bind(remote)
    .bind(salary_min)
    .bind(salary_max)
    .bind(&currency)
    .bind(created_at)
    .bind(created_at)
    .bind(created_at)
    .bind(1)
    .execute(state.database.pool())
    .await
    .map_err(|e| user_friendly_error("Failed to import job", e))?;

    let job_id = result.last_insert_rowid();

    tracing::info!(
        job_id = job_id,
        title_chars = title.chars().count(),
        company_chars = company.chars().count(),
        "Job imported successfully"
    );

    Ok(ImportedJobSummary { job_id })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportedJobSummary {
    pub job_id: i64,
}

fn canonicalize_import_url(url: &str) -> Result<String, ImportError> {
    canonicalize_user_supplied_job_url(url).map_err(ImportError::InvalidUrl)
}

/// Extract location string from Schema.org JobLocation
fn extract_location_string(job_location: &serde_json::Value) -> Option<String> {
    // Handle single location object
    if let Some(obj) = job_location.as_object() {
        if let Some(address) = obj.get("address") {
            if let Some(addr_obj) = address.as_object() {
                let mut parts = Vec::new();

                if let Some(city) = addr_obj.get("addressLocality").and_then(|v| v.as_str()) {
                    parts.push(city);
                }
                if let Some(state) = addr_obj.get("addressRegion").and_then(|v| v.as_str()) {
                    parts.push(state);
                }

                if !parts.is_empty() {
                    return Some(parts.join(", "));
                }
            }
        }

        // Fallback to name field
        if let Some(name) = obj.get("name").and_then(|v| v.as_str()) {
            return Some(name.to_string());
        }
    }

    // Handle array of locations (take first)
    if let Some(arr) = job_location.as_array() {
        if let Some(first) = arr.first() {
            return extract_location_string(first);
        }
    }

    None
}

/// Extract salary information from Schema.org baseSalary
fn extract_salary_info(
    base_salary: &Option<serde_json::Value>,
) -> (Option<i64>, Option<i64>, Option<String>) {
    if let Some(salary) = parse_schema_org_salary(base_salary) {
        let (min, max) = salary.annual_bounds();
        return (min, max, salary.currency());
    }

    (None, None, None)
}

/// Format ImportError for user display
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
        ImportError::HttpError(e) => {
            if e.is_connect() {
                "Could not connect to the website. Please check your internet connection.".to_string()
            } else if e.is_timeout() {
                "The request timed out. Please try again.".to_string()
            } else if e.is_status() {
                format!("The website returned an error: {}", e.status().map_or_else(|| "Unknown".to_string(), |s| s.to_string()))
            } else {
                "Failed to fetch the page. Please check the URL and try again.".to_string()
            }
        }
        ImportError::HttpBodyRead(crate::core::http_body::HttpBodyReadError::ResponseTooLarge {
            max_bytes,
            ..
        }) => {
            format!(
                "The job page response is too large to import safely. Maximum size is {} MiB.",
                max_bytes / (1024 * 1024)
            )
        }
        ImportError::HttpBodyRead(error) => {
            user_friendly_error("Failed to read the job page response", error)
        }
        ImportError::HtmlParseError(_) => {
            "Could not read this as one job posting. Open one job posting and copy its browser address.".to_string()
        }
        ImportError::InvalidJsonLd(_) => {
            "Could not read this as one job posting. Open one job posting and copy its browser address.".to_string()
        }
        ImportError::DatabaseError(msg) => user_friendly_error("Database operation failed", msg),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_job_hash() {
        let hash1 = calculate_job_hash(
            "Community Services Org",
            "Program Coordinator",
            Some("Remote"),
            "https://example.com/job/1",
        );
        let hash2 = calculate_job_hash(
            "Community Services Org",
            "Program Coordinator",
            Some("Remote"),
            "https://example.com/job/1",
        );
        let hash3 = calculate_job_hash(
            "Community Services Org",
            "Program Coordinator",
            Some("Remote"),
            "https://example.com/job/2",
        );
        let hash4 = calculate_job_hash(
            "Community Services Org",
            "Program Coordinator",
            Some("Phoenix, AZ"),
            "https://example.com/job/1",
        );

        // Same inputs should produce same hash
        assert_eq!(hash1, hash2);

        // Different URL should produce different hash
        assert_ne!(hash1, hash3);

        // Different location should produce different hash
        assert_ne!(hash1, hash4);
    }

    #[test]
    fn test_canonicalize_import_url_minimizes_user_controlled_data() {
        let canonical = canonicalize_import_url(
            "https://user:pass@example.com/jobs?utm_source=newsletter&gh_jid=123&token=secret&query=care&candidate_id=44#private",
        )
        .expect("public URL should canonicalize");

        assert_eq!(canonical, "https://example.com/jobs?gh_jid=123&query=care");
        assert!(!canonical.contains("user"));
        assert!(!canonical.contains("pass"));
        assert!(!canonical.contains("token"));
        assert!(!canonical.contains("candidate_id"));
        assert!(!canonical.contains("utm_source"));
        assert!(!canonical.contains("private"));
    }

    #[test]
    fn test_canonicalize_import_url_rejects_private_destinations_after_minimizing() {
        let result = canonicalize_import_url("http://127.0.0.1/jobs?token=secret");

        assert!(matches!(result, Err(ImportError::InvalidUrl(_))));
    }

    #[test]
    fn test_canonicalized_import_url_keeps_duplicate_hash_stable() {
        let first = canonicalize_import_url(
            "https://example.com/job?utm_source=share&gh_jid=123&session=private",
        )
        .expect("public URL should canonicalize");
        let second = canonicalize_import_url("https://example.com/job?gh_jid=123")
            .expect("public URL should canonicalize");

        assert_eq!(first, second);
        assert_eq!(
            calculate_job_hash("Example Org", "Care Coordinator", None, &first),
            calculate_job_hash("Example Org", "Care Coordinator", None, &second)
        );
    }

    #[test]
    fn test_extract_salary_info() {
        let salary_json = serde_json::json!({
            "currency": "USD",
            "value": {
                "minValue": 100000,
                "maxValue": 150000
            }
        });

        let (min, max, currency) = extract_salary_info(&Some(salary_json));
        assert_eq!(min, Some(100000));
        assert_eq!(max, Some(150000));
        assert_eq!(currency, Some("USD".to_string()));
    }

    #[test]
    fn test_extract_salary_info_converts_hourly_pay_to_yearly_fields() {
        let salary_json = serde_json::json!({
            "currency": "USD",
            "value": {
                "minValue": 20,
                "maxValue": 25,
                "unitText": "HOUR"
            }
        });

        let (min, max, currency) = extract_salary_info(&Some(salary_json));

        assert_eq!(min, Some(41_600));
        assert_eq!(max, Some(52_000));
        assert_eq!(currency, Some("USD".to_string()));
    }

    #[test]
    fn test_format_import_error_sanitizes_redirect_location() {
        let error = ImportError::RedirectBlocked {
            location: "https://user:pass@example.com/final?token=secret123&query=security#private"
                .to_string(),
        };

        let message = format_import_error(&error);

        assert!(message.contains("redirects to another page"));
        assert!(!message.contains("secret123"));
        assert!(!message.contains("example.com"));
        assert!(!message.contains("query=security"));
        assert!(!message.contains("user"));
        assert!(!message.contains("pass"));
        assert!(!message.contains("private"));
    }

    #[test]
    fn test_format_import_error_sanitizes_internal_details() {
        let cases = [
            ImportError::InvalidUrl(
                "https://user:pass@example.com/job?token=secret#private".to_string(),
            ),
            ImportError::HtmlParseError("selector failed near private-page-content".to_string()),
            ImportError::InvalidJsonLd(
                "unexpected token in candidate-specific payload".to_string(),
            ),
            ImportError::DatabaseError("sqlite locked at <local-private-db>".to_string()),
        ];

        for error in cases {
            let message = format_import_error(&error);
            assert!(!message.is_empty());
            assert!(!message.contains("secret"));
            assert!(!message.contains("private-page-content"));
            assert!(!message.contains("candidate-specific"));
            assert!(!message.contains("<local-private-db>"));
        }
    }

    #[test]
    fn test_format_import_error_explains_https_required() {
        let message = format_import_error(&ImportError::InvalidUrl(
            "Blocked insecure URL: https required".to_string(),
        ));

        assert_eq!(
            message,
            "Paste an https job posting link from your browser address bar."
        );
    }
}
