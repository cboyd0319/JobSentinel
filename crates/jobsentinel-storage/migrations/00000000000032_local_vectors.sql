-- Renames the derived-vector table without rebuilding rows or changing their storage contract.
ALTER TABLE v3_local_vectors RENAME TO local_vectors;
UPDATE v3_compatibility_metadata SET migration_version = 32 WHERE singleton = 1;
