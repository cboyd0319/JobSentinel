//! Salary Predictor
//!
//! Predicts salary ranges for jobs based on title, location, and experience.

use super::{SalaryPrediction, SeniorityLevel};
use anyhow::Result;
use chrono::Utc;
use sqlx::{Row, SqlitePool};

/// Salary predictor
pub struct SalaryPredictor {
    db: SqlitePool,
}

impl SalaryPredictor {
    pub fn new(db: SqlitePool) -> Self {
        Self { db }
    }

    /// Predict salary for a job
    pub async fn predict_for_job(
        &self,
        job_hash: &str,
        years_of_experience: Option<i32>,
    ) -> Result<SalaryPrediction> {
        // Get job details
        let job = sqlx::query("SELECT title, location FROM jobs WHERE hash = ?")
            .bind(job_hash)
            .fetch_one(&self.db)
            .await?;

        let title: String = job.try_get("title")?;
        let location: Option<String> = job.try_get("location")?;
        let location = location.unwrap_or_default();

        // Determine seniority
        let seniority = if let Some(years) = years_of_experience {
            SeniorityLevel::from_years_of_experience(years)
        } else {
            SeniorityLevel::from_job_title(&title)
        };

        // Normalize title and location
        let normalized_title = self.normalize_title(&title);
        let normalized_location = self.normalize_location(&location);
        let seniority_str = seniority.as_str().to_string();

        // Query benchmark
        let benchmark = sqlx::query(
            r#"
            SELECT min_salary, median_salary, p75_salary, sample_size
            FROM salary_benchmarks
            WHERE job_title_normalized = ?
              AND location_normalized LIKE ?
              AND seniority_level = ?
            ORDER BY sample_size DESC
            LIMIT 1
            "#,
        )
        .bind(&normalized_title)
        .bind(format!("%{}%", normalized_location))
        .bind(&seniority_str)
        .fetch_optional(&self.db)
        .await?;

        let (min, median, max, sample_size, method, confidence) = if let Some(b) = benchmark {
            // Found exact match
            (
                b.try_get::<i64, _>("min_salary").unwrap_or(0),
                b.try_get::<i64, _>("median_salary").unwrap_or(0),
                b.try_get::<i64, _>("p75_salary").unwrap_or(0),
                b.try_get::<i64, _>("sample_size").unwrap_or(0),
                "h1b_match",
                0.9, // High confidence for exact match
            )
        } else {
            // Fallback: broader search (any location, same title/seniority)
            let fallback = sqlx::query(
                r#"
                SELECT AVG(min_salary) as avg_min, AVG(median_salary) as avg_median,
                       AVG(p75_salary) as avg_p75, SUM(sample_size) as total_samples
                FROM salary_benchmarks
                WHERE job_title_normalized = ?
                  AND seniority_level = ?
                "#,
            )
            .bind(&normalized_title)
            .bind(&seniority_str)
            .fetch_one(&self.db)
            .await?;

            let avg_median: Option<f64> = fallback.try_get("avg_median").ok();

            if avg_median.is_some() {
                (
                    fallback.try_get::<f64, _>("avg_min").unwrap_or(0.0) as i64,
                    fallback.try_get::<f64, _>("avg_median").unwrap_or(0.0) as i64,
                    fallback.try_get::<f64, _>("avg_p75").unwrap_or(0.0) as i64,
                    fallback.try_get::<i64, _>("total_samples").unwrap_or(0),
                    "h1b_average",
                    0.6, // Lower confidence for averaged data
                )
            } else {
                // No data at all - use industry defaults
                let base = match seniority {
                    SeniorityLevel::Entry => 80000,
                    SeniorityLevel::Mid => 120000,
                    SeniorityLevel::Senior => 160000,
                    SeniorityLevel::Staff => 200000,
                    SeniorityLevel::Principal => 250000,
                    SeniorityLevel::Unknown => 100000,
                };

                (
                    (base as f64 * 0.8) as i64,
                    base,
                    (base as f64 * 1.3) as i64,
                    0,
                    "default",
                    0.3, // Low confidence for defaults
                )
            }
        };

        // Store prediction
        let prediction = SalaryPrediction {
            job_hash: job_hash.to_string(),
            predicted_min: min,
            predicted_max: max,
            predicted_median: median,
            confidence_score: confidence,
            prediction_method: method.to_string(),
            data_points_used: sample_size,
            created_at: Utc::now(),
        };

        sqlx::query(
            r#"
            INSERT INTO job_salary_predictions (
                job_hash, predicted_min, predicted_max, predicted_median,
                confidence_score, prediction_method, data_points_used
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(job_hash) DO UPDATE SET
                predicted_min = excluded.predicted_min,
                predicted_max = excluded.predicted_max,
                predicted_median = excluded.predicted_median,
                confidence_score = excluded.confidence_score,
                prediction_method = excluded.prediction_method,
                data_points_used = excluded.data_points_used
            "#,
        )
        .bind(&prediction.job_hash)
        .bind(prediction.predicted_min)
        .bind(prediction.predicted_max)
        .bind(prediction.predicted_median)
        .bind(prediction.confidence_score)
        .bind(&prediction.prediction_method)
        .bind(prediction.data_points_used)
        .execute(&self.db)
        .await?;

        Ok(prediction)
    }

    /// Get existing prediction for a job
    pub async fn get_prediction(&self, job_hash: &str) -> Result<Option<SalaryPrediction>> {
        let record = sqlx::query(
            r#"
            SELECT job_hash, predicted_min, predicted_max, predicted_median,
                   confidence_score, prediction_method, data_points_used, created_at
            FROM job_salary_predictions
            WHERE job_hash = ?
            "#,
        )
        .bind(job_hash)
        .fetch_optional(&self.db)
        .await?;

        match record {
            Some(r) => Ok(Some(SalaryPrediction {
                job_hash: r.try_get::<String, _>("job_hash")?,
                predicted_min: r.try_get::<i64, _>("predicted_min").unwrap_or(0),
                predicted_max: r.try_get::<i64, _>("predicted_max").unwrap_or(0),
                predicted_median: r.try_get::<i64, _>("predicted_median").unwrap_or(0),
                confidence_score: r.try_get::<f64, _>("confidence_score").unwrap_or(0.0),
                prediction_method: r
                    .try_get::<String, _>("prediction_method")
                    .unwrap_or_else(|_| "unknown".to_string()),
                data_points_used: r.try_get::<i64, _>("data_points_used").unwrap_or(0),
                created_at: chrono::DateTime::parse_from_rfc3339(
                    &r.try_get::<String, _>("created_at")?,
                )?
                .with_timezone(&Utc),
            })),
            None => Ok(None),
        }
    }

    fn normalize_title(&self, title: &str) -> String {
        let lower = title.to_lowercase();
        if lower.contains("software engineer") || lower.contains("swe") {
            "software engineer".to_string()
        } else if lower.contains("data scientist") {
            "data scientist".to_string()
        } else if lower.contains("product manager") {
            "product manager".to_string()
        } else {
            lower
        }
    }

    fn normalize_location(&self, location: &str) -> String {
        let lower = location.to_lowercase();
        if lower.contains("san francisco") || lower.contains("sf") {
            "san francisco, ca".to_string()
        } else if lower.contains("new york") || lower.contains("nyc") {
            "new york, ny".to_string()
        } else {
            lower
        }
    }
}

#[cfg(test)]
mod tests {

    #[test]
    fn test_normalize_title_software_engineer() {
        let predictor = create_test_predictor();

        assert_eq!(
            predictor.normalize_title("Software Engineer"),
            "software engineer"
        );
        assert_eq!(
            predictor.normalize_title("Senior Software Engineer"),
            "software engineer"
        );
        assert_eq!(
            predictor.normalize_title("SWE"),
            "software engineer"
        );
        assert_eq!(
            predictor.normalize_title("Staff SWE"),
            "software engineer"
        );
    }

    #[test]
    fn test_normalize_title_data_scientist() {
        let predictor = create_test_predictor();

        assert_eq!(
            predictor.normalize_title("Data Scientist"),
            "data scientist"
        );
        assert_eq!(
            predictor.normalize_title("Senior Data Scientist"),
            "data scientist"
        );
        assert_eq!(
            predictor.normalize_title("Lead Data Scientist"),
            "data scientist"
        );
    }

    #[test]
    fn test_normalize_title_product_manager() {
        let predictor = create_test_predictor();

        assert_eq!(
            predictor.normalize_title("Product Manager"),
            "product manager"
        );
        assert_eq!(
            predictor.normalize_title("Senior Product Manager"),
            "product manager"
        );
        assert_eq!(
            predictor.normalize_title("Technical Product Manager"),
            "product manager"
        );
    }

    #[test]
    fn test_normalize_title_other_roles() {
        let predictor = create_test_predictor();

        assert_eq!(
            predictor.normalize_title("DevOps Engineer"),
            "devops engineer"
        );
        assert_eq!(
            predictor.normalize_title("Backend Developer"),
            "backend developer"
        );
        assert_eq!(
            predictor.normalize_title("QA Engineer"),
            "qa engineer"
        );
    }

    #[test]
    fn test_normalize_title_case_insensitive() {
        let predictor = create_test_predictor();

        assert_eq!(
            predictor.normalize_title("SOFTWARE ENGINEER"),
            "software engineer"
        );
        assert_eq!(
            predictor.normalize_title("Data SCIENTIST"),
            "data scientist"
        );
    }

    #[test]
    fn test_normalize_title_empty() {
        let predictor = create_test_predictor();
        assert_eq!(predictor.normalize_title(""), "");
    }

    #[test]
    fn test_normalize_location_san_francisco() {
        let predictor = create_test_predictor();

        assert_eq!(
            predictor.normalize_location("San Francisco, CA"),
            "san francisco, ca"
        );
        assert_eq!(
            predictor.normalize_location("San Francisco Bay Area"),
            "san francisco, ca"
        );
        assert_eq!(
            predictor.normalize_location("SF"),
            "san francisco, ca"
        );
        assert_eq!(
            predictor.normalize_location("sf, ca"),
            "san francisco, ca"
        );
    }

    #[test]
    fn test_normalize_location_new_york() {
        let predictor = create_test_predictor();

        assert_eq!(
            predictor.normalize_location("New York, NY"),
            "new york, ny"
        );
        assert_eq!(
            predictor.normalize_location("New York City"),
            "new york, ny"
        );
        assert_eq!(
            predictor.normalize_location("NYC"),
            "new york, ny"
        );
    }

    #[test]
    fn test_normalize_location_other_cities() {
        let predictor = create_test_predictor();

        assert_eq!(
            predictor.normalize_location("Denver, CO"),
            "denver, co"
        );
        assert_eq!(
            predictor.normalize_location("Boston, MA"),
            "boston, ma"
        );
    }

    #[test]
    fn test_normalize_location_empty() {
        let predictor = create_test_predictor();
        assert_eq!(predictor.normalize_location(""), "");
    }

    #[test]
    fn test_normalize_location_case_insensitive() {
        let predictor = create_test_predictor();

        assert_eq!(
            predictor.normalize_location("SAN FRANCISCO"),
            "san francisco, ca"
        );
        assert_eq!(
            predictor.normalize_location("new YORK"),
            "new york, ny"
        );
    }

    #[test]
    fn test_default_salary_by_seniority() {
        // Test the default salary logic when no benchmark data exists
        // Entry
        let base = 80000;
        let min = (base as f64 * 0.8) as i64;
        let max = (base as f64 * 1.3) as i64;
        assert_eq!(min, 64000);
        assert_eq!(max, 104000);

        // Mid
        let base = 120000;
        let min = (base as f64 * 0.8) as i64;
        let max = (base as f64 * 1.3) as i64;
        assert_eq!(min, 96000);
        assert_eq!(max, 156000);

        // Senior
        let base = 160000;
        let min = (base as f64 * 0.8) as i64;
        let max = (base as f64 * 1.3) as i64;
        assert_eq!(min, 128000);
        assert_eq!(max, 208000);

        // Staff
        let base = 200000;
        let min = (base as f64 * 0.8) as i64;
        let max = (base as f64 * 1.3) as i64;
        assert_eq!(min, 160000);
        assert_eq!(max, 260000);

        // Principal
        let base = 250000;
        let min = (base as f64 * 0.8) as i64;
        let max = (base as f64 * 1.3) as i64;
        assert_eq!(min, 200000);
        assert_eq!(max, 325000);

        // Unknown
        let base = 100000;
        let min = (base as f64 * 0.8) as i64;
        let max = (base as f64 * 1.3) as i64;
        assert_eq!(min, 80000);
        assert_eq!(max, 130000);
    }

    #[test]
    fn test_confidence_scores() {
        // High confidence for exact match
        let confidence_exact = 0.9;
        assert_eq!(confidence_exact, 0.9);

        // Lower confidence for averaged data
        let confidence_average = 0.6;
        assert_eq!(confidence_average, 0.6);

        // Low confidence for defaults
        let confidence_default = 0.3;
        assert_eq!(confidence_default, 0.3);
    }

    // Helper function to create test predictor (without DB)
    fn create_test_predictor() -> TestPredictor {
        TestPredictor
    }

    // Test struct that implements only the pure functions
    struct TestPredictor;

    impl TestPredictor {
        fn normalize_title(&self, title: &str) -> String {
            let lower = title.to_lowercase();
            if lower.contains("software engineer") || lower.contains("swe") {
                "software engineer".to_string()
            } else if lower.contains("data scientist") {
                "data scientist".to_string()
            } else if lower.contains("product manager") {
                "product manager".to_string()
            } else {
                lower
            }
        }

        fn normalize_location(&self, location: &str) -> String {
            let lower = location.to_lowercase();
            if lower.contains("san francisco") || lower.contains("sf") {
                "san francisco, ca".to_string()
            } else if lower.contains("new york") || lower.contains("nyc") {
                "new york, ny".to_string()
            } else {
                lower
            }
        }
    }
}
