-- Query Performance Optimization Migration
-- Removes redundant indexes and adds query hints for better performance

-- ============================================================================
-- REMOVE REDUNDANT INDEXES
-- ============================================================================

-- Remove redundant hash index (UNIQUE constraint already creates an index)
-- The UNIQUE constraint on hash column already provides a B-tree index
-- Having both is wasteful
DROP INDEX IF EXISTS idx_jobs_hash;

-- Remove old simple indexes that are superseded by composite indexes
-- The composite index idx_jobs_hidden_score_created covers:
--   - WHERE hidden = X
--   - WHERE hidden = X ORDER BY score
--   - WHERE hidden = X ORDER BY score, created_at
-- So we don't need separate idx_jobs_score anymore
DROP INDEX IF EXISTS idx_jobs_score;

-- Keep idx_jobs_created_at because it's used for queries that don't filter by hidden
-- (e.g., "show me ALL jobs created today" for admin/debug purposes)

-- ============================================================================
-- ADD QUERY OPTIMIZER HINTS (SQLite 3.38+)
-- ============================================================================

-- Analyze the database to update query planner statistics
-- This helps SQLite choose the best indexes for queries
ANALYZE;

-- Update SQLite's internal statistics for better query planning
-- This should be run periodically (daily or after bulk inserts)
PRAGMA optimize;

-- ============================================================================
-- VERIFICATION QUERIES (for testing)
-- ============================================================================

-- To verify indexes are being used, run these in sqlite3:
-- EXPLAIN QUERY PLAN SELECT * FROM jobs WHERE hidden = 0 ORDER BY score DESC LIMIT 10;
-- Expected: SEARCH jobs USING COVERING INDEX idx_jobs_hidden_score_created

-- EXPLAIN QUERY PLAN SELECT * FROM jobs WHERE hash = 'abc123';
-- Expected: SEARCH jobs USING INDEX sqlite_autoindex_jobs_1 (hash=?)

-- EXPLAIN QUERY PLAN SELECT * FROM jobs WHERE bookmarked = 1 AND hidden = 0;
-- Expected: SEARCH jobs USING COVERING INDEX idx_jobs_bookmarked_score_created
