//! Schema.org JobPosting parser
//!
//! Extracts and parses Schema.org/JobPosting JSON-LD data from HTML.

use super::types::{ImportError, ImportResult, JobImportPreview, SchemaOrgJobPosting};
use chrono::{DateTime, Utc};
use scraper::{Html, Selector};

/// Parse Schema.org JobPosting data from HTML
///
/// Looks for <script type="application/ld+json"> tags containing JobPosting data.
/// Returns all found JobPosting objects.
pub fn parse_schema_org_job_posting(html: &str) -> ImportResult<Vec<SchemaOrgJobPosting>> {
    let document = Html::parse_document(html);

    // Find all JSON-LD script tags
    let script_selector = Selector::parse("script[type='application/ld+json']")
        .map_err(|e| ImportError::HtmlParseError(format!("Selector parse failed: {:?}", e)))?;

    let mut job_postings = Vec::new();

    for script in document.select(&script_selector) {
        let json_text = script.inner_html();

        // Try to parse as JSON
        let json_value: serde_json::Value = match serde_json::from_str(&json_text) {
            Ok(v) => v,
            Err(e) => {
                tracing::debug!(error = %e, "Skipping invalid JSON-LD script tag");
                continue;
            }
        };

        // Extract JobPosting objects (handle @type and @graph)
        extract_job_postings(&json_value, &mut job_postings);
    }

    if job_postings.is_empty() {
        return Err(ImportError::NoSchemaOrgData);
    }

    tracing::info!(count = job_postings.len(), "Found JobPosting objects");
    Ok(job_postings)
}

/// Extract JobPosting objects from a JSON-LD value
///
/// Handles multiple formats:
/// - Single JobPosting object: {"@type": "JobPosting", ...}
/// - Array of objects: [{"@type": "JobPosting", ...}, ...]
/// - Graph format: {"@graph": [{"@type": "JobPosting", ...}, ...]}
fn extract_job_postings(value: &serde_json::Value, output: &mut Vec<SchemaOrgJobPosting>) {
    match value {
        serde_json::Value::Object(obj) => {
            // Check @type
            if let Some(type_value) = obj.get("@type") {
                if is_job_posting_type(type_value) {
                    // Try to deserialize this object as JobPosting
                    if let Ok(posting) = serde_json::from_value(value.clone()) {
                        output.push(posting);
                        return;
                    }
                }
            }

            // Check for @graph (common pattern)
            if let Some(graph) = obj.get("@graph") {
                extract_job_postings(graph, output);
            }
        }
        serde_json::Value::Array(arr) => {
            // Process each item in the array
            for item in arr {
                extract_job_postings(item, output);
            }
        }
        _ => {}
    }
}

/// Check if a @type value indicates JobPosting
fn is_job_posting_type(type_value: &serde_json::Value) -> bool {
    match type_value {
        serde_json::Value::String(s) => s == "JobPosting",
        serde_json::Value::Array(arr) => arr.iter().any(|v| {
            if let serde_json::Value::String(s) = v {
                s == "JobPosting"
            } else {
                false
            }
        }),
        _ => false,
    }
}

/// Convert Schema.org JobPosting to JobImportPreview
///
/// Validates required fields and formats data for user preview.
pub fn create_preview(
    posting: &SchemaOrgJobPosting,
    url: String,
    already_exists: bool,
) -> ImportResult<JobImportPreview> {
    let mut missing_fields = Vec::new();

    // Extract title
    let title = match &posting.title {
        Some(t) if !t.trim().is_empty() => t.clone(),
        _ => {
            missing_fields.push("title".to_string());
            String::new()
        }
    };

    // Extract company name
    let company = match &posting.hiring_organization {
        Some(org) => match &org.name {
            Some(name) if !name.trim().is_empty() => name.clone(),
            _ => {
                missing_fields.push("company name".to_string());
                String::new()
            }
        },
        None => {
            missing_fields.push("company".to_string());
            String::new()
        }
    };

    // Extract location
    let location = extract_location(&posting.job_location);

    // Extract description (truncate for preview)
    let description_preview = posting.description.as_ref().and_then(|desc| {
        let stripped = strip_html_tags(desc);
        if stripped.is_empty() {
            None
        } else {
            // Truncate to 500 characters for preview
            Some(truncate(&stripped, 500))
        }
    });

    // Extract salary
    let salary = extract_salary(&posting.base_salary);

    // Parse dates
    let date_posted = posting
        .date_posted
        .as_ref()
        .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
        .map(|dt| dt.with_timezone(&Utc));

    let valid_through = posting
        .valid_through
        .as_ref()
        .and_then(|s| DateTime::parse_from_rfc3339(s).ok())
        .map(|dt| dt.with_timezone(&Utc));

    // Extract employment types
    let employment_types = extract_employment_types(&posting.employment_type);

    // Check if remote
    let remote = posting
        .job_location_type
        .as_ref()
        .map_or(false, |t| t == "TELECOMMUTE");

    Ok(JobImportPreview {
        title,
        company,
        url,
        location,
        description_preview,
        salary,
        date_posted,
        valid_through,
        employment_types,
        remote,
        missing_fields,
        already_exists,
    })
}

/// Extract location from JobLocation (can be object or array)
fn extract_location(job_location: &Option<serde_json::Value>) -> Option<String> {
    let loc = job_location.as_ref()?;

    // Handle single location object
    if let Some(obj) = loc.as_object() {
        return format_location_object(obj);
    }

    // Handle array of locations (take first)
    if let Some(arr) = loc.as_array() {
        if let Some(first) = arr.first() {
            if let Some(obj) = first.as_object() {
                return format_location_object(obj);
            }
        }
    }

    None
}

/// Format a location object into a readable string
fn format_location_object(obj: &serde_json::Map<String, serde_json::Value>) -> Option<String> {
    // Try to get address
    if let Some(address) = obj.get("address") {
        if let Some(addr_obj) = address.as_object() {
            let mut parts = Vec::new();

            if let Some(city) = addr_obj.get("addressLocality").and_then(|v| v.as_str()) {
                parts.push(city);
            }
            if let Some(state) = addr_obj.get("addressRegion").and_then(|v| v.as_str()) {
                parts.push(state);
            }
            if let Some(country) = addr_obj.get("addressCountry").and_then(|v| v.as_str()) {
                parts.push(country);
            }

            if !parts.is_empty() {
                return Some(parts.join(", "));
            }
        }
    }

    // Fallback to name field
    obj.get("name")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
}

/// Extract salary information
fn extract_salary(base_salary: &Option<serde_json::Value>) -> Option<String> {
    let salary = base_salary.as_ref()?;

    // Handle string format
    if let Some(s) = salary.as_str() {
        return Some(s.to_string());
    }

    // Handle object format
    if let Some(obj) = salary.as_object() {
        let currency = obj
            .get("currency")
            .and_then(|v| v.as_str())
            .unwrap_or("USD");

        // Try to get value
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

                return match (min, max) {
                    (Some(min), Some(max)) => Some(format!("{} {}-{}", currency, min, max)),
                    (Some(val), None) | (None, Some(val)) => Some(format!("{} {}", currency, val)),
                    _ => None,
                };
            }

            // Direct value field
            if let Some(val) = value.as_f64() {
                return Some(format!("{} {}", currency, val as i64));
            }
        }
    }

    None
}

/// Extract employment types (can be string or array)
fn extract_employment_types(employment_type: &Option<serde_json::Value>) -> Vec<String> {
    let et = match employment_type {
        Some(v) => v,
        None => return Vec::new(),
    };

    // Handle single string
    if let Some(s) = et.as_str() {
        return vec![format_employment_type(s)];
    }

    // Handle array
    if let Some(arr) = et.as_array() {
        return arr
            .iter()
            .filter_map(|v| v.as_str().map(format_employment_type))
            .collect();
    }

    Vec::new()
}

/// Format employment type from Schema.org format to readable format
fn format_employment_type(s: &str) -> String {
    match s {
        "FULL_TIME" => "Full-time",
        "PART_TIME" => "Part-time",
        "CONTRACTOR" => "Contract",
        "TEMPORARY" => "Temporary",
        "INTERN" => "Internship",
        "VOLUNTEER" => "Volunteer",
        "PER_DIEM" => "Per Diem",
        "OTHER" => "Other",
        _ => s,
    }
    .to_string()
}

/// Strip HTML tags from a string (basic implementation)
fn strip_html_tags(html: &str) -> String {
    let document = Html::parse_fragment(html);
    document
        .root_element()
        .text()
        .collect::<Vec<_>>()
        .join(" ")
        .trim()
        .to_string()
}

/// Truncate a string to a maximum length, adding "..." if truncated
fn truncate(s: &str, max_len: usize) -> String {
    if s.len() <= max_len {
        s.to_string()
    } else {
        format!("{}...", &s[..max_len])
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_simple_job_posting() {
        let html = r#"
            <script type="application/ld+json">
            {
                "@context": "https://schema.org",
                "@type": "JobPosting",
                "title": "Software Engineer",
                "hiringOrganization": {
                    "name": "Example Corp"
                },
                "jobLocation": {
                    "address": {
                        "addressLocality": "San Francisco",
                        "addressRegion": "CA"
                    }
                }
            }
            </script>
        "#;

        let result = parse_schema_org_job_posting(html);
        assert!(result.is_ok());

        let postings = result.unwrap();
        assert_eq!(postings.len(), 1);
        assert_eq!(postings[0].title.as_deref(), Some("Software Engineer"));
    }

    #[test]
    fn test_no_schema_org_data() {
        let html = "<html><body>No JSON-LD here</body></html>";
        let result = parse_schema_org_job_posting(html);
        assert!(matches!(result, Err(ImportError::NoSchemaOrgData)));
    }

    #[test]
    fn test_format_employment_type() {
        assert_eq!(format_employment_type("FULL_TIME"), "Full-time");
        assert_eq!(format_employment_type("CONTRACTOR"), "Contract");
        assert_eq!(format_employment_type("Unknown"), "Unknown");
    }

    #[test]
    fn test_strip_html_tags() {
        let html = "<p>Hello <strong>world</strong>!</p>";
        assert_eq!(strip_html_tags(html), "Hello world !");
    }
}
