//! Owner-neutral normalization used by job identity and source adapters.

mod location;
mod title;
mod url;

pub use location::normalize_location;
pub use title::{normalize_title, titles_match};
pub use url::{canonicalize_job_url, normalize_url};
