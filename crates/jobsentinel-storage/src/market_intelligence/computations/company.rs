use anyhow::Result;
use chrono::Utc;
use sqlx::Row;

use crate::market_intelligence::MarketIntelligence;

impl MarketIntelligence {
    /// Compute company hiring velocity
    ///
    /// OPTIMIZATION: Reduced 4 queries per company to 1 query per company.
    /// Batches job counts, observed count, filled count, and top role into single query.
    pub(in crate::market_intelligence) async fn compute_company_hiring_velocity(
        &self,
    ) -> Result<()> {
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
                    SUM(CASE WHEN DATE(created_at) = DATE('now') THEN 1 ELSE 0 END) as jobs_posted,
                    COUNT(*) as jobs_active,
                    0 as jobs_filled,
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
            .bind((jobs_active > 0) as i32)
            .bind(hiring_trend)
            .execute(&self.db)
            .await?;
        }

        Ok(())
    }
}
