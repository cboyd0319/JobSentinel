//! Owner-neutral job record shared by storage, scoring, and source adapters.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Canonical job record used across core business logic.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Job {
    pub id: i64,
    /// SHA-256 hash for deduplication (company + title + location + URL).
    pub hash: String,
    pub title: String,
    pub company: String,
    pub url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub location: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    /// Match score from 0.0 to 1.0.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub score: Option<f64>,
    /// JSON object with score breakdown.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub score_reasons: Option<String>,
    /// Source adapter that found this job.
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
    /// Number of times this job has been seen.
    pub times_seen: i64,
    /// Whether an immediate alert was sent for this job.
    pub immediate_alert_sent: bool,
    /// Whether this job was included in a digest email.
    pub included_in_digest: bool,
    /// Whether the user has hidden this job.
    #[serde(default)]
    pub hidden: bool,
    /// Whether the user has bookmarked this job.
    #[serde(default)]
    pub bookmarked: bool,
    /// The user's personal notes for this job.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
    /// Posting-risk score from 0.0 to 1.0.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ghost_score: Option<f64>,
    /// JSON array of posting-risk reasons.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ghost_reasons: Option<String>,
    /// First time this job was discovered.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub first_seen: Option<DateTime<Utc>>,
    /// Number of times this job has been reposted.
    #[serde(default)]
    pub repost_count: i64,
}
