//! Market intelligence computation methods
//!
//! This module contains all compute_* methods for calculating trends and statistics.

mod alerts;
mod company;
mod location;
mod role;
mod salary;

use anyhow::Result;
use chrono::Utc;
use sqlx::Row;

use super::statistics::predicted_salary_summary;
use super::MarketIntelligence;

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

            let median_salary = predicted_salary_summary(&salary_rows).median;

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
}
