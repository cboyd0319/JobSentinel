//! Private Tauri command handlers and managed application state.

use std::sync::Arc;

use chrono::{DateTime, Utc};
use tokio::sync::RwLock;

use crate::core::{
    bookmarklet::BookmarkletServer, config::Config, credentials::CredentialService, db::Database,
    import::PendingUrlImports, scheduler::Scheduler,
};

pub(crate) mod ats;
pub(crate) mod automation;
pub(crate) mod bookmarklet;
pub(crate) mod cache;
pub(crate) mod config;
pub(crate) mod credentials;
pub(crate) mod deeplinks;
pub(crate) mod errors;
pub(crate) mod external_ai;
pub(crate) mod feedback;
pub(crate) mod geo;
pub(crate) mod ghost;
pub(crate) mod health;
pub(crate) mod import;
pub(crate) mod jobs;
pub(crate) mod limits;
pub(crate) mod linkedin_auth;
pub(crate) mod linkedin_workbench;
pub(crate) mod market;
pub(crate) mod resume;
pub(crate) mod salary;
pub(crate) mod scoring;
pub(crate) mod semantic_matching;
pub(crate) mod user_data;

#[cfg(feature = "embedded-ml")]
pub(crate) mod ml;

#[cfg(test)]
mod tests;

#[derive(Debug, Clone, Default)]
pub(crate) struct SchedulerStatus {
    pub is_running: bool,
    pub last_run: Option<DateTime<Utc>>,
    pub next_run: Option<DateTime<Utc>>,
}

pub(crate) struct AppState {
    pub config: Arc<RwLock<Config>>,
    pub database: Arc<Database>,
    pub credentials: Arc<CredentialService>,
    pub scheduler: Option<Arc<Scheduler>>,
    pub scheduler_status: Arc<RwLock<SchedulerStatus>>,
    pub bookmarklet_server: Arc<RwLock<BookmarkletServer>>,
    pub pending_url_imports: PendingUrlImports,
}
