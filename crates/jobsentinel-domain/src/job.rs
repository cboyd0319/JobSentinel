//! Owner-neutral job record shared by storage, scoring, and source adapters.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::calculate_job_hash;

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

impl Job {
    /// Create a job at the point it is first discovered by a source adapter.
    pub fn newly_discovered(
        title: impl Into<String>,
        company: impl Into<String>,
        url: impl Into<String>,
        location: Option<String>,
        source: impl Into<String>,
        discovered_at: DateTime<Utc>,
    ) -> Self {
        let title = title.into();
        let company = company.into();
        let url = url.into();
        let hash = calculate_job_hash(&company, &title, location.as_deref(), &url);

        Self {
            id: 0,
            hash,
            title,
            company,
            url,
            location,
            description: None,
            score: None,
            score_reasons: None,
            source: source.into(),
            remote: None,
            salary_min: None,
            salary_max: None,
            currency: None,
            created_at: discovered_at,
            updated_at: discovered_at,
            last_seen: discovered_at,
            times_seen: 1,
            immediate_alert_sent: false,
            included_in_digest: false,
            hidden: false,
            bookmarked: false,
            notes: None,
            ghost_score: None,
            ghost_reasons: None,
            first_seen: Some(discovered_at),
            repost_count: 0,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::Job;
    use crate::calculate_job_hash;
    use chrono::{TimeZone, Utc};

    #[test]
    fn newly_discovered_establishes_job_invariants() {
        let discovered_at = Utc.with_ymd_and_hms(2026, 7, 16, 12, 30, 0).unwrap();
        let job = Job::newly_discovered(
            "Care Coordinator",
            "Community Care",
            "https://example.com/jobs/1",
            Some("Remote".to_string()),
            "Example",
            discovered_at,
        );

        assert_eq!(
            job.hash,
            calculate_job_hash(
                "Community Care",
                "Care Coordinator",
                Some("Remote"),
                "https://example.com/jobs/1",
            )
        );
        assert_eq!(job.id, 0);
        assert_eq!(job.times_seen, 1);
        assert_eq!(job.created_at, discovered_at);
        assert_eq!(job.updated_at, discovered_at);
        assert_eq!(job.last_seen, discovered_at);
        assert_eq!(job.first_seen, Some(discovered_at));
        assert!(!job.immediate_alert_sent);
        assert!(!job.included_in_digest);
        assert!(!job.hidden);
        assert!(!job.bookmarked);
        assert_eq!(job.repost_count, 0);
        assert!(job.description.is_none());
        assert!(job.score.is_none());
        assert!(job.score_reasons.is_none());
        assert!(job.remote.is_none());
        assert!(job.salary_min.is_none());
        assert!(job.salary_max.is_none());
        assert!(job.currency.is_none());
        assert!(job.notes.is_none());
        assert!(job.ghost_score.is_none());
        assert!(job.ghost_reasons.is_none());
    }
}
