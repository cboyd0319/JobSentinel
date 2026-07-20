//! SQL-backed resume workflow facade.

#[cfg(feature = "embedded-ml")]
mod semantic;

pub use jobsentinel_storage::resume::*;
#[cfg(feature = "embedded-ml")]
pub use semantic::match_resume_semantic;
