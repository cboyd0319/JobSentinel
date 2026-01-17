//! Database type definitions
//!
//! Contains all struct definitions for database models.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// Job model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Job {
    pub id: i64,

    /// SHA-256 hash for deduplication (company + title + location + url)
    pub hash: String,

    pub title: String,
    pub company: String,
    pub url: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub location: Option<String>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,

    /// Match score (0.0 - 1.0)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub score: Option<f64>,

    /// JSON object with score breakdown
    #[serde(skip_serializing_if = "Option::is_none")]
    pub score_reasons: Option<String>,

    /// Source scraper (e.g., "greenhouse", "lever", "jobswithgpt")
    pub source: String,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub remote: Option<bool>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub salary_min: Option<i64>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub salary_max: Option<i64>,

    #[serde(skip_serializing_if = "Option::is_none")]
    pub currency: Option<String>,

    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub last_seen: DateTime<Utc>,

    /// Number of times this job has been seen (for tracking repostings)
    pub times_seen: i64,

    /// Whether an immediate alert was sent for this job
    pub immediate_alert_sent: bool,

    /// Whether this job was included in a digest email
    pub included_in_digest: bool,

    /// Whether user has hidden/dismissed this job
    #[serde(default)]
    pub hidden: bool,

    /// Whether user has bookmarked/favorited this job
    #[serde(default)]
    pub bookmarked: bool,

    /// User's personal notes on this job
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,

    // Ghost job detection fields (v1.4+)
    /// Ghost score (0.0 = likely real, 1.0 = likely ghost job)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ghost_score: Option<f64>,

    /// JSON array of ghost detection reasons
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ghost_reasons: Option<String>,

    /// First time this job was discovered (for tracking staleness)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub first_seen: Option<DateTime<Utc>>,

    /// Number of times this job has been reposted
    #[serde(default)]
    pub repost_count: i64,
}

/// Database statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Statistics {
    pub total_jobs: i64,
    pub high_matches: i64,
    pub average_score: f64,
    pub jobs_today: i64,
}

/// Ghost detection statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
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
