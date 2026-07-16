//! Worker modules for the scheduler
//!
//! This module contains the individual workers responsible for:
//! - Scraping jobs from various sources
//! - Scoring jobs based on user preferences
//! - Persisting jobs to the database and sending notifications

mod persistence;
mod scoring;
mod scrapers;

pub(super) use persistence::persist_and_notify;
pub(super) use scoring::score_jobs;
pub(super) use scrapers::run_scrapers;
