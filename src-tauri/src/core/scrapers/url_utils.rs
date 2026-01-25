//! URL Normalization Utilities
//!
//! Provides URL normalization for consistent job deduplication.
//! Strips tracking parameters while preserving essential job identifiers.

use std::borrow::Cow;
use url::Url;

/// Common tracking parameters to strip from URLs
const TRACKING_PARAMS: &[&str] = &[
    // Analytics and campaign tracking
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "utm_id",
    // Social media tracking
    "fbclid",
    "gclid",
    "msclkid",
    "twclid",
    // Referral tracking
    "ref",
    "source",
    "campaign",
    "medium",
    // Email tracking
    "mc_cid",
    "mc_eid",
    // Affiliate tracking
    "aff_id",
    "affiliate",
    "partner",
    // Session tracking
    "session",
    "sid",
    "session_id",
    // Click tracking
    "click_id",
    "clickid",
    "cid",
    // LinkedIn-specific tracking
    "refId",
    "trackingId",
    // Indeed-specific tracking
    "tk",
    "from",
    // Lever-specific tracking
    "lever-origin",
    "lever-source",
    "lever-source[]",
];

/// Essential job identifier parameters to preserve
///
/// These parameters typically contain job posting IDs that are required
/// for correct deduplication and accessing the job listing.
#[allow(dead_code)]
const ESSENTIAL_PARAMS: &[&str] = &[
    // Job identifiers
    "id",
    "job_id",
    "jobid",
    "job",
    "posting",
    "posting_id",
    "postingid",
    "gh_jid", // Greenhouse job ID
    "lever-id",
    "lever_id",
    "position",
    "position_id",
    "req_id",
    "requisition",
    "opening",
    "opening_id",
    // Indeed-specific
    "jk",  // Indeed job key
    "vjs", // Indeed view job source (kept as it may affect job visibility)
];

/// Normalize a URL by stripping tracking parameters
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
/// use jobsentinel::core::scrapers::url_utils::normalize_url;
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
            tracing::warn!("Failed to parse URL for normalization: {}", url_str);
            return Cow::Borrowed(url_str);
        }
    };

    // Check if URL has query parameters
    if url.query().is_none() {
        // No query string, return original (zero-copy when possible)
        return if url.as_str() == url_str {
            Cow::Borrowed(url_str)
        } else {
            Cow::Owned(url.to_string())
        };
    }

    // Collect tracking params to check if we need to modify
    let has_tracking_params = url.query_pairs().any(|(key, _)| {
        let key_lower = key.to_lowercase();
        TRACKING_PARAMS
            .iter()
            .any(|&param| key_lower == param.to_lowercase())
    });

    // If no tracking params, return as-is (zero-copy optimization)
    if !has_tracking_params {
        return if url.as_str() == url_str {
            Cow::Borrowed(url_str)
        } else {
            Cow::Owned(url.to_string())
        };
    }

    // Filter query parameters - avoid multiple iterations
    let mut filtered_params = Vec::new();
    for (key, value) in url.query_pairs() {
        let key_lower = key.to_lowercase();

        // Remove tracking parameters
        if TRACKING_PARAMS
            .iter()
            .any(|&param| key_lower == param.to_lowercase())
        {
            continue;
        }

        // Keep essential parameters and others (conservative approach)
        filtered_params.push((key.into_owned(), value.into_owned()));
    }

    // Clear existing query and rebuild with filtered parameters
    url.query_pairs_mut().clear();

    if !filtered_params.is_empty() {
        url.query_pairs_mut().extend_pairs(filtered_params);
    } else {
        // If no parameters remain, remove the query entirely to avoid trailing "?"
        url.set_query(None);
    }

    Cow::Owned(url.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

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
        let expected = "https://example.com/job/123#apply";
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
