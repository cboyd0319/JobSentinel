use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum JobPageParseError {
    #[error("No Schema.org JobPosting data found at URL")]
    NoSchemaOrgData,

    #[error("Multiple JobPosting objects found")]
    MultipleJobPostings(usize),

    #[error("HTML parsing failed")]
    HtmlParseError(String),
}

#[derive(Debug, Clone, PartialEq)]
pub struct ParsedJobPage {
    pub title: String,
    pub company: String,
    pub location: Option<String>,
    pub description: Option<String>,
    pub description_preview: Option<String>,
    pub salary: Option<String>,
    pub salary_min: Option<i64>,
    pub salary_max: Option<i64>,
    pub currency: Option<String>,
    pub date_posted: Option<DateTime<Utc>>,
    pub valid_through: Option<DateTime<Utc>>,
    pub employment_types: Vec<String>,
    pub remote: bool,
    pub missing_fields: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct SchemaOrgJobPosting {
    #[serde(alias = "name")]
    pub title: Option<String>,
    pub description: Option<String>,
    pub hiring_organization: Option<HiringOrganization>,
    pub job_location: Option<serde_json::Value>,
    pub base_salary: Option<serde_json::Value>,
    pub date_posted: Option<String>,
    pub valid_through: Option<String>,
    pub employment_type: Option<serde_json::Value>,
    pub direct_apply: Option<bool>,
    pub url: Option<String>,
    pub industry: Option<String>,
    pub occupational_category: Option<String>,
    pub qualifications: Option<String>,
    pub responsibilities: Option<String>,
    pub benefits: Option<String>,
    pub job_location_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct HiringOrganization {
    pub name: Option<String>,
    pub logo: Option<String>,
    pub same_as: Option<String>,
}
