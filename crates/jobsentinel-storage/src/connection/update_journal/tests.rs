//! Proves update sealing drains writes and startup refuses ambiguous or damaged preparation.

use super::*;

#[tokio::test]
async fn preparation_drains_existing_transaction_and_denies_cloned_writers() {
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("jobs.db");
    let database = std::sync::Arc::new(Database::connect(&path).await.unwrap());
    database.migrate().await.unwrap();
    let old_pool = database.pool.clone();
    let mut transaction = old_pool.begin().await.unwrap();
    sqlx::query("CREATE TABLE update_drain (value TEXT)")
        .execute(&mut *transaction)
        .await
        .unwrap();
    sqlx::query("INSERT INTO update_drain VALUES ('committed')")
        .execute(&mut *transaction)
        .await
        .unwrap();
    let preparing = database.clone();
    let task = tokio::spawn(async move {
        preparing
            .prepare_update_snapshot("3.0.0", "3.0.1", &"a".repeat(64))
            .await
    });
    old_pool.close_event().await;
    assert!(!task.is_finished());
    transaction.commit().await.unwrap();
    let journal = task.await.unwrap().unwrap();
    assert!(database
        .prepare_update_snapshot("3.0.0", "3.0.2", &"b".repeat(64))
        .await
        .is_err());
    assert!(sqlx::query("INSERT INTO update_drain VALUES ('late')")
        .execute(&old_pool)
        .await
        .is_err());
    assert!(
        Database::connect(&path).await.is_err(),
        "owner lock survives sealing"
    );
    assert_eq!(read_journal(&path).unwrap(), Some(journal));
    drop(database);
    let reopened = Database::connect_with_staged_restore(&path).await.unwrap();
    assert_eq!(
        sqlx::query_scalar::<_, String>("SELECT value FROM update_drain")
            .fetch_one(&reopened.pool)
            .await
            .unwrap(),
        "committed"
    );
    assert_eq!(
        read_journal(&path)
            .unwrap()
            .unwrap()
            .reconciled_version
            .as_deref(),
        Some("3.0.0")
    );
    reopened.pool.close().await;
}

#[tokio::test]
async fn invalid_preparation_keeps_live_database_usable() {
    let root = tempfile::tempdir().unwrap();
    let database = Database::connect(&root.path().join("jobs.db"))
        .await
        .unwrap();
    database.migrate().await.unwrap();
    assert!(database
        .prepare_update_snapshot("3.0.0", "wrong", &"a".repeat(64))
        .await
        .is_err());
    assert!(database.update_schema_inventory().await.is_ok());
    database.pool.close().await;
}

#[tokio::test]
async fn startup_refuses_foreign_version_corrupt_snapshot_and_restore_conflict() {
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("jobs.db");
    let database = Database::connect(&path).await.unwrap();
    database.migrate().await.unwrap();
    let journal = database
        .prepare_update_snapshot("3.0.0", "3.0.1", &"a".repeat(64))
        .await
        .unwrap();
    drop(database);
    assert!(
        Database::reconcile_prepared_update_for_version(&path, "3.0.2")
            .await
            .is_err()
    );
    assert!(
        Database::reconcile_prepared_update_for_version(&path, "3.0.1")
            .await
            .is_err()
    );
    let restore = super::super::portable_restore::restore_stage_path(&path);
    std::fs::write(&restore, b"pending").unwrap();
    assert!(
        Database::reconcile_prepared_update_for_version(&path, "3.0.0")
            .await
            .is_err()
    );
    assert_eq!(std::fs::read(&restore).unwrap(), b"pending");
    std::fs::remove_file(restore).unwrap();
    let snapshot = path
        .parent()
        .unwrap()
        .join(format!(
            ".update-snapshot-{}",
            journal.snapshot.operation_id
        ))
        .join("snapshot.db");
    std::fs::write(snapshot, b"damaged").unwrap();
    assert!(
        Database::reconcile_prepared_update_for_version(&path, "3.0.0")
            .await
            .is_err()
    );
    assert!(read_journal(&path)
        .unwrap()
        .unwrap()
        .reconciled_version
        .is_none());
}

#[tokio::test]
async fn startup_never_recreates_missing_data_and_rejects_bad_journal() {
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("jobs.db");
    let database = Database::connect(&path).await.unwrap();
    database.migrate().await.unwrap();
    database
        .prepare_update_snapshot("3.0.0", "3.0.1", &"a".repeat(64))
        .await
        .unwrap();
    drop(database);
    std::fs::remove_file(&path).unwrap();
    assert!(Database::connect_with_staged_restore(&path).await.is_err());
    assert!(!path.exists());
    std::fs::write(journal_path(&path).unwrap(), b"invalid").unwrap();
    assert!(Database::connect_with_staged_restore(&path).await.is_err());
    assert!(!path.exists());
}

#[tokio::test]
async fn sibling_databases_have_distinct_journals_and_cannot_share_snapshots() {
    let root = tempfile::tempdir().unwrap();
    let first_path = root.path().join("first.db");
    let second_path = root.path().join("second.db");
    let first = Database::connect(&first_path).await.unwrap();
    let second = Database::connect(&second_path).await.unwrap();
    first.migrate().await.unwrap();
    second.migrate().await.unwrap();
    let journal = first
        .prepare_update_snapshot("3.0.0", "3.0.1", &"a".repeat(64))
        .await
        .unwrap();
    assert_ne!(
        journal_path(&first_path).unwrap(),
        journal_path(&second_path).unwrap()
    );
    assert!(read_journal(&second_path).unwrap().is_none());
    assert!(second
        .inspect_update_snapshot(uuid::Uuid::parse_str(&journal.snapshot.operation_id).unwrap())
        .await
        .is_err());
    std::fs::copy(
        journal_path(&first_path).unwrap(),
        journal_path(&second_path).unwrap(),
    )
    .unwrap();
    assert!(read_journal(&second_path).is_err());
    assert!(second.update_schema_inventory().await.is_ok());
    second.pool.close().await;
}

#[cfg(unix)]
#[tokio::test]
async fn linked_journal_is_neither_read_nor_overwritten() {
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("jobs.db");
    let database = Database::connect(&path).await.unwrap();
    database.migrate().await.unwrap();
    let journal = database
        .prepare_update_snapshot("3.0.0", "3.0.1", &"a".repeat(64))
        .await
        .unwrap();
    let target = root.path().join("external.json");
    std::fs::write(&target, b"untouched").unwrap();
    let marker = journal_path(&path).unwrap();
    std::fs::remove_file(&marker).unwrap();
    std::os::unix::fs::symlink(&target, &marker).unwrap();
    assert!(read_journal(&path).is_err());
    assert!(write_journal(&path, &journal).is_err());
    assert_eq!(std::fs::read(&target).unwrap(), b"untouched");
    assert!(std::fs::symlink_metadata(marker)
        .unwrap()
        .file_type()
        .is_symlink());
}

#[tokio::test]
async fn unknown_journal_schema_is_refused_before_data_is_opened() {
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("jobs.db");
    let database = Database::connect(&path).await.unwrap();
    database.migrate().await.unwrap();
    let mut journal = database
        .prepare_update_snapshot("3.0.0", "3.0.1", &"a".repeat(64))
        .await
        .unwrap();
    drop(database);
    journal.schema = "jobsentinel.prepared-update.v2".into();
    write_journal(&path, &journal).unwrap();
    let before = std::fs::read(&path).unwrap();
    assert!(Database::connect_with_staged_restore(&path).await.is_err());
    assert_eq!(std::fs::read(&path).unwrap(), before);
}

#[tokio::test]
async fn startup_retains_owner_between_empty_journal_check_and_database_open() {
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("jobs.db");
    let database = Database::connect(&path).await.unwrap();
    database.migrate().await.unwrap();
    database.pool.close().await;
    drop(database);
    let checked = std::sync::Arc::new(tokio::sync::Notify::new());
    let resume = std::sync::Arc::new(tokio::sync::Notify::new());
    let opening_path = path.clone();
    let gate = (checked.clone(), resume.clone());
    let opening = tokio::spawn(STARTUP_ADMISSION.scope(gate, async move {
        Database::connect_with_staged_restore(&opening_path).await
    }));
    checked.notified().await;
    assert!(
        Database::connect(&path).await.is_err(),
        "second owner cannot prepare between check and migration"
    );
    resume.notify_one();
    let database = opening.await.unwrap().unwrap();
    assert!(
        Database::connect(&path).await.is_err(),
        "returned database retains the same reservation"
    );
    assert!(database.update_schema_inventory().await.is_ok());
    database.pool.close().await;
}

#[tokio::test]
async fn target_startup_requires_exact_authenticated_journal_under_owner() {
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("jobs.db");
    let database = Database::connect(&path).await.unwrap();
    database.migrate().await.unwrap();
    let mut journal = database
        .prepare_update_snapshot("3.0.0", "3.1.0", &"a".repeat(64))
        .await
        .unwrap();
    drop(database);
    // Simulate an application-verified rollback target; storage never grants trust itself.
    journal.source_version = "3.1.0".into();
    journal.target_version = "3.0.0".into();
    write_journal(&path, &journal).unwrap();
    assert!(Database::connect_with_staged_restore(&path).await.is_err());
    let mut stale = journal.clone();
    stale.package_sha256 = "b".repeat(64);
    assert!(
        Database::connect_with_update_authorization(&path, Some(&stale))
            .await
            .is_err()
    );
    let database = Database::connect_with_update_authorization(&path, Some(&journal))
        .await
        .unwrap();
    assert_eq!(
        read_journal(&path).unwrap().unwrap().phase,
        UpdatePreparationPhase::Reconciled
    );
    database.close().await;
    drop(database);
    assert!(
        Database::connect_with_update_authorization(&path, Some(&journal))
            .await
            .is_err(),
        "a source/reconciliation race cannot reuse the pre-reconciliation grant"
    );
    assert!(
        Database::connect_with_staged_restore(&path).await.is_err(),
        "target startup still requires application authentication after reconciliation"
    );
    let current = read_journal(&path).unwrap().unwrap();
    let database = Database::connect_with_update_authorization(&path, Some(&current))
        .await
        .unwrap();
    database.close().await;
}

#[tokio::test]
async fn source_never_cancels_an_interrupted_target_attempt() {
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("jobs.db");
    let database = Database::connect(&path).await.unwrap();
    database.migrate().await.unwrap();
    let mut journal = database
        .prepare_update_snapshot("3.0.0", "3.1.0", &"a".repeat(64))
        .await
        .unwrap();
    drop(database);
    journal.phase = UpdatePreparationPhase::TargetStarting;
    write_journal(&path, &journal).unwrap();
    assert!(Database::connect_with_staged_restore(&path).await.is_err());
    assert_eq!(
        read_journal(&path).unwrap().unwrap().phase,
        UpdatePreparationPhase::TargetStarting
    );
}

#[tokio::test]
async fn interrupted_target_restores_before_opening_primary_and_never_retries_migration() {
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("jobs.db");
    let database = Database::connect(&path).await.unwrap();
    database.migrate().await.unwrap();
    let mut journal = database
        .prepare_update_snapshot("3.0.0", "3.1.0", &"a".repeat(64))
        .await
        .unwrap();
    drop(database);
    journal.source_version = "3.1.0".into();
    journal.target_version = "3.0.0".into();
    journal.phase = UpdatePreparationPhase::TargetStarting;
    write_journal(&path, &journal).unwrap();
    std::fs::write(&path, b"interrupted target bytes").unwrap();
    assert!(
        Database::connect_with_update_authorization(&path, Some(&journal))
            .await
            .is_err()
    );
    let recovered = read_journal(&path).unwrap().unwrap();
    assert_eq!(recovered.phase, UpdatePreparationPhase::TargetFailed);
    assert!(
        Database::connect_with_update_authorization(&path, Some(&recovered))
            .await
            .is_err()
    );
    let source = Database::reconcile_prepared_update_for_version(&path, "3.1.0")
        .await
        .unwrap()
        .unwrap();
    assert!(source.update_schema_inventory().await.is_ok());
    source.close().await;
}

#[tokio::test]
async fn installer_cleanup_preserves_source_and_tampered_files_then_removes_exact_target_package() {
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("jobs.db");
    let database = Database::connect(&path).await.unwrap();
    database.migrate().await.unwrap();
    let digest = hex::encode(Sha256::digest(b"package"));
    let mut journal = database
        .prepare_update_snapshot("3.0.0", "3.1.0", &digest)
        .await
        .unwrap();
    let operation_id = uuid::Uuid::new_v4().to_string();
    let directory = root.path().join(format!(".update-package-{operation_id}"));
    std::fs::create_dir(&directory).unwrap();
    let installer = directory.join("installer.pkg");
    std::fs::write(&installer, b"package").unwrap();
    journal.staged_package = Some(StagedUpdatePackage {
        operation_id,
        extension: "pkg".into(),
    });
    journal.phase = UpdatePreparationPhase::Reconciled;
    journal.reconciled_version = Some("3.0.0".into());
    write_journal(&path, &journal).unwrap();
    database.cleanup_update_package().unwrap();
    assert!(
        installer.exists(),
        "source restart must not delete an active installer's input"
    );
    journal.source_version = "3.1.0".into();
    journal.target_version = "3.0.0".into();
    write_journal(&path, &journal).unwrap();
    std::fs::write(&installer, b"changed").unwrap();
    assert!(database.cleanup_update_package().is_err());
    assert!(installer.exists());
    std::fs::write(&installer, b"package").unwrap();
    database.cleanup_update_package().unwrap();
    assert!(!directory.exists());
    assert!(read_journal(&path)
        .unwrap()
        .unwrap()
        .staged_package
        .is_none());
}

#[tokio::test]
async fn malformed_staging_coordinates_and_equal_versions_never_delete_files() {
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("jobs.db");
    let database = Database::connect(&path).await.unwrap();
    database.migrate().await.unwrap();
    let original = database
        .prepare_update_snapshot("3.0.0", "3.1.0", &"a".repeat(64))
        .await
        .unwrap();
    let external = root.path().join("outside.txt");
    std::fs::write(&external, b"preserved").unwrap();
    for (id, extension, equal_versions) in [
        ("../../outside".into(), "pkg".into(), false),
        (
            uuid::Uuid::new_v4().to_string(),
            "../../outside.txt".into(),
            false,
        ),
        (uuid::Uuid::new_v4().to_string(), "pkg".into(), true),
    ] {
        let mut malformed = original.clone();
        malformed.staged_package = Some(StagedUpdatePackage {
            operation_id: id,
            extension,
        });
        malformed.phase = UpdatePreparationPhase::Reconciled;
        malformed.target_version = "3.0.0".into();
        malformed.source_version = if equal_versions { "3.0.0" } else { "3.1.0" }.into();
        malformed.reconciled_version = Some("3.0.0".into());
        write_journal(&path, &malformed).unwrap();
        assert!(read_journal(&path).is_err());
        assert!(database.cleanup_update_package().is_err());
        assert_eq!(std::fs::read(&external).unwrap(), b"preserved");
    }
}
