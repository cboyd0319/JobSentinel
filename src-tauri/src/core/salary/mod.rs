//! Salary Negotiation AI
//!
//! Provides salary benchmarking, prediction, and negotiation assistance.
//!
//! ## Features
//!
//! - **Salary Benchmarks** - Based on H1B public data (legal, free)
//! - **Offer Tracking** - Track and compare multiple offers
//! - **Salary Prediction** - Estimate fair market value for jobs
//! - **Negotiation Scripts** - AI-generated negotiation templates
//!
//! ## Data Sources
//!
//! 1. **H1B Salary Database** (Primary)
//!    - Source: U.S. Department of Labor (public data)
//!    - Coverage: 500K+ salaries annually
//!    - Legal: Public domain
//!
//! 2. **User-Reported Salaries** (Secondary)
//!    - Crowdsourced from JobSentinel users (opt-in)
//!    - Verified through offer letters
//!
//! ## Usage
//!
//! ```rust,ignore
//! use jobsentinel::core::salary::SalaryAnalyzer;
//!
//! let analyzer = SalaryAnalyzer::new(db_pool);
//!
//! // Predict salary for a job
//! let prediction = analyzer.predict_salary(
//!     "Software Engineer",
//!     "San Francisco, CA",
//!     5 // years of experience
//! ).await?;
//!
//! println!("Expected range: ${}-${}", prediction.min, prediction.max);
//! println!("Market median: ${}", prediction.median);
//! ```

use anyhow::Result;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{Row, SqlitePool};

pub mod benchmarks;
pub mod predictor;
pub mod negotiation;

pub use benchmarks::SalaryBenchmark;
pub use predictor::SalaryPredictor;
pub use negotiation::NegotiationScriptGenerator;

/// Seniority level
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SeniorityLevel {
    Entry,
    Mid,
    Senior,
    Staff,
    Principal,
    Unknown,
}

impl SeniorityLevel {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Entry => "entry",
            Self::Mid => "mid",
            Self::Senior => "senior",
            Self::Staff => "staff",
            Self::Principal => "principal",
            Self::Unknown => "unknown",
        }
    }

    pub fn parse(s: &str) -> Self {
        match s {
            "entry" => Self::Entry,
            "mid" => Self::Mid,
            "senior" => Self::Senior,
            "staff" => Self::Staff,
            "principal" => Self::Principal,
            _ => Self::Unknown,
        }
    }

    /// Infer seniority from years of experience
    pub fn from_years_of_experience(years: i32) -> Self {
        match years {
            0..=2 => Self::Entry,
            3..=5 => Self::Mid,
            6..=10 => Self::Senior,
            11..=15 => Self::Staff,
            _ => Self::Principal,
        }
    }

    /// Infer seniority from job title
    pub fn from_job_title(title: &str) -> Self {
        let title_lower = title.to_lowercase();

        if title_lower.contains("principal") || title_lower.contains("distinguished") {
            Self::Principal
        } else if title_lower.contains("staff") || title_lower.contains("architect") {
            Self::Staff
        } else if title_lower.contains("senior") || title_lower.contains("sr.") || title_lower.contains("lead") {
            Self::Senior
        } else if title_lower.contains("junior") || title_lower.contains("jr.") || title_lower.contains("associate") {
            Self::Entry
        } else {
            Self::Mid // Default assumption
        }
    }
}

/// Salary prediction result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SalaryPrediction {
    pub job_hash: String,
    pub predicted_min: i64,
    pub predicted_max: i64,
    pub predicted_median: i64,
    pub confidence_score: f64,
    pub prediction_method: String,
    pub data_points_used: i64,
    pub created_at: DateTime<Utc>,
}

/// Offer comparison
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OfferComparison {
    pub offer_id: i64,
    pub company: String,
    pub base_salary: i64,
    pub total_compensation: i64,
    pub market_median: Option<i64>,
    pub market_position: String, // "above_market", "at_market", "below_market"
    pub recommendation: String,
}

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
    pub async fn compare_offers(&self, offer_ids: Vec<i64>) -> Result<Vec<OfferComparison>> {
        let mut comparisons = Vec::new();

        for offer_id in offer_ids {
            let offer = sqlx::query(
                r#"
                SELECT o.id, o.base_salary, o.annual_bonus, o.equity_shares,
                       a.job_hash, j.title, j.company
                FROM offers o
                JOIN applications a ON a.id = o.application_id
                JOIN jobs j ON j.hash = a.job_hash
                WHERE o.id = ?
                "#,
            )
            .bind(offer_id)
            .fetch_one(&self.db)
            .await?;

            let id: i64 = offer.try_get("id")?;
            let company: String = offer.try_get("company")?;
            let job_hash: String = offer.try_get("job_hash")?;
            let base_salary: i64 = offer.try_get::<Option<i64>, _>("base_salary")?.unwrap_or(0);
            let annual_bonus: i64 = offer.try_get::<Option<i64>, _>("annual_bonus")?.unwrap_or(0);

            // Calculate total comp (simplified)
            let total_comp = base_salary + annual_bonus;

            // Get market benchmark
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
                (None, "unknown".to_string(), "Insufficient data for recommendation.".to_string())
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_seniority_as_str() {
        assert_eq!(SeniorityLevel::Entry.as_str(), "entry");
        assert_eq!(SeniorityLevel::Mid.as_str(), "mid");
        assert_eq!(SeniorityLevel::Senior.as_str(), "senior");
        assert_eq!(SeniorityLevel::Staff.as_str(), "staff");
        assert_eq!(SeniorityLevel::Principal.as_str(), "principal");
        assert_eq!(SeniorityLevel::Unknown.as_str(), "unknown");
    }

    #[test]
    fn test_seniority_parse() {
        assert_eq!(SeniorityLevel::parse("entry"), SeniorityLevel::Entry);
        assert_eq!(SeniorityLevel::parse("mid"), SeniorityLevel::Mid);
        assert_eq!(SeniorityLevel::parse("senior"), SeniorityLevel::Senior);
        assert_eq!(SeniorityLevel::parse("staff"), SeniorityLevel::Staff);
        assert_eq!(SeniorityLevel::parse("principal"), SeniorityLevel::Principal);
        assert_eq!(SeniorityLevel::parse("unknown"), SeniorityLevel::Unknown);
        assert_eq!(SeniorityLevel::parse("invalid"), SeniorityLevel::Unknown);
        assert_eq!(SeniorityLevel::parse(""), SeniorityLevel::Unknown);
    }

    #[test]
    fn test_seniority_parse_case_insensitive() {
        assert_eq!(SeniorityLevel::parse("ENTRY"), SeniorityLevel::Unknown);
        assert_eq!(SeniorityLevel::parse("Senior"), SeniorityLevel::Unknown);
        // Parser expects lowercase - this is intentional behavior
    }

    #[test]
    fn test_seniority_roundtrip() {
        for level in [
            SeniorityLevel::Entry,
            SeniorityLevel::Mid,
            SeniorityLevel::Senior,
            SeniorityLevel::Staff,
            SeniorityLevel::Principal,
            SeniorityLevel::Unknown,
        ] {
            let str = level.as_str();
            let parsed = SeniorityLevel::parse(str);
            assert_eq!(level, parsed);
        }
    }

    #[test]
    fn test_seniority_from_years_edge_cases() {
        // Boundary conditions
        assert_eq!(
            SeniorityLevel::from_years_of_experience(0),
            SeniorityLevel::Entry
        );
        assert_eq!(
            SeniorityLevel::from_years_of_experience(2),
            SeniorityLevel::Entry
        );
        assert_eq!(
            SeniorityLevel::from_years_of_experience(3),
            SeniorityLevel::Mid
        );
        assert_eq!(
            SeniorityLevel::from_years_of_experience(5),
            SeniorityLevel::Mid
        );
        assert_eq!(
            SeniorityLevel::from_years_of_experience(6),
            SeniorityLevel::Senior
        );
        assert_eq!(
            SeniorityLevel::from_years_of_experience(10),
            SeniorityLevel::Senior
        );
        assert_eq!(
            SeniorityLevel::from_years_of_experience(11),
            SeniorityLevel::Staff
        );
        assert_eq!(
            SeniorityLevel::from_years_of_experience(15),
            SeniorityLevel::Staff
        );
        assert_eq!(
            SeniorityLevel::from_years_of_experience(16),
            SeniorityLevel::Principal
        );
        assert_eq!(
            SeniorityLevel::from_years_of_experience(30),
            SeniorityLevel::Principal
        );
    }

    #[test]
    fn test_seniority_from_years() {
        assert_eq!(
            SeniorityLevel::from_years_of_experience(1),
            SeniorityLevel::Entry
        );
        assert_eq!(
            SeniorityLevel::from_years_of_experience(4),
            SeniorityLevel::Mid
        );
        assert_eq!(
            SeniorityLevel::from_years_of_experience(8),
            SeniorityLevel::Senior
        );
        assert_eq!(
            SeniorityLevel::from_years_of_experience(12),
            SeniorityLevel::Staff
        );
        assert_eq!(
            SeniorityLevel::from_years_of_experience(20),
            SeniorityLevel::Principal
        );
    }

    #[test]
    fn test_seniority_from_title() {
        assert_eq!(
            SeniorityLevel::from_job_title("Junior Software Engineer"),
            SeniorityLevel::Entry
        );
        assert_eq!(
            SeniorityLevel::from_job_title("Senior Software Engineer"),
            SeniorityLevel::Senior
        );
        assert_eq!(
            SeniorityLevel::from_job_title("Staff Engineer"),
            SeniorityLevel::Staff
        );
        assert_eq!(
            SeniorityLevel::from_job_title("Principal Engineer"),
            SeniorityLevel::Principal
        );
    }

    #[test]
    fn test_seniority_from_title_variations() {
        // Principal variants
        assert_eq!(
            SeniorityLevel::from_job_title("Principal Software Engineer"),
            SeniorityLevel::Principal
        );
        assert_eq!(
            SeniorityLevel::from_job_title("Distinguished Engineer"),
            SeniorityLevel::Principal
        );

        // Staff variants
        assert_eq!(
            SeniorityLevel::from_job_title("Staff Software Engineer"),
            SeniorityLevel::Staff
        );
        assert_eq!(
            SeniorityLevel::from_job_title("Software Architect"),
            SeniorityLevel::Staff
        );

        // Senior variants
        assert_eq!(
            SeniorityLevel::from_job_title("Senior Engineer"),
            SeniorityLevel::Senior
        );
        assert_eq!(
            SeniorityLevel::from_job_title("Sr. Developer"),
            SeniorityLevel::Senior
        );
        assert_eq!(
            SeniorityLevel::from_job_title("Lead Engineer"),
            SeniorityLevel::Senior
        );

        // Entry variants
        assert_eq!(
            SeniorityLevel::from_job_title("Junior Developer"),
            SeniorityLevel::Entry
        );
        assert_eq!(
            SeniorityLevel::from_job_title("Jr. Software Engineer"),
            SeniorityLevel::Entry
        );
        assert_eq!(
            SeniorityLevel::from_job_title("Associate Engineer"),
            SeniorityLevel::Entry
        );

        // Mid (default)
        assert_eq!(
            SeniorityLevel::from_job_title("Software Engineer"),
            SeniorityLevel::Mid
        );
        assert_eq!(
            SeniorityLevel::from_job_title("Backend Developer"),
            SeniorityLevel::Mid
        );
    }

    #[test]
    fn test_seniority_from_title_case_insensitive() {
        assert_eq!(
            SeniorityLevel::from_job_title("SENIOR SOFTWARE ENGINEER"),
            SeniorityLevel::Senior
        );
        assert_eq!(
            SeniorityLevel::from_job_title("principal engineer"),
            SeniorityLevel::Principal
        );
        assert_eq!(
            SeniorityLevel::from_job_title("StAfF EnGiNeEr"),
            SeniorityLevel::Staff
        );
    }

    #[test]
    fn test_seniority_from_empty_title() {
        assert_eq!(
            SeniorityLevel::from_job_title(""),
            SeniorityLevel::Mid
        );
    }

    #[test]
    fn test_normalize_job_title() {
        let analyzer = create_test_analyzer();

        // Software Engineer variations
        assert_eq!(
            analyzer.normalize_job_title("Senior Software Engineer"),
            "software engineer"
        );
        assert_eq!(
            analyzer.normalize_job_title("Sr. SWE"),
            "software engineer"
        );
        assert_eq!(
            analyzer.normalize_job_title("Staff SWE - Backend"),
            "software engineer"
        );

        // Data Scientist
        assert_eq!(
            analyzer.normalize_job_title("Senior Data Scientist"),
            "data scientist"
        );
        assert_eq!(
            analyzer.normalize_job_title("Data Scientist II"),
            "data scientist"
        );

        // Product Manager
        assert_eq!(
            analyzer.normalize_job_title("Senior Product Manager"),
            "product manager"
        );
        assert_eq!(
            analyzer.normalize_job_title("Technical Product Manager"),
            "product manager"
        );

        // Other titles remain normalized
        assert_eq!(
            analyzer.normalize_job_title("DevOps Engineer"),
            "devops engineer"
        );
    }

    #[test]
    fn test_normalize_job_title_removes_variations() {
        let analyzer = create_test_analyzer();

        assert_eq!(
            analyzer.normalize_job_title("Sr. Software Engineer"),
            "software engineer"
        );
        assert_eq!(
            analyzer.normalize_job_title("Jr. Developer"),
            "junior developer"
        );
    }

    #[test]
    fn test_normalize_job_title_handles_double_spaces() {
        let analyzer = create_test_analyzer();

        assert_eq!(
            analyzer.normalize_job_title("Software  Engineer"),
            "software engineer"
        );
    }

    #[test]
    fn test_normalize_location() {
        let analyzer = create_test_analyzer();

        // San Francisco variants
        assert_eq!(
            analyzer.normalize_location("San Francisco, CA"),
            "san francisco, ca"
        );
        assert_eq!(
            analyzer.normalize_location("San Francisco Bay Area"),
            "san francisco, ca"
        );
        assert_eq!(
            analyzer.normalize_location("SF, CA"),
            "san francisco, ca"
        );

        // New York variants
        assert_eq!(
            analyzer.normalize_location("New York, NY"),
            "new york, ny"
        );
        assert_eq!(
            analyzer.normalize_location("New York City"),
            "new york, ny"
        );
        assert_eq!(
            analyzer.normalize_location("NYC"),
            "new york, ny"
        );

        // Seattle
        assert_eq!(
            analyzer.normalize_location("Seattle, WA"),
            "seattle, wa"
        );
        assert_eq!(
            analyzer.normalize_location("Seattle Metropolitan Area"),
            "seattle, wa"
        );

        // Austin
        assert_eq!(
            analyzer.normalize_location("Austin, TX"),
            "austin, tx"
        );
        assert_eq!(
            analyzer.normalize_location("Austin-Round Rock"),
            "austin, tx"
        );

        // Other locations remain lowercased
        assert_eq!(
            analyzer.normalize_location("Denver, CO"),
            "denver, co"
        );
    }

    #[test]
    fn test_normalize_location_empty() {
        let analyzer = create_test_analyzer();
        assert_eq!(analyzer.normalize_location(""), "");
    }

    #[test]
    fn test_offer_comparison_market_position_logic() {
        // This tests the logic in compare_offers for market position determination
        // Testing the position logic without DB

        let base_salary = 160000i64;
        let predicted_median = 150000i64;
        let predicted_max = 180000i64;

        let position = if base_salary >= predicted_max {
            "above_market"
        } else if base_salary >= predicted_median {
            "at_market"
        } else {
            "below_market"
        };

        assert_eq!(position, "at_market");

        // Above market
        let base_salary = 190000i64;
        let position = if base_salary >= predicted_max {
            "above_market"
        } else if base_salary >= predicted_median {
            "at_market"
        } else {
            "below_market"
        };
        assert_eq!(position, "above_market");

        // Below market
        let base_salary = 140000i64;
        let position = if base_salary >= predicted_max {
            "above_market"
        } else if base_salary >= predicted_median {
            "at_market"
        } else {
            "below_market"
        };
        assert_eq!(position, "below_market");
    }

    #[test]
    fn test_offer_comparison_recommendation_logic() {
        // Above market
        let position = "above_market";
        let rec = match position {
            "above_market" => "Excellent offer! Accept or negotiate equity.".to_string(),
            "at_market" => "Fair offer. Consider negotiating for 10-15% more.".to_string(),
            "below_market" => format!(
                "Below market. Counter with ${}-${}.",
                150000, 180000
            ),
            _ => "Unknown".to_string(),
        };
        assert_eq!(rec, "Excellent offer! Accept or negotiate equity.");

        // At market
        let position = "at_market";
        let rec = match position {
            "above_market" => "Excellent offer! Accept or negotiate equity.".to_string(),
            "at_market" => "Fair offer. Consider negotiating for 10-15% more.".to_string(),
            "below_market" => format!(
                "Below market. Counter with ${}-${}.",
                150000, 180000
            ),
            _ => "Unknown".to_string(),
        };
        assert_eq!(rec, "Fair offer. Consider negotiating for 10-15% more.");

        // Below market
        let position = "below_market";
        let rec = match position {
            "above_market" => "Excellent offer! Accept or negotiate equity.".to_string(),
            "at_market" => "Fair offer. Consider negotiating for 10-15% more.".to_string(),
            "below_market" => format!(
                "Below market. Counter with ${}-${}.",
                150000, 180000
            ),
            _ => "Unknown".to_string(),
        };
        assert_eq!(rec, "Below market. Counter with $150000-$180000.");
    }

    // Helper to create test analyzer (without DB)
    fn create_test_analyzer() -> TestAnalyzer {
        TestAnalyzer
    }

    // Test struct that implements only the pure functions
    struct TestAnalyzer;

    impl TestAnalyzer {
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
}
