use anyhow::Result;
use chrono::Utc;
use sqlx::Row;

use super::compute_median;
use crate::market_intelligence::MarketIntelligence;

impl MarketIntelligence {
    /// Compute location job density
    pub(in crate::market_intelligence) async fn compute_location_job_density(&self) -> Result<()> {
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
}
