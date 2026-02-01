//! Universal Job Importer
//!
//! Parses Schema.org/JobPosting structured data from any job URL.
//! User-initiated, single-page fetching for legal compliance.

pub mod fetcher;
pub mod schema_org;
pub mod types;

#[cfg(test)]
mod tests;

// Re-export public types
pub use fetcher::fetch_job_page;
pub use schema_org::{create_preview, parse_schema_org_job_posting};
pub use types::{ImportError, ImportResult, JobImportPreview, SchemaOrgJobPosting};
