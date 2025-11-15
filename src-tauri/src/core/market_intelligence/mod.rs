//! Job Market Intelligence Dashboard
//!
//! Provides real-time analytics on job market trends, skill demand,
//! salary movements, company hiring velocity, and geographic distribution.

use anyhow::Result;
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

pub mod trends;
pub mod analytics;
pub mod alerts;

pub use trends::{SkillDemandTrend, SalaryTrend, RoleDemandTrend};
pub use analytics::{MarketAnalyzer, MarketSnapshot};
pub use alerts::{MarketAlert, AlertType, AlertSeverity};

/// Market intelligence manager
pub struct MarketIntelligence {
    db: SqlitePool,
    analyzer: MarketAnalyzer,
}

impl MarketIntelligence {
    pub fn new(db: SqlitePool) -> Self {
        let analyzer = MarketAnalyzer::new(db.clone());
        Self { db, analyzer }
    }

    /// Run daily market analysis (should be scheduled)
    pub async fn run_daily_analysis(&self) -> Result<MarketSnapshot> {
        tracing::info!("Running daily market analysis...");

        let snapshot = self.analyzer.create_daily_snapshot().await?;

        // Compute all trends
        self.compute_skill_demand_trends().await?;
        self.compute_salary_trends().await?;
        self.compute_company_hiring_velocity().await?;
        self.compute_location_job_density().await?;
        self.compute_role_demand_trends().await?;

        // Detect market alerts
        self.detect_market_alerts().await?;

        tracing::info!("Daily market analysis complete");
        Ok(snapshot)
    }

    /// Compute skill demand trends for today
    async fn compute_skill_demand_trends(&self) -> Result<()> {
        let today = Utc::now().date_naive();

        // Get all skills from job_skills table grouped by skill
        let records = sqlx::query!(
            r#"
            SELECT
                skill_name,
                COUNT(DISTINCT job_hash) as job_count,
                COUNT(*) as mention_count
            FROM job_skills
            WHERE created_at >= date('now', 'start of day')
            GROUP BY skill_name
            "#
        )
        .fetch_all(&self.db)
        .await?;

        for record in records {
            // Get salary stats for jobs with this skill
            let salary_stats = sqlx::query!(
                r#"
                SELECT
                    AVG(jsp.predicted_median) as avg_salary,
                    MEDIAN(jsp.predicted_median) as median_salary
                FROM job_skills js
                JOIN job_salary_predictions jsp ON js.job_hash = jsp.job_hash
                WHERE js.skill_name = ?
                  AND js.created_at >= date('now', 'start of day')
                "#,
                record.skill_name
            )
            .fetch_one(&self.db)
            .await
            .ok();

            // Get top company and location for this skill
            let top_data = sqlx::query!(
                r#"
                SELECT
                    j.company as top_company,
                    j.location as top_location
                FROM job_skills js
                JOIN jobs j ON js.job_hash = j.hash
                WHERE js.skill_name = ?
                  AND js.created_at >= date('now', 'start of day')
                GROUP BY j.company, j.location
                ORDER BY COUNT(*) DESC
                LIMIT 1
                "#,
                record.skill_name
            )
            .fetch_optional(&self.db)
            .await?;

            // Insert or update skill demand trend
            sqlx::query!(
                r#"
                INSERT INTO skill_demand_trends (
                    skill_name, date, mention_count, job_count,
                    avg_salary, median_salary, top_company, top_location
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(skill_name, date) DO UPDATE SET
                    mention_count = excluded.mention_count,
                    job_count = excluded.job_count,
                    avg_salary = excluded.avg_salary,
                    median_salary = excluded.median_salary,
                    top_company = excluded.top_company,
                    top_location = excluded.top_location
                "#,
                record.skill_name,
                today.to_string(),
                record.mention_count,
                record.job_count,
                salary_stats.as_ref().and_then(|s| s.avg_salary.map(|v| v as i64)),
                salary_stats.as_ref().and_then(|s| s.median_salary.map(|v| v as i64)),
                top_data.as_ref().map(|d| d.top_company.as_str()),
                top_data.as_ref().map(|d| d.top_location.as_str())
            )
            .execute(&self.db)
            .await?;
        }

        Ok(())
    }

    /// Compute salary trends by role and location
    async fn compute_salary_trends(&self) -> Result<()> {
        let today = Utc::now().date_naive();

        // Get salary stats grouped by normalized title and location
        let records = sqlx::query!(
            r#"
            SELECT
                sb.job_title_normalized,
                sb.location_normalized,
                sb.min_salary,
                sb.p25_salary,
                sb.median_salary,
                sb.p75_salary,
                sb.max_salary,
                sb.average_salary,
                sb.sample_size
            FROM salary_benchmarks sb
            "#
        )
        .fetch_all(&self.db)
        .await?;

        for record in records {
            // Calculate salary growth (compare to previous period)
            let previous_trend = sqlx::query!(
                r#"
                SELECT median_salary
                FROM salary_trends
                WHERE job_title_normalized = ?
                  AND location_normalized = ?
                  AND date < ?
                ORDER BY date DESC
                LIMIT 1
                "#,
                record.job_title_normalized,
                record.location_normalized,
                today.to_string()
            )
            .fetch_optional(&self.db)
            .await?;

            let salary_growth_pct = if let Some(prev) = previous_trend {
                if prev.median_salary > 0 {
                    ((record.median_salary - prev.median_salary) as f64 / prev.median_salary as f64) * 100.0
                } else {
                    0.0
                }
            } else {
                0.0
            };

            sqlx::query!(
                r#"
                INSERT INTO salary_trends (
                    job_title_normalized, location_normalized, date,
                    min_salary, p25_salary, median_salary, p75_salary, max_salary,
                    avg_salary, sample_size, salary_growth_pct
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(job_title_normalized, location_normalized, date) DO UPDATE SET
                    min_salary = excluded.min_salary,
                    p25_salary = excluded.p25_salary,
                    median_salary = excluded.median_salary,
                    p75_salary = excluded.p75_salary,
                    max_salary = excluded.max_salary,
                    avg_salary = excluded.avg_salary,
                    sample_size = excluded.sample_size,
                    salary_growth_pct = excluded.salary_growth_pct
                "#,
                record.job_title_normalized,
                record.location_normalized,
                today.to_string(),
                record.min_salary,
                record.p25_salary,
                record.median_salary,
                record.p75_salary,
                record.max_salary,
                record.average_salary,
                record.sample_size,
                salary_growth_pct
            )
            .execute(&self.db)
            .await?;
        }

        Ok(())
    }

    /// Compute company hiring velocity
    async fn compute_company_hiring_velocity(&self) -> Result<()> {
        let today = Utc::now().date_naive();

        // Get companies and their job posting counts
        let companies = sqlx::query!(
            r#"
            SELECT DISTINCT company
            FROM jobs
            WHERE company IS NOT NULL AND company != ''
            "#
        )
        .fetch_all(&self.db)
        .await?;

        for company_record in companies {
            let company = &company_record.company;

            // Jobs posted today
            let jobs_posted = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM jobs WHERE company = ? AND DATE(posted_at) = DATE('now')"
            )
            .bind(company)
            .fetch_one(&self.db)
            .await?;

            // Currently active jobs
            let jobs_active = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM jobs WHERE company = ? AND status = 'active'"
            )
            .bind(company)
            .fetch_one(&self.db)
            .await?;

            // Jobs filled today (status changed to 'closed' or 'applied')
            let jobs_filled = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM jobs WHERE company = ? AND status IN ('closed', 'filled') AND DATE(updated_at) = DATE('now')"
            )
            .bind(company)
            .fetch_one(&self.db)
            .await?;

            // Top role
            let top_role = sqlx::query_scalar::<_, Option<String>>(
                r#"
                SELECT title
                FROM jobs
                WHERE company = ?
                GROUP BY title
                ORDER BY COUNT(*) DESC
                LIMIT 1
                "#
            )
            .bind(company)
            .fetch_one(&self.db)
            .await?;

            // Top location
            let top_location = sqlx::query_scalar::<_, Option<String>>(
                r#"
                SELECT location
                FROM jobs
                WHERE company = ?
                GROUP BY location
                ORDER BY COUNT(*) DESC
                LIMIT 1
                "#
            )
            .bind(company)
            .fetch_one(&self.db)
            .await?;

            // Determine hiring trend (compare to previous week)
            let prev_week_velocity = sqlx::query_scalar::<_, Option<i64>>(
                r#"
                SELECT jobs_posted_count
                FROM company_hiring_velocity
                WHERE company_name = ?
                  AND date >= date('now', '-7 days')
                ORDER BY date DESC
                LIMIT 1
                "#
            )
            .bind(company)
            .fetch_one(&self.db)
            .await?;

            let hiring_trend = if let Some(prev) = prev_week_velocity {
                if jobs_posted > prev {
                    "increasing"
                } else if jobs_posted < prev {
                    "decreasing"
                } else {
                    "stable"
                }
            } else {
                "stable"
            };

            sqlx::query!(
                r#"
                INSERT INTO company_hiring_velocity (
                    company_name, date, jobs_posted_count, jobs_filled_count,
                    jobs_active_count, top_role, top_location,
                    is_actively_hiring, hiring_trend
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(company_name, date) DO UPDATE SET
                    jobs_posted_count = excluded.jobs_posted_count,
                    jobs_filled_count = excluded.jobs_filled_count,
                    jobs_active_count = excluded.jobs_active_count,
                    top_role = excluded.top_role,
                    top_location = excluded.top_location,
                    is_actively_hiring = excluded.is_actively_hiring,
                    hiring_trend = excluded.hiring_trend
                "#,
                company,
                today.to_string(),
                jobs_posted,
                jobs_filled,
                jobs_active,
                top_role,
                top_location,
                (jobs_posted > 0) as i32,
                hiring_trend
            )
            .execute(&self.db)
            .await?;
        }

        Ok(())
    }

    /// Compute location job density
    async fn compute_location_job_density(&self) -> Result<()> {
        let today = Utc::now().date_naive();

        // Get all unique locations
        let locations = sqlx::query!(
            r#"
            SELECT DISTINCT location
            FROM jobs
            WHERE location IS NOT NULL AND location != ''
            "#
        )
        .fetch_all(&self.db)
        .await?;

        for location_record in locations {
            let location = &location_record.location;
            let normalized = self.normalize_location(location);

            // Parse city, state from location
            let (city, state) = self.parse_location(location);

            // Job count for this location
            let job_count = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM jobs WHERE location = ?"
            )
            .bind(location)
            .fetch_one(&self.db)
            .await?;

            // Remote job count
            let remote_count = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*)
                FROM jobs
                WHERE location = ?
                  AND (LOWER(location) LIKE '%remote%' OR LOWER(title) LIKE '%remote%')
                "#
            )
            .bind(location)
            .fetch_one(&self.db)
            .await?;

            // Salary stats
            let salary_stats = sqlx::query!(
                r#"
                SELECT
                    AVG(jsp.predicted_median) as avg_salary,
                    MEDIAN(jsp.predicted_median) as median_salary
                FROM jobs j
                LEFT JOIN job_salary_predictions jsp ON j.hash = jsp.job_hash
                WHERE j.location = ?
                "#,
                location
            )
            .fetch_one(&self.db)
            .await?;

            // Top skill
            let top_skill = sqlx::query_scalar::<_, Option<String>>(
                r#"
                SELECT js.skill_name
                FROM job_skills js
                JOIN jobs j ON js.job_hash = j.hash
                WHERE j.location = ?
                GROUP BY js.skill_name
                ORDER BY COUNT(*) DESC
                LIMIT 1
                "#
            )
            .bind(location)
            .fetch_one(&self.db)
            .await?;

            // Top company
            let top_company = sqlx::query_scalar::<_, Option<String>>(
                r#"
                SELECT company
                FROM jobs
                WHERE location = ?
                GROUP BY company
                ORDER BY COUNT(*) DESC
                LIMIT 1
                "#
            )
            .bind(location)
            .fetch_one(&self.db)
            .await?;

            // Top role
            let top_role = sqlx::query_scalar::<_, Option<String>>(
                r#"
                SELECT title
                FROM jobs
                WHERE location = ?
                GROUP BY title
                ORDER BY COUNT(*) DESC
                LIMIT 1
                "#
            )
            .bind(location)
            .fetch_one(&self.db)
            .await?;

            sqlx::query!(
                r#"
                INSERT INTO location_job_density (
                    location_normalized, city, state, date,
                    job_count, remote_job_count, avg_salary, median_salary,
                    top_skill, top_company, top_role
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(location_normalized, date) DO UPDATE SET
                    job_count = excluded.job_count,
                    remote_job_count = excluded.remote_job_count,
                    avg_salary = excluded.avg_salary,
                    median_salary = excluded.median_salary,
                    top_skill = excluded.top_skill,
                    top_company = excluded.top_company,
                    top_role = excluded.top_role
                "#,
                normalized,
                city,
                state,
                today.to_string(),
                job_count,
                remote_count,
                salary_stats.avg_salary.map(|v| v as i64),
                salary_stats.median_salary.map(|v| v as i64),
                top_skill,
                top_company,
                top_role
            )
            .execute(&self.db)
            .await?;
        }

        Ok(())
    }

    /// Compute role demand trends
    async fn compute_role_demand_trends(&self) -> Result<()> {
        let today = Utc::now().date_naive();

        // Get all job titles (normalized)
        let titles = sqlx::query!(
            r#"
            SELECT DISTINCT job_title_normalized
            FROM salary_benchmarks
            "#
        )
        .fetch_all(&self.db)
        .await?;

        for title_record in titles {
            let title = &title_record.job_title_normalized;

            // Job count for this role
            let job_count = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM jobs WHERE LOWER(title) LIKE '%' || ? || '%'"
            )
            .bind(title)
            .fetch_one(&self.db)
            .await?;

            // Salary stats
            let salary_stats = sqlx::query!(
                r#"
                SELECT
                    AVG(jsp.predicted_median) as avg_salary,
                    MEDIAN(jsp.predicted_median) as median_salary
                FROM jobs j
                LEFT JOIN job_salary_predictions jsp ON j.hash = jsp.job_hash
                WHERE LOWER(j.title) LIKE '%' || ? || '%'
                "#,
                title
            )
            .fetch_one(&self.db)
            .await?;

            // Top company and location
            let top_data = sqlx::query!(
                r#"
                SELECT company, location
                FROM jobs
                WHERE LOWER(title) LIKE '%' || ? || '%'
                GROUP BY company, location
                ORDER BY COUNT(*) DESC
                LIMIT 1
                "#,
                title
            )
            .fetch_optional(&self.db)
            .await?;

            // Remote percentage
            let remote_pct = sqlx::query_scalar::<_, Option<f64>>(
                r#"
                SELECT
                    CAST(SUM(CASE WHEN LOWER(location) LIKE '%remote%' THEN 1 ELSE 0 END) AS REAL) /
                    CAST(COUNT(*) AS REAL) * 100.0
                FROM jobs
                WHERE LOWER(title) LIKE '%' || ? || '%'
                "#
            )
            .bind(title)
            .fetch_one(&self.db)
            .await?;

            // Determine demand trend (compare to previous week)
            let prev_week_demand = sqlx::query_scalar::<_, Option<i64>>(
                r#"
                SELECT job_count
                FROM role_demand_trends
                WHERE job_title_normalized = ?
                  AND date >= date('now', '-7 days')
                ORDER BY date DESC
                LIMIT 1
                "#
            )
            .bind(title)
            .fetch_one(&self.db)
            .await?;

            let demand_trend = if let Some(prev) = prev_week_demand {
                if job_count > prev {
                    "rising"
                } else if job_count < prev {
                    "falling"
                } else {
                    "stable"
                }
            } else {
                "stable"
            };

            sqlx::query!(
                r#"
                INSERT INTO role_demand_trends (
                    job_title_normalized, date, job_count,
                    avg_salary, median_salary, top_company, top_location,
                    remote_percentage, demand_trend
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(job_title_normalized, date) DO UPDATE SET
                    job_count = excluded.job_count,
                    avg_salary = excluded.avg_salary,
                    median_salary = excluded.median_salary,
                    top_company = excluded.top_company,
                    top_location = excluded.top_location,
                    remote_percentage = excluded.remote_percentage,
                    demand_trend = excluded.demand_trend
                "#,
                title,
                today.to_string(),
                job_count,
                salary_stats.avg_salary.map(|v| v as i64),
                salary_stats.median_salary.map(|v| v as i64),
                top_data.as_ref().map(|d| d.company.as_str()),
                top_data.as_ref().map(|d| d.location.as_str()),
                remote_pct,
                demand_trend
            )
            .execute(&self.db)
            .await?;
        }

        Ok(())
    }

    /// Detect market alerts (anomalies, trends)
    async fn detect_market_alerts(&self) -> Result<()> {
        // Detect skill surges (50%+ increase in mentions)
        let skill_surges = sqlx::query!(
            r#"
            SELECT
                curr.skill_name,
                curr.mention_count as current_mentions,
                prev.mention_count as prev_mentions,
                ((curr.mention_count - prev.mention_count) * 100.0 / prev.mention_count) as pct_change
            FROM skill_demand_trends curr
            LEFT JOIN skill_demand_trends prev ON
                curr.skill_name = prev.skill_name AND
                prev.date = date(curr.date, '-7 days')
            WHERE curr.date = date('now')
              AND prev.mention_count > 0
              AND ((curr.mention_count - prev.mention_count) * 100.0 / prev.mention_count) >= 50
            "#
        )
        .fetch_all(&self.db)
        .await?;

        for surge in skill_surges {
            let pct_change = ((surge.current_mentions - surge.prev_mentions) as f64
                / surge.prev_mentions as f64) * 100.0;

            sqlx::query!(
                r#"
                INSERT INTO market_alerts (
                    alert_type, title, description, severity,
                    related_entity, related_entity_type, metric_value, metric_change_pct
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                "#,
                "skill_surge",
                format!("{} demand surging!", surge.skill_name),
                format!(
                    "The skill '{}' saw a {}% increase in job postings this week ({} → {} mentions).",
                    surge.skill_name, pct_change as i32, surge.prev_mentions, surge.current_mentions
                ),
                "info",
                surge.skill_name,
                "skill",
                surge.current_mentions as f64,
                pct_change
            )
            .execute(&self.db)
            .await?;
        }

        // Detect salary spikes (25%+ increase)
        let salary_spikes = sqlx::query!(
            r#"
            SELECT
                job_title_normalized,
                location_normalized,
                salary_growth_pct,
                median_salary
            FROM salary_trends
            WHERE date = date('now')
              AND salary_growth_pct >= 25.0
            "#
        )
        .fetch_all(&self.db)
        .await?;

        for spike in salary_spikes {
            if let Some(growth) = spike.salary_growth_pct {
                sqlx::query!(
                    r#"
                    INSERT INTO market_alerts (
                        alert_type, title, description, severity,
                        related_entity, related_entity_type, metric_value, metric_change_pct
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    "#,
                    "salary_spike",
                    format!("{} salaries jumping in {}", spike.job_title_normalized, spike.location_normalized),
                    format!(
                        "Salaries for '{}' in {} increased by {:.1}% (median: ${}).",
                        spike.job_title_normalized, spike.location_normalized, growth, spike.median_salary
                    ),
                    "info",
                    spike.job_title_normalized,
                    "role",
                    spike.median_salary as f64,
                    growth
                )
                .execute(&self.db)
                .await?;
            }
        }

        // Detect hiring sprees (companies posting 10+ jobs in a day)
        let hiring_sprees = sqlx::query!(
            r#"
            SELECT
                company_name,
                jobs_posted_count,
                jobs_active_count
            FROM company_hiring_velocity
            WHERE date = date('now')
              AND jobs_posted_count >= 10
            "#
        )
        .fetch_all(&self.db)
        .await?;

        for spree in hiring_sprees {
            sqlx::query!(
                r#"
                INSERT INTO market_alerts (
                    alert_type, title, description, severity,
                    related_entity, related_entity_type, metric_value
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                "#,
                "hiring_spree",
                format!("{} hiring aggressively", spree.company_name),
                format!(
                    "{} posted {} new jobs today ({} total active positions).",
                    spree.company_name, spree.jobs_posted_count, spree.jobs_active_count
                ),
                "info",
                spree.company_name,
                "company",
                spree.jobs_posted_count as f64
            )
            .execute(&self.db)
            .await?;
        }

        Ok(())
    }

    /// Get trending skills (last 30 days)
    pub async fn get_trending_skills(&self, limit: usize) -> Result<Vec<SkillTrend>> {
        let records = sqlx::query!(
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
            limit as i64
        )
        .fetch_all(&self.db)
        .await?;

        Ok(records
            .into_iter()
            .map(|r| SkillTrend {
                skill_name: r.skill_name,
                total_jobs: r.total_jobs.unwrap_or(0),
                avg_salary: r.avg_salary.map(|v| v as i64),
            })
            .collect())
    }

    /// Get most active companies
    pub async fn get_most_active_companies(&self, limit: usize) -> Result<Vec<CompanyActivity>> {
        let records = sqlx::query!(
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
            limit as i64
        )
        .fetch_all(&self.db)
        .await?;

        Ok(records
            .into_iter()
            .map(|r| CompanyActivity {
                company_name: r.company_name,
                total_posted: r.total_posted.unwrap_or(0),
                avg_active: r.avg_active.unwrap_or(0.0),
                hiring_trend: r.hiring_trend,
            })
            .collect())
    }

    /// Get hottest job markets by location
    pub async fn get_hottest_locations(&self, limit: usize) -> Result<Vec<LocationHeat>> {
        let records = sqlx::query!(
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
            limit as i64
        )
        .fetch_all(&self.db)
        .await?;

        Ok(records
            .into_iter()
            .map(|r| LocationHeat {
                location: r.location_normalized,
                city: r.city,
                state: r.state,
                total_jobs: r.total_jobs.unwrap_or(0),
                avg_median_salary: r.avg_median_salary.map(|v| v as i64),
            })
            .collect())
    }

    /// Get unread market alerts
    pub async fn get_unread_alerts(&self) -> Result<Vec<MarketAlert>> {
        alerts::get_unread_alerts(&self.db).await
    }

    fn normalize_location(&self, location: &str) -> String {
        let lower = location.to_lowercase();
        if lower.contains("san francisco") || lower.contains("sf") {
            "san francisco, ca".to_string()
        } else if lower.contains("new york") || lower.contains("nyc") {
            "new york, ny".to_string()
        } else if lower.contains("remote") {
            "remote".to_string()
        } else {
            lower
        }
    }

    fn parse_location(&self, location: &str) -> (Option<String>, Option<String>) {
        let parts: Vec<&str> = location.split(',').map(|s| s.trim()).collect();
        if parts.len() >= 2 {
            (Some(parts[0].to_string()), Some(parts[1].to_string()))
        } else {
            (Some(location.to_string()), None)
        }
    }
}

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
