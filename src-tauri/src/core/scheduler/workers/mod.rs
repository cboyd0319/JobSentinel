//! Worker modules for the scheduler
//!
//! This module contains the individual workers responsible for:
//! - Scraping jobs from various sources
//! - Scoring jobs based on user preferences
//! - Persisting jobs to the database and sending notifications

pub mod persistence;
pub mod scoring;
pub mod scrapers;

pub use persistence::persist_and_notify;
pub use scoring::score_jobs;
pub use scrapers::run_scrapers;
