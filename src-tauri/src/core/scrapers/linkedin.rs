//! LinkedIn source boundary.
//!
//! JobSentinel does not automate LinkedIn job collection. LinkedIn can still be
//! used through user-opened search links, but background monitoring is disabled
//! unless a future source-specific review identifies an allowed official path.

use super::{JobScraper, ScraperError, ScraperResult};
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::fmt;

pub const LINKEDIN_AUTOMATION_DISABLED_MESSAGE: &str =
    "LinkedIn automatic monitoring is disabled by JobSentinel source policy. \
     Use job-site search links to open LinkedIn yourself, or monitor official \
     company and ATS sources instead.";

#[derive(Clone, Serialize, Deserialize)]
pub struct LinkedInScraper {
    pub query: String,
    pub location: String,
    pub remote_only: bool,
    pub limit: usize,
}

impl fmt::Debug for LinkedInScraper {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("LinkedInScraper")
            .field("query_chars", &self.query.chars().count())
            .field("location_chars", &self.location.chars().count())
            .field("remote_only", &self.remote_only)
            .field("limit", &self.limit)
            .finish()
    }
}

impl LinkedInScraper {
    pub fn new(query: impl Into<String>, location: impl Into<String>) -> Self {
        Self {
            query: query.into(),
            location: location.into(),
            remote_only: false,
            limit: 50,
        }
    }

    pub fn with_remote_only(mut self, remote_only: bool) -> Self {
        self.remote_only = remote_only;
        self
    }

    pub fn with_limit(mut self, limit: usize) -> Self {
        self.limit = limit.min(100);
        self
    }
}

#[async_trait]
impl JobScraper for LinkedInScraper {
    async fn scrape(&self) -> ScraperResult {
        Err(ScraperError::InvalidConfiguration {
            scraper: "linkedin".to_string(),
            message: LINKEDIN_AUTOMATION_DISABLED_MESSAGE.to_string(),
        })
    }

    fn name(&self) -> &'static str {
        "LinkedIn"
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn debug_output_has_no_session_cookie_surface() {
        let scraper = LinkedInScraper::new("manager", "Denver");

        let debug = format!("{scraper:?}");

        assert!(!debug.contains("session_cookie"));
    }

    #[test]
    fn with_limit_caps_results() {
        let scraper = LinkedInScraper::new("manager", "Denver").with_limit(500);

        assert_eq!(scraper.limit, 100);
    }

    #[tokio::test]
    async fn scrape_is_disabled_by_source_policy() {
        let scraper = LinkedInScraper::new("manager", "Denver");

        let err = scraper.scrape().await.unwrap_err();

        assert!(matches!(
            err,
            ScraperError::InvalidConfiguration { ref scraper, .. } if scraper == "linkedin"
        ));
        assert!(err.to_string().contains("source policy"));
    }
}
