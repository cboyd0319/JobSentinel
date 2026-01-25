//! Type-safe enums to replace boolean parameters
//!
//! Provides clear, self-documenting alternatives to boolean flags.

use serde::{Deserialize, Serialize};
use std::fmt;

// ============================================================================
// Work Location Types
// ============================================================================

/// Work location type (clearer than three separate booleans)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WorkLocationType {
    Remote,
    Hybrid,
    Onsite,
}

impl WorkLocationType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Remote => "remote",
            Self::Hybrid => "hybrid",
            Self::Onsite => "onsite",
        }
    }

    pub fn is_remote(&self) -> bool {
        matches!(self, Self::Remote)
    }

    pub fn is_hybrid(&self) -> bool {
        matches!(self, Self::Hybrid)
    }

    pub fn is_onsite(&self) -> bool {
        matches!(self, Self::Onsite)
    }
}

impl fmt::Display for WorkLocationType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

/// Work location preferences (replaces three booleans in LocationPreferences)
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct WorkLocationPreference {
    pub allowed_types: Vec<WorkLocationType>,
}

impl WorkLocationPreference {
    pub fn new(allowed_types: Vec<WorkLocationType>) -> Self {
        Self { allowed_types }
    }

    /// Allow all work locations
    pub fn all() -> Self {
        Self {
            allowed_types: vec![
                WorkLocationType::Remote,
                WorkLocationType::Hybrid,
                WorkLocationType::Onsite,
            ],
        }
    }

    /// Only remote work
    pub fn remote_only() -> Self {
        Self {
            allowed_types: vec![WorkLocationType::Remote],
        }
    }

    pub fn allows(&self, location_type: WorkLocationType) -> bool {
        self.allowed_types.contains(&location_type)
    }

    pub fn allows_remote(&self) -> bool {
        self.allows(WorkLocationType::Remote)
    }

    pub fn allows_hybrid(&self) -> bool {
        self.allows(WorkLocationType::Hybrid)
    }

    pub fn allows_onsite(&self) -> bool {
        self.allows(WorkLocationType::Onsite)
    }
}

// ============================================================================
// Notification Preferences
// ============================================================================

/// When to show notifications (clearer than show_when_focused boolean)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum NotificationTiming {
    Always,            // Show even when app is focused
    OnlyWhenUnfocused, // Only show when app is in background
}

impl NotificationTiming {
    pub fn should_show(&self, app_is_focused: bool) -> bool {
        match self {
            Self::Always => true,
            Self::OnlyWhenUnfocused => !app_is_focused,
        }
    }
}

/// Sound preference (clearer than play_sound boolean)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SoundPreference {
    Enabled,
    Disabled,
}

impl SoundPreference {
    pub fn is_enabled(&self) -> bool {
        matches!(self, Self::Enabled)
    }
}

// ============================================================================
// Scraper Configuration
// ============================================================================

/// Scraper enablement (clearer than enabled boolean)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ScraperState {
    Enabled,
    Disabled,
}

impl ScraperState {
    pub fn is_enabled(&self) -> bool {
        matches!(self, Self::Enabled)
    }
}

/// Remote job preference (clearer than remote_only boolean)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RemoteJobFilter {
    RemoteOnly,
    AllLocations,
}

impl RemoteJobFilter {
    pub fn is_remote_only(&self) -> bool {
        matches!(self, Self::RemoteOnly)
    }

    pub fn accepts(&self, is_remote: bool) -> bool {
        match self {
            Self::RemoteOnly => is_remote,
            Self::AllLocations => true,
        }
    }
}

// ============================================================================
// Email Configuration
// ============================================================================

/// SMTP encryption mode (clearer than use_starttls boolean)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SmtpEncryption {
    StartTls, // Port 587
    Ssl,      // Port 465
    None,     // Port 25 (not recommended)
}

impl SmtpEncryption {
    pub fn default_port(&self) -> u16 {
        match self {
            Self::StartTls => 587,
            Self::Ssl => 465,
            Self::None => 25,
        }
    }

    pub fn uses_starttls(&self) -> bool {
        matches!(self, Self::StartTls)
    }
}

// ============================================================================
// Job Visibility
// ============================================================================

/// Job visibility state (clearer than hidden boolean)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum JobVisibility {
    Visible,
    Hidden,
}

impl JobVisibility {
    pub fn is_visible(&self) -> bool {
        matches!(self, Self::Visible)
    }

    pub fn is_hidden(&self) -> bool {
        matches!(self, Self::Hidden)
    }
}

/// Job bookmark state (clearer than bookmarked boolean)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum BookmarkState {
    Bookmarked,
    NotBookmarked,
}

impl BookmarkState {
    pub fn is_bookmarked(&self) -> bool {
        matches!(self, Self::Bookmarked)
    }
}

// ============================================================================
// Resume Configuration
// ============================================================================

/// Resume matching mode (clearer than use_resume_matching boolean)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MatchingMode {
    ResumeBasedMatching, // Use actual resume skills
    KeywordMatching,     // Fallback to keywords
}

impl MatchingMode {
    pub fn uses_resume(&self) -> bool {
        matches!(self, Self::ResumeBasedMatching)
    }
}

// ============================================================================
// Salary Penalty Configuration
// ============================================================================

/// Missing salary penalty mode (clearer than penalize_missing_salary boolean)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MissingSalaryPenalty {
    Penalize,   // Score 0.3 for missing salary
    NoFilter, // Score 0.5 (neutral) for missing salary
}

impl MissingSalaryPenalty {
    pub fn should_penalize(&self) -> bool {
        matches!(self, Self::Penalize)
    }

    pub fn default_score(&self) -> f64 {
        match self {
            Self::Penalize => 0.3,
            Self::NoFilter => 0.5,
        }
    }
}

// ============================================================================
// Alert Status
// ============================================================================

/// Alert sent status (clearer than immediate_alert_sent boolean)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AlertStatus {
    Sent,
    NotSent,
}

impl AlertStatus {
    pub fn is_sent(&self) -> bool {
        matches!(self, Self::Sent)
    }
}

/// Digest inclusion status (clearer than included_in_digest boolean)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DigestStatus {
    Included,
    NotIncluded,
}

impl DigestStatus {
    pub fn is_included(&self) -> bool {
        matches!(self, Self::Included)
    }
}

// ============================================================================
// Interview Status
// ============================================================================

/// Interview completion status (clearer than completed boolean)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum InterviewStatus {
    Completed,
    Scheduled,
}

impl InterviewStatus {
    pub fn is_completed(&self) -> bool {
        matches!(self, Self::Completed)
    }
}

// ============================================================================
// Resume Active Status
// ============================================================================

/// Resume active state (clearer than is_active boolean)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ResumeStatus {
    Active,
    Inactive,
}

impl ResumeStatus {
    pub fn is_active(&self) -> bool {
        matches!(self, Self::Active)
    }
}

// ============================================================================
// Skill Requirement Level
// ============================================================================

/// Skill requirement level (clearer than is_required boolean)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SkillRequirement {
    Required,
    Preferred,
    Optional,
}

impl SkillRequirement {
    pub fn is_required(&self) -> bool {
        matches!(self, Self::Required)
    }

    pub fn is_preferred(&self) -> bool {
        matches!(self, Self::Preferred)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_work_location_preference() {
        let remote_only = WorkLocationPreference::remote_only();
        assert!(remote_only.allows_remote());
        assert!(!remote_only.allows_hybrid());
        assert!(!remote_only.allows_onsite());

        let all = WorkLocationPreference::all();
        assert!(all.allows_remote());
        assert!(all.allows_hybrid());
        assert!(all.allows_onsite());
    }

    #[test]
    fn test_notification_timing() {
        let always = NotificationTiming::Always;
        assert!(always.should_show(true));
        assert!(always.should_show(false));

        let unfocused = NotificationTiming::OnlyWhenUnfocused;
        assert!(!unfocused.should_show(true));
        assert!(unfocused.should_show(false));
    }

    #[test]
    fn test_remote_job_filter() {
        let remote_only = RemoteJobFilter::RemoteOnly;
        assert!(remote_only.accepts(true));
        assert!(!remote_only.accepts(false));

        let all = RemoteJobFilter::AllLocations;
        assert!(all.accepts(true));
        assert!(all.accepts(false));
    }

    #[test]
    fn test_smtp_encryption() {
        assert_eq!(SmtpEncryption::StartTls.default_port(), 587);
        assert_eq!(SmtpEncryption::Ssl.default_port(), 465);
        assert_eq!(SmtpEncryption::None.default_port(), 25);

        assert!(SmtpEncryption::StartTls.uses_starttls());
        assert!(!SmtpEncryption::Ssl.uses_starttls());
    }

    #[test]
    fn test_missing_salary_penalty() {
        let penalize = MissingSalaryPenalty::Penalize;
        assert!(penalize.should_penalize());
        assert_eq!(penalize.default_score(), 0.3);

        let no_filter = MissingSalaryPenalty::NoFilter;
        assert!(!no_filter.should_penalize());
        assert_eq!(no_filter.default_score(), 0.5);
    }

    #[test]
    fn test_skill_requirement() {
        let required = SkillRequirement::Required;
        assert!(required.is_required());
        assert!(!required.is_preferred());

        let preferred = SkillRequirement::Preferred;
        assert!(!preferred.is_required());
        assert!(preferred.is_preferred());
    }
}
