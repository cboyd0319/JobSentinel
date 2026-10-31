-- Extends immutable signed pack storage with static local-only region releases
-- while rebuilding dependent SQLite tables without disabling foreign-key checks.
DROP TRIGGER v3_pack_publishers_identity_immutable;
DROP TRIGGER v3_pack_releases_insert_is_new_high_water;
DROP TRIGGER v3_pack_releases_advance_high_water;
DROP TRIGGER v3_pack_releases_immutable_fields;
DROP TRIGGER v3_pack_releases_state_transition;
DROP TRIGGER v3_pack_releases_referenced_state;
DROP TRIGGER v3_pack_releases_no_delete;
DROP TRIGGER v3_pack_streams_update_guard;
DROP TRIGGER v3_pack_streams_no_delete;
DROP TRIGGER pack_stream_actionable_requires_review;
DROP TRIGGER pack_release_reviews_canonical_values;
DROP TRIGGER pack_release_reviews_immutable;
DROP TRIGGER pack_release_reviews_no_delete;
DROP TRIGGER pack_release_cleanup_truth;
DROP TRIGGER pack_task_runs_canonical_context;
DROP TRIGGER pack_task_runs_context_immutable;
DROP TRIGGER pack_task_runs_valid_transition;
DROP TRIGGER pack_task_runs_start_requires_exact_ready_pack;
DROP TRIGGER pack_task_runs_complete_requires_exact_ready_pack;
DROP TRIGGER pack_task_runs_no_delete;
DROP TRIGGER pack_task_runs_create_requires_review;
DROP TRIGGER pack_task_runs_transition_requires_review;
DROP INDEX idx_v3_pack_releases_lifecycle;
DROP INDEX idx_pack_release_cleanup_pending;
CREATE TABLE v3_pack_releases_rebuild (
    publisher_key_id TEXT NOT NULL
        REFERENCES v3_pack_publishers(publisher_key_id) ON DELETE RESTRICT,
    pack_id TEXT NOT NULL CHECK(
        length(CAST(pack_id AS BLOB)) BETWEEN 1 AND 128
        AND pack_id NOT GLOB '*[^-A-Za-z0-9._:]*'
    ),
    release_sequence INTEGER NOT NULL CHECK(release_sequence > 0),
    release_id TEXT NOT NULL CHECK(
        length(CAST(release_id AS BLOB)) BETWEEN 1 AND 128
        AND release_id NOT GLOB '*[^-A-Za-z0-9._:]*'
    ),
    signed_release_sha256 TEXT NOT NULL CHECK(
        length(CAST(signed_release_sha256 AS BLOB)) = 64
        AND signed_release_sha256 NOT GLOB '*[^0-9a-f]*'
    ),
    payload_sha256 TEXT NOT NULL CHECK(
        length(CAST(payload_sha256 AS BLOB)) = 64
        AND payload_sha256 NOT GLOB '*[^0-9a-f]*'
    ),
    pack_version TEXT NOT NULL CHECK(
        length(CAST(pack_version AS BLOB)) BETWEEN 1 AND 64
    ),
    pack_type TEXT NOT NULL CHECK(pack_type IN (
        'skill', 'agent', 'workflow', 'region', 'source', 'evaluation'
    )),
    execution_class TEXT NOT NULL CHECK(execution_class IN (
        'static_content', 'reviewed_typed_workflow'
    )),
    lifecycle_state TEXT NOT NULL CHECK(lifecycle_state IN (
        'staged', 'self_tested', 'ready', 'quarantined', 'removed'
    )),
    quarantine_reason TEXT CHECK(quarantine_reason IN (
        'self_test_failed', 'trust_revoked', 'interrupted',
        'artifact_missing', 'integrity_failed'
    )),
    self_tested_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    artifact_cleanup_pending INTEGER NOT NULL DEFAULT 0
        CHECK(artifact_cleanup_pending IN (0, 1)),
    PRIMARY KEY(publisher_key_id, pack_id, release_sequence),
    CHECK(
        (lifecycle_state = 'staged'
            AND quarantine_reason IS NULL
            AND self_tested_at IS NULL)
        OR (lifecycle_state IN ('self_tested', 'ready')
            AND quarantine_reason IS NULL
            AND self_tested_at IS NOT NULL)
        OR (lifecycle_state = 'quarantined'
            AND quarantine_reason IS NOT NULL)
        OR lifecycle_state = 'removed'
    )
);
INSERT INTO v3_pack_releases_rebuild (
    publisher_key_id, pack_id, release_sequence, release_id,
    signed_release_sha256, payload_sha256, pack_version, pack_type,
    execution_class, lifecycle_state, quarantine_reason, self_tested_at,
    created_at, updated_at, artifact_cleanup_pending
)
SELECT publisher_key_id, pack_id, release_sequence, release_id,
       signed_release_sha256, payload_sha256, pack_version, pack_type,
       execution_class, lifecycle_state, quarantine_reason, self_tested_at,
       created_at, updated_at, artifact_cleanup_pending
FROM v3_pack_releases;
CREATE TABLE v3_pack_streams_rebuild (
    publisher_key_id TEXT NOT NULL
        REFERENCES v3_pack_publishers(publisher_key_id) ON DELETE RESTRICT,
    pack_id TEXT NOT NULL CHECK(
        length(CAST(pack_id AS BLOB)) BETWEEN 1 AND 128
        AND pack_id NOT GLOB '*[^-A-Za-z0-9._:]*'
    ),
    high_water_sequence INTEGER NOT NULL DEFAULT 0
        CHECK(high_water_sequence >= 0),
    high_water_signed_release_sha256 TEXT CHECK(
        high_water_signed_release_sha256 IS NULL
        OR (
            length(CAST(high_water_signed_release_sha256 AS BLOB)) = 64
            AND high_water_signed_release_sha256 NOT GLOB '*[^0-9a-f]*'
        )
    ),
    active_release_sequence INTEGER,
    rollback_release_sequence INTEGER,
    availability TEXT NOT NULL CHECK(availability IN (
        'ready', 'disabled', 'quarantined', 'removed'
    )),
    generation INTEGER NOT NULL DEFAULT 0 CHECK(generation >= 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY(publisher_key_id, pack_id),
    FOREIGN KEY(publisher_key_id, pack_id, active_release_sequence)
        REFERENCES v3_pack_releases_rebuild(
            publisher_key_id, pack_id, release_sequence
        ) ON DELETE RESTRICT,
    FOREIGN KEY(publisher_key_id, pack_id, rollback_release_sequence)
        REFERENCES v3_pack_releases_rebuild(
            publisher_key_id, pack_id, release_sequence
        ) ON DELETE RESTRICT,
    CHECK(
        (high_water_sequence = 0 AND high_water_signed_release_sha256 IS NULL)
        OR (high_water_sequence > 0 AND high_water_signed_release_sha256 IS NOT NULL)
    ),
    CHECK(
        (availability IN ('ready', 'disabled') AND active_release_sequence IS NOT NULL)
        OR (availability IN ('quarantined', 'removed')
            AND active_release_sequence IS NULL AND rollback_release_sequence IS NULL)
    ),
    CHECK(active_release_sequence IS NULL OR active_release_sequence <= high_water_sequence),
    CHECK(rollback_release_sequence IS NULL OR rollback_release_sequence <= high_water_sequence),
    CHECK(
        active_release_sequence IS NULL
        OR rollback_release_sequence IS NULL
        OR active_release_sequence <> rollback_release_sequence
    )
);
INSERT INTO v3_pack_streams_rebuild (
    publisher_key_id, pack_id, high_water_sequence,
    high_water_signed_release_sha256, active_release_sequence,
    rollback_release_sequence, availability, generation, created_at, updated_at
)
SELECT publisher_key_id, pack_id, high_water_sequence,
       high_water_signed_release_sha256, active_release_sequence,
       rollback_release_sequence, availability, generation, created_at, updated_at
FROM v3_pack_streams;
CREATE TABLE pack_release_reviews_rebuild (
    publisher_key_id TEXT NOT NULL,
    pack_id TEXT NOT NULL,
    release_sequence INTEGER NOT NULL CHECK(release_sequence > 0),
    publisher_name TEXT NOT NULL CHECK(length(CAST(publisher_name AS BLOB)) BETWEEN 1 AND 128),
    license TEXT NOT NULL CHECK(length(CAST(license AS BLOB)) BETWEEN 1 AND 128),
    minimum_app_version TEXT NOT NULL CHECK(length(CAST(minimum_app_version AS BLOB)) BETWEEN 1 AND 64),
    maximum_app_version TEXT NOT NULL CHECK(length(CAST(maximum_app_version AS BLOB)) BETWEEN 1 AND 64),
    payload_bytes INTEGER NOT NULL CHECK(payload_bytes BETWEEN 0 AND 3145728),
    fixture_summary TEXT NOT NULL CHECK(length(CAST(fixture_summary AS BLOB)) BETWEEN 1 AND 4096),
    privacy_labels_json TEXT NOT NULL CHECK(json_valid(privacy_labels_json) AND json_type(privacy_labels_json) = 'array' AND privacy_labels_json = json(privacy_labels_json)),
    data_categories_json TEXT NOT NULL CHECK(json_valid(data_categories_json) AND json_type(data_categories_json) = 'array' AND data_categories_json = json(data_categories_json)),
    task_kinds_json TEXT NOT NULL CHECK(json_valid(task_kinds_json) AND json_type(task_kinds_json) = 'array' AND task_kinds_json = json(task_kinds_json)),
    actions_json TEXT NOT NULL CHECK(json_valid(actions_json) AND json_type(actions_json) = 'array' AND actions_json = json(actions_json)),
    approval_gates_json TEXT NOT NULL CHECK(json_valid(approval_gates_json) AND json_type(approval_gates_json) = 'array' AND approval_gates_json = json(approval_gates_json)),
    gateway_policy_id TEXT CHECK(
        gateway_policy_id IS NULL OR (
            length(CAST(gateway_policy_id AS BLOB)) BETWEEN 1 AND 128
            AND gateway_policy_id NOT GLOB '*[^-A-Za-z0-9._:]*'
        )
    ),
    external_destinations_json TEXT NOT NULL CHECK(json_valid(external_destinations_json) AND json_type(external_destinations_json) = 'array' AND external_destinations_json = json(external_destinations_json)),
    PRIMARY KEY(publisher_key_id, pack_id, release_sequence),
    FOREIGN KEY(publisher_key_id, pack_id, release_sequence)
        REFERENCES v3_pack_releases_rebuild(
            publisher_key_id, pack_id, release_sequence
        ) ON DELETE RESTRICT
);
INSERT INTO pack_release_reviews_rebuild
SELECT * FROM pack_release_reviews;
DROP TABLE v3_pack_streams;
DROP TABLE pack_release_reviews;
DROP TABLE v3_pack_releases;
ALTER TABLE v3_pack_releases_rebuild RENAME TO v3_pack_releases;
ALTER TABLE v3_pack_streams_rebuild RENAME TO v3_pack_streams;
ALTER TABLE pack_release_reviews_rebuild RENAME TO pack_release_reviews;
CREATE INDEX idx_v3_pack_releases_lifecycle
    ON v3_pack_releases(lifecycle_state, publisher_key_id, pack_id, release_sequence);
CREATE INDEX idx_pack_release_cleanup_pending
    ON v3_pack_releases(artifact_cleanup_pending, publisher_key_id, pack_id, release_sequence);
CREATE TRIGGER v3_pack_publishers_identity_immutable
BEFORE UPDATE ON v3_pack_publishers
WHEN NEW.publisher_key_id <> OLD.publisher_key_id
    OR NEW.public_key_sha256 <> OLD.public_key_sha256
    OR NEW.created_at <> OLD.created_at
    OR (OLD.trust_state = 'revoked' AND NEW.trust_state <> 'revoked')
    OR (
        NEW.trust_state = 'revoked'
        AND EXISTS (
            SELECT 1 FROM v3_pack_streams
            WHERE publisher_key_id = OLD.publisher_key_id
              AND availability IN ('ready', 'disabled')
        )
    )
BEGIN
    SELECT RAISE(ABORT, 'pack publisher update is invalid');
END;
CREATE TRIGGER v3_pack_releases_insert_is_new_high_water
BEFORE INSERT ON v3_pack_releases
WHEN NOT EXISTS (
    SELECT 1 FROM v3_pack_streams
    WHERE publisher_key_id = NEW.publisher_key_id
      AND pack_id = NEW.pack_id
      AND NEW.release_sequence > high_water_sequence
)
BEGIN
    SELECT RAISE(ABORT, 'pack release is not newer');
END;
CREATE TRIGGER v3_pack_releases_advance_high_water
AFTER INSERT ON v3_pack_releases
BEGIN
    UPDATE v3_pack_streams
    SET high_water_sequence = NEW.release_sequence,
        high_water_signed_release_sha256 = NEW.signed_release_sha256,
        availability = CASE WHEN availability = 'removed' THEN 'quarantined' ELSE availability END,
        generation = generation + 1,
        updated_at = NEW.updated_at
    WHERE publisher_key_id = NEW.publisher_key_id AND pack_id = NEW.pack_id;
END;
CREATE TRIGGER v3_pack_releases_immutable_fields
BEFORE UPDATE ON v3_pack_releases
WHEN NEW.publisher_key_id <> OLD.publisher_key_id
    OR NEW.pack_id <> OLD.pack_id
    OR NEW.release_sequence <> OLD.release_sequence
    OR NEW.release_id <> OLD.release_id
    OR NEW.signed_release_sha256 <> OLD.signed_release_sha256
    OR NEW.payload_sha256 <> OLD.payload_sha256
    OR NEW.pack_version <> OLD.pack_version
    OR NEW.pack_type <> OLD.pack_type
    OR NEW.execution_class <> OLD.execution_class
    OR NEW.created_at <> OLD.created_at
BEGIN
    SELECT RAISE(ABORT, 'pack release identity is immutable');
END;
CREATE TRIGGER v3_pack_releases_state_transition
BEFORE UPDATE OF lifecycle_state ON v3_pack_releases
WHEN OLD.lifecycle_state <> NEW.lifecycle_state
    AND NOT (
        (OLD.lifecycle_state = 'staged' AND NEW.lifecycle_state IN ('self_tested', 'quarantined', 'removed'))
        OR (OLD.lifecycle_state = 'self_tested' AND NEW.lifecycle_state IN ('ready', 'quarantined', 'removed'))
        OR (OLD.lifecycle_state = 'ready' AND NEW.lifecycle_state IN ('quarantined', 'removed'))
        OR (OLD.lifecycle_state = 'quarantined' AND NEW.lifecycle_state = 'removed')
    )
BEGIN
    SELECT RAISE(ABORT, 'pack release state transition is invalid');
END;
CREATE TRIGGER v3_pack_releases_referenced_state
BEFORE UPDATE OF lifecycle_state ON v3_pack_releases
WHEN NEW.lifecycle_state <> 'ready'
    AND EXISTS (
        SELECT 1 FROM v3_pack_streams
        WHERE publisher_key_id = OLD.publisher_key_id AND pack_id = OLD.pack_id
          AND (active_release_sequence = OLD.release_sequence OR rollback_release_sequence = OLD.release_sequence)
    )
BEGIN
    SELECT RAISE(ABORT, 'referenced pack release must remain ready');
END;
CREATE TRIGGER v3_pack_releases_no_delete
BEFORE DELETE ON v3_pack_releases
BEGIN
    SELECT RAISE(ABORT, 'pack release history is immutable');
END;
CREATE TRIGGER v3_pack_streams_update_guard
BEFORE UPDATE ON v3_pack_streams
WHEN NEW.publisher_key_id <> OLD.publisher_key_id
    OR NEW.pack_id <> OLD.pack_id
    OR NEW.created_at <> OLD.created_at
    OR NEW.high_water_sequence < OLD.high_water_sequence
    OR (NEW.high_water_sequence = OLD.high_water_sequence
        AND NEW.high_water_signed_release_sha256 IS NOT OLD.high_water_signed_release_sha256)
    OR NEW.generation <> OLD.generation + 1
    OR (NEW.high_water_sequence > OLD.high_water_sequence AND NOT EXISTS (
        SELECT 1 FROM v3_pack_releases
        WHERE publisher_key_id = NEW.publisher_key_id AND pack_id = NEW.pack_id
          AND release_sequence = NEW.high_water_sequence
          AND signed_release_sha256 = NEW.high_water_signed_release_sha256
    ))
    OR (NEW.availability IN ('ready', 'disabled') AND NOT EXISTS (
        SELECT 1 FROM v3_pack_publishers
        WHERE publisher_key_id = NEW.publisher_key_id AND trust_state = 'trusted'
    ))
    OR (NEW.availability IN ('ready', 'disabled') AND NOT EXISTS (
        SELECT 1 FROM v3_pack_releases
        WHERE publisher_key_id = NEW.publisher_key_id AND pack_id = NEW.pack_id
          AND release_sequence = NEW.active_release_sequence AND lifecycle_state = 'ready'
    ))
    OR (NEW.rollback_release_sequence IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM v3_pack_releases
        WHERE publisher_key_id = NEW.publisher_key_id AND pack_id = NEW.pack_id
          AND release_sequence = NEW.rollback_release_sequence AND lifecycle_state = 'ready'
    ))
BEGIN
    SELECT RAISE(ABORT, 'pack stream update is invalid');
END;
CREATE TRIGGER v3_pack_streams_no_delete
BEFORE DELETE ON v3_pack_streams
BEGIN
    SELECT RAISE(ABORT, 'pack stream history is immutable');
END;
CREATE TRIGGER pack_release_reviews_canonical_values
BEFORE INSERT ON pack_release_reviews
WHEN EXISTS (SELECT 1 FROM json_each(NEW.privacy_labels_json) WHERE type <> 'text' OR value NOT IN ('local_only', 'external_ai_optional', 'sensitive', 'public_data_only'))
    OR EXISTS (SELECT 1 FROM json_each(NEW.data_categories_json) WHERE type <> 'text' OR value NOT IN ('public_job_posting', 'resume_evidence', 'application_history', 'career_goals', 'pay_preferences', 'location_preferences', 'military_service', 'clearance_claim', 'protected_veteran_answer'))
    OR EXISTS (SELECT 1 FROM json_each(NEW.task_kinds_json) WHERE type <> 'text' OR value NOT IN ('source_check', 'evidence_review', 'draft_packet', 'backup', 'export', 'pack_install'))
    OR EXISTS (SELECT 1 FROM json_each(NEW.actions_json) WHERE type <> 'text' OR value NOT IN ('read_selected_case_file', 'read_selected_resume_evidence', 'read_public_job_posting', 'create_draft_local_note', 'create_draft_application_packet', 'create_reminder', 'open_browser_link', 'request_source_check', 'request_external_ai', 'write_local_event'))
    OR EXISTS (SELECT 1 FROM json_each(NEW.approval_gates_json) WHERE type <> 'text' OR value <> 'per_execution_review')
    OR EXISTS (SELECT 1 FROM json_each(NEW.privacy_labels_json) AS current JOIN json_each(NEW.privacy_labels_json) AS previous ON CAST(previous.key AS INTEGER) < CAST(current.key AS INTEGER) WHERE previous.value = current.value)
    OR EXISTS (SELECT 1 FROM json_each(NEW.data_categories_json) AS current JOIN json_each(NEW.data_categories_json) AS previous ON CAST(previous.key AS INTEGER) < CAST(current.key AS INTEGER) WHERE previous.value = current.value)
    OR EXISTS (SELECT 1 FROM json_each(NEW.task_kinds_json) AS current JOIN json_each(NEW.task_kinds_json) AS previous ON CAST(previous.key AS INTEGER) < CAST(current.key AS INTEGER) WHERE previous.value = current.value)
    OR EXISTS (SELECT 1 FROM json_each(NEW.actions_json) AS current JOIN json_each(NEW.actions_json) AS previous ON CAST(previous.key AS INTEGER) < CAST(current.key AS INTEGER) WHERE previous.value = current.value)
    OR EXISTS (SELECT 1 FROM json_each(NEW.approval_gates_json) AS current JOIN json_each(NEW.approval_gates_json) AS previous ON CAST(previous.key AS INTEGER) < CAST(current.key AS INTEGER) WHERE previous.value = current.value)
    OR EXISTS (SELECT 1 FROM json_each(NEW.external_destinations_json) WHERE type <> 'text' OR length(CAST(value AS BLOB)) NOT BETWEEN 1 AND 128)
    OR (EXISTS (SELECT 1 FROM json_each(NEW.actions_json) WHERE value = 'request_external_ai')
        AND (NEW.gateway_policy_id IS NOT 'jobsentinel.external-ai-gateway.v1' OR NEW.external_destinations_json <> '["jobsentinel.external-ai-gateway.v1"]'))
    OR (NOT EXISTS (SELECT 1 FROM json_each(NEW.actions_json) WHERE value = 'request_external_ai')
        AND (NEW.gateway_policy_id IS NOT NULL OR NEW.external_destinations_json <> '[]'))
BEGIN
    SELECT RAISE(ABORT, 'pack release review is invalid');
END;
CREATE TRIGGER pack_release_reviews_immutable
BEFORE UPDATE ON pack_release_reviews
BEGIN
    SELECT RAISE(ABORT, 'pack release review is immutable');
END;
CREATE TRIGGER pack_release_reviews_no_delete
BEFORE DELETE ON pack_release_reviews
BEGIN
    SELECT RAISE(ABORT, 'pack release review is immutable');
END;
CREATE TRIGGER pack_stream_actionable_requires_review
BEFORE UPDATE OF availability, active_release_sequence ON v3_pack_streams
WHEN NEW.availability IN ('ready', 'disabled')
    AND NOT EXISTS (
        SELECT 1 FROM pack_release_reviews
        WHERE publisher_key_id = NEW.publisher_key_id
          AND pack_id = NEW.pack_id
          AND release_sequence = NEW.active_release_sequence
    )
BEGIN
    SELECT RAISE(ABORT, 'pack release review is unavailable');
END;
CREATE TRIGGER pack_release_cleanup_truth
BEFORE UPDATE OF lifecycle_state, artifact_cleanup_pending ON v3_pack_releases
WHEN (OLD.lifecycle_state <> 'removed' AND NEW.lifecycle_state = 'removed' AND NEW.artifact_cleanup_pending <> 1)
    OR (NEW.artifact_cleanup_pending <> OLD.artifact_cleanup_pending
        AND NOT (OLD.artifact_cleanup_pending = 0 AND NEW.artifact_cleanup_pending = 1 AND OLD.lifecycle_state <> 'removed' AND NEW.lifecycle_state = 'removed')
        AND NOT (OLD.artifact_cleanup_pending = 1 AND NEW.artifact_cleanup_pending = 0 AND OLD.lifecycle_state = 'removed' AND NEW.lifecycle_state = 'removed'))
    OR (NEW.artifact_cleanup_pending = 1 AND NEW.lifecycle_state <> 'removed')
BEGIN
    SELECT RAISE(ABORT, 'pack release cleanup transition is invalid');
END;
CREATE TRIGGER pack_task_runs_canonical_context
BEFORE INSERT ON pack_task_runs
WHEN NEW.status <> 'pending'
    OR EXISTS (
        SELECT 1 FROM json_each(NEW.privacy_labels_json)
        WHERE type <> 'text' OR value NOT IN (
            'local_only', 'external_ai_optional', 'sensitive', 'public_data_only'
        )
    )
    OR EXISTS (
        SELECT 1 FROM json_each(NEW.data_categories_json)
        WHERE type <> 'text' OR value NOT IN (
            'public_job_posting', 'resume_evidence', 'application_history',
            'career_goals', 'pay_preferences', 'location_preferences',
            'military_service', 'clearance_claim', 'protected_veteran_answer'
        )
    )
    OR EXISTS (
        SELECT 1 FROM json_each(NEW.privacy_labels_json) AS current
        JOIN json_each(NEW.privacy_labels_json) AS previous
          ON CAST(previous.key AS INTEGER) < CAST(current.key AS INTEGER)
        WHERE previous.value >= current.value
    )
    OR EXISTS (
        SELECT 1 FROM json_each(NEW.data_categories_json) AS current
        JOIN json_each(NEW.data_categories_json) AS previous
          ON CAST(previous.key AS INTEGER) < CAST(current.key AS INTEGER)
        WHERE previous.value >= current.value
    )
    OR json_array_length(NEW.privacy_labels_json) = 0
    OR json_array_length(NEW.data_categories_json) = 0
BEGIN
    SELECT RAISE(ABORT, 'pack task context is invalid');
END;
CREATE TRIGGER pack_task_runs_context_immutable
BEFORE UPDATE ON pack_task_runs
WHEN NEW.run_id <> OLD.run_id OR NEW.approval_reference <> OLD.approval_reference
    OR NEW.publisher_key_id <> OLD.publisher_key_id OR NEW.pack_id <> OLD.pack_id
    OR NEW.release_sequence <> OLD.release_sequence OR NEW.signed_release_sha256 <> OLD.signed_release_sha256
    OR NEW.stream_generation <> OLD.stream_generation OR NEW.task_kind <> OLD.task_kind
    OR NEW.task_id <> OLD.task_id OR NEW.input_sha256 <> OLD.input_sha256
    OR NEW.privacy_labels_json <> OLD.privacy_labels_json OR NEW.data_categories_json <> OLD.data_categories_json
    OR NEW.created_at <> OLD.created_at OR NEW.expires_at <> OLD.expires_at
BEGIN
    SELECT RAISE(ABORT, 'pack task context is immutable');
END;
CREATE TRIGGER pack_task_runs_valid_transition
BEFORE UPDATE OF status, receipt_id, started_at, completed_at ON pack_task_runs
WHEN NOT (
    (OLD.status = 'pending' AND NEW.status = 'started'
        AND NEW.receipt_id IS NULL AND NEW.started_at IS NOT NULL AND NEW.completed_at IS NULL)
    OR (OLD.status = 'pending' AND NEW.status = 'cancelled'
        AND NEW.receipt_id IS NULL AND NEW.completed_at IS NOT NULL)
    OR (OLD.status = 'started' AND NEW.status = 'succeeded'
        AND NEW.receipt_id IS NOT NULL AND NEW.completed_at IS NOT NULL)
    OR (OLD.status = 'started' AND NEW.status = 'failed'
        AND NEW.receipt_id IS NULL AND NEW.completed_at IS NOT NULL)
)
BEGIN
    SELECT RAISE(ABORT, 'pack task transition is invalid');
END;
CREATE TRIGGER pack_task_runs_start_requires_exact_ready_pack
BEFORE UPDATE OF status ON pack_task_runs
WHEN OLD.status = 'pending' AND NEW.status = 'started'
AND NOT EXISTS (
    SELECT 1
    FROM v3_pack_streams AS stream
    JOIN v3_pack_releases AS release
      ON release.publisher_key_id = stream.publisher_key_id
     AND release.pack_id = stream.pack_id
     AND release.release_sequence = stream.active_release_sequence
    JOIN v3_pack_publishers AS publisher
      ON publisher.publisher_key_id = stream.publisher_key_id
    WHERE stream.publisher_key_id = NEW.publisher_key_id
      AND stream.pack_id = NEW.pack_id
      AND stream.generation = NEW.stream_generation
      AND stream.availability = 'ready'
      AND stream.active_release_sequence = NEW.release_sequence
      AND release.signed_release_sha256 = NEW.signed_release_sha256
      AND release.lifecycle_state = 'ready'
      AND release.self_tested_at IS NOT NULL
      AND publisher.trust_state = 'trusted'
      AND datetime('now') < datetime(NEW.expires_at)
)
BEGIN
    SELECT RAISE(ABORT, 'pack task pack state is no longer ready');
END;
CREATE TRIGGER pack_task_runs_complete_requires_exact_ready_pack
BEFORE UPDATE OF status ON pack_task_runs
WHEN OLD.status = 'started' AND NEW.status = 'succeeded'
AND NOT EXISTS (
    SELECT 1
    FROM v3_pack_streams AS stream
    JOIN v3_pack_releases AS release
      ON release.publisher_key_id = stream.publisher_key_id
     AND release.pack_id = stream.pack_id
     AND release.release_sequence = stream.active_release_sequence
    JOIN v3_pack_publishers AS publisher
      ON publisher.publisher_key_id = stream.publisher_key_id
    WHERE stream.publisher_key_id = NEW.publisher_key_id
      AND stream.pack_id = NEW.pack_id
      AND stream.generation = NEW.stream_generation
      AND stream.availability = 'ready'
      AND stream.active_release_sequence = NEW.release_sequence
      AND release.signed_release_sha256 = NEW.signed_release_sha256
      AND release.lifecycle_state = 'ready'
      AND release.self_tested_at IS NOT NULL
      AND publisher.trust_state = 'trusted'
      AND datetime('now') < datetime(NEW.expires_at)
)
BEGIN
    SELECT RAISE(ABORT, 'pack task pack state is no longer ready');
END;
CREATE TRIGGER pack_task_runs_no_delete BEFORE DELETE ON pack_task_runs
BEGIN SELECT RAISE(ABORT, 'pack task history is append-only'); END;
CREATE TRIGGER pack_task_runs_create_requires_review
BEFORE INSERT ON pack_task_runs
WHEN NOT EXISTS (SELECT 1 FROM pack_release_reviews
    WHERE publisher_key_id = NEW.publisher_key_id AND pack_id = NEW.pack_id
      AND release_sequence = NEW.release_sequence)
BEGIN
    SELECT RAISE(ABORT, 'pack release review is unavailable');
END;
CREATE TRIGGER pack_task_runs_transition_requires_review
BEFORE UPDATE OF status ON pack_task_runs
WHEN NEW.status IN ('started', 'succeeded')
    AND NOT EXISTS (
        SELECT 1 FROM pack_release_reviews
        WHERE publisher_key_id = NEW.publisher_key_id
          AND pack_id = NEW.pack_id
          AND release_sequence = NEW.release_sequence
    )
BEGIN
    SELECT RAISE(ABORT, 'pack release review is unavailable');
END;
UPDATE v3_compatibility_metadata
SET migration_version = 27
WHERE singleton = 1;
