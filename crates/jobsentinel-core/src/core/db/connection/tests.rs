use super::*;

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
