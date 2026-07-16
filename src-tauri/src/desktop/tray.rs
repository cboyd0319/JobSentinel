use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    App, AppHandle, Manager,
};

use crate::bootstrap::AppState;
use crate::ipc;

pub(crate) fn initialize_tray(app: &App) -> tauri::Result<()> {
    let search_item = MenuItem::with_id(app, "search", "Search Now", true, None::<&str>)?;
    let dashboard_item = MenuItem::with_id(app, "dashboard", "Open Dashboard", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&search_item, &dashboard_item, &quit_item])?;

    let _tray = TrayIconBuilder::new()
        .menu(&menu)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "search" => {
                tracing::info!("Manual job search triggered from tray");
                let app_handle = app.clone();
                tauri::async_runtime::spawn(async move {
                    let state = app_handle.state::<AppState>();
                    match ipc::jobs::search_jobs(state).await {
                        Ok(_) => tracing::info!("Manual search completed successfully"),
                        Err(error) => tracing::error!("Manual search failed: {}", error),
                    }
                });
            }
            "dashboard" => {
                tracing::info!("Opening dashboard from tray");
                show_main_window(app);
            }
            "quit" => {
                tracing::info!("Application quit requested from tray");
                app.exit(0);
            }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main_window(tray.app_handle());
            }
        })
        .build(app)?;

    tracing::info!("System tray initialized successfully");
    Ok(())
}

pub(crate) fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if let Err(error) = window.show() {
            tracing::warn!("Failed to show window: {}", error);
        }
        if let Err(error) = window.set_focus() {
            tracing::warn!("Failed to focus window: {}", error);
        }
        if let Err(error) = window.unminimize() {
            tracing::warn!("Failed to unminimize window: {}", error);
        }
    }
}
