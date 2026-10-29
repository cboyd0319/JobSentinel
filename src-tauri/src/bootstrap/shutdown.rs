//! Drains desktop-owned work and SQLite workers before allowing process teardown.

use std::sync::{
    atomic::{AtomicU8, Ordering},
    Mutex,
};
use tauri::Manager;

use super::AppState;

#[derive(Default)]
pub(super) struct ShutdownState {
    phase: AtomicU8,
    scheduler_task: Mutex<Option<tauri::async_runtime::JoinHandle<()>>>,
}

impl ShutdownState {
    pub(super) fn started(&self) -> bool {
        self.phase.load(Ordering::Acquire) != 0
    }

    pub(super) fn set_scheduler_task(&self, task: tauri::async_runtime::JoinHandle<()>) {
        *self.scheduler_task.lock().unwrap_or_else(|poisoned| {
            tracing::error!("Recovering poisoned scheduler task lock during shutdown");
            poisoned.into_inner()
        }) = Some(task);
    }

    fn begin(&self) -> bool {
        self.phase
            .compare_exchange(0, 1, Ordering::AcqRel, Ordering::Acquire)
            .is_ok()
    }

    pub(super) async fn drain(&self, state: &AppState) {
        if let Err(error) =
            crate::ipc::automation::automation_browser_commands::stop_automation_browser().await
        {
            tracing::error!(%error, "Application review browser shutdown failed");
        }
        if let Some(scheduler) = &state.scheduler {
            if let Err(error) = scheduler.shutdown_and_wait().await {
                tracing::error!(%error, "Scheduler shutdown failed");
            }
        }
        let task = self
            .scheduler_task
            .lock()
            .unwrap_or_else(|poisoned| {
                tracing::error!("Recovering poisoned scheduler task lock during shutdown");
                poisoned.into_inner()
            })
            .take();
        if let Some(task) = task {
            if let Err(error) = task.await {
                tracing::error!(%error, "Background scheduler terminated unexpectedly");
            }
        }
        let mut server = state.bookmarklet_server.write().await;
        if server.is_running() {
            if let Err(error) = server.stop().await {
                tracing::error!(%error, "Bookmarklet shutdown failed");
            }
        }
        drop(server);
        for cancellation in state.outside_ai_cancellations.lock().await.values() {
            cancellation.send_replace(true);
        }
        let mut stopping = state.storage_stopping.write().await;
        *stopping = true;
        state.database.close().await;
        self.finish();
    }

    fn finish(&self) {
        self.phase.store(2, Ordering::Release);
    }
}

pub(super) fn handle_event(app: &tauri::AppHandle, event: tauri::RunEvent) {
    // Restart cannot be prevented here; its caller must drain before requesting restart.
    if let tauri::RunEvent::ExitRequested { api, code, .. } = event {
        let shutdown = app.state::<ShutdownState>();
        if shutdown.phase.load(Ordering::Acquire) == 2 {
            return;
        }
        api.prevent_exit();
        if shutdown.begin() {
            let app = app.clone();
            tauri::async_runtime::spawn(async move {
                let startup = app.state::<crate::ipc::portable::PortableStartup>();
                let _initialization = startup.wait_for_initialization().await;
                let shutdown = app.state::<ShutdownState>();
                #[cfg(feature = "embedded-ml")]
                crate::ipc::ml::cancel_active_model_work();
                if let Some(state) = app.try_state::<AppState>() {
                    for cancellation in state.outside_ai_cancellations.lock().await.values() {
                        cancellation.send_replace(true);
                    }
                    let admission =
                        app.try_state::<std::sync::Arc<super::operation::OperationAdmission>>();
                    let update = app.try_state::<crate::ipc::local_update::LocalUpdateState>();
                    let _update_operation = match (admission.as_ref(), update.as_ref()) {
                        (Some(admission), Some(update)) => {
                            match update.quiesce_for_shutdown(admission).await {
                                Ok(operation) => Some(operation),
                                Err(error) => {
                                    tracing::error!(%error, "Native work could not be drained safely");
                                    return;
                                }
                            }
                        }
                        _ => None,
                    };
                    shutdown.drain(&state).await;
                } else {
                    shutdown.finish();
                }
                app.exit(code.unwrap_or(0));
            });
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn repeated_exit_requests_start_only_one_drain() {
        let state = ShutdownState::default();
        assert!(!state.started());
        assert!(state.begin());
        assert!(state.started());
        assert!(!state.begin());
        assert_eq!(state.phase.load(Ordering::Acquire), 1);
    }

    #[tokio::test]
    async fn shutdown_joins_scheduler_before_closing_database(
    ) -> Result<(), Box<dyn std::error::Error>> {
        use crate::application::{
            config::Config, credentials::CredentialService, scheduler::Scheduler,
        };
        use crate::desktop::{BookmarkletServer, Database, SchedulerStatus};
        use jobsentinel_application::pack_runtime::PackRuntimeEnvironment;
        use std::sync::Arc;
        use tokio::sync::RwLock;

        let root = tempfile::tempdir()?;
        let database = Arc::new(Database::connect_memory().await?);
        let config = Config::first_run();
        let scheduler = Arc::new(Scheduler::new(Arc::new(config.clone()), database.clone()));
        let mut stopped = scheduler.subscribe_shutdown();
        let state = AppState {
            config: Arc::new(RwLock::new(config)),
            credentials: Arc::new(CredentialService::with_fixed_master_key(
                database.credentials(),
                [23; 32],
            )),
            database: database.clone(),
            scheduler: Some(scheduler.clone()),
            scheduler_status: Arc::new(RwLock::new(SchedulerStatus::default())),
            bookmarklet_server: Arc::new(RwLock::new(BookmarkletServer::default())),
            pending_url_imports: Default::default(),
            pack_runtime: PackRuntimeEnvironment::for_data_dir(root.path()),
            pending_military_transition_reviews: Default::default(),
            storage_stopping: Default::default(),
            outside_ai_cancellations: Default::default(),
        };
        let shutdown = ShutdownState::default();
        let worker_database = database.clone();
        let (completed, completion) = tokio::sync::oneshot::channel();
        shutdown.set_scheduler_task(tauri::async_runtime::spawn(async move {
            assert!(stopped.recv().await.is_ok());
            // Owned work can finish its final database operation before closure.
            let result = worker_database.migrate().await;
            assert!(completed.send(result).is_ok());
        }));
        assert!(shutdown.begin());
        let active_work = state.begin_storage_work().await?;
        let mut draining = std::pin::pin!(shutdown.drain(&state));
        let work_completed = tokio::select! {
            biased;
            () = &mut draining => false,
            result = completion => result?.is_ok(),
        };
        assert!(work_completed, "shutdown bypassed admitted storage work");
        assert!(database.migrate().await.is_ok());
        assert_eq!(shutdown.phase.load(Ordering::Acquire), 1);
        drop(active_work);
        draining.await;
        assert!(state.begin_storage_work().await.is_err());
        assert!(scheduler.is_shutdown_requested());
        assert!(database.migrate().await.is_err());
        assert_eq!(shutdown.phase.load(Ordering::Acquire), 2);
        Ok(())
    }
}
