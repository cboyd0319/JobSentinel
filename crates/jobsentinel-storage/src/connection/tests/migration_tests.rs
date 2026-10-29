//! Verifies migration recovery, snapshot ownership and forward-only data boundaries.

use super::*;
use sqlx::{
    migrate::{Migration, MigrationType, Migrator},
    SqlSafeStr,
};

fn database_copies(path: &std::path::Path) -> Vec<std::path::PathBuf> {
    let mut copies: Vec<_> = std::fs::read_dir(path)
        .into_iter()
        .flatten()
        .filter_map(Result::ok)
        .flat_map(|entry| {
            let path = entry.path();
            if path.is_dir() {
                database_copies(&path)
            } else {
                vec![path]
            }
        })
        .filter(|path| path.extension().is_some_and(|extension| extension == "db"))
        .collect();
    copies.sort();
    copies
}

fn transition_snapshots(path: &std::path::Path, from: i64, to: i64) -> Vec<std::path::PathBuf> {
    let prefix = format!("migration_snapshot_v{from}_to_v{to}");
    database_copies(path)
        .into_iter()
        .filter(|path| {
            path.file_name()
                .is_some_and(|name| name.to_string_lossy().starts_with(&prefix))
        })
        .collect()
}

fn current_version() -> i64 {
    MIGRATOR
        .iter()
        .map(|migration| migration.version)
        .max()
        .unwrap()
}

async fn seed_supported_data(database: &Database) {
    sqlx::query(
        "INSERT INTO jobs (hash, title, company, url, source)
         VALUES ('job-v3', 'Security Analyst', 'Example', 'https://example.test/job', 'test')",
    )
    .execute(database.pool())
    .await
    .unwrap();
    sqlx::query(
        "INSERT INTO applications (job_hash, status, notes)
         VALUES ('job-v3', 'applied', 'local application note')",
    )
    .execute(database.pool())
    .await
    .unwrap();
    sqlx::query(
        "INSERT INTO resumes (name, file_path, parsed_text)
         VALUES ('Primary', '/local/resume.pdf', 'local resume evidence')",
    )
    .execute(database.pool())
    .await
    .unwrap();
    sqlx::query(
        "INSERT INTO source_request_log
         (source, endpoint_host, title_count, outcome)
         VALUES ('test', 'example.test', 1, 'success')",
    )
    .execute(database.pool())
    .await
    .unwrap();
    sqlx::query(
        "INSERT INTO secret_vault
         (key, algorithm, key_version, nonce, ciphertext)
         VALUES ('source-token', 'xchacha20poly1305', 1, zeroblob(24), x'0102')",
    )
    .execute(database.pool())
    .await
    .unwrap();
}

fn migrator_with(migration: Migration) -> Migrator {
    let mut migrations: Vec<_> = MIGRATOR.iter().cloned().collect();
    migrations.push(migration);
    Migrator::with_migrations(migrations)
}

fn test_migration(version: i64, description: &'static str, sql: &'static str) -> Migration {
    Migration::new(
        version,
        description.into(),
        MigrationType::Simple,
        sql.into_sql_str(),
        false,
    )
}

#[tokio::test]
async fn current_database_does_not_create_a_migration_snapshot() {
    let temp_dir = tempfile::tempdir().unwrap();
    let db_path = temp_dir.path().join("jobs.db");
    let database = Database::connect(&db_path).await.unwrap();

    database.migrate().await.unwrap();
    database.migrate().await.unwrap();

    assert!(database_copies(&temp_dir.path().join("backups")).is_empty());
}

#[tokio::test]
async fn concurrent_snapshot_creation_keeps_each_attempt_isolated() {
    let temp_dir = tempfile::tempdir().unwrap();
    let db_path = temp_dir.path().join("jobs.db");
    let database = Database::connect(&db_path).await.unwrap();

    let (left, right) = tokio::join!(
        Database::ensure_migration_snapshot(
            database.pool(),
            &db_path,
            current_version(),
            current_version() + 1
        ),
        Database::ensure_migration_snapshot(
            database.pool(),
            &db_path,
            current_version(),
            current_version() + 1
        )
    );

    assert_ne!(left.unwrap(), right.unwrap());
    assert_eq!(database_copies(&temp_dir.path().join("backups")).len(), 2);
}

#[tokio::test]
async fn required_snapshot_failure_prevents_pending_ddl() {
    let temp_dir = tempfile::tempdir().unwrap();
    let db_path = temp_dir.path().join("jobs.db");
    let database = Database::connect(&db_path).await.unwrap();
    std::fs::write(temp_dir.path().join("backups"), b"not a directory").unwrap();

    let pending = migrator_with(test_migration(
        current_version() + 1,
        "pending DDL",
        "CREATE TABLE pending_ddl (id INTEGER);",
    ));
    let error = database.migrate_with(&pending).await.unwrap_err();

    assert!(error
        .to_string()
        .contains("Required migration recovery snapshot failed"));
    let applied: i64 = sqlx::query_scalar("SELECT MAX(version) FROM _sqlx_migrations")
        .fetch_one(database.pool())
        .await
        .unwrap();
    assert_eq!(applied, current_version());
    let pending_tables: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sqlite_master
         WHERE type = 'table' AND name = 'pending_ddl'",
    )
    .fetch_one(database.pool())
    .await
    .unwrap();
    assert_eq!(pending_tables, 0);
}

#[tokio::test]
async fn supported_v3_migration_preserves_local_data() {
    let temp_dir = tempfile::tempdir().unwrap();
    let db_path = temp_dir.path().join("jobs.db");
    let database = Database::connect(&db_path).await.unwrap();
    seed_supported_data(&database).await;

    let next = migrator_with(test_migration(
        current_version() + 1,
        "supported transition",
        "CREATE TABLE transition_probe (id INTEGER);",
    ));
    database.migrate_with(&next).await.unwrap();

    let preserved: (String, String, String, String, Vec<u8>) = sqlx::query_as(
        "SELECT j.title, a.notes, r.parsed_text, s.outcome, v.ciphertext
         FROM jobs j
         JOIN applications a ON a.job_hash = j.hash
         CROSS JOIN resumes r
         CROSS JOIN source_request_log s
         CROSS JOIN secret_vault v
         WHERE j.hash = 'job-v3' AND v.key = 'source-token'",
    )
    .fetch_one(database.pool())
    .await
    .unwrap();
    assert_eq!(
        preserved,
        (
            "Security Analyst".to_string(),
            "local application note".to_string(),
            "local resume evidence".to_string(),
            "success".to_string(),
            vec![1, 2],
        )
    );
    assert_eq!(database_copies(&temp_dir.path().join("backups")).len(), 1);
}

#[tokio::test]
async fn evidence_packet_tables_are_present_for_memory_and_reopened_v3_databases() {
    let fresh = Database::connect_memory().await.unwrap();
    fresh.migrate().await.unwrap();

    let temp_dir = tempfile::tempdir().unwrap();
    let path = temp_dir.path().join("jobs.db");
    let database = Database::connect(&path).await.unwrap();
    database.pool().close().await;
    drop(database);
    let reopened = Database::connect(&path).await.unwrap();
    reopened.migrate().await.unwrap();

    for database in [&fresh, &reopened] {
        let tables: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM sqlite_master
             WHERE type = 'table'
               AND name IN (
                   'v3_evidence_packets',
                   'v3_evidence_packet_evidence',
                   'v3_evidence_packet_boundaries'
               )",
        )
        .fetch_one(database.pool())
        .await
        .unwrap();
        assert_eq!(tables, 3);
    }
}

#[tokio::test]
async fn failed_migration_keeps_fresh_baselines_until_retry_succeeds() {
    let temp_dir = tempfile::tempdir().unwrap();
    let db_path = temp_dir.path().join("jobs.db");
    let database = Database::connect(&db_path).await.unwrap();
    database.migrate().await.unwrap();
    let current = MIGRATOR
        .iter()
        .map(|migration| migration.version)
        .max()
        .unwrap();
    let next = current + 1;
    let failing = migrator_with(test_migration(
        next,
        "injected failure",
        "CREATE TABLE injected_failure (id INTEGER); SELECT missing_function();",
    ));

    assert!(database.migrate_with(&failing).await.is_err());
    let backup_dir = temp_dir.path().join("backups");
    let snapshots = transition_snapshots(&backup_dir, current, next);
    assert_eq!(snapshots.len(), 1);
    assert!(database.migrate_with(&failing).await.is_err());
    assert_eq!(transition_snapshots(&backup_dir, current, next).len(), 2);
    let applied: i64 = sqlx::query_scalar("SELECT MAX(version) FROM _sqlx_migrations")
        .fetch_one(database.pool())
        .await
        .unwrap();
    assert_eq!(applied, current);

    let repaired = migrator_with(test_migration(
        next,
        "injected repair",
        "CREATE TABLE injected_repair (id INTEGER PRIMARY KEY);",
    ));
    database.migrate_with(&repaired).await.unwrap();
    assert_eq!(database_copies(&backup_dir).len(), 1);
    assert!(!snapshots[0].exists());
}

#[tokio::test]
async fn same_device_snapshot_restores_then_retries_migration() {
    let temp_dir = tempfile::tempdir().unwrap();
    let data_dir = temp_dir.path().join("restore space-π");
    let db_path = data_dir.join("jobs data.db");
    let database = Database::connect(&db_path).await.unwrap();
    seed_supported_data(&database).await;
    let next = current_version() + 1;
    let failing = migrator_with(test_migration(
        next,
        "injected failure",
        "CREATE TABLE injected_failure (id INTEGER); SELECT missing_function();",
    ));

    assert!(database.migrate_with(&failing).await.is_err());
    let snapshot = database_copies(&data_dir.join("backups"))
        .pop()
        .expect("failed transition should retain one recovery snapshot");
    database.pool().close().await;
    drop(database);
    std::fs::copy(&snapshot, &db_path).unwrap();
    for suffix in ["-wal", "-shm"] {
        let mut name = db_path.file_name().unwrap().to_os_string();
        name.push(suffix);
        let _ = std::fs::remove_file(db_path.with_file_name(name));
    }

    let restored = Database::connect(&db_path).await.unwrap();
    let note: String =
        sqlx::query_scalar("SELECT notes FROM applications WHERE job_hash = 'job-v3'")
            .fetch_one(restored.pool())
            .await
            .unwrap();
    assert_eq!(note, "local application note");
    let repaired = migrator_with(test_migration(
        next,
        "injected repair",
        "CREATE TABLE injected_repair (id INTEGER PRIMARY KEY);",
    ));
    restored.migrate_with(&repaired).await.unwrap();
    let compatibility_line: i64 =
        sqlx::query_scalar("SELECT compatibility_line FROM v3_compatibility_metadata")
            .fetch_one(restored.pool())
            .await
            .unwrap();
    assert_eq!(compatibility_line, 3);
}

#[tokio::test]
async fn failed_migration_does_not_advance_database_schema_generation() {
    let temp_dir = tempfile::tempdir().unwrap();
    let database = Database::connect(&temp_dir.path().join("jobs.db"))
        .await
        .unwrap();
    let failing = migrator_with(test_migration(
        current_version() + 1,
        "injected failure",
        "SELECT missing_function();",
    ));
    assert!(database.migrate_with(&failing).await.is_err());
    let user_version: i64 = sqlx::query_scalar("PRAGMA user_version")
        .fetch_one(database.pool())
        .await
        .unwrap();
    assert_eq!(user_version, 2);
}

#[tokio::test]
async fn sibling_databases_never_share_or_prune_each_others_snapshots() {
    let root = tempfile::tempdir().unwrap();
    let a_path = root.path().join("a.db");
    let b_path = root.path().join("b.db");
    let a = Database::connect(&a_path).await.unwrap();
    let b = Database::connect(&b_path).await.unwrap();
    let first = Database::ensure_migration_snapshot(
        a.pool(),
        &a_path,
        current_version(),
        current_version() + 1,
    )
    .await
    .unwrap()
    .unwrap();
    let second = Database::ensure_migration_snapshot(
        b.pool(),
        &b_path,
        current_version(),
        current_version() + 1,
    )
    .await
    .unwrap()
    .unwrap();
    assert_ne!(first, second);
    Database::prune_superseded_migration_snapshots(second.parent().unwrap(), &second);
    assert!(first.exists());
}

#[tokio::test]
async fn concurrent_migrations_retain_one_verified_recovery_snapshot() {
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("jobs.db");
    let database = Database::connect(&path).await.unwrap();
    let next = migrator_with(test_migration(
        current_version() + 1,
        "concurrent transition",
        "CREATE TABLE concurrent_probe (id INTEGER);",
    ));
    let (first, second) = tokio::join!(database.migrate_with(&next), database.migrate_with(&next));
    first.unwrap();
    second.unwrap();
    let snapshots = database_copies(&root.path().join("backups"));
    assert_eq!(snapshots.len(), 1);
    Database::verify_pre_migration_backup(database.pool(), snapshots[0].to_str().unwrap())
        .await
        .unwrap();
}
