//! Job import commands
//!
//! Tauri commands for importing jobs from external URLs via Schema.org parsing.

use crate::commands::{errors::user_friendly_error, AppState};
use crate::core::import::{
    fetch_job_page, parse_schema_org_job_posting, schema_org::create_preview, ImportError,
    JobImportPreview,
};
use chrono::Utc;
use serde_json::Value;
use sha2::{Digest, Sha256};
use tauri::State;

/// Preview a job import from a URL
///
/// Fetches the URL, parses Schema.org data, and returns a preview
/// without actually importing the job. User can review before confirming.
#[tauri::command]
#[tracing::instrument(skip(state), fields(url), level = "info")]
pub async fn preview_job_import(
    url: String,
    state: State<'_, AppState>,
) -> Result<JobImportPreview, String> {
    tracing::info!("Previewing job import from URL");

    // Fetch the page HTML
    let html = fetch_job_page(&url)
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

    // Check if job already exists in database
    let job_hash = calculate_job_hash(
        posting
            .hiring_organization
            .as_ref()
            .and_then(|o| o.name.as_deref())
            .unwrap_or(""),
        posting.title.as_deref().unwrap_or(""),
        &url,
    );

    let already_exists = state
        .database
        .job_exists_by_hash(&job_hash)
        .await
        .unwrap_or(false);

    // Create preview
    let preview = create_preview(posting, url.clone(), already_exists)
        .map_err(|e| format_import_error(&e))?;

    tracing::info!(
        title = %preview.title,
        company = %preview.company,
        already_exists = already_exists,
        missing_fields = preview.missing_fields.len(),
        "Import preview created"
    );

    Ok(preview)
}

/// Import a job from a URL
///
/// Fetches the URL, parses Schema.org data, and imports the job into the database.
/// Returns the created job object.
#[tauri::command]
#[tracing::instrument(skip(state), fields(url), level = "info")]
pub async fn import_job_from_url(url: String, state: State<'_, AppState>) -> Result<Value, String> {
    tracing::info!("Importing job from URL");

    // Fetch the page HTML
    let html = fetch_job_page(&url)
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

    // Calculate job hash for deduplication
    let job_hash = calculate_job_hash(company, title, &url);

    // Check if job already exists
    if state
        .database
        .job_exists_by_hash(&job_hash)
        .await
        .unwrap_or(false)
    {
        return Err("This job already exists in your database".to_string());
    }

    // Extract location
    let location = posting
        .job_location
        .as_ref()
        .and_then(extract_location_string);

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
    .bind(&url)
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
        title = %title,
        company = %company,
        "Job imported successfully"
    );

    // Fetch the created job
    let job = state
        .database
        .get_job_by_id(job_id)
        .await
        .map_err(|e| user_friendly_error("Failed to fetch imported job", e))?
        .ok_or_else(|| "Job was imported but could not be retrieved".to_string())?;

    // Convert to JSON
    serde_json::to_value(&job).map_err(|e| format!("Failed to serialize job: {}", e))
}

/// Calculate job hash for deduplication
fn calculate_job_hash(company: &str, title: &str, url: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(company.to_lowercase().as_bytes());
    hasher.update(title.to_lowercase().as_bytes());
    hasher.update(url.as_bytes());
    hex::encode(hasher.finalize())
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
    let salary = match base_salary {
        Some(s) => s,
        None => return (None, None, None),
    };

    // Handle object format
    if let Some(obj) = salary.as_object() {
        let currency = obj
            .get("currency")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());

        // Try to get value object
        if let Some(value) = obj.get("value") {
            if let Some(val_obj) = value.as_object() {
                let min = val_obj
                    .get("minValue")
                    .and_then(|v| v.as_f64())
                    .map(|v| v as i64);
                let max = val_obj
                    .get("maxValue")
                    .and_then(|v| v.as_f64())
                    .map(|v| v as i64);

                return (min, max, currency);
            }

            // Direct value field
            if let Some(val) = value.as_f64() {
                let amount = val as i64;
                return (Some(amount), Some(amount), currency);
            }
        }
    }

    (None, None, None)
}

/// Format ImportError for user display
fn format_import_error(error: &ImportError) -> String {
    match error {
        ImportError::NoSchemaOrgData => {
            "No Schema.org job data found on this page. This URL may not contain structured job posting data. Try using a direct link to a specific job listing.".to_string()
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
            "The request timed out. Please check your internet connection and try again.".to_string()
        }
        ImportError::InvalidUrl(msg) => {
            format!("Invalid URL: {}", msg)
        }
        ImportError::HttpError(e) => {
            if e.is_connect() {
                "Could not connect to the website. Please check your internet connection.".to_string()
            } else if e.is_timeout() {
                "The request timed out. Please try again.".to_string()
            } else if e.is_status() {
                format!("The website returned an error: {}", e.status().map_or_else(|| "Unknown".to_string(), |s| s.to_string()))
            } else {
                format!("Failed to fetch the page: {}", e)
            }
        }
        ImportError::HtmlParseError(msg) => {
            format!("Failed to parse the page: {}", msg)
        }
        ImportError::InvalidJsonLd(msg) => {
            format!("Invalid Schema.org data format: {}", msg)
        }
        ImportError::DatabaseError(msg) => {
            format!("Database error: {}", msg)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_job_hash() {
        let hash1 = calculate_job_hash("Google", "Software Engineer", "https://example.com/job/1");
        let hash2 = calculate_job_hash("Google", "Software Engineer", "https://example.com/job/1");
        let hash3 = calculate_job_hash("Google", "Software Engineer", "https://example.com/job/2");

        // Same inputs should produce same hash
        assert_eq!(hash1, hash2);

        // Different URL should produce different hash
        assert_ne!(hash1, hash3);
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
}
