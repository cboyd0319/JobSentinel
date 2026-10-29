//! Proves pack lifecycle schema migration and database-level transition guards.

use super::*;

async fn seed_pack_lifecycle(database: &Database, release_digest: &str, payload_digest: &str) {
    sqlx::query(
        "INSERT INTO v3_pack_publishers (
            publisher_key_id, public_key_sha256, trust_state,
            revoked_at, created_at, updated_at
         ) VALUES ('publisher', ?, 'trusted', NULL, 'now', 'now')",
    )
    .bind(release_digest)
    .execute(database.pool())
    .await
    .unwrap();
    sqlx::query(
        "INSERT INTO v3_pack_streams (
            publisher_key_id, pack_id, high_water_sequence,
            high_water_signed_release_sha256, active_release_sequence,
            rollback_release_sequence, availability, generation,
            created_at, updated_at
         ) VALUES ('publisher', 'pack', 0, NULL, NULL, NULL,
                   'quarantined', 0, 'now', 'now')",
    )
    .execute(database.pool())
    .await
    .unwrap();
    sqlx::query(
        "INSERT INTO v3_pack_releases (
            publisher_key_id, pack_id, release_sequence, release_id,
            signed_release_sha256, payload_sha256, pack_version,
            pack_type, execution_class, lifecycle_state,
            quarantine_reason, self_tested_at, created_at, updated_at
         ) VALUES ('publisher', 'pack', 1, 'release', ?, ?, '1.0.0',
                   'source', 'static_content', 'staged', NULL, NULL, 'now', 'now')",
    )
    .bind(release_digest)
    .bind(payload_digest)
    .execute(database.pool())
    .await
    .unwrap();
}

#[tokio::test]
async fn migration_23_adds_transactional_pack_lifecycle_tables() {
    let database = Database::connect_memory().await.unwrap();
    MIGRATOR.run_to(22, database.pool()).await.unwrap();

    MIGRATOR.run_to(23, database.pool()).await.unwrap();

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

#[tokio::test]
async fn migration_26_conservatively_marks_removed_release_cleanup_pending() {
    let database = Database::connect_memory().await.unwrap();
    MIGRATOR.run_to(25, database.pool()).await.unwrap();
    let digest = "a".repeat(64);
    let payload_digest = "b".repeat(64);
    seed_pack_lifecycle(&database, &digest, &payload_digest).await;
    sqlx::query(
        "UPDATE v3_pack_streams
         SET availability = 'removed', generation = generation + 1
         WHERE publisher_key_id = 'publisher' AND pack_id = 'pack'",
    )
    .execute(database.pool())
    .await
    .unwrap();
    sqlx::query(
        "UPDATE v3_pack_releases SET lifecycle_state = 'removed'
         WHERE publisher_key_id = 'publisher' AND pack_id = 'pack'",
    )
    .execute(database.pool())
    .await
    .unwrap();

    MIGRATOR.run_to(26, database.pool()).await.unwrap();

    let cleanup_pending: bool = sqlx::query_scalar(
        "SELECT artifact_cleanup_pending FROM v3_pack_releases
         WHERE publisher_key_id = 'publisher' AND pack_id = 'pack'",
    )
    .fetch_one(database.pool())
    .await
    .unwrap();
    let migration_version: i64 =
        sqlx::query_scalar("SELECT migration_version FROM v3_compatibility_metadata")
            .fetch_one(database.pool())
            .await
            .unwrap();
    assert!(cleanup_pending);
    assert_eq!(migration_version, 26);
}

#[tokio::test]
async fn migration_27_preserves_pack_history_foreign_keys_tasks_and_guards() {
    let database = Database::connect_memory().await.unwrap();
    MIGRATOR.run_to(26, database.pool()).await.unwrap();
    let release_one_digest = "a".repeat(64);
    let release_three_digest = "b".repeat(64);
    let payload_one_digest = "c".repeat(64);
    let payload_three_digest = "d".repeat(64);
    seed_pack_lifecycle(&database, &release_one_digest, &payload_one_digest).await;

    sqlx::query(
        r#"INSERT INTO pack_release_reviews (
            publisher_key_id, pack_id, release_sequence, publisher_name,
            license, minimum_app_version, maximum_app_version, payload_bytes,
            fixture_summary, privacy_labels_json, data_categories_json,
            task_kinds_json, actions_json, approval_gates_json,
            gateway_policy_id, external_destinations_json
        ) VALUES (
            'publisher', 'pack', 1, 'Publisher', 'MIT', '3.0.0', '3.0.0',
            1, 'Fixture', '["local_only"]', '[]', '[]', '[]', '[]', NULL, '[]'
        )"#,
    )
    .execute(database.pool())
    .await
    .unwrap();
    sqlx::query(
        "UPDATE v3_pack_releases
         SET lifecycle_state = 'self_tested', self_tested_at = 'now'
         WHERE publisher_key_id = 'publisher' AND pack_id = 'pack' AND release_sequence = 1",
    )
    .execute(database.pool())
    .await
    .unwrap();
    sqlx::query(
        "UPDATE v3_pack_releases SET lifecycle_state = 'ready'
         WHERE publisher_key_id = 'publisher' AND pack_id = 'pack' AND release_sequence = 1",
    )
    .execute(database.pool())
    .await
    .unwrap();
    sqlx::query(
        "UPDATE v3_pack_streams
         SET availability = 'ready', active_release_sequence = 1, generation = generation + 1
         WHERE publisher_key_id = 'publisher' AND pack_id = 'pack'",
    )
    .execute(database.pool())
    .await
    .unwrap();
    sqlx::query(
        "INSERT INTO v3_pack_releases (
            publisher_key_id, pack_id, release_sequence, release_id,
            signed_release_sha256, payload_sha256, pack_version, pack_type,
            execution_class, lifecycle_state, quarantine_reason, self_tested_at,
            created_at, updated_at
         ) VALUES ('publisher', 'pack', 3, 'release-3', ?, ?, '1.0.3', 'source',
                   'static_content', 'staged', NULL, NULL, 'now', 'now')",
    )
    .bind(&release_three_digest)
    .bind(&payload_three_digest)
    .execute(database.pool())
    .await
    .unwrap();
    sqlx::query(
        r#"INSERT INTO pack_release_reviews (
            publisher_key_id, pack_id, release_sequence, publisher_name,
            license, minimum_app_version, maximum_app_version, payload_bytes,
            fixture_summary, privacy_labels_json, data_categories_json,
            task_kinds_json, actions_json, approval_gates_json,
            gateway_policy_id, external_destinations_json
        ) VALUES (
            'publisher', 'pack', 3, 'Publisher', 'MIT', '3.0.0', '3.0.0',
            1, 'Fixture', '["local_only"]', '[]', '[]', '[]', '[]', NULL, '[]'
        )"#,
    )
    .execute(database.pool())
    .await
    .unwrap();
    sqlx::query(
        "UPDATE v3_pack_releases
         SET lifecycle_state = 'self_tested', self_tested_at = 'now'
         WHERE publisher_key_id = 'publisher' AND pack_id = 'pack' AND release_sequence = 3",
    )
    .execute(database.pool())
    .await
    .unwrap();
    sqlx::query(
        "UPDATE v3_pack_releases SET lifecycle_state = 'ready'
         WHERE publisher_key_id = 'publisher' AND pack_id = 'pack' AND release_sequence = 3",
    )
    .execute(database.pool())
    .await
    .unwrap();
    sqlx::query(
        "UPDATE v3_pack_streams
         SET active_release_sequence = 3, rollback_release_sequence = 1,
             generation = generation + 1
         WHERE publisher_key_id = 'publisher' AND pack_id = 'pack'",
    )
    .execute(database.pool())
    .await
    .unwrap();
    let generation: i64 = sqlx::query_scalar(
        "SELECT generation FROM v3_pack_streams
         WHERE publisher_key_id = 'publisher' AND pack_id = 'pack'",
    )
    .fetch_one(database.pool())
    .await
    .unwrap();
    sqlx::query(
        "INSERT INTO pack_task_runs (
            run_id, approval_reference, publisher_key_id, pack_id,
            release_sequence, signed_release_sha256, stream_generation,
            task_kind, task_id, input_sha256, privacy_labels_json,
            data_categories_json, status, receipt_id, created_at, expires_at,
            started_at, completed_at
         ) VALUES (
            'run-1', 'approval-1', 'publisher', 'pack', 3, ?, ?,
            'evidence_review', 'task-1', ?, '[\"local_only\"]',
            '[\"resume_evidence\"]', 'pending', NULL, '2026-01-01T00:00:00Z',
            '2099-01-01T00:00:00Z', NULL, NULL
         )",
    )
    .bind(&release_three_digest)
    .bind(generation)
    .bind("e".repeat(64))
    .execute(database.pool())
    .await
    .unwrap();

    MIGRATOR.run_to(27, database.pool()).await.unwrap();

    let releases: Vec<(i64, String, bool)> = sqlx::query_as(
        "SELECT release_sequence, pack_type, artifact_cleanup_pending
         FROM v3_pack_releases
         WHERE publisher_key_id = 'publisher' AND pack_id = 'pack'
         ORDER BY release_sequence",
    )
    .fetch_all(database.pool())
    .await
    .unwrap();
    assert_eq!(
        releases,
        vec![
            (1, "source".to_string(), false),
            (3, "source".to_string(), false)
        ]
    );
    let stream: (i64, i64, i64) = sqlx::query_as(
        "SELECT active_release_sequence, rollback_release_sequence, high_water_sequence
         FROM v3_pack_streams WHERE publisher_key_id = 'publisher' AND pack_id = 'pack'",
    )
    .fetch_one(database.pool())
    .await
    .unwrap();
    assert_eq!(stream, (3, 1, 3));
    let task_status: String =
        sqlx::query_scalar("SELECT status FROM pack_task_runs WHERE run_id = 'run-1'")
            .fetch_one(database.pool())
            .await
            .unwrap();
    assert_eq!(task_status, "pending");
    let foreign_key_violations: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM pragma_foreign_key_check")
            .fetch_one(database.pool())
            .await
            .unwrap();
    assert_eq!(foreign_key_violations, 0);
    let stream_foreign_keys: Vec<String> = sqlx::query_scalar(
        "SELECT \"table\" FROM pragma_foreign_key_list('v3_pack_streams') ORDER BY id",
    )
    .fetch_all(database.pool())
    .await
    .unwrap();
    assert!(stream_foreign_keys
        .iter()
        .any(|table| table == "v3_pack_releases"));
    let review_foreign_key: String = sqlx::query_scalar(
        "SELECT \"table\" FROM pragma_foreign_key_list('pack_release_reviews') LIMIT 1",
    )
    .fetch_one(database.pool())
    .await
    .unwrap();
    assert_eq!(review_foreign_key, "v3_pack_releases");

    let trigger_names = [
        "v3_pack_publishers_identity_immutable",
        "v3_pack_releases_insert_is_new_high_water",
        "v3_pack_releases_advance_high_water",
        "v3_pack_releases_immutable_fields",
        "v3_pack_releases_state_transition",
        "v3_pack_releases_referenced_state",
        "v3_pack_releases_no_delete",
        "v3_pack_streams_update_guard",
        "v3_pack_streams_no_delete",
        "pack_release_reviews_canonical_values",
        "pack_release_reviews_immutable",
        "pack_release_reviews_no_delete",
        "pack_stream_actionable_requires_review",
        "pack_release_cleanup_truth",
        "pack_task_runs_canonical_context",
        "pack_task_runs_context_immutable",
        "pack_task_runs_valid_transition",
        "pack_task_runs_start_requires_exact_ready_pack",
        "pack_task_runs_complete_requires_exact_ready_pack",
        "pack_task_runs_no_delete",
        "pack_task_runs_create_requires_review",
        "pack_task_runs_transition_requires_review",
    ];
    let triggers: Vec<(String, String)> = sqlx::query_as(
        "SELECT name, sql FROM sqlite_master
         WHERE type = 'trigger' AND name LIKE 'pack_%' OR name LIKE 'v3_pack_%'",
    )
    .fetch_all(database.pool())
    .await
    .unwrap();
    for name in trigger_names {
        let definition = triggers
            .iter()
            .find_map(|(actual, sql)| (actual == name).then_some(sql))
            .unwrap_or_else(|| panic!("{name} must survive the release-table rebuild"));
        assert!(!definition.contains("_rebuild"));
    }
    let indexes: Vec<String> =
        sqlx::query_scalar("SELECT name FROM pragma_index_list('v3_pack_releases')")
            .fetch_all(database.pool())
            .await
            .unwrap();
    assert!(indexes.contains(&"idx_v3_pack_releases_lifecycle".to_string()));
    assert!(indexes.contains(&"idx_pack_release_cleanup_pending".to_string()));
    assert!(sqlx::query(
        "UPDATE v3_pack_releases SET pack_type = 'region'
         WHERE publisher_key_id = 'publisher' AND pack_id = 'pack' AND release_sequence = 1",
    )
    .execute(database.pool())
    .await
    .is_err());
    sqlx::query(
        "UPDATE pack_task_runs SET status = 'started', started_at = '2026-01-01T00:00:01Z'
         WHERE run_id = 'run-1'",
    )
    .execute(database.pool())
    .await
    .unwrap();
}

#[tokio::test]
async fn pack_lifecycle_triggers_reject_state_bypass_history_loss_and_retrust() {
    let database = Database::connect_memory().await.unwrap();
    MIGRATOR.run(database.pool()).await.unwrap();
    let digest = "a".repeat(64);
    let payload_digest = "b".repeat(64);
    seed_pack_lifecycle(&database, &digest, &payload_digest).await;
    sqlx::query(
        r#"INSERT INTO pack_release_reviews (
            publisher_key_id, pack_id, release_sequence, publisher_name,
            license, minimum_app_version, maximum_app_version, payload_bytes,
            fixture_summary, privacy_labels_json, data_categories_json,
            task_kinds_json, actions_json, approval_gates_json,
            gateway_policy_id, external_destinations_json
         ) VALUES (
            'publisher', 'pack', 1, 'Publisher', 'MIT', '3.0.0', '3.0.0',
            1, 'Source fixture', '["local_only"]', '[]', '[]', '[]', '[]',
            NULL, '[]'
         )"#,
    )
    .execute(database.pool())
    .await
    .unwrap();

    assert!(sqlx::query(
        "UPDATE v3_pack_releases SET lifecycle_state = 'ready',
                self_tested_at = 'now'
         WHERE publisher_key_id = 'publisher' AND pack_id = 'pack'"
    )
    .execute(database.pool())
    .await
    .is_err());
    assert!(sqlx::query(
        "UPDATE v3_pack_streams SET active_release_sequence = 1,
                availability = 'ready', generation = generation + 1
         WHERE publisher_key_id = 'publisher' AND pack_id = 'pack'"
    )
    .execute(database.pool())
    .await
    .is_err());
    sqlx::query(
        "UPDATE v3_pack_releases SET lifecycle_state = 'self_tested',
                self_tested_at = 'now'
         WHERE publisher_key_id = 'publisher' AND pack_id = 'pack'",
    )
    .execute(database.pool())
    .await
    .unwrap();
    sqlx::query(
        "UPDATE v3_pack_releases SET lifecycle_state = 'ready'
         WHERE publisher_key_id = 'publisher' AND pack_id = 'pack'",
    )
    .execute(database.pool())
    .await
    .unwrap();
    sqlx::query(
        "UPDATE v3_pack_streams SET active_release_sequence = 1,
                availability = 'ready', generation = generation + 1
         WHERE publisher_key_id = 'publisher' AND pack_id = 'pack'",
    )
    .execute(database.pool())
    .await
    .unwrap();

    for attack in [
        "UPDATE v3_pack_streams SET generation = generation + 2 WHERE publisher_key_id = 'publisher' AND pack_id = 'pack'",
        "UPDATE v3_pack_streams SET high_water_sequence = 0, high_water_signed_release_sha256 = NULL, generation = generation + 1 WHERE publisher_key_id = 'publisher' AND pack_id = 'pack'",
        "UPDATE v3_pack_releases SET signed_release_sha256 = 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc' WHERE publisher_key_id = 'publisher' AND pack_id = 'pack'",
        "UPDATE v3_pack_publishers SET trust_state = 'revoked', revoked_at = 'now' WHERE publisher_key_id = 'publisher'",
        "DELETE FROM v3_pack_streams WHERE publisher_key_id = 'publisher' AND pack_id = 'pack'",
        "DELETE FROM v3_pack_releases WHERE publisher_key_id = 'publisher' AND pack_id = 'pack'",
        "DELETE FROM v3_pack_publishers WHERE publisher_key_id = 'publisher'",
    ] {
        assert!(sqlx::query(attack).execute(database.pool()).await.is_err());
    }

    sqlx::query(
        "UPDATE v3_pack_streams SET active_release_sequence = NULL,
                availability = 'quarantined', generation = generation + 1
         WHERE publisher_key_id = 'publisher' AND pack_id = 'pack'",
    )
    .execute(database.pool())
    .await
    .unwrap();
    sqlx::query(
        "UPDATE v3_pack_releases SET lifecycle_state = 'quarantined',
                quarantine_reason = 'trust_revoked'
         WHERE publisher_key_id = 'publisher' AND pack_id = 'pack'",
    )
    .execute(database.pool())
    .await
    .unwrap();
    sqlx::query(
        "UPDATE v3_pack_publishers SET trust_state = 'revoked',
                revoked_at = 'now' WHERE publisher_key_id = 'publisher'",
    )
    .execute(database.pool())
    .await
    .unwrap();
    assert!(sqlx::query(
        "UPDATE v3_pack_publishers SET trust_state = 'trusted', revoked_at = NULL
         WHERE publisher_key_id = 'publisher'"
    )
    .execute(database.pool())
    .await
    .is_err());
}
