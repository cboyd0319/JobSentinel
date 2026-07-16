use super::*;

impl UserDataManager {
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
}
