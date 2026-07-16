//! Job Board Scrapers
//!
//! Implementations for scraping various job boards.

use async_trait::async_trait;
use jobsentinel_domain::Job;

mod builtin;
mod dice;
mod error;
mod glassdoor;
mod greenhouse;
mod hn_hiring;
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

pub use builtin::BuiltInScraper;
pub use dice::DiceScraper;
pub use error::ScraperError;
pub use glassdoor::GlassdoorScraper;
pub use greenhouse::{GreenhouseCompany, GreenhouseScraper};
pub use hn_hiring::HnHiringScraper;
pub use jobswithgpt::{JobQuery, JobsWithGptScraper};
pub use lever::{LeverCompany, LeverScraper};
pub use linkedin::LINKEDIN_AUTOMATION_DISABLED_MESSAGE;
pub use rate_limiter::{limits, RateLimiter};
pub use remoteok::RemoteOkScraper;
pub use simplyhired::SimplyHiredScraper;
pub use usajobs::UsaJobsScraper;
pub use weworkremotely::WeWorkRemotelyScraper;
pub use yc_startup::YcStartupScraper;

// NOTE: SimplyHired and Glassdoor have Cloudflare protection.
// These scrapers attempt to use RSS/JSON-LD but may return empty if blocked.

// NOTE: GovernmentJobs.com and ClearanceJobs.com explicitly prohibit scraping in their ToS.
// Use Deep Link Generator and Bookmarklet features instead; see docs/user/DEEP_LINKS.md and
// docs/BOOKMARKLET.md for supported alternatives.

/// Scraper result type using ScraperError for better error context
///
/// This provides structured errors with helpful context for debugging and user messages.
/// All scrapers now use this typed error approach instead of anyhow::Error.
pub(crate) type ScraperResult = Result<Vec<Job>, ScraperError>;

/// Job scraper trait
#[async_trait]
pub trait JobScraper: Send + Sync {
    /// Scrape jobs from this source
    async fn scrape(&self) -> Result<Vec<Job>, ScraperError>;

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
