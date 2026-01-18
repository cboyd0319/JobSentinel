//! Health monitoring types

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Status of a scraper run
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RunStatus {
    Running,
    Success,
    Failure,
    Timeout,
}

impl RunStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Running => "running",
            Self::Success => "success",
            Self::Failure => "failure",
            Self::Timeout => "timeout",
        }
    }

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

/// Individual scraper run record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScraperRun {
    pub id: i64,
    pub scraper_name: String,
    pub started_at: DateTime<Utc>,
    pub finished_at: Option<DateTime<Utc>>,
    pub duration_ms: Option<i64>,
    pub status: RunStatus,
    pub jobs_found: i32,
    pub jobs_new: i32,
    pub error_message: Option<String>,
    pub error_code: Option<String>,
    pub retry_attempt: i32,
}

/// Overall health status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum HealthStatus {
    Healthy,  // Success in last 24h
    Degraded, // Success in last 7 days but not 24h
    Down,     // No success in 7 days
    Disabled, // Scraper disabled
    Unknown,  // No runs recorded yet
}

impl HealthStatus {
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

/// Selector health for HTML scrapers
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SelectorHealth {
    Healthy,  // All selectors working
    Degraded, // Some selectors failing
    Broken,   // All selectors failing
    Unknown,  // Not checked yet
}

impl SelectorHealth {
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

/// Scraper type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ScraperType {
    Api,
    Html,
    Rss,
    Graphql,
}

impl ScraperType {
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

/// Aggregated health metrics for a scraper
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScraperHealthMetrics {
    pub scraper_name: String,
    pub display_name: String,
    pub is_enabled: bool,
    pub requires_auth: bool,
    pub scraper_type: ScraperType,
    pub health_status: HealthStatus,
    pub selector_health: SelectorHealth,
    pub success_rate_24h: f64,
    pub avg_duration_ms: Option<i64>,
    pub last_success: Option<DateTime<Utc>>,
    pub last_error: Option<String>,
    pub total_runs_24h: i32,
    pub jobs_found_24h: i32,
    pub rate_limit_per_hour: i32,
}

/// Scraper configuration record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScraperConfig {
    pub scraper_name: String,
    pub display_name: String,
    pub is_enabled: bool,
    pub requires_auth: bool,
    pub auth_type: Option<String>,
    pub scraper_type: ScraperType,
    pub rate_limit_per_hour: i32,
    pub selector_health: SelectorHealth,
    pub last_selector_check: Option<DateTime<Utc>>,
    pub notes: Option<String>,
}

/// Smoke test type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SmokeTestType {
    Connectivity, // Can reach the API/site
    Selector,     // HTML selectors still work
    Auth,         // Authentication valid
    RateLimit,    // Not rate limited
}

impl SmokeTestType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Connectivity => "connectivity",
            Self::Selector => "selector",
            Self::Auth => "auth",
            Self::RateLimit => "rate_limit",
        }
    }
}

/// Smoke test result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SmokeTestResult {
    pub scraper_name: String,
    pub test_type: SmokeTestType,
    pub passed: bool,
    pub duration_ms: i64,
    pub details: Option<serde_json::Value>,
    pub error: Option<String>,
}

/// Credential validation status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CredentialStatus {
    Valid,    // Working and not expiring soon
    Expiring, // < 30 days left
    Expired,  // Past expiry date
    Unknown,  // Not yet validated
}

impl CredentialStatus {
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

/// Credential health information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CredentialHealth {
    pub key: String,
    pub created_at: Option<DateTime<Utc>>,
    pub last_validated: Option<DateTime<Utc>>,
    pub expires_at: Option<DateTime<Utc>>,
    pub status: CredentialStatus,
    pub days_until_expiry: Option<i64>,
}
