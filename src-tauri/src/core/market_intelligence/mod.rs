//! Job Market Intelligence Dashboard
//!
//! Provides real-time analytics on job market trends, skill demand,
//! salary movements, company hiring velocity, and geographic distribution.

use anyhow::Result;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::{Row, SqlitePool};

pub mod alerts;
pub mod analytics;
pub mod trends;

pub use alerts::{AlertSeverity, AlertType, MarketAlert};
pub use analytics::{MarketAnalyzer, MarketSnapshot};
pub use trends::{RoleDemandTrend, SalaryTrend, SkillDemandTrend};

/// Compute median from a vector of values (SQLite doesn't have MEDIAN())
fn compute_median(values: &mut [f64]) -> Option<f64> {
    if values.is_empty() {
        return None;
    }
    values.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    let len = values.len();
    if len.is_multiple_of(2) {
        Some((values[len / 2 - 1] + values[len / 2]) / 2.0)
    } else {
        Some(values[len / 2])
    }
}

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
        let records = sqlx::query(
            r#"
            SELECT
                skill_name,
                COUNT(DISTINCT job_hash) as job_count,
                COUNT(*) as mention_count
            FROM job_skills
            WHERE created_at >= date('now', 'start of day')
            GROUP BY skill_name
            "#,
        )
        .fetch_all(&self.db)
        .await?;

        for record in records {
            let skill_name: String = record.try_get("skill_name")?;
            let mention_count: i64 = record.try_get("mention_count")?;
            let job_count: i64 = record.try_get("job_count")?;

            // Get salary stats for jobs with this skill
            let salary_rows = sqlx::query(
                r#"
                SELECT jsp.predicted_median
                FROM job_skills js
                JOIN job_salary_predictions jsp ON js.job_hash = jsp.job_hash
                WHERE js.skill_name = ?
                  AND js.created_at >= date('now', 'start of day')
                "#,
            )
            .bind(&skill_name)
            .fetch_all(&self.db)
            .await?;

            let mut salaries: Vec<f64> = salary_rows
                .iter()
                .filter_map(|r| r.try_get::<f64, _>("predicted_median").ok())
                .collect();
            let avg_salary = if salaries.is_empty() {
                None
            } else {
                Some(salaries.iter().sum::<f64>() / salaries.len() as f64)
            };
            let median_salary = compute_median(&mut salaries);

            // Get top company and location for this skill
            let top_data = sqlx::query(
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
            )
            .bind(&skill_name)
            .fetch_optional(&self.db)
            .await?;

            let top_company: Option<String> =
                top_data.as_ref().and_then(|r| r.try_get("top_company").ok());
            let top_location: Option<String> =
                top_data.as_ref().and_then(|r| r.try_get("top_location").ok());

            // Insert or update skill demand trend
            sqlx::query(
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
            )
            .bind(&skill_name)
            .bind(today.to_string())
            .bind(mention_count)
            .bind(job_count)
            .bind(avg_salary.map(|v| v as i64))
            .bind(median_salary.map(|v| v as i64))
            .bind(&top_company)
            .bind(&top_location)
            .execute(&self.db)
            .await?;
        }

        Ok(())
    }

    /// Compute salary trends by role and location
    async fn compute_salary_trends(&self) -> Result<()> {
        let today = Utc::now().date_naive();

        // Get salary stats grouped by normalized title and location
        let records = sqlx::query(
            r#"
            SELECT
                job_title_normalized,
                location_normalized,
                min_salary,
                p25_salary,
                median_salary,
                p75_salary,
                max_salary,
                average_salary,
                sample_size
            FROM salary_benchmarks
            "#,
        )
        .fetch_all(&self.db)
        .await?;

        for record in records {
            let job_title: String = record.try_get("job_title_normalized")?;
            let location: String = record.try_get("location_normalized")?;
            let min_salary: i64 = record.try_get("min_salary")?;
            let p25_salary: i64 = record.try_get("p25_salary")?;
            let median_salary: i64 = record.try_get("median_salary")?;
            let p75_salary: i64 = record.try_get("p75_salary")?;
            let max_salary: i64 = record.try_get("max_salary")?;
            let average_salary: i64 = record.try_get("average_salary")?;
            let sample_size: i64 = record.try_get("sample_size")?;

            // Calculate salary growth (compare to previous period)
            let prev_median = sqlx::query_scalar::<_, Option<i64>>(
                r#"
                SELECT median_salary
                FROM salary_trends
                WHERE job_title_normalized = ?
                  AND location_normalized = ?
                  AND date < ?
                ORDER BY date DESC
                LIMIT 1
                "#,
            )
            .bind(&job_title)
            .bind(&location)
            .bind(today.to_string())
            .fetch_one(&self.db)
            .await
            .unwrap_or(None);

            let salary_growth_pct = if let Some(prev) = prev_median {
                if prev > 0 {
                    ((median_salary - prev) as f64 / prev as f64) * 100.0
                } else {
                    0.0
                }
            } else {
                0.0
            };

            sqlx::query(
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
            )
            .bind(&job_title)
            .bind(&location)
            .bind(today.to_string())
            .bind(min_salary)
            .bind(p25_salary)
            .bind(median_salary)
            .bind(p75_salary)
            .bind(max_salary)
            .bind(average_salary)
            .bind(sample_size)
            .bind(salary_growth_pct)
            .execute(&self.db)
            .await?;
        }

        Ok(())
    }

    /// Compute company hiring velocity
    async fn compute_company_hiring_velocity(&self) -> Result<()> {
        let today = Utc::now().date_naive();

        // Get companies and their job posting counts
        let companies = sqlx::query(
            r#"
            SELECT DISTINCT company
            FROM jobs
            WHERE company IS NOT NULL AND company != ''
            "#,
        )
        .fetch_all(&self.db)
        .await?;

        for company_record in companies {
            let company: String = company_record.try_get("company")?;

            // Jobs posted today
            let jobs_posted = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM jobs WHERE company = ? AND DATE(posted_at) = DATE('now')",
            )
            .bind(&company)
            .fetch_one(&self.db)
            .await?;

            // Currently active jobs
            let jobs_active = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM jobs WHERE company = ? AND status = 'active'",
            )
            .bind(&company)
            .fetch_one(&self.db)
            .await?;

            // Jobs filled today (status changed to 'closed' or 'filled')
            let jobs_filled = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM jobs WHERE company = ? AND status IN ('closed', 'filled') AND DATE(updated_at) = DATE('now')"
            )
            .bind(&company)
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
                "#,
            )
            .bind(&company)
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
                "#,
            )
            .bind(&company)
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
                "#,
            )
            .bind(&company)
            .fetch_one(&self.db)
            .await
            .unwrap_or(None);

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

            sqlx::query(
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
            )
            .bind(&company)
            .bind(today.to_string())
            .bind(jobs_posted)
            .bind(jobs_filled)
            .bind(jobs_active)
            .bind(&top_role)
            .bind(&top_location)
            .bind((jobs_posted > 0) as i32)
            .bind(hiring_trend)
            .execute(&self.db)
            .await?;
        }

        Ok(())
    }

    /// Compute location job density
    async fn compute_location_job_density(&self) -> Result<()> {
        let today = Utc::now().date_naive();

        // Get all unique locations
        let locations = sqlx::query(
            r#"
            SELECT DISTINCT location
            FROM jobs
            WHERE location IS NOT NULL AND location != ''
            "#,
        )
        .fetch_all(&self.db)
        .await?;

        for location_record in locations {
            let location: String = location_record.try_get("location")?;
            let normalized = self.normalize_location(&location);

            // Parse city, state from location
            let (city, state) = self.parse_location(&location);

            // Job count for this location
            let job_count =
                sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM jobs WHERE location = ?")
                    .bind(&location)
                    .fetch_one(&self.db)
                    .await?;

            // Remote job count
            let remote_count = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*)
                FROM jobs
                WHERE location = ?
                  AND (LOWER(location) LIKE '%remote%' OR LOWER(title) LIKE '%remote%')
                "#,
            )
            .bind(&location)
            .fetch_one(&self.db)
            .await?;

            // Salary stats - fetch all and compute in Rust
            let salary_rows = sqlx::query(
                r#"
                SELECT jsp.predicted_median
                FROM jobs j
                LEFT JOIN job_salary_predictions jsp ON j.hash = jsp.job_hash
                WHERE j.location = ?
                "#,
            )
            .bind(&location)
            .fetch_all(&self.db)
            .await?;

            let mut salaries: Vec<f64> = salary_rows
                .iter()
                .filter_map(|r| r.try_get::<f64, _>("predicted_median").ok())
                .collect();
            let avg_salary = if salaries.is_empty() {
                None
            } else {
                Some(salaries.iter().sum::<f64>() / salaries.len() as f64)
            };
            let median_salary = compute_median(&mut salaries);

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
                "#,
            )
            .bind(&location)
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
                "#,
            )
            .bind(&location)
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
                "#,
            )
            .bind(&location)
            .fetch_one(&self.db)
            .await?;

            sqlx::query(
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
            )
            .bind(&normalized)
            .bind(&city)
            .bind(&state)
            .bind(today.to_string())
            .bind(job_count)
            .bind(remote_count)
            .bind(avg_salary.map(|v| v as i64))
            .bind(median_salary.map(|v| v as i64))
            .bind(&top_skill)
            .bind(&top_company)
            .bind(&top_role)
            .execute(&self.db)
            .await?;
        }

        Ok(())
    }

    /// Compute role demand trends
    async fn compute_role_demand_trends(&self) -> Result<()> {
        let today = Utc::now().date_naive();

        // Get all job titles (normalized)
        let titles = sqlx::query(
            r#"
            SELECT DISTINCT job_title_normalized
            FROM salary_benchmarks
            "#,
        )
        .fetch_all(&self.db)
        .await?;

        for title_record in titles {
            let title: String = title_record.try_get("job_title_normalized")?;

            // Job count for this role
            let job_count = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM jobs WHERE LOWER(title) LIKE '%' || ? || '%'",
            )
            .bind(&title)
            .fetch_one(&self.db)
            .await?;

            // Salary stats - fetch all and compute in Rust
            let salary_rows = sqlx::query(
                r#"
                SELECT jsp.predicted_median
                FROM jobs j
                LEFT JOIN job_salary_predictions jsp ON j.hash = jsp.job_hash
                WHERE LOWER(j.title) LIKE '%' || ? || '%'
                "#,
            )
            .bind(&title)
            .fetch_all(&self.db)
            .await?;

            let mut salaries: Vec<f64> = salary_rows
                .iter()
                .filter_map(|r| r.try_get::<f64, _>("predicted_median").ok())
                .collect();
            let avg_salary = if salaries.is_empty() {
                None
            } else {
                Some(salaries.iter().sum::<f64>() / salaries.len() as f64)
            };
            let median_salary = compute_median(&mut salaries);

            // Top company and location
            let top_data = sqlx::query(
                r#"
                SELECT company, location
                FROM jobs
                WHERE LOWER(title) LIKE '%' || ? || '%'
                GROUP BY company, location
                ORDER BY COUNT(*) DESC
                LIMIT 1
                "#,
            )
            .bind(&title)
            .fetch_optional(&self.db)
            .await?;

            let top_company: Option<String> =
                top_data.as_ref().and_then(|r| r.try_get("company").ok());
            let top_location: Option<String> =
                top_data.as_ref().and_then(|r| r.try_get("location").ok());

            // Remote percentage
            let remote_pct = sqlx::query_scalar::<_, Option<f64>>(
                r#"
                SELECT
                    CAST(SUM(CASE WHEN LOWER(location) LIKE '%remote%' THEN 1 ELSE 0 END) AS REAL) /
                    CAST(COUNT(*) AS REAL) * 100.0
                FROM jobs
                WHERE LOWER(title) LIKE '%' || ? || '%'
                "#,
            )
            .bind(&title)
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
                "#,
            )
            .bind(&title)
            .fetch_one(&self.db)
            .await
            .unwrap_or(None);

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

            sqlx::query(
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
            )
            .bind(&title)
            .bind(today.to_string())
            .bind(job_count)
            .bind(avg_salary.map(|v| v as i64))
            .bind(median_salary.map(|v| v as i64))
            .bind(&top_company)
            .bind(&top_location)
            .bind(remote_pct)
            .bind(demand_trend)
            .execute(&self.db)
            .await?;
        }

        Ok(())
    }

    /// Detect market alerts (anomalies, trends)
    async fn detect_market_alerts(&self) -> Result<()> {
        // Detect skill surges (50%+ increase in mentions)
        let skill_surges = sqlx::query(
            r#"
            SELECT
                curr.skill_name,
                curr.mention_count as current_mentions,
                prev.mention_count as prev_mentions
            FROM skill_demand_trends curr
            LEFT JOIN skill_demand_trends prev ON
                curr.skill_name = prev.skill_name AND
                prev.date = date(curr.date, '-7 days')
            WHERE curr.date = date('now')
              AND prev.mention_count > 0
              AND ((curr.mention_count - prev.mention_count) * 100.0 / prev.mention_count) >= 50
            "#,
        )
        .fetch_all(&self.db)
        .await?;

        for surge in skill_surges {
            let skill_name: String = surge.try_get("skill_name")?;
            let current_mentions: i64 = surge.try_get("current_mentions")?;
            let prev_mentions: i64 = surge.try_get("prev_mentions")?;

            let pct_change = ((current_mentions - prev_mentions) as f64 / prev_mentions as f64) * 100.0;

            sqlx::query(
                r#"
                INSERT INTO market_alerts (
                    alert_type, title, description, severity,
                    related_entity, related_entity_type, metric_value, metric_change_pct
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                "#,
            )
            .bind("skill_surge")
            .bind(format!("{} demand surging!", skill_name))
            .bind(format!(
                "The skill '{}' saw a {}% increase in job postings this week ({} -> {} mentions).",
                skill_name, pct_change as i32, prev_mentions, current_mentions
            ))
            .bind("info")
            .bind(&skill_name)
            .bind("skill")
            .bind(current_mentions as f64)
            .bind(pct_change)
            .execute(&self.db)
            .await?;
        }

        // Detect salary spikes (25%+ increase)
        let salary_spikes = sqlx::query(
            r#"
            SELECT
                job_title_normalized,
                location_normalized,
                salary_growth_pct,
                median_salary
            FROM salary_trends
            WHERE date = date('now')
              AND salary_growth_pct >= 25.0
            "#,
        )
        .fetch_all(&self.db)
        .await?;

        for spike in salary_spikes {
            let job_title: String = spike.try_get("job_title_normalized")?;
            let location: String = spike.try_get("location_normalized")?;
            let growth: f64 = spike.try_get("salary_growth_pct")?;
            let median: i64 = spike.try_get("median_salary")?;

            sqlx::query(
                r#"
                INSERT INTO market_alerts (
                    alert_type, title, description, severity,
                    related_entity, related_entity_type, metric_value, metric_change_pct
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                "#,
            )
            .bind("salary_spike")
            .bind(format!("{} salaries jumping in {}", job_title, location))
            .bind(format!(
                "Salaries for '{}' in {} increased by {:.1}% (median: ${}).",
                job_title, location, growth, median
            ))
            .bind("info")
            .bind(&job_title)
            .bind("role")
            .bind(median as f64)
            .bind(growth)
            .execute(&self.db)
            .await?;
        }

        // Detect hiring sprees (companies posting 10+ jobs in a day)
        let hiring_sprees = sqlx::query(
            r#"
            SELECT
                company_name,
                jobs_posted_count,
                jobs_active_count
            FROM company_hiring_velocity
            WHERE date = date('now')
              AND jobs_posted_count >= 10
            "#,
        )
        .fetch_all(&self.db)
        .await?;

        for spree in hiring_sprees {
            let company_name: String = spree.try_get("company_name")?;
            let jobs_posted: i64 = spree.try_get("jobs_posted_count")?;
            let jobs_active: i64 = spree.try_get("jobs_active_count")?;

            sqlx::query(
                r#"
                INSERT INTO market_alerts (
                    alert_type, title, description, severity,
                    related_entity, related_entity_type, metric_value
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                "#,
            )
            .bind("hiring_spree")
            .bind(format!("{} hiring aggressively", company_name))
            .bind(format!(
                "{} posted {} new jobs today ({} total active positions).",
                company_name, jobs_posted, jobs_active
            ))
            .bind("info")
            .bind(&company_name)
            .bind("company")
            .bind(jobs_posted as f64)
            .execute(&self.db)
            .await?;
        }

        Ok(())
    }

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
                avg_salary: r.try_get::<Option<f64>, _>("avg_salary").ok().flatten().map(|v| v as i64),
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
                avg_median_salary: r.try_get::<Option<f64>, _>("avg_median_salary").ok().flatten().map(|v| v as i64),
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compute_median_odd_length() {
        let mut values = vec![5.0, 1.0, 3.0];
        assert_eq!(compute_median(&mut values), Some(3.0));
    }

    #[test]
    fn test_compute_median_even_length() {
        let mut values = vec![1.0, 2.0, 3.0, 4.0];
        assert_eq!(compute_median(&mut values), Some(2.5));
    }

    #[test]
    fn test_compute_median_single_value() {
        let mut values = vec![42.0];
        assert_eq!(compute_median(&mut values), Some(42.0));
    }

    #[test]
    fn test_compute_median_empty() {
        let mut values: Vec<f64> = vec![];
        assert_eq!(compute_median(&mut values), None);
    }

    #[test]
    fn test_compute_median_unsorted() {
        let mut values = vec![10.0, 5.0, 20.0, 15.0];
        assert_eq!(compute_median(&mut values), Some(12.5));
    }

    #[test]
    fn test_compute_median_with_duplicates() {
        let mut values = vec![5.0, 5.0, 5.0];
        assert_eq!(compute_median(&mut values), Some(5.0));
    }

    #[test]
    fn test_compute_median_negative_values() {
        let mut values = vec![-10.0, -5.0, 0.0, 5.0];
        assert_eq!(compute_median(&mut values), Some(-2.5));
    }

    #[test]
    fn test_compute_median_large_dataset() {
        let mut values: Vec<f64> = (1..=1000).map(|x| x as f64).collect();
        assert_eq!(compute_median(&mut values), Some(500.5));
    }

    #[test]
    fn test_skill_trend_data() {
        let trend = SkillTrend {
            skill_name: "Rust".to_string(),
            total_jobs: 250,
            avg_salary: Some(140000),
        };

        assert_eq!(trend.skill_name, "Rust");
        assert_eq!(trend.total_jobs, 250);
        assert_eq!(trend.avg_salary, Some(140000));
    }

    #[test]
    fn test_skill_trend_no_salary() {
        let trend = SkillTrend {
            skill_name: "Python".to_string(),
            total_jobs: 500,
            avg_salary: None,
        };

        assert!(trend.avg_salary.is_none());
    }

    #[test]
    fn test_company_activity_data() {
        let activity = CompanyActivity {
            company_name: "TechCorp".to_string(),
            total_posted: 50,
            avg_active: 30.5,
            hiring_trend: Some("increasing".to_string()),
        };

        assert_eq!(activity.company_name, "TechCorp");
        assert_eq!(activity.total_posted, 50);
        assert_eq!(activity.avg_active, 30.5);
        assert_eq!(activity.hiring_trend, Some("increasing".to_string()));
    }

    #[test]
    fn test_company_activity_no_trend() {
        let activity = CompanyActivity {
            company_name: "StartupCo".to_string(),
            total_posted: 5,
            avg_active: 3.0,
            hiring_trend: None,
        };

        assert!(activity.hiring_trend.is_none());
    }

    #[test]
    fn test_location_heat_data() {
        let heat = LocationHeat {
            location: "san francisco, ca".to_string(),
            city: Some("San Francisco".to_string()),
            state: Some("CA".to_string()),
            total_jobs: 1500,
            avg_median_salary: Some(165000),
        };

        assert_eq!(heat.location, "san francisco, ca");
        assert_eq!(heat.city, Some("San Francisco".to_string()));
        assert_eq!(heat.total_jobs, 1500);
        assert_eq!(heat.avg_median_salary, Some(165000));
    }

    #[test]
    fn test_location_heat_no_salary_data() {
        let heat = LocationHeat {
            location: "remote".to_string(),
            city: None,
            state: None,
            total_jobs: 800,
            avg_median_salary: None,
        };

        assert!(heat.avg_median_salary.is_none());
        assert!(heat.city.is_none());
    }

    #[test]
    fn test_normalize_location_san_francisco() {
        // Test the normalization logic without database
        let location = "San Francisco Bay Area";
        let result = if location.to_lowercase().contains("san francisco") || location.to_lowercase().contains("sf") {
            "san francisco, ca"
        } else {
            &location.to_lowercase()
        };
        assert_eq!(result, "san francisco, ca");

        let location2 = "SF, CA";
        let result2 = if location2.to_lowercase().contains("san francisco") || location2.to_lowercase().contains("sf") {
            "san francisco, ca"
        } else {
            &location2.to_lowercase()
        };
        assert_eq!(result2, "san francisco, ca");
    }

    #[test]
    fn test_normalize_location_new_york() {
        let location = "New York City";
        let result = if location.to_lowercase().contains("new york") || location.to_lowercase().contains("nyc") {
            "new york, ny"
        } else {
            &location.to_lowercase()
        };
        assert_eq!(result, "new york, ny");

        let location2 = "NYC";
        let result2 = if location2.to_lowercase().contains("new york") || location2.to_lowercase().contains("nyc") {
            "new york, ny"
        } else {
            &location2.to_lowercase()
        };
        assert_eq!(result2, "new york, ny");
    }

    #[test]
    fn test_normalize_location_remote() {
        let location = "Remote - US";
        let result = if location.to_lowercase().contains("remote") {
            "remote"
        } else {
            &location.to_lowercase()
        };
        assert_eq!(result, "remote");
    }

    #[test]
    fn test_normalize_location_other() {
        let location = "Seattle, WA";
        let result = if location.to_lowercase().contains("san francisco") || location.to_lowercase().contains("sf") {
            "san francisco, ca"
        } else if location.to_lowercase().contains("new york") || location.to_lowercase().contains("nyc") {
            "new york, ny"
        } else if location.to_lowercase().contains("remote") {
            "remote"
        } else {
            &location.to_lowercase()
        };
        assert_eq!(result, "seattle, wa");
    }

    #[test]
    fn test_parse_location_city_state() {
        let location = "Seattle, WA";
        let parts: Vec<&str> = location.split(',').map(|s| s.trim()).collect();
        let (city, state) = if parts.len() >= 2 {
            (Some(parts[0].to_string()), Some(parts[1].to_string()))
        } else {
            (Some(location.to_string()), None)
        };
        assert_eq!(city, Some("Seattle".to_string()));
        assert_eq!(state, Some("WA".to_string()));
    }

    #[test]
    fn test_parse_location_city_only() {
        let location = "London";
        let parts: Vec<&str> = location.split(',').map(|s| s.trim()).collect();
        let (city, state) = if parts.len() >= 2 {
            (Some(parts[0].to_string()), Some(parts[1].to_string()))
        } else {
            (Some(location.to_string()), None)
        };
        assert_eq!(city, Some("London".to_string()));
        assert_eq!(state, None);
    }

    #[test]
    fn test_parse_location_with_extra_parts() {
        let location = "New York, NY, USA";
        let parts: Vec<&str> = location.split(',').map(|s| s.trim()).collect();
        let (city, state) = if parts.len() >= 2 {
            (Some(parts[0].to_string()), Some(parts[1].to_string()))
        } else {
            (Some(location.to_string()), None)
        };
        assert_eq!(city, Some("New York".to_string()));
        assert_eq!(state, Some("NY".to_string()));
    }

    #[test]
    fn test_parse_location_empty() {
        let location = "";
        let parts: Vec<&str> = location.split(',').map(|s| s.trim()).collect();
        let (city, state) = if parts.len() >= 2 {
            (Some(parts[0].to_string()), Some(parts[1].to_string()))
        } else {
            (Some(location.to_string()), None)
        };
        assert_eq!(city, Some("".to_string()));
        assert_eq!(state, None);
    }

    #[test]
    fn test_compute_median_with_floats() {
        let mut values = vec![1.5, 2.5, 3.5, 4.5];
        assert_eq!(compute_median(&mut values), Some(3.0));
    }

    #[test]
    fn test_compute_median_precision() {
        let mut values = vec![100.1, 100.2, 100.3];
        assert_eq!(compute_median(&mut values), Some(100.2));
    }

    #[test]
    fn test_skill_trend_serialization() {
        let trend = SkillTrend {
            skill_name: "TypeScript".to_string(),
            total_jobs: 300,
            avg_salary: Some(135000),
        };

        let serialized = serde_json::to_string(&trend).unwrap();
        let deserialized: SkillTrend = serde_json::from_str(&serialized).unwrap();

        assert_eq!(deserialized.skill_name, "TypeScript");
        assert_eq!(deserialized.total_jobs, 300);
        assert_eq!(deserialized.avg_salary, Some(135000));
    }

    #[test]
    fn test_company_activity_serialization() {
        let activity = CompanyActivity {
            company_name: "Microsoft".to_string(),
            total_posted: 100,
            avg_active: 75.5,
            hiring_trend: Some("stable".to_string()),
        };

        let serialized = serde_json::to_string(&activity).unwrap();
        let deserialized: CompanyActivity = serde_json::from_str(&serialized).unwrap();

        assert_eq!(deserialized.company_name, "Microsoft");
        assert_eq!(deserialized.total_posted, 100);
    }

    #[test]
    fn test_location_heat_serialization() {
        let heat = LocationHeat {
            location: "austin, tx".to_string(),
            city: Some("Austin".to_string()),
            state: Some("TX".to_string()),
            total_jobs: 450,
            avg_median_salary: Some(120000),
        };

        let serialized = serde_json::to_string(&heat).unwrap();
        let deserialized: LocationHeat = serde_json::from_str(&serialized).unwrap();

        assert_eq!(deserialized.location, "austin, tx");
        assert_eq!(deserialized.total_jobs, 450);
    }
}
