use super::*;

#[tokio::test]
async fn migration_23_adds_transactional_pack_lifecycle_tables() {
    let database = Database::connect_memory().await.unwrap();
    MIGRATOR.run_to(22, database.pool()).await.unwrap();

    MIGRATOR.run(database.pool()).await.unwrap();

    let tables: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sqlite_master
         WHERE type = 'table'
           AND name IN (
               'v3_pack_publishers',
               'v3_pack_streams',
               'v3_pack_releases'
           )",
    )
    .fetch_one(database.pool())
    .await
    .unwrap();
    let migration_version: i64 =
        sqlx::query_scalar("SELECT migration_version FROM v3_compatibility_metadata")
            .fetch_one(database.pool())
            .await
            .unwrap();

    assert_eq!(tables, 3);
    assert_eq!(migration_version, 23);
}
