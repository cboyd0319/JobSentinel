//! Deep Link Types
//!
//! Types for generating pre-filled job search URLs.

use serde::{Deserialize, Serialize};

/// Search criteria for generating deep links
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchCriteria {
    /// Job title or keywords (e.g., "Software Engineer")
    pub query: String,
    /// Location (city, state, zip, or "remote")
    #[serde(skip_serializing_if = "Option::is_none")]
    pub location: Option<String>,
    /// Experience level filter
    #[serde(skip_serializing_if = "Option::is_none")]
    pub experience_level: Option<ExperienceLevel>,
    /// Job type filter
    #[serde(skip_serializing_if = "Option::is_none")]
    pub job_type: Option<JobType>,
    /// Remote/hybrid/onsite preference
    #[serde(skip_serializing_if = "Option::is_none")]
    pub remote_type: Option<RemoteType>,
}

/// Experience level for job searches
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ExperienceLevel {
    Internship,
    EntryLevel,
    MidLevel,
    Senior,
    Lead,
    Manager,
    Director,
    Executive,
}

/// Job type filter
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum JobType {
    FullTime,
    PartTime,
    Contract,
    Temporary,
    Internship,
    Volunteer,
}

/// Remote work type
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum RemoteType {
    Remote,
    Hybrid,
    Onsite,
}

/// A generated deep link to a job site
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeepLink {
    /// Site information
    pub site: SiteInfo,
    /// Generated URL with search parameters
    pub url: String,
}

/// Job site information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SiteInfo {
    /// Site identifier (e.g., "linkedin", "indeed")
    pub id: String,
    /// Display name (e.g., "LinkedIn")
    pub name: String,
    /// Site category
    pub category: SiteCategory,
    /// Whether the site requires login to view full results
    pub requires_login: bool,
    /// URL to site logo (optional)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub logo_url: Option<String>,
    /// Additional notes about the site
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
}

/// Job site category
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum SiteCategory {
    /// General job boards (Indeed, Monster, etc.)
    General,
    /// Tech-specific boards (Dice, Stack Overflow, etc.)
    Tech,
    /// Government job boards (USAJobs, GovernmentJobs, etc.)
    Government,
    /// Remote-specific boards (FlexJobs, We Work Remotely, etc.)
    Remote,
    /// Startup-focused boards (Wellfound/AngelList, YC, etc.)
    Startups,
    /// Cleared/security jobs (ClearanceJobs)
    Cleared,
    /// Professional networking (LinkedIn)
    Professional,
}

impl std::fmt::Display for SiteCategory {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::General => write!(f, "General"),
            Self::Tech => write!(f, "Tech"),
            Self::Government => write!(f, "Government"),
            Self::Remote => write!(f, "Remote"),
            Self::Startups => write!(f, "Startups"),
            Self::Cleared => write!(f, "Cleared"),
            Self::Professional => write!(f, "Professional"),
        }
    }
}
