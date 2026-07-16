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
mod models;
mod notifications;
mod template_store;

use sqlx::SqlitePool;
use tracing::{debug, instrument};
use uuid::Uuid;

pub use models::{
    AdvancedFilters, CoverLetterTemplate, FollowUpReminder, GlobalNotificationSettings,
    NotificationPreferences, PrepChecklistItem, SavedSearch, SourceConfigs,
    SourceNotificationConfig, TemplateCategory,
};

use models::{
    disable_linkedin_notification_source, notification_preferences_serialization_error,
    FollowUpRow, NotificationPreferencesRow, PrepChecklistRow, SavedSearchRow,
};

/// User data manager for all user preferences
pub struct UserDataManager {
    pool: SqlitePool,
}

impl UserDataManager {
    /// Create a new user data manager
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
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
    #[instrument(skip(self, search))]
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

        debug!(
            id = %id,
            name_len = search.name.chars().count(),
            has_text_search = search
                .text_search
                .as_ref()
                .is_some_and(|text| !text.trim().is_empty()),
            "Creating saved search"
        );

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
    #[instrument(skip(self, query))]
    pub async fn add_search_history(&self, query: &str) -> Result<(), sqlx::Error> {
        if query.trim().is_empty() || query.len() < 2 {
            return Ok(());
        }

        let now = Utc::now().to_rfc3339();

        debug!(query_len = query.chars().count(), "Adding search history");

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
mod tests;
