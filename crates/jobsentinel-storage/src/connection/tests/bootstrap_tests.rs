//! Verifies atomic supported-v3 bootstrap and non-mutating refusal of ambiguous stores.

use super::*;

#[tokio::test]
async fn fresh_connection_publishes_only_a_supported_v3_database() {
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("jobs.db");
    let database = Database::connect(&path).await.unwrap();
    let metadata: (i64, i64) = sqlx::query_as(
        "SELECT compatibility_line, migration_version FROM compatibility_metadata WHERE singleton = 1",
    ).fetch_one(database.pool()).await.unwrap();
    assert_eq!(
        metadata,
        (
            3,
            MIGRATOR
                .iter()
                .map(|migration| migration.version)
                .max()
                .unwrap()
        )
    );
    database.pool().close().await;
    drop(database);
    let reopened = Database::connect(&path).await.unwrap();
    reopened.migrate().await.unwrap();
}

#[tokio::test]
async fn encrypted_unmarked_and_inconsistent_data_are_preserved() {
    for version in [None, Some(10), Some(11)] {
        let root = tempfile::tempdir().unwrap();
        let path = root.path().join("jobs.db");
        let key = load_or_create_database_key().await.unwrap();
        let pool = connect_encrypted_pool(&path, &key, true).await.unwrap();
        sqlx::query("PRAGMA wal_autocheckpoint = 0")
            .execute(&pool)
            .await
            .unwrap();
        if let Some(version) = version {
            MIGRATOR.run_to(version, &pool).await.unwrap();
            if version == 11 {
                sqlx::query("DROP TABLE v3_compatibility_metadata")
                    .execute(&pool)
                    .await
                    .unwrap();
            }
        }
        sqlx::query("CREATE TABLE private_record (value TEXT)")
            .execute(&pool)
            .await
            .unwrap();
        sqlx::query("INSERT INTO private_record VALUES ('keep me')")
            .execute(&pool)
            .await
            .unwrap();
        sqlx::query("PRAGMA user_version = 2")
            .execute(&pool)
            .await
            .unwrap();
        let wal = crate::encryption::sqlite_sidecar_path(&path, "-wal");
        let before = (std::fs::read(&path).unwrap(), std::fs::read(&wal).unwrap());
        let error = Database::connect(&path).await.unwrap_err();
        assert!(error.to_string().contains("requires recovery"), "{error}");
        assert_eq!(
            before,
            (std::fs::read(&path).unwrap(), std::fs::read(&wal).unwrap())
        );
        pool.close().await;
    }
}

#[tokio::test]
async fn first_supported_v3_store_reopens_and_migrates_with_a_recovery_snapshot() {
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("jobs.db");
    let key = load_or_create_database_key().await.unwrap();
    let pool = connect_encrypted_pool(&path, &key, true).await.unwrap();
    MIGRATOR.run_to(11, &pool).await.unwrap();
    sqlx::query("INSERT INTO jobs (hash, title, company, url, source) VALUES ('supported-v3', 'Role', 'Example', 'https://example.test/job', 'test')")
        .execute(&pool).await.unwrap();
    pool.close().await;
    let reopened = Database::connect(&path).await.unwrap();
    reopened.migrate().await.unwrap();
    assert_eq!(
        sqlx::query_scalar::<_, String>("SELECT title FROM jobs WHERE hash = 'supported-v3'")
            .fetch_one(reopened.pool())
            .await
            .unwrap(),
        "Role"
    );
    assert!(root.path().join("backups").exists());
}

#[tokio::test]
async fn inconsistent_v3_identity_is_refused_without_changing_main_or_wal() {
    for corruption in [
        "DELETE FROM compatibility_metadata",
        "DELETE FROM _sqlx_migrations WHERE version = 11",
        "UPDATE _sqlx_migrations SET success = 0 WHERE version = 11",
        "UPDATE _sqlx_migrations SET checksum = X'00' WHERE version = 11",
    ] {
        let root = tempfile::tempdir().unwrap();
        let path = root.path().join("jobs.db");
        let database = Database::connect(&path).await.unwrap();
        sqlx::query("PRAGMA wal_autocheckpoint = 0")
            .execute(database.pool())
            .await
            .unwrap();
        sqlx::query(corruption)
            .execute(database.pool())
            .await
            .unwrap();
        // Retain the WAL while releasing only JobSentinel's process owner.
        let pool = database.pool().clone();
        drop(database);
        let wal = crate::encryption::sqlite_sidecar_path(&path, "-wal");
        let before = (std::fs::read(&path).unwrap(), std::fs::read(&wal).unwrap());
        let error = Database::connect(&path).await.unwrap_err();
        assert!(
            error
                .to_string()
                .contains("inconsistent; requires recovery"),
            "{error}"
        );
        assert_eq!(
            before,
            (std::fs::read(&path).unwrap(), std::fs::read(&wal).unwrap())
        );
        pool.close().await;
    }
}

#[tokio::test]
async fn failed_bootstrap_keeps_primary_absent_and_can_retry() {
    use sqlx::{
        migrate::{Migration, MigrationType, Migrator},
        SqlSafeStr,
    };
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("jobs.db");
    let key = load_or_create_database_key().await.unwrap();
    let _owner = Database::acquire_owner_lock(&path).unwrap();
    let migrations = MIGRATOR
        .iter()
        .filter(|migration| migration.version < 11)
        .cloned()
        .chain(std::iter::once(Migration::new(
            11,
            "injected failure".into(),
            MigrationType::Simple,
            "SELECT missing_function();".into_sql_str(),
            false,
        )))
        .collect();
    assert!(
        Database::bootstrap_database(&path, &key, &Migrator::with_migrations(migrations))
            .await
            .is_err()
    );
    assert!(!path.exists());
    assert_eq!(
        std::fs::read_dir(root.path()).unwrap().count(),
        1,
        "only the owner lock remains"
    );
    Database::bootstrap_database(&path, &key, &MIGRATOR)
        .await
        .unwrap();
    assert!(path.exists());
}

#[tokio::test]
async fn bootstrap_publication_never_overwrites_an_existing_destination() {
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("jobs.db");
    std::fs::write(&path, b"existing user data").unwrap();
    let key = load_or_create_database_key().await.unwrap();
    let _owner = Database::acquire_owner_lock(&path).unwrap();
    assert!(Database::bootstrap_database(&path, &key, &MIGRATOR)
        .await
        .is_err());
    assert_eq!(std::fs::read(&path).unwrap(), b"existing user data");
}

#[tokio::test]
async fn bootstrap_crash_writer_helper() {
    let Some(path) = std::env::var_os("JOBSENTINEL_BOOTSTRAP_CRASH_DB") else {
        return;
    };
    let point = std::env::var("JOBSENTINEL_BOOTSTRAP_CRASH_POINT")
        .unwrap()
        .parse()
        .unwrap();
    super::super::bootstrap::BOOTSTRAP_CRASH_POINT
        .scope(point, Database::connect(Path::new(&path)))
        .await
        .unwrap();
    panic!("bootstrap crash hook did not terminate child");
}

#[tokio::test]
async fn interrupted_bootstrap_never_publishes_an_ambiguous_primary_and_retries() {
    for point in [1, 2] {
        let root = tempfile::tempdir().unwrap();
        let path = root.path().join("jobs.db");
        let status = std::process::Command::new(std::env::current_exe().unwrap())
            .args([
                "--exact",
                "connection::tests::bootstrap_tests::bootstrap_crash_writer_helper",
            ])
            .env("JOBSENTINEL_BOOTSTRAP_CRASH_DB", &path)
            .env("JOBSENTINEL_BOOTSTRAP_CRASH_POINT", point.to_string())
            .status()
            .unwrap();
        assert_eq!(status.code(), Some(90 + point));
        assert!(!path.exists());
        let database = Database::connect(&path).await.unwrap();
        database.migrate().await.unwrap();
        assert_eq!(
            sqlx::query_scalar::<_, i64>("SELECT compatibility_line FROM compatibility_metadata")
                .fetch_one(database.pool())
                .await
                .unwrap(),
            3
        );
    }
}

#[tokio::test]
async fn missing_primary_with_orphaned_sqlite_sidecars_is_not_recreated() {
    for suffix in ["-wal", "-shm", "-journal"] {
        let root = tempfile::tempdir().unwrap();
        let path = root.path().join("jobs.db");
        let artifact = crate::encryption::sqlite_sidecar_path(&path, suffix);
        std::fs::write(&artifact, b"preserved recovery evidence").unwrap();
        assert!(Database::connect(&path)
            .await
            .unwrap_err()
            .to_string()
            .contains("requires recovery"));
        assert!(!path.exists());
        assert_eq!(
            std::fs::read(artifact).unwrap(),
            b"preserved recovery evidence"
        );
    }
}

#[tokio::test]
async fn portable_primary_reopens_after_moving_without_device_keys() {
    let root = tempfile::tempdir().unwrap();
    let profile = root.path().join("original");
    let path = profile.join("jobs.db");
    let passphrase = "portable primary passphrase";
    let database = Database::connect_portable(&path, passphrase).await.unwrap();
    sqlx::query("INSERT INTO jobs (hash, title, company, url, source) VALUES ('portable', 'Role', 'Example', 'https://example.test/job', 'test')")
        .execute(database.pool()).await.unwrap();
    assert!(Database::connect_portable(&path, passphrase).await.is_err());
    database.close().await;
    drop(database);
    let moved = root.path().join("moved");
    std::fs::rename(profile, &moved).unwrap();
    let path = moved.join("jobs.db");
    let before = std::fs::read(&path).unwrap();
    assert!(
        Database::connect_portable(&path, "incorrect portable passphrase")
            .await
            .is_err()
    );
    assert_eq!(std::fs::read(&path).unwrap(), before);
    for suffix in ["-wal", "-shm", "-journal"] {
        assert!(!crate::encryption::sqlite_sidecar_path(&path, suffix).exists());
    }
    let reopened = Database::connect_portable(&path, passphrase).await.unwrap();
    assert_eq!(
        sqlx::query_scalar::<_, String>("SELECT title FROM jobs WHERE hash = 'portable'")
            .fetch_one(reopened.pool())
            .await
            .unwrap(),
        "Role"
    );
    reopened.migrate().await.unwrap();
    reopened.close().await;
}

#[tokio::test]
async fn portable_primary_refuses_bad_passphrases_before_creating_files() {
    let root = tempfile::tempdir().unwrap();
    for passphrase in [
        "short",
        "                ",
        " 123456789012345 ",
        &"x".repeat(1025),
    ] {
        let path = root.path().join("absent").join("jobs.db");
        assert!(Database::verify_portable_passphrase(&path, passphrase)
            .await
            .is_err());
        assert!(Database::connect_portable(&path, passphrase).await.is_err());
        assert!(!path.parent().unwrap().exists());
    }
}

#[tokio::test]
async fn portable_authentication_only_calls_an_empty_profile_new() {
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("absent").join("jobs.db");
    assert!(Database::portable_primary_is_new(&path).unwrap());
    Database::verify_portable_passphrase(&path, "confirmed portable passphrase")
        .await
        .unwrap();
    assert!(!path.parent().unwrap().exists());
    // Existing portable backup keys retain their historical boundary-space policy.
    assert!(super::super::portable_backup::validate_backup_passphrase(" 123456789012345 ").is_ok());
    std::fs::create_dir(path.parent().unwrap()).unwrap();
    let evidence = path.parent().unwrap().join("unexplained.db-wal");
    std::fs::write(&evidence, b"preserved").unwrap();
    assert!(!Database::portable_primary_is_new(&path).unwrap());
    assert!(
        Database::verify_portable_passphrase(&path, "confirmed portable passphrase")
            .await
            .is_err()
    );
    assert!(!path.exists());
    assert_eq!(std::fs::read(evidence).unwrap(), b"preserved");
    assert_eq!(
        std::fs::read_dir(path.parent().unwrap()).unwrap().count(),
        1
    );
}

#[tokio::test]
async fn portable_authentication_preserves_durable_wal_bytes_and_sidecar_presence() {
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("jobs.db");
    let key = "portable authentication passphrase";
    let database = Database::connect_portable(&path, key).await.unwrap();
    sqlx::query("PRAGMA wal_autocheckpoint = 0")
        .execute(database.pool())
        .await
        .unwrap();
    sqlx::query("INSERT INTO jobs(hash,title,company,url,source) VALUES('auth','Role','Example','https://example.test/auth','test')").execute(database.pool()).await.unwrap();
    let before = super::portable_restore_tests::database_bytes(&path);
    assert!(
        Database::verify_portable_passphrase(&path, "incorrect portable passphrase")
            .await
            .is_err()
    );
    for (index, (after, before)) in super::portable_restore_tests::database_bytes(&path)
        .iter()
        .zip(&before)
        .enumerate()
    {
        if index == 2 {
            assert_eq!(
                after.is_some(),
                before.is_some(),
                "SHM sidecar presence changed"
            );
        } else {
            assert!(
                after == before,
                "Durable SQLite component {index} changed during authentication"
            );
        }
    }
    Database::verify_portable_passphrase(&path, key)
        .await
        .unwrap();
    for (index, (after, before)) in super::portable_restore_tests::database_bytes(&path)
        .iter()
        .zip(&before)
        .enumerate()
    {
        if index == 2 {
            assert_eq!(
                after.is_some(),
                before.is_some(),
                "SHM sidecar presence changed"
            );
        } else {
            assert!(
                after == before,
                "Durable SQLite component {index} changed during authentication"
            );
        }
    }
    database.close().await;
    let before = super::portable_restore_tests::database_bytes(&path);
    Database::verify_portable_passphrase(&path, key)
        .await
        .unwrap();
    for (index, (after, before)) in super::portable_restore_tests::database_bytes(&path)
        .iter()
        .zip(&before)
        .enumerate()
    {
        if index == 2 {
            assert_eq!(
                after.is_some(),
                before.is_some(),
                "SHM sidecar presence changed"
            );
        } else {
            assert!(
                after == before,
                "Durable SQLite component {index} changed during authentication"
            );
        }
    }
}

#[tokio::test]
async fn portable_primary_refuses_future_and_unmarked_stores_without_mutation() {
    for future in [false, true] {
        let root = tempfile::tempdir().unwrap();
        let path = root.path().join("jobs.db");
        let passphrase = "portable primary passphrase";
        let pool = connect_encrypted_pool(&path, passphrase, true)
            .await
            .unwrap();
        sqlx::query("CREATE TABLE private_record (value TEXT)")
            .execute(&pool)
            .await
            .unwrap();
        if future {
            sqlx::query("PRAGMA user_version = 999")
                .execute(&pool)
                .await
                .unwrap();
        }
        pool.close().await;
        let before = std::fs::read(&path).unwrap();
        let error = Database::connect_portable(&path, passphrase)
            .await
            .unwrap_err();
        assert!(
            error
                .to_string()
                .contains(if future { "newer" } else { "recovery" }),
            "{error}"
        );
        assert_eq!(std::fs::read(&path).unwrap(), before);
        for suffix in ["-wal", "-shm", "-journal"] {
            assert!(!crate::encryption::sqlite_sidecar_path(&path, suffix).exists());
        }
    }
}
