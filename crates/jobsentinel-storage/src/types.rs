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
        let mut job = Self::newly_discovered(
            row.title,
            row.company,
            row.url,
            row.location,
            row.source,
            row.created_at,
        );
        job.id = row.id;
        job.hash = row.hash;
        job.description = row.description;
        job.score = row.score;
        job.score_reasons = row.score_reasons;
        job.remote = row.remote;
        job.salary_min = row.salary_min;
        job.salary_max = row.salary_max;
        job.currency = row.currency;
        job.updated_at = row.updated_at;
        job.last_seen = row.last_seen;
        job.times_seen = row.times_seen;
        job.immediate_alert_sent = row.immediate_alert_sent;
        job.included_in_digest = row.included_in_digest;
        job.hidden = row.hidden;
        job.bookmarked = row.bookmarked;
        job.notes = row.notes;
        job.ghost_score = row.ghost_score;
        job.ghost_reasons = row.ghost_reasons;
        job.first_seen = row.first_seen;
        job.repost_count = row.repost_count;
        job
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
