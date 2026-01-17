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
}

/// Company activity data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompanyActivity {
    pub company_name: String,
    pub total_posted: i64,
    pub avg_active: f64,
    pub hiring_trend: Option<String>,
}

/// Location heat data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocationHeat {
    pub location: String,
    pub city: Option<String>,
    pub state: Option<String>,
    pub total_jobs: i64,
    pub avg_median_salary: Option<i64>,
}

impl MarketIntelligence {
    /// Get trending skills (last 30 days)
    pub async fn get_trending_skills(&self, limit: usize) -> Result<Vec<SkillTrend>> {
        let rows = sqlx::query(
            r#"
            SELECT
                skill_name,
                SUM(job_count) as total_jobs,
                AVG(avg_salary) as avg_salary
            FROM skill_demand_trends
            WHERE date >= date('now', '-30 days')
            GROUP BY skill_name
            ORDER BY total_jobs DESC
            LIMIT ?
            "#,
        )
        .bind(limit as i64)
        .fetch_all(&self.db)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| SkillTrend {
                skill_name: r.try_get("skill_name").unwrap_or_default(),
                total_jobs: r.try_get("total_jobs").unwrap_or(0),
                avg_salary: r
                    .try_get::<Option<f64>, _>("avg_salary")
                    .ok()
                    .flatten()
                    .map(|v| v as i64),
            })
            .collect())
    }

    /// Get most active companies
    pub async fn get_most_active_companies(&self, limit: usize) -> Result<Vec<CompanyActivity>> {
        let rows = sqlx::query(
            r#"
            SELECT
                company_name,
                SUM(jobs_posted_count) as total_posted,
                AVG(jobs_active_count) as avg_active,
                hiring_trend
            FROM company_hiring_velocity
            WHERE date >= date('now', '-30 days')
            GROUP BY company_name
            ORDER BY total_posted DESC
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
            })
            .collect())
    }

    /// Get hottest job markets by location
    pub async fn get_hottest_locations(&self, limit: usize) -> Result<Vec<LocationHeat>> {
        let rows = sqlx::query(
            r#"
            SELECT
                location_normalized,
                city,
                state,
                SUM(job_count) as total_jobs,
                AVG(median_salary) as avg_median_salary
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
            })
            .collect())
    }
}
