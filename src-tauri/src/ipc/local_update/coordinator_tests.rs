//! Exercises the native update coordinator with real crypto/SQLite and a simulated launcher acknowledgement.

use super::*;
use crate::application::{config::Config, credentials::CredentialService, scheduler::Scheduler};
use crate::desktop::{BookmarkletServer, Database, SchedulerStatus};
use jobsentinel_application::{
    pack_runtime::PackRuntimeEnvironment,
    update_preflight::{
        collect_installed_update_state,
        test_support::{fixture, signed},
    },
};
use std::path::Path;
use tokio::sync::RwLock;

struct Fixture {
    root: tempfile::TempDir,
    state: Arc<AppState>,
    update: Arc<LocalUpdateState>,
    admission: Arc<OperationAdmission>,
    publishers: Arc<Vec<ReleasePublisher>>,
    review_id: String,
    pack_sentinel: std::path::PathBuf,
}

impl Fixture {
    async fn reviewed() -> Self {
        let root = tempfile::tempdir().unwrap();
        let database_path = root.path().join("jobs.db");
        let database = Arc::new(
            Database::connect_test_fixture(&database_path)
                .await
                .unwrap(),
        );
        assert!(
            Database::connect_test_fixture(&database_path)
                .await
                .is_err(),
            "fixture factory must never open an existing database"
        );
        database.migrate().await.unwrap();
        database.initialize_update_fixture_marker().await.unwrap();
        let config = Arc::new(RwLock::new(Config::first_run()));
        let credentials = Arc::new(CredentialService::with_fixed_master_key(
            database.credentials(),
            [23; 32],
        ));
        let scheduler = Arc::new(Scheduler::new_shared_with_credentials(
            config.clone(),
            database.clone(),
            credentials.clone(),
        ));
        let state = Arc::new(AppState {
            config,
            database,
            credentials,
            scheduler: Some(scheduler),
            scheduler_status: Arc::new(RwLock::new(SchedulerStatus::default())),
            bookmarklet_server: Arc::new(RwLock::new(BookmarkletServer::default())),
            pending_url_imports: Default::default(),
            pack_runtime: PackRuntimeEnvironment::for_data_dir(root.path()),
            pending_military_transition_reviews: Default::default(),
            storage_stopping: Default::default(),
            outside_ai_cancellations: Default::default(),
        });
        let installed = collect_installed_update_state(&state.database, root.path())
            .await
            .unwrap();
        let (mut manifest, _) = fixture();
        manifest.edition = installed.edition;
        manifest.edition.artifact_version = version(manifest.version);
        manifest.readers.migration.max = installed.migration;
        let (metadata, signature, publishers) = signed(&manifest);
        assert!(
            publishers
                .iter()
                .all(|fixture| ReleasePublisher::production_trust()
                    .iter()
                    .all(|production| production.key_id != fixture.key_id
                        && production.public_key != fixture.public_key)),
            "fixture identity must never become production trust"
        );
        #[cfg(target_os = "macos")]
        let extension = "pkg";
        #[cfg(target_os = "windows")]
        let extension = "msi";
        #[cfg(target_os = "linux")]
        let extension = "deb";
        let source = root.path().join(format!("candidate.{extension}"));
        std::fs::write(&source, b"package").unwrap();
        std::fs::write(
            root.path()
                .join(format!("candidate.{extension}.manifest.json")),
            metadata,
        )
        .unwrap();
        std::fs::write(
            root.path().join(format!("candidate.{extension}.sig")),
            signature,
        )
        .unwrap();
        crate::desktop::ensure_private_dir(state.pack_runtime.artifact_root()).unwrap();
        let pack_sentinel = state
            .pack_runtime
            .artifact_root()
            .join("coordinator-sentinel");
        std::fs::write(&pack_sentinel, b"unchanged pack-root sentinel").unwrap();
        let update = Arc::new(LocalUpdateState::default());
        let admission = Arc::new(OperationAdmission::default());
        let package = staging::stage(&source, root.path()).unwrap();
        let review = review_staged(package, &state, &update, root.path(), &publishers)
            .await
            .unwrap();
        Self {
            root,
            state,
            update,
            admission,
            publishers: Arc::new(publishers),
            review_id: review.review_id,
            pack_sentinel,
        }
    }
}

fn prepared_journal(root: &Path) -> serde_json::Value {
    let path = std::fs::read_dir(root)
        .unwrap()
        .map(Result::unwrap)
        .map(|entry| entry.path())
        .find(|path| {
            path.file_name()
                .unwrap()
                .to_string_lossy()
                .starts_with(".jobsentinel-update-")
        })
        .expect("real prepared journal before launcher");
    serde_json::from_slice(&std::fs::read(path).unwrap()).unwrap()
}

#[tokio::test]
async fn coordinator_drains_real_writer_snapshots_committed_data_and_waits_for_simulated_ack() {
    #[cfg(feature = "embedded-ml")]
    let _model = crate::ipc::ml::MODEL_TEST_LOCK.lock().await;
    let fixture = Fixture::reviewed().await;
    let pool = fixture.state.database.test_fixture_pool();
    let lease = fixture.admission.admit().unwrap();
    let transaction = fixture
        .state
        .database
        .hold_update_fixture_writer()
        .await
        .unwrap();
    let (launched, launch_notice) = tokio::sync::oneshot::channel();
    let (acknowledge, acknowledgement) = tokio::sync::oneshot::channel();
    let root = fixture.root.path().to_path_buf();
    let launch_root = root.clone();
    let update = fixture.update.clone();
    let launch_update = update.clone();
    let admission = fixture.admission.clone();
    let launch_admission = admission.clone();
    let state = fixture.state.clone();
    let publishers = fixture.publishers.clone();
    let review_id = fixture.review_id.clone();
    let launch_pool = pool.clone();
    let launch_database = fixture.state.database.clone();
    let applying = tokio::spawn(async move {
        apply_reviewed(
            review_id,
            &state,
            &update,
            &admission,
            &root,
            &publishers,
            move |package| {
                assert_eq!(std::fs::read(package).unwrap(), b"package");
                assert!(launch_pool.is_closed());
                assert!(launch_admission.admit().is_err());
                assert!(launch_update.operation.try_lock().is_err());
                let journal = prepared_journal(&launch_root);
                assert_eq!(journal["phase"], "prepared");
                let snapshot_dir = launch_root.join(format!(
                    ".update-snapshot-{}",
                    journal["snapshot"]["operation_id"].as_str().unwrap()
                ));
                let receipt: serde_json::Value = serde_json::from_slice(
                    &std::fs::read(snapshot_dir.join("receipt.json")).unwrap(),
                )
                .unwrap();
                assert_eq!(receipt, journal["snapshot"]);
                tokio::runtime::Handle::current().block_on(async {
                    let value =
                        Database::read_update_fixture_snapshot(&snapshot_dir.join("snapshot.db"))
                            .await
                            .unwrap();
                    assert_eq!(value, "writer committed");
                    assert!(launch_database
                        .probe_late_update_fixture_write()
                        .await
                        .is_err());
                });
                launched.send(()).unwrap();
                acknowledgement
                    .blocking_recv()
                    .map_err(std::io::Error::other)?;
                Ok(()) // Simulated OS acknowledgement only; no installer is launched.
            },
        )
        .await
    });
    tokio::time::timeout(std::time::Duration::from_secs(5), async {
        while !fixture.admission.closed() {
            tokio::task::yield_now().await;
        }
    })
    .await
    .unwrap();
    assert!(
        !pool.is_closed(),
        "held writer must drain before sealing SQLite"
    );
    assert!(!applying.is_finished());
    transaction.commit().await.unwrap();
    drop(lease);
    tokio::time::timeout(std::time::Duration::from_secs(10), launch_notice)
        .await
        .unwrap()
        .unwrap();
    assert!(
        !applying.is_finished(),
        "coordinator must await launcher acknowledgement"
    );
    acknowledge.send(()).unwrap();
    let outcome = applying.await.unwrap().unwrap();
    assert_eq!(outcome.outcome, "installer_opened");
    assert!(outcome.restart_required);
    assert!(fixture
        .state
        .scheduler
        .as_ref()
        .unwrap()
        .is_shutdown_requested());
    assert_eq!(
        std::fs::read(&fixture.pack_sentinel).unwrap(),
        b"unchanged pack-root sentinel"
    );
}

#[tokio::test]
async fn coordinator_refuses_tampered_package_before_sealing_or_touching_user_data() {
    #[cfg(feature = "embedded-ml")]
    let _model = crate::ipc::ml::MODEL_TEST_LOCK.lock().await;
    let fixture = Fixture::reviewed().await;
    let staged = fixture
        .update
        .review
        .lock()
        .await
        .as_ref()
        .unwrap()
        .package
        .package
        .path
        .clone();
    std::fs::write(staged, b"tampered package").unwrap();
    let launched = Arc::new(AtomicBool::new(false));
    let observed = launched.clone();
    let result = apply_reviewed(
        fixture.review_id.clone(),
        &fixture.state,
        &fixture.update,
        &fixture.admission,
        fixture.root.path(),
        &fixture.publishers,
        move |_| {
            observed.store(true, Ordering::Release);
            Err(std::io::Error::other("launcher must not be reached"))
        },
    )
    .await;
    assert!(result.is_err());
    assert!(!launched.load(Ordering::Acquire));
    assert!(!fixture.update.restart_required.load(Ordering::Acquire));
    assert!(fixture.admission.admit().is_ok());
    assert!(!fixture
        .state
        .scheduler
        .as_ref()
        .unwrap()
        .is_shutdown_requested());
    let pool = fixture.state.database.test_fixture_pool();
    assert!(!pool.is_closed());
    let value = fixture.state.database.update_fixture_value().await.unwrap();
    assert_eq!(value, "original user data");
    assert_eq!(
        std::fs::read(&fixture.pack_sentinel).unwrap(),
        b"unchanged pack-root sentinel"
    );
    assert!(!std::fs::read_dir(fixture.root.path())
        .unwrap()
        .map(Result::unwrap)
        .any(|entry| entry
            .file_name()
            .to_string_lossy()
            .starts_with(".update-snapshot-")
            || entry
                .file_name()
                .to_string_lossy()
                .starts_with(".jobsentinel-update-")));
    fixture.state.database.close().await;
}
