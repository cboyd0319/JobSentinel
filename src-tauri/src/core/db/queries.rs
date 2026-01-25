//! Database query operations
//!
//! Search, filter, and retrieve jobs with various criteria.

use super::connection::Database;
use super::types::{DuplicateGroup, Job};
use sqlx;

impl Database {
    /// Get recent jobs
    #[tracing::instrument(skip(self))]
    pub async fn get_recent_jobs(&self, limit: i64) -> Result<Vec<Job>, sqlx::Error> {
        tracing::debug!("Fetching {} recent jobs from database", limit);
        // OPTIMIZATION: Use composite index idx_jobs_hidden_score_created (covering index)
        // Index contains: hidden, score DESC, created_at DESC - perfect for this query
        let jobs = sqlx::query_as::<_, Job>(
            "SELECT * FROM jobs WHERE hidden = 0 ORDER BY score DESC, created_at DESC LIMIT ?",
        )
        .bind(limit)
        .fetch_all(self.pool())
        .await?;

        tracing::info!("Retrieved {} jobs", jobs.len());
        Ok(jobs)
    }

    /// Get jobs by minimum score
    pub async fn get_jobs_by_score(
        &self,
        min_score: f64,
        limit: i64,
    ) -> Result<Vec<Job>, sqlx::Error> {
        let jobs = sqlx::query_as::<_, Job>(
            "SELECT * FROM jobs WHERE score >= ? AND hidden = 0 ORDER BY score DESC, created_at DESC LIMIT ?",
        )
        .bind(min_score)
        .bind(limit)
        .fetch_all(self.pool())
        .await?;

        Ok(jobs)
    }

    /// Get jobs by source
    pub async fn get_jobs_by_source(
        &self,
        source: &str,
        limit: i64,
    ) -> Result<Vec<Job>, sqlx::Error> {
        // OPTIMIZATION: Use composite index idx_jobs_hidden_source_created
        // Reordered WHERE clause to match index (hidden first, then source)
        let jobs = sqlx::query_as::<_, Job>(
            "SELECT * FROM jobs WHERE hidden = 0 AND source = ? ORDER BY created_at DESC LIMIT ?",
        )
        .bind(source)
        .bind(limit)
        .fetch_all(self.pool())
        .await?;

        Ok(jobs)
    }

    /// Get bookmarked jobs
    pub async fn get_bookmarked_jobs(&self, limit: i64) -> Result<Vec<Job>, sqlx::Error> {
        // OPTIMIZATION: Use composite index idx_jobs_bookmarked_score_created
        // This is a covering index with WHERE clause filter
        let jobs = sqlx::query_as::<_, Job>(
            "SELECT * FROM jobs WHERE bookmarked = 1 AND hidden = 0 ORDER BY score DESC, created_at DESC LIMIT ?",
        )
        .bind(limit)
        .fetch_all(self.pool())
        .await?;

        Ok(jobs)
    }

    /// Get jobs with notes
    pub async fn get_jobs_with_notes(&self, limit: i64) -> Result<Vec<Job>, sqlx::Error> {
        let jobs = sqlx::query_as::<_, Job>(
            "SELECT * FROM jobs WHERE notes IS NOT NULL AND hidden = 0 ORDER BY updated_at DESC LIMIT ?",
        )
        .bind(limit)
        .fetch_all(self.pool())
        .await?;

        Ok(jobs)
    }

    /// Full-text search on title and description
    #[tracing::instrument(skip(self))]
    pub async fn search_jobs(&self, query: &str, limit: i64) -> Result<Vec<Job>, sqlx::Error> {
        tracing::debug!("Performing full-text search with query: '{}'", query);
        // Use FTS5 virtual table for fast full-text search
        let job_ids: Vec<i64> =
            sqlx::query_scalar("SELECT rowid FROM jobs_fts WHERE jobs_fts MATCH ? LIMIT ?")
                .bind(query)
                .bind(limit)
                .fetch_all(self.pool())
                .await?;

        if job_ids.is_empty() {
            tracing::info!("No jobs found matching query: '{}'", query);
            return Ok(Vec::new());
        }

        // Limit number of IDs to prevent query performance issues
        const MAX_IDS: usize = 1000;
        if job_ids.len() > MAX_IDS {
            return Err(sqlx::Error::Protocol(format!(
                "Too many job IDs requested: {} (max: {})",
                job_ids.len(),
                MAX_IDS
            )));
        }

        // Fetch full job records
        // SAFETY: This is NOT vulnerable to SQL injection. The format! only creates
        // placeholders ("?"), and actual values are bound using SQLx's parameterization.
        // This is the recommended pattern for dynamic IN clauses with SQLx.
        // Pre-allocate string capacity to avoid reallocations
        let mut placeholders = String::with_capacity(job_ids.len() * 2);
        for i in 0..job_ids.len() {
            if i > 0 {
                placeholders.push(',');
            }
            placeholders.push('?');
        }
        let sql = format!("SELECT * FROM jobs WHERE id IN ({})", placeholders);

        let mut query_builder = sqlx::query_as::<_, Job>(&sql);
        for id in job_ids {
            query_builder = query_builder.bind(id);
        }

        let jobs = query_builder.fetch_all(self.pool()).await?;
        Ok(jobs)
    }

    /// Find potential duplicate jobs (same title + company, different sources)
    /// Returns groups of jobs that are likely duplicates
    ///
    /// OPTIMIZATION: Uses window functions to avoid N+1 query pattern.
    /// Instead of fetching duplicate keys then querying each group separately,
    /// we use a single query with ROW_NUMBER() to identify and group duplicates.
    pub async fn find_duplicate_groups(&self) -> Result<Vec<DuplicateGroup>, sqlx::Error> {
        // Single query using window functions to avoid N+1 pattern
        let jobs: Vec<Job> = sqlx::query_as(
            r#"
            WITH duplicate_candidates AS (
                SELECT *,
                       LOWER(title) as norm_title,
                       LOWER(company) as norm_company,
                       COUNT(*) OVER (PARTITION BY LOWER(title), LOWER(company)) as dup_count,
                       ROW_NUMBER() OVER (PARTITION BY LOWER(title), LOWER(company) ORDER BY score DESC, created_at ASC) as row_num
                FROM jobs
                WHERE hidden = 0
            )
            SELECT id, hash, title, company, url, location, description, score, score_reasons,
                   source, remote, salary_min, salary_max, currency, created_at, updated_at,
                   last_seen, times_seen, immediate_alert_sent, included_in_digest, hidden,
                   bookmarked, notes, ghost_score, ghost_reasons, first_seen, repost_count
            FROM duplicate_candidates
            WHERE dup_count > 1
            ORDER BY norm_company, norm_title, score DESC, created_at ASC
            "#,
        )
        .fetch_all(self.pool())
        .await?;

        // Group jobs by normalized title+company in Rust (already sorted by query)
        let mut groups = Vec::new();
        let mut current_group: Vec<Job> = Vec::new();
        let mut current_key: Option<(String, String)> = None;

        for job in jobs {
            let key = (job.title.to_lowercase(), job.company.to_lowercase());

            if current_key.as_ref() != Some(&key) {
                // Start new group
                if !current_group.is_empty() {
                    let primary_id = current_group[0].id;
                    // Pre-allocate sources vec
                    let mut sources = Vec::with_capacity(current_group.len());
                    sources.extend(current_group.iter().map(|j| j.source.clone()));
                    groups.push(DuplicateGroup {
                        primary_id,
                        jobs: current_group,
                        sources,
                    });
                }
                current_group = vec![job];
                current_key = Some(key);
            } else {
                current_group.push(job);
            }
        }

        // Push final group
        if !current_group.is_empty() {
            let primary_id = current_group[0].id;
            // Pre-allocate sources vec
            let mut sources = Vec::with_capacity(current_group.len());
            sources.extend(current_group.iter().map(|j| j.source.clone()));
            groups.push(DuplicateGroup {
                primary_id,
                jobs: current_group,
                sources,
            });
        }

        Ok(groups)
    }

    /// Get recent jobs with optional ghost score filtering
    pub async fn get_recent_jobs_filtered(
        &self,
        limit: i64,
        max_ghost_score: Option<f64>,
    ) -> Result<Vec<Job>, sqlx::Error> {
        let jobs = if let Some(max_score) = max_ghost_score {
            sqlx::query_as::<_, Job>(
                "SELECT * FROM jobs WHERE hidden = 0 AND (ghost_score IS NULL OR ghost_score < ?) ORDER BY score DESC, created_at DESC LIMIT ?",
            )
            .bind(max_score)
            .bind(limit)
            .fetch_all(self.pool())
            .await?
        } else {
            sqlx::query_as::<_, Job>(
                "SELECT * FROM jobs WHERE hidden = 0 ORDER BY score DESC, created_at DESC LIMIT ?",
            )
            .bind(limit)
            .fetch_all(self.pool())
            .await?
        };

        Ok(jobs)
    }

    /// Get jobs with high ghost scores
    pub async fn get_ghost_jobs(
        &self,
        min_ghost_score: f64,
        limit: i64,
    ) -> Result<Vec<Job>, sqlx::Error> {
        // OPTIMIZATION: Use composite index idx_jobs_ghost_score_desc
        // Reordered: Check ghost_score first (indexed), then hidden
        let jobs = sqlx::query_as::<_, Job>(
            "SELECT * FROM jobs WHERE ghost_score >= ? AND hidden = 0 ORDER BY ghost_score DESC LIMIT ?",
        )
        .bind(min_ghost_score)
        .bind(limit)
        .fetch_all(self.pool())
        .await?;

        Ok(jobs)
    }

    // ==================== Analytics Queries ====================

    /// Get job counts grouped by source (for analytics dashboard)
    pub async fn get_job_counts_by_source(&self) -> Result<Vec<(String, i64)>, sqlx::Error> {
        // OPTIMIZATION: COUNT(*) with GROUP BY is optimized by SQLite
        // Uses idx_jobs_source for grouping, idx_jobs_hidden for filtering
        let rows: Vec<(String, i64)> = sqlx::query_as(
            "SELECT source, COUNT(*) as count FROM jobs WHERE hidden = 0 GROUP BY source ORDER BY count DESC",
        )
        .fetch_all(self.pool())
        .await?;

        Ok(rows)
    }

    /// Get salary distribution (jobs grouped by salary ranges)
    pub async fn get_salary_distribution(&self) -> Result<Vec<(String, i64)>, sqlx::Error> {
        let rows: Vec<(String, i64)> = sqlx::query_as(
            r#"
            SELECT
                CASE
                    WHEN salary_min IS NULL AND salary_max IS NULL THEN 'Not Listed'
                    WHEN COALESCE(salary_min, salary_max) < 50000 THEN '<$50k'
                    WHEN COALESCE(salary_min, salary_max) < 75000 THEN '$50k-75k'
                    WHEN COALESCE(salary_min, salary_max) < 100000 THEN '$75k-100k'
                    WHEN COALESCE(salary_min, salary_max) < 125000 THEN '$100k-125k'
                    WHEN COALESCE(salary_min, salary_max) < 150000 THEN '$125k-150k'
                    WHEN COALESCE(salary_min, salary_max) < 175000 THEN '$150k-175k'
                    WHEN COALESCE(salary_min, salary_max) < 200000 THEN '$175k-200k'
                    ELSE '$200k+'
                END as range,
                COUNT(*) as count
            FROM jobs
            WHERE hidden = 0
            GROUP BY range
            ORDER BY
                CASE range
                    WHEN 'Not Listed' THEN 99
                    WHEN '<$50k' THEN 1
                    WHEN '$50k-75k' THEN 2
                    WHEN '$75k-100k' THEN 3
                    WHEN '$100k-125k' THEN 4
                    WHEN '$125k-150k' THEN 5
                    WHEN '$150k-175k' THEN 6
                    WHEN '$175k-200k' THEN 7
                    ELSE 8
                END
            "#,
        )
        .fetch_all(self.pool())
        .await?;

        Ok(rows)
    }
}
