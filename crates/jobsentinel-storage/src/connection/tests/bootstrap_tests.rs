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
async fn existing_database_with_missing_key_fails_closed_without_writing_a_key() {
    use crate::encryption::test_key;
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("jobs.db");
    let database = Database::connect(&path).await.unwrap();
    database.pool().close().await;
    drop(database);
    test_key::clear();
    for _ in 0..2 {
        let error = Database::connect(&path).await.unwrap_err();
        assert!(error
            .to_string()
            .contains("could not unlock local database encryption"));
    }
    assert_eq!(test_key::writes(), 0);
}

#[tokio::test]
async fn new_database_creates_its_key_exactly_once() {
    use crate::encryption::test_key;
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("jobs.db");
    test_key::clear();
    for _ in 0..2 {
        let database = Database::connect(&path).await.unwrap();
        database.pool().close().await;
        drop(database);
    }
    assert_eq!(test_key::writes(), 1);
}

#[test]
fn bare_file_name_bootstraps_in_the_current_directory() {
    use crate::connection::bootstrap::bootstrap_parent;
    assert_eq!(bootstrap_parent(Path::new("jobs.db")), Path::new("."));
    assert_eq!(
        bootstrap_parent(Path::new("data/jobs.db")),
        Path::new("data")
    );
}

#[test]
fn primary_existence_reports_errors_instead_of_absence() {
    use crate::connection::bootstrap::primary_entry_exists;
    let root = tempfile::tempdir().unwrap();
    let file = root.path().join("not-a-directory");
    std::fs::write(&file, b"").unwrap();
    assert!(!primary_entry_exists(&root.path().join("jobs.db")).unwrap());
    let error = primary_entry_exists(&file.join("jobs.db")).unwrap_err();
    assert_ne!(error.kind(), std::io::ErrorKind::NotFound);
}

#[cfg(unix)]
#[tokio::test]
async fn dangling_primary_symlink_is_existing_data_not_a_new_database() {
    use crate::encryption::test_key;
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("jobs.db");
    let target = root.path().join("missing-target.db");
    std::os::unix::fs::symlink(&target, &path).unwrap();
    test_key::clear();
    assert!(Database::connect(&path).await.is_err());
    assert_eq!(test_key::writes(), 0);
    assert!(std::fs::symlink_metadata(&path).unwrap().is_symlink());
    assert!(!target.exists());
}

#[tokio::test]
async fn encrypted_unmarked_and_inconsistent_data_are_preserved() {
    for version in [None, Some(10), Some(11)] {
        let root = tempfile::tempdir().unwrap();
        let path = root.path().join("jobs.db");
        let key = load_database_key(true).await.unwrap();
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
    let key = load_database_key(true).await.unwrap();
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
        assert_corrupt_identity_preserves_files(corruption).await;
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
    let key = load_database_key(true).await.unwrap();
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
    let key = load_database_key(true).await.unwrap();
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
async fn missing_primary_with_encrypted_recovery_copies_never_creates_a_key() {
    use crate::encryption::test_key;
    for copy in [
        ".update-snapshot-x/snapshot.db",
        "backups/restore_rollback_x.db",
        "backups/restore_quarantine_x.db",
        "backups/backup_pre_migration_x.db",
        "backups/0a1b2c/migration_snapshot_v1_to_v2_x.db",
        "jobs.db.restore-x.failed",
        "jobs.db.restore-stage",
        "jobs.db.restore-x.previous",
        "jobs.db.restore-invalid-x.stage",
    ] {
        let root = tempfile::tempdir().unwrap();
        let path = root.path().join("jobs.db");
        let copy = root.path().join(copy);
        std::fs::create_dir_all(copy.parent().unwrap()).unwrap();
        std::fs::write(&copy, b"encrypted with the missing key").unwrap();
        test_key::clear();
        assert!(Database::connect(&path).await.is_err(), "{copy:?}");
        assert_eq!(test_key::writes(), 0);
        assert!(!path.exists());
        assert_eq!(
            std::fs::read(&copy).unwrap(),
            b"encrypted with the missing key"
        );
    }
}

#[tokio::test]
async fn fresh_install_beside_unrelated_files_creates_its_key() {
    use crate::encryption::test_key;
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("jobs.db");
    std::fs::write(root.path().join("config.json"), b"{}").unwrap();
    std::fs::write(root.path().join("other.db.restore-x.failed"), b"").unwrap();
    test_key::clear();
    let database = Database::connect(&path).await.unwrap();
    database.pool().close().await;
    assert_eq!(test_key::writes(), 1);
}
