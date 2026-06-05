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
    FollowUpRow, NotificationPreferencesRow, PrepChecklistRow, SavedSearchRow, TemplateRow,
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
    #[instrument(skip(self, name, content))]
    pub async fn create_template(
        &self,
        name: &str,
        content: &str,
        category: TemplateCategory,
    ) -> Result<CoverLetterTemplate, sqlx::Error> {
        let id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        let category_str = category.to_string();

        debug!(
            name_len = name.chars().count(),
            category = %category_str,
            "Creating template"
        );

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
    #[instrument(skip(self, name, content))]
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
                    linkedin: disable_linkedin_notification_source(source_configs.linkedin),
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
    #[instrument(skip(self, prefs))]
    pub async fn save_notification_preferences(
        &self,
        prefs: &NotificationPreferences,
    ) -> Result<(), sqlx::Error> {
        debug!("Saving notification preferences");

        let source_configs = SourceConfigs {
            linkedin: disable_linkedin_notification_source(prefs.linkedin.clone()),
            indeed: prefs.indeed.clone(),
            greenhouse: prefs.greenhouse.clone(),
            lever: prefs.lever.clone(),
            jobswithgpt: prefs.jobswithgpt.clone(),
        };

        let source_configs_json = serde_json::to_string(&source_configs)
            .map_err(|_| notification_preferences_serialization_error())?;

        let advanced_filters_json = serde_json::to_string(&prefs.advanced_filters)
            .map_err(|_| notification_preferences_serialization_error())?;

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

    /// Seed default templates if none exist
    /// Called on first app launch to provide starter templates
    #[instrument(skip(self))]
    pub async fn seed_default_templates(&self) -> Result<usize, sqlx::Error> {
        // Check if any templates already exist
        let existing: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM cover_letter_templates")
            .fetch_one(&self.pool)
            .await?;

        if existing.0 > 0 {
            debug!("Templates already exist, skipping seed");
            return Ok(0);
        }

        debug!("Seeding default templates");
        let mut seeded = 0;

        // Default Cover Letter Templates
        let defaults = vec![
            (
                "Professional Cover Letter",
                TemplateCategory::General,
                r#"Dear {hiring_manager},

I am writing to express my strong interest in the {position} position at {company}. With {years_experience} years of experience in {skill1} and a proven track record of delivering results, I am confident I would be a valuable addition to your team.

In my current role, I have developed expertise in {skill1} and {skill2}, consistently exceeding expectations and driving measurable outcomes. I am particularly drawn to {company}'s commitment to innovation and believe my background aligns well with your team's goals.

I would welcome the opportunity to discuss how my skills and experiences can contribute to {company}'s continued success. Thank you for considering my application.

Best regards,
{your_name}"#,
            ),
            (
                "Care Coordination Cover Letter",
                TemplateCategory::Healthcare,
                r#"Dear {hiring_manager},

I am excited to apply for the {position} role at {company}. With {years_experience} years of experience supporting people through {skill1} and {skill2}, I am eager to bring calm coordination and dependable follow-through to your team.

Throughout my career, I have:
• Coordinated schedules, follow-up steps, and service updates across busy teams
• Supported clients and coworkers with clear communication and organized records
• Helped improve daily workflows so people received timely, consistent support

I am particularly impressed by {company}'s commitment to helping people and keeping services organized. I would love to contribute to your mission.

Looking forward to discussing how I can add value to your team.

Best regards,
{your_name}"#,
            ),
            (
                "Thank You - Post Interview",
                TemplateCategory::ThankYou,
                r#"Dear {hiring_manager},

Thank you for taking the time to meet with me today to discuss the {position} role at {company}. I thoroughly enjoyed our conversation and learning more about the team's goals and challenges.

Our discussion reinforced my enthusiasm for this opportunity. I was particularly excited to hear about [specific topic discussed] and believe my experience in {skill1} would allow me to make an immediate impact.

Please don't hesitate to reach out if you need any additional information. I look forward to the possibility of joining {company}.

Best regards,
{your_name}"#,
            ),
            (
                "Application Follow-Up",
                TemplateCategory::FollowUp,
                r#"Dear {hiring_manager},

I hope this message finds you well. I wanted to follow up on my application for the {position} position at {company}, which I submitted on {date}.

I remain very interested in this opportunity and believe my experience in {skill1} and {skill2} would make me a strong fit for your team. I understand you are likely reviewing many qualified candidates, but I wanted to reiterate my enthusiasm for the role.

If you need any additional information or would like to schedule a conversation, I am happy to accommodate your schedule.

Thank you for your consideration.

Best regards,
{your_name}"#,
            ),
            (
                "Interview Follow-Up (No Response)",
                TemplateCategory::FollowUp,
                r#"Dear {hiring_manager},

I wanted to follow up on our interview for the {position} position on {date}. I truly enjoyed our discussion about {company}'s vision and the team's projects.

I remain very interested in this opportunity and wanted to check in on the status of the hiring process. Please let me know if there's any additional information I can provide to support your decision.

Thank you again for considering my application. I look forward to hearing from you.

Best regards,
{your_name}"#,
            ),
            (
                "Withdraw Application",
                TemplateCategory::Withdrawal,
                r#"Dear {hiring_manager},

I hope this message finds you well. After careful consideration, I have decided to withdraw my application for the {position} position at {company}.

I want to express my sincere gratitude for your time and the opportunity to learn more about your team. This was not an easy decision, but I have accepted another opportunity that aligns more closely with my career goals at this time.

I have great respect for {company} and hope our paths may cross again in the future. Thank you again for your consideration.

Best regards,
{your_name}"#,
            ),
        ];

        for (name, category, content) in defaults {
            if let Err(e) = self.create_template(name, content, category).await {
                debug!("Failed to create template '{}': {}", name, e);
            } else {
                seeded += 1;
            }
        }

        debug!("Seeded {} default templates", seeded);
        Ok(seeded)
    }
}

#[cfg(test)]
mod tests;
