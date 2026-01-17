//! Market Alert System
//!
//! Detects and manages market anomalies, trends, and notable events.

use anyhow::Result;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{Row, SqlitePool};

/// Market alert types
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum AlertType {
    SkillSurge,   // Skill demand suddenly increased
    SalarySpike,  // Salaries jumped significantly
    HiringFreeze, // Company stopped hiring
    HiringSpree,  // Company hiring aggressively
    LocationBoom, // New hot location
    RoleObsolete, // Role demand declining
}

impl AlertType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::SkillSurge => "skill_surge",
            Self::SalarySpike => "salary_spike",
            Self::HiringFreeze => "hiring_freeze",
            Self::HiringSpree => "hiring_spree",
            Self::LocationBoom => "location_boom",
            Self::RoleObsolete => "role_obsolete",
        }
    }

    pub fn parse(s: &str) -> Self {
        match s {
            "skill_surge" => Self::SkillSurge,
            "salary_spike" => Self::SalarySpike,
            "hiring_freeze" => Self::HiringFreeze,
            "hiring_spree" => Self::HiringSpree,
            "location_boom" => Self::LocationBoom,
            "role_obsolete" => Self::RoleObsolete,
            _ => Self::SkillSurge,
        }
    }
}

/// Alert severity levels
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum AlertSeverity {
    Info,
    Warning,
    Critical,
}

impl AlertSeverity {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Info => "info",
            Self::Warning => "warning",
            Self::Critical => "critical",
        }
    }

    pub fn parse(s: &str) -> Self {
        match s {
            "info" => Self::Info,
            "warning" => Self::Warning,
            "critical" => Self::Critical,
            _ => Self::Info,
        }
    }
}

/// Entity types for alerts
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum EntityType {
    Skill,
    Company,
    Location,
    Role,
}

impl EntityType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Skill => "skill",
            Self::Company => "company",
            Self::Location => "location",
            Self::Role => "role",
        }
    }

    pub fn parse(s: &str) -> Self {
        match s {
            "skill" => Self::Skill,
            "company" => Self::Company,
            "location" => Self::Location,
            "role" => Self::Role,
            _ => Self::Skill,
        }
    }
}

/// Market alert
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketAlert {
    pub id: i64,
    pub alert_type: AlertType,
    pub title: String,
    pub description: String,
    pub severity: AlertSeverity,
    pub related_entity: Option<String>,
    pub related_entity_type: Option<EntityType>,
    pub metric_value: Option<f64>,
    pub metric_change_pct: Option<f64>,
    pub is_read: bool,
    pub created_at: DateTime<Utc>,
}

impl MarketAlert {
    /// Mark alert as read
    pub async fn mark_read(&self, db: &SqlitePool) -> Result<()> {
        sqlx::query("UPDATE market_alerts SET is_read = 1 WHERE id = ?")
            .bind(self.id)
            .execute(db)
            .await?;
        Ok(())
    }

    /// Format change percentage
    pub fn change_description(&self) -> String {
        if let Some(change) = self.metric_change_pct {
            if change > 0.0 {
                format!("+{:.1}%", change)
            } else {
                format!("{:.1}%", change)
            }
        } else {
            "N/A".to_string()
        }
    }

    /// Get severity indicator
    pub fn severity_indicator(&self) -> &str {
        match self.severity {
            AlertSeverity::Info => "[INFO]",
            AlertSeverity::Warning => "[WARN]",
            AlertSeverity::Critical => "[CRIT]",
        }
    }

    /// Get alert type indicator
    pub fn type_indicator(&self) -> &str {
        match self.alert_type {
            AlertType::SkillSurge => "[SKILL+]",
            AlertType::SalarySpike => "[SALARY+]",
            AlertType::HiringFreeze => "[FREEZE]",
            AlertType::HiringSpree => "[HIRING]",
            AlertType::LocationBoom => "[LOCATION]",
            AlertType::RoleObsolete => "[ROLE-]",
        }
    }
}

fn row_to_alert(r: &sqlx::sqlite::SqliteRow) -> Result<MarketAlert> {
    let created_str: String = r.try_get("created_at")?;
    let created_at = DateTime::parse_from_rfc3339(&created_str)
        .map(|dt| dt.with_timezone(&Utc))
        .unwrap_or_else(|_| Utc::now());

    Ok(MarketAlert {
        id: r.try_get("id")?,
        alert_type: AlertType::parse(&r.try_get::<String, _>("alert_type")?),
        title: r.try_get("title")?,
        description: r.try_get("description")?,
        severity: AlertSeverity::parse(&r.try_get::<String, _>("severity")?),
        related_entity: r.try_get("related_entity").ok(),
        related_entity_type: r
            .try_get::<Option<String>, _>("related_entity_type")
            .ok()
            .flatten()
            .map(|t| EntityType::parse(&t)),
        metric_value: r.try_get("metric_value").ok(),
        metric_change_pct: r.try_get("metric_change_pct").ok(),
        is_read: r.try_get::<i64, _>("is_read").unwrap_or(0) != 0,
        created_at,
    })
}

/// Get all unread market alerts
pub async fn get_unread_alerts(db: &SqlitePool) -> Result<Vec<MarketAlert>> {
    let rows = sqlx::query(
        r#"
        SELECT
            id, alert_type, title, description, severity,
            related_entity, related_entity_type,
            metric_value, metric_change_pct, is_read, created_at
        FROM market_alerts
        WHERE is_read = 0
        ORDER BY created_at DESC
        "#,
    )
    .fetch_all(db)
    .await?;

    rows.iter().map(row_to_alert).collect()
}

/// Get all alerts (read and unread)
pub async fn get_all_alerts(db: &SqlitePool, limit: usize) -> Result<Vec<MarketAlert>> {
    let rows = sqlx::query(
        r#"
        SELECT
            id, alert_type, title, description, severity,
            related_entity, related_entity_type,
            metric_value, metric_change_pct, is_read, created_at
        FROM market_alerts
        ORDER BY created_at DESC
        LIMIT ?
        "#,
    )
    .bind(limit as i64)
    .fetch_all(db)
    .await?;

    rows.iter().map(row_to_alert).collect()
}

/// Get alerts by type
pub async fn get_alerts_by_type(
    db: &SqlitePool,
    alert_type: AlertType,
    limit: usize,
) -> Result<Vec<MarketAlert>> {
    let rows = sqlx::query(
        r#"
        SELECT
            id, alert_type, title, description, severity,
            related_entity, related_entity_type,
            metric_value, metric_change_pct, is_read, created_at
        FROM market_alerts
        WHERE alert_type = ?
        ORDER BY created_at DESC
        LIMIT ?
        "#,
    )
    .bind(alert_type.as_str())
    .bind(limit as i64)
    .fetch_all(db)
    .await?;

    rows.iter().map(row_to_alert).collect()
}

/// Mark all alerts as read
pub async fn mark_all_read(db: &SqlitePool) -> Result<u64> {
    let result = sqlx::query("UPDATE market_alerts SET is_read = 1 WHERE is_read = 0")
        .execute(db)
        .await?;

    Ok(result.rows_affected())
}

/// Delete old alerts (older than N days)
pub async fn cleanup_old_alerts(db: &SqlitePool, days: usize) -> Result<u64> {
    let query = format!(
        "DELETE FROM market_alerts WHERE created_at < datetime('now', '-{} days') AND is_read = 1",
        days
    );
    let result = sqlx::query(&query).execute(db).await?;

    Ok(result.rows_affected())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_alert_type_conversion() {
        assert_eq!(AlertType::SkillSurge.as_str(), "skill_surge");
        assert_eq!(AlertType::parse("hiring_spree"), AlertType::HiringSpree);
    }

    #[test]
    fn test_alert_severity() {
        assert_eq!(AlertSeverity::Warning.as_str(), "warning");
        assert_eq!(AlertSeverity::parse("critical"), AlertSeverity::Critical);
    }

    #[test]
    fn test_entity_type() {
        assert_eq!(EntityType::Skill.as_str(), "skill");
        assert_eq!(EntityType::parse("company"), EntityType::Company);
    }

    #[test]
    fn test_market_alert_formatting() {
        let alert = MarketAlert {
            id: 1,
            alert_type: AlertType::SkillSurge,
            title: "React demand surging!".to_string(),
            description: "React mentions increased by 75%".to_string(),
            severity: AlertSeverity::Info,
            related_entity: Some("React".to_string()),
            related_entity_type: Some(EntityType::Skill),
            metric_value: Some(250.0),
            metric_change_pct: Some(75.0),
            is_read: false,
            created_at: Utc::now(),
        };

        assert_eq!(alert.change_description(), "+75.0%");
        assert_eq!(alert.severity_indicator(), "[INFO]");
        assert_eq!(alert.type_indicator(), "[SKILL+]");
    }

    #[test]
    fn test_alert_type_all_variants() {
        assert_eq!(AlertType::SkillSurge.as_str(), "skill_surge");
        assert_eq!(AlertType::SalarySpike.as_str(), "salary_spike");
        assert_eq!(AlertType::HiringFreeze.as_str(), "hiring_freeze");
        assert_eq!(AlertType::HiringSpree.as_str(), "hiring_spree");
        assert_eq!(AlertType::LocationBoom.as_str(), "location_boom");
        assert_eq!(AlertType::RoleObsolete.as_str(), "role_obsolete");
    }

    #[test]
    fn test_alert_type_parse_all_variants() {
        assert_eq!(AlertType::parse("skill_surge"), AlertType::SkillSurge);
        assert_eq!(AlertType::parse("salary_spike"), AlertType::SalarySpike);
        assert_eq!(AlertType::parse("hiring_freeze"), AlertType::HiringFreeze);
        assert_eq!(AlertType::parse("hiring_spree"), AlertType::HiringSpree);
        assert_eq!(AlertType::parse("location_boom"), AlertType::LocationBoom);
        assert_eq!(AlertType::parse("role_obsolete"), AlertType::RoleObsolete);
    }

    #[test]
    fn test_alert_type_parse_invalid() {
        assert_eq!(AlertType::parse("invalid"), AlertType::SkillSurge);
        assert_eq!(AlertType::parse(""), AlertType::SkillSurge);
    }

    #[test]
    fn test_alert_severity_all_variants() {
        assert_eq!(AlertSeverity::Info.as_str(), "info");
        assert_eq!(AlertSeverity::Warning.as_str(), "warning");
        assert_eq!(AlertSeverity::Critical.as_str(), "critical");
    }

    #[test]
    fn test_alert_severity_parse_all() {
        assert_eq!(AlertSeverity::parse("info"), AlertSeverity::Info);
        assert_eq!(AlertSeverity::parse("warning"), AlertSeverity::Warning);
        assert_eq!(AlertSeverity::parse("critical"), AlertSeverity::Critical);
    }

    #[test]
    fn test_alert_severity_parse_invalid() {
        assert_eq!(AlertSeverity::parse("invalid"), AlertSeverity::Info);
        assert_eq!(AlertSeverity::parse(""), AlertSeverity::Info);
    }

    #[test]
    fn test_entity_type_all_variants() {
        assert_eq!(EntityType::Skill.as_str(), "skill");
        assert_eq!(EntityType::Company.as_str(), "company");
        assert_eq!(EntityType::Location.as_str(), "location");
        assert_eq!(EntityType::Role.as_str(), "role");
    }

    #[test]
    fn test_entity_type_parse_all() {
        assert_eq!(EntityType::parse("skill"), EntityType::Skill);
        assert_eq!(EntityType::parse("company"), EntityType::Company);
        assert_eq!(EntityType::parse("location"), EntityType::Location);
        assert_eq!(EntityType::parse("role"), EntityType::Role);
    }

    #[test]
    fn test_entity_type_parse_invalid() {
        assert_eq!(EntityType::parse("invalid"), EntityType::Skill);
    }

    #[test]
    fn test_market_alert_negative_change() {
        let alert = MarketAlert {
            id: 2,
            alert_type: AlertType::RoleObsolete,
            title: "Junior roles declining".to_string(),
            description: "Junior roles down 30%".to_string(),
            severity: AlertSeverity::Warning,
            related_entity: Some("Junior Developer".to_string()),
            related_entity_type: Some(EntityType::Role),
            metric_value: Some(70.0),
            metric_change_pct: Some(-30.0),
            is_read: false,
            created_at: Utc::now(),
        };

        assert_eq!(alert.change_description(), "-30.0%");
        assert_eq!(alert.severity_indicator(), "[WARN]");
        assert_eq!(alert.type_indicator(), "[ROLE-]");
    }

    #[test]
    fn test_market_alert_no_change() {
        let alert = MarketAlert {
            id: 3,
            alert_type: AlertType::HiringSpree,
            title: "Company hiring".to_string(),
            description: "Company posted jobs".to_string(),
            severity: AlertSeverity::Info,
            related_entity: Some("TechCorp".to_string()),
            related_entity_type: Some(EntityType::Company),
            metric_value: Some(50.0),
            metric_change_pct: None,
            is_read: true,
            created_at: Utc::now(),
        };

        assert_eq!(alert.change_description(), "N/A");
        assert!(alert.is_read);
    }

    #[test]
    fn test_market_alert_critical_salary_spike() {
        let alert = MarketAlert {
            id: 4,
            alert_type: AlertType::SalarySpike,
            title: "Massive salary increase!".to_string(),
            description: "Salaries jumped 50%".to_string(),
            severity: AlertSeverity::Critical,
            related_entity: Some("AI Engineer".to_string()),
            related_entity_type: Some(EntityType::Role),
            metric_value: Some(250000.0),
            metric_change_pct: Some(50.0),
            is_read: false,
            created_at: Utc::now(),
        };

        assert_eq!(alert.change_description(), "+50.0%");
        assert_eq!(alert.severity_indicator(), "[CRIT]");
        assert_eq!(alert.type_indicator(), "[SALARY+]");
    }

    #[test]
    fn test_market_alert_hiring_freeze() {
        let alert = MarketAlert {
            id: 5,
            alert_type: AlertType::HiringFreeze,
            title: "BigCorp stops hiring".to_string(),
            description: "Hiring frozen indefinitely".to_string(),
            severity: AlertSeverity::Warning,
            related_entity: Some("BigCorp".to_string()),
            related_entity_type: Some(EntityType::Company),
            metric_value: Some(0.0),
            metric_change_pct: Some(-100.0),
            is_read: false,
            created_at: Utc::now(),
        };

        assert_eq!(alert.change_description(), "-100.0%");
        assert_eq!(alert.severity_indicator(), "[WARN]");
        assert_eq!(alert.type_indicator(), "[FREEZE]");
    }

    #[test]
    fn test_market_alert_location_boom() {
        let alert = MarketAlert {
            id: 6,
            alert_type: AlertType::LocationBoom,
            title: "Austin tech boom!".to_string(),
            description: "Austin jobs increased 80%".to_string(),
            severity: AlertSeverity::Info,
            related_entity: Some("Austin, TX".to_string()),
            related_entity_type: Some(EntityType::Location),
            metric_value: Some(500.0),
            metric_change_pct: Some(80.0),
            is_read: false,
            created_at: Utc::now(),
        };

        assert_eq!(alert.change_description(), "+80.0%");
        assert_eq!(alert.type_indicator(), "[LOCATION]");
    }

    #[test]
    fn test_market_alert_no_entity() {
        let alert = MarketAlert {
            id: 7,
            alert_type: AlertType::SkillSurge,
            title: "General trend".to_string(),
            description: "Overall market improving".to_string(),
            severity: AlertSeverity::Info,
            related_entity: None,
            related_entity_type: None,
            metric_value: None,
            metric_change_pct: None,
            is_read: false,
            created_at: Utc::now(),
        };

        assert_eq!(alert.change_description(), "N/A");
        assert!(alert.related_entity.is_none());
        assert!(alert.related_entity_type.is_none());
    }

    #[test]
    fn test_market_alert_zero_change() {
        let alert = MarketAlert {
            id: 8,
            alert_type: AlertType::HiringSpree,
            title: "Stable hiring".to_string(),
            description: "No change in hiring".to_string(),
            severity: AlertSeverity::Info,
            related_entity: Some("StableCorp".to_string()),
            related_entity_type: Some(EntityType::Company),
            metric_value: Some(100.0),
            metric_change_pct: Some(0.0),
            is_read: false,
            created_at: Utc::now(),
        };

        // Zero change doesn't get a + prefix
        assert_eq!(alert.change_description(), "0.0%");
    }

    #[test]
    fn test_market_alert_small_change() {
        let alert = MarketAlert {
            id: 9,
            alert_type: AlertType::SkillSurge,
            title: "Slight increase".to_string(),
            description: "Minimal growth".to_string(),
            severity: AlertSeverity::Info,
            related_entity: Some("CSS".to_string()),
            related_entity_type: Some(EntityType::Skill),
            metric_value: Some(105.0),
            metric_change_pct: Some(0.5),
            is_read: false,
            created_at: Utc::now(),
        };

        assert_eq!(alert.change_description(), "+0.5%");
    }

    // Async tests for database functions
    mod async_tests {
        use super::*;
        use sqlx::SqlitePool;

        async fn setup_test_db() -> SqlitePool {
            let pool = SqlitePool::connect(":memory:").await.unwrap();

            sqlx::query(
                r#"
                CREATE TABLE IF NOT EXISTS market_alerts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    alert_type TEXT NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT,
                    severity TEXT DEFAULT 'info',
                    related_entity TEXT,
                    related_entity_type TEXT,
                    metric_value REAL,
                    metric_change_pct REAL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    is_read INTEGER DEFAULT 0
                )
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            pool
        }

        #[tokio::test]
        async fn test_mark_read() {
            let pool = setup_test_db().await;

            // Insert test alert
            sqlx::query(
                r#"
                INSERT INTO market_alerts (alert_type, title, description, severity, is_read)
                VALUES ('skill_surge', 'Test Alert', 'Test Description', 'info', 0)
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            // Fetch the alert
            let alerts = get_unread_alerts(&pool).await.unwrap();
            assert_eq!(alerts.len(), 1);
            assert!(!alerts[0].is_read);

            // Mark as read
            let result = alerts[0].mark_read(&pool).await;
            assert!(result.is_ok());

            // Verify it's marked as read
            let unread = get_unread_alerts(&pool).await.unwrap();
            assert_eq!(unread.len(), 0);

            // Verify in database
            let is_read: i64 = sqlx::query_scalar("SELECT is_read FROM market_alerts WHERE id = 1")
                .fetch_one(&pool)
                .await
                .unwrap();
            assert_eq!(is_read, 1);
        }

        #[tokio::test]
        async fn test_get_all_alerts_empty() {
            let pool = setup_test_db().await;
            let alerts = get_all_alerts(&pool, 10).await.unwrap();
            assert_eq!(alerts.len(), 0);
        }

        #[tokio::test]
        async fn test_get_all_alerts_with_data() {
            let pool = setup_test_db().await;

            // Insert multiple alerts
            sqlx::query(
                r#"
                INSERT INTO market_alerts (alert_type, title, description, severity, is_read, created_at)
                VALUES
                    ('skill_surge', 'Alert 1', 'Desc 1', 'info', 0, datetime('now', '-2 days')),
                    ('salary_spike', 'Alert 2', 'Desc 2', 'warning', 1, datetime('now', '-1 day')),
                    ('hiring_spree', 'Alert 3', 'Desc 3', 'critical', 0, datetime('now'))
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            // Get all alerts
            let alerts = get_all_alerts(&pool, 10).await.unwrap();
            assert_eq!(alerts.len(), 3);

            // Should be ordered by created_at DESC
            assert_eq!(alerts[0].title, "Alert 3");
            assert_eq!(alerts[1].title, "Alert 2");
            assert_eq!(alerts[2].title, "Alert 1");
        }

        #[tokio::test]
        async fn test_get_all_alerts_limit() {
            let pool = setup_test_db().await;

            // Insert 5 alerts
            for i in 1..=5 {
                sqlx::query(
                    r#"
                    INSERT INTO market_alerts (alert_type, title, description, severity)
                    VALUES ('skill_surge', ?, 'Description', 'info')
                    "#,
                )
                .bind(format!("Alert {}", i))
                .execute(&pool)
                .await
                .unwrap();
            }

            // Get only 3
            let alerts = get_all_alerts(&pool, 3).await.unwrap();
            assert_eq!(alerts.len(), 3);
        }

        #[tokio::test]
        async fn test_get_alerts_by_type_empty() {
            let pool = setup_test_db().await;
            let alerts = get_alerts_by_type(&pool, AlertType::SkillSurge, 10)
                .await
                .unwrap();
            assert_eq!(alerts.len(), 0);
        }

        #[tokio::test]
        async fn test_get_alerts_by_type_filter() {
            let pool = setup_test_db().await;

            // Insert different types
            sqlx::query(
                r#"
                INSERT INTO market_alerts (alert_type, title, description, severity)
                VALUES
                    ('skill_surge', 'Skill Alert 1', 'Desc', 'info'),
                    ('salary_spike', 'Salary Alert', 'Desc', 'warning'),
                    ('skill_surge', 'Skill Alert 2', 'Desc', 'info'),
                    ('hiring_spree', 'Hiring Alert', 'Desc', 'critical')
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            // Get only skill_surge alerts
            let alerts = get_alerts_by_type(&pool, AlertType::SkillSurge, 10)
                .await
                .unwrap();
            assert_eq!(alerts.len(), 2);
            assert_eq!(alerts[0].alert_type, AlertType::SkillSurge);
            assert_eq!(alerts[1].alert_type, AlertType::SkillSurge);

            // Get only salary_spike alerts
            let salary_alerts = get_alerts_by_type(&pool, AlertType::SalarySpike, 10)
                .await
                .unwrap();
            assert_eq!(salary_alerts.len(), 1);
            assert_eq!(salary_alerts[0].alert_type, AlertType::SalarySpike);
        }

        #[tokio::test]
        async fn test_get_alerts_by_type_limit() {
            let pool = setup_test_db().await;

            // Insert 5 skill_surge alerts
            for i in 1..=5 {
                sqlx::query(
                    r#"
                    INSERT INTO market_alerts (alert_type, title, description, severity)
                    VALUES ('skill_surge', ?, 'Description', 'info')
                    "#,
                )
                .bind(format!("Alert {}", i))
                .execute(&pool)
                .await
                .unwrap();
            }

            let alerts = get_alerts_by_type(&pool, AlertType::SkillSurge, 3)
                .await
                .unwrap();
            assert_eq!(alerts.len(), 3);
        }

        #[tokio::test]
        async fn test_mark_all_read_empty() {
            let pool = setup_test_db().await;
            let count = mark_all_read(&pool).await.unwrap();
            assert_eq!(count, 0);
        }

        #[tokio::test]
        async fn test_mark_all_read_with_data() {
            let pool = setup_test_db().await;

            // Insert unread and read alerts
            sqlx::query(
                r#"
                INSERT INTO market_alerts (alert_type, title, description, severity, is_read)
                VALUES
                    ('skill_surge', 'Alert 1', 'Desc', 'info', 0),
                    ('salary_spike', 'Alert 2', 'Desc', 'warning', 0),
                    ('hiring_spree', 'Alert 3', 'Desc', 'critical', 1)
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            // Mark all as read
            let count = mark_all_read(&pool).await.unwrap();
            assert_eq!(count, 2); // Only 2 were unread

            // Verify all are now read
            let unread = get_unread_alerts(&pool).await.unwrap();
            assert_eq!(unread.len(), 0);

            let all = get_all_alerts(&pool, 10).await.unwrap();
            assert_eq!(all.len(), 3);
            assert!(all.iter().all(|a| a.is_read));
        }

        #[tokio::test]
        async fn test_cleanup_old_alerts_empty() {
            let pool = setup_test_db().await;
            let count = cleanup_old_alerts(&pool, 30).await.unwrap();
            assert_eq!(count, 0);
        }

        #[tokio::test]
        async fn test_cleanup_old_alerts_filter_by_age() {
            let pool = setup_test_db().await;

            // Insert old read alert, old unread, recent read
            sqlx::query(
                r#"
                INSERT INTO market_alerts (alert_type, title, description, severity, is_read, created_at)
                VALUES
                    ('skill_surge', 'Old Read', 'Desc', 'info', 1, datetime('now', '-40 days')),
                    ('salary_spike', 'Old Unread', 'Desc', 'warning', 0, datetime('now', '-40 days')),
                    ('hiring_spree', 'Recent Read', 'Desc', 'critical', 1, datetime('now', '-5 days'))
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            // Cleanup alerts older than 30 days
            let count = cleanup_old_alerts(&pool, 30).await.unwrap();
            assert_eq!(count, 1); // Only old read alert should be deleted

            // Verify remaining alerts
            let remaining = get_all_alerts(&pool, 10).await.unwrap();
            assert_eq!(remaining.len(), 2);
            assert!(remaining.iter().any(|a| a.title == "Old Unread"));
            assert!(remaining.iter().any(|a| a.title == "Recent Read"));
            assert!(!remaining.iter().any(|a| a.title == "Old Read"));
        }

        #[tokio::test]
        async fn test_cleanup_old_alerts_different_thresholds() {
            let pool = setup_test_db().await;

            sqlx::query(
                r#"
                INSERT INTO market_alerts (alert_type, title, description, severity, is_read, created_at)
                VALUES
                    ('skill_surge', 'Very Old', 'Desc', 'info', 1, datetime('now', '-100 days')),
                    ('salary_spike', 'Old', 'Desc', 'warning', 1, datetime('now', '-50 days')),
                    ('hiring_spree', 'Recent', 'Desc', 'critical', 1, datetime('now', '-10 days'))
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            // Cleanup with 60 day threshold
            let count = cleanup_old_alerts(&pool, 60).await.unwrap();
            assert_eq!(count, 1); // Only very old should be deleted

            // Cleanup with 20 day threshold
            let count2 = cleanup_old_alerts(&pool, 20).await.unwrap();
            assert_eq!(count2, 1); // Old should now be deleted

            let remaining = get_all_alerts(&pool, 10).await.unwrap();
            assert_eq!(remaining.len(), 1);
            assert_eq!(remaining[0].title, "Recent");
        }

        #[tokio::test]
        async fn test_row_to_alert_with_all_fields() {
            let pool = setup_test_db().await;

            // Insert alert with all fields populated
            sqlx::query(
                r#"
                INSERT INTO market_alerts (
                    alert_type, title, description, severity,
                    related_entity, related_entity_type,
                    metric_value, metric_change_pct, is_read,
                    created_at
                )
                VALUES (
                    'skill_surge', 'Complete Alert', 'Full description', 'warning',
                    'Rust', 'skill',
                    250.0, 75.5, 1,
                    '2026-01-16T12:00:00Z'
                )
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            let alerts = get_all_alerts(&pool, 1).await.unwrap();
            assert_eq!(alerts.len(), 1);

            let alert = &alerts[0];
            assert_eq!(alert.alert_type, AlertType::SkillSurge);
            assert_eq!(alert.title, "Complete Alert");
            assert_eq!(alert.description, "Full description");
            assert_eq!(alert.severity, AlertSeverity::Warning);
            assert_eq!(alert.related_entity, Some("Rust".to_string()));
            assert_eq!(alert.related_entity_type, Some(EntityType::Skill));
            assert_eq!(alert.metric_value, Some(250.0));
            assert_eq!(alert.metric_change_pct, Some(75.5));
            assert!(alert.is_read);
        }

        #[tokio::test]
        async fn test_row_to_alert_with_minimal_fields() {
            let pool = setup_test_db().await;

            // Insert alert with only required fields (NULL for optional)
            sqlx::query(
                r#"
                INSERT INTO market_alerts (alert_type, title, description, severity, related_entity, related_entity_type)
                VALUES ('hiring_freeze', 'Minimal Alert', 'Basic description', 'critical', NULL, NULL)
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            let alerts = get_all_alerts(&pool, 1).await.unwrap();
            assert_eq!(alerts.len(), 1);

            let alert = &alerts[0];
            assert_eq!(alert.alert_type, AlertType::HiringFreeze);
            assert_eq!(alert.severity, AlertSeverity::Critical);
            // SQLite may return empty string or None for NULL TEXT fields
            assert!(alert.related_entity.is_none() || alert.related_entity == Some(String::new()));
            assert_eq!(alert.related_entity_type, None);
            // SQLite may return Some(0.0) for NULL REAL fields
            assert!(alert.metric_value.is_none() || alert.metric_value == Some(0.0));
            assert!(alert.metric_change_pct.is_none() || alert.metric_change_pct == Some(0.0));
            assert!(!alert.is_read);
        }

        #[tokio::test]
        async fn test_all_alert_types_in_db() {
            let pool = setup_test_db().await;

            // Insert one of each alert type
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

            let alerts = get_all_alerts(&pool, 10).await.unwrap();
            assert_eq!(alerts.len(), 6);

            // Verify all types are parsed correctly
            let types: Vec<AlertType> = alerts.iter().map(|a| a.alert_type.clone()).collect();
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

            // Insert one of each entity type
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

            let alerts = get_all_alerts(&pool, 10).await.unwrap();
            assert_eq!(alerts.len(), 4);

            let entity_types: Vec<EntityType> = alerts
                .iter()
                .filter_map(|a| a.related_entity_type.clone())
                .collect();
            assert!(entity_types.contains(&EntityType::Skill));
            assert!(entity_types.contains(&EntityType::Company));
            assert!(entity_types.contains(&EntityType::Location));
            assert!(entity_types.contains(&EntityType::Role));
        }
    }
}
