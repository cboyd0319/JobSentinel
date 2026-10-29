//! Proves genuine pre-rename portable backups restore and roll back through supported layouts.

use super::*;
use crate::encryption::load_or_create_database_key;
use std::path::Path;

const PASSPHRASE: &str = "public baseline restore fixture phrase";

async fn baseline_pool(path: &Path, key: &str, title: &str) -> SqlitePool {
    let pool = connect_encrypted_pool(path, key, true).await.unwrap();
    MIGRATOR.run_to(32, &pool).await.unwrap();
    sqlx::query("PRAGMA user_version=2")
        .execute(&pool)
        .await
        .unwrap();
    sqlx::query("INSERT INTO jobs(hash,title,company,url,source) VALUES ('kept',?,'Example','https://example.test/job','test')")
        .bind(title).execute(&pool).await.unwrap();
    pool
}

async fn baseline_backup(path: &Path) -> PortableBackupInfo {
    let pool = baseline_pool(path, PASSPHRASE, "restored private history").await;
    let backup_id = uuid::Uuid::new_v4().to_string();
    sqlx::query("CREATE TABLE portable_backup_manifest(backup_id TEXT PRIMARY KEY,created_at TEXT,format_version INTEGER,kind TEXT,protection TEXT,user_review_required INTEGER,compatibility_line INTEGER,database_schema INTEGER,migration_sequence INTEGER,contains_secrets INTEGER)")
        .execute(&pool).await.unwrap();
    sqlx::query("INSERT INTO portable_backup_manifest VALUES (?,datetime('now'),1,'backup','encrypted',1,3,2,32,0)")
        .bind(&backup_id).execute(&pool).await.unwrap();
    sqlx::query("INSERT INTO v3_recovery_operations(operation_id,operation_kind,outcome,source_migration_sequence,target_migration_sequence,completed_at) VALUES (?,'backup','succeeded',32,32,datetime('now'))")
        .bind(&backup_id).execute(&pool).await.unwrap();
    sqlx::query("PRAGMA wal_checkpoint(TRUNCATE)")
        .execute(&pool)
        .await
        .unwrap();
    pool.close().await;
    Database::inspect_portable_backup(path, PASSPHRASE)
        .await
        .unwrap()
}

#[tokio::test]
async fn baseline_portable_backups_restore_and_rollback_without_rewriting_input() {
    for rollback in [false, true] {
        let root = tempfile::tempdir().unwrap();
        let backup = root.path().join("baseline-portable.db");
        let info = baseline_backup(&backup).await;
        assert_eq!(info.migration_sequence, 32);
        let input_before = std::fs::read(&backup).unwrap();
        let path = root.path().join("jobs.db");
        let key = load_or_create_database_key().await.unwrap();
        baseline_pool(&path, &key, "original private history")
            .await
            .close()
            .await;
        let database = Database::connect(&path).await.unwrap();
        assert_eq!(
            database
                .stage_portable_restore(&backup, PASSPHRASE)
                .await
                .unwrap(),
            info
        );
        database.pool.close().await;
        drop(database);
        if rollback {
            assert!(Database::promote_staged_restore(&path).await.unwrap());
            assert!(Database::rollback_staged_restore(&path).await.unwrap());
        }
        let reopened = Database::connect_with_staged_restore(&path).await.unwrap();
        let title: String = sqlx::query_scalar("SELECT title FROM jobs WHERE hash='kept'")
            .fetch_one(reopened.pool())
            .await
            .unwrap();
        assert_eq!(
            title,
            if rollback {
                "original private history"
            } else {
                "restored private history"
            }
        );
        let old_tables: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name GLOB 'v3_*'",
        )
        .fetch_one(reopened.pool())
        .await
        .unwrap();
        assert_eq!(old_tables, 0);
        let outcome: String = sqlx::query_scalar("SELECT outcome FROM recovery_operations WHERE operation_kind='restore' ORDER BY created_at DESC LIMIT 1")
            .fetch_one(reopened.pool()).await.unwrap();
        assert_eq!(outcome, if rollback { "failed" } else { "succeeded" });
        assert!(
            std::fs::read(&backup).unwrap() == input_before,
            "Restore changed the input backup bytes"
        );
        assert_eq!(
            Database::inspect_portable_backup(&backup, PASSPHRASE)
                .await
                .unwrap(),
            info
        );
        reopened.pool.close().await;
    }
}

#[tokio::test]
async fn baseline_backup_mixed_physical_layout_is_refused_without_writes() {
    let root = tempfile::tempdir().unwrap();
    let backup = root.path().join("baseline-portable.db");
    baseline_backup(&backup).await;
    let pool = connect_encrypted_pool(&backup, PASSPHRASE, false)
        .await
        .unwrap();
    sqlx::query("CREATE TABLE recovery_operations AS SELECT * FROM v3_recovery_operations")
        .execute(&pool)
        .await
        .unwrap();
    pool.close().await;
    let before = std::fs::read(&backup).unwrap();
    assert!(Database::inspect_portable_backup(&backup, PASSPHRASE)
        .await
        .is_err());
    assert!(
        std::fs::read(&backup).unwrap() == before,
        "Inspection changed the invalid backup bytes"
    );
}

#[cfg(unix)]
#[tokio::test]
async fn reserved_relative_source_paths_preserve_backup_bytes_and_sidecar_absence() {
    let current = std::env::current_dir().unwrap();
    let root = tempfile::tempdir_in(&current).unwrap();
    let absolute = root.path().join("portable source ?#%20.db");
    let relative = absolute.strip_prefix(&current).unwrap();
    let info = baseline_backup(relative).await;
    let before = std::fs::read(relative).unwrap();
    let destination = tempfile::NamedTempFile::new_in(root.path()).unwrap();
    let key = load_or_create_database_key().await.unwrap();
    super::super::backups::export_encrypted_to_encrypted(
        relative,
        PASSPHRASE,
        destination.path(),
        &key,
    )
    .await
    .unwrap();
    assert_eq!(
        Database::inspect_portable_backup(destination.path(), &key)
            .await
            .unwrap(),
        info
    );
    assert_eq!(
        Database::inspect_portable_backup(relative, PASSPHRASE)
            .await
            .unwrap(),
        info
    );
    assert!(
        std::fs::read(relative).unwrap() == before,
        "Copy changed its source backup bytes"
    );
    for suffix in ["-wal", "-shm", "-journal"] {
        assert!(!crate::encryption::sqlite_sidecar_path(relative, suffix).exists());
    }
}
