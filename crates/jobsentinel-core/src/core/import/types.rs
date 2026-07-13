//! Import type definitions

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Import-specific errors
#[derive(Error, Debug)]
pub enum ImportError {
    #[error("HTTP request failed")]
    HttpError(#[from] reqwest::Error),

    #[error("HTTP response body read failed")]
    HttpBodyRead(#[from] crate::core::http_body::HttpBodyReadError),

    #[error("No Schema.org JobPosting data found at URL")]
    NoSchemaOrgData,

    #[error("Multiple JobPosting objects found - unable to choose automatically")]
    MultipleJobPostings(usize),

    #[error("Missing required field: {field}")]
    MissingRequiredField { field: String },

    #[error("Invalid JSON-LD format")]
    InvalidJsonLd(String),

    #[error("HTML parsing failed")]
    HtmlParseError(String),

    #[error("Database operation failed")]
    DatabaseError(String),

    #[error("Timeout while fetching URL")]
    Timeout,

    #[error("Redirect blocked while fetching URL")]
    RedirectBlocked { location: String },

    #[error("URL validation failed")]
    InvalidUrl(String),
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_redirect_blocked_display_does_not_expose_location() {
        let error = ImportError::RedirectBlocked {
            location: "https://user:pass@example.com/final?token=secret123#private".to_string(),
        };

        let message = error.to_string();

        assert!(message.contains("Redirect blocked"));
        assert!(!message.contains("example.com"));
        assert!(!message.contains("secret123"));
        assert!(!message.contains("user"));
        assert!(!message.contains("pass"));
        assert!(!message.contains("private"));
    }

    #[test]
    fn test_import_error_display_does_not_expose_internal_details() {
        let cases = [
            ImportError::InvalidUrl(
                "https://user:pass@example.com/job?token=secret#private".to_string(),
            ),
            ImportError::InvalidJsonLd("candidate-specific JSON-LD content".to_string()),
            ImportError::HtmlParseError("private parser detail".to_string()),
            ImportError::DatabaseError("sqlite error at <local-private-db>".to_string()),
        ];

        for error in cases {
            let message = error.to_string();
            assert!(!message.contains("secret"));
            assert!(!message.contains("candidate-specific"));
            assert!(!message.contains("private parser detail"));
            assert!(!message.contains("<local-private-db>"));
        }
    }
}

pub type ImportResult<T> = Result<T, ImportError>;

/// Raw Schema.org JobPosting data (parsed from JSON-LD)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SchemaOrgJobPosting {
    /// Job title (from "title" or "name")
    #[serde(alias = "name")]
    pub title: Option<String>,

    /// Job description (HTML or plain text)
    pub description: Option<String>,

    /// Hiring organization
    pub hiring_organization: Option<HiringOrganization>,

    /// Job location(s)
    pub job_location: Option<serde_json::Value>, // Can be single object or array

    /// Salary information
    pub base_salary: Option<serde_json::Value>, // Can be string, object, or array

    /// Date posted (ISO 8601)
    pub date_posted: Option<String>,

    /// Expiry date (ISO 8601)
    pub valid_through: Option<String>,

    /// Employment type (e.g., "FULL_TIME", "PART_TIME", "CONTRACTOR")
    pub employment_type: Option<serde_json::Value>, // Can be string or array

    /// Direct apply URL
    pub direct_apply: Option<bool>,

    /// Application URL
    pub url: Option<String>,

    /// Industry
    pub industry: Option<String>,

    /// Occupational category
    pub occupational_category: Option<String>,

    /// Qualifications
    pub qualifications: Option<String>,

    /// Responsibilities
    pub responsibilities: Option<String>,

    /// Benefits
    pub benefits: Option<String>,

    /// Remote work allowed
    pub job_location_type: Option<String>, // "TELECOMMUTE" indicates remote
}

/// Hiring organization (company) information
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HiringOrganization {
    /// Company name
    pub name: Option<String>,

    /// Company logo URL
    pub logo: Option<String>,

    /// Company website
    pub same_as: Option<String>,
}

/// Preview of what will be imported (shown to user before confirming)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobImportPreview {
    /// Job title
    pub title: String,

    /// Company name
    pub company: String,

    /// Canonical job URL after removing userinfo, fragments, and sensitive query parameters.
    pub url: String,

    /// Location (formatted)
    pub location: Option<String>,

    /// Description (truncated for preview)
    pub description_preview: Option<String>,

    /// Salary information (formatted)
    pub salary: Option<String>,

    /// Date posted
    pub date_posted: Option<DateTime<Utc>>,

    /// Expiry date
    pub valid_through: Option<DateTime<Utc>>,

    /// Employment type(s)
    pub employment_types: Vec<String>,

    /// Is remote?
    pub remote: bool,

    /// Missing required fields (if any)
    pub missing_fields: Vec<String>,

    /// Whether this job already exists in the database
    pub already_exists: bool,
}

impl JobImportPreview {
    /// Check if this preview has all required fields for import
    pub fn is_valid(&self) -> bool {
        self.missing_fields.is_empty()
    }

    /// Get validation error message
    pub fn validation_error(&self) -> Option<String> {
        if self.missing_fields.is_empty() {
            None
        } else {
            Some(format!(
                "Missing required fields: {}",
                self.missing_fields.join(", ")
            ))
        }
    }
}
