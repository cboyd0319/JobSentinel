//! Verifies user-data types and atomic Settings-record restore behavior.

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
    assert!(!prefs.linkedin.enabled);
    assert!(!prefs.linkedin.sound_enabled);
    assert_eq!(prefs.linkedin.min_score_threshold, 70);
}

#[test]
fn test_notification_preferences_serialization_error_is_safe() {
    let error = notification_preferences_serialization_error().to_string();

    assert!(error.contains("Could not save notification preferences"));
    assert!(!error.contains("JSON serialization error"));
    assert!(!error.contains("secret"));
    assert!(!error.contains("favoriteCompanies"));
}

#[test]
fn test_linkedin_notification_source_forced_disabled() {
    let config = disable_linkedin_notification_source(SourceNotificationConfig {
        enabled: true,
        min_score_threshold: 95,
        sound_enabled: true,
    });

    assert!(!config.enabled);
    assert!(!config.sound_enabled);
    assert_eq!(config.min_score_threshold, 95);
}

#[test]
fn test_advanced_filters_default() {
    let filters = AdvancedFilters::default();
    assert!(filters.include_keywords.is_empty());
    assert!(filters.exclude_keywords.is_empty());
    assert!(!filters.remote_only);
}

fn canonical_filters() -> serde_json::Value {
    serde_json::json!({
        "includeKeywords": ["care"], "excludeKeywords": ["sales"],
        "minSalary": 70000, "remoteOnly": true,
        "includedCompanies": ["CareBridge"], "excludedCompanies": ["AvoidMe"]
    })
}

fn invalid_filters() -> Vec<serde_json::Value> {
    let mut invalid = Vec::new();
    for (retired, current) in [
        ("companyWhitelist", "includedCompanies"),
        ("companyBlacklist", "excludedCompanies"),
    ] {
        for mixed in [false, true] {
            let mut value = canonical_filters();
            if !mixed {
                value.as_object_mut().unwrap().remove(current);
            }
            value[retired] = serde_json::json!(["private-filter-marker"]);
            invalid.push(value);
        }
    }
    for malformed in [
        serde_json::json!("CareBridge"),
        serde_json::json!([true]),
        serde_json::Value::Null,
    ] {
        let mut value = canonical_filters();
        value["includedCompanies"] = malformed;
        invalid.push(value);
    }
    let mut unknown = canonical_filters();
    unknown["retiredFilter"] = true.into();
    invalid.push(unknown);
    invalid
}

#[test]
fn notification_filters_accept_only_current_typed_keys() {
    let canonical = canonical_filters();
    let filters: AdvancedFilters = serde_json::from_value(canonical.clone()).unwrap();
    assert_eq!(serde_json::to_value(filters).unwrap(), canonical);
    for invalid in invalid_filters() {
        assert!(serde_json::from_value::<AdvancedFilters>(invalid).is_err());
    }
}

#[tokio::test]
async fn notification_filters_round_trip_through_preferences() {
    let database = crate::test_support::migrated_database().await;
    let manager = database.user_data_manager();
    let prefs = NotificationPreferences {
        advanced_filters: serde_json::from_value(canonical_filters()).unwrap(),
        ..NotificationPreferences::default()
    };
    manager.save_notification_preferences(&prefs).await.unwrap();
    let loaded = manager.get_notification_preferences().await.unwrap();
    assert_eq!(
        serde_json::to_value(loaded.advanced_filters).unwrap(),
        canonical_filters()
    );
}

#[tokio::test]
async fn invalid_saved_notification_filters_fail_without_resetting_preferences() {
    let database = crate::test_support::migrated_database().await;
    let manager = database.user_data_manager();
    manager
        .save_notification_preferences(&NotificationPreferences::default())
        .await
        .unwrap();
    for invalid in invalid_filters() {
        let raw = serde_json::to_string(&invalid).unwrap();
        sqlx::query("UPDATE notification_preferences SET advanced_filters = ?, updated_at = 'unchanged-filter-marker' WHERE id = 1")
            .bind(&raw).execute(database.pool()).await.unwrap();
        let before: (String, String, String) = sqlx::query_as("SELECT advanced_filters, source_configs, updated_at FROM notification_preferences WHERE id = 1")
            .fetch_one(database.pool()).await.unwrap();
        let error = manager
            .get_notification_preferences()
            .await
            .unwrap_err()
            .to_string();
        assert!(error.contains("Saved notification filters are invalid"));
        assert!(!error.contains("private-filter-marker"));
        let after: (String, String, String) = sqlx::query_as("SELECT advanced_filters, source_configs, updated_at FROM notification_preferences WHERE id = 1")
            .fetch_one(database.pool()).await.unwrap();
        assert_eq!(after, before);
    }
}

#[tokio::test]
async fn settings_restore_rolls_back_both_collections_on_search_failure() {
    let database = crate::test_support::migrated_database().await;
    let manager = database.user_data_manager();
    let template = CoverLetterTemplate {
        id: "restore-template".into(),
        name: "Template".into(),
        content: "Local text".into(),
        category: TemplateCategory::General,
        created_at: "date".into(),
        updated_at: "date".into(),
    };
    let search: SavedSearch = serde_json::from_value(serde_json::json!({
        "id":"restore-search","name":"Search","sortBy":"score-desc","scoreFilter":"all","sourceFilter":"all","remoteFilter":"all","bookmarkFilter":"all","notesFilter":"all","createdAt":"date"
    })).unwrap();
    sqlx::query("CREATE TRIGGER reject_restore_search BEFORE INSERT ON saved_searches BEGIN SELECT RAISE(ABORT, 'fixture failure'); END")
        .execute(database.pool()).await.unwrap();
    assert!(manager
        .import_local_settings(vec![template.clone()], vec![search.clone()])
        .await
        .is_err());
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM cover_letter_templates WHERE id='restore-template'",
    )
    .fetch_one(database.pool())
    .await
    .unwrap();
    assert_eq!(count, 0);
    sqlx::query("DROP TRIGGER reject_restore_search")
        .execute(database.pool())
        .await
        .unwrap();
    assert_eq!(
        manager
            .import_local_settings(vec![template.clone()], vec![search.clone()])
            .await
            .unwrap(),
        (1, 1)
    );
    let mut duplicate = template;
    duplicate.content = "must not overwrite".into();
    assert_eq!(
        manager
            .import_local_settings(vec![duplicate], vec![search])
            .await
            .unwrap(),
        (0, 0)
    );
    let preserved: String = sqlx::query_scalar(
        "SELECT content FROM cover_letter_templates WHERE id='restore-template'",
    )
    .fetch_one(database.pool())
    .await
    .unwrap();
    assert_eq!(preserved, "Local text");
}

#[tokio::test]
async fn settings_restore_supports_every_template_category_and_rejects_invalid_category() {
    let database = crate::Database::connect_memory().await.unwrap();
    let migrations = sqlx::migrate!("./migrations");
    migrations.run_to(30, database.pool()).await.unwrap();
    sqlx::query("INSERT INTO cover_letter_templates(id,name,content,category) VALUES ('preserved','Original','Private saved wording','general')")
        .execute(database.pool()).await.unwrap();
    migrations.run(database.pool()).await.unwrap();
    let preserved: String =
        sqlx::query_scalar("SELECT content FROM cover_letter_templates WHERE id='preserved'")
            .fetch_one(database.pool())
            .await
            .unwrap();
    assert_eq!(preserved, "Private saved wording");
    let manager = database.user_data_manager();
    for category in [
        TemplateCategory::General,
        TemplateCategory::Tech,
        TemplateCategory::Creative,
        TemplateCategory::Finance,
        TemplateCategory::Healthcare,
        TemplateCategory::Sales,
        TemplateCategory::Custom,
        TemplateCategory::ThankYou,
        TemplateCategory::FollowUp,
        TemplateCategory::Withdrawal,
    ] {
        let id = format!("category-{category}");
        let template = CoverLetterTemplate {
            id: id.clone(),
            name: id.clone(),
            content: "saved text".into(),
            category: category.clone(),
            created_at: "2026-10-28T00:00:00Z".into(),
            updated_at: "2026-10-28T00:00:00Z".into(),
        };
        assert_eq!(
            manager
                .import_local_settings(vec![template], vec![])
                .await
                .unwrap(),
            (1, 0)
        );
        let stored: String =
            sqlx::query_scalar("SELECT category FROM cover_letter_templates WHERE id=?")
                .bind(&id)
                .fetch_one(database.pool())
                .await
                .unwrap();
        assert_eq!(stored, category.to_string());
    }
    let mut transaction = database.pool().begin().await.unwrap();
    sqlx::query("INSERT INTO cover_letter_templates(id,name,content,category) VALUES ('rollback-valid','Test','Text','general')").execute(&mut *transaction).await.unwrap();
    assert!(sqlx::query("INSERT INTO cover_letter_templates(id,name,content,category) VALUES ('rollback-invalid','Test','Text','unsupported')").execute(&mut *transaction).await.is_err());
    transaction.rollback().await.unwrap();
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM cover_letter_templates WHERE id LIKE 'rollback-%'",
    )
    .fetch_one(database.pool())
    .await
    .unwrap();
    assert_eq!(count, 0);
}
