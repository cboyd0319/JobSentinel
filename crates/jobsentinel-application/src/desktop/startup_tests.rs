//! Exercises desktop startup, recovery, and pre-service pack reconciliation.

use super::*;
use crate::pack_runtime_tests::{signed_source_pack, stage_and_activate, PACK_ID, PUBLISHER_ID};
use chrono::NaiveDate;
use jobsentinel_storage::pack_lifecycle::PackAvailability;

#[tokio::test]
async fn initializes_first_run_desktop_services() {
    let temp_dir = tempfile::tempdir_in(std::env::current_dir().unwrap()).unwrap();
    let database = Database::connect_memory().await.unwrap();
    let services =
        DesktopServices::initialize_with_database(temp_dir.path().join("config.json"), database)
            .await
            .unwrap();

    assert!(services.is_first_run);
    assert!(!services.config.read().await.auto_refresh.enabled);
    assert_eq!(services.bookmarklet_server.read().await.config().port, 4321);
    assert_eq!(
        services.database.get_statistics().await.unwrap().total_jobs,
        0
    );
}

#[tokio::test]
async fn reconciles_active_pack_artifacts_before_constructing_services() {
    let temp_dir = tempfile::tempdir_in(std::env::current_dir().unwrap()).unwrap();
    let database = Database::connect_memory().await.unwrap();
    database.migrate().await.unwrap();
    let pack_runtime = PackRuntimeEnvironment::for_data_dir(temp_dir.path());
    let (publisher, _) = signed_source_pack(1);
    stage_and_activate(&database, pack_runtime.artifact_root(), &publisher, 1).await;
    let artifact = std::fs::read_dir(pack_runtime.artifact_root())
        .unwrap()
        .next()
        .unwrap()
        .unwrap()
        .path();
    std::fs::remove_dir_all(artifact).unwrap();

    let services = DesktopServices::initialize_ready_with_pack_runtime(
        Config::first_run(),
        true,
        database,
        pack_runtime,
        std::slice::from_ref(&publisher),
        NaiveDate::from_ymd_opt(2026, 8, 12).unwrap(),
    )
    .await
    .unwrap();

    let stream = services
        .database
        .get_pack_stream(PUBLISHER_ID, PACK_ID)
        .await
        .unwrap();
    assert_eq!(stream.availability, PackAvailability::Quarantined);
    assert_eq!(
        services.pack_runtime.artifact_root(),
        temp_dir.path().join("pack-artifacts")
    );
}

#[tokio::test]
async fn pack_artifact_root_failure_prevents_service_construction() {
    let temp_dir = tempfile::tempdir_in(std::env::current_dir().unwrap()).unwrap();
    let database = Database::connect_memory().await.unwrap();
    database.migrate().await.unwrap();
    let storage_probe = database.credentials();
    assert!(storage_probe
        .secret_exists("synthetic-shutdown-probe")
        .await
        .is_ok());
    let pack_runtime = PackRuntimeEnvironment::for_data_dir(temp_dir.path());
    std::fs::write(pack_runtime.artifact_root(), b"not a directory").unwrap();

    let result = DesktopServices::initialize_ready_with_pack_runtime(
        Config::first_run(),
        true,
        database,
        pack_runtime,
        production_trusted_publishers(),
        NaiveDate::from_ymd_opt(2026, 8, 12).unwrap(),
    )
    .await;

    assert!(matches!(result, Err(DesktopStartupError::Database(_))));
    assert!(storage_probe
        .secret_exists("synthetic-shutdown-probe")
        .await
        .is_err());
}

#[tokio::test]
async fn rejects_invalid_saved_config_before_constructing_services() {
    let temp_dir = tempfile::tempdir().unwrap();
    let config_path = temp_dir.path().join("config.json");
    std::fs::write(&config_path, "{").unwrap();

    let result = DesktopServices::initialize_at(config_path, temp_dir.path().join("jobs.db")).await;

    let error = match result {
        Err(error) => error,
        Ok(_) => panic!("invalid configuration unexpectedly initialized"),
    };
    assert!(matches!(error, DesktopStartupError::Configuration(_)));
    assert_eq!(error.kind(), DesktopStartupFailureKind::Configuration);
}

#[tokio::test]
async fn recovery_services_are_ephemeral_offline_and_keychain_free() {
    let services = DesktopServices::initialize_recovery().await.unwrap();

    assert!(!services.is_first_run);
    assert!(!services.config.read().await.auto_refresh.enabled);
    assert!(services.credentials.unlock_status().await.unwrap().unlocked);
    assert_eq!(
        services.database.get_statistics().await.unwrap().total_jobs,
        0
    );
}

#[test]
fn portable_desktop_services_reopen_after_profile_move() {
    use crate::credentials::{CredentialKey, CredentialUnlockMode};
    use std::{collections::BTreeMap, fs, process::Command};

    const PHASE: &str = "JOBSENTINEL_TEST_PORTABLE_STARTUP_PHASE";
    const ROOT: &str = "JOBSENTINEL_TEST_PORTABLE_STARTUP_ROOT";
    const PASSPHRASE: &str = "synthetic portable startup passphrase";
    const RECORD: &str = "synthetic portable search";
    const CREDENTIAL: &str = "synthetic portable saved detail";

    fn durable_files(root: &Path) -> BTreeMap<PathBuf, Vec<u8>> {
        let mut pending = vec![root.to_path_buf()];
        let mut files = BTreeMap::new();
        while let Some(directory) = pending.pop() {
            for entry in fs::read_dir(directory).unwrap() {
                let path = entry.unwrap().path();
                if path.is_dir() {
                    pending.push(path);
                } else if path != root.join("data/jobs.db-shm") {
                    let bytes = fs::read(&path).unwrap();
                    files.insert(path, bytes);
                }
            }
        }
        files
    }

    let Ok(phase) = std::env::var(PHASE) else {
        let directory = tempfile::tempdir().unwrap();
        let original = directory.path().canonicalize().unwrap().join("original");
        let moved = original.with_file_name("moved");
        jobsentinel_platform::ensure_private_dir(&original).unwrap();
        let run = |phase: &str, root: &Path| {
            let status = Command::new(std::env::current_exe().unwrap())
                .args([
                    "--exact",
                    "desktop::startup::tests::portable_desktop_services_reopen_after_profile_move",
                    "--nocapture",
                ])
                .env(PHASE, phase)
                .env(ROOT, root)
                .status()
                .unwrap();
            assert!(status.success(), "portable startup phase failed: {phase}");
        };
        run("create", &original);
        assert!(original.join("data/jobs.db").is_file());
        fs::rename(&original, &moved).unwrap();
        let before = durable_files(&moved);
        run("refuse", &moved);
        assert!(
            before == durable_files(&moved),
            "rejected unlock changed durable profile files"
        );
        run("reopen", &moved);
        assert!(!original.exists());
        return;
    };

    let root = PathBuf::from(std::env::var_os(ROOT).unwrap());
    jobsentinel_platform::select_portable_root(&root).unwrap();
    assert_eq!(jobsentinel_platform::portable_root(), Some(root.as_path()));
    assert_eq!(Database::default_path(), root.join("data/jobs.db"));
    assert_eq!(Config::default_path(), root.join("config/config.json"));
    tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap()
        .block_on(async {
            let database = Database::default_path();
            assert!(jobsentinel_platform::load_or_create_database_key()
                .await
                .is_err());
            if phase == "refuse" {
                assert!(Database::verify_portable_passphrase(
                    &database,
                    "incorrect portable passphrase"
                )
                .await
                .is_err());
                assert!(jobsentinel_platform::load_or_create_database_key()
                    .await
                    .is_err());
                return;
            }
            assert!(matches!(phase.as_str(), "create" | "reopen"));
            assert_eq!(
                Database::portable_primary_is_new(&database).unwrap(),
                phase == "create"
            );
            Database::verify_portable_passphrase(&database, PASSPHRASE)
                .await
                .unwrap();
            jobsentinel_platform::set_portable_database_key(zeroize::Zeroizing::new(
                PASSPHRASE.into(),
            ))
            .unwrap();
            let services = DesktopServices::initialize().await.unwrap();
            let user_data = services.database.user_data_manager();
            assert_eq!(services.is_first_run, phase == "create");
            assert!(!services.scheduler_status.read().await.is_running);
            assert!(!services.bookmarklet_server.read().await.is_running());
            let unlocked = services.credentials.unlock_status().await.unwrap();
            assert_eq!(unlocked.mode, CredentialUnlockMode::Passphrase);
            assert!(unlocked.configured && unlocked.unlocked);
            if phase == "create" {
                services
                    .config
                    .read()
                    .await
                    .save(&Config::default_path())
                    .unwrap();
                user_data.add_search_history(RECORD).await.unwrap();
                services
                    .credentials
                    .store(CredentialKey::SmtpPassword, CREDENTIAL)
                    .await
                    .unwrap();
            } else {
                assert_eq!(user_data.get_search_history(10).await.unwrap(), [RECORD]);
                assert_eq!(
                    services
                        .credentials
                        .retrieve(CredentialKey::SmtpPassword)
                        .await
                        .unwrap()
                        .as_deref(),
                    Some(CREDENTIAL)
                );
            }
            services.database.close().await;
        });
}
