use anyhow::Result;
use chrono::Utc;
use sqlx::Row;

use crate::core::market_intelligence::MarketIntelligence;

impl MarketIntelligence {
    /// Compute salary trends by role and location
    pub(in crate::core::market_intelligence) async fn compute_salary_trends(&self) -> Result<()> {
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
}
