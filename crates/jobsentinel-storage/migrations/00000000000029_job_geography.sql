-- Retains bounded source-observed job geography without inferring locations.

ALTER TABLE jobs ADD COLUMN geography TEXT
    CHECK (
        geography IS NULL OR (
            typeof(geography) = 'text'
            AND length(CAST(geography AS BLOB)) <= 65536
            AND json_valid(geography)
            AND json_type(geography) = 'object'
            AND json(geography) = geography
        )
    );

UPDATE v3_compatibility_metadata
SET migration_version = 29
WHERE singleton = 1;
