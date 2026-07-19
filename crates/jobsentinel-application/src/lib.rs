//! Tauri-free JobSentinel application use cases.

mod bookmarklet;
mod external_ai;
mod fetcher;
mod pending;
pub mod privacy_doctor;
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
pub mod recovery;
pub mod restricted_source_consent;
pub mod resume;
pub mod salary;
pub mod scheduler;
pub mod scoring;
pub mod user_data;
pub mod v3_foundation;
mod v3_source_governance;
#[cfg(test)]
mod v3_source_governance_tests;
#[cfg(test)]
mod v3_source_governance_user_actions_tests;

pub use bookmarklet::{bookmarklet_repository, confirm_bookmarklet_imports};
pub use config::Config;
pub use external_ai::{
    cancel_external_ai_request, list_external_ai_activity, prepare_external_ai_request,
    send_external_ai_request, ExternalAiActivityEntry, ExternalAiActivityStatus,
    ExternalAiCancelOutcome, ExternalAiCancelResponse, ExternalAiCommandRequest,
    ExternalAiCommandResponse, ExternalAiPrepareResponse,
};
pub use jobsentinel_domain::Job;
pub use pending::PendingUrlImports;
pub use service::{
    confirm_job_import, employer_discovery_review_grant, prepare_job_import_target,
    preview_job_import,
};
pub use types::{ImportError, ImportedJobSummary, JobImportPreview};
