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
    SkillSurge,      // Skill demand suddenly increased
    SalarySpike,     // Salaries jumped significantly
    HiringFreeze,    // Company stopped hiring
    HiringSpree,     // Company hiring aggressively
    LocationBoom,    // New hot location
    RoleObsolete,    // Role demand declining
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
}
