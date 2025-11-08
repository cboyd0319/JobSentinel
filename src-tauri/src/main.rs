// Prevents additional console window on Windows in release mode
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Import library modules
use jobsentinel::commands::{self, AppState};
use jobsentinel::platforms;
use jobsentinel::{Config, Database};

use std::sync::Arc;
use tauri::Manager;

fn main() {
    // Initialize logging
    tracing_subscriber::fmt::init();

    // Initialize platform-specific features
    if let Err(e) = platforms::initialize() {
        eprintln!("Failed to initialize platform: {}", e);
        std::process::exit(1);
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
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
                    immediate_alert_threshold: 0.9,
                    scraping_interval_hours: 2,
                    alerts: jobsentinel::core::config::AlertConfig {
                        slack: jobsentinel::core::config::SlackConfig {
                            enabled: false,
                            webhook_url: String::new(),
                        },
                    },
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

            // Create AppState with Arc-wrapped shared state
            let app_state = AppState {
                config: Arc::new(config),
                database: Arc::new(database),
                scheduler: None, // Scheduler is created on-demand by commands
            };

            // Register AppState with Tauri
            app.manage(app_state);

            // Show window
            if let Some(window) = app.get_webview_window("main") {
                if let Err(e) = window.show() {
                    tracing::warn!("Failed to show window: {}", e);
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
