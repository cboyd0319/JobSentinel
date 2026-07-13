//! Job Board Scrapers
//!
//! Implementations for scraping various job boards.

use crate::core::Job;
use async_trait::async_trait;

mod builtin;
mod dice;
mod error;
mod glassdoor;
mod greenhouse;
mod hn_hiring;
mod http_client;
mod jobswithgpt;
mod lever;
mod linkedin;
mod rate_limiter;
mod remoteok;
mod rss;
mod simplyhired;
#[cfg(test)]
mod source_adapters;
mod usajobs;
mod weworkremotely;
mod yc_startup;

pub(super) use builtin::BuiltInScraper;
pub(super) use dice::DiceScraper;
pub(super) use error::ScraperError;
pub(super) use glassdoor::GlassdoorScraper;
pub(super) use greenhouse::{GreenhouseCompany, GreenhouseScraper};
pub(super) use hn_hiring::HnHiringScraper;
pub(super) use http_client::{scraper_client_builder, DEFAULT_USER_AGENT};
pub(super) use jobswithgpt::{JobQuery, JobsWithGptScraper};
pub(super) use lever::{LeverCompany, LeverScraper};
pub(super) use linkedin::LINKEDIN_AUTOMATION_DISABLED_MESSAGE;
pub(super) use rate_limiter::{limits, RateLimiter};
pub(super) use remoteok::RemoteOkScraper;
pub(super) use simplyhired::SimplyHiredScraper;
pub(super) use usajobs::UsaJobsScraper;
pub(super) use weworkremotely::WeWorkRemotelyScraper;
pub(super) use yc_startup::YcStartupScraper;

// NOTE: SimplyHired and Glassdoor have Cloudflare protection.
// These scrapers attempt to use RSS/JSON-LD but may return empty if blocked.

// NOTE: GovernmentJobs.com and ClearanceJobs.com explicitly prohibit scraping in their ToS.
// Use Deep Link Generator and Bookmarklet features instead; see docs/user/DEEP_LINKS.md and
// docs/BOOKMARKLET.md for supported alternatives.

/// Scraper result type using ScraperError for better error context
///
/// This provides structured errors with helpful context for debugging and user messages.
/// All scrapers now use this typed error approach instead of anyhow::Error.
type ScraperResult = Result<Vec<Job>, ScraperError>;

/// Job scraper trait
#[async_trait]
pub(super) trait JobScraper: Send + Sync {
    /// Scrape jobs from this source
    async fn scrape(&self) -> ScraperResult;

    /// Get scraper name
    #[cfg(test)]
    fn name(&self) -> &'static str;
}

#[cfg(test)]
#[path = "tests/integration.rs"]
mod integration_tests;

#[cfg(test)]
#[path = "tests/live.rs"]
mod live_tests;
