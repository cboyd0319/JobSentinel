mod state;

use crate::desktop;
use crate::desktop::DesktopServices;
use crate::ipc;
use crate::policy;

use chrono::{Duration, Utc};
use std::sync::Arc;
use tauri::{Emitter, Manager};

pub(crate) use state::AppState;

fn background_cycle_allowed(scheduler: &crate::application::scheduler::Scheduler) -> bool {
    !scheduler.is_shutdown_requested()
}

pub(crate) fn run() {
    // Initialize logging with environment filter support
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .with_target(false)
        .with_thread_ids(true)
        .with_file(true)
        .with_line_number(true)
        .init();

    // Initialize platform-specific features
    if let Err(e) = desktop::initialize() {
        eprintln!("Failed to initialize platform: {}", e);
        std::process::exit(1);
    }

    desktop::preserve_main_window_on_close(policy::builder())
        .invoke_handler(crate::ipc::jobsentinel_command_handlers!())
        .setup(|app| {
            let services =
                tauri::async_runtime::block_on(DesktopServices::initialize()).map_err(|error| {
                    let message =
                        ipc::errors::user_friendly_error(error.context(), &error);
                    tracing::error!(error = %message, "Failed to initialize desktop services");
                    message
                })?;
            let is_first_run = services.is_first_run;
            let config_arc = Arc::clone(&services.config);
            let scheduler_arc = Arc::clone(&services.scheduler);
            let scheduler_status = Arc::clone(&services.scheduler_status);
            app.manage(AppState::from(services));

            if !is_first_run {
                tracing::info!("Starting background scheduler");

                let scheduler_clone = Arc::clone(&scheduler_arc);
                let status_clone = Arc::clone(&scheduler_status);
                let app_handle = app.handle().clone();

                // Subscribe to shutdown signal before spawning task
                let mut shutdown_rx = scheduler_arc.subscribe_shutdown();

                tauri::async_runtime::spawn(async move {
                    tracing::info!("Background scheduler task started");

                    if scheduler_clone.recover_interrupted_runs().await.is_err() {
                        tracing::error!(
                            "Background scheduler could not recover interrupted source checks"
                        );
                        return;
                    }

                    loop {
                        if !background_cycle_allowed(&scheduler_clone) {
                            let mut status = status_clone.write().await;
                            status.is_running = false;
                            status.next_run = None;
                            break;
                        }

                        let auto_refresh_enabled = {
                            let config = config_arc.read().await;
                            config.auto_refresh.enabled
                        };

                        if !auto_refresh_enabled {
                            {
                                let mut status = status_clone.write().await;
                                status.is_running = false;
                                status.next_run = None;
                            }

                            tracing::info!("Background scheduler is disabled; waiting before rechecking");
                            tokio::select! {
                                sleep_done = tokio::time::sleep(tokio::time::Duration::from_mins(1)) => {
                                    let () = sleep_done;
                                    continue;
                                }
                                _ = shutdown_rx.recv() => {
                                    tracing::info!("Background scheduler received shutdown signal, stopping gracefully");
                                    let mut status = status_clone.write().await;
                                    status.is_running = false;
                                    status.next_run = None;
                                    break;
                                }
                            }
                        }

                        // Update status atomically: running, clear next_run
                        {
                            let mut status = status_clone.write().await;
                            status.is_running = true;
                            status.next_run = None;
                            // Keep last_run from previous cycle for continuity
                        }

                        match scheduler_clone.run_scraping_cycle().await {
                            Ok(result) => {
                                tracing::info!(
                                    "Background scraping complete: {} jobs found, {} new",
                                    result.jobs_found,
                                    result.jobs_new
                                );
                                // Emit event to frontend so it can refresh
                                let _ = app_handle.emit("jobs-updated", serde_json::json!({
                                    "jobs_found": result.jobs_found,
                                    "jobs_new": result.jobs_new
                                }));
                            }
                            Err(e) => {
                                tracing::error!("Background scraping failed: {}", e);
                            }
                        }

                        let (auto_refresh_enabled, interval_hours) = {
                            let config = config_arc.read().await;
                            (config.auto_refresh.enabled, config.scraping_interval_hours)
                        };

                        // Calculate next run time first to ensure consistency
                        let now = Utc::now();
                        let next_run_time = auto_refresh_enabled
                            .then(|| now + Duration::hours(interval_hours as i64));

                        // Update status atomically: completed, set times
                        {
                            let mut status = status_clone.write().await;
                            status.is_running = false;
                            status.last_run = Some(now);
                            status.next_run = next_run_time;
                        }

                        // Wait for next interval or shutdown signal
                        let sleep_duration = if auto_refresh_enabled {
                            tokio::time::Duration::from_secs(interval_hours.saturating_mul(3600))
                        } else {
                            tokio::time::Duration::from_mins(1)
                        };
                        tokio::select! {
                            sleep_done = tokio::time::sleep(sleep_duration) => {
                                let () = sleep_done;
                                // Continue to next iteration
                            }
                            _ = shutdown_rx.recv() => {
                                tracing::info!("Background scheduler received shutdown signal, stopping gracefully");
                                // Update status to show not running
                                let mut status = status_clone.write().await;
                                status.is_running = false;
                                status.next_run = None;
                                break;
                            }
                        }
                    }

                    tracing::info!("Background scheduler stopped");
                });

                tracing::info!("Background scheduler started successfully");
            } else {
                tracing::info!("First run detected, background scheduler will start after setup");
            }

            desktop::initialize_tray(app)?;
            desktop::show_main_window(app.handle());

            tracing::info!("JobSentinel initialized successfully");

            Ok(())
        })
        .run(tauri::generate_context!())
        .map_err(|e| {
            eprintln!("Fatal error running Tauri application: {}", e);
            std::process::exit(1);
        })
        .ok();
}

#[cfg(test)]
mod tests {
    use super::background_cycle_allowed;
    use crate::application::{desktop::Database, scheduler::Scheduler, Config};
    use std::sync::Arc;

    #[tokio::test]
    async fn shutdown_before_bootstrap_cycle_prevents_work() {
        let database = Database::connect_memory().await.unwrap();
        database.migrate().await.unwrap();
        let scheduler = Scheduler::new(Arc::new(Config::first_run()), Arc::new(database));
        scheduler.shutdown().unwrap();

        assert!(!background_cycle_allowed(&scheduler));
    }
}
