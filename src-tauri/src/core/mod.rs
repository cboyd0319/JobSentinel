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
pub mod market_intelligence;
pub mod resume;
pub mod salary;

// v1.4+ modules
pub mod ghost;
pub mod user_data;

// v2.0+ security modules
pub mod credentials;

// v2.0+ modules - One-Click Apply (form filling without auto-submit)
pub mod automation;

// v2.1+ modules - Scraper health monitoring
pub mod health;

// Re-export commonly used types
pub use config::Config;
pub use db::{Database, Job};
pub use notify::{Notification, NotificationService};
pub use scheduler::{ScheduleConfig, Scheduler, ScrapingResult};
pub use scoring::{JobScore, ScoringEngine};
pub use scrapers::{JobScraper, ScraperResult};

// v1.1+ re-exports
pub use ats::{
    Application, ApplicationStats, ApplicationStatus, ApplicationTracker, ApplicationsByStatus,
    InterviewType, InterviewWithJob, PendingReminder, StatusCounts, WeeklyData,
};
pub use market_intelligence::{
    AlertSeverity, AlertType, CompanyActivity, LocationHeat, MarketAlert, MarketAnalyzer,
    MarketIntelligence, MarketSnapshot, RoleDemandTrend, SalaryTrend, SkillDemandTrend, SkillTrend,
};
pub use resume::{MatchResult, Resume, ResumeMatcher, UserSkill};
pub use salary::{SalaryAnalyzer, SalaryBenchmark, SalaryPrediction, SeniorityLevel};

// v1.4+ re-exports
pub use ghost::{
    GhostAnalysis, GhostCategory, GhostConfig, GhostDetector, GhostReason,
    Severity as GhostSeverity,
};
pub use user_data::{
    AdvancedFilters, CoverLetterTemplate, FollowUpReminder, GlobalNotificationSettings,
    NotificationPreferences, PrepChecklistItem, SavedSearch, SourceNotificationConfig,
    TemplateCategory, UserDataManager,
};

// v2.0+ security re-exports
pub use credentials::{CredentialKey, CredentialStore};

// v2.0+ automation re-exports
pub use automation::{
    ApplicationAttempt, ApplicationProfile, AtsDetector, AtsPlatform, AutomationManager,
    AutomationStats, AutomationStatus,
};
pub use automation::profile::{ApplicationProfileInput, ProfileManager, ScreeningAnswer};

// v2.1+ health re-exports
pub use health::{
    CredentialHealth, CredentialStatus, HealthManager, HealthStatus, HealthSummary, RetryConfig,
    RunStatus, ScraperConfig, ScraperHealthMetrics, ScraperRun, ScraperType, SelectorHealth,
    SmokeTestResult, SmokeTestType,
};
