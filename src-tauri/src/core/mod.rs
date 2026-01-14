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
//! - `resume`: AI Resume-Job Matcher (PDF parsing, skill extraction)
//! - `salary`: Salary Negotiation AI (benchmarks, prediction)
//! - `market_intelligence`: Job Market Intelligence Dashboard
//!
//! ## Deferred to v2.0+ (requires legal review)
//!
//! - `automation`: One-Click Apply automation - requires user consent framework

// Core v1.0 modules (working)
pub mod config;
pub mod db;
pub mod notify;
pub mod scheduler;
pub mod scoring;
pub mod scrapers;

// v1.1+ modules
pub mod ats;
pub mod resume;
pub mod salary;
pub mod market_intelligence;

// v2.0+ modules - disabled pending legal review
// pub mod automation;

// Re-export commonly used types
pub use config::Config;
pub use db::{Database, Job};
pub use notify::{Notification, NotificationService};
pub use scheduler::{ScheduleConfig, ScrapingResult, Scheduler};
pub use scoring::{JobScore, ScoringEngine};
pub use scrapers::{JobScraper, ScraperResult};

// v1.1+ re-exports
pub use ats::{Application, ApplicationStatus, ApplicationTracker, ApplicationsByStatus, PendingReminder};
pub use resume::{MatchResult, Resume, ResumeMatcher, UserSkill};
pub use salary::{SalaryAnalyzer, SalaryBenchmark, SalaryPrediction, SeniorityLevel};
pub use market_intelligence::{
    MarketAlert, MarketAnalyzer, MarketIntelligence, MarketSnapshot,
    SkillDemandTrend, SalaryTrend, RoleDemandTrend, AlertType, AlertSeverity,
    SkillTrend, CompanyActivity, LocationHeat,
};
