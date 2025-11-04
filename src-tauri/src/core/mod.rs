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
//! - `scheduler`: Job search scheduling and automation

pub mod config;
pub mod db;
pub mod scrapers;
pub mod scoring;
pub mod notify;
pub mod scheduler;

// Re-export commonly used types
pub use config::Config;
pub use db::{Database, Job};
pub use scrapers::{JobScraper, ScraperResult};
pub use scoring::{JobScore, ScoringEngine};
pub use notify::{Notification, NotificationService};
pub use scheduler::{Scheduler, ScheduleConfig};
