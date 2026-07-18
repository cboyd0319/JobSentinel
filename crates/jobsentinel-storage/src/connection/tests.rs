use super::*;

#[cfg(test)]
mod memory_tests {
    use super::*;

    #[tokio::test]
    async fn in_memory_database_uses_one_connection() {
        let database = Database::connect_memory().await.unwrap();

        assert_eq!(database.pool().options().get_max_connections(), 1);
    }

    #[tokio::test]
    async fn every_pooled_connection_receives_connection_settings() {
        let temp_dir = tempfile::tempdir().unwrap();
        let database = Database::connect(&temp_dir.path().join("jobs.db"))
            .await
            .unwrap();
        let _first_connection = database.pool().acquire().await.unwrap();
        let mut second_connection = database.pool().acquire().await.unwrap();

        let trusted_schema: i64 = sqlx::query_scalar("PRAGMA trusted_schema")
            .fetch_one(&mut *second_connection)
            .await
            .unwrap();
        let synchronous: i64 = sqlx::query_scalar("PRAGMA synchronous")
            .fetch_one(&mut *second_connection)
            .await
            .unwrap();
        let cache_size: i64 = sqlx::query_scalar("PRAGMA cache_size")
            .fetch_one(&mut *second_connection)
            .await
            .unwrap();

        assert_eq!(trusted_schema, 0);
        assert_eq!(synchronous, 1);
        assert_eq!(cache_size, -128_000);
    }

    #[tokio::test]
    async fn connect_refuses_and_preserves_unsupported_newer_database_version() {
        let temp_dir = tempfile::tempdir().unwrap();
        let db_path = temp_dir.path().join("jobs.db");
        let database = Database::connect(&db_path).await.unwrap();
        sqlx::query("PRAGMA user_version = 3")
            .execute(database.pool())
            .await
            .unwrap();
        database.pool().close().await;
        drop(database);

        let error = Database::connect(&db_path).await.unwrap_err();
        assert!(error
            .to_string()
            .contains("newer database schema version 3"));

        let key = load_or_create_database_key().await.unwrap();
        let pool = connect_encrypted_pool(&db_path, &key, false).await.unwrap();
        let preserved_version: i64 = sqlx::query_scalar("PRAGMA user_version")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(preserved_version, 3);
    }
}

#[cfg(test)]
mod backup_tests {
    use super::*;
    use sqlx::{sqlite::SqliteConnectOptions, ConnectOptions};
    use std::str::FromStr;

    #[tokio::test]
    async fn pre_migration_backup_captures_committed_wal_data() {
        let temp_dir = tempfile::tempdir().unwrap();
        let db_path = temp_dir.path().join("jobs.db");
        let backup_dir = temp_dir.path().join("backups");
        let database = Database::connect(&db_path).await.unwrap();

        sqlx::query("CREATE TABLE qa_wal_capture (id INTEGER PRIMARY KEY, note TEXT NOT NULL)")
            .execute(database.pool())
            .await
            .unwrap();
        sqlx::query("INSERT INTO qa_wal_capture (note) VALUES ('saved in wal')")
            .execute(database.pool())
            .await
            .unwrap();

        let backup_path =
            Database::backup_pre_migration_to_dir(database.pool(), &db_path, &backup_dir)
                .await
                .unwrap()
                .expect("existing database should create pre-migration backup");

        let backup_url = format!("sqlite://{}?mode=ro", backup_path.display());
        let backup_key = hex::encode([0xDB; 32]);
        let mut backup_connection = SqliteConnectOptions::from_str(&backup_url)
            .unwrap()
            .pragma("key", backup_key)
            .connect()
            .await
            .unwrap();
        let note: String = sqlx::query_scalar("SELECT note FROM qa_wal_capture WHERE id = 1")
            .fetch_one(&mut backup_connection)
            .await
            .unwrap();

        assert_eq!(note, "saved in wal");
    }

    #[tokio::test]
    async fn migration_stops_when_required_backup_cannot_be_created() {
        let temp_dir = tempfile::tempdir().unwrap();
        let db_path = temp_dir.path().join("jobs.db");
        let database = Database::connect(&db_path).await.unwrap();
        database.migrate().await.unwrap();

        std::fs::write(temp_dir.path().join("backups"), b"not a directory").unwrap();

        let error = database.migrate().await.unwrap_err();
        assert!(error
            .to_string()
            .ends_with("Required pre-migration backup failed"));
    }

    #[tokio::test]
    async fn migration_finishes_with_a_recorded_integrity_check() {
        let database = Database::connect_memory().await.unwrap();

        database.migrate().await.unwrap();

        let passed_checks: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM integrity_check_log WHERE status = 'passed'")
                .fetch_one(database.pool())
                .await
                .unwrap();
        assert!(passed_checks > 0);
    }
}

#[cfg(all(test, unix))]
mod permission_tests {
    use super::*;
    use std::fs;
    use std::os::unix::fs::PermissionsExt;

    fn mode(path: &std::path::Path) -> u32 {
        fs::metadata(path).unwrap().permissions().mode() & 0o777
    }

    #[tokio::test]
    async fn connect_creates_private_database_directory_and_files() {
        let temp_dir = tempfile::tempdir().unwrap();
        let data_dir = temp_dir.path().join("JobSentinel");
        let db_path = data_dir.join("jobs.db");

        let database = Database::connect(&db_path).await.unwrap();

        assert_eq!(mode(&data_dir), 0o700);
        assert_eq!(mode(&db_path), 0o600);
        if data_dir.join("jobs.db-wal").exists() {
            assert_eq!(mode(&data_dir.join("jobs.db-wal")), 0o600);
        }
        if data_dir.join("jobs.db-shm").exists() {
            assert_eq!(mode(&data_dir.join("jobs.db-shm")), 0o600);
        }

        drop(database);
    }

    #[tokio::test]
    async fn connect_does_not_chmod_existing_arbitrary_parent_directory() {
        let temp_dir = tempfile::tempdir().unwrap();
        let data_dir = temp_dir.path().join("external-parent");
        fs::create_dir_all(&data_dir).unwrap();
        fs::set_permissions(&data_dir, fs::Permissions::from_mode(0o755)).unwrap();

        let db_path = data_dir.join("jobs.db");
        fs::write(&db_path, []).unwrap();
        fs::set_permissions(&db_path, fs::Permissions::from_mode(0o644)).unwrap();

        let database = Database::connect(&db_path).await.unwrap();

        assert_eq!(mode(&data_dir), 0o755);
        assert_eq!(mode(&db_path), 0o600);

        drop(database);
    }
}
