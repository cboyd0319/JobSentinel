//! Proves migration 28 retains native pay JSON only when SQLite can validate it.

use super::*;

#[tokio::test]
async fn migration_28_adds_nullable_validated_listed_pay() {
    let database = Database::connect_memory().await.unwrap();
    MIGRATOR.run_to(27, database.pool()).await.unwrap();

    MIGRATOR.run_to(28, database.pool()).await.unwrap();

    let column_exists: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM pragma_table_info('jobs') WHERE name = 'listed_pay'",
    )
    .fetch_one(database.pool())
    .await
    .unwrap();
    assert_eq!(column_exists, 1);
    let migration_version: i64 =
        sqlx::query_scalar("SELECT migration_version FROM v3_compatibility_metadata")
            .fetch_one(database.pool())
            .await
            .unwrap();
    assert_eq!(migration_version, 28);
    assert!(sqlx::query(
        "INSERT INTO jobs (hash, title, company, url, source, listed_pay)
         VALUES ('canonical-listed-pay', 'Role', 'Example', 'https://example.test/canonical', 'test', '{\"min\":1}')",
    )
    .execute(database.pool())
    .await
    .is_ok());
    assert!(sqlx::query(
        "INSERT INTO jobs (hash, title, company, url, source, listed_pay)
         VALUES ('invalid-listed-pay', 'Role', 'Example', 'https://example.test/job', 'test', 'not-json')",
    )
    .execute(database.pool())
    .await
    .is_err());
    for (hash, listed_pay) in [
        ("scalar-listed-pay", "1".to_string()),
        ("array-listed-pay", "[]".to_string()),
        ("spaced-listed-pay", "{\"min\": 1}".to_string()),
        (
            "oversized-listed-pay",
            format!("{{\"raw\":\"{}\"}}", "x".repeat(4096)),
        ),
    ] {
        assert!(sqlx::query(
            "INSERT INTO jobs (hash, title, company, url, source, listed_pay)
             VALUES (?, 'Role', 'Example', ?, 'test', ?)",
        )
        .bind(hash)
        .bind(format!("https://example.test/{hash}"))
        .bind(listed_pay)
        .execute(database.pool())
        .await
        .is_err());
    }
}
