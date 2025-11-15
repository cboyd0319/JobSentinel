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
//! - `ats`: Application Tracking System (Kanban board, reminders)
//! - `resume`: AI Resume-Job Matcher (PDF parsing, skill extraction, matching)

pub mod ats;
pub mod config;
pub mod db;
pub mod notify;
pub mod resume;
pub mod scheduler;
pub mod scoring;
pub mod scrapers;

// Re-export commonly used types
pub use config::Config;
pub use db::{Database, Job};
pub use notify::{Notification, NotificationService};
pub use resume::{MatchResult, Resume, ResumeMatcher, UserSkill};
pub use scheduler::{ScheduleConfig, Scheduler};
pub use scoring::{JobScore, ScoringEngine};
pub use scrapers::{JobScraper, ScraperResult};
