//! Deep Link Generator Module
//!
//! Generates pre-filled job search URLs for sites we can't scrape.
//!
//! ## Concept
//!
//! Instead of scraping protected job sites (which may violate ToS or face
//! rate limiting), we generate deep links that open in the user's browser
//! with search criteria pre-filled. This approach is:
//!
//! - 100% legal (just building URLs)
//! - Respects site ToS
//! - No rate limiting concerns
//! - Better UX (native site experience)
//!
//! ## Usage
//!
//! ```rust,no_run
//! use jobsentinel::core::deeplinks::{SearchCriteria, generate_all_links};
//!
//! let criteria = SearchCriteria {
//!     query: "Software Engineer".to_string(),
//!     location: Some("San Francisco, CA".to_string()),
//!     experience_level: None,
//!     job_type: None,
//!     remote_type: None,
//! };
//!
//! let links = generate_all_links(&criteria).unwrap();
//! for link in links {
//!     println!("{}: {}", link.site.name, link.url);
//! }
//! ```
//!
//! ## Supported Sites
//!
//! - **General**: Indeed, Monster, CareerBuilder, SimplyHired, ZipRecruiter
//! - **Professional**: LinkedIn, Glassdoor
//! - **Tech**: Dice, Stack Overflow Jobs
//! - **Government**: USAJobs, GovernmentJobs, CalCareers (CA), CAPPS (TX)
//! - **Cleared**: ClearanceJobs
//! - **Remote**: FlexJobs, We Work Remotely, Remote OK
//! - **Startups**: Wellfound (AngelList), Y Combinator Jobs

pub mod generator;
pub mod sites;
pub mod types;

// Re-exports
pub use generator::{generate_all_links, generate_link_for_site};
pub use sites::{get_all_sites, get_site_by_id, get_sites_by_category};
pub use types::{
    DeepLink, ExperienceLevel, JobType, RemoteType, SearchCriteria, SiteCategory, SiteInfo,
};
