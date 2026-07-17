//! Shared job hash generation.

use super::normalization::{
    canonicalize_job_url, normalize_location, normalize_title, normalize_url,
};
use sha2::{Digest, Sha256};

/// Compute the canonical job hash used for deduplication.
pub fn calculate_job_hash(company: &str, title: &str, location: Option<&str>, url: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(company.to_lowercase().as_bytes());
    hasher.update(normalize_title(title).as_bytes());
    if let Some(location) = location {
        hasher.update(normalize_location(location).as_bytes());
    }
    let canonical_url =
        canonicalize_job_url(url).unwrap_or_else(|_| normalize_url(url).into_owned());
    hasher.update(canonical_url.as_bytes());
    hex::encode(hasher.finalize())
}

#[cfg(test)]
mod tests {
    use super::calculate_job_hash;

    #[test]
    fn includes_location_in_hash_contract() {
        let remote = calculate_job_hash(
            "Community Care",
            "Care Coordinator",
            Some("Remote"),
            "https://example.com/jobs/1",
        );
        let onsite = calculate_job_hash(
            "Community Care",
            "Care Coordinator",
            Some("Phoenix, AZ"),
            "https://example.com/jobs/1",
        );

        assert_ne!(remote, onsite);
    }

    #[test]
    fn normalizes_title_location_and_url() {
        let first = calculate_job_hash(
            "Community Care",
            "Sr. Care Coordinator (L5)",
            Some("Phoenix, Arizona"),
            "https://example.com/jobs/1?utm_source=email",
        );
        let second = calculate_job_hash(
            "community care",
            "Senior Care Coordinator - Level 5",
            Some("Phoenix, AZ"),
            "https://example.com/jobs/1",
        );

        assert_eq!(first, second);
    }

    #[test]
    fn strips_sensitive_query_data_before_hashing() {
        let first = calculate_job_hash(
            "Community Care",
            "Care Coordinator",
            Some("Remote"),
            "https://example.com/jobs/1?candidateEmail=person@example.com&token=secret&redirect=https%3A%2F%2Fprivate.example%2Fcallback%3Ftoken%3Draw",
        );
        let second = calculate_job_hash(
            "Community Care",
            "Care Coordinator",
            Some("Remote"),
            "https://example.com/jobs/1",
        );

        assert_eq!(first, second);
    }

    #[test]
    fn strips_fragments_before_hashing() {
        let first = calculate_job_hash(
            "Community Care",
            "Care Coordinator",
            Some("Remote"),
            "https://example.com/jobs/1?gh_jid=123#apply",
        );
        let second = calculate_job_hash(
            "Community Care",
            "Care Coordinator",
            Some("Remote"),
            "https://example.com/jobs/1?gh_jid=123",
        );

        assert_eq!(first, second);
    }
}
