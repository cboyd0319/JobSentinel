//! Core types for health monitoring system.
//!
//! Defines all enums and structs used throughout the health monitoring modules.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Execution outcome of a single scraper run.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RunStatus {
    /// Currently executing.
    Running,
    /// Completed successfully with jobs found.
    Success,
    /// Failed with error (network, parsing, rate limit).
    Failure,
    /// Exceeded execution timeout.
    Timeout,
}

impl RunStatus {
    /// Convert to database string representation.
    #[inline]
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Running => "running",
            Self::Success => "success",
            Self::Failure => "failure",
            Self::Timeout => "timeout",
        }
    }

    /// Parse from database string.
    #[inline]
    pub fn from_str(s: &str) -> Self {
        match s {
            "running" => Self::Running,
            "success" => Self::Success,
            "failure" => Self::Failure,
            "timeout" => Self::Timeout,
            _ => Self::Failure,
        }
    }
}

/// Record of a single scraper execution.
///
/// Stored in `scraper_runs` table for historical tracking and metrics calculation.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScraperRun {
    /// Database row ID.
    pub id: i64,
    /// Scraper identifier (e.g. "greenhouse").
    pub scraper_name: String,
    /// When execution started.
    pub started_at: DateTime<Utc>,
    /// When execution finished (None if still running).
    pub finished_at: Option<DateTime<Utc>>,
    /// Total execution time in milliseconds.
    pub duration_ms: Option<i64>,
    /// Final execution status.
    pub status: RunStatus,
    /// Total jobs found (including duplicates).
    pub jobs_found: i32,
    /// New jobs added to database.
    pub jobs_new: i32,
    /// Error message if failed.
    pub error_message: Option<String>,
    /// HTTP status code or error type (e.g. "429", "timeout").
    pub error_code: Option<String>,
    /// Retry attempt number (0 = first try).
    pub retry_attempt: i32,
}

/// Aggregated health status for a scraper.
///
/// Calculated from recent run history (last 7 days).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum HealthStatus {
    /// Success in last 24 hours.
    Healthy,
    /// Success in last 7 days but not 24 hours.
    Degraded,
    /// No success in 7+ days.
    Down,
    /// Scraper intentionally disabled.
    Disabled,
    /// No runs recorded yet.
    #[default]
    Unknown,
}

impl HealthStatus {
    /// Parse from database string.
    #[inline]
    pub fn from_str(s: &str) -> Self {
        match s {
            "healthy" => Self::Healthy,
            "degraded" => Self::Degraded,
            "down" => Self::Down,
            "disabled" => Self::Disabled,
            "unknown" => Self::Unknown,
            _ => Self::Unknown,
        }
    }
}

/// DOM selector health status for HTML scrapers.
///
/// Tracks whether CSS selectors are finding expected elements on scraped pages.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SelectorHealth {
    /// All selectors working (100% match rate).
    Healthy,
    /// Some selectors failing (partial match).
    Degraded,
    /// All selectors failing (site likely redesigned).
    Broken,
    /// Not checked yet or N/A for API scrapers.
    #[default]
    Unknown,
}

impl SelectorHealth {
    /// Parse from database string.
    #[inline]
    pub fn from_str(s: &str) -> Self {
        match s {
            "healthy" => Self::Healthy,
            "degraded" => Self::Degraded,
            "broken" => Self::Broken,
            "unknown" => Self::Unknown,
            _ => Self::Unknown,
        }
    }
}

/// Scraper implementation type.
///
/// Determines which health checks are applicable (e.g. selector tests only for HTML).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ScraperType {
    /// REST or HTTP API.
    Api,
    /// HTML parsing with CSS selectors.
    Html,
    /// RSS/Atom feed parsing.
    Rss,
    /// GraphQL API.
    Graphql,
}

impl ScraperType {
    /// Parse from database string.
    #[inline]
    pub fn from_str(s: &str) -> Self {
        match s {
            "api" => Self::Api,
            "html" => Self::Html,
            "rss" => Self::Rss,
            "graphql" => Self::Graphql,
            _ => Self::Api,
        }
    }
}

/// Aggregated health metrics for a single scraper.
///
/// Calculated from the `scraper_health_status` view, which joins
/// `scraper_config` with recent run history.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScraperHealthMetrics {
    /// Internal scraper identifier.
    pub scraper_name: String,
    /// Human-readable name for UI display.
    pub display_name: String,
    /// Whether scraper is enabled in config.
    pub is_enabled: bool,
    /// Whether scraper requires authentication.
    pub requires_auth: bool,
    /// Scraper implementation type.
    pub scraper_type: ScraperType,
    /// Overall health status.
    pub health_status: HealthStatus,
    /// DOM selector health (HTML scrapers only).
    pub selector_health: SelectorHealth,
    /// Success rate in last 24 hours (0.0 - 100.0).
    pub success_rate_24h: f64,
    /// Average execution duration in milliseconds.
    pub avg_duration_ms: Option<i64>,
    /// Timestamp of last successful run.
    pub last_success: Option<DateTime<Utc>>,
    /// Most recent error message.
    pub last_error: Option<String>,
    /// Total runs in last 24 hours.
    pub total_runs_24h: i32,
    /// Total jobs found in last 24 hours.
    pub jobs_found_24h: i32,
    /// Configured rate limit (requests per hour).
    pub rate_limit_per_hour: i32,
}

/// Per-scraper configuration and metadata.
///
/// Stored in `scraper_config` table.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScraperConfig {
    /// Internal scraper identifier.
    pub scraper_name: String,
    /// Human-readable name.
    pub display_name: String,
    /// Whether scraper is enabled.
    pub is_enabled: bool,
    /// Whether authentication is required.
    pub requires_auth: bool,
    /// Authentication type (e.g. "cookie", "api_key").
    pub auth_type: Option<String>,
    /// Scraper implementation type.
    pub scraper_type: ScraperType,
    /// Rate limit (requests per hour).
    pub rate_limit_per_hour: i32,
    /// DOM selector health status.
    pub selector_health: SelectorHealth,
    /// When selectors were last validated.
    pub last_selector_check: Option<DateTime<Utc>>,
    /// Admin notes about this scraper.
    pub notes: Option<String>,
}

/// Type of smoke test to perform.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SmokeTestType {
    /// Basic network connectivity check.
    Connectivity,
    /// HTML selector validation (HTML scrapers).
    Selector,
    /// Authentication validation.
    Auth,
    /// Rate limit check.
    RateLimit,
}

impl SmokeTestType {
    /// Convert to string representation.
    #[inline]
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Connectivity => "connectivity",
            Self::Selector => "selector",
            Self::Auth => "auth",
            Self::RateLimit => "rate_limit",
        }
    }
}

/// Result of a smoke test execution.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SmokeTestResult {
    /// Which scraper was tested.
    pub scraper_name: String,
    /// Type of test performed.
    pub test_type: SmokeTestType,
    /// Whether test passed.
    pub passed: bool,
    /// Test execution time in milliseconds.
    pub duration_ms: i64,
    /// Additional test-specific details (JSON).
    pub details: Option<serde_json::Value>,
    /// Error message if test failed.
    pub error: Option<String>,
}

/// Credential validation status.
///
/// Tracks expiry for time-limited credentials (e.g. LinkedIn cookies).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CredentialStatus {
    /// Working and not expiring soon (>30 days).
    Valid,
    /// Expiring soon (<30 days).
    Expiring,
    /// Past expiry date.
    Expired,
    /// Not yet validated.
    #[default]
    Unknown,
}

impl CredentialStatus {
    /// Parse from database string.
    #[inline]
    pub fn from_str(s: &str) -> Self {
        match s {
            "valid" => Self::Valid,
            "expiring" => Self::Expiring,
            "expired" => Self::Expired,
            "unknown" => Self::Unknown,
            _ => Self::Unknown,
        }
    }
}

/// Health information for a stored credential.
///
/// Tracks validation status and expiry for time-limited credentials
/// like LinkedIn session cookies.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CredentialHealth {
    /// Credential key (e.g. "linkedin_cookie").
    pub key: String,
    /// When credential was first stored.
    pub created_at: Option<DateTime<Utc>>,
    /// When credential was last validated.
    pub last_validated: Option<DateTime<Utc>>,
    /// When credential expires (if known).
    pub expires_at: Option<DateTime<Utc>>,
    /// Current validation status.
    pub status: CredentialStatus,
    /// Days remaining until expiry (negative if expired).
    pub days_until_expiry: Option<i64>,
}
