//! Salary analyzer implementation

use anyhow::Result;
use chrono::{DateTime, Utc};
use sqlx::{Row, SqlitePool};

use super::benchmarks::SalaryBenchmark;
use super::negotiation::NegotiationScriptGenerator;
use super::predictor::SalaryPredictor;
use super::types::{OfferComparison, SalaryPrediction, SeniorityLevel};

/// Main salary analyzer
pub struct SalaryAnalyzer {
    db: SqlitePool,
    predictor: SalaryPredictor,
    script_generator: NegotiationScriptGenerator,
}

impl SalaryAnalyzer {
    pub fn new(db: SqlitePool) -> Self {
        Self {
            predictor: SalaryPredictor::new(db.clone()),
            script_generator: NegotiationScriptGenerator::new(db.clone()),
            db,
        }
    }

    /// Predict salary for a job
    pub async fn predict_salary_for_job(
        &self,
        job_hash: &str,
        years_of_experience: Option<i32>,
    ) -> Result<SalaryPrediction> {
        self.predictor
            .predict_for_job(job_hash, years_of_experience)
            .await
    }

    /// Get salary benchmark for role and location
    pub async fn get_benchmark(
        &self,
        job_title: &str,
        location: &str,
        seniority: SeniorityLevel,
    ) -> Result<Option<SalaryBenchmark>> {
        let normalized_title = self.normalize_job_title(job_title);
        let normalized_location = self.normalize_location(location);
        let seniority_str = seniority.as_str();

        let row = sqlx::query(
            r#"
            SELECT min_salary, p25_salary, median_salary, p75_salary,
                   max_salary, average_salary, sample_size, last_updated
            FROM salary_benchmarks
            WHERE job_title_normalized = ?
              AND location_normalized = ?
              AND seniority_level = ?
            ORDER BY last_updated DESC
            LIMIT 1
            "#,
        )
        .bind(&normalized_title)
        .bind(&normalized_location)
        .bind(seniority_str)
        .fetch_optional(&self.db)
        .await?;

        match row {
            Some(r) => Ok(Some(SalaryBenchmark {
                job_title: normalized_title,
                location: normalized_location,
                seniority_level: seniority,
                min_salary: r.try_get::<i64, _>("min_salary").unwrap_or(0),
                p25_salary: r.try_get::<i64, _>("p25_salary").unwrap_or(0),
                median_salary: r.try_get::<i64, _>("median_salary").unwrap_or(0),
                p75_salary: r.try_get::<i64, _>("p75_salary").unwrap_or(0),
                max_salary: r.try_get::<i64, _>("max_salary").unwrap_or(0),
                average_salary: r.try_get::<i64, _>("average_salary").unwrap_or(0),
                sample_size: r.try_get::<i64, _>("sample_size").unwrap_or(0),
                last_updated: DateTime::parse_from_rfc3339(
                    &r.try_get::<String, _>("last_updated").unwrap_or_default(),
                )
                .unwrap_or_else(|_| DateTime::default())
                .with_timezone(&Utc),
            })),
            None => Ok(None),
        }
    }

    /// Generate negotiation script
    pub async fn generate_negotiation_script(
        &self,
        scenario: &str,
        params: std::collections::HashMap<String, String>,
    ) -> Result<String> {
        self.script_generator.generate(scenario, params).await
    }

    /// Compare multiple offers
    ///
    /// OPTIMIZATION: Single batched query with IN clause instead of N queries.
    /// Fetch all offers in one round-trip, then get predictions.
    pub async fn compare_offers(&self, offer_ids: Vec<i64>) -> Result<Vec<OfferComparison>> {
        if offer_ids.is_empty() {
            return Ok(Vec::new());
        }

        // Batch fetch all offers in single query
        let placeholders = offer_ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
        let sql = format!(
            r#"
            SELECT o.id, o.base_salary, o.annual_bonus, o.equity_shares,
                   a.job_hash, j.title, j.company
            FROM offers o
            JOIN applications a ON a.id = o.application_id
            JOIN jobs j ON j.hash = a.job_hash
            WHERE o.id IN ({})
            "#,
            placeholders
        );

        let mut query = sqlx::query(&sql);
        for id in &offer_ids {
            query = query.bind(id);
        }
        let offers = query.fetch_all(&self.db).await?;

        let mut comparisons = Vec::with_capacity(offers.len());

        for offer in offers {
            let id: i64 = offer.try_get("id")?;
            let company: String = offer.try_get("company")?;
            let job_hash: String = offer.try_get("job_hash")?;
            let base_salary: i64 = offer.try_get::<Option<i64>, _>("base_salary")?.unwrap_or(0);
            let annual_bonus: i64 = offer
                .try_get::<Option<i64>, _>("annual_bonus")?
                .unwrap_or(0);

            // Calculate total comp (simplified)
            let total_comp = base_salary + annual_bonus;

            // Get market benchmark (still N queries, but could be batched too)
            let prediction = self.predictor.get_prediction(&job_hash).await?;

            let (market_median, market_position, recommendation) = if let Some(pred) = prediction {
                let position = if base_salary >= pred.predicted_max {
                    "above_market"
                } else if base_salary >= pred.predicted_median {
                    "at_market"
                } else {
                    "below_market"
                };

                let rec = match position {
                    "above_market" => "Excellent offer! Accept or negotiate equity.".to_string(),
                    "at_market" => "Fair offer. Consider negotiating for 10-15% more.".to_string(),
                    "below_market" => format!(
                        "Below market. Counter with ${}-${}.",
                        pred.predicted_median, pred.predicted_max
                    ),
                    _ => "Unknown".to_string(),
                };

                (Some(pred.predicted_median), position.to_string(), rec)
            } else {
                (
                    None,
                    "unknown".to_string(),
                    "Insufficient data for recommendation.".to_string(),
                )
            };

            comparisons.push(OfferComparison {
                offer_id: id,
                company,
                base_salary,
                total_compensation: total_comp,
                market_median,
                market_position,
                recommendation,
            });
        }

        Ok(comparisons)
    }

    /// Normalize job title for matching
    fn normalize_job_title(&self, title: &str) -> String {
        let mut normalized = title.to_lowercase();

        // Remove common variations
        normalized = normalized.replace("sr.", "senior");
        normalized = normalized.replace("jr.", "junior");
        normalized = normalized.replace("swe", "software engineer");
        normalized = normalized.replace("  ", " ");

        // Extract core title
        if normalized.contains("software engineer") {
            "software engineer".to_string()
        } else if normalized.contains("data scientist") {
            "data scientist".to_string()
        } else if normalized.contains("product manager") {
            "product manager".to_string()
        } else {
            normalized
        }
    }

    /// Normalize location for matching
    fn normalize_location(&self, location: &str) -> String {
        let normalized = location.to_lowercase();

        // Standardize common metro areas
        if normalized.contains("san francisco") || normalized.contains("sf") {
            "san francisco, ca".to_string()
        } else if normalized.contains("new york") || normalized.contains("nyc") {
            "new york, ny".to_string()
        } else if normalized.contains("seattle") {
            "seattle, wa".to_string()
        } else if normalized.contains("austin") {
            "austin, tx".to_string()
        } else {
            normalized
        }
    }
}
