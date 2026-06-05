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
