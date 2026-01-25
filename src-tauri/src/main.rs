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
use jobsentinel::core::credentials::{migration, CredentialStore};
use jobsentinel::core::scheduler::Scheduler;
use jobsentinel::platforms;
use jobsentinel::{Config, Database};

use chrono::{Duration, Utc};
use std::sync::Arc;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};
use tauri::{Emitter, Manager};
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

    // Migrate plaintext credentials to secure storage (one-time migration)
    let config_path = Config::default_path();
    if config_path.exists() && !migration::is_migrated() {
        tracing::info!("Checking for plaintext credentials to migrate to secure storage");

        match migration::extract_plaintext_credentials(&config_path) {
            Ok(credentials) => {
                if credentials.is_empty() {
                    tracing::info!("No plaintext credentials found, marking as migrated");
                } else {
                    tracing::info!(
                        "Found {} plaintext credentials to migrate",
                        credentials.len()
                    );

                    let mut migration_success = true;
                    for (key, value) in &credentials {
                        if let Err(e) = CredentialStore::store(*key, value) {
                            tracing::error!(
                                "Failed to migrate credential {:?} to keyring: {}",
                                key,
                                e
                            );
                            migration_success = false;
                        } else {
                            tracing::info!("✓ Migrated {:?} to secure storage", key);
                        }
                    }

                    // Only clear config and mark migrated if all credentials were stored
                    if migration_success {
                        if let Err(e) = migration::clear_config_credentials(&config_path) {
                            tracing::error!(
                                "Failed to clear plaintext credentials from config: {}",
                                e
                            );
                        }
                    }
                }

                // Mark migration as complete (even if partial, to avoid repeated attempts)
                if let Err(e) = migration::set_migrated() {
                    tracing::warn!("Failed to set migration flag: {}", e);
                }
            }
            Err(e) => {
                tracing::error!(
                    "Failed to extract plaintext credentials for migration: {}",
                    e
                );
            }
        }
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_secure_storage::init())
        .invoke_handler(tauri::generate_handler![
            // Core job commands
            commands::jobs::search_jobs,
            commands::jobs::get_recent_jobs,
            commands::jobs::get_job_by_id,
            commands::jobs::search_jobs_query,
            commands::jobs::hide_job,
            commands::jobs::unhide_job,
            commands::jobs::toggle_bookmark,
            commands::jobs::get_bookmarked_jobs,
            commands::jobs::set_job_notes,
            commands::jobs::get_job_notes,
            commands::jobs::get_statistics,
            commands::jobs::get_scraping_status,
            commands::jobs::find_duplicates,
            commands::jobs::merge_duplicates,
            commands::jobs::get_jobs_by_source,
            commands::jobs::get_salary_distribution,
            // Config commands
            commands::config::save_config,
            commands::config::get_config,
            commands::config::validate_slack_webhook,
            commands::config::is_first_run,
            commands::config::complete_setup,
            commands::config::test_email_notification,
            // ATS commands
            commands::ats::create_application,
            commands::ats::get_applications_kanban,
            commands::ats::update_application_status,
            commands::ats::add_application_notes,
            commands::ats::get_pending_reminders,
            commands::ats::complete_reminder,
            commands::ats::detect_ghosted_applications,
            commands::ats::get_application_stats,
            commands::ats::schedule_interview,
            commands::ats::get_upcoming_interviews,
            commands::ats::get_past_interviews,
            commands::ats::complete_interview,
            commands::ats::delete_interview,
            // Resume Matcher commands
            commands::resume::upload_resume,
            commands::resume::get_active_resume,
            commands::resume::set_active_resume,
            commands::resume::get_user_skills,
            commands::resume::match_resume_to_job,
            commands::resume::get_match_result,
            commands::resume::get_recent_matches,
            // Skill management commands (Phase 1: Skill Validation UI)
            commands::resume::update_user_skill,
            commands::resume::delete_user_skill,
            commands::resume::add_user_skill,
            // Resume library commands (Phase 2)
            commands::resume::list_all_resumes,
            commands::resume::delete_resume,
            // Resume Builder commands (v2.0)
            commands::resume::create_resume_draft,
            commands::resume::get_resume_draft,
            commands::resume::update_resume_contact,
            commands::resume::update_resume_summary,
            commands::resume::add_resume_experience,
            commands::resume::delete_resume_experience,
            commands::resume::add_resume_education,
            commands::resume::delete_resume_education,
            commands::resume::set_resume_skills,
            commands::resume::delete_resume_draft,
            commands::resume::list_resume_templates,
            commands::resume::render_resume_html,
            commands::resume::render_resume_text,
            commands::resume::export_resume_docx,
            commands::resume::export_resume_html,
            commands::resume::export_resume_text,
            // ATS Optimizer commands (v2.0)
            commands::resume::analyze_resume_for_job,
            commands::resume::analyze_resume_format,
            commands::resume::extract_job_keywords,
            commands::resume::get_ats_power_words,
            commands::resume::improve_bullet_point,
            // Salary AI commands
            commands::salary::predict_salary,
            commands::salary::get_salary_benchmark,
            commands::salary::generate_negotiation_script,
            commands::salary::compare_offers,
            // Scoring configuration commands
            commands::scoring::get_scoring_config,
            commands::scoring::update_scoring_config,
            commands::scoring::reset_scoring_config_cmd,
            commands::scoring::validate_scoring_config,
            // Market Intelligence commands
            commands::market::get_trending_skills,
            commands::market::get_active_companies,
            commands::market::get_hottest_locations,
            commands::market::get_market_alerts,
            commands::market::run_market_analysis,
            commands::market::get_market_snapshot,
            commands::market::get_historical_snapshots,
            commands::market::mark_alert_read,
            commands::market::mark_all_alerts_read,
            // Ghost detection commands (v1.4)
            commands::ghost::get_ghost_jobs,
            commands::ghost::get_ghost_statistics,
            commands::ghost::get_recent_jobs_filtered,
            // Ghost feedback commands
            commands::ghost::mark_job_as_real,
            commands::ghost::mark_job_as_ghost,
            commands::ghost::get_ghost_feedback,
            commands::ghost::clear_ghost_feedback,
            // Ghost config commands
            commands::ghost::get_ghost_config,
            commands::ghost::set_ghost_config,
            commands::ghost::reset_ghost_config,
            // User Data commands (E3: Backend Persistence)
            commands::user_data::list_cover_letter_templates,
            commands::user_data::get_cover_letter_template,
            commands::user_data::create_cover_letter_template,
            commands::user_data::update_cover_letter_template,
            commands::user_data::delete_cover_letter_template,
            commands::user_data::seed_default_templates,
            commands::user_data::get_interview_prep_checklist,
            commands::user_data::save_interview_prep_item,
            commands::user_data::get_interview_followup,
            commands::user_data::save_interview_followup,
            commands::user_data::list_saved_searches,
            commands::user_data::create_saved_search,
            commands::user_data::use_saved_search,
            commands::user_data::delete_saved_search,
            commands::user_data::get_notification_preferences,
            commands::user_data::save_notification_preferences,
            commands::user_data::import_cover_letter_templates,
            commands::user_data::import_saved_searches,
            commands::user_data::add_search_history,
            commands::user_data::get_search_history,
            commands::user_data::clear_search_history,
            // Credential commands (v2.0 - secure storage)
            commands::credentials::store_credential,
            commands::credentials::retrieve_credential,
            commands::credentials::delete_credential,
            commands::credentials::has_credential,
            commands::credentials::get_credential_status,
            // LinkedIn auth commands (in-app login flow)
            commands::linkedin_auth::linkedin_login,
            commands::linkedin_auth::store_linkedin_cookie,
            commands::linkedin_auth::is_linkedin_connected,
            commands::linkedin_auth::disconnect_linkedin,
            commands::linkedin_auth::close_linkedin_login,
            commands::linkedin_auth::get_linkedin_expiry_status,
            // Automation commands (One-Click Apply)
            commands::automation::upsert_application_profile,
            commands::automation::get_application_profile,
            commands::automation::upsert_screening_answer,
            commands::automation::get_screening_answers,
            commands::automation::find_answer_for_question,
            commands::automation::create_automation_attempt,
            commands::automation::get_automation_attempt,
            commands::automation::approve_automation_attempt,
            commands::automation::cancel_automation_attempt,
            commands::automation::get_pending_attempts,
            commands::automation::get_automation_stats,
            commands::automation::detect_ats_platform,
            commands::automation::detect_ats_from_html,
            // Browser control commands
            commands::automation::launch_automation_browser,
            commands::automation::close_automation_browser,
            commands::automation::is_browser_running,
            commands::automation::fill_application_form,
            commands::automation::take_automation_screenshot,
            commands::automation::mark_attempt_submitted,
            commands::automation::get_attempts_for_job,
            // Health monitoring commands (v2.1)
            commands::health::get_scraper_health,
            commands::health::get_health_summary,
            commands::health::get_scraper_configs,
            commands::health::set_scraper_enabled,
            commands::health::get_scraper_runs,
            commands::health::run_scraper_smoke_test,
            commands::health::run_all_smoke_tests,
            commands::health::get_linkedin_cookie_health,
            commands::health::get_expiring_credentials,
            // Cache management commands
            commands::cache::get_score_cache_stats,
            commands::cache::clear_scoring_cache,
            commands::cache::get_cache_health,
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
                    remoteok: Default::default(),
                    weworkremotely: Default::default(),
                    builtin: Default::default(),
                    hn_hiring: Default::default(),
                    dice: Default::default(),
                    yc_startup: Default::default(),
                    usajobs: Default::default(),
                    simplyhired: Default::default(),
                    glassdoor: Default::default(),
                    jobswithgpt_endpoint: "https://api.jobswithgpt.com/mcp".to_string(),
                    salary_target_usd: None,
                    penalize_missing_salary: false,
                    company_whitelist: vec![],
                    company_blacklist: vec![],
                    use_resume_matching: false,
                    ghost_config: None,
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
                let app_handle = app.handle().clone();

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
