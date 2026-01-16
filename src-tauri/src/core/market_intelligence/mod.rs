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

    // Async tests for MarketIntelligence methods
    mod async_tests {
        use super::*;
        use sqlx::SqlitePool;

        async fn setup_test_db() -> SqlitePool {
            let pool = SqlitePool::connect(":memory:").await.unwrap();

            // Create all required tables
            sqlx::query(
                r#"
                CREATE TABLE IF NOT EXISTS jobs (
                    hash TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    company TEXT,
                    location TEXT,
                    posted_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    status TEXT DEFAULT 'active'
                )
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            sqlx::query(
                r#"
                CREATE TABLE IF NOT EXISTS job_skills (
                    job_hash TEXT NOT NULL,
                    skill_name TEXT NOT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (job_hash, skill_name)
                )
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            sqlx::query(
                r#"
                CREATE TABLE IF NOT EXISTS job_salary_predictions (
                    job_hash TEXT PRIMARY KEY,
                    predicted_median REAL NOT NULL
                )
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            sqlx::query(
                r#"
                CREATE TABLE IF NOT EXISTS skill_demand_trends (
                    skill_name TEXT NOT NULL,
                    date TEXT NOT NULL,
                    mention_count INTEGER NOT NULL,
                    job_count INTEGER NOT NULL,
                    avg_salary INTEGER,
                    median_salary INTEGER,
                    top_company TEXT,
                    top_location TEXT,
                    PRIMARY KEY (skill_name, date)
                )
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            sqlx::query(
                r#"
                CREATE TABLE IF NOT EXISTS salary_benchmarks (
                    job_title_normalized TEXT NOT NULL,
                    location_normalized TEXT NOT NULL,
                    min_salary INTEGER NOT NULL,
                    p25_salary INTEGER NOT NULL,
                    median_salary INTEGER NOT NULL,
                    p75_salary INTEGER NOT NULL,
                    max_salary INTEGER NOT NULL,
                    average_salary INTEGER NOT NULL,
                    sample_size INTEGER NOT NULL,
                    PRIMARY KEY (job_title_normalized, location_normalized)
                )
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            sqlx::query(
                r#"
                CREATE TABLE IF NOT EXISTS salary_trends (
                    job_title_normalized TEXT NOT NULL,
                    location_normalized TEXT NOT NULL,
                    date TEXT NOT NULL,
                    min_salary INTEGER NOT NULL,
                    p25_salary INTEGER NOT NULL,
                    median_salary INTEGER NOT NULL,
                    p75_salary INTEGER NOT NULL,
                    max_salary INTEGER NOT NULL,
                    avg_salary INTEGER NOT NULL,
                    sample_size INTEGER NOT NULL,
                    salary_growth_pct REAL DEFAULT 0.0,
                    PRIMARY KEY (job_title_normalized, location_normalized, date)
                )
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            sqlx::query(
                r#"
                CREATE TABLE IF NOT EXISTS company_hiring_velocity (
                    company_name TEXT NOT NULL,
                    date TEXT NOT NULL,
                    jobs_posted_count INTEGER NOT NULL,
                    jobs_filled_count INTEGER DEFAULT 0,
                    jobs_active_count INTEGER DEFAULT 0,
                    top_role TEXT,
                    top_location TEXT,
                    is_actively_hiring INTEGER DEFAULT 0,
                    hiring_trend TEXT DEFAULT 'stable',
                    PRIMARY KEY (company_name, date)
                )
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            sqlx::query(
                r#"
                CREATE TABLE IF NOT EXISTS location_job_density (
                    location_normalized TEXT NOT NULL,
                    city TEXT,
                    state TEXT,
                    date TEXT NOT NULL,
                    job_count INTEGER NOT NULL,
                    remote_job_count INTEGER DEFAULT 0,
                    avg_salary INTEGER,
                    median_salary INTEGER,
                    top_skill TEXT,
                    top_company TEXT,
                    top_role TEXT,
                    PRIMARY KEY (location_normalized, date)
                )
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            sqlx::query(
                r#"
                CREATE TABLE IF NOT EXISTS role_demand_trends (
                    job_title_normalized TEXT NOT NULL,
                    date TEXT NOT NULL,
                    job_count INTEGER NOT NULL,
                    avg_salary INTEGER,
                    median_salary INTEGER,
                    top_company TEXT,
                    top_location TEXT,
                    remote_percentage REAL,
                    demand_trend TEXT DEFAULT 'stable',
                    PRIMARY KEY (job_title_normalized, date)
                )
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

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

            sqlx::query(
                r#"
                CREATE TABLE IF NOT EXISTS market_snapshots (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    date DATE NOT NULL UNIQUE,
                    total_jobs INTEGER NOT NULL DEFAULT 0,
                    new_jobs_today INTEGER NOT NULL DEFAULT 0,
                    jobs_filled_today INTEGER NOT NULL DEFAULT 0,
                    avg_salary INTEGER,
                    median_salary INTEGER,
                    remote_job_percentage REAL,
                    top_skill TEXT,
                    top_company TEXT,
                    top_location TEXT,
                    total_companies_hiring INTEGER,
                    market_sentiment TEXT CHECK(market_sentiment IN ('bullish', 'neutral', 'bearish')),
                    notes TEXT,
                    created_at TIMESTAMP DEFAULT (datetime('now'))
                )
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            pool
        }

        #[tokio::test]
        async fn test_market_intelligence_new() {
            let pool = setup_test_db().await;
            let mi = MarketIntelligence::new(pool.clone());

            // Verify struct creation
            assert_eq!(std::mem::size_of_val(&mi), std::mem::size_of::<MarketIntelligence>());
        }

        #[tokio::test]
        async fn test_normalize_location_via_method() {
            let pool = setup_test_db().await;
            let mi = MarketIntelligence::new(pool);

            assert_eq!(mi.normalize_location("San Francisco Bay Area"), "san francisco, ca");
            assert_eq!(mi.normalize_location("SF, California"), "san francisco, ca");
            assert_eq!(mi.normalize_location("New York City"), "new york, ny");
            assert_eq!(mi.normalize_location("NYC"), "new york, ny");
            assert_eq!(mi.normalize_location("Remote - US"), "remote");
            assert_eq!(mi.normalize_location("Seattle, WA"), "seattle, wa");
        }

        #[tokio::test]
        async fn test_parse_location_via_method() {
            let pool = setup_test_db().await;
            let mi = MarketIntelligence::new(pool);

            let (city, state) = mi.parse_location("Seattle, WA");
            assert_eq!(city, Some("Seattle".to_string()));
            assert_eq!(state, Some("WA".to_string()));

            let (city2, state2) = mi.parse_location("London");
            assert_eq!(city2, Some("London".to_string()));
            assert_eq!(state2, None);

            let (city3, state3) = mi.parse_location("Austin, TX, USA");
            assert_eq!(city3, Some("Austin".to_string()));
            assert_eq!(state3, Some("TX".to_string()));
        }

        #[tokio::test]
        async fn test_get_trending_skills_empty() {
            let pool = setup_test_db().await;
            let mi = MarketIntelligence::new(pool);

            let trends = mi.get_trending_skills(10).await.unwrap();
            assert_eq!(trends.len(), 0);
        }

        #[tokio::test]
        async fn test_get_trending_skills_with_data() {
            let pool = setup_test_db().await;

            // Insert test data
            sqlx::query(
                r#"
                INSERT INTO skill_demand_trends (skill_name, date, mention_count, job_count, avg_salary)
                VALUES
                    ('Rust', date('now'), 100, 50, 150000),
                    ('Python', date('now'), 200, 100, 130000),
                    ('TypeScript', date('now'), 150, 75, 140000)
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            let mi = MarketIntelligence::new(pool);
            let trends = mi.get_trending_skills(3).await.unwrap();

            assert_eq!(trends.len(), 3);
            assert_eq!(trends[0].skill_name, "Python");
            assert_eq!(trends[0].total_jobs, 100);
            assert_eq!(trends[1].skill_name, "TypeScript");
            assert_eq!(trends[2].skill_name, "Rust");
        }

        #[tokio::test]
        async fn test_get_trending_skills_limit() {
            let pool = setup_test_db().await;

            sqlx::query(
                r#"
                INSERT INTO skill_demand_trends (skill_name, date, mention_count, job_count)
                VALUES
                    ('Rust', date('now'), 100, 50),
                    ('Python', date('now'), 200, 100),
                    ('TypeScript', date('now'), 150, 75),
                    ('Go', date('now'), 80, 40)
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            let mi = MarketIntelligence::new(pool);
            let trends = mi.get_trending_skills(2).await.unwrap();

            assert_eq!(trends.len(), 2);
            assert_eq!(trends[0].skill_name, "Python");
            assert_eq!(trends[1].skill_name, "TypeScript");
        }

        #[tokio::test]
        async fn test_get_most_active_companies_empty() {
            let pool = setup_test_db().await;
            let mi = MarketIntelligence::new(pool);

            let companies = mi.get_most_active_companies(10).await.unwrap();
            assert_eq!(companies.len(), 0);
        }

        #[tokio::test]
        async fn test_get_most_active_companies_with_data() {
            let pool = setup_test_db().await;

            sqlx::query(
                r#"
                INSERT INTO company_hiring_velocity (company_name, date, jobs_posted_count, jobs_active_count, hiring_trend)
                VALUES
                    ('TechCorp', date('now'), 50, 30, 'increasing'),
                    ('StartupInc', date('now'), 25, 15, 'stable'),
                    ('BigTech', date('now'), 100, 75, 'increasing')
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            let mi = MarketIntelligence::new(pool);
            let companies = mi.get_most_active_companies(3).await.unwrap();

            assert_eq!(companies.len(), 3);
            assert_eq!(companies[0].company_name, "BigTech");
            assert_eq!(companies[0].total_posted, 100);
            assert_eq!(companies[0].hiring_trend, Some("increasing".to_string()));
            assert_eq!(companies[1].company_name, "TechCorp");
            assert_eq!(companies[2].company_name, "StartupInc");
        }

        #[tokio::test]
        async fn test_get_most_active_companies_limit() {
            let pool = setup_test_db().await;

            sqlx::query(
                r#"
                INSERT INTO company_hiring_velocity (company_name, date, jobs_posted_count, jobs_active_count)
                VALUES
                    ('Company1', date('now'), 50, 30),
                    ('Company2', date('now'), 75, 45),
                    ('Company3', date('now'), 25, 15),
                    ('Company4', date('now'), 100, 60)
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            let mi = MarketIntelligence::new(pool);
            let companies = mi.get_most_active_companies(2).await.unwrap();

            assert_eq!(companies.len(), 2);
            assert_eq!(companies[0].company_name, "Company4");
            assert_eq!(companies[1].company_name, "Company2");
        }

        #[tokio::test]
        async fn test_get_hottest_locations_empty() {
            let pool = setup_test_db().await;
            let mi = MarketIntelligence::new(pool);

            let locations = mi.get_hottest_locations(10).await.unwrap();
            assert_eq!(locations.len(), 0);
        }

        #[tokio::test]
        async fn test_get_hottest_locations_with_data() {
            let pool = setup_test_db().await;

            sqlx::query(
                r#"
                INSERT INTO location_job_density (location_normalized, city, state, date, job_count, median_salary)
                VALUES
                    ('san francisco, ca', 'San Francisco', 'CA', date('now'), 500, 165000),
                    ('new york, ny', 'New York', 'NY', date('now'), 450, 155000),
                    ('remote', NULL, NULL, date('now'), 300, 140000)
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            let mi = MarketIntelligence::new(pool);
            let locations = mi.get_hottest_locations(3).await.unwrap();

            assert_eq!(locations.len(), 3);
            assert_eq!(locations[0].location, "san francisco, ca");
            assert_eq!(locations[0].total_jobs, 500);
            assert_eq!(locations[0].city, Some("San Francisco".to_string()));
            assert_eq!(locations[0].state, Some("CA".to_string()));
            assert_eq!(locations[1].location, "new york, ny");
            assert_eq!(locations[2].location, "remote");
        }

        #[tokio::test]
        async fn test_get_hottest_locations_limit() {
            let pool = setup_test_db().await;

            sqlx::query(
                r#"
                INSERT INTO location_job_density (location_normalized, date, job_count)
                VALUES
                    ('seattle, wa', date('now'), 400),
                    ('austin, tx', date('now'), 350),
                    ('boston, ma', date('now'), 300),
                    ('denver, co', date('now'), 250)
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            let mi = MarketIntelligence::new(pool);
            let locations = mi.get_hottest_locations(2).await.unwrap();

            assert_eq!(locations.len(), 2);
            assert_eq!(locations[0].location, "seattle, wa");
            assert_eq!(locations[1].location, "austin, tx");
        }

        #[tokio::test]
        async fn test_compute_skill_demand_trends_no_data() {
            let pool = setup_test_db().await;
            let mi = MarketIntelligence::new(pool.clone());

            // Should not error on empty database
            let result = mi.compute_skill_demand_trends().await;
            assert!(result.is_ok());

            // Verify no trends were created
            let count: i64 =
                sqlx::query_scalar("SELECT COUNT(*) FROM skill_demand_trends")
                    .fetch_one(&pool)
                    .await
                    .unwrap();
            assert_eq!(count, 0);
        }

        #[tokio::test]
        async fn test_compute_skill_demand_trends_with_data() {
            let pool = setup_test_db().await;

            // Insert test jobs and skills
            sqlx::query(
                r#"
                INSERT INTO jobs (hash, title, company, location, posted_at, updated_at)
                VALUES ('job1', 'Software Engineer', 'TechCorp', 'San Francisco, CA', datetime('now'), datetime('now'))
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            sqlx::query(
                r#"
                INSERT INTO job_skills (job_hash, skill_name, created_at)
                VALUES ('job1', 'Rust', datetime('now'))
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            sqlx::query(
                r#"
                INSERT INTO job_salary_predictions (job_hash, predicted_median)
                VALUES ('job1', 150000.0)
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            let mi = MarketIntelligence::new(pool.clone());
            let result = mi.compute_skill_demand_trends().await;
            assert!(result.is_ok());

            // Verify trend was created
            let trend: (String, i64, i64) = sqlx::query_as(
                "SELECT skill_name, mention_count, job_count FROM skill_demand_trends WHERE skill_name = 'Rust'",
            )
            .fetch_one(&pool)
            .await
            .unwrap();

            assert_eq!(trend.0, "Rust");
            assert_eq!(trend.1, 1); // mention_count
            assert_eq!(trend.2, 1); // job_count
        }

        #[tokio::test]
        async fn test_compute_salary_trends_no_data() {
            let pool = setup_test_db().await;
            let mi = MarketIntelligence::new(pool.clone());

            let result = mi.compute_salary_trends().await;
            assert!(result.is_ok());

            let count: i64 =
                sqlx::query_scalar("SELECT COUNT(*) FROM salary_trends")
                    .fetch_one(&pool)
                    .await
                    .unwrap();
            assert_eq!(count, 0);
        }

        #[tokio::test]
        async fn test_compute_salary_trends_with_data() {
            let pool = setup_test_db().await;

            // Insert benchmark data
            sqlx::query(
                r#"
                INSERT INTO salary_benchmarks (
                    job_title_normalized, location_normalized, min_salary, p25_salary,
                    median_salary, p75_salary, max_salary, average_salary, sample_size
                )
                VALUES ('software engineer', 'san francisco, ca', 100000, 120000, 140000, 160000, 180000, 140000, 50)
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            let mi = MarketIntelligence::new(pool.clone());
            let result = mi.compute_salary_trends().await;
            assert!(result.is_ok());

            // Verify trend was created
            let count: i64 =
                sqlx::query_scalar("SELECT COUNT(*) FROM salary_trends")
                    .fetch_one(&pool)
                    .await
                    .unwrap();
            assert_eq!(count, 1);

            let median: i64 = sqlx::query_scalar(
                "SELECT median_salary FROM salary_trends WHERE job_title_normalized = 'software engineer'",
            )
            .fetch_one(&pool)
            .await
            .unwrap();
            assert_eq!(median, 140000);
        }

        #[tokio::test]
        async fn test_compute_company_hiring_velocity_no_data() {
            let pool = setup_test_db().await;
            let mi = MarketIntelligence::new(pool.clone());

            let result = mi.compute_company_hiring_velocity().await;
            assert!(result.is_ok());

            let count: i64 =
                sqlx::query_scalar("SELECT COUNT(*) FROM company_hiring_velocity")
                    .fetch_one(&pool)
                    .await
                    .unwrap();
            assert_eq!(count, 0);
        }

        #[tokio::test]
        async fn test_compute_company_hiring_velocity_with_data() {
            let pool = setup_test_db().await;

            // Insert test jobs
            sqlx::query(
                r#"
                INSERT INTO jobs (hash, title, company, location, posted_at, updated_at, status)
                VALUES
                    ('job1', 'Engineer', 'TechCorp', 'SF', date('now'), datetime('now'), 'active'),
                    ('job2', 'Designer', 'TechCorp', 'SF', date('now'), datetime('now'), 'active')
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            let mi = MarketIntelligence::new(pool.clone());
            let result = mi.compute_company_hiring_velocity().await;
            assert!(result.is_ok());

            // Verify velocity was recorded
            let velocity: (i64, i64) = sqlx::query_as(
                "SELECT jobs_posted_count, jobs_active_count FROM company_hiring_velocity WHERE company_name = 'TechCorp'",
            )
            .fetch_one(&pool)
            .await
            .unwrap();

            assert_eq!(velocity.0, 2); // jobs_posted_count
            assert_eq!(velocity.1, 2); // jobs_active_count
        }

        #[tokio::test]
        async fn test_compute_location_job_density_no_data() {
            let pool = setup_test_db().await;
            let mi = MarketIntelligence::new(pool.clone());

            let result = mi.compute_location_job_density().await;
            assert!(result.is_ok());

            let count: i64 =
                sqlx::query_scalar("SELECT COUNT(*) FROM location_job_density")
                    .fetch_one(&pool)
                    .await
                    .unwrap();
            assert_eq!(count, 0);
        }

        #[tokio::test]
        async fn test_compute_location_job_density_with_data() {
            let pool = setup_test_db().await;

            // Insert test jobs
            sqlx::query(
                r#"
                INSERT INTO jobs (hash, title, company, location, posted_at, updated_at)
                VALUES
                    ('job1', 'Engineer', 'Corp1', 'Seattle, WA', datetime('now'), datetime('now')),
                    ('job2', 'Designer', 'Corp2', 'Seattle, WA', datetime('now'), datetime('now'))
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            // Insert skills for the jobs
            sqlx::query(
                r#"
                INSERT INTO job_skills (job_hash, skill_name)
                VALUES
                    ('job1', 'Rust'),
                    ('job2', 'TypeScript')
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            let mi = MarketIntelligence::new(pool.clone());
            let result = mi.compute_location_job_density().await;
            if let Err(e) = &result {
                eprintln!("Error: {}", e);
            }
            assert!(result.is_ok());

            // Verify density was recorded
            let density: (String, Option<String>, Option<String>, i64) = sqlx::query_as(
                "SELECT location_normalized, city, state, job_count FROM location_job_density",
            )
            .fetch_one(&pool)
            .await
            .unwrap();

            assert_eq!(density.0, "seattle, wa");
            assert_eq!(density.1, Some("Seattle".to_string()));
            assert_eq!(density.2, Some("WA".to_string()));
            assert_eq!(density.3, 2);
        }

        #[tokio::test]
        async fn test_compute_role_demand_trends_no_data() {
            let pool = setup_test_db().await;
            let mi = MarketIntelligence::new(pool.clone());

            let result = mi.compute_role_demand_trends().await;
            assert!(result.is_ok());

            let count: i64 =
                sqlx::query_scalar("SELECT COUNT(*) FROM role_demand_trends")
                    .fetch_one(&pool)
                    .await
                    .unwrap();
            assert_eq!(count, 0);
        }

        #[tokio::test]
        async fn test_compute_role_demand_trends_with_data() {
            let pool = setup_test_db().await;

            // Insert salary benchmark (source of normalized titles)
            sqlx::query(
                r#"
                INSERT INTO salary_benchmarks (
                    job_title_normalized, location_normalized, min_salary, p25_salary,
                    median_salary, p75_salary, max_salary, average_salary, sample_size
                )
                VALUES ('engineer', 'remote', 100000, 120000, 140000, 160000, 180000, 140000, 10)
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            // Insert job with matching title
            sqlx::query(
                r#"
                INSERT INTO jobs (hash, title, company, location, posted_at, updated_at)
                VALUES ('job1', 'Senior Engineer', 'TechCorp', 'Remote', datetime('now'), datetime('now'))
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            let mi = MarketIntelligence::new(pool.clone());
            let result = mi.compute_role_demand_trends().await;
            assert!(result.is_ok());

            // Verify trend was created
            let count: i64 =
                sqlx::query_scalar("SELECT COUNT(*) FROM role_demand_trends WHERE job_title_normalized = 'engineer'")
                    .fetch_one(&pool)
                    .await
                    .unwrap();
            assert_eq!(count, 1);
        }

        #[tokio::test]
        async fn test_detect_market_alerts_skill_surge() {
            let pool = setup_test_db().await;

            // Insert skill data with surge
            sqlx::query(
                r#"
                INSERT INTO skill_demand_trends (skill_name, date, mention_count, job_count)
                VALUES
                    ('Rust', date('now', '-7 days'), 10, 5),
                    ('Rust', date('now'), 20, 12)
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            let mi = MarketIntelligence::new(pool.clone());
            let result = mi.detect_market_alerts().await;
            assert!(result.is_ok());

            // Verify alert was created
            let alert_count: i64 =
                sqlx::query_scalar("SELECT COUNT(*) FROM market_alerts WHERE alert_type = 'skill_surge'")
                    .fetch_one(&pool)
                    .await
                    .unwrap();
            assert_eq!(alert_count, 1);
        }

        #[tokio::test]
        async fn test_detect_market_alerts_salary_spike() {
            let pool = setup_test_db().await;

            // Insert salary trend with spike
            sqlx::query(
                r#"
                INSERT INTO salary_trends (
                    job_title_normalized, location_normalized, date,
                    min_salary, p25_salary, median_salary, p75_salary, max_salary,
                    avg_salary, sample_size, salary_growth_pct
                )
                VALUES ('engineer', 'sf', date('now'), 100000, 120000, 140000, 160000, 180000, 140000, 50, 30.0)
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            let mi = MarketIntelligence::new(pool.clone());
            let result = mi.detect_market_alerts().await;
            assert!(result.is_ok());

            // Verify alert was created
            let alert_count: i64 =
                sqlx::query_scalar("SELECT COUNT(*) FROM market_alerts WHERE alert_type = 'salary_spike'")
                    .fetch_one(&pool)
                    .await
                    .unwrap();
            assert_eq!(alert_count, 1);
        }

        #[tokio::test]
        async fn test_detect_market_alerts_hiring_spree() {
            let pool = setup_test_db().await;

            // Insert company with high velocity
            sqlx::query(
                r#"
                INSERT INTO company_hiring_velocity (company_name, date, jobs_posted_count, jobs_active_count)
                VALUES ('BigTech', date('now'), 15, 50)
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            let mi = MarketIntelligence::new(pool.clone());
            let result = mi.detect_market_alerts().await;
            assert!(result.is_ok());

            // Verify alert was created
            let alert_count: i64 =
                sqlx::query_scalar("SELECT COUNT(*) FROM market_alerts WHERE alert_type = 'hiring_spree'")
                    .fetch_one(&pool)
                    .await
                    .unwrap();
            assert_eq!(alert_count, 1);
        }

        #[tokio::test]
        async fn test_get_unread_alerts_empty() {
            let pool = setup_test_db().await;
            let mi = MarketIntelligence::new(pool);

            let alerts = mi.get_unread_alerts().await.unwrap();
            assert_eq!(alerts.len(), 0);
        }

        #[tokio::test]
        async fn test_get_unread_alerts_with_data() {
            let pool = setup_test_db().await;

            // Insert test alerts
            sqlx::query(
                r#"
                INSERT INTO market_alerts (alert_type, title, description, severity, is_read)
                VALUES
                    ('skill_surge', 'Rust Surging', 'Rust is hot', 'info', 0),
                    ('salary_spike', 'Salaries Up', 'Pay is rising', 'info', 1)
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            let mi = MarketIntelligence::new(pool);
            let alerts = mi.get_unread_alerts().await.unwrap();

            // Should only get unread alerts
            assert_eq!(alerts.len(), 1);
            assert_eq!(alerts[0].title, "Rust Surging");
        }

        #[tokio::test]
        async fn test_compute_salary_trends_with_growth() {
            let pool = setup_test_db().await;

            // Insert previous salary trend
            sqlx::query(
                r#"
                INSERT INTO salary_trends (
                    job_title_normalized, location_normalized, date,
                    min_salary, p25_salary, median_salary, p75_salary, max_salary,
                    avg_salary, sample_size, salary_growth_pct
                )
                VALUES ('engineer', 'sf', date('now', '-7 days'), 90000, 100000, 110000, 120000, 130000, 110000, 50, 0.0)
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            // Insert current benchmark
            sqlx::query(
                r#"
                INSERT INTO salary_benchmarks (
                    job_title_normalized, location_normalized, min_salary, p25_salary,
                    median_salary, p75_salary, max_salary, average_salary, sample_size
                )
                VALUES ('engineer', 'sf', 100000, 120000, 140000, 160000, 180000, 140000, 50)
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            let mi = MarketIntelligence::new(pool.clone());
            let result = mi.compute_salary_trends().await;
            assert!(result.is_ok());

            // Verify growth was calculated
            let growth: f64 = sqlx::query_scalar(
                "SELECT salary_growth_pct FROM salary_trends WHERE job_title_normalized = 'engineer' AND date = date('now')",
            )
            .fetch_one(&pool)
            .await
            .unwrap();

            // Growth from 110000 to 140000 = (30000/110000)*100 = 27.27%
            assert!((growth - 27.27).abs() < 1.0);
        }

        #[tokio::test]
        async fn test_compute_salary_trends_zero_previous() {
            let pool = setup_test_db().await;

            // Insert previous with zero median (edge case)
            sqlx::query(
                r#"
                INSERT INTO salary_trends (
                    job_title_normalized, location_normalized, date,
                    min_salary, p25_salary, median_salary, p75_salary, max_salary,
                    avg_salary, sample_size, salary_growth_pct
                )
                VALUES ('engineer', 'sf', date('now', '-7 days'), 0, 0, 0, 0, 0, 0, 1, 0.0)
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            sqlx::query(
                r#"
                INSERT INTO salary_benchmarks (
                    job_title_normalized, location_normalized, min_salary, p25_salary,
                    median_salary, p75_salary, max_salary, average_salary, sample_size
                )
                VALUES ('engineer', 'sf', 100000, 120000, 140000, 160000, 180000, 140000, 50)
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            let mi = MarketIntelligence::new(pool.clone());
            let result = mi.compute_salary_trends().await;
            assert!(result.is_ok());

            // Growth should be 0 when previous is 0
            let growth: f64 = sqlx::query_scalar(
                "SELECT salary_growth_pct FROM salary_trends WHERE job_title_normalized = 'engineer' AND date = date('now')",
            )
            .fetch_one(&pool)
            .await
            .unwrap();
            assert_eq!(growth, 0.0);
        }

        #[tokio::test]
        async fn test_compute_company_hiring_velocity_trends() {
            let pool = setup_test_db().await;

            // Insert previous week velocity
            sqlx::query(
                r#"
                INSERT INTO company_hiring_velocity (company_name, date, jobs_posted_count, jobs_active_count)
                VALUES ('TechCorp', date('now', '-5 days'), 5, 20)
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            // Insert current jobs
            sqlx::query(
                r#"
                INSERT INTO jobs (hash, title, company, location, posted_at, updated_at, status)
                VALUES
                    ('job1', 'Engineer', 'TechCorp', 'SF', date('now'), datetime('now'), 'active'),
                    ('job2', 'Designer', 'TechCorp', 'SF', date('now'), datetime('now'), 'active'),
                    ('job3', 'Manager', 'TechCorp', 'SF', date('now'), datetime('now'), 'active')
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            let mi = MarketIntelligence::new(pool.clone());
            let result = mi.compute_company_hiring_velocity().await;
            assert!(result.is_ok());

            // Verify trend is "decreasing" (3 < 5)
            let trend: String = sqlx::query_scalar(
                "SELECT hiring_trend FROM company_hiring_velocity WHERE company_name = 'TechCorp' AND date = date('now')",
            )
            .fetch_one(&pool)
            .await
            .unwrap();
            assert_eq!(trend, "decreasing");
        }

        #[tokio::test]
        async fn test_compute_company_hiring_velocity_increasing() {
            let pool = setup_test_db().await;

            // Previous week with fewer jobs
            sqlx::query(
                r#"
                INSERT INTO company_hiring_velocity (company_name, date, jobs_posted_count, jobs_active_count)
                VALUES ('StartupCo', date('now', '-3 days'), 2, 10)
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            // More jobs today
            for i in 1..=5 {
                sqlx::query(
                    r#"
                    INSERT INTO jobs (hash, title, company, location, posted_at, updated_at, status)
                    VALUES (?, 'Engineer', 'StartupCo', 'Austin', date('now'), datetime('now'), 'active')
                    "#,
                )
                .bind(format!("job{}", i))
                .execute(&pool)
                .await
                .unwrap();
            }

            let mi = MarketIntelligence::new(pool.clone());
            let result = mi.compute_company_hiring_velocity().await;
            assert!(result.is_ok());

            let trend: String = sqlx::query_scalar(
                "SELECT hiring_trend FROM company_hiring_velocity WHERE company_name = 'StartupCo' AND date = date('now')",
            )
            .fetch_one(&pool)
            .await
            .unwrap();
            assert_eq!(trend, "increasing");
        }

        #[tokio::test]
        async fn test_compute_company_hiring_velocity_stable() {
            let pool = setup_test_db().await;

            // Previous week with same count
            sqlx::query(
                r#"
                INSERT INTO company_hiring_velocity (company_name, date, jobs_posted_count, jobs_active_count)
                VALUES ('StableCorp', date('now', '-4 days'), 3, 15)
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            // Same number of jobs today
            for i in 1..=3 {
                sqlx::query(
                    r#"
                    INSERT INTO jobs (hash, title, company, location, posted_at, updated_at, status)
                    VALUES (?, 'Engineer', 'StableCorp', 'Seattle', date('now'), datetime('now'), 'active')
                    "#,
                )
                .bind(format!("job{}", i))
                .execute(&pool)
                .await
                .unwrap();
            }

            let mi = MarketIntelligence::new(pool.clone());
            let result = mi.compute_company_hiring_velocity().await;
            assert!(result.is_ok());

            let trend: String = sqlx::query_scalar(
                "SELECT hiring_trend FROM company_hiring_velocity WHERE company_name = 'StableCorp' AND date = date('now')",
            )
            .fetch_one(&pool)
            .await
            .unwrap();
            assert_eq!(trend, "stable");
        }

        #[tokio::test]
        async fn test_compute_role_demand_trends_rising() {
            let pool = setup_test_db().await;

            // Previous week demand
            sqlx::query(
                r#"
                INSERT INTO role_demand_trends (
                    job_title_normalized, date, job_count,
                    avg_salary, median_salary, demand_trend
                )
                VALUES ('engineer', date('now', '-5 days'), 10, 120000, 120000, 'stable')
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            // Current salary benchmark
            sqlx::query(
                r#"
                INSERT INTO salary_benchmarks (
                    job_title_normalized, location_normalized, min_salary, p25_salary,
                    median_salary, p75_salary, max_salary, average_salary, sample_size
                )
                VALUES ('engineer', 'remote', 100000, 120000, 140000, 160000, 180000, 140000, 20)
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            // More jobs today
            for i in 1..=15 {
                sqlx::query(
                    r#"
                    INSERT INTO jobs (hash, title, company, location, posted_at, updated_at)
                    VALUES (?, 'Senior Engineer', 'TechCorp', 'Remote', datetime('now'), datetime('now'))
                    "#,
                )
                .bind(format!("job{}", i))
                .execute(&pool)
                .await
                .unwrap();
            }

            let mi = MarketIntelligence::new(pool.clone());
            let result = mi.compute_role_demand_trends().await;
            assert!(result.is_ok());

            let trend: String = sqlx::query_scalar(
                "SELECT demand_trend FROM role_demand_trends WHERE job_title_normalized = 'engineer' AND date = date('now')",
            )
            .fetch_one(&pool)
            .await
            .unwrap();
            assert_eq!(trend, "rising");
        }

        #[tokio::test]
        async fn test_compute_role_demand_trends_falling() {
            let pool = setup_test_db().await;

            // Previous week with high demand
            sqlx::query(
                r#"
                INSERT INTO role_demand_trends (
                    job_title_normalized, date, job_count,
                    avg_salary, median_salary, demand_trend
                )
                VALUES ('designer', date('now', '-6 days'), 20, 100000, 100000, 'rising')
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            sqlx::query(
                r#"
                INSERT INTO salary_benchmarks (
                    job_title_normalized, location_normalized, min_salary, p25_salary,
                    median_salary, p75_salary, max_salary, average_salary, sample_size
                )
                VALUES ('designer', 'remote', 80000, 90000, 100000, 110000, 120000, 100000, 10)
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            // Fewer jobs today
            for i in 1..=5 {
                sqlx::query(
                    r#"
                    INSERT INTO jobs (hash, title, company, location, posted_at, updated_at)
                    VALUES (?, 'UX Designer', 'DesignCo', 'Remote', datetime('now'), datetime('now'))
                    "#,
                )
                .bind(format!("job{}", i))
                .execute(&pool)
                .await
                .unwrap();
            }

            let mi = MarketIntelligence::new(pool.clone());
            let result = mi.compute_role_demand_trends().await;
            assert!(result.is_ok());

            let trend: String = sqlx::query_scalar(
                "SELECT demand_trend FROM role_demand_trends WHERE job_title_normalized = 'designer' AND date = date('now')",
            )
            .fetch_one(&pool)
            .await
            .unwrap();
            assert_eq!(trend, "falling");
        }

        #[tokio::test]
        async fn test_compute_location_job_density_remote_jobs() {
            let pool = setup_test_db().await;

            // Insert remote jobs
            sqlx::query(
                r#"
                INSERT INTO jobs (hash, title, company, location, posted_at, updated_at)
                VALUES
                    ('job1', 'Remote Engineer', 'Corp1', 'Remote - US', datetime('now'), datetime('now')),
                    ('job2', 'Engineer', 'Corp2', 'Remote', datetime('now'), datetime('now')),
                    ('job3', 'Designer', 'Corp3', 'Austin, TX', datetime('now'), datetime('now'))
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            sqlx::query(
                r#"
                INSERT INTO job_skills (job_hash, skill_name)
                VALUES
                    ('job1', 'Python'),
                    ('job2', 'Python'),
                    ('job3', 'Figma')
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            let mi = MarketIntelligence::new(pool.clone());
            let result = mi.compute_location_job_density().await;
            assert!(result.is_ok());

            // Check remote location was tracked
            let remote_count: i64 = sqlx::query_scalar(
                "SELECT COUNT(*) FROM location_job_density WHERE location_normalized LIKE '%remote%'",
            )
            .fetch_one(&pool)
            .await
            .unwrap();
            assert!(remote_count > 0);
        }

        #[tokio::test]
        async fn test_run_daily_analysis_integration() {
            let pool = setup_test_db().await;

            // Insert comprehensive test data
            sqlx::query(
                r#"
                INSERT INTO jobs (hash, title, company, location, posted_at, updated_at, status)
                VALUES
                    ('job1', 'Software Engineer', 'TechCorp', 'San Francisco, CA', datetime('now'), datetime('now'), 'active'),
                    ('job2', 'Data Scientist', 'DataCo', 'New York, NY', datetime('now'), datetime('now'), 'active')
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            sqlx::query(
                r#"
                INSERT INTO job_skills (job_hash, skill_name, created_at)
                VALUES
                    ('job1', 'Rust', datetime('now')),
                    ('job1', 'Python', datetime('now')),
                    ('job2', 'Python', datetime('now'))
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            sqlx::query(
                r#"
                INSERT INTO job_salary_predictions (job_hash, predicted_median)
                VALUES
                    ('job1', 150000.0),
                    ('job2', 140000.0)
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            sqlx::query(
                r#"
                INSERT INTO salary_benchmarks (
                    job_title_normalized, location_normalized, min_salary, p25_salary,
                    median_salary, p75_salary, max_salary, average_salary, sample_size
                )
                VALUES ('software engineer', 'san francisco, ca', 100000, 130000, 150000, 170000, 200000, 150000, 10)
                "#,
            )
            .execute(&pool)
            .await
            .unwrap();

            let mi = MarketIntelligence::new(pool.clone());
            let result = mi.run_daily_analysis().await;

            // If it fails, print the error
            if let Err(e) = &result {
                eprintln!("Daily analysis failed: {}", e);
            }
            assert!(result.is_ok(), "Daily analysis should succeed");

            // Verify at least skill trends were populated (others depend on more complex data)
            let skill_trends: i64 =
                sqlx::query_scalar("SELECT COUNT(*) FROM skill_demand_trends")
                    .fetch_one(&pool)
                    .await
                    .unwrap();
            assert!(skill_trends > 0, "Should have skill trends");

            let salary_trends: i64 =
                sqlx::query_scalar("SELECT COUNT(*) FROM salary_trends")
                    .fetch_one(&pool)
                    .await
                    .unwrap();
            assert!(salary_trends > 0, "Should have salary trends");

            let company_velocity: i64 =
                sqlx::query_scalar("SELECT COUNT(*) FROM company_hiring_velocity")
                    .fetch_one(&pool)
                    .await
                    .unwrap();
            assert!(company_velocity > 0, "Should have company velocity data");

            let location_density: i64 =
                sqlx::query_scalar("SELECT COUNT(*) FROM location_job_density")
                    .fetch_one(&pool)
                    .await
                    .unwrap();
            assert!(location_density > 0, "Should have location density data");
        }

        #[tokio::test]
        async fn test_normalize_location_edge_cases() {
            let pool = setup_test_db().await;
            let mi = MarketIntelligence::new(pool);

            // Test various SF variations
            assert_eq!(mi.normalize_location("SF Bay Area"), "san francisco, ca");
            assert_eq!(mi.normalize_location("SAN FRANCISCO"), "san francisco, ca");
            assert_eq!(mi.normalize_location("sf"), "san francisco, ca");

            // Test NYC variations
            assert_eq!(mi.normalize_location("NYC, New York"), "new york, ny");
            assert_eq!(mi.normalize_location("new york city"), "new york, ny");

            // Test remote variations
            assert_eq!(mi.normalize_location("REMOTE - Anywhere"), "remote");
            assert_eq!(mi.normalize_location("Remote US"), "remote");

            // Test passthrough (non-remote, non-SF, non-NYC)
            assert_eq!(mi.normalize_location("Chicago, IL"), "chicago, il");
        }

        #[tokio::test]
        async fn test_parse_location_edge_cases() {
            let pool = setup_test_db().await;
            let mi = MarketIntelligence::new(pool);

            // Multiple commas
            let (city, state) = mi.parse_location("New York, NY, USA");
            assert_eq!(city, Some("New York".to_string()));
            assert_eq!(state, Some("NY".to_string()));

            // No comma
            let (city2, state2) = mi.parse_location("Berlin");
            assert_eq!(city2, Some("Berlin".to_string()));
            assert_eq!(state2, None);

            // Empty string
            let (city3, state3) = mi.parse_location("");
            assert_eq!(city3, Some("".to_string()));
            assert_eq!(state3, None);

            // Whitespace handling
            let (city4, state4) = mi.parse_location("  Seattle  ,  WA  ");
            assert_eq!(city4, Some("Seattle".to_string()));
            assert_eq!(state4, Some("WA".to_string()));
        }
    }
}
