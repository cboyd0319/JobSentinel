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

async fn status(state: &AppState, gate: &OperationAdmission) -> Result<AppPrivacyStatus, String> {
    let credential = state.credentials.unlock_status().await?;
    Ok(AppPrivacyStatus {
        enabled: state.config.read().await.shared_computer_mode,
        locked: gate.privacy_locked(),
        unlock_method: match credential.mode {
            CredentialUnlockMode::Passphrase => "passphrase",
            CredentialUnlockMode::System if cfg!(target_os = "macos") => "system",
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
        state.credentials.prepare_app_lock().await?;
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

#[tauri::command]
pub(crate) async fn unlock_app(
    passphrase: Option<String>,
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    gate: tauri::State<'_, Arc<OperationAdmission>>,
    operation: tauri::State<'_, PrivacyOperation>,
) -> Result<AppPrivacyStatus, String> {
    let _operation = operation.0.lock().await;
    let generation = gate.privacy_generation()?;
    let passphrase = passphrase.map(Zeroizing::new);
    state
        .credentials
        .verify_app_unlock(passphrase.as_deref().map(String::as_str))
        .await?;
    gate.unlock_privacy(generation)?;
    if let Some(scheduler) = &state.scheduler {
        scheduler.resume_after_privacy();
    }
    let status = status(&state, &gate).await?;
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
