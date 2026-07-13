//! Strong type wrappers for type safety
//!
//! This module provides newtype wrappers for IDs and other values that should not be mixed up.

pub mod enums;
mod retry;

use serde::{Deserialize, Serialize};
use std::fmt;

// Re-export enums
pub use enums::*;
pub use retry::RetryAttempt;

// ============================================================================
// ID Types - Prevent mixing up different entity IDs
// ============================================================================

/// Job ID (primary key in jobs table)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct JobId(pub i64);

impl From<i64> for JobId {
    #[inline]
    fn from(id: i64) -> Self {
        Self(id)
    }
}

impl From<JobId> for i64 {
    #[inline]
    fn from(id: JobId) -> Self {
        id.0
    }
}

impl fmt::Display for JobId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// Application ID (primary key in applications table)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct ApplicationId(pub i64);

impl From<i64> for ApplicationId {
    #[inline]
    fn from(id: i64) -> Self {
        Self(id)
    }
}

impl From<ApplicationId> for i64 {
    #[inline]
    fn from(id: ApplicationId) -> Self {
        id.0
    }
}

impl fmt::Display for ApplicationId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// Resume ID (primary key in resumes table)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct ResumeId(pub i64);

impl From<i64> for ResumeId {
    #[inline]
    fn from(id: i64) -> Self {
        Self(id)
    }
}

impl From<ResumeId> for i64 {
    #[inline]
    fn from(id: ResumeId) -> Self {
        id.0
    }
}

impl fmt::Display for ResumeId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// Interview ID (primary key in interviews table)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct InterviewId(pub i64);

impl From<i64> for InterviewId {
    #[inline]
    fn from(id: i64) -> Self {
        Self(id)
    }
}

impl From<InterviewId> for i64 {
    #[inline]
    fn from(id: InterviewId) -> Self {
        id.0
    }
}

impl fmt::Display for InterviewId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

// ============================================================================
// Hash Types - Content-based identifiers
// ============================================================================

/// Job hash (SHA-256 for deduplication)
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct JobHash(pub String);

impl JobHash {
    /// Create a new JobHash with validation
    pub fn new(hash: String) -> anyhow::Result<Self> {
        // SHA-256 hashes are always 64 hex characters
        if hash.len() != 64 {
            anyhow::bail!("Invalid job hash length: expected 64, got {}", hash.len());
        }
        if !hash.chars().all(|c| c.is_ascii_hexdigit()) {
            anyhow::bail!("Invalid job hash: contains non-hex characters");
        }
        Ok(Self(hash))
    }

    /// Create from string without validation (for database reads)
    #[inline]
    pub fn unchecked(hash: String) -> Self {
        Self(hash)
    }

    #[inline]
    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl fmt::Display for JobHash {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl AsRef<str> for JobHash {
    fn as_ref(&self) -> &str {
        &self.0
    }
}

// ============================================================================
// Monetary Types - Prevent salary/price confusion
// ============================================================================

/// Salary amount in USD (prevents mixing with other numeric values)
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Salary(pub i64);

impl Salary {
    #[inline]
    pub fn new(amount: i64) -> Self {
        Self(amount)
    }

    #[inline]
    pub fn amount(&self) -> i64 {
        self.0
    }

    /// Format as currency (e.g., "$120,000")
    pub fn format(&self) -> String {
        format!("${:}", self.0)
    }
}

impl From<i64> for Salary {
    #[inline]
    fn from(amount: i64) -> Self {
        Self(amount)
    }
}

impl From<Salary> for i64 {
    #[inline]
    fn from(salary: Salary) -> Self {
        salary.0
    }
}

impl fmt::Display for Salary {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.format())
    }
}

// ============================================================================
// Score Types - Prevent mixing different score types
// ============================================================================

/// Match score (0.0 - 1.0)
#[derive(Debug, Clone, Copy, PartialEq, PartialOrd, Serialize, Deserialize)]
#[serde(transparent)]
pub struct MatchScore(pub f64);

impl MatchScore {
    /// Create a new MatchScore with validation
    pub fn new(score: f64) -> anyhow::Result<Self> {
        if !(0.0..=1.0).contains(&score) {
            anyhow::bail!("Match score must be between 0.0 and 1.0, got {}", score);
        }
        Ok(Self(score))
    }

    /// Create from f64 without validation (for database reads)
    #[inline]
    pub fn unchecked(score: f64) -> Self {
        Self(score)
    }

    #[inline]
    pub fn value(&self) -> f64 {
        self.0
    }

    /// Format as percentage (e.g., "75%")
    pub fn as_percentage(&self) -> String {
        format!("{:.0}%", self.0 * 100.0)
    }
}

impl From<f64> for MatchScore {
    #[inline]
    fn from(score: f64) -> Self {
        Self(score)
    }
}

impl From<MatchScore> for f64 {
    #[inline]
    fn from(score: MatchScore) -> Self {
        score.0
    }
}

impl fmt::Display for MatchScore {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.as_percentage())
    }
}

/// Ghost score (0.0 = real, 1.0 = ghost)
#[derive(Debug, Clone, Copy, PartialEq, PartialOrd, Serialize, Deserialize)]
#[serde(transparent)]
pub struct GhostScore(pub f64);

impl GhostScore {
    /// Create a new GhostScore with validation
    pub fn new(score: f64) -> anyhow::Result<Self> {
        if !(0.0..=1.0).contains(&score) {
            anyhow::bail!("Ghost score must be between 0.0 and 1.0, got {}", score);
        }
        Ok(Self(score))
    }

    /// Create from f64 without validation (for database reads)
    #[inline]
    pub fn unchecked(score: f64) -> Self {
        Self(score)
    }

    #[inline]
    pub fn value(&self) -> f64 {
        self.0
    }

    /// Check if this is likely a ghost job (>= 0.5)
    #[inline]
    pub fn is_likely_ghost(&self) -> bool {
        self.0 >= 0.5
    }

    /// Check if this is a warning (0.3-0.5)
    #[inline]
    pub fn is_warning(&self) -> bool {
        self.0 >= 0.3 && self.0 < 0.5
    }
}

impl From<f64> for GhostScore {
    #[inline]
    fn from(score: f64) -> Self {
        Self(score)
    }
}

impl From<GhostScore> for f64 {
    #[inline]
    fn from(score: GhostScore) -> Self {
        score.0
    }
}

// ============================================================================
// Duration Types - Explicit units
// ============================================================================

/// Duration in milliseconds
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Milliseconds(pub i64);

impl Milliseconds {
    #[inline]
    pub fn new(ms: i64) -> Self {
        Self(ms)
    }

    #[inline]
    pub fn value(&self) -> i64 {
        self.0
    }

    /// Convert to seconds
    #[inline]
    pub fn as_seconds(&self) -> f64 {
        self.0 as f64 / 1000.0
    }
}

impl From<i64> for Milliseconds {
    #[inline]
    fn from(ms: i64) -> Self {
        Self(ms)
    }
}

impl From<Milliseconds> for i64 {
    #[inline]
    fn from(ms: Milliseconds) -> Self {
        ms.0
    }
}

/// Duration in minutes
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Minutes(pub u32);

impl Minutes {
    #[inline]
    pub fn new(minutes: u32) -> Self {
        Self(minutes)
    }

    #[inline]
    pub fn value(&self) -> u32 {
        self.0
    }

    /// Convert to hours
    #[inline]
    pub fn as_hours(&self) -> f64 {
        self.0 as f64 / 60.0
    }
}

impl From<u32> for Minutes {
    #[inline]
    fn from(minutes: u32) -> Self {
        Self(minutes)
    }
}

impl From<Minutes> for u32 {
    #[inline]
    fn from(minutes: Minutes) -> Self {
        minutes.0
    }
}

/// Duration in hours
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Hours(pub u64);

impl Hours {
    #[inline]
    pub fn new(hours: u64) -> Self {
        Self(hours)
    }

    #[inline]
    pub fn value(&self) -> u64 {
        self.0
    }

    /// Convert to days
    #[inline]
    pub fn as_days(&self) -> f64 {
        self.0 as f64 / 24.0
    }
}

impl From<u64> for Hours {
    #[inline]
    fn from(hours: u64) -> Self {
        Self(hours)
    }
}

impl From<Hours> for u64 {
    #[inline]
    fn from(hours: Hours) -> Self {
        hours.0
    }
}

// ============================================================================
// Count Types - Explicit semantics
// ============================================================================

/// Result limit for queries
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(transparent)]
pub struct Limit(pub usize);

impl Limit {
    #[inline]
    pub fn new(limit: usize) -> Self {
        Self(limit)
    }

    #[inline]
    pub fn value(&self) -> usize {
        self.0
    }
}

impl From<usize> for Limit {
    #[inline]
    fn from(limit: usize) -> Self {
        Self(limit)
    }
}

impl From<Limit> for usize {
    #[inline]
    fn from(limit: Limit) -> Self {
        limit.0
    }
}

#[cfg(test)]
mod tests;
