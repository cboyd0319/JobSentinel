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
//! - `automation`: One-Click Apply automation (ATS detection, profile management)
//! - `salary`: Salary Negotiation AI (benchmarks, prediction, negotiation scripts)
//! - `market_intelligence`: Job Market Intelligence Dashboard (analytics, trends, alerts)

pub mod ats;
pub mod automation;
pub mod config;
pub mod db;
pub mod market_intelligence;
pub mod notify;
pub mod resume;
pub mod salary;
pub mod scheduler;
pub mod scoring;
pub mod scrapers;

// Re-export commonly used types
pub use automation::{ApplicationProfile, AtsPlatform, AutomationManager, AutomationStatus};
pub use config::Config;
pub use db::{Database, Job};
pub use market_intelligence::{
    MarketAlert, MarketAnalyzer, MarketIntelligence, MarketSnapshot, SkillDemandTrend,
    SalaryTrend,
};
pub use notify::{Notification, NotificationService};
pub use resume::{MatchResult, Resume, ResumeMatcher, UserSkill};
pub use salary::{SalaryAnalyzer, SalaryBenchmark, SalaryPrediction, SeniorityLevel};
pub use scheduler::{ScheduleConfig, Scheduler};
pub use scoring::{JobScore, ScoringEngine};
pub use scrapers::{JobScraper, ScraperResult};
