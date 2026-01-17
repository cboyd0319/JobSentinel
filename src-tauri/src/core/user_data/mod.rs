//! User Data Manager
//!
//! Handles persistence of user preferences and data that was previously stored in localStorage.
//! This includes cover letter templates, interview prep checklists, saved searches,
//! and notification preferences.
//!
//! ## Migration from localStorage
//!
//! On first access, the frontend can call the migration endpoint to transfer existing
//! localStorage data to SQLite.

use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, SqlitePool};
use tracing::{debug, instrument};
use uuid::Uuid;

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
struct TemplateRow {
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
struct PrepChecklistRow {
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
struct FollowUpRow {
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
struct SavedSearchRow {
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
                enabled: true,
                min_score_threshold: 70,
                sound_enabled: true,
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
struct NotificationPreferencesRow {
    global_enabled: i64,
    quiet_hours_enabled: i64,
    quiet_hours_start: String,
    quiet_hours_end: String,
    source_configs: String,
    advanced_filters: String,
}

/// User data manager for all user preferences
pub struct UserDataManager {
    pool: SqlitePool,
}

impl UserDataManager {
    /// Create a new user data manager
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    // ========== Cover Letter Templates ==========

    /// List all cover letter templates
    #[instrument(skip(self))]
    pub async fn list_templates(&self) -> Result<Vec<CoverLetterTemplate>, sqlx::Error> {
        debug!("Listing cover letter templates");

        let rows: Vec<TemplateRow> = sqlx::query_as(
            r#"
            SELECT id, name, content, category, created_at, updated_at
            FROM cover_letter_templates
            ORDER BY updated_at DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(Into::into).collect())
    }

    /// Get a single template by ID
    #[instrument(skip(self))]
    pub async fn get_template(&self, id: &str) -> Result<Option<CoverLetterTemplate>, sqlx::Error> {
        debug!("Getting template: {}", id);

        let row: Option<TemplateRow> = sqlx::query_as(
            r#"
            SELECT id, name, content, category, created_at, updated_at
            FROM cover_letter_templates
            WHERE id = ?
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(Into::into))
    }

    /// Create a new template
    #[instrument(skip(self, content))]
    pub async fn create_template(
        &self,
        name: &str,
        content: &str,
        category: TemplateCategory,
    ) -> Result<CoverLetterTemplate, sqlx::Error> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        let category_str = category.to_string();

        debug!("Creating template: {} ({})", name, category_str);

        sqlx::query(
            r#"
            INSERT INTO cover_letter_templates (id, name, content, category, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(name)
        .bind(content)
        .bind(&category_str)
        .bind(&now)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        Ok(CoverLetterTemplate {
            id,
            name: name.to_string(),
            content: content.to_string(),
            category,
            created_at: now.clone(),
            updated_at: now,
        })
    }

    /// Update an existing template
    #[instrument(skip(self, content))]
    pub async fn update_template(
        &self,
        id: &str,
        name: &str,
        content: &str,
        category: TemplateCategory,
    ) -> Result<Option<CoverLetterTemplate>, sqlx::Error> {
        let now = Utc::now().to_rfc3339();
        let category_str = category.to_string();

        debug!("Updating template: {} ({})", id, category_str);

        let result = sqlx::query(
            r#"
            UPDATE cover_letter_templates
            SET name = ?, content = ?, category = ?, updated_at = ?
            WHERE id = ?
            "#,
        )
        .bind(name)
        .bind(content)
        .bind(&category_str)
        .bind(&now)
        .bind(id)
        .execute(&self.pool)
        .await?;

        if result.rows_affected() == 0 {
            return Ok(None);
        }

        self.get_template(id).await
    }

    /// Delete a template
    #[instrument(skip(self))]
    pub async fn delete_template(&self, id: &str) -> Result<bool, sqlx::Error> {
        debug!("Deleting template: {}", id);

        let result = sqlx::query(
            r#"
            DELETE FROM cover_letter_templates WHERE id = ?
            "#,
        )
        .bind(id)
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    // ========== Interview Prep Checklists ==========

    /// Get prep checklist for an interview
    #[instrument(skip(self))]
    pub async fn get_prep_checklist(
        &self,
        interview_id: i64,
    ) -> Result<Vec<PrepChecklistItem>, sqlx::Error> {
        debug!("Getting prep checklist for interview: {}", interview_id);

        let rows: Vec<PrepChecklistRow> = sqlx::query_as(
            r#"
            SELECT item_id, completed, completed_at
            FROM interview_prep_checklists
            WHERE interview_id = ?
            "#,
        )
        .bind(interview_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(Into::into).collect())
    }

    /// Save prep checklist item
    #[instrument(skip(self))]
    pub async fn save_prep_item(
        &self,
        interview_id: i64,
        item_id: &str,
        completed: bool,
    ) -> Result<(), sqlx::Error> {
        debug!(
            "Saving prep item: {} for interview {} (completed: {})",
            item_id, interview_id, completed
        );

        let completed_at = if completed {
            Some(Utc::now().to_rfc3339())
        } else {
            None
        };
        let completed_int: i64 = if completed { 1 } else { 0 };

        sqlx::query(
            r#"
            INSERT INTO interview_prep_checklists (interview_id, item_id, completed, completed_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT (interview_id, item_id)
            DO UPDATE SET completed = ?, completed_at = ?
            "#,
        )
        .bind(interview_id)
        .bind(item_id)
        .bind(completed_int)
        .bind(&completed_at)
        .bind(completed_int)
        .bind(&completed_at)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    // ========== Interview Follow-ups ==========

    /// Get follow-up reminder for an interview
    #[instrument(skip(self))]
    pub async fn get_followup(
        &self,
        interview_id: i64,
    ) -> Result<Option<FollowUpReminder>, sqlx::Error> {
        debug!("Getting follow-up for interview: {}", interview_id);

        let row: Option<FollowUpRow> = sqlx::query_as(
            r#"
            SELECT interview_id, thank_you_sent, sent_at
            FROM interview_followups
            WHERE interview_id = ?
            "#,
        )
        .bind(interview_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(row.map(Into::into))
    }

    /// Save follow-up reminder
    #[instrument(skip(self))]
    pub async fn save_followup(
        &self,
        interview_id: i64,
        thank_you_sent: bool,
    ) -> Result<FollowUpReminder, sqlx::Error> {
        debug!(
            "Saving follow-up for interview: {} (sent: {})",
            interview_id, thank_you_sent
        );

        let sent_at = if thank_you_sent {
            Some(Utc::now().to_rfc3339())
        } else {
            None
        };
        let sent_int: i64 = if thank_you_sent { 1 } else { 0 };

        sqlx::query(
            r#"
            INSERT INTO interview_followups (interview_id, thank_you_sent, sent_at)
            VALUES (?, ?, ?)
            ON CONFLICT (interview_id)
            DO UPDATE SET thank_you_sent = ?, sent_at = ?
            "#,
        )
        .bind(interview_id)
        .bind(sent_int)
        .bind(&sent_at)
        .bind(sent_int)
        .bind(&sent_at)
        .execute(&self.pool)
        .await?;

        Ok(FollowUpReminder {
            interview_id,
            thank_you_sent,
            sent_at,
        })
    }

    // ========== Saved Searches ==========

    /// List all saved searches
    #[instrument(skip(self))]
    pub async fn list_saved_searches(&self) -> Result<Vec<SavedSearch>, sqlx::Error> {
        debug!("Listing saved searches");

        let rows: Vec<SavedSearchRow> = sqlx::query_as(
            r#"
            SELECT id, name, sort_by, score_filter, source_filter, remote_filter,
                   bookmark_filter, notes_filter, posted_date_filter, salary_min_filter,
                   salary_max_filter, ghost_filter, text_search, created_at, last_used_at
            FROM saved_searches
            ORDER BY last_used_at DESC NULLS LAST, created_at DESC
            "#,
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(Into::into).collect())
    }

    /// Create a saved search
    #[instrument(skip(self))]
    pub async fn create_saved_search(
        &self,
        search: SavedSearch,
    ) -> Result<SavedSearch, sqlx::Error> {
        let id = if search.id.is_empty() {
            Uuid::new_v4().to_string()
        } else {
            search.id.clone()
        };
        let now = Utc::now().to_rfc3339();

        debug!("Creating saved search: {} ({})", search.name, id);

        sqlx::query(
            r#"
            INSERT INTO saved_searches (
                id, name, sort_by, score_filter, source_filter, remote_filter,
                bookmark_filter, notes_filter, posted_date_filter, salary_min_filter,
                salary_max_filter, ghost_filter, text_search, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(&id)
        .bind(&search.name)
        .bind(&search.sort_by)
        .bind(&search.score_filter)
        .bind(&search.source_filter)
        .bind(&search.remote_filter)
        .bind(&search.bookmark_filter)
        .bind(&search.notes_filter)
        .bind(&search.posted_date_filter)
        .bind(search.salary_min_filter)
        .bind(search.salary_max_filter)
        .bind(&search.ghost_filter)
        .bind(&search.text_search)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        Ok(SavedSearch {
            id,
            created_at: now,
            last_used_at: None,
            ..search
        })
    }

    /// Mark a saved search as used (updates last_used_at)
    #[instrument(skip(self))]
    pub async fn use_saved_search(&self, id: &str) -> Result<bool, sqlx::Error> {
        let now = Utc::now().to_rfc3339();

        debug!("Using saved search: {}", id);

        let result = sqlx::query(
            r#"
            UPDATE saved_searches SET last_used_at = ? WHERE id = ?
            "#,
        )
        .bind(&now)
        .bind(id)
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    /// Delete a saved search
    #[instrument(skip(self))]
    pub async fn delete_saved_search(&self, id: &str) -> Result<bool, sqlx::Error> {
        debug!("Deleting saved search: {}", id);

        let result = sqlx::query(
            r#"
            DELETE FROM saved_searches WHERE id = ?
            "#,
        )
        .bind(id)
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected() > 0)
    }

    // ========== Search History ==========

    /// Add a query to search history
    #[instrument(skip(self))]
    pub async fn add_search_history(&self, query: &str) -> Result<(), sqlx::Error> {
        if query.trim().is_empty() || query.len() < 2 {
            return Ok(());
        }

        let now = Utc::now().to_rfc3339();

        debug!("Adding search history: {}", query);

        sqlx::query(
            r#"
            INSERT INTO search_history (query, use_count, last_used_at)
            VALUES (?, 1, ?)
            ON CONFLICT (query)
            DO UPDATE SET use_count = use_count + 1, last_used_at = ?
            "#,
        )
        .bind(query)
        .bind(&now)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    /// Get search history (most recent first)
    #[instrument(skip(self))]
    pub async fn get_search_history(&self, limit: i64) -> Result<Vec<String>, sqlx::Error> {
        debug!("Getting search history (limit: {})", limit);

        let rows: Vec<(String,)> = sqlx::query_as(
            r#"
            SELECT query FROM search_history
            ORDER BY last_used_at DESC
            LIMIT ?
            "#,
        )
        .bind(limit)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.into_iter().map(|(q,)| q).collect())
    }

    /// Clear search history
    #[instrument(skip(self))]
    pub async fn clear_search_history(&self) -> Result<(), sqlx::Error> {
        debug!("Clearing search history");

        sqlx::query("DELETE FROM search_history")
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    // ========== Notification Preferences ==========

    /// Get notification preferences
    #[instrument(skip(self))]
    pub async fn get_notification_preferences(
        &self,
    ) -> Result<NotificationPreferences, sqlx::Error> {
        debug!("Getting notification preferences");

        let row: Option<NotificationPreferencesRow> = sqlx::query_as(
            r#"
            SELECT global_enabled, quiet_hours_enabled, quiet_hours_start, quiet_hours_end,
                   source_configs, advanced_filters
            FROM notification_preferences
            WHERE id = 1
            "#,
        )
        .fetch_optional(&self.pool)
        .await?;

        match row {
            Some(r) => {
                // Parse source configs
                let source_configs: SourceConfigs =
                    serde_json::from_str(&r.source_configs).unwrap_or_default();

                // Parse advanced filters
                let advanced_filters: AdvancedFilters =
                    serde_json::from_str(&r.advanced_filters).unwrap_or_default();

                Ok(NotificationPreferences {
                    linkedin: source_configs.linkedin,
                    indeed: source_configs.indeed,
                    greenhouse: source_configs.greenhouse,
                    lever: source_configs.lever,
                    jobswithgpt: source_configs.jobswithgpt,
                    global: GlobalNotificationSettings {
                        enabled: r.global_enabled != 0,
                        quiet_hours_start: r.quiet_hours_start,
                        quiet_hours_end: r.quiet_hours_end,
                        quiet_hours_enabled: r.quiet_hours_enabled != 0,
                    },
                    advanced_filters,
                })
            }
            None => {
                // Insert defaults and return them
                let defaults = NotificationPreferences::default();
                self.save_notification_preferences(&defaults).await?;
                Ok(defaults)
            }
        }
    }

    /// Save notification preferences
    #[instrument(skip(self))]
    pub async fn save_notification_preferences(
        &self,
        prefs: &NotificationPreferences,
    ) -> Result<(), sqlx::Error> {
        debug!("Saving notification preferences");

        let source_configs = SourceConfigs {
            linkedin: prefs.linkedin.clone(),
            indeed: prefs.indeed.clone(),
            greenhouse: prefs.greenhouse.clone(),
            lever: prefs.lever.clone(),
            jobswithgpt: prefs.jobswithgpt.clone(),
        };

        let source_configs_json = serde_json::to_string(&source_configs)
            .map_err(|e| sqlx::Error::Protocol(format!("JSON serialization error: {}", e)))?;

        let advanced_filters_json = serde_json::to_string(&prefs.advanced_filters)
            .map_err(|e| sqlx::Error::Protocol(format!("JSON serialization error: {}", e)))?;

        let now = Utc::now().to_rfc3339();
        let global_enabled: i64 = if prefs.global.enabled { 1 } else { 0 };
        let quiet_hours_enabled: i64 = if prefs.global.quiet_hours_enabled {
            1
        } else {
            0
        };

        sqlx::query(
            r#"
            INSERT INTO notification_preferences (
                id, global_enabled, quiet_hours_enabled, quiet_hours_start, quiet_hours_end,
                source_configs, advanced_filters, updated_at
            ) VALUES (1, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (id)
            DO UPDATE SET
                global_enabled = ?,
                quiet_hours_enabled = ?,
                quiet_hours_start = ?,
                quiet_hours_end = ?,
                source_configs = ?,
                advanced_filters = ?,
                updated_at = ?
            "#,
        )
        .bind(global_enabled)
        .bind(quiet_hours_enabled)
        .bind(&prefs.global.quiet_hours_start)
        .bind(&prefs.global.quiet_hours_end)
        .bind(&source_configs_json)
        .bind(&advanced_filters_json)
        .bind(&now)
        .bind(global_enabled)
        .bind(quiet_hours_enabled)
        .bind(&prefs.global.quiet_hours_start)
        .bind(&prefs.global.quiet_hours_end)
        .bind(&source_configs_json)
        .bind(&advanced_filters_json)
        .bind(&now)
        .execute(&self.pool)
        .await?;

        Ok(())
    }

    // ========== Migration from localStorage ==========

    /// Import cover letter templates from localStorage format
    #[instrument(skip(self, templates))]
    pub async fn import_templates(
        &self,
        templates: Vec<CoverLetterTemplate>,
    ) -> Result<usize, sqlx::Error> {
        debug!("Importing {} cover letter templates", templates.len());

        let mut imported = 0;
        for template in templates {
            let category_str = template.category.to_string();
            let result = sqlx::query(
                r#"
                INSERT OR IGNORE INTO cover_letter_templates (id, name, content, category, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                "#,
            )
            .bind(&template.id)
            .bind(&template.name)
            .bind(&template.content)
            .bind(&category_str)
            .bind(&template.created_at)
            .bind(&template.updated_at)
            .execute(&self.pool)
            .await?;

            if result.rows_affected() > 0 {
                imported += 1;
            }
        }

        Ok(imported)
    }

    /// Import saved searches from localStorage format
    #[instrument(skip(self, searches))]
    pub async fn import_saved_searches(
        &self,
        searches: Vec<SavedSearch>,
    ) -> Result<usize, sqlx::Error> {
        debug!("Importing {} saved searches", searches.len());

        let mut imported = 0;
        for search in searches {
            let result = sqlx::query(
                r#"
                INSERT OR IGNORE INTO saved_searches (
                    id, name, sort_by, score_filter, source_filter, remote_filter,
                    bookmark_filter, notes_filter, posted_date_filter, salary_min_filter,
                    salary_max_filter, ghost_filter, text_search, created_at, last_used_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                "#,
            )
            .bind(&search.id)
            .bind(&search.name)
            .bind(&search.sort_by)
            .bind(&search.score_filter)
            .bind(&search.source_filter)
            .bind(&search.remote_filter)
            .bind(&search.bookmark_filter)
            .bind(&search.notes_filter)
            .bind(&search.posted_date_filter)
            .bind(search.salary_min_filter)
            .bind(search.salary_max_filter)
            .bind(&search.ghost_filter)
            .bind(&search.text_search)
            .bind(&search.created_at)
            .bind(&search.last_used_at)
            .execute(&self.pool)
            .await?;

            if result.rows_affected() > 0 {
                imported += 1;
            }
        }

        Ok(imported)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_template_category_display() {
        assert_eq!(TemplateCategory::General.to_string(), "general");
        assert_eq!(TemplateCategory::Tech.to_string(), "tech");
        assert_eq!(TemplateCategory::Custom.to_string(), "custom");
    }

    #[test]
    fn test_template_category_from_str() {
        assert_eq!(
            "general".parse::<TemplateCategory>().unwrap(),
            TemplateCategory::General
        );
        assert_eq!(
            "TECH".parse::<TemplateCategory>().unwrap(),
            TemplateCategory::Tech
        );
        assert!("invalid".parse::<TemplateCategory>().is_err());
    }

    #[test]
    fn test_notification_preferences_default() {
        let prefs = NotificationPreferences::default();
        assert!(prefs.global.enabled);
        assert!(!prefs.global.quiet_hours_enabled);
        assert_eq!(prefs.global.quiet_hours_start, "22:00");
        assert!(prefs.linkedin.enabled);
        assert_eq!(prefs.linkedin.min_score_threshold, 70);
    }

    #[test]
    fn test_advanced_filters_default() {
        let filters = AdvancedFilters::default();
        assert!(filters.include_keywords.is_empty());
        assert!(filters.exclude_keywords.is_empty());
        assert!(!filters.remote_only);
    }
}
