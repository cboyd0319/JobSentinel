//! URL Normalization Utilities
//!
//! Provides URL normalization for consistent job deduplication.
//! Strips tracking parameters while preserving essential job identifiers.

use std::borrow::Cow;
use url::Url;

use jobsentinel_security::{
    canonicalize_user_supplied_job_url, sanitize_url_for_logging, strip_sensitive_url_components,
};

/// Normalize a URL by stripping private fragments and tracking parameters
///
/// This function removes common tracking parameters while preserving
/// essential job identifier parameters. This ensures consistent hashing
/// for job deduplication regardless of how the URL was shared.
///
/// # Arguments
///
/// * `url_str` - The URL string to normalize
///
/// # Returns
///
/// A normalized URL string with tracking parameters removed.
/// If the URL cannot be parsed, returns the original string.
///
/// # Examples
///
/// ```
/// use jobsentinel_domain::normalization::normalize_url;
///
/// let url = "https://example.com/job/123?utm_source=linkedin&utm_medium=social";
/// assert_eq!(normalize_url(url), "https://example.com/job/123");
///
/// let url = "https://greenhouse.io/job?id=456&ref=twitter";
/// assert_eq!(normalize_url(url), "https://greenhouse.io/job?id=456");
///
/// let url = "https://lever.co/jobs/abc-def?source=email";
/// assert_eq!(normalize_url(url), "https://lever.co/jobs/abc-def");
/// ```
#[must_use]
#[inline]
pub fn normalize_url(url_str: &str) -> Cow<'_, str> {
    // Try to parse the URL
    let mut url = match Url::parse(url_str) {
        Ok(u) => u,
        Err(_) => {
            // If parsing fails, return the original string (zero-copy)
            tracing::warn!(
                url = %sanitize_url_for_logging(url_str),
                "Failed to parse URL for normalization"
            );
            return Cow::Borrowed(url_str);
        }
    };

    strip_sensitive_url_components(&mut url);
    apply_job_identity_rules(&mut url);

    if url.as_str() == url_str {
        Cow::Borrowed(url_str)
    } else {
        Cow::Owned(url.to_string())
    }
}

/// Canonicalize a public job URL using privacy policy, then provider identity.
pub fn canonicalize_job_url(value: &str) -> Result<String, String> {
    let canonical = canonicalize_user_supplied_job_url(value)?;
    let mut parsed = Url::parse(&canonical).map_err(|_| "Invalid URL format".to_string())?;
    apply_job_identity_rules(&mut parsed);
    Ok(parsed.to_string())
}

fn apply_job_identity_rules(url: &mut Url) {
    if url.host_str().is_some_and(|host| {
        host.eq_ignore_ascii_case("linkedin.com")
            || host.to_ascii_lowercase().ends_with(".linkedin.com")
    }) {
        url.set_query(None);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn canonical_job_url_applies_provider_identity_after_privacy_policy() {
        let canonical = canonicalize_job_url(
            "https://www.linkedin.com/jobs/view/123?currentJobId=123&trackingId=private",
        )
        .expect("public job URL should canonicalize");

        assert_eq!(canonical, "https://www.linkedin.com/jobs/view/123");
    }

    #[test]
    fn canonical_job_url_preserves_non_provider_identity_parameters() {
        let canonical =
            canonicalize_job_url("https://boards.example.com/job?jobId=456&candidateToken=private")
                .expect("public job URL should canonicalize");

        assert_eq!(canonical, "https://boards.example.com/job?jobId=456");
    }

    #[test]
    fn test_strip_utm_parameters() {
        let input =
            "https://example.com/job/123?utm_source=linkedin&utm_medium=social&utm_campaign=hiring";
        let expected = "https://example.com/job/123";
        assert_eq!(normalize_url(input), expected);
    }

    #[test]
    fn test_preserve_job_id() {
        let input = "https://greenhouse.io/job?id=456&utm_source=twitter";
        let expected = "https://greenhouse.io/job?id=456";
        assert_eq!(normalize_url(input), expected);
    }

    #[test]
    fn test_preserve_multiple_job_params() {
        let input = "https://example.com/apply?job_id=789&position=senior-dev&utm_campaign=fall";
        let expected = "https://example.com/apply?job_id=789&position=senior-dev";
        assert_eq!(normalize_url(input), expected);
    }

    #[test]
    fn test_no_query_string() {
        let input = "https://lever.co/jobs/abc-def";
        assert_eq!(normalize_url(input), input);
    }

    #[test]
    fn test_only_tracking_params() {
        let input = "https://example.com/careers?utm_source=email&fbclid=abc123&gclid=xyz789";
        let expected = "https://example.com/careers";
        assert_eq!(normalize_url(input), expected);
    }

    #[test]
    fn test_preserve_non_tracking_params() {
        let input =
            "https://example.com/jobs?department=engineering&level=senior&utm_source=linkedin";
        let expected = "https://example.com/jobs?department=engineering&level=senior";
        assert_eq!(normalize_url(input), expected);
    }

    #[test]
    fn test_case_insensitive_tracking_params() {
        let input = "https://example.com/job?UTM_SOURCE=Twitter&Fbclid=abc123&GCLID=xyz";
        let expected = "https://example.com/job";
        assert_eq!(normalize_url(input), expected);
    }

    #[test]
    fn test_case_insensitive_essential_params() {
        let input = "https://example.com/job?JOB_ID=123&UTM_SOURCE=email";
        let expected = "https://example.com/job?JOB_ID=123";
        assert_eq!(normalize_url(input), expected);
    }

    #[test]
    fn test_greenhouse_specific() {
        let input =
            "https://boards.greenhouse.io/company/jobs/123456?gh_jid=123456&utm_source=linkedin";
        let expected = "https://boards.greenhouse.io/company/jobs/123456?gh_jid=123456";
        assert_eq!(normalize_url(input), expected);
    }

    #[test]
    fn test_lever_specific() {
        let input = "https://jobs.lever.co/company/abc-def-ghi?lever-origin=applied&lever-source%5B%5D=LinkedIn";
        // Note: lever-origin is not in our essential params, so it gets removed
        // Only lever-id or lever_id would be preserved
        assert_eq!(
            normalize_url(input),
            "https://jobs.lever.co/company/abc-def-ghi"
        );
    }

    #[test]
    fn test_malformed_url() {
        let input = "not-a-valid-url";
        // Should return original string if parsing fails
        assert_eq!(normalize_url(input), input);
    }

    #[test]
    fn test_empty_string() {
        let input = "";
        assert_eq!(normalize_url(input), input);
    }

    #[test]
    fn test_url_with_fragment() {
        let input = "https://example.com/job/123?utm_source=email#apply";
        let expected = "https://example.com/job/123";
        assert_eq!(normalize_url(input), expected);
    }

    #[test]
    fn test_url_with_fragment_without_query() {
        let input = "https://example.com/job/123#apply";
        let expected = "https://example.com/job/123";
        assert_eq!(normalize_url(input), expected);
    }

    #[test]
    fn test_multiple_same_tracking_param() {
        let input = "https://example.com/job?id=123&utm_source=twitter&utm_source=email";
        let expected = "https://example.com/job?id=123";
        assert_eq!(normalize_url(input), expected);
    }

    #[test]
    fn test_mixed_essential_and_tracking() {
        let input = "https://example.com/apply?job_id=456&posting_id=789&utm_campaign=spring&ref=linkedin&session=abc123";
        let expected = "https://example.com/apply?job_id=456&posting_id=789";
        assert_eq!(normalize_url(input), expected);
    }

    #[test]
    fn test_sensitive_query_params_and_nested_urls_removed() {
        let input = "https://example.com/apply?job_id=456&candidateEmail=person@example.com&token=secret&redirect=https%3A%2F%2Fprivate.example%2Fcallback%3Ftoken%3Draw-secret";
        let expected = "https://example.com/apply?job_id=456";
        assert_eq!(normalize_url(input), expected);
    }

    #[test]
    fn test_url_with_port() {
        let input = "https://example.com:8080/job/123?utm_source=newsletter";
        let expected = "https://example.com:8080/job/123";
        assert_eq!(normalize_url(input), expected);
    }

    #[test]
    fn test_url_with_subdomain() {
        let input = "https://careers.example.com/job?id=123&utm_medium=social";
        let expected = "https://careers.example.com/job?id=123";
        assert_eq!(normalize_url(input), expected);
    }

    #[test]
    fn test_linkedin_jobs_url() {
        let input = "https://www.linkedin.com/jobs/view/123456789?refId=abc123&trackingId=xyz789&utm_source=share";
        // refId and trackingId are not in essential params, so they get removed
        let expected = "https://www.linkedin.com/jobs/view/123456789";
        assert_eq!(normalize_url(input), expected);
    }

    #[test]
    fn test_indeed_url() {
        let input = "https://www.indeed.com/viewjob?jk=abc123def456&tk=1234567890&from=serp&vjs=3";
        // jk is not in our essential params (we'd need to add it if Indeed is a source)
        // This test documents current behavior - we may want to add "jk" to essential params
        let expected = "https://www.indeed.com/viewjob?jk=abc123def456&vjs=3";
        assert_eq!(normalize_url(input), expected);
    }

    #[test]
    fn test_all_tracking_params_removed() {
        let tracking_params = vec![
            "utm_source=test",
            "utm_medium=test",
            "utm_campaign=test",
            "utm_term=test",
            "utm_content=test",
            "fbclid=test",
            "gclid=test",
            "ref=test",
            "source=test",
            "campaign=test",
        ];

        for param in tracking_params {
            let input = format!("https://example.com/job?id=123&{}", param);
            let expected = "https://example.com/job?id=123";
            assert_eq!(
                normalize_url(&input),
                expected,
                "Failed to strip: {}",
                param
            );
        }
    }

    #[test]
    fn test_all_essential_params_preserved() {
        let essential_params = vec![
            "id=123",
            "job_id=123",
            "jobid=123",
            "posting=123",
            "posting_id=123",
            "gh_jid=123",
            "lever_id=123",
            "position=123",
        ];

        for param in essential_params {
            let input = format!("https://example.com/job?{}&utm_source=test", param);
            let expected = format!("https://example.com/job?{}", param);
            assert_eq!(
                normalize_url(&input),
                expected,
                "Failed to preserve: {}",
                param
            );
        }
    }
}
