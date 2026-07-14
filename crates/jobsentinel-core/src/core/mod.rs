//! Core Business Logic
//!
//! Platform-neutral business logic and local data ownership for JobSentinel.

pub mod config;
pub mod db;
pub mod http_body;
mod job;
mod job_hash;
pub mod linkedin_workbench;
pub mod logging;
pub mod normalization;
pub mod notify;
pub mod scheduler;
pub mod scoring;
mod scrapers;
mod secure_storage;
pub(crate) mod source_urls;
pub mod url_security;

pub mod ats;
pub mod market_intelligence;
pub mod resume;
pub mod salary;

pub mod ghost;
pub mod user_data;

pub mod credentials;

pub mod automation;

pub mod health;

pub mod import;

pub mod deeplinks;

pub mod bookmarklet;

pub mod geo;

#[cfg(feature = "embedded-ml")]
pub mod ml;

pub use config::Config;
pub use db::Database;
pub use job::Job;
pub(crate) use job_hash::calculate_job_hash;
