//! Constructs desktop services and reconciles startup-owned local state before use.

use std::{
    path::{Path, PathBuf},
    sync::Arc,
};

use chrono::{DateTime, NaiveDate, Utc};
use jobsentinel_domain::signed_packs::TrustedPublisherKey;
use thiserror::Error;
use tokio::sync::RwLock;

use super::{path_label_for_logging, BookmarkletConfig, BookmarkletServer, Database};
use crate::{
    credentials::CredentialService,
    pack_runtime::{
        production_trusted_publishers, reconcile_active_pack_artifacts, PackRuntimeEnvironment,
    },
    scheduler::Scheduler,
    Config, PendingUrlImports,
};

#[derive(Debug, Clone, Default)]
pub struct SchedulerStatus {
    pub is_running: bool,
    pub last_run: Option<DateTime<Utc>>,
    pub next_run: Option<DateTime<Utc>>,
}

#[derive(Debug, Error)]
pub enum DesktopStartupError {
    #[error("configuration error: {0}")]
    Configuration(String),
    #[error("database initialization error: {0}")]
    Database(String),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DesktopStartupFailureKind {
    Configuration,
    Database,
}

impl DesktopStartupError {
    #[must_use]
    pub const fn context(&self) -> &'static str {
        match self {
            Self::Configuration(_) => "Configuration error",
            Self::Database(_) => "Failed to initialize database",
        }
    }

    #[must_use]
    pub const fn kind(&self) -> DesktopStartupFailureKind {
        match self {
            Self::Configuration(_) => DesktopStartupFailureKind::Configuration,
            Self::Database(_) => DesktopStartupFailureKind::Database,
        }
    }
}

pub struct DesktopServices {
    pub config: Arc<RwLock<Config>>,
    pub database: Arc<Database>,
    pub credentials: Arc<CredentialService>,
    pub scheduler: Arc<Scheduler>,
    pub scheduler_status: Arc<RwLock<SchedulerStatus>>,
    pub bookmarklet_server: Arc<RwLock<BookmarkletServer>>,
    pub pending_url_imports: PendingUrlImports,
    pub pack_runtime: PackRuntimeEnvironment,
    pub is_first_run: bool,
}

impl DesktopServices {
    pub async fn initialize() -> Result<Self, DesktopStartupError> {
        Self::initialize_at(Config::default_path(), Database::default_path()).await
    }

    pub async fn initialize_recovery() -> Result<Self, DesktopStartupError> {
        let database = Database::connect_memory()
            .await
            .map_err(|error| DesktopStartupError::Database(error.to_string()))?;
        if let Err(error) = database.migrate().await {
            database.close().await;
            return Err(DesktopStartupError::Database(error.to_string()));
        }
        let mut key = [0_u8; 32];
        key[..16].copy_from_slice(uuid::Uuid::new_v4().as_bytes());
        key[16..].copy_from_slice(uuid::Uuid::new_v4().as_bytes());
        let credentials = CredentialService::with_fixed_master_key(database.credentials(), key);

        Ok(Self::assemble(
            Config::first_run(),
            false,
            database,
            credentials,
            PackRuntimeEnvironment::for_data_dir(&jobsentinel_platform::get_data_dir()),
        ))
    }

    async fn initialize_at(
        config_path: PathBuf,
        database_path: PathBuf,
    ) -> Result<Self, DesktopStartupError> {
        let (config, is_first_run) = load_startup_config(&config_path)?;
        tracing::info!(
            db_path = %path_label_for_logging(&database_path),
            "Connecting to database"
        );
        let authorization = crate::update_preflight::authorize_update_startup(&database_path)
            .map_err(|error| DesktopStartupError::Database(error.to_string()))?;
        let database =
            Database::connect_with_update_authorization(&database_path, authorization.as_ref())
                .await
                .map_err(|error| DesktopStartupError::Database(error.to_string()))?;

        let services = Self::initialize_ready(config, is_first_run, database).await?;
        if services.database.cleanup_update_package().is_err() {
            tracing::warn!("Retained update installer cleanup will retry on a later startup");
        }
        Ok(services)
    }

    #[cfg(test)]
    async fn initialize_with_database(
        config_path: PathBuf,
        database: Database,
    ) -> Result<Self, DesktopStartupError> {
        let (config, is_first_run) = load_startup_config(&config_path)?;
        Self::initialize_loaded(config_path, config, is_first_run, database).await
    }

    #[cfg(test)]
    async fn initialize_loaded(
        config_path: PathBuf,
        config: Config,
        is_first_run: bool,
        database: Database,
    ) -> Result<Self, DesktopStartupError> {
        if let Err(error) = database.migrate().await {
            database.close().await;
            return Err(DesktopStartupError::Database(error.to_string()));
        }
        tracing::info!("Database initialized successfully");
        let pack_runtime = PackRuntimeEnvironment::for_data_dir(
            config_path.parent().unwrap_or_else(|| Path::new(".")),
        );
        Self::initialize_ready_with_pack_runtime(
            config,
            is_first_run,
            database,
            pack_runtime,
            production_trusted_publishers(),
            Utc::now().date_naive(),
        )
        .await
    }

    async fn initialize_ready(
        config: Config,
        is_first_run: bool,
        database: Database,
    ) -> Result<Self, DesktopStartupError> {
        Self::initialize_ready_with_pack_runtime(
            config,
            is_first_run,
            database,
            PackRuntimeEnvironment::for_data_dir(&jobsentinel_platform::get_data_dir()),
            production_trusted_publishers(),
            Utc::now().date_naive(),
        )
        .await
    }

    async fn initialize_ready_with_pack_runtime(
        mut config: Config,
        is_first_run: bool,
        database: Database,
        pack_runtime: PackRuntimeEnvironment,
        trusted_publishers: &[TrustedPublisherKey],
        today: NaiveDate,
    ) -> Result<Self, DesktopStartupError> {
        let setup = async {
            let reconciled = database
                .reconcile_outside_ai_operations()
                .await
                .map_err(|error| DesktopStartupError::Database(error.to_string()))?;
            if reconciled.ambiguous > 0 || reconciled.cancelled > 0 {
                tracing::warn!(
                    ambiguous = reconciled.ambiguous,
                    cancelled = reconciled.cancelled,
                    "Reconciled interrupted Outside AI operations"
                );
            }
            crate::source_governance::install_startup_source_governance(&database).await;
            jobsentinel_platform::ensure_private_dir_tree(pack_runtime.artifact_root())
                .map_err(|error| DesktopStartupError::Database(error.to_string()))?;
            let reconciled_packs = reconcile_active_pack_artifacts(
                &database,
                pack_runtime.artifact_root(),
                trusted_publishers,
                today,
            )
            .await
            .map_err(|error| DesktopStartupError::Database(error.to_string()))?;
            if reconciled_packs.rolled_back > 0 || reconciled_packs.quarantined > 0 {
                tracing::warn!(
                    checked = reconciled_packs.checked,
                    rolled_back = reconciled_packs.rolled_back,
                    quarantined = reconciled_packs.quarantined,
                    "Reconciled active signed pack artifacts"
                );
            }
            let credentials = if jobsentinel_platform::portable_root().is_some() {
                let passphrase = jobsentinel_platform::load_or_create_database_key()
                    .await
                    .map_err(|_| {
                        DesktopStartupError::Database("Portable profile is locked".into())
                    })?;
                CredentialService::new_portable(database.credentials(), &passphrase)
                    .await
                    .map_err(DesktopStartupError::Database)?
            } else {
                CredentialService::new(database.credentials())
            };
            crate::restricted_source_consent::refresh_restricted_source_acknowledgements(
                &database,
                &mut config,
            )
            .await
            .map_err(|error| DesktopStartupError::Database(error.to_string()))?;

            Ok::<_, DesktopStartupError>(credentials)
        }
        .await;
        let credentials = match setup {
            Ok(credentials) => credentials,
            Err(error) => {
                database.close().await;
                return Err(error);
            }
        };

        Ok(Self::assemble(
            config,
            is_first_run,
            database,
            credentials,
            pack_runtime,
        ))
    }

    fn assemble(
        config: Config,
        is_first_run: bool,
        database: Database,
        credentials: CredentialService,
        pack_runtime: PackRuntimeEnvironment,
    ) -> Self {
        let bookmarklet_port = config.bookmarklet_port;
        let database = Arc::new(database);
        let credentials = Arc::new(credentials);
        let config = Arc::new(RwLock::new(config));
        let scheduler_status = Arc::new(RwLock::new(SchedulerStatus::default()));
        let scheduler = Arc::new(Scheduler::new_shared_with_credentials(
            Arc::clone(&config),
            Arc::clone(&database),
            Arc::clone(&credentials),
        ));
        let bookmarklet_server = Arc::new(RwLock::new(BookmarkletServer::new(BookmarkletConfig {
            port: bookmarklet_port,
        })));

        Self {
            config,
            database,
            credentials,
            scheduler,
            scheduler_status,
            bookmarklet_server,
            pending_url_imports: PendingUrlImports::default(),
            pack_runtime,
            is_first_run,
        }
    }
}

fn load_startup_config(config_path: &Path) -> Result<(Config, bool), DesktopStartupError> {
    let is_first_run = !config_path.exists();
    if is_first_run {
        tracing::info!("No configuration file found, first-run setup required");
        return Ok((Config::first_run(), true));
    }

    let config = Config::load(config_path)
        .map_err(|error| DesktopStartupError::Configuration(error.to_string()))?;
    tracing::info!(
        config_path = %path_label_for_logging(config_path),
        "Loaded configuration"
    );
    Ok((config, false))
}

#[cfg(test)]
#[path = "startup_tests.rs"]
mod tests;
