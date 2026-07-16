//! Database type definitions
//!
//! Contains all struct definitions for database models.

use chrono::{DateTime, Utc};
use jobsentinel_domain::Job;
use serde::{Deserialize, Serialize};

#[derive(sqlx::FromRow)]
pub(super) struct JobRow {
    id: i64,
    hash: String,
    title: String,
    company: String,
    url: String,
    location: Option<String>,
    description: Option<String>,
    score: Option<f64>,
    score_reasons: Option<String>,
    source: String,
    remote: Option<bool>,
    salary_min: Option<i64>,
    salary_max: Option<i64>,
    currency: Option<String>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
    last_seen: DateTime<Utc>,
    times_seen: i64,
    immediate_alert_sent: bool,
    included_in_digest: bool,
    hidden: bool,
    bookmarked: bool,
    notes: Option<String>,
    ghost_score: Option<f64>,
    ghost_reasons: Option<String>,
    first_seen: Option<DateTime<Utc>>,
    repost_count: i64,
}

impl From<JobRow> for Job {
    fn from(row: JobRow) -> Self {
        Self {
            id: row.id,
            hash: row.hash,
            title: row.title,
            company: row.company,
            url: row.url,
            location: row.location,
            description: row.description,
            score: row.score,
            score_reasons: row.score_reasons,
            source: row.source,
            remote: row.remote,
            salary_min: row.salary_min,
            salary_max: row.salary_max,
            currency: row.currency,
            created_at: row.created_at,
            updated_at: row.updated_at,
            last_seen: row.last_seen,
            times_seen: row.times_seen,
            immediate_alert_sent: row.immediate_alert_sent,
            included_in_digest: row.included_in_digest,
            hidden: row.hidden,
            bookmarked: row.bookmarked,
            notes: row.notes,
            ghost_score: row.ghost_score,
            ghost_reasons: row.ghost_reasons,
            first_seen: row.first_seen,
            repost_count: row.repost_count,
        }
    }
}

/// Database statistics
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Statistics {
    pub total_jobs: i64,
    pub high_matches: i64,
    pub average_score: f64,
    pub jobs_today: i64,
}

/// Ghost detection statistics
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct GhostStatistics {
    /// Total jobs with ghost analysis
    pub total_analyzed: i64,
    /// Jobs with ghost score >= 0.5 (likely ghost)
    pub likely_ghosts: i64,
    /// Jobs with ghost score 0.3-0.5 (warning)
    pub warnings: i64,
    /// Average ghost score across all analyzed jobs
    pub avg_ghost_score: f64,
    /// Total repost count across all tracked reposts
    pub total_reposts: i64,
}

/// A group of duplicate jobs (same title + company from different sources)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DuplicateGroup {
    /// The ID of the primary job (highest score)
    pub primary_id: i64,
    /// All jobs in this duplicate group
    pub jobs: Vec<Job>,
    /// Sources where this job appears
    pub sources: Vec<String>,
}
