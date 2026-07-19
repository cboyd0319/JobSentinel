use super::*;
use crate::encryption::{
    connect_encrypted_read_only_pool, load_or_create_database_key, sqlite_sidecar_path,
};
use sqlx::{sqlite::SqlitePool, Executor};
use std::path::{Path, PathBuf};

const BACKUP_PASSPHRASE: &str = "correct ' restore battery staple";

async fn database_with_probe(path: &Path, value: &str, include_secrets: bool) -> Database {
    let database = Database::connect(path).await.unwrap();
    database.migrate().await.unwrap();
    database
        .pool()
        .execute("CREATE TABLE restore_probe(value TEXT NOT NULL)")
        .await
        .unwrap();
    sqlx::query("INSERT INTO restore_probe(value) VALUES (?)")
        .bind(value)
        .execute(database.pool())
        .await
        .unwrap();
    if include_secrets {
        sqlx::query(
            "INSERT INTO secret_vault(
                key, algorithm, key_version, nonce, ciphertext
             ) VALUES ('restore-secret', 'xchacha20poly1305', 1, ?, ?)",
        )
        .bind(vec![1_u8; 24])
        .bind(vec![2_u8; 32])
        .execute(database.pool())
        .await
        .unwrap();
        sqlx::query(
            "INSERT INTO credential_key_wrapping(
                id, mode, kdf, memory_kib, iterations, parallelism,
                salt, algorithm, nonce, ciphertext
             ) VALUES (1, 'passphrase', 'argon2id', 19456, 2, 1, ?,
                       'xchacha20poly1305', ?, ?)",
        )
        .bind(vec![3_u8; 16])
        .bind(vec![4_u8; 24])
        .bind(vec![5_u8; 32])
        .execute(database.pool())
        .await
        .unwrap();
    }
    database
}

async fn portable_backup(root: &Path) -> PathBuf {
    let source_dir = root.join("source");
    let backup_dir = root.join("input");
    std::fs::create_dir_all(&backup_dir).unwrap();
    let source = database_with_probe(
        &source_dir.join("jobs.db"),
        "restored private history",
        true,
    )
    .await;
    let backup = backup_dir.join("portable.db");
    source
        .create_portable_backup(&backup, BACKUP_PASSPHRASE)
        .await
        .unwrap();
    source.pool().close().await;
    backup
}

fn sibling(path: &Path, suffix: &str) -> PathBuf {
    let mut name = path.file_name().unwrap().to_os_string();
    name.push(suffix);
    path.with_file_name(name)
}

fn restore_id(database_path: &Path) -> String {
    let request: serde_json::Value = serde_json::from_slice(
        &std::fs::read(sibling(database_path, ".restore-request.json")).unwrap(),
    )
    .unwrap();
    request["restore_id"].as_str().unwrap().to_string()
}

fn rewrite_request(database_path: &Path, field: &str, value: &str) {
    let path = sibling(database_path, ".restore-request.json");
    let mut request: serde_json::Value =
        serde_json::from_slice(&std::fs::read(&path).unwrap()).unwrap();
    request[field] = value.into();
    std::fs::write(path, serde_json::to_vec(&request).unwrap()).unwrap();
}

fn rollback_path(database_path: &Path, restore_id: &str) -> PathBuf {
    database_path
        .parent()
        .unwrap()
        .join("backups")
        .join(format!("restore_rollback_{restore_id}.db"))
}

fn database_bytes(path: &Path) -> Vec<Option<Vec<u8>>> {
    std::iter::once(path.to_path_buf())
        .chain(
            ["-wal", "-shm", "-journal"]
                .into_iter()
                .map(|suffix| sqlite_sidecar_path(path, suffix)),
        )
        .map(|path| std::fs::read(path).ok())
        .collect()
}

fn files_under(root: &Path) -> Vec<PathBuf> {
    let mut pending = vec![root.to_path_buf()];
    let mut files = Vec::new();
    while let Some(path) = pending.pop() {
        for entry in std::fs::read_dir(path).unwrap().flatten() {
            let path = entry.path();
            if path.is_dir() {
                pending.push(path);
            } else {
                files.push(path);
            }
        }
    }
    files
}

#[tokio::test]
async fn wrong_passphrase_does_not_touch_primary_or_create_restore_artifacts() {
    let temp_dir = tempfile::tempdir().unwrap();
    let backup = portable_backup(temp_dir.path()).await;
    let db_path = temp_dir.path().join("primary/jobs.db");
    let database = database_with_probe(&db_path, "current local history", false).await;
    database.checkpoint_wal().await.unwrap();
    let before = database_bytes(&db_path);

    let error = database
        .stage_portable_restore(&backup, "wrong restore passphrase")
        .await
        .unwrap_err();

    assert!(error.to_string().contains("backup"));
    assert_eq!(database_bytes(&db_path), before);
    assert!(!sibling(&db_path, ".restore-stage").exists());
    assert!(!sibling(&db_path, ".restore-request.json").exists());
}

#[tokio::test]
async fn valid_stage_is_device_encrypted_and_contains_no_secrets_or_plaintext_artifacts() {
    let temp_dir = tempfile::tempdir().unwrap();
    let backup = portable_backup(temp_dir.path()).await;
    let db_path = temp_dir.path().join("primary/jobs.db");
    let database = database_with_probe(&db_path, "current local history", false).await;

    database
        .stage_portable_restore(&backup, BACKUP_PASSPHRASE)
        .await
        .unwrap();

    let stage = sibling(&db_path, ".restore-stage");
    let unkeyed = SqlitePool::connect(&format!("sqlite://{}?mode=ro", stage.display()))
        .await
        .unwrap();
    assert!(
        sqlx::query_scalar::<_, String>("SELECT value FROM restore_probe")
            .fetch_one(&unkeyed)
            .await
            .is_err()
    );
    unkeyed.close().await;

    let key = load_or_create_database_key().await.unwrap();
    let staged = connect_encrypted_read_only_pool(&stage, &key)
        .await
        .unwrap();
    let value: String = sqlx::query_scalar("SELECT value FROM restore_probe")
        .fetch_one(&staged)
        .await
        .unwrap();
    let secret_rows: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM secret_vault")
        .fetch_one(&staged)
        .await
        .unwrap();
    let wrapped_key_rows: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM credential_key_wrapping")
        .fetch_one(&staged)
        .await
        .unwrap();
    staged.close().await;
    assert_eq!(value, "restored private history");
    assert_eq!((secret_rows, wrapped_key_rows), (0, 0));

    for file in files_under(db_path.parent().unwrap()) {
        let bytes = std::fs::read(file).unwrap();
        assert!(!bytes.starts_with(b"SQLite format 3\0"));
        assert!(!bytes
            .windows(b"restored private history".len())
            .any(|window| window == b"restored private history"));
    }
}

#[tokio::test]
async fn startup_ignores_stage_without_marker_and_preserves_primary() {
    let temp_dir = tempfile::tempdir().unwrap();
    let backup = portable_backup(temp_dir.path()).await;
    let db_path = temp_dir.path().join("primary/jobs.db");
    let database = database_with_probe(&db_path, "current local history", false).await;
    database
        .stage_portable_restore(&backup, BACKUP_PASSPHRASE)
        .await
        .unwrap();
    let stage = sibling(&db_path, ".restore-stage");
    std::fs::remove_file(sibling(&db_path, ".restore-request.json")).unwrap();
    database.checkpoint_wal().await.unwrap();
    let before = database_bytes(&db_path);

    assert!(!Database::promote_staged_restore(&db_path).await.unwrap());

    assert_eq!(database_bytes(&db_path), before);
    assert!(stage.exists());
}

#[tokio::test]
async fn cancel_revokes_marker_before_attempting_stage_cleanup() {
    let temp_dir = tempfile::tempdir().unwrap();
    let backup = portable_backup(temp_dir.path()).await;
    let db_path = temp_dir.path().join("primary/jobs.db");
    let database = database_with_probe(&db_path, "current local history", false).await;
    database
        .stage_portable_restore(&backup, BACKUP_PASSPHRASE)
        .await
        .unwrap();
    let stage = sibling(&db_path, ".restore-stage");
    let marker = sibling(&db_path, ".restore-request.json");
    std::fs::remove_file(&stage).unwrap();
    std::fs::create_dir(&stage).unwrap();

    assert!(database.cancel_staged_restore().await.is_err());

    assert!(!marker.exists(), "cancel must revoke authorization first");
    assert!(stage.is_dir(), "the injected cleanup failure must remain");
}

#[tokio::test]
async fn marked_stage_promotes_and_retains_device_encrypted_rollback() {
    let temp_dir = tempfile::tempdir().unwrap();
    let backup = portable_backup(temp_dir.path()).await;
    let db_path = temp_dir.path().join("primary/jobs.db");
    let database = database_with_probe(&db_path, "current local history", false).await;
    database
        .stage_portable_restore(&backup, BACKUP_PASSPHRASE)
        .await
        .unwrap();
    database.checkpoint_wal().await.unwrap();
    database.pool().close().await;
    drop(database);

    assert!(Database::promote_staged_restore(&db_path).await.unwrap());

    let restored = Database::connect(&db_path).await.unwrap();
    let value: String = sqlx::query_scalar("SELECT value FROM restore_probe")
        .fetch_one(restored.pool())
        .await
        .unwrap();
    assert_eq!(value, "restored private history");

    let rollback_files: Vec<_> = std::fs::read_dir(db_path.parent().unwrap().join("backups"))
        .unwrap()
        .flatten()
        .map(|entry| entry.path())
        .filter(|path| {
            path.file_name()
                .is_some_and(|name| name.to_string_lossy().starts_with("restore_rollback_"))
        })
        .collect();
    assert_eq!(rollback_files.len(), 1);
    let key = load_or_create_database_key().await.unwrap();
    let rollback = connect_encrypted_read_only_pool(&rollback_files[0], &key)
        .await
        .unwrap();
    let old_value: String = sqlx::query_scalar("SELECT value FROM restore_probe")
        .fetch_one(&rollback)
        .await
        .unwrap();
    assert_eq!(old_value, "current local history");
}

#[tokio::test]
async fn promotion_refuses_while_the_primary_database_owner_is_live() {
    let temp_dir = tempfile::tempdir().unwrap();
    let backup = portable_backup(temp_dir.path()).await;
    let db_path = temp_dir.path().join("primary/jobs.db");
    let database = database_with_probe(&db_path, "current local history", false).await;
    database
        .stage_portable_restore(&backup, BACKUP_PASSPHRASE)
        .await
        .unwrap();
    database.checkpoint_wal().await.unwrap();
    let before = database_bytes(&db_path);

    let error = Database::promote_staged_restore(&db_path)
        .await
        .unwrap_err();

    assert!(error.to_string().contains("in use"));
    assert_eq!(database_bytes(&db_path), before);
    assert!(sibling(&db_path, ".restore-stage").exists());
    assert!(sibling(&db_path, ".restore-request.json").exists());
}

#[path = "portable_restore_recovery_tests.rs"]
mod recovery;

#[tokio::test]
async fn promotion_rejects_noncanonical_restore_id_without_changing_primary() {
    let temp_dir = tempfile::tempdir().unwrap();
    let backup = portable_backup(temp_dir.path()).await;
    let db_path = temp_dir.path().join("primary/jobs.db");
    let database = database_with_probe(&db_path, "current local history", false).await;
    database
        .stage_portable_restore(&backup, BACKUP_PASSPHRASE)
        .await
        .unwrap();
    let noncanonical = format!("{{{}}}", restore_id(&db_path));
    rewrite_request(&db_path, "restore_id", &noncanonical);
    database.checkpoint_wal().await.unwrap();
    database.pool().close().await;
    drop(database);
    let before = database_bytes(&db_path);

    let error = Database::promote_staged_restore(&db_path)
        .await
        .unwrap_err();

    assert!(error.to_string().contains("request is invalid"));
    assert_eq!(database_bytes(&db_path), before);
}
#[tokio::test]
async fn startup_connection_promotes_and_finishes_the_staged_restore() {
    let temp_dir = tempfile::tempdir().unwrap();
    let backup = portable_backup(temp_dir.path()).await;
    let db_path = temp_dir.path().join("primary/jobs.db");
    let database = database_with_probe(&db_path, "current local history", false).await;
    database
        .stage_portable_restore(&backup, BACKUP_PASSPHRASE)
        .await
        .unwrap();
    database.pool().close().await;
    drop(database);
    let restored = Database::connect_with_staged_restore(&db_path)
        .await
        .unwrap();
    let value: String = sqlx::query_scalar("SELECT value FROM restore_probe")
        .fetch_one(restored.pool())
        .await
        .unwrap();
    assert_eq!(value, "restored private history");
    assert!(!sibling(&db_path, ".restore-request.json").exists());
}
