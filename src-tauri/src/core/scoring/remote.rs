//! Remote work preference scoring
//!
//! Provides graduated scoring for remote/hybrid/onsite jobs based on user preferences.

use crate::core::db::Job;

/// Detected remote status of a job
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RemoteStatus {
    /// Fully remote position
    Remote,
    /// Hybrid (some remote, some onsite)
    Hybrid,
    /// Fully onsite position
    Onsite,
    /// Not specified in job description
    Unspecified,
}

/// User's remote work preference (derived from config flags)
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum UserRemotePreference {
    /// Only accept remote positions
    RemoteOnly,
    /// Prefer remote, accept hybrid/onsite with penalty
    RemotePreferred,
    /// Prefer hybrid, accept remote/onsite with slight penalty
    HybridPreferred,
    /// Prefer onsite, accept hybrid/remote with penalty
    OnsitePreferred,
    /// Accept all work arrangements equally
    Flexible,
}

impl UserRemotePreference {
    /// Derive user preference from boolean config flags
    pub fn from_flags(allow_remote: bool, allow_hybrid: bool, allow_onsite: bool) -> Self {
        match (allow_remote, allow_hybrid, allow_onsite) {
            (true, false, false) => Self::RemoteOnly,
            (true, true, false) => Self::RemotePreferred,
            (false, true, false) => Self::HybridPreferred,
            (false, false, true) => Self::OnsitePreferred,
            (true, true, true) => Self::Flexible,
            _ => Self::Flexible, // Default to flexible for other combinations
        }
    }
}

/// Detect remote status from job data
pub fn detect_remote_status(job: &Job) -> RemoteStatus {
    let location_text = job.location.as_deref().unwrap_or("").to_lowercase();
    let title_text = job.title.to_lowercase();
    let description_text = job.description.as_deref().unwrap_or("").to_lowercase();

    // Combine text for keyword detection
    let combined_text = format!("{} {} {}", title_text, location_text, description_text);

    // Check explicit remote field first
    if job.remote.unwrap_or(false) {
        return RemoteStatus::Remote;
    }

    // Check for hybrid indicators (check before remote to catch "hybrid remote")
    let hybrid_keywords = [
        "hybrid",
        "flexible location",
        "remote with occasional office",
        "partially remote",
        "mix of remote and office",
    ];
    if hybrid_keywords.iter().any(|&kw| combined_text.contains(kw)) {
        return RemoteStatus::Hybrid;
    }

    // Check for remote indicators
    let remote_keywords = [
        "remote",
        "work from home",
        "wfh",
        "distributed",
        "100% remote",
        "fully remote",
        "remote-first",
        "work anywhere",
    ];
    if remote_keywords.iter().any(|&kw| combined_text.contains(kw)) {
        return RemoteStatus::Remote;
    }

    // Check for onsite indicators
    let onsite_keywords = [
        "on-site",
        "onsite",
        "in-office",
        "office-based",
        "on site",
        "in person",
    ];
    if onsite_keywords.iter().any(|&kw| combined_text.contains(kw)) {
        return RemoteStatus::Onsite;
    }

    // Default: unspecified (no clear indicators found)
    RemoteStatus::Unspecified
}

/// Calculate remote preference score multiplier and reason
///
/// Returns (score_multiplier, reason_string)
pub fn score_remote_match(
    user_pref: UserRemotePreference,
    job_status: RemoteStatus,
) -> (f64, &'static str) {
    match (user_pref, job_status) {
        // RemoteOnly preference
        (UserRemotePreference::RemoteOnly, RemoteStatus::Remote) => {
            (1.0, "✓ Remote job (perfect match)")
        }
        (UserRemotePreference::RemoteOnly, RemoteStatus::Hybrid) => {
            (0.5, "⚠ Hybrid job (prefer remote-only)")
        }
        (UserRemotePreference::RemoteOnly, RemoteStatus::Onsite) => {
            (0.1, "✗ Onsite job (remote-only preferred)")
        }
        (UserRemotePreference::RemoteOnly, RemoteStatus::Unspecified) => (
            0.3,
            "⚠ Work arrangement not specified (remote-only preferred)",
        ),

        // RemotePreferred
        (UserRemotePreference::RemotePreferred, RemoteStatus::Remote) => {
            (1.0, "✓ Remote job (preferred)")
        }
        (UserRemotePreference::RemotePreferred, RemoteStatus::Hybrid) => {
            (0.7, "✓ Hybrid job (acceptable)")
        }
        (UserRemotePreference::RemotePreferred, RemoteStatus::Onsite) => {
            (0.4, "⚠ Onsite job (remote preferred)")
        }
        (UserRemotePreference::RemotePreferred, RemoteStatus::Unspecified) => {
            (0.6, "⚠ Work arrangement not specified")
        }

        // HybridPreferred
        (UserRemotePreference::HybridPreferred, RemoteStatus::Hybrid) => {
            (1.0, "✓ Hybrid job (preferred)")
        }
        (UserRemotePreference::HybridPreferred, RemoteStatus::Remote) => {
            (0.8, "✓ Remote job (acceptable)")
        }
        (UserRemotePreference::HybridPreferred, RemoteStatus::Onsite) => {
            (0.6, "✓ Onsite job (acceptable)")
        }
        (UserRemotePreference::HybridPreferred, RemoteStatus::Unspecified) => {
            (0.7, "⚠ Work arrangement not specified")
        }

        // OnsitePreferred
        (UserRemotePreference::OnsitePreferred, RemoteStatus::Onsite) => {
            (1.0, "✓ Onsite job (preferred)")
        }
        (UserRemotePreference::OnsitePreferred, RemoteStatus::Hybrid) => {
            (0.7, "✓ Hybrid job (acceptable)")
        }
        (UserRemotePreference::OnsitePreferred, RemoteStatus::Remote) => {
            (0.5, "⚠ Remote job (onsite preferred)")
        }
        (UserRemotePreference::OnsitePreferred, RemoteStatus::Unspecified) => {
            (0.6, "⚠ Work arrangement not specified")
        }

        // Flexible (all equally acceptable)
        (UserRemotePreference::Flexible, RemoteStatus::Remote) => (1.0, "✓ Remote job"),
        (UserRemotePreference::Flexible, RemoteStatus::Hybrid) => (1.0, "✓ Hybrid job"),
        (UserRemotePreference::Flexible, RemoteStatus::Onsite) => (1.0, "✓ Onsite job"),
        (UserRemotePreference::Flexible, RemoteStatus::Unspecified) => {
            (0.8, "⚠ Work arrangement not specified (assuming flexible)")
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::db::Job;
    use chrono::Utc;

    fn create_test_job(
        title: &str,
        location: Option<&str>,
        description: Option<&str>,
        remote: Option<bool>,
    ) -> Job {
        Job {
            id: 1,
            hash: "test".to_string(),
            title: title.to_string(),
            company: "Test Co".to_string(),
            url: "https://example.com".to_string(),
            location: location.map(|s| s.to_string()),
            description: description.map(|s| s.to_string()),
            score: None,
            score_reasons: None,
            source: "test".to_string(),
            remote,
            salary_min: None,
            salary_max: None,
            currency: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            last_seen: Utc::now(),
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
        }
    }

    #[test]
    fn test_detect_remote_explicit_flag() {
        let job = create_test_job("Engineer", None, None, Some(true));
        assert_eq!(detect_remote_status(&job), RemoteStatus::Remote);
    }

    #[test]
    fn test_detect_remote_from_location() {
        let job = create_test_job("Engineer", Some("Remote - US"), None, None);
        assert_eq!(detect_remote_status(&job), RemoteStatus::Remote);
    }

    #[test]
    fn test_detect_remote_from_title() {
        let job = create_test_job(
            "Remote Software Engineer",
            Some("San Francisco"),
            None,
            None,
        );
        assert_eq!(detect_remote_status(&job), RemoteStatus::Remote);
    }

    #[test]
    fn test_detect_hybrid_from_location() {
        let job = create_test_job("Engineer", Some("New York (Hybrid)"), None, None);
        assert_eq!(detect_remote_status(&job), RemoteStatus::Hybrid);
    }

    #[test]
    fn test_detect_hybrid_from_description() {
        let job = create_test_job(
            "Engineer",
            Some("New York"),
            Some("Flexible location - hybrid remote and office"),
            None,
        );
        assert_eq!(detect_remote_status(&job), RemoteStatus::Hybrid);
    }

    #[test]
    fn test_detect_onsite_from_description() {
        let job = create_test_job(
            "Engineer",
            Some("San Francisco"),
            Some("This is an on-site position"),
            None,
        );
        assert_eq!(detect_remote_status(&job), RemoteStatus::Onsite);
    }

    #[test]
    fn test_detect_unspecified() {
        let job = create_test_job(
            "Engineer",
            Some("New York, NY"),
            Some("Great benefits"),
            None,
        );
        assert_eq!(detect_remote_status(&job), RemoteStatus::Unspecified);
    }

    #[test]
    fn test_user_preference_from_flags() {
        assert_eq!(
            UserRemotePreference::from_flags(true, false, false),
            UserRemotePreference::RemoteOnly
        );
        assert_eq!(
            UserRemotePreference::from_flags(true, true, false),
            UserRemotePreference::RemotePreferred
        );
        assert_eq!(
            UserRemotePreference::from_flags(false, true, false),
            UserRemotePreference::HybridPreferred
        );
        assert_eq!(
            UserRemotePreference::from_flags(false, false, true),
            UserRemotePreference::OnsitePreferred
        );
        assert_eq!(
            UserRemotePreference::from_flags(true, true, true),
            UserRemotePreference::Flexible
        );
    }

    #[test]
    fn test_score_remote_only_perfect_match() {
        let (score, reason) =
            score_remote_match(UserRemotePreference::RemoteOnly, RemoteStatus::Remote);
        assert_eq!(score, 1.0);
        assert!(reason.contains("perfect match"));
    }

    #[test]
    fn test_score_remote_only_hybrid_penalty() {
        let (score, _) = score_remote_match(UserRemotePreference::RemoteOnly, RemoteStatus::Hybrid);
        assert_eq!(score, 0.5);
    }

    #[test]
    fn test_score_remote_only_onsite_severe_penalty() {
        let (score, _) = score_remote_match(UserRemotePreference::RemoteOnly, RemoteStatus::Onsite);
        assert_eq!(score, 0.1);
    }

    #[test]
    fn test_score_flexible_all_equal() {
        let (remote_score, _) =
            score_remote_match(UserRemotePreference::Flexible, RemoteStatus::Remote);
        let (hybrid_score, _) =
            score_remote_match(UserRemotePreference::Flexible, RemoteStatus::Hybrid);
        let (onsite_score, _) =
            score_remote_match(UserRemotePreference::Flexible, RemoteStatus::Onsite);

        assert_eq!(remote_score, 1.0);
        assert_eq!(hybrid_score, 1.0);
        assert_eq!(onsite_score, 1.0);
    }

    #[test]
    fn test_score_unspecified_gets_partial_credit() {
        let (score, _) =
            score_remote_match(UserRemotePreference::Flexible, RemoteStatus::Unspecified);
        assert!(
            score > 0.0 && score < 1.0,
            "Unspecified should get partial credit"
        );
    }

    #[test]
    fn test_detect_wfh_as_remote() {
        let job = create_test_job("Engineer", None, Some("Work from home position"), None);
        assert_eq!(detect_remote_status(&job), RemoteStatus::Remote);
    }

    #[test]
    fn test_detect_hybrid_priority_over_remote() {
        // If job says both "remote" and "hybrid", hybrid should win
        let job = create_test_job(
            "Engineer",
            Some("Hybrid"),
            Some("Remote work with occasional office"),
            None,
        );
        assert_eq!(detect_remote_status(&job), RemoteStatus::Hybrid);
    }
}
