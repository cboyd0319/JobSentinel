//! Proves migration 29 preserves old job identity while adding bounded geography JSON.

use super::*;

#[tokio::test]
async fn migration_29_adds_validated_geography_without_rewriting_old_jobs() {
    let database = Database::connect_memory().await.unwrap();
    MIGRATOR.run_to(28, database.pool()).await.unwrap();
    sqlx::query(
        "INSERT INTO jobs (id, hash, title, company, url, location, source)
         VALUES (91, 'legacy-geography', 'Role', 'Example', 'https://example.test/role', 'Remote', 'test')",
    )
    .execute(database.pool())
    .await
    .unwrap();

    MIGRATOR.run_to(29, database.pool()).await.unwrap();

    let old_job: (i64, String, String, Option<String>) =
        sqlx::query_as("SELECT id, hash, location, geography FROM jobs WHERE id = 91")
            .fetch_one(database.pool())
            .await
            .unwrap();
    assert_eq!(
        old_job,
        (
            91,
            "legacy-geography".to_string(),
            "Remote".to_string(),
            None
        )
    );
    let migration_version: i64 =
        sqlx::query_scalar("SELECT migration_version FROM v3_compatibility_metadata")
            .fetch_one(database.pool())
            .await
            .unwrap();
    assert_eq!(migration_version, 29);

    assert!(sqlx::query(
        "INSERT INTO jobs (hash, title, company, url, source, geography)
         VALUES ('valid-geography', 'Role', 'Example', 'https://example.test/valid', 'test',
                 '{\"worksite_locations\":[{\"raw_location\":\"Remote\",\"country\":null}],\"remote_applicant_locations\":[]}')",
    )
    .execute(database.pool())
    .await
    .is_ok());
    for (hash, geography) in [
        ("invalid-geography", "not-json".to_string()),
        ("scalar-geography", "1".to_string()),
        ("array-geography", "[]".to_string()),
        (
            "spaced-geography",
            "{\"worksite_locations\": []}".to_string(),
        ),
        (
            "oversized-geography",
            format!("{{\"raw\":\"{}\"}}", "x".repeat(65_527)),
        ),
    ] {
        assert!(sqlx::query(
            "INSERT INTO jobs (hash, title, company, url, source, geography)
             VALUES (?, 'Role', 'Example', ?, 'test', ?)",
        )
        .bind(hash)
        .bind(format!("https://example.test/{hash}"))
        .bind(geography)
        .execute(database.pool())
        .await
        .is_err());
    }
}
