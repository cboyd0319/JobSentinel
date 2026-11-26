-- Renames live tables, indexes and non-pack guards without changing data or contract values.

DROP TRIGGER v3_source_policy_revision_must_increase;
DROP TRIGGER v3_source_policy_identity_is_stable;
DROP TRIGGER v3_source_policy_insert_must_advance;
DROP TRIGGER v3_source_policy_no_delete;
DROP TRIGGER v3_source_policy_ledger_matches_current;
DROP TRIGGER v3_source_policy_ledger_no_replace;
DROP TRIGGER v3_source_policy_ledger_after_insert;
DROP TRIGGER v3_source_policy_ledger_after_update;
DROP TRIGGER v3_source_policy_ledger_no_update;
DROP TRIGGER v3_source_policy_ledger_no_delete;
DROP TRIGGER v3_outside_ai_insert_is_pending;
DROP TRIGGER v3_outside_ai_validate_labels;
DROP TRIGGER v3_outside_ai_validate_categories;
DROP TRIGGER v3_outside_ai_context_is_immutable;
DROP TRIGGER v3_outside_ai_status_transition;
DROP TRIGGER v3_outside_ai_no_delete;
DROP TRIGGER v3_privacy_receipt_no_update;
DROP TRIGGER v3_privacy_receipt_no_delete;
DROP TRIGGER v3_privacy_receipt_exact_shape;
DROP TRIGGER v3_privacy_receipt_local_has_no_approval;
DROP TRIGGER v3_external_receipt_matches_started_operation;
DROP TRIGGER v3_external_receipt_consumes_approval;
DROP TRIGGER v3_source_manifest_requires_current_policy;
DROP TRIGGER v3_source_manifest_same_revision_is_immutable;
DROP TRIGGER v3_source_manifest_update_requires_current_policy;
DROP TRIGGER v3_source_manifest_revision_must_increase;
DROP TRIGGER v3_source_manifest_identity_is_stable;
DROP TRIGGER v3_source_manifest_no_delete;
DROP TRIGGER v3_source_consent_no_replace;
DROP TRIGGER v3_source_consent_validate_categories;
DROP TRIGGER v3_source_consent_chain_is_current;
DROP TRIGGER v3_source_consent_grant_matches_policy;
DROP TRIGGER v3_source_consent_revoke_matches_grant;
DROP TRIGGER v3_source_consent_no_update;
DROP TRIGGER v3_source_consent_no_delete;
DROP INDEX idx_v3_job_events_case_time;
DROP INDEX idx_v3_recovery_operations_created;
DROP INDEX idx_v3_source_consent_latest;
DROP INDEX idx_v3_evidence_packets_case_created;
DROP INDEX idx_v3_pack_releases_lifecycle;

ALTER TABLE v3_privacy_receipts RENAME TO privacy_receipts;
ALTER TABLE v3_compatibility_metadata RENAME TO compatibility_metadata;
ALTER TABLE v3_recovery_operations RENAME TO recovery_operations;
ALTER TABLE v3_source_policies RENAME TO source_policies;
ALTER TABLE v3_source_policy_ledger RENAME TO source_policy_ledger;
ALTER TABLE v3_outside_ai_operations RENAME TO outside_ai_operations;
ALTER TABLE v3_source_manifests RENAME TO source_manifests;
ALTER TABLE v3_source_consent_events RENAME TO source_consent_events;
ALTER TABLE v3_evidence_packets RENAME TO evidence_packets;
ALTER TABLE v3_evidence_packet_evidence RENAME TO evidence_packet_evidence;
ALTER TABLE v3_evidence_packet_boundaries RENAME TO evidence_packet_boundaries;
ALTER TABLE v3_pack_publishers RENAME TO pack_publishers;
ALTER TABLE v3_pack_releases RENAME TO pack_releases;
ALTER TABLE v3_pack_streams RENAME TO pack_streams;
ALTER TABLE v3_job_events RENAME TO job_events;

CREATE INDEX idx_job_events_case_time ON job_events(case_file_id, created_at, event_id);

CREATE INDEX IF NOT EXISTS idx_recovery_operations_created ON recovery_operations(created_at DESC, operation_id DESC);

CREATE INDEX idx_source_consent_latest ON source_consent_events(source_id, operation, sequence DESC);

CREATE INDEX idx_evidence_packets_case_created ON evidence_packets(case_file_id, created_at, packet_id);

CREATE INDEX idx_pack_releases_lifecycle ON pack_releases(lifecycle_state, publisher_key_id, pack_id, release_sequence);

CREATE TRIGGER source_policy_revision_must_increase BEFORE UPDATE ON source_policies
WHEN NEW.revision <= OLD.revision
BEGIN SELECT RAISE(ABORT, 'source policy revision must increase'); END;

CREATE TRIGGER source_policy_identity_is_stable BEFORE UPDATE ON source_policies
WHEN NEW.source_id <> OLD.source_id
BEGIN SELECT RAISE(ABORT, 'source policy identity cannot change'); END;

CREATE TRIGGER source_policy_insert_must_advance BEFORE INSERT ON source_policies
WHEN NEW.revision <= COALESCE((
    SELECT MAX(revision)
    FROM source_policy_ledger
    WHERE source_id = NEW.source_id
), 0)
BEGIN SELECT RAISE(ABORT, 'source policy revision must advance history'); END;

CREATE TRIGGER source_policy_no_delete BEFORE DELETE ON source_policies
BEGIN SELECT RAISE(ABORT, 'source policy must be disabled, not deleted'); END;

CREATE TRIGGER source_policy_ledger_matches_current BEFORE INSERT ON source_policy_ledger
WHEN NOT EXISTS (
    SELECT 1
    FROM source_policies
    WHERE source_id = NEW.source_id
      AND source_class = NEW.source_class
      AND access = NEW.access
      AND request_limit_per_hour = NEW.request_limit_per_hour
      AND user_review_required = NEW.user_review_required
      AND policy_ref = NEW.policy_ref
      AND revision = NEW.revision
      AND restriction_reason_code IS NEW.restriction_reason_code
      AND reviewed_at = NEW.reviewed_at
)
BEGIN SELECT RAISE(ABORT, 'source policy history must match current policy'); END;

CREATE TRIGGER source_policy_ledger_no_replace BEFORE INSERT ON source_policy_ledger
WHEN EXISTS (
    SELECT 1
    FROM source_policy_ledger
    WHERE source_id = NEW.source_id
      AND revision = NEW.revision
)
BEGIN SELECT RAISE(ABORT, 'source policy history is append-only'); END;

CREATE TRIGGER source_policy_ledger_after_insert AFTER INSERT ON source_policies
BEGIN
    INSERT INTO source_policy_ledger (
        source_id,
        source_class,
        access,
        request_limit_per_hour,
        user_review_required,
        policy_ref,
        revision,
        restriction_reason_code,
        reviewed_at,
        recorded_at
    ) VALUES (
        NEW.source_id,
        NEW.source_class,
        NEW.access,
        NEW.request_limit_per_hour,
        NEW.user_review_required,
        NEW.policy_ref,
        NEW.revision,
        NEW.restriction_reason_code,
        NEW.reviewed_at,
        NEW.created_at
    );
END;

CREATE TRIGGER source_policy_ledger_after_update AFTER UPDATE ON source_policies
BEGIN
    INSERT INTO source_policy_ledger (
        source_id,
        source_class,
        access,
        request_limit_per_hour,
        user_review_required,
        policy_ref,
        revision,
        restriction_reason_code,
        reviewed_at,
        recorded_at
    ) VALUES (
        NEW.source_id,
        NEW.source_class,
        NEW.access,
        NEW.request_limit_per_hour,
        NEW.user_review_required,
        NEW.policy_ref,
        NEW.revision,
        NEW.restriction_reason_code,
        NEW.reviewed_at,
        NEW.updated_at
    );
END;

CREATE TRIGGER source_policy_ledger_no_update BEFORE UPDATE ON source_policy_ledger
BEGIN SELECT RAISE(ABORT, 'source policy history is append-only'); END;

CREATE TRIGGER source_policy_ledger_no_delete BEFORE DELETE ON source_policy_ledger
BEGIN SELECT RAISE(ABORT, 'source policy history is append-only'); END;

CREATE TRIGGER outside_ai_insert_is_pending BEFORE INSERT ON outside_ai_operations
WHEN NEW.status <> 'pending'
  OR NEW.receipt_recorded <> 0
  OR NEW.started_at IS NOT NULL
  OR NEW.completed_at IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'outside AI review must begin pending'); END;

CREATE TRIGGER outside_ai_validate_labels BEFORE INSERT ON outside_ai_operations
WHEN NEW.labels_json <> '["external_ai_optional","public_data_only"]'
BEGIN SELECT RAISE(ABORT, 'invalid outside AI privacy labels'); END;

CREATE TRIGGER outside_ai_validate_categories BEFORE INSERT ON outside_ai_operations
WHEN NEW.data_categories_json <> '["public_job_posting"]'
BEGIN SELECT RAISE(ABORT, 'invalid outside AI data categories'); END;

CREATE TRIGGER outside_ai_context_is_immutable BEFORE UPDATE ON outside_ai_operations
WHEN OLD.operation_id IS NOT NEW.operation_id
  OR OLD.approval_reference IS NOT NEW.approval_reference
  OR OLD.feature_id IS NOT NEW.feature_id
  OR OLD.provider_id IS NOT NEW.provider_id
  OR OLD.destination IS NOT NEW.destination
  OR OLD.request_sha256 IS NOT NEW.request_sha256
  OR OLD.labels_json IS NOT NEW.labels_json
  OR OLD.data_categories_json IS NOT NEW.data_categories_json
  OR OLD.gateway_policy_revision IS NOT NEW.gateway_policy_revision
  OR OLD.created_at IS NOT NEW.created_at
  OR OLD.expires_at IS NOT NEW.expires_at
BEGIN SELECT RAISE(ABORT, 'outside AI review context is immutable'); END;

CREATE TRIGGER outside_ai_status_transition BEFORE UPDATE ON outside_ai_operations
WHEN NOT (
    (
        OLD.status = 'pending'
        AND NEW.status = 'started'
        AND OLD.receipt_recorded = NEW.receipt_recorded
        AND NEW.started_at IS NOT NULL
        AND NEW.completed_at IS NULL
        AND julianday(NEW.started_at) >= julianday(NEW.created_at)
        AND julianday(NEW.started_at) <= julianday(NEW.expires_at)
    )
    OR (
        OLD.status = 'pending'
        AND NEW.status = 'cancelled'
        AND OLD.receipt_recorded = NEW.receipt_recorded
        AND NEW.started_at IS NULL
        AND NEW.completed_at IS NOT NULL
        AND julianday(NEW.completed_at) >= julianday(NEW.created_at)
    )
    OR (
        OLD.status = 'started'
        AND NEW.status IN ('succeeded', 'failed', 'ambiguous')
        AND OLD.receipt_recorded = NEW.receipt_recorded
        AND NEW.started_at IS OLD.started_at
        AND NEW.completed_at IS NOT NULL
        AND julianday(NEW.completed_at) >= julianday(NEW.started_at)
        AND (NEW.status <> 'succeeded' OR NEW.receipt_recorded = 1)
    )
    OR (
        OLD.status = 'started'
        AND NEW.status = OLD.status
        AND OLD.receipt_recorded = 0
        AND NEW.receipt_recorded = 1
        AND NEW.started_at IS OLD.started_at
        AND NEW.completed_at IS NULL
    )
)
BEGIN SELECT RAISE(ABORT, 'invalid outside AI lifecycle transition'); END;

CREATE TRIGGER outside_ai_no_delete BEFORE DELETE ON outside_ai_operations
BEGIN SELECT RAISE(ABORT, 'outside AI lifecycle is append-only'); END;

CREATE TRIGGER privacy_receipt_no_update BEFORE UPDATE ON privacy_receipts
BEGIN SELECT RAISE(ABORT, 'privacy receipt audit metadata is immutable'); END;

CREATE TRIGGER privacy_receipt_no_delete BEFORE DELETE ON privacy_receipts
BEGIN SELECT RAISE(ABORT, 'privacy receipt audit metadata is append-only'); END;

CREATE TRIGGER privacy_receipt_exact_shape BEFORE INSERT ON privacy_receipts
WHEN EXISTS (
    SELECT 1
    FROM json_each(NEW.receipt_json)
    WHERE key NOT IN (
        'schema',
        'receipt_id',
        'task_id',
        'pack_id',
        'labels',
        'data_categories',
        'stored_locally',
        'data_left_device',
        'external_destination',
        'gateway_policy_id',
        'approval_reference',
        'delete_or_revoke_action'
    )
)
BEGIN SELECT RAISE(ABORT, 'privacy receipt contains unsupported metadata'); END;

CREATE TRIGGER privacy_receipt_local_has_no_approval BEFORE INSERT ON privacy_receipts
WHEN NEW.data_left_device = 0
AND COALESCE(
    json_type(NEW.receipt_json, '$.approval_reference'),
    'null'
) <> 'null'
BEGIN SELECT RAISE(ABORT, 'local privacy receipt cannot reference external approval'); END;

CREATE TRIGGER external_receipt_matches_started_operation BEFORE INSERT ON privacy_receipts
WHEN NEW.data_left_device = 1
AND NOT EXISTS (
    SELECT 1
    FROM outside_ai_operations
    WHERE status = 'started'
      AND receipt_recorded = 0
      AND operation_id = json_extract(NEW.receipt_json, '$.task_id')
      AND approval_reference =
          json_extract(NEW.receipt_json, '$.approval_reference')
      AND destination =
          json_extract(NEW.receipt_json, '$.external_destination')
      AND gateway_policy_revision =
          json_extract(NEW.receipt_json, '$.gateway_policy_id')
      AND labels_json = json_extract(NEW.receipt_json, '$.labels')
      AND data_categories_json =
          json_extract(NEW.receipt_json, '$.data_categories')
)
BEGIN SELECT RAISE(ABORT, 'external privacy receipt does not match a started operation'); END;

CREATE TRIGGER external_receipt_consumes_approval AFTER INSERT ON privacy_receipts
WHEN NEW.data_left_device = 1
BEGIN
    UPDATE outside_ai_operations
    SET receipt_recorded = 1
    WHERE operation_id = json_extract(NEW.receipt_json, '$.task_id')
      AND approval_reference =
          json_extract(NEW.receipt_json, '$.approval_reference');
END;

CREATE TRIGGER source_manifest_requires_current_policy BEFORE INSERT ON source_manifests
WHEN NOT EXISTS (
    SELECT 1
    FROM source_policies
    WHERE source_id = NEW.source_id
      AND policy_ref = NEW.policy_ref
      AND revision = NEW.policy_revision
)
BEGIN SELECT RAISE(ABORT, 'source manifest must match the current policy'); END;

CREATE TRIGGER source_manifest_same_revision_is_immutable BEFORE INSERT ON source_manifests
WHEN EXISTS (
    SELECT 1
    FROM source_manifests
    WHERE source_id = NEW.source_id
      AND policy_revision = NEW.policy_revision
      AND (
          policy_ref <> NEW.policy_ref
          OR manifest_json <> NEW.manifest_json
      )
)
BEGIN SELECT RAISE(ABORT, 'source manifest revision is immutable'); END;

CREATE TRIGGER source_manifest_update_requires_current_policy BEFORE UPDATE ON source_manifests
WHEN NOT EXISTS (
    SELECT 1
    FROM source_policies
    WHERE source_id = NEW.source_id
      AND policy_ref = NEW.policy_ref
      AND revision = NEW.policy_revision
)
BEGIN SELECT RAISE(ABORT, 'source manifest must match the current policy'); END;

CREATE TRIGGER source_manifest_revision_must_increase BEFORE UPDATE ON source_manifests
WHEN NEW.policy_revision <= OLD.policy_revision
BEGIN SELECT RAISE(ABORT, 'source manifest revision must increase'); END;

CREATE TRIGGER source_manifest_identity_is_stable BEFORE UPDATE ON source_manifests
WHEN NEW.source_id <> OLD.source_id
BEGIN SELECT RAISE(ABORT, 'source manifest identity cannot change'); END;

CREATE TRIGGER source_manifest_no_delete BEFORE DELETE ON source_manifests
BEGIN SELECT RAISE(ABORT, 'source manifest must be disabled through source policy'); END;

CREATE TRIGGER source_consent_no_replace BEFORE INSERT ON source_consent_events
WHEN EXISTS (
    SELECT 1
    FROM source_consent_events
    WHERE event_id = NEW.event_id
)
BEGIN SELECT RAISE(ABORT, 'source consent history is append-only'); END;

CREATE TRIGGER source_consent_validate_categories BEFORE INSERT ON source_consent_events
WHEN EXISTS (
    SELECT 1
    FROM json_each(NEW.data_categories_json)
    WHERE type <> 'text'
       OR (
           NEW.operation = 'scheduled_check'
           AND value NOT IN (
               'public_job_posting',
               'career_goals',
               'location_preferences'
           )
       )
       OR (
           NEW.operation = 'restricted_workbench'
           AND value NOT IN (
               'public_job_posting',
               'application_history',
               'career_goals'
           )
       )
)
OR (
    SELECT COUNT(*)
    FROM json_each(NEW.data_categories_json)
) <> (
    SELECT COUNT(DISTINCT value)
    FROM json_each(NEW.data_categories_json)
)
BEGIN SELECT RAISE(ABORT, 'invalid source consent data categories'); END;

CREATE TRIGGER source_consent_chain_is_current BEFORE INSERT ON source_consent_events
WHEN (
    SELECT event_id
    FROM source_consent_events
    WHERE source_id = NEW.source_id
      AND operation = NEW.operation
    ORDER BY sequence DESC
    LIMIT 1
) IS NOT NEW.previous_event_id
BEGIN SELECT RAISE(ABORT, 'source consent state changed'); END;

CREATE TRIGGER source_consent_grant_matches_policy BEFORE INSERT ON source_consent_events
WHEN NEW.decision = 'granted'
AND NOT EXISTS (
    SELECT 1
    FROM source_policies
    WHERE source_id = NEW.source_id
      AND source_class = NEW.source_class
      AND policy_ref = NEW.policy_ref
      AND revision = NEW.policy_revision
      AND user_review_required = 1
      AND (
          (
              NEW.operation = 'scheduled_check'
              AND source_class = 'restricted_public_scheduled'
              AND access = 'scheduled_public'
          )
          OR (
              NEW.operation = 'restricted_workbench'
              AND source_class = 'restricted_user_opened'
              AND access = 'user_opened'
          )
      )
)
BEGIN SELECT RAISE(ABORT, 'source consent must match current policy'); END;

CREATE TRIGGER source_consent_revoke_matches_grant BEFORE INSERT ON source_consent_events
WHEN NEW.decision = 'revoked'
AND NOT EXISTS (
    SELECT 1
    FROM source_consent_events
    WHERE event_id = NEW.previous_event_id
      AND decision = 'granted'
      AND source_id = NEW.source_id
      AND operation = NEW.operation
      AND warning_version = NEW.warning_version
      AND behavior_revision = NEW.behavior_revision
      AND policy_ref = NEW.policy_ref
      AND policy_revision = NEW.policy_revision
      AND source_class = NEW.source_class
      AND data_categories_json = NEW.data_categories_json
      AND destination_sha256 = NEW.destination_sha256
      AND request_sha256 = NEW.request_sha256
)
BEGIN SELECT RAISE(ABORT, 'source consent revocation must match the latest grant'); END;

CREATE TRIGGER source_consent_no_update BEFORE UPDATE ON source_consent_events
BEGIN SELECT RAISE(ABORT, 'source consent history is append-only'); END;

CREATE TRIGGER source_consent_no_delete BEFORE DELETE ON source_consent_events
BEGIN SELECT RAISE(ABORT, 'source consent history is append-only'); END;

UPDATE compatibility_metadata SET migration_version = 33 WHERE singleton = 1;
