//! Tauri-free JobSentinel application use cases.

mod bookmarklet;
mod external_ai;
mod fetcher;
mod pending;
mod service;
#[cfg(test)]
mod test_support;
mod types;

pub mod ats;
pub mod automation;
pub mod config;
pub mod credentials;
pub mod desktop;
pub mod health;
pub mod linkedin_workbench;
pub mod market_intelligence;
pub mod notify;
pub mod resume;
pub mod salary;
pub mod scheduler;
pub mod scoring;
pub mod user_data;
pub mod v3_foundation;

pub use bookmarklet::{bookmarklet_repository, confirm_bookmarklet_imports};
pub use config::Config;
pub use external_ai::{
    send_external_ai_request, ExternalAiCommandRequest, ExternalAiCommandResponse,
};
pub use jobsentinel_domain::Job;
pub use pending::PendingUrlImports;
pub use service::{confirm_job_import, preview_job_import};
pub use types::{ImportError, ImportedJobSummary, JobImportPreview};
