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

// v2.2+ modules - Universal Job Importer
pub mod import;

// v2.6+ modules - Deep link generation for non-scrapable sites
pub mod deeplinks;

// v2.6+ modules - Bookmarklet server for browser integration
pub mod bookmarklet;

// v2.6+ modules - IP geolocation for setup wizard
pub mod geo;

// v2.7+ modules - Embedded ML (optional)
#[cfg(feature = "embedded-ml")]
pub mod ml;

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
pub use automation::profile::{ApplicationProfileInput, ProfileManager, ScreeningAnswer};
pub use automation::{
    ApplicationAttempt, ApplicationProfile, AtsDetector, AtsPlatform, AutomationManager,
    AutomationStats, AutomationStatus,
};

// v2.1+ health re-exports
pub use health::{
    CredentialHealth, CredentialStatus, HealthManager, HealthStatus, HealthSummary, RetryConfig,
    RunStatus, ScraperConfig, ScraperHealthMetrics, ScraperRun, ScraperType, SelectorHealth,
    SmokeTestResult, SmokeTestType,
};

// v2.2+ import re-exports
pub use import::{
    fetch_job_page, parse_schema_org_job_posting, ImportError, ImportResult, JobImportPreview,
    SchemaOrgJobPosting,
};

// v2.6+ deeplinks re-exports
pub use deeplinks::{
    generate_all_links, generate_link_for_site, get_all_sites, get_site_by_id,
    get_sites_by_category, DeepLink, ExperienceLevel, JobType as DeepLinkJobType, RemoteType,
    SearchCriteria, SiteCategory, SiteInfo,
};

// v2.6+ bookmarklet re-exports
pub use bookmarklet::{BookmarkletConfig, BookmarkletJobData, BookmarkletServer};

// v2.6+ geo re-exports
pub use geo::LocationInfo;
