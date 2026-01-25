//! Market intelligence computation methods
//!
//! This module contains all compute_* methods for calculating trends and statistics.

use anyhow::Result;
use chrono::Utc;
use sqlx::Row;

use super::MarketIntelligence;

/// Compute median from a vector of values (SQLite doesn't have MEDIAN())
pub(super) fn compute_median(values: &mut [f64]) -> Option<f64> {
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

impl MarketIntelligence {
    /// Compute skill demand trends for today
    ///
    /// OPTIMIZATION: Reduced N+2 queries per skill to 1 query per skill using subqueries.
    /// Combines salary stats and top company/location into single query with skill counts.
    pub(super) async fn compute_skill_demand_trends(&self) -> Result<()> {
        let today = Utc::now().date_naive();

        // Single comprehensive query per skill using subqueries instead of 3 separate queries
        let records = sqlx::query(
            r#"
            SELECT
                js.skill_name,
                COUNT(DISTINCT js.job_hash) as job_count,
                COUNT(*) as mention_count,
                AVG(jsp.predicted_median) as avg_salary,
                (
                    SELECT j.company
                    FROM job_skills js2
                    JOIN jobs j ON js2.job_hash = j.hash
                    WHERE js2.skill_name = js.skill_name
                      AND js2.created_at >= date('now', 'start of day')
                    GROUP BY j.company
                    ORDER BY COUNT(*) DESC
                    LIMIT 1
                ) as top_company,
                (
                    SELECT j.location
                    FROM job_skills js3
                    JOIN jobs j ON js3.job_hash = j.hash
                    WHERE js3.skill_name = js.skill_name
                      AND js3.created_at >= date('now', 'start of day')
                    GROUP BY j.location
                    ORDER BY COUNT(*) DESC
                    LIMIT 1
                ) as top_location
            FROM job_skills js
            LEFT JOIN job_salary_predictions jsp ON js.job_hash = jsp.job_hash
            WHERE js.created_at >= date('now', 'start of day')
            GROUP BY js.skill_name
            "#,
        )
        .fetch_all(&self.db)
        .await?;

        for record in records {
            let skill_name: String = record.try_get("skill_name")?;
            let mention_count: i64 = record.try_get("mention_count")?;
            let job_count: i64 = record.try_get("job_count")?;
            let avg_salary: Option<f64> = record.try_get("avg_salary").ok().flatten();
            let top_company: Option<String> = record.try_get("top_company").ok();
            let top_location: Option<String> = record.try_get("top_location").ok();

            // For median, we still need to fetch individual salaries (no MEDIAN in SQLite)
            // This is acceptable as it's per-skill, not per-job
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
            let median_salary = compute_median(&mut salaries);

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
    pub(super) async fn compute_salary_trends(&self) -> Result<()> {
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
    ///
    /// OPTIMIZATION: Reduced 4 queries per company to 1 query per company.
    /// Batches job counts, active count, filled count, and top role into single query.
    pub(super) async fn compute_company_hiring_velocity(&self) -> Result<()> {
        let today = Utc::now().date_naive();

        // Get companies and their job posting counts
        let companies = sqlx::query(
            r#"
            SELECT DISTINCT company
            FROM jobs
            WHERE company IS NOT NULL AND company != ''
            LIMIT 10000
            "#,
        )
        .fetch_all(&self.db)
        .await?;

        for company_record in companies {
            let company: String = company_record.try_get("company")?;

            // Batch all company stats into single query
            let stats = sqlx::query(
                r#"
                SELECT
                    SUM(CASE WHEN DATE(posted_at) = DATE('now') THEN 1 ELSE 0 END) as jobs_posted,
                    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as jobs_active,
                    SUM(CASE WHEN status IN ('closed', 'filled') AND DATE(updated_at) = DATE('now') THEN 1 ELSE 0 END) as jobs_filled,
                    (
                        SELECT title
                        FROM jobs
                        WHERE company = ?
                        GROUP BY title
                        ORDER BY COUNT(*) DESC
                        LIMIT 1
                    ) as top_role,
                    (
                        SELECT location
                        FROM jobs
                        WHERE company = ?
                        GROUP BY location
                        ORDER BY COUNT(*) DESC
                        LIMIT 1
                    ) as top_location
                FROM jobs
                WHERE company = ?
                "#,
            )
            .bind(&company)
            .bind(&company)
            .bind(&company)
            .fetch_one(&self.db)
            .await?;

            let jobs_posted: i64 = stats.try_get("jobs_posted")?;
            let jobs_active: i64 = stats.try_get("jobs_active")?;
            let jobs_filled: i64 = stats.try_get("jobs_filled")?;
            let top_role: Option<String> = stats.try_get("top_role").ok();
            let top_location: Option<String> = stats.try_get("top_location").ok();

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
    pub(super) async fn compute_location_job_density(&self) -> Result<()> {
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
    pub(super) async fn compute_role_demand_trends(&self) -> Result<()> {
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
    pub(super) async fn detect_market_alerts(&self) -> Result<()> {
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

            let pct_change =
                ((current_mentions - prev_mentions) as f64 / prev_mentions as f64) * 100.0;

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
}
