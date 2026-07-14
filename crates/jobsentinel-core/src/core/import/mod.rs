//! Universal Job Importer
//!
//! Parses Schema.org/JobPosting structured data from any job URL.
//! User-initiated, single-page fetching for legal compliance.

mod fetcher;
mod pending;
mod salary;
mod schema_org;
mod service;
mod types;

#[cfg(test)]
mod tests;

pub use pending::PendingUrlImports;
pub use service::{confirm_job_import, preview_job_import};
pub use types::{ImportError, ImportedJobSummary, JobImportPreview};
