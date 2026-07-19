use std::{collections::HashMap, sync::Arc};

use tokio::sync::{watch, Mutex, RwLock};

use crate::application::{config::Config, credentials::CredentialService, scheduler::Scheduler};
use crate::desktop::{BookmarkletServer, Database, DesktopServices, SchedulerStatus};
use jobsentinel_application::PendingUrlImports;

pub(crate) struct AppState {
    pub config: Arc<RwLock<Config>>,
    pub database: Arc<Database>,
    pub credentials: Arc<CredentialService>,
    pub scheduler: Option<Arc<Scheduler>>,
    pub scheduler_status: Arc<RwLock<SchedulerStatus>>,
    pub bookmarklet_server: Arc<RwLock<BookmarkletServer>>,
    pub pending_url_imports: PendingUrlImports,
    pub outside_ai_cancellations: Arc<Mutex<HashMap<String, watch::Sender<bool>>>>,
}

impl From<DesktopServices> for AppState {
    fn from(services: DesktopServices) -> Self {
        Self {
            config: services.config,
            database: services.database,
            credentials: services.credentials,
            scheduler: Some(services.scheduler),
            scheduler_status: services.scheduler_status,
            bookmarklet_server: services.bookmarklet_server,
            pending_url_imports: services.pending_url_imports,
            outside_ai_cancellations: Default::default(),
        }
    }
}
