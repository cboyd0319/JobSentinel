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
//!
//! ## Deferred to v1.1+ (need fixes before enabling)
//!
//! - `ats`: Application Tracking System (Kanban board, reminders) - 85% complete
//! - `resume`: AI Resume-Job Matcher (PDF parsing, skill extraction) - 65% complete
//! - `salary`: Salary Negotiation AI (benchmarks, prediction) - 50% complete
//! - `market_intelligence`: Job Market Intelligence Dashboard - 60% complete
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

// v1.1+ modules - disabled until compilation errors fixed
// TODO: Fix MEDIAN() SQL issues, type mismatches, then re-enable
// pub mod ats;
// pub mod market_intelligence;
// pub mod resume;
// pub mod salary;

// v2.0+ modules - disabled pending legal review
// pub mod automation;

// Re-export commonly used types
pub use config::Config;
pub use db::{Database, Job};
pub use notify::{Notification, NotificationService};
pub use scheduler::{ScheduleConfig, ScrapingResult, Scheduler};
pub use scoring::{JobScore, ScoringEngine};
pub use scrapers::{JobScraper, ScraperResult};

// v1.1+ re-exports - uncomment when modules are fixed
// pub use ats::{Application, ApplicationStatus, AtsManager};
// pub use market_intelligence::{MarketAlert, MarketAnalyzer, MarketIntelligence, MarketSnapshot, SkillDemandTrend, SalaryTrend};
// pub use resume::{MatchResult, Resume, ResumeMatcher, UserSkill};
// pub use salary::{SalaryAnalyzer, SalaryBenchmark, SalaryPrediction, SeniorityLevel};
