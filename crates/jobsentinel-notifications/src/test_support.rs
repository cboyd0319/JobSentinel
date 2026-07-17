use crate::Notification;
use chrono::Utc;
use jobsentinel_domain::Job;
use jobsentinel_intelligence::{JobScore, ScoreBreakdown};

/// Shared scored-job fixture for notification contract tests.
#[must_use]
pub fn notification_fixture() -> Notification {
    let now = Utc::now();
    Notification {
        job: Job {
            id: 1,
            hash: "test123".to_string(),
            title: "Care Coordinator".to_string(),
            company: "Community Care Network".to_string(),
            url: "https://example.com/jobs/123".to_string(),
            location: Some("Remote".to_string()),
            description: Some("Support patients and families with care planning".to_string()),
            score: Some(0.95),
            score_reasons: None,
            source: "greenhouse".to_string(),
            remote: Some(true),
            salary_min: Some(180000),
            salary_max: Some(220000),
            currency: Some("USD".to_string()),
            created_at: now,
            updated_at: now,
            last_seen: now,
            times_seen: 1,
            immediate_alert_sent: false,
            hidden: false,
            bookmarked: false,
            ghost_score: None,
            ghost_reasons: None,
            first_seen: None,
            repost_count: 0,
            notes: None,
            included_in_digest: false,
        },
        score: JobScore {
            total: 0.95,
            breakdown: ScoreBreakdown {
                skills: 0.40,
                salary: 0.25,
                location: 0.20,
                company: 0.05,
                recency: 0.05,
            },
            reasons: vec![
                "Title matches: Care Coordinator".to_string(),
                "Keyword match: case management".to_string(),
                "Salary 120% of target (100% credit)".to_string(),
                "Remote job (matches preference)".to_string(),
            ],
        },
    }
}
