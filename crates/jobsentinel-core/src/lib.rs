//! Tauri-free JobSentinel domain and local-first application core.

mod core;
pub mod platforms;

pub use core::{
    ats, automation, bookmarklet, config, credentials, db, deeplinks, geo, ghost, health,
    http_body, import, linkedin_workbench, logging, market_intelligence, normalization, notify,
    resume, salary, scheduler, scoring, url_security, user_data, Config, Database, Job,
};

#[cfg(feature = "embedded-ml")]
pub use core::ml;
