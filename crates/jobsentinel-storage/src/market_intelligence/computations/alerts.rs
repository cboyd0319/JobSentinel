use anyhow::{Context, Result};
use sqlx::{Row, SqlitePool};

use crate::market_intelligence::MarketIntelligence;

struct NewMarketAlert<'a> {
    alert_type: &'static str,
    title: String,
    description: String,
    related_entity: &'a str,
    related_entity_type: &'static str,
    metric_value: f64,
    metric_change_pct: Option<f64>,
}

async fn insert_market_alert(db: &SqlitePool, alert: NewMarketAlert<'_>) -> Result<()> {
    sqlx::query(
        r#"
        INSERT INTO market_alerts (
            alert_type, title, description, severity,
            related_entity, related_entity_type, metric_value, metric_change_pct
        )
        VALUES (?, ?, ?, 'info', ?, ?, ?, ?)
        "#,
    )
    .bind(alert.alert_type)
    .bind(alert.title)
    .bind(alert.description)
    .bind(alert.related_entity)
    .bind(alert.related_entity_type)
    .bind(alert.metric_value)
    .bind(alert.metric_change_pct)
    .execute(db)
    .await
    .context("failed to insert market alert")?;

    Ok(())
}

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

            insert_market_alert(
                &self.db,
                NewMarketAlert {
                    alert_type: "skill_surge",
                    title: format!("{} demand surging!", skill_name),
                    description: format!(
                        "The skill '{}' saw a {}% increase in job postings this week ({} -> {} mentions).",
                        skill_name, pct_change as i32, prev_mentions, current_mentions
                    ),
                    related_entity: &skill_name,
                    related_entity_type: "skill",
                    metric_value: current_mentions as f64,
                    metric_change_pct: Some(pct_change),
                },
            )
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

            insert_market_alert(
                &self.db,
                NewMarketAlert {
                    alert_type: "salary_spike",
                    title: format!("{} salaries jumping in {}", job_title, location),
                    description: format!(
                        "Salaries for '{}' in {} increased by {:.1}% (median: ${}).",
                        job_title, location, growth, median
                    ),
                    related_entity: &job_title,
                    related_entity_type: "role",
                    metric_value: median as f64,
                    metric_change_pct: Some(growth),
                },
            )
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

            insert_market_alert(
                &self.db,
                NewMarketAlert {
                    alert_type: "hiring_spree",
                    title: format!("{} hiring aggressively", company_name),
                    description: format!(
                        "{} posted {} new jobs today ({} total active positions).",
                        company_name, jobs_posted, jobs_active
                    ),
                    related_entity: &company_name,
                    related_entity_type: "company",
                    metric_value: jobs_posted as f64,
                    metric_change_pct: None,
                },
            )
            .await?;
        }

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn alert_insert_preserves_optional_change_percentage() {
        let database = crate::Database::connect_memory().await.unwrap();
        database.migrate().await.unwrap();

        insert_market_alert(
            database.pool(),
            NewMarketAlert {
                alert_type: "hiring_spree",
                title: "Example Co hiring aggressively".to_string(),
                description: "Example Co posted 10 jobs.".to_string(),
                related_entity: "Example Co",
                related_entity_type: "company",
                metric_value: 10.0,
                metric_change_pct: None,
            },
        )
        .await
        .unwrap();

        let change: Option<f64> = sqlx::query_scalar("SELECT metric_change_pct FROM market_alerts")
            .fetch_one(database.pool())
            .await
            .unwrap();
        assert!(change.is_none());
    }
}
