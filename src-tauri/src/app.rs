use crate::application::credentials::{
    clear_config_credentials, extract_plaintext_credentials, is_migrated, set_migrated,
    CredentialService,
};
use crate::application::scheduler::Scheduler;
use crate::application::Config;
use crate::commands::{self, AppState, SchedulerStatus};
use crate::desktop;
use crate::desktop::{path_label_for_logging, BookmarkletConfig, BookmarkletServer, Database};

use chrono::{Duration, Utc};
use std::{path::Path, sync::Arc};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};
use tauri::{Emitter, Manager};
use tokio::sync::RwLock;

async fn migrate_plaintext_credentials_to_secure_storage(
    config_path: &Path,
    credentials: &CredentialService,
) -> bool {
    if !config_path.exists() || is_migrated() {
        return false;
    }

    tracing::info!("Checking for plaintext credentials to migrate to secure storage");

    let credentials_to_migrate = match extract_plaintext_credentials(config_path) {
        Ok(credentials_to_migrate) => credentials_to_migrate,
        Err(e) => {
            tracing::error!(
                "Failed to extract plaintext credentials for migration: {}",
                e
            );
            return false;
        }
    };

    let mark_migration_complete = if credentials_to_migrate.is_empty() {
        tracing::info!("No active plaintext credentials found");
        if let Err(e) = clear_config_credentials(config_path) {
            tracing::error!("Failed to clear legacy credential fields: {}", e);
            tracing::warn!("Secure-storage migration will retry on next startup");
            false
        } else {
            true
        }
    } else {
        tracing::info!(
            "Found {} plaintext credentials to migrate",
            credentials_to_migrate.len()
        );

        let mut migration_success = true;
        for (key, value) in &credentials_to_migrate {
            if let Err(e) = credentials.store(*key, value).await {
                tracing::error!(
                    "Failed to migrate credential {:?} to secure storage: {}",
                    key,
                    e
                );
                migration_success = false;
            } else {
                tracing::info!("Migrated {:?} to secure storage", key);
            }
        }

        if migration_success {
            if let Err(e) = clear_config_credentials(config_path) {
                tracing::error!("Failed to clear plaintext credentials from config: {}", e);
                tracing::warn!("Secure-storage migration will retry on next startup");
                false
            } else {
                true
            }
        } else {
            tracing::warn!("Secure-storage migration incomplete; will retry on next startup");
            false
        }
    };

    if mark_migration_complete {
        if let Err(e) = set_migrated() {
            tracing::warn!("Failed to set migration flag: {}", e);
        }
    }

    mark_migration_complete
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

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(crate::command_handlers::jobsentinel_command_handlers!())
        .setup(|app| {
            // Initialize configuration
            let config_path = Config::default_path();
            let mut config = if config_path.exists() {
                match Config::load(&config_path) {
                    Ok(cfg) => {
                        tracing::info!(
                            config_path = %path_label_for_logging(&config_path),
                            "Loaded configuration"
                        );
                        cfg
                    }
                    Err(e) => {
                        let message =
                            commands::errors::user_friendly_error("Configuration error", &e);
                        tracing::error!(
                            config_path = %path_label_for_logging(&config_path),
                            error = %message,
                            "Failed to load configuration"
                        );
                        return Err(message.into());
                    }
                }
            } else {
                tracing::info!("No configuration file found, first-run setup required");
                // Default config for first run (will be set by setup wizard)
                Config {
                    title_allowlist: vec![],
                    title_blocklist: vec![],
                    keywords_boost: vec![],
                    keywords_exclude: vec![],
                    location_preferences: crate::application::config::LocationPreferences {
                        allow_remote: true,
                        allow_hybrid: false,
                        allow_onsite: false,
                        cities: vec![],
                        states: vec![],
                        country: "US".to_string(),
                    },
                    salary_floor_usd: 0,
                    auto_refresh: Default::default(),
                    bookmarklet_port: 4321,
                    immediate_alert_threshold: 0.9,
                    scraping_interval_hours: 2,
                    alerts: Default::default(),
                    greenhouse_urls: vec![],
                    lever_urls: vec![],
                    linkedin: Default::default(),
                    restricted_source_acknowledgements: Default::default(),
                    remoteok: Default::default(),
                    weworkremotely: Default::default(),
                    builtin: Default::default(),
                    hn_hiring: Default::default(),
                    dice: Default::default(),
                    yc_startup: Default::default(),
                    usajobs: Default::default(),
                    simplyhired: Default::default(),
                    glassdoor: Default::default(),
                    jobswithgpt_endpoint: String::new(),
                    jobswithgpt_approval: Default::default(),
                    external_ai: Default::default(),
                    salary_target_usd: None,
                    penalize_missing_salary: false,
                    preferred_companies: vec![],
                    blocked_companies: vec![],
                    use_resume_matching: false,
                    ghost_config: None,
                }
            };

            // Initialize database
            let db_path = Database::default_path();
            tracing::info!(
                db_path = %path_label_for_logging(&db_path),
                "Connecting to database"
            );

            let database = tauri::async_runtime::block_on(async {
                let db = Database::connect(&db_path).await.map_err(|e| {
                    let message =
                        commands::errors::user_friendly_error("Failed to initialize database", &e);
                    tracing::error!(
                        db_path = %path_label_for_logging(&db_path),
                        error = %message,
                        "Failed to connect to database"
                    );
                    message
                })?;

                db.migrate().await.map_err(|e| {
                    let message =
                        commands::errors::user_friendly_error("Failed to initialize database", &e);
                    tracing::error!(error = %message, "Failed to run database migrations");
                    message
                })?;

                Ok::<Database, String>(db)
            })?;

            tracing::info!("Database initialized successfully");

            let database_arc = Arc::new(database);
            let credentials_arc = Arc::new(CredentialService::new(database_arc.credentials()));
            let reload_config_after_migration =
                tauri::async_runtime::block_on(migrate_plaintext_credentials_to_secure_storage(
                    &config_path,
                    credentials_arc.as_ref(),
                ));

            if reload_config_after_migration {
                config = Config::load(&config_path).map_err(|e| {
                    let message = commands::errors::user_friendly_error("Configuration error", &e);
                    tracing::error!(
                        config_path = %path_label_for_logging(&config_path),
                        error = %message,
                        "Failed to reload configuration after secure-storage migration"
                    );
                    message
                })?;
            }

            let bookmarklet_port = config.bookmarklet_port;

            // Wrap shared state in Arc
            let config_arc = Arc::new(RwLock::new(config));

            // Initialize scheduler status tracking
            let scheduler_status = Arc::new(RwLock::new(SchedulerStatus::default()));

            // Create scheduler (will be started after setup if not first run)
            let scheduler = Scheduler::new_shared_with_credentials(
                Arc::clone(&config_arc),
                Arc::clone(&database_arc),
                Arc::clone(&credentials_arc),
            );
            let scheduler_arc = Arc::new(scheduler);

            // Create bookmarklet server (not started automatically)
            let bookmarklet_config = BookmarkletConfig {
                port: bookmarklet_port,
                ..Default::default()
            };
            let bookmarklet_server = Arc::new(RwLock::new(BookmarkletServer::new(bookmarklet_config)));

            // Create AppState with Arc-wrapped shared state
            let app_state = AppState {
                config: Arc::clone(&config_arc),
                database: Arc::clone(&database_arc),
                credentials: Arc::clone(&credentials_arc),
                scheduler: Some(Arc::clone(&scheduler_arc)),
                scheduler_status: Arc::clone(&scheduler_status),
                bookmarklet_server: Arc::clone(&bookmarklet_server),
                pending_url_imports: Default::default(),
            };

            // Register AppState with Tauri
            app.manage(app_state);

            // Start background scheduler (only if not first run)
            let config_path = Config::default_path();
            if config_path.exists() {
                tracing::info!("Starting background scheduler");

                let scheduler_clone = Arc::clone(&scheduler_arc);
                let status_clone = Arc::clone(&scheduler_status);
                let app_handle = app.handle().clone();

                // Subscribe to shutdown signal before spawning task
                let mut shutdown_rx = scheduler_arc.subscribe_shutdown();

                tauri::async_runtime::spawn(async move {
                    tracing::info!("Background scheduler task started");

                    loop {
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

                        // Run scraping cycle
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

            // Initialize system tray
            let search_item =
                MenuItem::with_id(app, "search", "Search Now", true, None::<&str>)?;
            let dashboard_item =
                MenuItem::with_id(app, "dashboard", "Open Dashboard", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

            let menu = Menu::with_items(app, &[&search_item, &dashboard_item, &quit_item])?;

            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "search" => {
                            tracing::info!("Manual job search triggered from tray");
                            let app_handle = app.clone();
                            tauri::async_runtime::spawn(async move {
                                let state = app_handle.state::<AppState>();
                                match commands::jobs::search_jobs(state).await {
                                    Ok(_) => tracing::info!("Manual search completed successfully"),
                                    Err(e) => tracing::error!("Manual search failed: {}", e),
                                }
                            });
                        }
                        "dashboard" => {
                            tracing::info!("Opening dashboard from tray");
                            if let Some(window) = app.get_webview_window("main") {
                                if let Err(e) = window.show() {
                                    tracing::warn!("Failed to show window: {}", e);
                                }
                                if let Err(e) = window.set_focus() {
                                    tracing::warn!("Failed to focus window: {}", e);
                                }
                                if let Err(e) = window.unminimize() {
                                    tracing::warn!("Failed to unminimize window: {}", e);
                                }
                            }
                        }
                        "quit" => {
                            tracing::info!("Application quit requested from tray");
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    // Handle click on tray icon - always show window (don't toggle)
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            // Always show and focus - no toggle
                            let _ = window.show();
                            let _ = window.set_focus();
                            let _ = window.unminimize();
                        }
                    }
                })
                .build(app)?;

            tracing::info!("System tray initialized successfully");

            // Show window and bring to front
            if let Some(window) = app.get_webview_window("main") {
                if let Err(e) = window.show() {
                    tracing::warn!("Failed to show window: {}", e);
                }
                if let Err(e) = window.set_focus() {
                    tracing::warn!("Failed to focus window: {}", e);
                }
                // On macOS, also unminimize in case it's minimized
                #[cfg(target_os = "macos")]
                {
                    let _ = window.unminimize();
                }
            }

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
