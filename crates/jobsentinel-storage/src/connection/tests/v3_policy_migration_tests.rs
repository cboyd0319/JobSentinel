use super::*;

#[tokio::test]
async fn migration_13_backfills_existing_policy_once() {
    let database = Database::connect_memory().await.unwrap();
    MIGRATOR.run_to(12, database.pool()).await.unwrap();
    sqlx::query(
        "INSERT INTO v3_source_policies (
            source_id, source_class, access, request_limit_per_hour,
            user_review_required, policy_ref, revision,
            restriction_reason_code, reviewed_at, created_at, updated_at
         ) VALUES (
            'existing-source', 'official_public_api', 'scheduled_public', 10,
            1, 'existing-policy', 4, NULL, ?, ?, ?
         )",
    )
    .bind("2026-07-19T00:00:00Z")
    .bind("2026-07-19T00:00:01Z")
    .bind("2026-07-19T00:00:02Z")
    .execute(database.pool())
    .await
    .unwrap();

    MIGRATOR.run(database.pool()).await.unwrap();

    let history: Vec<(String, i64, String)> = sqlx::query_as(
        "SELECT source_id, revision, recorded_at
         FROM v3_source_policy_ledger",
    )
    .fetch_all(database.pool())
    .await
    .unwrap();
    assert_eq!(
        history,
        vec![(
            "existing-source".to_string(),
            4,
            "2026-07-19T00:00:02Z".to_string(),
        )]
    );
    let migration_version: i64 =
        sqlx::query_scalar("SELECT migration_version FROM v3_compatibility_metadata")
            .fetch_one(database.pool())
            .await
            .unwrap();
    assert_eq!(migration_version, 18);
}

#[tokio::test]
async fn migration_16_retires_yc_startup_source_metadata() {
    let database = Database::connect_memory().await.unwrap();
    MIGRATOR.run_to(15, database.pool()).await.unwrap();
    let before: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM scraper_config WHERE scraper_name = 'yc_startup'")
            .fetch_one(database.pool())
            .await
            .unwrap();
    assert_eq!(before, 1);

    MIGRATOR.run(database.pool()).await.unwrap();

    let after: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM scraper_config WHERE scraper_name = 'yc_startup'")
            .fetch_one(database.pool())
            .await
            .unwrap();
    assert_eq!(after, 0);
}

#[tokio::test]
async fn migration_17_disables_jobswithgpt_health_metadata() {
    let database = Database::connect_memory().await.unwrap();
    MIGRATOR.run_to(16, database.pool()).await.unwrap();
    let before: i64 = sqlx::query_scalar(
        "SELECT is_enabled FROM scraper_config WHERE scraper_name = 'jobswithgpt'",
    )
    .fetch_one(database.pool())
    .await
    .unwrap();
    assert_eq!(before, 1);

    MIGRATOR.run(database.pool()).await.unwrap();

    let after: i64 = sqlx::query_scalar(
        "SELECT is_enabled FROM scraper_config WHERE scraper_name = 'jobswithgpt'",
    )
    .fetch_one(database.pool())
    .await
    .unwrap();
    assert_eq!(after, 0);
    assert!(sqlx::query(
        "UPDATE scraper_config SET is_enabled = 1 WHERE scraper_name = 'jobswithgpt'"
    )
    .execute(database.pool())
    .await
    .is_err());
    assert!(sqlx::query(
        "UPDATE scraper_config SET is_enabled = NULL WHERE scraper_name = 'jobswithgpt'"
    )
    .execute(database.pool())
    .await
    .is_err());
}

#[tokio::test]
async fn migration_18_retires_restricted_source_health_metadata() {
    let database = Database::connect_memory().await.unwrap();
    MIGRATOR.run_to(17, database.pool()).await.unwrap();

    MIGRATOR.run(database.pool()).await.unwrap();

    for source_id in ["builtin", "dice", "simplyhired", "glassdoor"] {
        let rows: i64 =
            sqlx::query_scalar("SELECT COUNT(*) FROM scraper_config WHERE scraper_name = ?")
                .bind(source_id)
                .fetch_one(database.pool())
                .await
                .unwrap();
        assert_eq!(rows, 0, "{source_id} health metadata was not retired");
        assert!(
            sqlx::query("INSERT INTO scraper_config (scraper_name, display_name) VALUES (?, ?)")
                .bind(source_id)
                .bind(source_id)
                .execute(database.pool())
                .await
                .is_err(),
            "{source_id} health metadata could be restored"
        );
        assert!(
            sqlx::query(
                "UPDATE scraper_config SET scraper_name = ? WHERE scraper_name = 'greenhouse'"
            )
            .bind(source_id)
            .execute(database.pool())
            .await
            .is_err(),
            "{source_id} health metadata could be restored by renaming a row"
        );
    }

    let migration_version: i64 =
        sqlx::query_scalar("SELECT migration_version FROM v3_compatibility_metadata")
            .fetch_one(database.pool())
            .await
            .unwrap();
    assert_eq!(migration_version, 18);
}
