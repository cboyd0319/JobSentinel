//! Market intelligence query methods and data structures

use anyhow::Result;
use serde::{Deserialize, Serialize};
use sqlx::Row;

use super::MarketIntelligence;

/// Skill trend data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillTrend {
    pub skill_name: String,
    pub total_jobs: i64,
    pub avg_salary: Option<i64>,
    pub change_percent: f64,
    pub trend_direction: String, // "up" | "down" | "flat"
}

/// Company activity data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompanyActivity {
    pub company_name: String,
    pub total_posted: i64,
    pub avg_active: f64,
    pub hiring_trend: Option<String>,
    pub avg_salary: Option<i64>,
    pub growth_rate: f64,
}

/// Location heat data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocationHeat {
    pub location: String,
    pub city: Option<String>,
    pub state: Option<String>,
    pub total_jobs: i64,
    pub avg_median_salary: Option<i64>,
    pub remote_percent: f64,
}

impl MarketIntelligence {
    /// Get trending skills (last 30 days) with change percent
    pub async fn get_trending_skills(&self, limit: usize) -> Result<Vec<SkillTrend>> {
        let rows = sqlx::query(
            r#"
            WITH recent AS (
                SELECT
                    skill_name,
                    SUM(job_count) as total_jobs,
                    AVG(avg_salary) as avg_salary
                FROM skill_demand_trends
                WHERE date >= date('now', '-7 days')
                GROUP BY skill_name
            ),
            previous AS (
                SELECT
                    skill_name,
                    SUM(job_count) as prev_jobs
                FROM skill_demand_trends
                WHERE date >= date('now', '-14 days') AND date < date('now', '-7 days')
                GROUP BY skill_name
            )
            SELECT
                r.skill_name,
                r.total_jobs,
                r.avg_salary,
                COALESCE(
                    CASE WHEN p.prev_jobs > 0 
                         THEN ((r.total_jobs - p.prev_jobs) * 100.0 / p.prev_jobs)
                         ELSE 0.0
                    END, 0.0
                ) as change_percent
            FROM recent r
            LEFT JOIN previous p ON r.skill_name = p.skill_name
            ORDER BY r.total_jobs DESC
            LIMIT ?
            "#,
        )
        .bind(limit as i64)
        .fetch_all(&self.db)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| {
                let change_percent: f64 = r.try_get("change_percent").unwrap_or(0.0);
                let trend_direction = if change_percent > 5.0 {
                    "up".to_string()
                } else if change_percent < -5.0 {
                    "down".to_string()
                } else {
                    "flat".to_string()
                };
                SkillTrend {
                    skill_name: r.try_get("skill_name").unwrap_or_default(),
                    total_jobs: r.try_get("total_jobs").unwrap_or(0),
                    avg_salary: r
                        .try_get::<Option<f64>, _>("avg_salary")
                        .ok()
                        .flatten()
                        .map(|v| v as i64),
                    change_percent,
                    trend_direction,
                }
            })
            .collect())
    }

    /// Get most active companies with salary and growth rate
    pub async fn get_most_active_companies(&self, limit: usize) -> Result<Vec<CompanyActivity>> {
        let rows = sqlx::query(
            r#"
            WITH recent AS (
                SELECT
                    company_name,
                    SUM(jobs_posted_count) as total_posted,
                    AVG(jobs_active_count) as avg_active,
                    hiring_trend,
                    AVG(avg_salary_offered) as avg_salary
                FROM company_hiring_velocity
                WHERE date >= date('now', '-7 days')
                GROUP BY company_name
            ),
            previous AS (
                SELECT
                    company_name,
                    SUM(jobs_posted_count) as prev_posted
                FROM company_hiring_velocity
                WHERE date >= date('now', '-14 days') AND date < date('now', '-7 days')
                GROUP BY company_name
            )
            SELECT
                r.company_name,
                r.total_posted,
                r.avg_active,
                r.hiring_trend,
                r.avg_salary,
                COALESCE(
                    CASE WHEN p.prev_posted > 0
                         THEN ((r.total_posted - p.prev_posted) * 100.0 / p.prev_posted)
                         ELSE 0.0
                    END, 0.0
                ) as growth_rate
            FROM recent r
            LEFT JOIN previous p ON r.company_name = p.company_name
            ORDER BY r.total_posted DESC
            LIMIT ?
            "#,
        )
        .bind(limit as i64)
        .fetch_all(&self.db)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| CompanyActivity {
                company_name: r.try_get("company_name").unwrap_or_default(),
                total_posted: r.try_get("total_posted").unwrap_or(0),
                avg_active: r.try_get("avg_active").unwrap_or(0.0),
                hiring_trend: r.try_get("hiring_trend").ok(),
                avg_salary: r
                    .try_get::<Option<f64>, _>("avg_salary")
                    .ok()
                    .flatten()
                    .map(|v| v as i64),
                growth_rate: r.try_get("growth_rate").unwrap_or(0.0),
            })
            .collect())
    }

    /// Get hottest job markets by location with remote percentage
    pub async fn get_hottest_locations(&self, limit: usize) -> Result<Vec<LocationHeat>> {
        let rows = sqlx::query(
            r#"
            SELECT
                location_normalized,
                city,
                state,
                SUM(job_count) as total_jobs,
                AVG(median_salary) as avg_median_salary,
                COALESCE(
                    SUM(remote_job_count) * 100.0 / NULLIF(SUM(job_count), 0),
                    0.0
                ) as remote_percent
            FROM location_job_density
            WHERE date >= date('now', '-30 days')
            GROUP BY location_normalized
            ORDER BY total_jobs DESC
            LIMIT ?
            "#,
        )
        .bind(limit as i64)
        .fetch_all(&self.db)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| LocationHeat {
                location: r.try_get("location_normalized").unwrap_or_default(),
                city: r.try_get("city").ok(),
                state: r.try_get("state").ok(),
                total_jobs: r.try_get("total_jobs").unwrap_or(0),
                avg_median_salary: r
                    .try_get::<Option<f64>, _>("avg_median_salary")
                    .ok()
                    .flatten()
                    .map(|v| v as i64),
                remote_percent: r.try_get("remote_percent").unwrap_or(0.0),
            })
            .collect())
    }
}
