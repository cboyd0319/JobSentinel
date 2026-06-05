use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// Cover letter template categories
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TemplateCategory {
    General,
    Tech,
    Creative,
    Finance,
    Healthcare,
    Sales,
    Custom,
    // Email templates (v2.5.5+)
    ThankYou,
    FollowUp,
    Withdrawal,
}

impl Default for TemplateCategory {
    fn default() -> Self {
        Self::General
    }
}

impl std::fmt::Display for TemplateCategory {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::General => write!(f, "general"),
            Self::Tech => write!(f, "tech"),
            Self::Creative => write!(f, "creative"),
            Self::Finance => write!(f, "finance"),
            Self::Healthcare => write!(f, "healthcare"),
            Self::Sales => write!(f, "sales"),
            Self::Custom => write!(f, "custom"),
            Self::ThankYou => write!(f, "thankyou"),
            Self::FollowUp => write!(f, "followup"),
            Self::Withdrawal => write!(f, "withdrawal"),
        }
    }
}

impl std::str::FromStr for TemplateCategory {
    type Err = String;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "general" => Ok(Self::General),
            "tech" => Ok(Self::Tech),
            "creative" => Ok(Self::Creative),
            "finance" => Ok(Self::Finance),
            "healthcare" => Ok(Self::Healthcare),
            "sales" => Ok(Self::Sales),
            "custom" => Ok(Self::Custom),
            "thankyou" | "thank_you" | "thank-you" => Ok(Self::ThankYou),
            "followup" | "follow_up" | "follow-up" => Ok(Self::FollowUp),
            "withdrawal" => Ok(Self::Withdrawal),
            _ => Err(format!("Unknown category: {}", s)),
        }
    }
}

/// Cover letter template
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CoverLetterTemplate {
    pub id: String,
    pub name: String,
    pub content: String,
    pub category: TemplateCategory,
    pub created_at: String,
    pub updated_at: String,
}

/// Database row for cover letter template
#[derive(Debug, Clone, FromRow)]
pub(super) struct TemplateRow {
    id: String,
    name: String,
    content: String,
    category: String,
    created_at: String,
    updated_at: String,
}

impl From<TemplateRow> for CoverLetterTemplate {
    fn from(row: TemplateRow) -> Self {
        Self {
            id: row.id,
            name: row.name,
            content: row.content,
            category: row.category.parse().unwrap_or_default(),
            created_at: row.created_at,
            updated_at: row.updated_at,
        }
    }
}

/// Interview prep checklist item
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrepChecklistItem {
    pub item_id: String,
    pub completed: bool,
    pub completed_at: Option<String>,
}

/// Database row for prep checklist
#[derive(Debug, Clone, FromRow)]
pub(super) struct PrepChecklistRow {
    item_id: String,
    completed: i64,
    completed_at: Option<String>,
}

impl From<PrepChecklistRow> for PrepChecklistItem {
    fn from(row: PrepChecklistRow) -> Self {
        Self {
            item_id: row.item_id,
            completed: row.completed != 0,
            completed_at: row.completed_at,
        }
    }
}

/// Interview follow-up reminder
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FollowUpReminder {
    pub interview_id: i64,
    pub thank_you_sent: bool,
    pub sent_at: Option<String>,
}

/// Database row for follow-up
#[derive(Debug, Clone, FromRow)]
pub(super) struct FollowUpRow {
    interview_id: i64,
    thank_you_sent: i64,
    sent_at: Option<String>,
}

impl From<FollowUpRow> for FollowUpReminder {
    fn from(row: FollowUpRow) -> Self {
        Self {
            interview_id: row.interview_id,
            thank_you_sent: row.thank_you_sent != 0,
            sent_at: row.sent_at,
        }
    }
}

/// Saved search filter configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedSearch {
    pub id: String,
    pub name: String,
    pub sort_by: String,
    pub score_filter: String,
    pub source_filter: String,
    pub remote_filter: String,
    pub bookmark_filter: String,
    pub notes_filter: String,
    pub posted_date_filter: Option<String>,
    pub salary_min_filter: Option<i64>,
    pub salary_max_filter: Option<i64>,
    pub ghost_filter: Option<String>,
    pub text_search: Option<String>,
    pub created_at: String,
    pub last_used_at: Option<String>,
}

/// Database row for saved search
#[derive(Debug, Clone, FromRow)]
pub(super) struct SavedSearchRow {
    id: String,
    name: String,
    sort_by: String,
    score_filter: String,
    source_filter: String,
    remote_filter: String,
    bookmark_filter: String,
    notes_filter: String,
    posted_date_filter: Option<String>,
    salary_min_filter: Option<i64>,
    salary_max_filter: Option<i64>,
    ghost_filter: Option<String>,
    text_search: Option<String>,
    created_at: String,
    last_used_at: Option<String>,
}

impl From<SavedSearchRow> for SavedSearch {
    fn from(row: SavedSearchRow) -> Self {
        Self {
            id: row.id,
            name: row.name,
            sort_by: row.sort_by,
            score_filter: row.score_filter,
            source_filter: row.source_filter,
            remote_filter: row.remote_filter,
            bookmark_filter: row.bookmark_filter,
            notes_filter: row.notes_filter,
            posted_date_filter: row.posted_date_filter,
            salary_min_filter: row.salary_min_filter,
            salary_max_filter: row.salary_max_filter,
            ghost_filter: row.ghost_filter,
            text_search: row.text_search,
            created_at: row.created_at,
            last_used_at: row.last_used_at,
        }
    }
}

/// Source-specific notification config
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SourceNotificationConfig {
    pub enabled: bool,
    pub min_score_threshold: i32,
    pub sound_enabled: bool,
}

/// Advanced notification filters
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AdvancedFilters {
    pub include_keywords: Vec<String>,
    pub exclude_keywords: Vec<String>,
    pub min_salary: Option<i64>,
    pub remote_only: bool,
    pub company_whitelist: Vec<String>,
    pub company_blacklist: Vec<String>,
}

impl Default for AdvancedFilters {
    fn default() -> Self {
        Self {
            include_keywords: Vec::new(),
            exclude_keywords: Vec::new(),
            min_salary: None,
            remote_only: false,
            company_whitelist: Vec::new(),
            company_blacklist: Vec::new(),
        }
    }
}

/// Global notification settings
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GlobalNotificationSettings {
    pub enabled: bool,
    pub quiet_hours_start: String,
    pub quiet_hours_end: String,
    pub quiet_hours_enabled: bool,
}

impl Default for GlobalNotificationSettings {
    fn default() -> Self {
        Self {
            enabled: true,
            quiet_hours_start: "22:00".to_string(),
            quiet_hours_end: "08:00".to_string(),
            quiet_hours_enabled: false,
        }
    }
}

/// All source configs combined
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SourceConfigs {
    pub linkedin: SourceNotificationConfig,
    pub indeed: SourceNotificationConfig,
    pub greenhouse: SourceNotificationConfig,
    pub lever: SourceNotificationConfig,
    pub jobswithgpt: SourceNotificationConfig,
}

impl Default for SourceConfigs {
    fn default() -> Self {
        Self {
            linkedin: SourceNotificationConfig {
                enabled: false,
                min_score_threshold: 70,
                sound_enabled: false,
            },
            indeed: SourceNotificationConfig {
                enabled: true,
                min_score_threshold: 70,
                sound_enabled: true,
            },
            greenhouse: SourceNotificationConfig {
                enabled: true,
                min_score_threshold: 80,
                sound_enabled: true,
            },
            lever: SourceNotificationConfig {
                enabled: true,
                min_score_threshold: 80,
                sound_enabled: true,
            },
            jobswithgpt: SourceNotificationConfig {
                enabled: true,
                min_score_threshold: 75,
                sound_enabled: true,
            },
        }
    }
}

pub(super) fn disable_linkedin_notification_source(
    config: SourceNotificationConfig,
) -> SourceNotificationConfig {
    SourceNotificationConfig {
        enabled: false,
        sound_enabled: false,
        ..config
    }
}

/// Notification preferences (combines all settings)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationPreferences {
    pub linkedin: SourceNotificationConfig,
    pub indeed: SourceNotificationConfig,
    pub greenhouse: SourceNotificationConfig,
    pub lever: SourceNotificationConfig,
    pub jobswithgpt: SourceNotificationConfig,
    pub global: GlobalNotificationSettings,
    pub advanced_filters: AdvancedFilters,
}

pub(super) fn notification_preferences_serialization_error() -> sqlx::Error {
    sqlx::Error::Protocol("Could not save notification preferences".to_string())
}

impl Default for NotificationPreferences {
    fn default() -> Self {
        let defaults = SourceConfigs::default();
        Self {
            linkedin: defaults.linkedin,
            indeed: defaults.indeed,
            greenhouse: defaults.greenhouse,
            lever: defaults.lever,
            jobswithgpt: defaults.jobswithgpt,
            global: GlobalNotificationSettings::default(),
            advanced_filters: AdvancedFilters::default(),
        }
    }
}

/// Database row for notification preferences
#[derive(Debug, Clone, FromRow)]
pub(super) struct NotificationPreferencesRow {
    pub(super) global_enabled: i64,
    pub(super) quiet_hours_enabled: i64,
    pub(super) quiet_hours_start: String,
    pub(super) quiet_hours_end: String,
    pub(super) source_configs: String,
    pub(super) advanced_filters: String,
}
