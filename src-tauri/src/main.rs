// Prevents additional console window on Windows in release mode
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Import library modules
use jobsentinel::commands;
use jobsentinel::platforms;

use tauri::{Manager, SystemTray, SystemTrayEvent, SystemTrayMenu, SystemTrayMenuItem};

fn main() {
    // Initialize logging
    tracing_subscriber::fmt::init();

    // Initialize platform-specific features
    if let Err(e) = platforms::initialize() {
        eprintln!("Failed to initialize platform: {}", e);
        std::process::exit(1);
    }

    // Create system tray menu
    let tray_menu = SystemTrayMenu::new()
        .add_item(SystemTrayMenuItem::new("id-open", "Open Dashboard"))
        .add_native_item(tauri::SystemTrayMenuItem::Separator)
        .add_item(SystemTrayMenuItem::new("id-search", "Search Now"))
        .add_item(SystemTrayMenuItem::new("id-settings", "Settings"))
        .add_native_item(tauri::SystemTrayMenuItem::Separator)
        .add_item(SystemTrayMenuItem::new("id-quit", "Quit"));

    let system_tray = SystemTray::new().with_menu(tray_menu);

    tauri::Builder::default()
        .system_tray(system_tray)
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::LeftClick { .. } => {
                // Show main window
                if let Some(window) = app.get_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
                "id-open" => {
                    if let Some(window) = app.get_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                "id-search" => {
                    // Trigger manual job search
                    tracing::info!("Manual search triggered from tray");
                }
                "id-settings" => {
                    // Open settings page
                    if let Some(window) = app.get_window("main") {
                        let _ = window.show();
                        let _ = window.eval("window.location.hash = '#/settings'");
                    }
                }
                "id-quit" => {
                    std::process::exit(0);
                }
                _ => {}
            },
            _ => {}
        })
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
        ])
        .setup(|app| {
            // Initialize database
            // TODO: Implement database initialization

            // Start scheduler (if auto-search is enabled)
            // TODO: Implement scheduler startup

            // Show window on first run
            if let Some(window) = app.get_window("main") {
                let _ = window.show();
            }

            tracing::info!("JobSentinel initialized successfully");

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
