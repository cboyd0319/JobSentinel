-- Rejects NULL-valued event validation and preserves valid historical events transactionally.
ALTER TABLE v3_job_events RENAME TO v3_job_events_before_required_metadata;

CREATE TABLE v3_job_events (
    event_id TEXT PRIMARY KEY NOT NULL
        CHECK(
            length(CAST(event_id AS BLOB)) BETWEEN 1 AND 128
            AND event_id NOT GLOB '*[^-A-Za-z0-9._:]*'
        ),
    case_file_id TEXT NOT NULL
        REFERENCES opportunity_case_files(case_file_id) ON DELETE CASCADE,
    event_kind TEXT NOT NULL CHECK(event_kind IN (
        'case_created',
        'status_changed',
        'evidence_linked',
        'source_checked',
        'privacy_receipt_recorded',
        'source_policy_changed',
        'recovery_recorded'
    )),
    origin TEXT NOT NULL CHECK(origin IN ('user', 'system', 'source', 'migration')),
    user_action INTEGER NOT NULL CHECK(user_action IN (0, 1)),
    local_only INTEGER NOT NULL CHECK(local_only = 1),
    sensitive INTEGER NOT NULL CHECK(sensitive = 1),
    metadata_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    CHECK((origin = 'user') = (user_action = 1)),
    CHECK(json_valid(metadata_json)),
    CHECK(json_type(metadata_json) = 'object'),
    CHECK(length(CAST(metadata_json AS BLOB)) <= 2048),
    CHECK(COALESCE(
        (event_kind = 'case_created'
            AND json_extract(metadata_json, '$.kind') = 'empty')
        OR (event_kind = 'status_changed'
            AND json_extract(metadata_json, '$.kind') = 'status_transition')
        OR (event_kind IN (
                'evidence_linked',
                'privacy_receipt_recorded',
                'source_policy_changed'
            )
            AND json_extract(metadata_json, '$.kind') = 'local_reference')
        OR (event_kind = 'source_checked'
            AND json_extract(metadata_json, '$.kind') = 'source_outcome')
        OR (event_kind = 'recovery_recorded'
            AND json_extract(metadata_json, '$.kind') = 'recovery_outcome')
    , 0)),
    CHECK(COALESCE(
        CASE json_extract(metadata_json, '$.kind')
            WHEN 'empty' THEN
                json_remove(metadata_json, '$.kind') = '{}'
            WHEN 'status_transition' THEN
                json_extract(metadata_json, '$.to') IN (
                    'saved', 'reviewing', 'preparing', 'applied',
                    'interviewing', 'offer', 'closed'
                )
                AND (
                    json_type(metadata_json, '$.from') = 'null'
                    OR json_extract(metadata_json, '$.from') IN (
                        'saved', 'reviewing', 'preparing', 'applied',
                        'interviewing', 'offer', 'closed'
                    )
                )
                AND json_remove(metadata_json, '$.kind', '$.from', '$.to') = '{}'
            WHEN 'local_reference' THEN
                json_type(metadata_json, '$.reference_id') = 'text'
                AND length(CAST(json_extract(
                    metadata_json, '$.reference_id'
                ) AS BLOB)) BETWEEN 1 AND 128
                AND json_extract(metadata_json, '$.reference_id')
                    NOT GLOB '*[^-A-Za-z0-9._:]*'
                AND json_remove(
                    metadata_json, '$.kind', '$.reference_id'
                ) = '{}'
            WHEN 'source_outcome' THEN
                json_type(metadata_json, '$.source_id') = 'text'
                AND length(CAST(json_extract(
                    metadata_json, '$.source_id'
                ) AS BLOB)) BETWEEN 1 AND 128
                AND json_extract(metadata_json, '$.source_id')
                    NOT GLOB '*[^-A-Za-z0-9._:]*'
                AND json_extract(metadata_json, '$.outcome') IN (
                    'success', 'failure', 'timeout', 'cancelled'
                )
                AND json_type(metadata_json, '$.item_count') = 'integer'
                AND json_extract(metadata_json, '$.item_count') BETWEEN 0 AND 10000
                AND json_type(
                    metadata_json, '$.connectivity_required'
                ) IN ('true', 'false')
                AND json_remove(
                    metadata_json,
                    '$.kind',
                    '$.source_id',
                    '$.outcome',
                    '$.item_count',
                    '$.connectivity_required'
                ) = '{}'
            WHEN 'recovery_outcome' THEN
                json_extract(metadata_json, '$.outcome') IN (
                    'retried', 'restored', 'failed'
                )
                AND json_remove(metadata_json, '$.kind', '$.outcome') = '{}'
            ELSE 0
        END, 0
    ))
);

INSERT INTO v3_job_events
    (event_id, case_file_id, event_kind, origin, user_action, local_only, sensitive, metadata_json, created_at)
SELECT event_id, case_file_id, event_kind, origin, user_action, local_only, sensitive, metadata_json, created_at
FROM v3_job_events_before_required_metadata;
DROP TABLE v3_job_events_before_required_metadata;
CREATE INDEX idx_v3_job_events_case_time ON v3_job_events(case_file_id, created_at, event_id);

UPDATE v3_compatibility_metadata SET migration_version = 30 WHERE singleton = 1;
