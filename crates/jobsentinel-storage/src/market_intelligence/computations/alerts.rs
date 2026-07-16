use anyhow::Result;
use sqlx::Row;

use crate::market_intelligence::MarketIntelligence;

impl MarketIntelligence {
    /// Detect market alerts (anomalies, trends)
    pub(in crate::market_intelligence) async fn detect_market_alerts(&self) -> Result<()> {
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
