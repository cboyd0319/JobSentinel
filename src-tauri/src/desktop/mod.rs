//! Handles native window close, focus privacy, file drops and tray integration.

mod tray;

pub(crate) use crate::application::desktop::*;
use tauri::{Builder, Manager, Runtime, WindowEvent};
pub(crate) use tray::{initialize_tray, show_main_window};

pub(crate) fn preserve_main_window_on_close<R: Runtime>(builder: Builder<R>) -> Builder<R> {
    builder.on_window_event(|window, event| {
        if window.label() == "main" {
            if matches!(
                event,
                WindowEvent::Focused(false) | WindowEvent::CloseRequested { .. }
            ) {
                crate::ipc::privacy::lock_on_focus_loss(window.app_handle());
            }
            if let WindowEvent::DragDrop(tauri::DragDropEvent::Drop { paths, .. }) = event {
                crate::ipc::native_file_drop::capture_native_file_drop(window.app_handle(), paths);
            }
        }
        if let WindowEvent::CloseRequested { api, .. } = event {
            if portable_root().is_some()
                && window
                    .app_handle()
                    .try_state::<crate::bootstrap::AppState>()
                    .is_none()
            {
                api.prevent_close();
                window.app_handle().exit(0);
                return;
            }
            handle_close_request(window.label(), || api.prevent_close(), || window.hide());
        }
    })
}

fn handle_close_request(
    window_label: &str,
    prevent_close: impl FnOnce(),
    hide_window: impl FnOnce() -> tauri::Result<()>,
) {
    if window_label != "main" {
        return;
    }

    prevent_close();
    if let Err(error) = hide_window() {
        tracing::warn!("Failed to hide main window: {}", error);
    }
}

#[cfg(test)]
mod tests {
    use std::cell::Cell;

    #[test]
    fn close_request_prevents_close_and_hides_main_window() {
        let prevented = Cell::new(false);
        let hidden = Cell::new(false);

        super::handle_close_request(
            "main",
            || prevented.set(true),
            || {
                hidden.set(true);
                Ok(())
            },
        );

        assert!(prevented.get());
        assert!(hidden.get());
    }
}
