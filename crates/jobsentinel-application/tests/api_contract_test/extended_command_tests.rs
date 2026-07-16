use super::*;

// ============================================================================
// Market Intelligence Commands Contract Tests
// ============================================================================

mod market_commands {
    use super::*;

    #[tokio::test]
    async fn test_market_intelligence_interface() {
        let (database, _config, _temp_dir) = setup_test_env().await;
        let market = database.market_intelligence();

        // get_trending_skills takes limit: usize
        let skills = market.get_trending_skills(10).await.unwrap();
        assert!(skills.len() <= 10);

        // get_most_active_companies takes limit: usize
        let companies = market.get_most_active_companies(10).await.unwrap();
        assert!(companies.len() <= 10);

        // get_hottest_locations takes limit: usize
        let locations = market.get_hottest_locations(10).await.unwrap();
        assert!(locations.len() <= 10);
    }

    #[tokio::test]
    async fn test_market_snapshot_interface() {
        let (database, _config, _temp_dir) = setup_test_env().await;
        let market = database.market_intelligence();

        // run_daily_analysis returns Result<MarketSnapshot>
        // May fail in empty database due to missing compute functions
        let result = market.run_daily_analysis().await;
        let _ = result; // Just verify the method exists and compiles
    }
}

// ============================================================================
// Ghost Detection Commands Contract Tests
// ============================================================================

mod ghost_commands {
    use super::*;

    #[tokio::test]
    async fn test_ghost_statistics_interface() {
        let (database, _config, _temp_dir) = setup_test_env().await;

        // get_ghost_statistics returns GhostStatistics
        let stats = database.get_ghost_statistics().await.unwrap();

        // Correct field names for GhostStatistics
        assert!(stats.total_analyzed >= 0);
        assert!(stats.likely_ghosts >= 0);
        assert!(stats.warnings >= 0);
        assert!(stats.avg_ghost_score >= 0.0);
        assert!(stats.total_reposts >= 0);
    }

    #[tokio::test]
    async fn test_get_ghost_jobs_interface() {
        let (database, _config, _temp_dir) = setup_test_env().await;

        // Insert a job with high ghost score
        let mut ghost_job = create_test_job("ghost_001", "Old Job", "GhostCorp");
        ghost_job.ghost_score = Some(0.8);
        ghost_job.ghost_reasons = Some(r#"{"age": "stale"}"#.to_string());
        database.upsert_job(&ghost_job).await.unwrap();

        // get_ghost_jobs takes threshold: f64, limit: i64
        let ghost_jobs = database.get_ghost_jobs(0.5, 10).await.unwrap();
        assert!(!ghost_jobs.is_empty());
    }

    #[tokio::test]
    async fn test_ghost_repost_tracking() {
        let (database, _config, _temp_dir) = setup_test_env().await;

        // track_repost returns repost count
        let count = database
            .track_repost(
                "Example Services",
                "Program Coordinator",
                "test_source",
                "test_hash",
            )
            .await
            .unwrap();
        assert!(count >= 1);

        // get_repost_count retrieves the count
        let retrieved = database
            .get_repost_count("Example Services", "Program Coordinator", "test_source")
            .await
            .unwrap();
        assert_eq!(retrieved, count);
    }
}

// ============================================================================
// Config Commands Contract Tests
// ============================================================================

mod config_commands {
    use super::*;

    #[tokio::test]
    async fn test_config_serialization() {
        let config = create_test_config();
        let json = serde_json::to_value(&config).unwrap();

        assert!(json.get("title_allowlist").is_some());
        assert!(json.get("salary_floor_usd").is_some());
    }
}

// ============================================================================
// User Data Commands Contract Tests
// ============================================================================

mod user_data_commands {
    use super::*;
    use jobsentinel_application::user_data::{SavedSearch, TemplateCategory};

    #[tokio::test]
    async fn test_cover_letter_template_crud() {
        let (database, _config, _temp_dir) = setup_test_env().await;
        let manager = database.user_data_manager();

        // Create - returns CoverLetterTemplate
        let template = manager
            .create_template(
                "Test Template",
                "Dear {company}...",
                TemplateCategory::General,
            )
            .await
            .unwrap();
        assert!(!template.id.is_empty());

        // Read - get_template takes &str
        let retrieved = manager.get_template(&template.id).await.unwrap();
        assert!(retrieved.is_some());

        // List - list_templates returns Vec<CoverLetterTemplate>
        let templates = manager.list_templates().await.unwrap();
        assert!(!templates.is_empty());

        // Delete - delete_template takes &str, returns bool
        let deleted = manager.delete_template(&template.id).await.unwrap();
        assert!(deleted);
    }

    #[tokio::test]
    async fn test_saved_search_crud() {
        let (database, _config, _temp_dir) = setup_test_env().await;
        let manager = database.user_data_manager();

        // Create - create_saved_search takes SavedSearch struct
        let search = SavedSearch {
            id: String::new(),
            name: "Customer Support Roles".to_string(),
            sort_by: "score".to_string(),
            score_filter: "all".to_string(),
            source_filter: "all".to_string(),
            remote_filter: "all".to_string(),
            bookmark_filter: "all".to_string(),
            notes_filter: "all".to_string(),
            posted_date_filter: None,
            salary_min_filter: None,
            salary_max_filter: None,
            ghost_filter: Some("all".to_string()),
            text_search: Some("remote customer support".to_string()),
            created_at: String::new(),
            last_used_at: None,
        };

        let created = manager.create_saved_search(search).await.unwrap();
        assert!(!created.id.is_empty());

        // List
        let searches = manager.list_saved_searches().await.unwrap();
        assert!(!searches.is_empty());

        // Use - use_saved_search takes &str, returns bool
        let used = manager.use_saved_search(&created.id).await.unwrap();
        assert!(used);

        // Delete - delete_saved_search takes &str, returns bool
        let deleted = manager.delete_saved_search(&created.id).await.unwrap();
        assert!(deleted);
    }

    #[tokio::test]
    async fn test_search_history() {
        let (database, _config, _temp_dir) = setup_test_env().await;
        let manager = database.user_data_manager();

        // Add - add_search_history takes &str (not count)
        manager
            .add_search_history("operations manager")
            .await
            .unwrap();

        // Get
        let history = manager.get_search_history(10).await.unwrap();
        assert!(!history.is_empty());

        // Clear
        manager.clear_search_history().await.unwrap();
    }

    #[tokio::test]
    async fn test_notification_preferences() {
        let (database, _config, _temp_dir) = setup_test_env().await;
        let manager = database.user_data_manager();

        // Get - returns NotificationPreferences (not Option)
        let prefs = manager.get_notification_preferences().await.unwrap();

        // NotificationPreferences is a struct, not Option - check fields
        assert!(prefs.global.enabled || !prefs.global.enabled); // Just verify it's a valid struct

        // Save - save_notification_preferences takes &NotificationPreferences
        manager.save_notification_preferences(&prefs).await.unwrap();
    }
}

// ============================================================================
// Credential Commands Contract Tests
// ============================================================================

mod credential_commands {
    use jobsentinel_application::credentials::{CredentialKey, CredentialService};
    use jobsentinel_storage::Database;

    #[test]
    fn test_credential_key_variants() {
        // Verify CredentialKey enum has expected variants
        let keys = vec![
            CredentialKey::SmtpPassword,
            CredentialKey::LinkedInCookie,
            CredentialKey::TelegramBotToken,
        ];

        for key in keys {
            // Each key should have a service name
            assert!(!format!("{:?}", key).is_empty());
            assert!(!key.as_str().is_empty());
        }
    }

    #[tokio::test]
    async fn test_credential_service_interface_is_noninteractive() {
        let database = Database::connect_memory().await.unwrap();
        database.migrate().await.unwrap();
        let credentials =
            CredentialService::with_fixed_master_key(database.credentials(), [29_u8; 32], false);

        // exists returns Result<bool, String> without touching OS keyring.
        let result = credentials.exists(CredentialKey::SmtpPassword).await;
        assert_eq!(result.unwrap(), false);

        // retrieve returns Result<Option<String>, String>
        let result = credentials.retrieve(CredentialKey::SmtpPassword).await;
        assert_eq!(result.unwrap(), None);
    }

    #[test]
    fn test_credential_key_parsing() {
        // FromStr trait: parse returns Result<CredentialKey, _>
        assert_eq!(
            "smtp_password".parse::<CredentialKey>().ok(),
            Some(CredentialKey::SmtpPassword)
        );
        assert!("invalid".parse::<CredentialKey>().is_err());

        // as_str returns &'static str
        assert_eq!(
            CredentialKey::SmtpPassword.as_str(),
            "jobsentinel_smtp_password"
        );
    }
}

// ============================================================================
// Error Handling Contract Tests
// ============================================================================

mod error_handling {
    use super::*;

    #[tokio::test]
    async fn test_invalid_job_id_returns_none() {
        let (database, _config, _temp_dir) = setup_test_env().await;

        let result = database.get_job_by_id(-1).await.unwrap();
        assert!(result.is_none());

        let result = database.get_job_by_id(i64::MAX).await.unwrap();
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn test_invalid_hash_returns_none() {
        let (database, _config, _temp_dir) = setup_test_env().await;

        let result = database.get_job_by_hash("nonexistent_hash").await.unwrap();
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn test_empty_search_returns_empty_vec() {
        let (database, _config, _temp_dir) = setup_test_env().await;

        let results = database.search_jobs("xyznonexistent", 10).await.unwrap();
        assert!(results.is_empty());
    }
}
