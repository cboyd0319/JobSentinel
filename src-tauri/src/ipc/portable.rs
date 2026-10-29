//! Unlocks a selected portable profile before installing any private application services.

use crate::{bootstrap, desktop};
use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::State;
use zeroize::Zeroizing;

#[derive(Default)]
pub(crate) struct PortableStartup {
    unlocked: AtomicBool,
    operation: tokio::sync::Mutex<()>,
}

impl PortableStartup {
    pub(crate) async fn wait_for_initialization(&self) -> tokio::sync::MutexGuard<'_, ()> {
        self.operation.lock().await
    }

    pub(crate) fn unlocked(&self) -> bool {
        self.unlocked.load(Ordering::Acquire)
    }
}

pub(crate) fn startup_command_allowed(command: &str) -> bool {
    matches!(
        command,
        "get_portable_profile_status" | "unlock_portable_profile"
    )
}

#[derive(Serialize)]
pub(crate) struct PortableProfileStatus {
    portable: bool,
    unlocked: bool,
    new_profile: bool,
}

fn profile_is_new(path: &std::path::Path, config: &std::path::Path) -> Result<bool, String> {
    let new = desktop::Database::portable_primary_is_new(path)
        .map_err(|_| "Could not inspect the portable profile.")?;
    if new
        && config
            .try_exists()
            .map_err(|_| "Could not inspect portable settings.")?
    {
        return Err("Portable data is missing from an existing profile. Restore a backup into a separate profile.".into());
    }
    Ok(new)
}

#[tauri::command]
pub(crate) fn get_portable_profile_status(
    startup: State<'_, PortableStartup>,
) -> Result<PortableProfileStatus, String> {
    let portable = desktop::portable_root().is_some();
    Ok(PortableProfileStatus {
        portable,
        unlocked: !portable || startup.unlocked(),
        new_profile: portable
            && profile_is_new(
                &desktop::Database::default_path(),
                &crate::application::config::Config::default_path(),
            )?,
    })
}

#[tauri::command]
pub(crate) async fn unlock_portable_profile(
    passphrase: String,
    confirm_passphrase: Option<String>,
    app: tauri::AppHandle,
    startup: State<'_, PortableStartup>,
) -> Result<(), String> {
    let passphrase = Zeroizing::new(passphrase);
    let confirmation = confirm_passphrase.map(Zeroizing::new);
    let _operation = startup.operation.lock().await;
    if bootstrap::is_shutting_down(&app) {
        return Err("The application is shutting down.".into());
    }
    if desktop::portable_root().is_none() || startup.unlocked() {
        return Err("No locked portable profile is selected.".into());
    }
    let path = desktop::Database::default_path();
    if profile_is_new(&path, &crate::application::config::Config::default_path())?
        && confirmation.as_deref().map(String::as_str) != Some(passphrase.as_str())
    {
        return Err("Confirm the passphrase before creating the portable profile.".into());
    }
    desktop::Database::verify_portable_passphrase(&path, &passphrase)
        .await
        .map_err(|_| {
            "Could not unlock the portable profile. Check the passphrase and profile files."
        })?;
    desktop::set_portable_database_key(passphrase)
        .map_err(|_| "Could not retain the portable key for this session.")?;
    let (services, failure) = match desktop::DesktopServices::initialize().await {
        Ok(services) => (services, None),
        Err(error) => {
            let failure = error.kind();
            let services = desktop::DesktopServices::initialize_recovery()
                .await
                .map_err(|_| "Could not initialize portable recovery.")?;
            (services, Some(failure))
        }
    };
    bootstrap::install_services(&app, services, false, failure, true).await?;
    if desktop::initialize_tray(&app).is_err() {
        app.exit(1);
        return Err("Could not initialize the portable desktop session.".into());
    }
    startup.unlocked.store(true, Ordering::Release);
    Ok(())
}

#[cfg(test)]
mod tests {
    #[test]
    fn missing_primary_with_existing_settings_is_not_a_new_profile() {
        let root = tempfile::tempdir().unwrap();
        let database = root.path().join("data/jobs.db");
        let config = root.path().join("config.json");
        assert!(super::profile_is_new(&database, &config).unwrap());
        std::fs::write(&config, "{}").unwrap();
        assert!(super::profile_is_new(&database, &config).is_err());
        assert!(!database.exists());
    }

    #[tokio::test]
    async fn exit_waits_until_portable_initialization_releases_its_work() {
        let startup = std::sync::Arc::new(super::PortableStartup::default());
        let initialization = startup.operation.lock().await;
        let waiting = startup.clone();
        let exit = tokio::spawn(async move {
            let _guard = waiting.wait_for_initialization().await;
        });
        tokio::task::yield_now().await;
        assert!(!exit.is_finished());
        drop(initialization);
        exit.await.unwrap();
    }

    #[test]
    fn locked_portable_startup_only_exposes_unlock_controls() {
        for command in ["get_portable_profile_status", "unlock_portable_profile"] {
            assert!(super::startup_command_allowed(command));
        }
        for command in [
            "get_config",
            "is_first_run",
            "get_app_privacy_status",
            "stage_portable_restore",
            "store_credential",
        ] {
            assert!(!super::startup_command_allowed(command));
        }
    }
}
