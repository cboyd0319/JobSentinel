//! Enforces shared-computer locking and fresh authentication at the native boundary.

use crate::application::{config::Config, credentials::CredentialUnlockMode};
use crate::bootstrap::{operation::OperationAdmission, AppState};
use serde::Serialize;
use std::sync::Arc;
use tauri::{Emitter, Manager};
use zeroize::Zeroizing;

#[derive(Default)]
pub(crate) struct PrivacyOperation(pub tokio::sync::Mutex<()>);

#[derive(Clone, Serialize)]
pub(crate) struct AppPrivacyStatus {
    enabled: bool,
    locked: bool,
    unlock_method: &'static str,
}

pub(crate) fn locked_command_allowed(command: &str) -> bool {
    matches!(
        command,
        "get_app_privacy_status" | "lock_app" | "unlock_app" | "get_portable_profile_status"
    )
}

fn authentication_window(_app: &tauri::AppHandle) -> Result<Option<isize>, String> {
    #[cfg(windows)]
    {
        let window = _app
            .get_webview_window("main")
            .ok_or("Device verification needs the JobSentinel window.")?;
        return window
            .hwnd()
            .map(|handle| Some(handle.0 as isize))
            .map_err(|_| "Could not use the JobSentinel window for device verification.".into());
    }
    #[cfg(not(windows))]
    Ok(None)
}

fn require_visible_window(app: &tauri::AppHandle, focused: bool) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or("The JobSentinel window is unavailable.")?;
    if !window.is_visible().unwrap_or(false)
        || window.is_minimized().unwrap_or(true)
        || (focused && !window.is_focused().unwrap_or(false))
    {
        return Err("Return to JobSentinel and unlock it again.".into());
    }
    Ok(())
}

async fn status(state: &AppState, gate: &OperationAdmission) -> Result<AppPrivacyStatus, String> {
    let credential = state.credentials.unlock_status().await?;
    Ok(AppPrivacyStatus {
        enabled: state.config.read().await.shared_computer_mode,
        locked: gate.privacy_locked(),
        unlock_method: match credential.mode {
            CredentialUnlockMode::Passphrase => "passphrase",
            CredentialUnlockMode::System if cfg!(any(target_os = "macos", windows)) => "system",
            CredentialUnlockMode::System => "unavailable",
        },
    })
}

#[tauri::command]
pub(crate) async fn get_app_privacy_status(
    state: tauri::State<'_, AppState>,
    gate: tauri::State<'_, Arc<OperationAdmission>>,
    recovery: tauri::State<'_, crate::bootstrap::StartupRecoveryState>,
) -> Result<AppPrivacyStatus, String> {
    if recovery.required() {
        return Ok(AppPrivacyStatus {
            enabled: false,
            locked: false,
            unlock_method: "unavailable",
        });
    }
    status(&state, &gate).await
}

#[tauri::command]
pub(crate) async fn set_shared_computer_mode(
    enabled: bool,
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    gate: tauri::State<'_, Arc<OperationAdmission>>,
    operation: tauri::State<'_, PrivacyOperation>,
) -> Result<AppPrivacyStatus, String> {
    let _operation = operation.0.lock().await;
    if gate.privacy_locked() {
        return Err("Unlock JobSentinel before changing privacy settings.".into());
    }
    let mut config = state.config.write().await;
    if enabled {
        state
            .credentials
            .prepare_app_lock(authentication_window(&app)?)
            .await?;
    }
    if gate.privacy_locked() {
        return Err("Unlock JobSentinel before changing privacy settings.".into());
    }
    let mut next = config.clone();
    next.shared_computer_mode = enabled;
    next.save(&Config::default_path())
        .map_err(|_| "Could not save shared-computer settings.".to_string())?;
    *config = next;
    drop(config);
    let status = status(&state, &gate).await?;
    app.emit("app-privacy-changed", &status)
        .map_err(|_| "Could not refresh privacy controls.")?;
    Ok(status)
}

#[tauri::command]
pub(crate) async fn lock_app(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    gate: tauri::State<'_, Arc<OperationAdmission>>,
    operation: tauri::State<'_, PrivacyOperation>,
) -> Result<AppPrivacyStatus, String> {
    lock_session(&app, &state, &gate, &operation).await
}

async fn lock_session<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    state: &AppState,
    gate: &Arc<OperationAdmission>,
    operation: &PrivacyOperation,
) -> Result<AppPrivacyStatus, String> {
    let config = state.config.read().await;
    if !config.shared_computer_mode {
        return Err("Enable shared-computer mode before locking JobSentinel.".into());
    }
    gate.lock_privacy()?;
    drop(config);
    let _operation = operation.0.lock().await;
    let locked = status(state, gate).await?;
    app.emit("app-privacy-changed", &locked)
        .map_err(|_| "Could not refresh privacy controls.")?;
    stop_session_work(state).await?;
    Ok(locked)
}

async fn stop_session_work(state: &AppState) -> Result<(), String> {
    for cancellation in state.outside_ai_cancellations.lock().await.values() {
        cancellation.send_replace(true);
    }
    #[cfg(feature = "embedded-ml")]
    crate::ipc::ml::cancel_active_model_work();
    let scheduler_result = match &state.scheduler {
        Some(scheduler) => scheduler
            .pause_for_privacy()
            .await
            .map_err(|_| "Could not stop background work.".to_string()),
        None => Ok(()),
    };
    let mut server = state.bookmarklet_server.write().await;
    let server_result = if server.is_running() {
        server
            .stop()
            .await
            .map_err(|_| "Could not stop Browser Import.".to_string())
    } else {
        Ok(())
    };
    drop(server);
    let browser_result =
        crate::ipc::automation::automation_browser_commands::stop_automation_browser().await;
    scheduler_result?;
    server_result?;
    browser_result
}

pub(crate) fn lock_on_focus_loss<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        let (Some(state), Some(gate), Some(operation)) = (
            app.try_state::<AppState>(),
            app.try_state::<Arc<OperationAdmission>>(),
            app.try_state::<PrivacyOperation>(),
        ) else {
            return;
        };
        let enabled = state.config.read().await.shared_computer_mode;
        if enabled
            && !gate.privacy_locked()
            && lock_session(&app, &state, &gate, &operation).await.is_err()
        {
            tracing::warn!("Private session locked; background shutdown needs attention");
        }
    });
}

async fn begin_unlock<'a>(
    gate: &OperationAdmission,
    operation: &'a PrivacyOperation,
) -> Result<(tokio::sync::MutexGuard<'a, ()>, u64), String> {
    let generation = gate.authentication_generation()?;
    let guard = operation.0.lock().await;
    if gate.authentication_generation()? != generation || gate.closed() {
        return Err("The session changed. Unlock JobSentinel again.".into());
    }
    Ok((guard, generation))
}

#[tauri::command]
pub(crate) async fn unlock_app(
    passphrase: Option<String>,
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    gate: tauri::State<'_, Arc<OperationAdmission>>,
    operation: tauri::State<'_, PrivacyOperation>,
) -> Result<AppPrivacyStatus, String> {
    let passphrase = passphrase.map(Zeroizing::new);
    require_visible_window(&app, true)?;
    let (_operation, generation) = begin_unlock(&gate, &operation).await?;
    require_visible_window(&app, true)?;
    let native = matches!(
        state.credentials.unlock_status().await?.mode,
        CredentialUnlockMode::System
    );
    let _native = if native {
        Some(gate.native_authentication(generation)?)
    } else {
        None
    };
    state
        .credentials
        .verify_app_unlock(
            passphrase.as_deref().map(String::as_str),
            authentication_window(&app)?,
        )
        .await?;
    let mut status = status(&state, &gate).await?;
    require_visible_window(&app, false)?;
    tokio::time::timeout(
        std::time::Duration::from_secs(2),
        gate.wait_for_authentication_focus(generation),
    )
    .await
    .map_err(|_| "Return to JobSentinel and unlock it again.")??;
    require_visible_window(&app, true)?;
    gate.unlock_after_authentication(generation)?;
    if let Some(scheduler) = &state.scheduler {
        scheduler.resume_after_privacy();
    }
    status.locked = false;
    app.emit("app-privacy-changed", &status)
        .map_err(|_| "Could not refresh privacy controls.")?;
    Ok(status)
}

#[tauri::command]
pub(crate) async fn clear_private_session(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    gate: tauri::State<'_, Arc<OperationAdmission>>,
    operation: tauri::State<'_, PrivacyOperation>,
) -> Result<AppPrivacyStatus, String> {
    let _operation = operation.0.lock().await;
    if gate.privacy_locked() {
        return Err("Unlock JobSentinel before reviewing session cleanup.".into());
    }
    gate.lock_privacy()?;
    let generation = gate.privacy_generation()?;
    let enabled = state.config.read().await.shared_computer_mode;
    let cleanup: Result<(), String> = async {
        app.emit("app-privacy-changed", status(&state, &gate).await?)
            .map_err(|_| "Could not cover the private session.")?;
        stop_session_work(&state).await?;
        gate.wait_for_idle().await?;
        state
            .bookmarklet_server
            .write()
            .await
            .clear_pending_imports();
        state.pending_url_imports.clear();
        state.pending_military_transition_reviews.clear();
        app.state::<crate::ipc::native_file_drop::NativeFileDropState>()
            .reserve_drop();
        app.emit("private-session-cleared", ())
            .map_err(|_| "Could not clear the displayed session.")?;
        Ok(())
    }
    .await;
    if !enabled {
        gate.unlock_privacy(generation)?;
        if let Some(scheduler) = &state.scheduler {
            scheduler.resume_after_privacy();
        }
    }
    let status = status(&state, &gate).await?;
    app.emit("app-privacy-changed", &status)
        .map_err(|_| "Could not refresh privacy controls.")?;
    cleanup?;
    Ok(status)
}

#[cfg(test)]
mod tests {
    #[tokio::test]
    async fn close_rejects_queued_unlock_before_verification() {
        use std::{cell::Cell, future::Future, task::Poll};
        let gate = super::OperationAdmission::with_privacy_lock(true);
        let operation = super::PrivacyOperation::default();
        let occupied = operation.0.lock().await;
        let verified = Cell::new(false);
        let mut pending = std::pin::pin!(async {
            let (_operation, generation) = super::begin_unlock(&gate, &operation).await?;
            verified.set(true);
            gate.unlock_after_authentication(generation)
        });
        std::future::poll_fn(|context| {
            assert!(pending.as_mut().poll(context).is_pending());
            Poll::Ready(())
        })
        .await;
        gate.invalidate_authentication().unwrap();
        drop(occupied);
        assert!(pending.await.is_err());
        assert!(!verified.get());
        assert!(gate.privacy_locked());
    }

    #[tokio::test]
    async fn prompt_blur_rejects_queued_passphrase_and_native_unlocks() {
        use std::{cell::Cell, future::Future, task::Poll};
        for native_request in [false, true] {
            let gate = super::OperationAdmission::with_privacy_lock(true);
            let operation = super::PrivacyOperation::default();
            let occupied = operation.0.lock().await;
            let active_generation = gate.authentication_generation().unwrap();
            let active_native = gate.native_authentication(active_generation).unwrap();
            let verified = Cell::new(false);
            let mut pending = std::pin::pin!(async {
                let (_operation, generation) = super::begin_unlock(&gate, &operation).await?;
                let _native = if native_request {
                    Some(gate.native_authentication(generation)?)
                } else {
                    None
                };
                verified.set(true);
                gate.unlock_after_authentication(generation)
            });
            std::future::poll_fn(|context| {
                assert!(pending.as_mut().poll(context).is_pending());
                Poll::Ready(())
            })
            .await;
            gate.focus_changed(false).unwrap();
            gate.focus_changed(true).unwrap();
            gate.unlock_after_authentication(active_generation).unwrap();
            drop(active_native);
            drop(occupied);
            assert!(pending.await.is_err());
            assert!(!verified.get());
        }
    }

    #[test]
    fn locked_session_only_admits_status_and_lock_controls() {
        for command in ["get_app_privacy_status", "lock_app", "unlock_app"] {
            assert!(super::locked_command_allowed(command));
        }
        for command in [
            "get_config",
            "get_recent_jobs",
            "retrieve_credential",
            "set_shared_computer_mode",
            "open_deep_link",
            "apply_local_update",
        ] {
            assert!(!super::locked_command_allowed(command));
        }
    }
}
