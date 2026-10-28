//! Verifies encryption conversion, read-only refusal and atomic publication.

use super::super::connection::Database;
use sqlx::sqlite::SqlitePool;

#[tokio::test]
async fn file_database_is_not_readable_without_encryption_key() {
    let temp_dir = tempfile::tempdir().unwrap();
    let db_path = temp_dir.path().join("jobs.db");

    {
        let database = Database::connect(&db_path).await.unwrap();
        database.migrate().await.unwrap();
        sqlx::query("CREATE TABLE encryption_probe(value TEXT NOT NULL)")
            .execute(database.pool())
            .await
            .unwrap();
        sqlx::query("INSERT INTO encryption_probe(value) VALUES ('private job note')")
            .execute(database.pool())
            .await
            .unwrap();
        database.checkpoint_wal().await.unwrap();
    }

    let url = format!("sqlite://{}?mode=ro", db_path.display());
    let unkeyed_pool = SqlitePool::connect(&url).await.unwrap();
    let unkeyed_read = sqlx::query_scalar::<_, String>("SELECT value FROM encryption_probe")
        .fetch_one(&unkeyed_pool)
        .await;

    assert!(
        unkeyed_read.is_err(),
        "unkeyed SQLite connection should not read a JobSentinel database"
    );
}

#[tokio::test]
async fn encrypted_database_handles_paths_with_spaces() {
    let temp_dir = tempfile::tempdir().unwrap();
    let db_path = temp_dir
        .path()
        .join("Library")
        .join("Application Support")
        .join("JobSentinel")
        .join("jobs.db");

    let database = Database::connect(&db_path).await.unwrap();
    database.migrate().await.unwrap();
    sqlx::query("CREATE TABLE path_probe(value TEXT NOT NULL)")
        .execute(database.pool())
        .await
        .unwrap();
    sqlx::query("INSERT INTO path_probe(value) VALUES ('macOS app data path')")
        .execute(database.pool())
        .await
        .unwrap();

    let value: String = sqlx::query_scalar("SELECT value FROM path_probe")
        .fetch_one(database.pool())
        .await
        .unwrap();
    assert_eq!(value, "macOS app data path");
    database.checkpoint_wal().await.unwrap();
    database.pool().close().await;
}

#[tokio::test]
async fn encrypted_database_handles_hex_keys_starting_with_digits() {
    let temp_dir = tempfile::tempdir().unwrap();
    let db_path = temp_dir.path().join("jobs.db");
    let key = "58ffd25e23c63a6fcab6baffe23e9a667c4a1504ae07454573607f036017a9c4";

    let pool = super::connect_encrypted_pool(&db_path, key, true)
        .await
        .unwrap();
    sqlx::query("CREATE TABLE numeric_key_probe(value TEXT NOT NULL)")
        .execute(&pool)
        .await
        .unwrap();
    sqlx::query("INSERT INTO numeric_key_probe(value) VALUES ('opened')")
        .execute(&pool)
        .await
        .unwrap();
    pool.close().await;

    let reopened_pool = super::connect_encrypted_pool(&db_path, key, false)
        .await
        .unwrap();
    let value: String = sqlx::query_scalar("SELECT value FROM numeric_key_probe")
        .fetch_one(&reopened_pool)
        .await
        .unwrap();
    assert_eq!(value, "opened");
    reopened_pool.close().await;
}

#[tokio::test]
async fn encrypted_connection_sets_privacy_pragmas_before_migration() {
    let temp_dir = tempfile::tempdir().unwrap();
    let db_path = temp_dir.path().join("jobs.db");
    let key = "f13ce74a61cc859993f02767e3bb751546e4a588985f517fb8c3f8b9ad12c901";

    let pool = super::connect_encrypted_pool(&db_path, key, true)
        .await
        .unwrap();

    let secure_delete: i64 = sqlx::query_scalar("PRAGMA secure_delete")
        .fetch_one(&pool)
        .await
        .unwrap();
    let temp_store: i64 = sqlx::query_scalar("PRAGMA temp_store")
        .fetch_one(&pool)
        .await
        .unwrap();

    assert_eq!(secure_delete, 1);
    assert_eq!(temp_store, 2);
    pool.close().await;
}

#[tokio::test]
async fn plaintext_database_is_migrated_to_encrypted_storage() {
    let temp_dir = tempfile::tempdir().unwrap();
    let db_path = temp_dir.path().join("jobs.db");
    let url = format!("sqlite://{}?mode=rwc", db_path.display());

    {
        let plaintext_pool = SqlitePool::connect(&url).await.unwrap();
        sqlx::query("CREATE TABLE encryption_probe(value TEXT NOT NULL)")
            .execute(&plaintext_pool)
            .await
            .unwrap();
        sqlx::query("INSERT INTO encryption_probe(value) VALUES ('preserved local record')")
            .execute(&plaintext_pool)
            .await
            .unwrap();
        plaintext_pool.close().await;
    }

    {
        let database = Database::connect(&db_path).await.unwrap();
        let value: String = sqlx::query_scalar("SELECT value FROM encryption_probe")
            .fetch_one(database.pool())
            .await
            .unwrap();
        assert_eq!(value, "preserved local record");
        database.checkpoint_wal().await.unwrap();
    }

    let unkeyed_pool = SqlitePool::connect(&url).await.unwrap();
    let unkeyed_read = sqlx::query_scalar::<_, String>("SELECT value FROM encryption_probe")
        .fetch_one(&unkeyed_pool)
        .await;
    assert!(
        unkeyed_read.is_err(),
        "plaintext migration should leave only encrypted storage behind"
    );
}

#[tokio::test]
async fn plaintext_upgrade_deletes_temporary_plaintext_backup_after_success() {
    let temp_dir = tempfile::tempdir().unwrap();
    let db_path = temp_dir.path().join("jobs.db");
    let backup_dir = temp_dir.path().join("backups");
    let url = format!("sqlite://{}?mode=rwc", db_path.display());

    {
        let plaintext_pool = SqlitePool::connect(&url).await.unwrap();
        sqlx::query("CREATE TABLE encryption_probe(value TEXT NOT NULL)")
            .execute(&plaintext_pool)
            .await
            .unwrap();
        sqlx::query("INSERT INTO encryption_probe(value) VALUES ('temporary backup probe')")
            .execute(&plaintext_pool)
            .await
            .unwrap();
        plaintext_pool.close().await;
    }
    let key = super::load_or_create_database_key().await.unwrap();
    super::encrypt_plaintext_database(&db_path, &key)
        .await
        .unwrap();

    let leftovers: Vec<_> = std::fs::read_dir(&backup_dir)
        .into_iter()
        .flatten()
        .filter_map(Result::ok)
        .filter(|entry| {
            entry
                .file_name()
                .to_string_lossy()
                .starts_with("plaintext_before_encryption_")
        })
        .collect();

    assert!(
        leftovers.is_empty(),
        "successful plaintext upgrade must not leave plaintext backup files"
    );
}

#[test]
fn failed_encryption_publication_preserves_primary() {
    let root = tempfile::tempdir().unwrap();
    let primary = root.path().join("jobs.db");
    std::fs::write(&primary, b"original").unwrap();
    assert!(super::replace_database_file(&primary, &root.path().join("missing")).is_err());
    assert_eq!(std::fs::read(primary).unwrap(), b"original");
}

#[tokio::test]
async fn newer_same_generation_data_is_refused_without_changing_main_or_wal() {
    use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions};
    let next = crate::connection::MIGRATOR
        .iter()
        .map(|migration| migration.version)
        .max()
        .unwrap()
        + 1;
    for encrypted in [false, true] {
        for ledger in [false, true] {
            let root = tempfile::tempdir().unwrap();
            let path = root.path().join("jobs.db");
            let key = super::load_or_create_database_key().await.unwrap();
            let pool = if encrypted {
                super::connect_encrypted_pool(&path, &key, true)
                    .await
                    .unwrap()
            } else {
                SqlitePoolOptions::new()
                    .max_connections(1)
                    .connect_with(
                        SqliteConnectOptions::new()
                            .filename(&path)
                            .create_if_missing(true)
                            .journal_mode(SqliteJournalMode::Wal),
                    )
                    .await
                    .unwrap()
            };
            sqlx::query("PRAGMA wal_autocheckpoint = 0")
                .execute(&pool)
                .await
                .unwrap();
            sqlx::query("PRAGMA user_version = 2")
                .execute(&pool)
                .await
                .unwrap();
            if ledger {
                sqlx::query("CREATE TABLE _sqlx_migrations(version BIGINT PRIMARY KEY)")
                    .execute(&pool)
                    .await
                    .unwrap();
                sqlx::query("INSERT INTO _sqlx_migrations VALUES (?)")
                    .bind(next)
                    .execute(&pool)
                    .await
                    .unwrap();
            } else {
                sqlx::query("CREATE TABLE v3_compatibility_metadata(compatibility_line INTEGER, database_schema INTEGER, migration_version INTEGER)").execute(&pool).await.unwrap();
                sqlx::query("INSERT INTO v3_compatibility_metadata VALUES (3, 2, ?)")
                    .bind(next)
                    .execute(&pool)
                    .await
                    .unwrap();
            }
            let wal = super::sqlite_sidecar_path(&path, "-wal");
            let before = (std::fs::read(&path).unwrap(), std::fs::read(&wal).unwrap());
            let error = Database::connect(&path).await.unwrap_err();
            assert!(error.to_string().contains("Unsupported newer"), "{error}");
            assert_eq!(
                before,
                (std::fs::read(&path).unwrap(), std::fs::read(&wal).unwrap())
            );
            pool.close().await;
        }
    }
}

#[tokio::test]
async fn plaintext_conversion_preserves_committed_wal_rows_and_generation() {
    use sqlx::sqlite::{SqliteConnectOptions, SqliteJournalMode, SqlitePoolOptions};
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("jobs.db");
    let source = SqlitePoolOptions::new()
        .max_connections(1)
        .connect_with(
            SqliteConnectOptions::new()
                .filename(&path)
                .create_if_missing(true)
                .journal_mode(SqliteJournalMode::Wal),
        )
        .await
        .unwrap();
    sqlx::query("PRAGMA wal_autocheckpoint = 0")
        .execute(&source)
        .await
        .unwrap();
    sqlx::query("PRAGMA user_version = 2")
        .execute(&source)
        .await
        .unwrap();
    sqlx::query("CREATE TABLE wal_probe(value TEXT)")
        .execute(&source)
        .await
        .unwrap();
    sqlx::query("INSERT INTO wal_probe VALUES ('committed in WAL')")
        .execute(&source)
        .await
        .unwrap();
    assert!(
        std::fs::metadata(super::sqlite_sidecar_path(&path, "-wal"))
            .unwrap()
            .len()
            > 0
    );
    let converted = Database::connect(&path).await.unwrap();
    assert_eq!(
        sqlx::query_scalar::<_, String>("SELECT value FROM wal_probe")
            .fetch_one(converted.pool())
            .await
            .unwrap(),
        "committed in WAL"
    );
    assert_eq!(
        sqlx::query_scalar::<_, i64>("PRAGMA user_version")
            .fetch_one(converted.pool())
            .await
            .unwrap(),
        2
    );
    source.close().await;
    converted.pool().close().await;
}

#[tokio::test]
async fn encryption_crash_writer_helper() {
    let Some(path) = std::env::var_os("JOBSENTINEL_ENCRYPTION_CRASH_PATH") else {
        return;
    };
    let path = std::path::PathBuf::from(path);
    let source = SqlitePool::connect_with(
        sqlx::sqlite::SqliteConnectOptions::new()
            .filename(&path)
            .create_if_missing(true)
            .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal),
    )
    .await
    .unwrap();
    sqlx::query("PRAGMA wal_autocheckpoint = 0")
        .execute(&source)
        .await
        .unwrap();
    sqlx::query("CREATE TABLE crash_probe(value TEXT)")
        .execute(&source)
        .await
        .unwrap();
    sqlx::query("INSERT INTO crash_probe VALUES ('committed before crash')")
        .execute(&source)
        .await
        .unwrap();
    let key = super::load_or_create_database_key().await.unwrap();
    super::CRASH_BEFORE_PUBLICATION
        .scope((), super::encrypt_plaintext_database(&path, &key))
        .await
        .unwrap();
    panic!("publication hook did not terminate child");
}

#[tokio::test]
async fn interrupted_encryption_retains_primary_and_retries_without_empty_recreation() {
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("jobs.db");
    let status = std::process::Command::new(std::env::current_exe().unwrap())
        .args([
            "--exact",
            "encryption::tests::encryption_crash_writer_helper",
            "--nocapture",
        ])
        .env("JOBSENTINEL_ENCRYPTION_CRASH_PATH", &path)
        .status()
        .unwrap();
    assert_eq!(status.code(), Some(91));
    assert!(path.exists());
    let database = Database::connect(&path).await.unwrap();
    assert_eq!(
        sqlx::query_scalar::<_, String>("SELECT value FROM crash_probe")
            .fetch_one(database.pool())
            .await
            .unwrap(),
        "committed before crash"
    );
}

#[tokio::test]
async fn missing_primary_with_legacy_conversion_artifact_is_not_recreated() {
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("jobs.db");
    let recovery = path.with_extension("db.sqlcipher-new");
    std::fs::write(&recovery, b"preserved legacy recovery artifact").unwrap();
    assert!(Database::connect(&path)
        .await
        .unwrap_err()
        .to_string()
        .contains("requires recovery"));
    assert!(!path.exists());
    assert_eq!(
        std::fs::read(recovery).unwrap(),
        b"preserved legacy recovery artifact"
    );
}
