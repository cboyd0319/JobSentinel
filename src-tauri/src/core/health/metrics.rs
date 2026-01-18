//! Health metrics calculation and retrieval

use crate::core::Database;
use anyhow::Result;

use super::types::{
    HealthStatus, ScraperConfig, ScraperHealthMetrics, ScraperType, SelectorHealth,
};

/// Get health status for all scrapers using the view
pub async fn get_all_scraper_health(db: &Database) -> Result<Vec<ScraperHealthMetrics>> {
    let rows = sqlx::query!(
        r#"
        SELECT scraper_name, display_name, is_enabled, requires_auth, scraper_type,
               selector_health, rate_limit_per_hour, success_rate_24h, avg_duration_ms,
               last_success, last_error, total_runs_24h, jobs_found_24h, health_status
        FROM scraper_health_status
        ORDER BY
            CASE health_status
                WHEN 'down' THEN 0
                WHEN 'degraded' THEN 1
                WHEN 'healthy' THEN 2
                WHEN 'unknown' THEN 3
                WHEN 'disabled' THEN 4
            END,
            display_name ASC
        "#,
    )
    .fetch_all(db.pool())
    .await?;

    let metrics = rows
        .into_iter()
        .map(|row| ScraperHealthMetrics {
            scraper_name: row.scraper_name.unwrap_or_default(),
            display_name: row.display_name,
            is_enabled: row.is_enabled.unwrap_or(true),
            requires_auth: row.requires_auth.unwrap_or(false),
            scraper_type: row
                .scraper_type
                .as_deref()
                .map(ScraperType::from_str)
                .unwrap_or(ScraperType::Api),
            health_status: HealthStatus::from_str(&row.health_status),
            selector_health: row
                .selector_health
                .as_deref()
                .map(SelectorHealth::from_str)
                .unwrap_or(SelectorHealth::Unknown),
            success_rate_24h: row.success_rate_24h as f64,
            avg_duration_ms: row.avg_duration_ms.map(|d| d as i64),
            last_success: row.last_success.map(|dt| dt.and_utc()),
            last_error: row.last_error,
            total_runs_24h: row.total_runs_24h as i32,
            jobs_found_24h: row.jobs_found_24h as i32,
            rate_limit_per_hour: row.rate_limit_per_hour.unwrap_or(1000) as i32,
        })
        .collect();

    Ok(metrics)
}

/// Get configuration for all scrapers
pub async fn get_scraper_configs(db: &Database) -> Result<Vec<ScraperConfig>> {
    let rows = sqlx::query!(
        r#"
        SELECT scraper_name, display_name, is_enabled, requires_auth, auth_type,
               scraper_type, rate_limit_per_hour, selector_health, last_selector_check, notes
        FROM scraper_config
        ORDER BY display_name
        "#,
    )
    .fetch_all(db.pool())
    .await?;

    let configs = rows
        .into_iter()
        .map(|row| ScraperConfig {
            scraper_name: row.scraper_name.unwrap_or_default(),
            display_name: row.display_name,
            is_enabled: row.is_enabled.unwrap_or(true),
            requires_auth: row.requires_auth.unwrap_or(false),
            auth_type: row.auth_type,
            scraper_type: row
                .scraper_type
                .as_deref()
                .map(ScraperType::from_str)
                .unwrap_or(ScraperType::Api),
            rate_limit_per_hour: row.rate_limit_per_hour.unwrap_or(1000) as i32,
            selector_health: row
                .selector_health
                .as_deref()
                .map(SelectorHealth::from_str)
                .unwrap_or(SelectorHealth::Unknown),
            last_selector_check: row.last_selector_check.map(|dt| dt.and_utc()),
            notes: row.notes,
        })
        .collect();

    Ok(configs)
}

/// Enable or disable a scraper
pub async fn set_scraper_enabled(db: &Database, scraper_name: &str, enabled: bool) -> Result<()> {
    sqlx::query!(
        r#"
        UPDATE scraper_config
        SET is_enabled = ?, updated_at = datetime('now')
        WHERE scraper_name = ?
        "#,
        enabled,
        scraper_name,
    )
    .execute(db.pool())
    .await?;

    Ok(())
}

/// Update selector health for a scraper
pub async fn update_selector_health(
    db: &Database,
    scraper_name: &str,
    health: SelectorHealth,
) -> Result<()> {
    let health_str = match health {
        SelectorHealth::Healthy => "healthy",
        SelectorHealth::Degraded => "degraded",
        SelectorHealth::Broken => "broken",
        SelectorHealth::Unknown => "unknown",
    };

    sqlx::query!(
        r#"
        UPDATE scraper_config
        SET selector_health = ?,
            last_selector_check = datetime('now'),
            updated_at = datetime('now')
        WHERE scraper_name = ?
        "#,
        health_str,
        scraper_name,
    )
    .execute(db.pool())
    .await?;

    Ok(())
}

/// Get summary statistics
pub async fn get_health_summary(db: &Database) -> Result<HealthSummary> {
    let row = sqlx::query!(
        r#"
        SELECT
            COUNT(*) as total,
            SUM(CASE WHEN health_status = 'healthy' THEN 1 ELSE 0 END) as healthy,
            SUM(CASE WHEN health_status = 'degraded' THEN 1 ELSE 0 END) as degraded,
            SUM(CASE WHEN health_status = 'down' THEN 1 ELSE 0 END) as down,
            SUM(CASE WHEN health_status = 'disabled' THEN 1 ELSE 0 END) as disabled,
            SUM(jobs_found_24h) as total_jobs_24h
        FROM scraper_health_status
        "#,
    )
    .fetch_one(db.pool())
    .await?;

    Ok(HealthSummary {
        total_scrapers: row.total as i32,
        healthy: row.healthy as i32,
        degraded: row.degraded as i32,
        down: row.down as i32,
        disabled: row.disabled as i32,
        total_jobs_24h: row.total_jobs_24h as i32,
    })
}

/// Health summary statistics
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct HealthSummary {
    pub total_scrapers: i32,
    pub healthy: i32,
    pub degraded: i32,
    pub down: i32,
    pub disabled: i32,
    pub total_jobs_24h: i32,
}
