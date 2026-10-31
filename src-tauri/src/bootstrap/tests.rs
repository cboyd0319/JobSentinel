//! Verifies startup admission, scheduler shutdown and portable window isolation.

use super::{
    background_cycle_allowed, configure_startup_windows, primary_initialization_allowed,
    startup_recovery_command_allowed,
};
use crate::application::{desktop::Database, scheduler::Scheduler, Config};
use std::sync::Arc;

#[tokio::test]
async fn shutdown_before_bootstrap_cycle_prevents_work() {
    let database = Database::connect_memory().await.unwrap();
    database.migrate().await.unwrap();
    let scheduler = Scheduler::new(Arc::new(Config::first_run()), Arc::new(database));
    scheduler.shutdown().unwrap();

    assert!(!background_cycle_allowed(&scheduler));
}

#[test]
fn startup_recovery_rejects_normal_and_network_commands() {
    assert!(startup_recovery_command_allowed(
        "get_startup_recovery_status"
    ));
    assert!(startup_recovery_command_allowed("stage_portable_restore"));
    assert!(!startup_recovery_command_allowed(
        "stage_dropped_portable_restore"
    ));
    assert!(startup_recovery_command_allowed("generate_feedback_report"));
    assert!(!startup_recovery_command_allowed("run_scraping_cycle"));
    assert!(!startup_recovery_command_allowed("save_config"));
    assert!(!startup_recovery_command_allowed("store_credential"));
}

#[test]
fn platform_failure_skips_primary_storage_initialization() {
    assert!(!primary_initialization_allowed(true));
    assert!(primary_initialization_allowed(false));
}

#[test]
fn package_smoke_marks_every_configured_window_incognito() {
    let mut windows = vec![
        tauri::utils::config::WindowConfig::default(),
        tauri::utils::config::WindowConfig::default(),
    ];

    assert!(configure_startup_windows(&mut windows, true, false).is_empty());

    assert!(windows.iter().all(|window| window.incognito));
    assert!(windows.iter().all(|window| window.create));
}

#[test]
fn portable_windows_do_not_use_tauri_default_storage() {
    let mut deferred = tauri::utils::config::WindowConfig::default();
    deferred.label = "deferred".into();
    deferred.create = false;
    let mut windows = vec![tauri::utils::config::WindowConfig::default(), deferred];

    let portable_windows = configure_startup_windows(&mut windows, false, true);

    assert!(windows.iter().all(|window| !window.create));
    assert_eq!(portable_windows.len(), 1);
    assert_eq!(portable_windows[0].label, "main");
    assert!(portable_windows[0].incognito);
}

#[test]
fn normal_launch_keeps_configured_window_settings() {
    let mut additional_window = tauri::utils::config::WindowConfig::default();
    additional_window.incognito = true;
    let mut windows = vec![
        tauri::utils::config::WindowConfig::default(),
        additional_window,
    ];
    let expected_windows = serde_json::to_value(&windows).unwrap();

    assert!(configure_startup_windows(&mut windows, false, false).is_empty());

    assert_eq!(serde_json::to_value(&windows).unwrap(), expected_windows);
}
