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

#[test]
fn test_advanced_filters_preserve_pre_refactor_company_preferences() {
    let mut stored = serde_json::json!({
        "includeKeywords": [],
        "excludeKeywords": [],
        "minSalary": null,
        "remoteOnly": false,
    });
    let object = stored
        .as_object_mut()
        .expect("stored filters should be an object");
    object.insert(
        ["company", "White", "list"].concat(),
        serde_json::json!(["CareBridge"]),
    );
    object.insert(
        ["company", "Black", "list"].concat(),
        serde_json::json!(["AvoidMe"]),
    );

    let filters: AdvancedFilters =
        serde_json::from_value(stored).expect("stored filters should deserialize");

    assert_eq!(filters.included_companies, vec!["CareBridge"]);
    assert_eq!(filters.excluded_companies, vec!["AvoidMe"]);

    let serialized = serde_json::to_value(filters).expect("filters should serialize");
    assert_eq!(
        serialized["includedCompanies"],
        serde_json::json!(["CareBridge"])
    );
    assert_eq!(
        serialized["excludedCompanies"],
        serde_json::json!(["AvoidMe"])
    );
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
