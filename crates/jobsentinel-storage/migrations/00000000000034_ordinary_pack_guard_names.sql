-- Renames remaining pack guards while preserving their predicates, errors and references.

DROP TRIGGER v3_pack_publishers_no_delete;
DROP TRIGGER v3_pack_publishers_identity_immutable;
DROP TRIGGER v3_pack_releases_insert_is_new_high_water;
DROP TRIGGER v3_pack_releases_advance_high_water;
DROP TRIGGER v3_pack_releases_immutable_fields;
DROP TRIGGER v3_pack_releases_state_transition;
DROP TRIGGER v3_pack_releases_referenced_state;
DROP TRIGGER v3_pack_releases_no_delete;
DROP TRIGGER v3_pack_streams_update_guard;
DROP TRIGGER v3_pack_streams_no_delete;

CREATE TRIGGER pack_publishers_no_delete BEFORE DELETE ON pack_publishers
BEGIN SELECT RAISE(ABORT, 'pack publisher history is immutable'); END;

CREATE TRIGGER pack_publishers_identity_immutable BEFORE UPDATE ON pack_publishers
WHEN NEW.publisher_key_id <> OLD.publisher_key_id
    OR NEW.public_key_sha256 <> OLD.public_key_sha256
    OR NEW.created_at <> OLD.created_at
    OR (OLD.trust_state = 'revoked' AND NEW.trust_state <> 'revoked')
    OR (
        NEW.trust_state = 'revoked'
        AND EXISTS (
            SELECT 1 FROM pack_streams
            WHERE publisher_key_id = OLD.publisher_key_id
              AND availability IN ('ready', 'disabled')
        )
    )
BEGIN SELECT RAISE(ABORT, 'pack publisher update is invalid'); END;

CREATE TRIGGER pack_releases_insert_is_new_high_water BEFORE INSERT ON pack_releases
WHEN NOT EXISTS (
    SELECT 1 FROM pack_streams
    WHERE publisher_key_id = NEW.publisher_key_id
      AND pack_id = NEW.pack_id
      AND NEW.release_sequence > high_water_sequence
)
BEGIN SELECT RAISE(ABORT, 'pack release is not newer'); END;

CREATE TRIGGER pack_releases_advance_high_water AFTER INSERT ON pack_releases
BEGIN
    UPDATE pack_streams
    SET high_water_sequence = NEW.release_sequence,
        high_water_signed_release_sha256 = NEW.signed_release_sha256,
        availability = CASE WHEN availability = 'removed' THEN 'quarantined' ELSE availability END,
        generation = generation + 1,
        updated_at = NEW.updated_at
    WHERE publisher_key_id = NEW.publisher_key_id AND pack_id = NEW.pack_id;
END;

CREATE TRIGGER pack_releases_immutable_fields BEFORE UPDATE ON pack_releases
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
BEGIN SELECT RAISE(ABORT, 'pack release identity is immutable'); END;

CREATE TRIGGER pack_releases_state_transition BEFORE UPDATE OF lifecycle_state ON pack_releases
WHEN OLD.lifecycle_state <> NEW.lifecycle_state
    AND NOT (
        (OLD.lifecycle_state = 'staged' AND NEW.lifecycle_state IN ('self_tested', 'quarantined', 'removed'))
        OR (OLD.lifecycle_state = 'self_tested' AND NEW.lifecycle_state IN ('ready', 'quarantined', 'removed'))
        OR (OLD.lifecycle_state = 'ready' AND NEW.lifecycle_state IN ('quarantined', 'removed'))
        OR (OLD.lifecycle_state = 'quarantined' AND NEW.lifecycle_state = 'removed')
    )
BEGIN SELECT RAISE(ABORT, 'pack release state transition is invalid'); END;

CREATE TRIGGER pack_releases_referenced_state BEFORE UPDATE OF lifecycle_state ON pack_releases
WHEN NEW.lifecycle_state <> 'ready'
    AND EXISTS (
        SELECT 1 FROM pack_streams
        WHERE publisher_key_id = OLD.publisher_key_id AND pack_id = OLD.pack_id
          AND (active_release_sequence = OLD.release_sequence OR rollback_release_sequence = OLD.release_sequence)
    )
BEGIN SELECT RAISE(ABORT, 'referenced pack release must remain ready'); END;

CREATE TRIGGER pack_releases_no_delete BEFORE DELETE ON pack_releases
BEGIN SELECT RAISE(ABORT, 'pack release history is immutable'); END;

CREATE TRIGGER pack_streams_update_guard BEFORE UPDATE ON pack_streams
WHEN NEW.publisher_key_id <> OLD.publisher_key_id
    OR NEW.pack_id <> OLD.pack_id
    OR NEW.created_at <> OLD.created_at
    OR NEW.high_water_sequence < OLD.high_water_sequence
    OR (NEW.high_water_sequence = OLD.high_water_sequence
        AND NEW.high_water_signed_release_sha256 IS NOT OLD.high_water_signed_release_sha256)
    OR NEW.generation <> OLD.generation + 1
    OR (NEW.high_water_sequence > OLD.high_water_sequence AND NOT EXISTS (
        SELECT 1 FROM pack_releases
        WHERE publisher_key_id = NEW.publisher_key_id AND pack_id = NEW.pack_id
          AND release_sequence = NEW.high_water_sequence
          AND signed_release_sha256 = NEW.high_water_signed_release_sha256
    ))
    OR (NEW.availability IN ('ready', 'disabled') AND NOT EXISTS (
        SELECT 1 FROM pack_publishers
        WHERE publisher_key_id = NEW.publisher_key_id AND trust_state = 'trusted'
    ))
    OR (NEW.availability IN ('ready', 'disabled') AND NOT EXISTS (
        SELECT 1 FROM pack_releases
        WHERE publisher_key_id = NEW.publisher_key_id AND pack_id = NEW.pack_id
          AND release_sequence = NEW.active_release_sequence AND lifecycle_state = 'ready'
    ))
    OR (NEW.rollback_release_sequence IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM pack_releases
        WHERE publisher_key_id = NEW.publisher_key_id AND pack_id = NEW.pack_id
          AND release_sequence = NEW.rollback_release_sequence AND lifecycle_state = 'ready'
    ))
BEGIN SELECT RAISE(ABORT, 'pack stream update is invalid'); END;

CREATE TRIGGER pack_streams_no_delete BEFORE DELETE ON pack_streams
BEGIN SELECT RAISE(ABORT, 'pack stream history is immutable'); END;

UPDATE compatibility_metadata SET migration_version = 34 WHERE singleton = 1;
