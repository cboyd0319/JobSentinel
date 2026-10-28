//! Owns native local-package review, writer quiescence, recovery preparation, and installer handoff.

mod installer;
mod staging;

use crate::bootstrap::{operation::OperationAdmission, AppState};
use jobsentinel_application::update_preflight::{
    revalidate_update, review_update, ReleasePublisher, ReleaseVersion, ReviewedUpdate,
};
use serde::Serialize;
use staging::StagedPackage;
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Arc,
};
use tauri::State;
use tauri_plugin_dialog::DialogExt;
use tokio::sync::Mutex;

#[derive(Default)]
pub(crate) struct LocalUpdateState {
    operation: Arc<Mutex<()>>,
    review: Mutex<Option<PendingReview>>,
    restart_required: AtomicBool,
}
impl LocalUpdateState {
    pub(crate) async fn quiesce_for_shutdown<'a>(
        &'a self,
        admission: &OperationAdmission,
    ) -> Result<tokio::sync::MutexGuard<'a, ()>, String> {
        admission.begin_shutdown()?;
        let operation = self.operation.lock().await;
        admission.close_and_wait().await?;
        *self.review.lock().await = None;
        Ok(operation)
    }
}
struct PendingReview {
    id: String,
    package: StagedPackage,
    review: ReviewedUpdate,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct LocalUpdateStatus {
    trusted_publisher_configured: bool,
    pending_review: bool,
    restart_required: bool,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct LocalUpdateReview {
    review_id: String,
    current_version: String,
    target_version: String,
    direction: &'static str,
    package_name: String,
    package_bytes: u64,
    platform: String,
    architecture: String,
    edition: String,
    compatibility_summary: String,
    component_summary: Vec<String>,
    recovery_summary: &'static str,
    requires_restart: bool,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct LocalUpdateResult {
    outcome: &'static str,
    restart_required: bool,
}

fn version(value: ReleaseVersion) -> String {
    let [a, b, c] = value.0;
    format!("{a}.{b}.{c}")
}
fn unavailable() -> String {
    "No trusted release publisher is configured. Local updates remain unavailable until release signing is configured.".into()
}
fn failure() -> String {
    "The signed package could not be verified against the reviewed local state. Select and review it again.".into()
}

#[tauri::command]
pub(crate) async fn check_update_availability(
) -> jobsentinel_application::update_preflight::UpdateAvailability {
    jobsentinel_application::update_preflight::check_update_availability().await
}

#[tauri::command]
pub(crate) async fn get_local_update_status(
    update: State<'_, LocalUpdateState>,
) -> Result<LocalUpdateStatus, String> {
    Ok(LocalUpdateStatus {
        trusted_publisher_configured: !ReleasePublisher::production_trust().is_empty(),
        pending_review: update.review.lock().await.is_some(),
        restart_required: update.restart_required.load(Ordering::Acquire),
    })
}

#[tauri::command]
pub(crate) async fn select_local_update(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    update: State<'_, LocalUpdateState>,
    admission: State<'_, Arc<OperationAdmission>>,
) -> Result<Option<LocalUpdateReview>, String> {
    let _operation = update
        .operation
        .try_lock()
        .map_err(|_| "A local update action is already running.")?;
    if update.restart_required.load(Ordering::Acquire) {
        return Err("Restart JobSentinel before reviewing another update.".into());
    }
    *update.review.lock().await = None;
    if ReleasePublisher::production_trust().is_empty() {
        return Err(unavailable());
    }
    let lease = admission.admit()?;
    let Some(selected) = app
        .dialog()
        .file()
        .set_title(
            "Choose signed JobSentinel installer (adjacent .manifest.json and .sig required)",
        )
        .blocking_pick_file()
    else {
        return Ok(None);
    };
    let path = selected.into_path().map_err(|_| failure())?;
    let data_dir = crate::desktop::get_data_dir();
    let staging_dir = data_dir.clone();
    let worker_lease = lease.clone();
    let package = tauri::async_runtime::spawn_blocking(move || {
        let _lease = worker_lease;
        staging::stage(&path, &staging_dir)
    })
    .await
    .map_err(|_| failure())??;
    review_staged(
        package,
        &state,
        &update,
        &data_dir,
        ReleasePublisher::production_trust(),
    )
    .await
    .map(Some)
}

async fn review_staged(
    package: StagedPackage,
    state: &AppState,
    update: &LocalUpdateState,
    data_dir: &std::path::Path,
    publishers: &[ReleasePublisher],
) -> Result<LocalUpdateReview, String> {
    let bytes = package.bytes()?;
    let review = review_update(
        &package.metadata,
        &package.signature,
        &bytes,
        publishers,
        &state.database,
        data_dir,
    )
    .await
    .map_err(|_| failure())?;
    let id = uuid::Uuid::new_v4().to_string();
    let manifest = review.manifest();
    let installed = review.installed();
    if manifest.version == installed.version {
        return Err("This package is already the running version.".into());
    }
    let mut component_summary = vec![format!(
        "{} signed packs and Regions remain installed; {} local model artifacts remain installed.",
        installed.pack_identity.len(),
        installed.model_identity.len()
    )];
    for component in &manifest.edition.default_components {
        if !installed.edition.default_components.contains(component) {
            component_summary.push(format!("Default app component added: {component:?}."));
        }
    }
    for component in &installed.edition.default_components {
        if !manifest.edition.default_components.contains(component) {
            component_summary.push(format!("Default app component removed: {component:?}."));
        }
    }
    component_summary.push("Browser, backup, export, Region, model, and pack compatibility were checked against the signed release.".into());
    let response = LocalUpdateReview {
        review_id: id.clone(), current_version: version(installed.version), target_version: version(manifest.version),
        direction: if manifest.version < installed.version { "rollback" } else { "update" },
        package_name: package.name.clone(), package_bytes: manifest.package_bytes,
        platform: format!("{:?}", manifest.edition.platform), architecture: format!("{:?}", manifest.edition.architecture), edition: format!("{:?}", manifest.edition.edition),
        compatibility_summary: format!("Signed readers accept current database format {} and migration {}. Existing user data is preserved.", installed.database, installed.migration),
        component_summary,
        recovery_summary: "A verified encrypted same-device database snapshot is required before opening the installer. It is not a portable backup. Older releases must be able to read current data; this does not restore old user data.", requires_restart: true,
    };
    *update.review.lock().await = Some(PendingReview {
        id,
        package,
        review,
    });
    Ok(response)
}

#[tauri::command]
pub(crate) async fn cancel_local_update(
    review_id: String,
    update: State<'_, LocalUpdateState>,
) -> Result<(), String> {
    let _operation = update
        .operation
        .try_lock()
        .map_err(|_| "A local update action is already running.")?;
    let mut review = update.review.lock().await;
    if review.as_ref().is_some_and(|item| item.id == review_id) {
        *review = None;
    }
    Ok(())
}

#[tauri::command]
pub(crate) async fn apply_local_update(
    review_id: String,
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    update: State<'_, LocalUpdateState>,
    admission: State<'_, Arc<OperationAdmission>>,
) -> Result<LocalUpdateResult, String> {
    let result = apply_reviewed(
        review_id,
        &state,
        &update,
        &admission,
        &crate::desktop::get_data_dir(),
        ReleasePublisher::production_trust(),
        |path| open::that(path),
    )
    .await?;
    app.exit(0);
    Ok(result)
}

async fn apply_reviewed(
    review_id: String,
    state: &AppState,
    update: &LocalUpdateState,
    admission: &Arc<OperationAdmission>,
    data_dir: &std::path::Path,
    publishers: &[ReleasePublisher],
    launch: impl FnOnce(&std::path::Path) -> std::io::Result<()> + Send + 'static,
) -> Result<LocalUpdateResult, String> {
    let operation = update
        .operation
        .clone()
        .try_lock_owned()
        .map_err(|_| "A local update action is already running.")?;
    let pending = update
        .review
        .lock()
        .await
        .take()
        .filter(|item| item.id == review_id)
        .ok_or_else(failure)?;
    for cancellation in state.outside_ai_cancellations.lock().await.values() {
        cancellation.send_replace(true);
    }
    match tokio::time::timeout(
        std::time::Duration::from_secs(30),
        admission.close_and_wait(),
    )
    .await
    {
        Ok(result) => result?,
        Err(_) => {
            admission.reopen();
            return Err("Local work is still running. Let it finish or cancel it, then review the update again.".into());
        }
    }
    let preparation = async {
        #[cfg(feature = "embedded-ml")]
        let _model = crate::ipc::ml::reserve_model_lifecycle(None)?;
        let bytes = pending.package.bytes()?;
        let candidate = revalidate_update(
            &pending.review,
            &pending.package.metadata,
            &pending.package.signature,
            &bytes,
            publishers,
            &state.database,
            data_dir,
        )
        .await
        .map_err(|_| failure())?;
        update.restart_required.store(true, Ordering::Release);
        crate::ipc::automation::automation_browser_commands::stop_automation_browser().await?;
        if let Some(scheduler) = &state.scheduler {
            scheduler
                .shutdown_and_wait()
                .await
                .map_err(|_| "Could not drain source checks. Restart JobSentinel.")?;
        }
        let mut server = state.bookmarklet_server.write().await;
        if server.is_running() {
            server
                .stop()
                .await
                .map_err(|_| "Could not stop the browser companion. Restart JobSentinel.")?;
        }
        drop(server);
        state
            .database
            .prepare_signed_update_snapshot(
                &version(pending.review.installed().version),
                &version(candidate.manifest().version),
                &candidate.manifest().package_sha256,
                crate::desktop::SignedUpdateRelease {
                    metadata: String::from_utf8(pending.package.metadata.clone())
                        .map_err(|_| failure())?,
                    signature: pending.package.signature.clone(),
                },
                crate::desktop::StagedUpdatePackage {
                    operation_id: pending.package.operation_id.clone(),
                    extension: pending.package.extension.clone(),
                },
            )
            .await
            .map_err(|_| {
                "Update recovery preparation failed. Restart JobSentinel before continuing."
            })?;
        installer::open_package(pending.package, operation, launch).await?;
        Ok::<(), String>(())
    }
    .await;
    if preparation.is_err() && !update.restart_required.load(Ordering::Acquire) {
        admission.reopen();
    }
    preparation?;
    Ok(LocalUpdateResult {
        outcome: "installer_opened",
        restart_required: true,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    #[tokio::test]
    async fn quit_waits_for_apply_and_workers_and_cannot_reopen_admission() {
        let update = Arc::new(LocalUpdateState::default());
        let admission = Arc::new(OperationAdmission::default());
        let worker = admission.admit().unwrap();
        let applying = update.operation.lock().await;
        let closing_update = update.clone();
        let closing_admission = admission.clone();
        let quitting = tokio::spawn(async move {
            let _guard = closing_update
                .quiesce_for_shutdown(&closing_admission)
                .await
                .unwrap();
        });
        tokio::task::yield_now().await;
        assert!(admission.closed());
        admission.reopen();
        assert!(admission.admit().is_err());
        assert!(!quitting.is_finished());
        drop(applying);
        tokio::task::yield_now().await;
        assert!(!quitting.is_finished());
        drop(worker);
        quitting.await.unwrap();
        assert!(admission.closed());
    }
}

#[cfg(test)]
mod coordinator_tests;
