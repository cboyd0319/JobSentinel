//! Reads schema generation and validates the applied migration history for update assessment.

use super::{Database, MIGRATOR};
use sqlx::Row;

impl Database {
    pub(crate) async fn refuse_future_data(
        connection: &mut sqlx::SqliteConnection,
    ) -> Result<(), sqlx::Error> {
        let maximum = MIGRATOR
            .iter()
            .map(|migration| migration.version)
            .max()
            .unwrap_or(0);
        for table in ["_sqlx_migrations", "v3_compatibility_metadata"] {
            let present: i64 = sqlx::query_scalar(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?",
            )
            .bind(table)
            .fetch_one(&mut *connection)
            .await?;
            if present == 0 {
                continue;
            }
            let future: i64 = if table == "_sqlx_migrations" {
                sqlx::query_scalar("SELECT COUNT(*) FROM _sqlx_migrations WHERE version > ?")
                    .bind(maximum)
                    .fetch_one(&mut *connection)
                    .await?
            } else {
                sqlx::query_scalar("SELECT COUNT(*) FROM v3_compatibility_metadata WHERE compatibility_line > 3 OR database_schema > ? OR migration_version > ?")
                    .bind(super::DATABASE_SCHEMA_VERSION).bind(maximum).fetch_one(&mut *connection).await?
            };
            if future != 0 {
                return Err(sqlx::Error::Protocol(
                    "Unsupported newer database migration or compatibility metadata".into(),
                ));
            }
        }
        Ok(())
    }
    #[must_use]
    pub fn update_archive_formats() -> (u64, u64) {
        (
            super::portable_backup::PORTABLE_BACKUP_FORMAT_VERSION as u64,
            u64::from(super::reviewed_export::EXPORT_FORMAT_VERSION),
        )
    }
    pub async fn update_schema_inventory(&self) -> Result<(u64, u64), sqlx::Error> {
        let invalid = || sqlx::Error::Protocol("Update schema inventory is inconsistent".into());
        let mut transaction = self.pool.begin().await?;
        let generation: i64 = sqlx::query_scalar("PRAGMA user_version")
            .fetch_one(&mut *transaction)
            .await?;
        let rows =
            sqlx::query("SELECT version, checksum, success FROM _sqlx_migrations ORDER BY version")
                .fetch_all(&mut *transaction)
                .await?;
        let expected: Vec<_> = MIGRATOR.iter().collect();
        if generation <= 0 || rows.len() != expected.len() {
            return Err(invalid());
        }
        for (row, migration) in rows.iter().zip(expected) {
            if row.try_get::<i64, _>("version")? != migration.version
                || !row.try_get::<bool, _>("success")?
                || row.try_get::<Vec<u8>, _>("checksum")?.as_slice() != migration.checksum.as_ref()
            {
                return Err(invalid());
            }
        }
        let latest: i64 = rows.last().ok_or_else(invalid)?.try_get("version")?;
        transaction.rollback().await?;
        Ok((
            u64::try_from(generation).map_err(|_| invalid())?,
            u64::try_from(latest).map_err(|_| invalid())?,
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn inventory_refuses_modified_migration_history_without_repairing_it() {
        let database = Database::connect_memory().await.expect("database");
        database.migrate().await.expect("migrate");
        assert!(database.update_schema_inventory().await.is_ok());
        sqlx::query("UPDATE _sqlx_migrations SET checksum = X'00' WHERE version = (SELECT MAX(version) FROM _sqlx_migrations)")
            .execute(&database.pool).await.expect("corrupt fixture");
        assert!(database.update_schema_inventory().await.is_err());
        let checksum: Vec<u8> = sqlx::query_scalar(
            "SELECT checksum FROM _sqlx_migrations ORDER BY version DESC LIMIT 1",
        )
        .fetch_one(&database.pool)
        .await
        .expect("read");
        assert_eq!(checksum, [0]);
    }
}
