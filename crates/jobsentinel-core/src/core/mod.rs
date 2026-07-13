//! Core Business Logic
//!
//! This module contains all platform-agnostic business logic for JobSentinel.
//! Code here should work identically on Windows, macOS, Linux, and cloud environments.
//!
//! ## Architecture
//!
//! - `config`: Configuration management (JSON-based user preferences)
//! - `db`: Database layer (SQLite with async support)
//! - `scrapers`: Job board scraping (Greenhouse, Lever, JobsWithGPT)
//! - `scoring`: Multi-factor job scoring algorithm
//! - `notify`: Notification services (Slack, email)
//! - `scheduler`: Job search scheduling
//! - `ats`: Application Tracking System (Kanban board, reminders)
//! - `resume`: AI Resume-Job Matcher (PDF parsing, skill extraction)
//! - `salary`: Salary Negotiation AI (benchmarks, prediction)
//! - `market_intelligence`: Job Market Intelligence Dashboard
//!
//! ## Deferred to v2.0+ (requires legal review)
//!
//! - `automation`: Application Assist with user consent framework

// Core v1.0 modules (working)
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
pub mod scrapers;
mod secure_storage;
pub mod source_urls;
pub mod url_security;

// v1.1+ modules
pub mod ats;
pub mod market_intelligence;
pub mod resume;
pub mod salary;

// v1.4+ modules
pub mod ghost;
pub mod user_data;

// v2.0+ security modules
pub mod credentials;

// v2.0+ modules - Application Assist with user-controlled submit
pub mod automation;

// v2.1+ modules - Scraper health monitoring
pub mod health;

// v2.2+ modules - Universal Job Importer
pub mod import;

// v2.6+ modules - Deep link generation for non-scrapable sites
pub mod deeplinks;

// v2.6+ modules - Bookmarklet server for browser integration
pub mod bookmarklet;

// v2.6+ modules - explicit IP geolocation for setup and settings
pub mod geo;

// v2.7+ modules - Embedded ML (optional)
#[cfg(feature = "embedded-ml")]
pub mod ml;

// Re-export commonly used types
pub use config::Config;
pub use db::Database;
pub use job::Job;
pub use job_hash::calculate_job_hash;
