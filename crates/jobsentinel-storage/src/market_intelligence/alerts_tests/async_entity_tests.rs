use super::async_tests::{load_all_alerts, setup_test_db};
use super::*;

#[tokio::test]
async fn test_all_alert_types_in_db() {
    let pool = setup_test_db().await;

    sqlx::query(
        r#"
        INSERT INTO market_alerts (alert_type, title, description, severity)
        VALUES
            ('skill_surge', 'Skill', 'Desc', 'info'),
            ('salary_spike', 'Salary', 'Desc', 'info'),
            ('hiring_freeze', 'Freeze', 'Desc', 'info'),
            ('hiring_spree', 'Spree', 'Desc', 'info'),
            ('location_boom', 'Location', 'Desc', 'info'),
            ('role_obsolete', 'Role', 'Desc', 'info')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let alerts = load_all_alerts(&pool, 10).await;
    assert_eq!(alerts.len(), 6);

    let types: Vec<AlertType> = alerts
        .iter()
        .map(|alert| alert.alert_type.clone())
        .collect();
    assert!(types.contains(&AlertType::SkillSurge));
    assert!(types.contains(&AlertType::SalarySpike));
    assert!(types.contains(&AlertType::HiringFreeze));
    assert!(types.contains(&AlertType::HiringSpree));
    assert!(types.contains(&AlertType::LocationBoom));
    assert!(types.contains(&AlertType::RoleObsolete));
}

#[tokio::test]
async fn test_all_entity_types_in_db() {
    let pool = setup_test_db().await;

    sqlx::query(
        r#"
        INSERT INTO market_alerts (alert_type, title, description, severity, related_entity_type)
        VALUES
            ('skill_surge', 'Alert 1', 'Desc', 'info', 'skill'),
            ('salary_spike', 'Alert 2', 'Desc', 'info', 'company'),
            ('hiring_freeze', 'Alert 3', 'Desc', 'info', 'location'),
            ('hiring_spree', 'Alert 4', 'Desc', 'info', 'role')
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    let alerts = load_all_alerts(&pool, 10).await;
    assert_eq!(alerts.len(), 4);

    let entity_types: Vec<EntityType> = alerts
        .iter()
        .filter_map(|alert| alert.related_entity_type.clone())
        .collect();
    assert!(entity_types.contains(&EntityType::Skill));
    assert!(entity_types.contains(&EntityType::Company));
    assert!(entity_types.contains(&EntityType::Location));
    assert!(entity_types.contains(&EntityType::Role));
}
