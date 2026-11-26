//! Discovers published updates on explicit request without granting installation authority.

use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateAvailability {
    pub status: &'static str,
    pub current_version: String,
    pub available_version: Option<String>,
    pub release_url: Option<String>,
}

#[derive(Deserialize)]
struct Release {
    tag_name: String,
    draft: bool,
    prerelease: bool,
}

fn assess_release(body: &str) -> UpdateAvailability {
    let mut result = UpdateAvailability {
        status: "unavailable",
        current_version: env!("CARGO_PKG_VERSION").into(),
        available_version: None,
        release_url: None,
    };
    if body.len() > 1024 * 1024 {
        return result;
    }
    let Ok(release) = serde_json::from_str::<Release>(body) else {
        return result;
    };
    let Some(version) = release.tag_name.strip_prefix('v') else {
        return result;
    };
    let parts: Vec<_> = version.split('.').collect();
    if release.draft || release.prerelease || parts.len() != 3 {
        return result;
    }
    let Ok(numbers) = parts
        .iter()
        .map(|part| part.parse::<u32>())
        .collect::<Result<Vec<_>, _>>()
    else {
        return result;
    };
    if parts
        .iter()
        .zip(&numbers)
        .any(|(part, number)| *part != number.to_string())
        || numbers[0] > 3
    {
        return result;
    }
    let Ok(current) = super::inventory::parse_version(&result.current_version) else {
        return result;
    };
    result.status = "current";
    if numbers.as_slice() > current.0.as_slice() {
        result.status = "available";
        result.available_version = Some(version.into());
        // Construct the fixed publisher URL; discovery never supplies an arbitrary navigation target.
        result.release_url = Some(format!(
            "https://github.com/cboyd0319/JobSentinel/releases/tag/{}",
            release.tag_name
        ));
    }
    result
}

/// User-triggered, anonymous discovery only; downloaded packages require separate signed review.
pub async fn check_update_availability() -> UpdateAvailability {
    use jobsentinel_network::fetch_external_https_text_with_user_agent;
    let fetched = tokio::time::timeout(
        Duration::from_secs(20),
        fetch_external_https_text_with_user_agent(
            "https://api.github.com/repos/cboyd0319/JobSentinel/releases/latest",
            Duration::from_secs(15),
            Some("JobSentinel"),
        ),
    )
    .await;
    match fetched {
        Ok(Ok(response)) if response.status == 200 => assess_release(&response.body),
        _ => assess_release(""),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn published_discovery_accepts_only_canonical_stable_v3_versions() {
        let available =
            assess_release(r#"{"tag_name":"v3.99.1","draft":false,"prerelease":false}"#);
        assert_eq!(available.status, "available");
        assert_eq!(available.available_version.as_deref(), Some("3.99.1"));
        assert_eq!(
            available.release_url.as_deref(),
            Some("https://github.com/cboyd0319/JobSentinel/releases/tag/v3.99.1")
        );
        for tag in [
            "v3.01.0",
            "v3.1.0-beta",
            "v3.1.0/evil",
            "v4.0.0",
            "3.99.1",
            "v3.+1.0",
        ] {
            let body = serde_json::json!({"tag_name":tag,"draft":false,"prerelease":false});
            assert_eq!(
                assess_release(&body.to_string()).status,
                "unavailable",
                "{tag}"
            );
        }
    }

    #[test]
    fn malformed_private_and_unpublished_releases_never_claim_current() {
        for body in [
            "",
            "[]",
            "{}",
            r#"{"message":"Not Found"}"#,
            r#"{"tag_name":"v3.99.1","draft":true,"prerelease":false}"#,
            r#"{"tag_name":"v3.99.1","draft":false,"prerelease":true}"#,
        ] {
            let result = assess_release(body);
            assert_eq!(result.status, "unavailable");
            assert!(result.release_url.is_none());
        }
        assert_eq!(
            assess_release(r#"{"tag_name":"v2.9.5","draft":false,"prerelease":false}"#).status,
            "current"
        );
        let body = serde_json::json!({"tag_name":format!("v{}",env!("CARGO_PKG_VERSION")),"draft":false,"prerelease":false});
        assert_eq!(assess_release(&body.to_string()).status, "current");
    }
}
