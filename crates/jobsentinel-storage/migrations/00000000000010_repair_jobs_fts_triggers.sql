-- External-content FTS5 tables require delete commands with the old indexed
-- values before updates or deletes. Direct DML can corrupt the virtual index.
DROP TRIGGER IF EXISTS jobs_ai;
DROP TRIGGER IF EXISTS jobs_au;
DROP TRIGGER IF EXISTS jobs_ad;

INSERT INTO jobs_fts(jobs_fts) VALUES ('rebuild');

CREATE TRIGGER jobs_ai AFTER INSERT ON jobs BEGIN
    INSERT INTO jobs_fts(rowid, title, description)
    VALUES (new.id, new.title, new.description);
END;

CREATE TRIGGER jobs_au AFTER UPDATE ON jobs BEGIN
    INSERT INTO jobs_fts(jobs_fts, rowid, title, description)
    VALUES ('delete', old.id, old.title, old.description);
    INSERT INTO jobs_fts(rowid, title, description)
    VALUES (new.id, new.title, new.description);
END;

CREATE TRIGGER jobs_ad AFTER DELETE ON jobs BEGIN
    INSERT INTO jobs_fts(jobs_fts, rowid, title, description)
    VALUES ('delete', old.id, old.title, old.description);
END;
