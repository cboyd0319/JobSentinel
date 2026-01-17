//! Database query operations
//!
//! Search, filter, and retrieve jobs with various criteria.

use super::connection::Database;
use super::types::{DuplicateGroup, Job};
use sqlx;

impl Database {
    /// Get recent jobs
    pub async fn get_recent_jobs(&self, limit: i64) -> Result<Vec<Job>, sqlx::Error> {
        let jobs = sqlx::query_as::<_, Job>(
            "SELECT * FROM jobs WHERE hidden = 0 ORDER BY score DESC, created_at DESC LIMIT ?",
        )
        .bind(limit)
        .fetch_all(self.pool())
        .await?;

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
        let jobs = sqlx::query_as::<_, Job>(
            "SELECT * FROM jobs WHERE source = ? AND hidden = 0 ORDER BY created_at DESC LIMIT ?",
        )
        .bind(source)
        .bind(limit)
        .fetch_all(self.pool())
        .await?;

        Ok(jobs)
    }

    /// Get bookmarked jobs
    pub async fn get_bookmarked_jobs(&self, limit: i64) -> Result<Vec<Job>, sqlx::Error> {
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
    pub async fn search_jobs(&self, query: &str, limit: i64) -> Result<Vec<Job>, sqlx::Error> {
        // Use FTS5 virtual table for fast full-text search
        let job_ids: Vec<i64> =
            sqlx::query_scalar("SELECT rowid FROM jobs_fts WHERE jobs_fts MATCH ? LIMIT ?")
                .bind(query)
                .bind(limit)
                .fetch_all(self.pool())
                .await?;

        if job_ids.is_empty() {
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
        let placeholders = job_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
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
    pub async fn find_duplicate_groups(&self) -> Result<Vec<DuplicateGroup>, sqlx::Error> {
        // First, find all title+company pairs that have multiple jobs
        let duplicate_keys: Vec<(String, String)> = sqlx::query_as(
            r#"
            SELECT LOWER(title) as norm_title, LOWER(company) as norm_company
            FROM jobs
            WHERE hidden = 0
            GROUP BY LOWER(title), LOWER(company)
            HAVING COUNT(*) > 1
            ORDER BY MAX(score) DESC
            "#,
        )
        .fetch_all(self.pool())
        .await?;

        let mut groups = Vec::new();

        for (norm_title, norm_company) in duplicate_keys {
            let jobs: Vec<Job> = sqlx::query_as(
                r#"
                SELECT id, hash, title, company, url, location, description, score, score_reasons,
                       source, remote, salary_min, salary_max, currency, created_at, updated_at,
                       last_seen, times_seen, immediate_alert_sent, included_in_digest, hidden,
                       bookmarked, notes, ghost_score, ghost_reasons, first_seen, repost_count
                FROM jobs
                WHERE LOWER(title) = ? AND LOWER(company) = ? AND hidden = 0
                ORDER BY score DESC, created_at ASC
                "#,
            )
            .bind(&norm_title)
            .bind(&norm_company)
            .fetch_all(self.pool())
            .await?;

            if jobs.len() > 1 {
                // The first job (highest score, oldest) is the "primary"
                let primary_id = jobs[0].id;
                let sources: Vec<String> = jobs.iter().map(|j| j.source.clone()).collect();

                groups.push(DuplicateGroup {
                    primary_id,
                    jobs,
                    sources,
                });
            }
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
        let jobs = sqlx::query_as::<_, Job>(
            "SELECT * FROM jobs WHERE ghost_score >= ? AND hidden = 0 ORDER BY ghost_score DESC LIMIT ?",
        )
        .bind(min_ghost_score)
        .bind(limit)
        .fetch_all(self.pool())
        .await?;

        Ok(jobs)
    }
}
