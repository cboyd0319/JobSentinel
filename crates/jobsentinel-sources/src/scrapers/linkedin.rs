//! LinkedIn source boundary.
//!
//! JobSentinel does not run hidden LinkedIn job collection. LinkedIn can still
//! be used through user-opened search links, manual entry, and Browser Import
//! for individual pages the user chooses.

#[cfg(test)]
use super::{JobScraper, ScraperError, ScraperResult};
#[cfg(test)]
use async_trait::async_trait;
#[cfg(test)]
use serde::{Deserialize, Serialize};
#[cfg(test)]
use std::fmt;

pub const LINKEDIN_AUTOMATION_DISABLED_MESSAGE: &str =
    "JobSentinel does not run hidden LinkedIn monitoring. Use LinkedIn when you choose, \
     then use JobSentinel to keep a local record of jobs you save, apply to, \
     track, or review. JobSentinel will not click for you, read LinkedIn pages \
     in the background, or save your sign-in. LinkedIn says third-party software \
     that scrapes or automates activity can violate its User Agreement, may lead \
     to account restrictions, and may raise privacy-law concerns.";

#[cfg(test)]
#[derive(Clone, Serialize, Deserialize)]
pub(super) struct LinkedInScraper {
    pub query: String,
    pub location: String,
    pub remote_only: bool,
    pub limit: usize,
}

#[cfg(test)]
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

#[cfg(test)]
impl LinkedInScraper {
    pub(super) fn new(query: impl Into<String>, location: impl Into<String>) -> Self {
        Self {
            query: query.into(),
            location: location.into(),
            remote_only: false,
            limit: 50,
        }
    }

    pub(super) fn with_limit(mut self, limit: usize) -> Self {
        self.limit = limit.min(100);
        self
    }
}

#[cfg(test)]
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
    async fn scrape_warns_for_user_directed_paths() {
        let scraper = LinkedInScraper::new("manager", "Denver");

        let err = scraper.scrape().await.unwrap_err();

        assert!(matches!(
            err,
            ScraperError::InvalidConfiguration { ref scraper, .. } if scraper == "linkedin"
        ));
        assert!(err.to_string().contains("Use LinkedIn when you choose"));
        assert!(err.to_string().contains("User Agreement"));
    }
}
