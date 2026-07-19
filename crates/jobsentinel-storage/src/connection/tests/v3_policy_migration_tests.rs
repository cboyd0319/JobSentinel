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
    assert_eq!(migration_version, 15);
}
