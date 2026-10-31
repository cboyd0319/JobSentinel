//! Verifies update snapshots preserve live WAL data and refuse corruption without modifying current data.

use super::*;

#[tokio::test]
async fn portable_update_recovery_survives_relocation_and_rejects_other_profiles() {
    const ROOT: &str = "JOBSENTINEL_TEST_UPDATE_PROFILE";
    const PHASE: &str = "JOBSENTINEL_TEST_UPDATE_PHASE";
    if let Some(root) = std::env::var_os(ROOT) {
        let root = PathBuf::from(root);
        jobsentinel_platform::select_portable_root(&root).unwrap();
        let path = root.join("data/jobs.db");
        let phase = std::env::var(PHASE).unwrap();
        match phase.as_str() {
            "create" | "legacy-create" => {
                let database = Database::connect(&path).await.unwrap();
                sqlx::query("INSERT INTO jobs(hash,title,company,url,source) VALUES('moved','Retained role','Example','https://example.test/job','test')")
                    .execute(database.pool()).await.unwrap();
                let mut journal = database
                    .prepare_update_snapshot(env!("CARGO_PKG_VERSION"), "3.1.0", &"a".repeat(64))
                    .await
                    .unwrap();
                if phase == "legacy-create" {
                    journal.snapshot.database_identity =
                        hex::encode(Sha256::digest(path.as_os_str().as_encoded_bytes()));
                    let receipt = path.parent().unwrap().join(format!(
                        ".update-snapshot-{}/receipt.json",
                        journal.snapshot.operation_id
                    ));
                    std::fs::write(receipt, serde_json::to_vec(&journal.snapshot).unwrap())
                        .unwrap();
                    let marker = path.parent().unwrap().join(format!(
                        ".jobsentinel-update-{}.json",
                        hex::encode(Sha256::digest(b"jobs.db"))
                    ));
                    std::fs::write(marker, serde_json::to_vec(&journal).unwrap()).unwrap();
                }
            }
            "recover" | "legacy-healthy" | "legacy-corrupt" | "legacy-missing" => {
                let journal = super::super::update_journal::read_journal(&path)
                    .unwrap()
                    .unwrap();
                match phase.as_str() {
                    "legacy-healthy" => {}
                    "legacy-missing" => std::fs::remove_file(&path).unwrap(),
                    _ => std::fs::write(&path, b"interrupted target").unwrap(),
                }
                let files = [
                    path.clone(),
                    path.parent().unwrap().join(format!(
                        ".jobsentinel-update-{}.json",
                        hex::encode(Sha256::digest(b"jobs.db"))
                    )),
                    path.parent().unwrap().join(format!(
                        ".update-snapshot-{}/receipt.json",
                        journal.snapshot.operation_id
                    )),
                    path.parent().unwrap().join(format!(
                        ".update-snapshot-{}/snapshot.db",
                        journal.snapshot.operation_id
                    )),
                ];
                let snapshot = || {
                    files
                        .iter()
                        .map(|file| std::fs::read(file).ok())
                        .collect::<Vec<_>>()
                };
                let before = snapshot();
                assert!(Database::verify_portable_passphrase(
                    &path,
                    "incorrect portable passphrase"
                )
                .await
                .is_err());
                assert!(
                    snapshot() == before,
                    "Wrong-key authentication changed recovery files"
                );
                let key = crate::encryption::load_or_create_database_key()
                    .await
                    .unwrap();
                Database::verify_portable_passphrase(&path, &key)
                    .await
                    .unwrap();
                assert!(
                    snapshot() == before,
                    "Authentication changed recovery files"
                );
                if phase != "legacy-healthy" {
                    let owner = Database::acquire_owner_lock(&path).unwrap();
                    Database::restore_update_snapshot_at(&path, &journal.snapshot)
                        .await
                        .unwrap();
                    drop(owner);
                }
                let database = Database::connect_with_staged_restore(&path).await.unwrap();
                database.verify_integrity().await.unwrap();
                assert_eq!(
                    sqlx::query_scalar::<_, String>("SELECT title FROM jobs WHERE hash='moved'")
                        .fetch_one(database.pool())
                        .await
                        .unwrap(),
                    "Retained role"
                );
                database.close().await;
            }
            "reject" => assert!(super::super::update_journal::read_journal(&path).is_err()),
            _ => panic!("unknown test phase"),
        }
        return;
    }
    let directory = tempfile::tempdir().unwrap();
    let root = directory.path().canonicalize().unwrap();
    let original = root.join("original");
    let other = root.join("other");
    let run = |path: &std::path::Path, phase| {
        assert!(std::process::Command::new(std::env::current_exe().unwrap())
            .args(["--exact", "connection::update_backup::tests::portable_update_recovery_survives_relocation_and_rejects_other_profiles"])
            .env(ROOT, path).env(PHASE, phase).status().unwrap().success());
    };
    for path in [&original, &other] {
        jobsentinel_platform::ensure_private_dir_tree(path).unwrap();
        run(path, "create");
    }
    let moved = root.join("moved");
    std::fs::rename(original, &moved).unwrap();
    run(&moved, "recover");
    let journal = std::fs::read_dir(moved.join("data"))
        .unwrap()
        .map(|entry| entry.unwrap().path())
        .find(|path| {
            path.file_name()
                .unwrap()
                .as_encoded_bytes()
                .starts_with(b".jobsentinel-update-")
        })
        .unwrap();
    let destination = other.join("data").join(journal.file_name().unwrap());
    std::fs::copy(journal, destination).unwrap();
    run(&other, "reject");
    for state in ["legacy-healthy", "legacy-corrupt", "legacy-missing"] {
        let legacy = root.join(state);
        jobsentinel_platform::ensure_private_dir_tree(&legacy).unwrap();
        run(&legacy, "legacy-create");
        run(&legacy, state);
        let moved = root.join(format!("moved-{state}"));
        std::fs::rename(legacy, &moved).unwrap();
        run(&moved, "reject");
    }
}

#[tokio::test]
async fn portable_authentication_uses_update_snapshot_without_authorizing_writers() {
    for missing in [true, false] {
        let root = tempfile::tempdir().unwrap();
        let path = root.path().join("jobs.db");
        let database = Database::connect(&path).await.unwrap();
        let journal = database
            .prepare_update_snapshot(env!("CARGO_PKG_VERSION"), "3.1.0", &"a".repeat(64))
            .await
            .unwrap();
        drop(database);
        if missing {
            std::fs::remove_file(&path).unwrap();
        } else {
            std::fs::write(&path, b"corrupt target bytes").unwrap();
        }
        let directory = root.path().join(format!(
            ".update-snapshot-{}",
            journal.snapshot.operation_id
        ));
        let marker = std::fs::read_dir(root.path())
            .unwrap()
            .map(|entry| entry.unwrap().path())
            .find(|path| {
                path.file_name()
                    .unwrap()
                    .as_encoded_bytes()
                    .starts_with(b".jobsentinel-update-")
            })
            .unwrap();
        let paths = [
            path.clone(),
            marker,
            directory.join("snapshot.db"),
            directory.join("receipt.json"),
        ];
        let snapshot = || {
            paths
                .iter()
                .map(|path| std::fs::read(path).ok())
                .collect::<Vec<_>>()
        };
        let before = snapshot();
        assert!(!Database::portable_primary_is_new(&path).unwrap());
        assert!(
            Database::verify_portable_passphrase(&path, "incorrect portable passphrase")
                .await
                .is_err()
        );
        assert!(
            snapshot() == before,
            "Wrong-key verification changed update files"
        );
        let key = crate::encryption::load_or_create_database_key()
            .await
            .unwrap();
        Database::verify_portable_passphrase(&path, &key)
            .await
            .unwrap();
        assert!(snapshot() == before, "Verification changed update files");
        assert!(Database::connect_with_staged_restore(&path).await.is_err());
        assert!(
            snapshot() == before,
            "Unauthenticated update startup changed files"
        );
        for suffix in ["-wal", "-shm", "-journal"] {
            assert!(!crate::encryption::sqlite_sidecar_path(
                &directory.join("snapshot.db"),
                suffix
            )
            .exists());
        }
    }
}

#[tokio::test]
async fn interrupted_update_recovers_missing_primary_and_preserves_sidecars() {
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("jobs.db");
    let database = Database::connect(&path).await.unwrap();
    database.migrate().await.unwrap();
    let snapshot = database.create_update_snapshot().await.unwrap();
    let directory = database
        .update_snapshot_directory(Uuid::parse_str(&snapshot.operation_id).unwrap())
        .unwrap();
    database.close().await;
    std::fs::remove_file(&path).unwrap();
    let wal = crate::encryption::sqlite_sidecar_path(&path, "-wal");
    std::fs::write(&wal, b"orphaned target state").unwrap();
    Database::restore_update_snapshot_at(&path, &snapshot)
        .await
        .unwrap();
    assert!(!wal.exists());
    let preserved = std::fs::read_dir(directory)
        .unwrap()
        .map(|entry| entry.unwrap().path())
        .find(|path| {
            path.file_name()
                .unwrap()
                .to_string_lossy()
                .ends_with(".db-wal")
        })
        .unwrap();
    assert_eq!(std::fs::read(preserved).unwrap(), b"orphaned target state");
    drop(database);
    let restored = Database::connect(&path).await.unwrap();
    assert!(restored.verify_integrity().await.is_ok());
    restored.close().await;
}

#[tokio::test]
async fn interrupted_update_recovers_without_opening_corrupt_primary() {
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("jobs.db");
    let database = Database::connect(&path).await.unwrap();
    database.migrate().await.unwrap();
    let snapshot = database.create_update_snapshot().await.unwrap();
    database.close().await;
    std::fs::write(&path, b"corrupt interrupted target").unwrap();
    // `database` retains the process owner even though its pool has closed.
    Database::restore_update_snapshot_at(&path, &snapshot)
        .await
        .unwrap();
    drop(database);
    let restored = Database::connect(&path).await.unwrap();
    assert!(restored.verify_integrity().await.is_ok());
    restored.close().await;
}

#[tokio::test]
async fn failed_update_restores_snapshot_and_preserves_failed_data() {
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("jobs.db");
    let database = Database::connect(&path).await.unwrap();
    database.migrate().await.unwrap();
    sqlx::query("CREATE TABLE recovery_probe (value TEXT)")
        .execute(&database.pool)
        .await
        .unwrap();
    sqlx::query("INSERT INTO recovery_probe VALUES ('before update')")
        .execute(&database.pool)
        .await
        .unwrap();
    let snapshot = database.create_update_snapshot().await.unwrap();
    let directory = database
        .update_snapshot_directory(Uuid::parse_str(&snapshot.operation_id).unwrap())
        .unwrap();
    sqlx::query("UPDATE recovery_probe SET value = 'failed target'")
        .execute(&database.pool)
        .await
        .unwrap();
    database.restore_update_snapshot(&snapshot).await.unwrap();
    assert!(database.pool.is_closed());
    drop(database);
    let restored = Database::connect(&path).await.unwrap();
    assert_eq!(
        sqlx::query_scalar::<_, String>("SELECT value FROM recovery_probe")
            .fetch_one(&restored.pool)
            .await
            .unwrap(),
        "before update"
    );
    restored.close().await;
    let failed = std::fs::read_dir(directory)
        .unwrap()
        .map(|entry| entry.unwrap().path())
        .find(|path| {
            path.file_name()
                .unwrap()
                .to_string_lossy()
                .starts_with("failed-")
                && path.extension().is_some_and(|extension| extension == "db")
        })
        .unwrap();
    let preserved = Database::connect(&failed).await.unwrap();
    assert_eq!(
        sqlx::query_scalar::<_, String>("SELECT value FROM recovery_probe")
            .fetch_one(&preserved.pool)
            .await
            .unwrap(),
        "failed target"
    );
    preserved.close().await;
}

#[tokio::test]
async fn restore_refuses_tampered_snapshot_without_closing_live_data() {
    let root = tempfile::tempdir().unwrap();
    let database = Database::connect(&root.path().join("jobs.db"))
        .await
        .unwrap();
    database.migrate().await.unwrap();
    let snapshot = database.create_update_snapshot().await.unwrap();
    let directory = database
        .update_snapshot_directory(Uuid::parse_str(&snapshot.operation_id).unwrap())
        .unwrap();
    std::fs::write(directory.join("snapshot.db"), b"corrupt").unwrap();
    assert!(database.restore_update_snapshot(&snapshot).await.is_err());
    assert!(!database.pool.is_closed());
    assert!(database.verify_integrity().await.is_ok());
    database.close().await;
}

#[tokio::test]
async fn update_snapshot_preserves_wal_and_refuses_tampering() {
    let root = tempfile::tempdir().unwrap();
    let database = Database::connect(&root.path().join("jobs.db"))
        .await
        .unwrap();
    database.migrate().await.unwrap();
    sqlx::query("CREATE TABLE update_test (value TEXT)")
        .execute(&database.pool)
        .await
        .unwrap();
    sqlx::query("INSERT INTO update_test VALUES ('wal data')")
        .execute(&database.pool)
        .await
        .unwrap();
    let snapshot = database.create_update_snapshot().await.unwrap();
    assert_eq!(
        database
            .inspect_update_snapshot(Uuid::parse_str(&snapshot.operation_id).unwrap())
            .await
            .unwrap(),
        snapshot
    );
    let path = database
        .update_snapshot_directory(Uuid::parse_str(&snapshot.operation_id).unwrap())
        .unwrap()
        .join("snapshot.db");
    let mut conn = database.pool.acquire().await.unwrap();
    sqlx::query("ATTACH DATABASE ? AS snapshot_test")
        .bind(path.to_str().unwrap())
        .execute(&mut *conn)
        .await
        .unwrap();
    let value: String = sqlx::query_scalar("SELECT value FROM snapshot_test.update_test")
        .fetch_one(&mut *conn)
        .await
        .unwrap();
    assert_eq!(value, "wal data");
    sqlx::query("DETACH DATABASE snapshot_test")
        .execute(&mut *conn)
        .await
        .unwrap();
    drop(conn);
    let id = Uuid::parse_str(&snapshot.operation_id).unwrap();
    let receipt_path = database
        .update_snapshot_directory(id)
        .unwrap()
        .join("receipt.json");
    let mut changed = snapshot.clone();
    changed.database_schema += 1;
    std::fs::write(&receipt_path, serde_json::to_vec(&changed).unwrap()).unwrap();
    assert!(database.inspect_update_snapshot(id).await.is_err());
    std::fs::write(receipt_path, serde_json::to_vec(&snapshot).unwrap()).unwrap();
    std::fs::write(path, b"corrupt").unwrap();
    assert!(database
        .inspect_update_snapshot(Uuid::parse_str(&snapshot.operation_id).unwrap())
        .await
        .is_err());
    assert_eq!(
        sqlx::query_scalar::<_, String>("SELECT value FROM update_test")
            .fetch_one(&database.pool)
            .await
            .unwrap(),
        "wal data"
    );
    database.close().await;
}

#[tokio::test]
async fn update_snapshot_refuses_memory_database() {
    let database = Database::connect_memory().await.unwrap();
    database.migrate().await.unwrap();
    assert!(database.create_update_snapshot().await.is_err());
    database.close().await;
}

#[tokio::test]
async fn cancelled_snapshot_attachment_does_not_poison_pool() {
    let pool = sqlx::sqlite::SqlitePoolOptions::new()
        .max_connections(1)
        .connect("sqlite::memory:")
        .await
        .unwrap();
    let (ready, attached) = tokio::sync::oneshot::channel();
    let task_pool = pool.clone();
    let task = tokio::spawn(async move {
        let mut conn = Database::snapshot_connection(&task_pool).await.unwrap();
        sqlx::query("ATTACH DATABASE ':memory:' AS update_snapshot_check")
            .execute(&mut *conn)
            .await
            .unwrap();
        ready.send(()).unwrap();
        std::future::pending::<()>().await;
    });
    attached.await.unwrap();
    task.abort();
    assert!(task.await.unwrap_err().is_cancelled());
    let mut conn = tokio::time::timeout(std::time::Duration::from_secs(5), pool.acquire())
        .await
        .unwrap()
        .unwrap();
    sqlx::query("ATTACH DATABASE ':memory:' AS update_snapshot_check")
        .execute(&mut *conn)
        .await
        .unwrap();
    sqlx::query("DETACH DATABASE update_snapshot_check")
        .execute(&mut *conn)
        .await
        .unwrap();
    drop(conn);
    pool.close().await;
}
