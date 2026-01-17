// Prevents additional console window on Windows in release mode
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
// Clippy configuration for binary
#![allow(clippy::uninlined_format_args)]
#![allow(clippy::significant_drop_tightening)]
#![allow(clippy::too_many_lines)]
#![allow(clippy::ignored_unit_patterns)]
#![allow(clippy::cast_possible_wrap)]
#![allow(clippy::cast_sign_loss)]
#![allow(clippy::default_trait_access)]

// Import library modules
use jobsentinel::commands::{self, AppState, SchedulerStatus};
use jobsentinel::core::scheduler::Scheduler;
use jobsentinel::platforms;
use jobsentinel::{Config, Database};

use chrono::{Duration, Utc};
use std::sync::Arc;
use tauri::Manager;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};
use tokio::sync::RwLock;

fn main() {
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
    if let Err(e) = platforms::initialize() {
        eprintln!("Failed to initialize platform: {}", e);
        std::process::exit(1);
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            // Core job commands
            commands::search_jobs,
            commands::get_recent_jobs,
            commands::get_job_by_id,
            commands::save_config,
            commands::get_config,
            commands::validate_slack_webhook,
            commands::get_statistics,
            commands::get_scraping_status,
            commands::is_first_run,
            commands::complete_setup,
            commands::search_jobs_query,
            commands::hide_job,
            commands::unhide_job,
            commands::toggle_bookmark,
            commands::get_bookmarked_jobs,
            commands::set_job_notes,
            commands::get_job_notes,
            // ATS commands
            commands::create_application,
            commands::get_applications_kanban,
            commands::update_application_status,
            commands::add_application_notes,
            commands::get_pending_reminders,
            commands::complete_reminder,
            commands::detect_ghosted_applications,
            commands::get_application_stats,
            // Interview commands
            commands::schedule_interview,
            commands::get_upcoming_interviews,
            commands::get_past_interviews,
            commands::complete_interview,
            commands::delete_interview,
            // Deduplication commands
            commands::find_duplicates,
            commands::merge_duplicates,
            // Resume Matcher commands
            commands::upload_resume,
            commands::get_active_resume,
            commands::set_active_resume,
            commands::get_user_skills,
            commands::match_resume_to_job,
            commands::get_match_result,
            commands::get_recent_matches,
            // Salary AI commands
            commands::predict_salary,
            commands::get_salary_benchmark,
            commands::generate_negotiation_script,
            commands::compare_offers,
            // Market Intelligence commands
            commands::get_trending_skills,
            commands::get_active_companies,
            commands::get_hottest_locations,
            commands::get_market_alerts,
            commands::run_market_analysis,
            // User Data commands (E3: Backend Persistence)
            commands::list_cover_letter_templates,
            commands::get_cover_letter_template,
            commands::create_cover_letter_template,
            commands::update_cover_letter_template,
            commands::delete_cover_letter_template,
            commands::get_interview_prep_checklist,
            commands::save_interview_prep_item,
            commands::get_interview_followup,
            commands::save_interview_followup,
            commands::list_saved_searches,
            commands::create_saved_search,
            commands::use_saved_search,
            commands::delete_saved_search,
            commands::get_notification_preferences,
            commands::save_notification_preferences,
            commands::import_cover_letter_templates,
            commands::import_saved_searches,
            commands::add_search_history,
            commands::get_search_history,
            commands::clear_search_history,
        ])
        .setup(|app| {
            // Initialize configuration
            let config_path = Config::default_path();
            let config = if config_path.exists() {
                match Config::load(&config_path) {
                    Ok(cfg) => {
                        tracing::info!("Loaded configuration from {:?}", config_path);
                        cfg
                    }
                    Err(e) => {
                        tracing::error!("Failed to load config: {}", e);
                        return Err(format!("Configuration error: {}", e).into());
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
                    location_preferences: jobsentinel::core::config::LocationPreferences {
                        allow_remote: true,
                        allow_hybrid: false,
                        allow_onsite: false,
                        cities: vec![],
                        states: vec![],
                        country: "US".to_string(),
                    },
                    salary_floor_usd: 0,
                    auto_refresh: Default::default(),
                    immediate_alert_threshold: 0.9,
                    scraping_interval_hours: 2,
                    alerts: Default::default(),
                    greenhouse_urls: vec![],
                    lever_urls: vec![],
                    linkedin: Default::default(),
                    indeed: Default::default(),
                    jobswithgpt_endpoint: "https://api.jobswithgpt.com/mcp".to_string(),
                }
            };

            // Initialize database
            let db_path = Database::default_path();
            tracing::info!("Connecting to database at {:?}", db_path);

            let database = tauri::async_runtime::block_on(async {
                let db = Database::connect(&db_path)
                    .await
                    .map_err(|e| format!("Failed to connect to database: {}", e))?;

                db.migrate()
                    .await
                    .map_err(|e| format!("Failed to run migrations: {}", e))?;

                Ok::<Database, String>(db)
            })?;

            tracing::info!("Database initialized successfully");

            // Wrap shared state in Arc
            let config_arc = Arc::new(config);
            let database_arc = Arc::new(database);

            // Initialize scheduler status tracking
            let scheduler_status = Arc::new(RwLock::new(SchedulerStatus::default()));

            // Create scheduler (will be started after setup if not first run)
            let scheduler = Scheduler::new(Arc::clone(&config_arc), Arc::clone(&database_arc));
            let scheduler_arc = Arc::new(scheduler);

            // Create AppState with Arc-wrapped shared state
            let app_state = AppState {
                config: Arc::clone(&config_arc),
                database: Arc::clone(&database_arc),
                scheduler: Some(Arc::clone(&scheduler_arc)),
                scheduler_status: Arc::clone(&scheduler_status),
            };

            // Register AppState with Tauri
            app.manage(app_state);

            // Start background scheduler (only if not first run)
            let config_path = Config::default_path();
            if config_path.exists() {
                tracing::info!("Starting background scheduler");

                let scheduler_clone = Arc::clone(&scheduler_arc);
                let status_clone = Arc::clone(&scheduler_status);
                let interval_hours = config_arc.scraping_interval_hours;

                // Subscribe to shutdown signal before spawning task
                let mut shutdown_rx = scheduler_arc.subscribe_shutdown();

                tauri::async_runtime::spawn(async move {
                    // Run immediately on startup, then periodically
                    tracing::info!("Running initial scraping cycle on startup");

                    loop {
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
                            }
                            Err(e) => {
                                tracing::error!("Background scraping failed: {}", e);
                            }
                        }

                        // Calculate next run time first to ensure consistency
                        let now = Utc::now();
                        let next_run_time = now + Duration::hours(interval_hours as i64);

                        // Update status atomically: completed, set times
                        {
                            let mut status = status_clone.write().await;
                            status.is_running = false;
                            status.last_run = Some(now);
                            status.next_run = Some(next_run_time);
                        }

                        // Wait for next interval or shutdown signal
                        let sleep_duration = tokio::time::Duration::from_secs(interval_hours * 3600);
                        tokio::select! {
                            _ = tokio::time::sleep(sleep_duration) => {
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
                                match commands::search_jobs(state).await {
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
