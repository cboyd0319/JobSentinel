-- Retains validated native listed-pay evidence without inventing a USD conversion.

ALTER TABLE jobs ADD COLUMN listed_pay TEXT
    CHECK (
        listed_pay IS NULL OR (
            typeof(listed_pay) = 'text'
            AND length(CAST(listed_pay AS BLOB)) <= 4096
            AND json_valid(listed_pay)
            AND json_type(listed_pay) = 'object'
            AND json(listed_pay) = listed_pay
        )
    );

UPDATE v3_compatibility_metadata
SET migration_version = 28
WHERE singleton = 1;
