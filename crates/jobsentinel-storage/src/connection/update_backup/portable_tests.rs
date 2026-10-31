//! Verifies portable update identity adoption, relocation and interrupted recovery.

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
            "create" | "legacy-create" | "legacy-reconciled-create" => {
                let database = Database::connect(&path).await.unwrap();
                sqlx::query("INSERT INTO jobs(hash,title,company,url,source) VALUES('moved','Retained role','Example','https://example.test/job','test')")
                    .execute(database.pool()).await.unwrap();
                let mut journal = database
                    .prepare_update_snapshot(env!("CARGO_PKG_VERSION"), "3.1.0", &"a".repeat(64))
                    .await
                    .unwrap();
                if phase.starts_with("legacy-") {
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
                    if phase == "legacy-reconciled-create" {
                        journal.phase = super::super::UpdatePreparationPhase::Reconciled;
                        journal.reconciled_version = Some(env!("CARGO_PKG_VERSION").into());
                    }
                    std::fs::write(marker, serde_json::to_vec(&journal).unwrap()).unwrap();
                    jobsentinel_platform::write_file_atomic_private(
                        &root.join(".jobsentinel-portable"),
                        "jobsentinel.portable.v1\n",
                    )
                    .unwrap();
                    std::fs::write(root.join(".portable.lock"), b"").unwrap();
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
                assert!(
                    std::fs::read(&files[3]).ok() == before[3],
                    "Recovery changed snapshot bytes"
                );
            }
            "crash-receipt" | "crash-journal" => {
                let point = if phase == "crash-receipt" { 1 } else { 2 };
                super::super::update_journal::IDENTITY_CRASH_POINT
                    .scope(point, Database::connect_with_staged_restore(&path))
                    .await
                    .unwrap();
                panic!("identity crash hook did not terminate child");
            }
            "reject-receipt" => {
                let journal = super::super::update_journal::read_journal(&path)
                    .unwrap()
                    .unwrap();
                let directory = path.parent().unwrap().join(format!(
                    ".update-snapshot-{}",
                    journal.snapshot.operation_id
                ));
                let receipt_path = directory.join("receipt.json");
                let mut receipt = journal.snapshot.clone();
                receipt.database_identity = "0".repeat(64);
                std::fs::write(&receipt_path, serde_json::to_vec(&receipt).unwrap()).unwrap();
                let paths = [&path, &receipt_path, &directory.join("snapshot.db")];
                let snapshot = || {
                    paths
                        .iter()
                        .map(|path| std::fs::read(path).unwrap())
                        .collect::<Vec<_>>()
                };
                let before = snapshot();
                let key = crate::encryption::load_or_create_database_key()
                    .await
                    .unwrap();
                assert!(Database::verify_update_snapshot_passphrase(
                    &path,
                    &journal.snapshot,
                    &key
                )
                .await
                .is_err());
                assert!(Database::connect_with_staged_restore(&path).await.is_err());
                assert!(snapshot() == before, "Foreign receipt changed durable data");
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
        let status = std::process::Command::new(std::env::current_exe().unwrap())
            .args(["--exact", "connection::update_backup::portable_tests::portable_update_recovery_survives_relocation_and_rejects_other_profiles"])
            .env(ROOT, path).env(PHASE, phase).status().unwrap();
        assert_eq!(
            status.code(),
            Some(match phase {
                "crash-receipt" => 111,
                "crash-journal" => 112,
                _ => 0,
            })
        );
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
        run(&moved, "recover");
    }
    for create in ["legacy-create", "legacy-reconciled-create"] {
        for crash in ["crash-receipt", "crash-journal"] {
            let profile = root.join(format!("{create}-{crash}"));
            jobsentinel_platform::ensure_private_dir_tree(&profile).unwrap();
            run(&profile, create);
            let snapshot = std::fs::read_dir(profile.join("data"))
                .unwrap()
                .map(|entry| entry.unwrap().path())
                .find(|path| {
                    path.file_name()
                        .unwrap()
                        .as_encoded_bytes()
                        .starts_with(b".update-snapshot-")
                })
                .unwrap()
                .join("snapshot.db");
            let before = std::fs::read(&snapshot).unwrap();
            run(&profile, crash);
            assert!(std::fs::read(&snapshot).unwrap() == before);
            run(&profile, "recover");
            assert!(std::fs::read(&snapshot).unwrap() == before);
            let moved = root.join(format!("moved-{create}-{crash}"));
            std::fs::rename(&profile, &moved).unwrap();
            run(&moved, "recover");
            assert!(
                std::fs::read(moved.join(snapshot.strip_prefix(&profile).unwrap())).unwrap()
                    == before
            );
            let foreign = root.join(format!("foreign-{create}-{crash}"));
            jobsentinel_platform::ensure_private_dir_tree(&foreign).unwrap();
            run(&foreign, create);
            run(&foreign, "reject-receipt");
        }
    }
}
