use anyhow::Result;
use chrono::Utc;
use sqlx::Row;

use super::compute_median;
use crate::market_intelligence::MarketIntelligence;

impl MarketIntelligence {
    /// Compute role demand trends
    pub(in crate::market_intelligence) async fn compute_role_demand_trends(&self) -> Result<()> {
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
}
