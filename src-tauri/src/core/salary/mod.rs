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
pub mod negotiation;
pub mod predictor;

pub use benchmarks::SalaryBenchmark;
pub use negotiation::NegotiationScriptGenerator;
pub use predictor::SalaryPredictor;

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
        } else if title_lower.contains("senior")
            || title_lower.contains("sr.")
            || title_lower.contains("lead")
        {
            Self::Senior
        } else if title_lower.contains("junior")
            || title_lower.contains("jr.")
            || title_lower.contains("associate")
        {
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
            let annual_bonus: i64 = offer
                .try_get::<Option<i64>, _>("annual_bonus")?
                .unwrap_or(0);

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
        assert_eq!(
            SeniorityLevel::parse("principal"),
            SeniorityLevel::Principal
        );
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
        assert_eq!(SeniorityLevel::from_job_title(""), SeniorityLevel::Mid);
    }

    #[test]
    fn test_normalize_job_title() {
        let analyzer = create_test_analyzer();

        // Software Engineer variations
        assert_eq!(
            analyzer.normalize_job_title("Senior Software Engineer"),
            "software engineer"
        );
        assert_eq!(analyzer.normalize_job_title("Sr. SWE"), "software engineer");
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
        assert_eq!(analyzer.normalize_location("SF, CA"), "san francisco, ca");

        // New York variants
        assert_eq!(analyzer.normalize_location("New York, NY"), "new york, ny");
        assert_eq!(analyzer.normalize_location("New York City"), "new york, ny");
        assert_eq!(analyzer.normalize_location("NYC"), "new york, ny");

        // Seattle
        assert_eq!(analyzer.normalize_location("Seattle, WA"), "seattle, wa");
        assert_eq!(
            analyzer.normalize_location("Seattle Metropolitan Area"),
            "seattle, wa"
        );

        // Austin
        assert_eq!(analyzer.normalize_location("Austin, TX"), "austin, tx");
        assert_eq!(
            analyzer.normalize_location("Austin-Round Rock"),
            "austin, tx"
        );

        // Other locations remain lowercased
        assert_eq!(analyzer.normalize_location("Denver, CO"), "denver, co");
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
            "below_market" => format!("Below market. Counter with ${}-${}.", 150000, 180000),
            _ => "Unknown".to_string(),
        };
        assert_eq!(rec, "Excellent offer! Accept or negotiate equity.");

        // At market
        let position = "at_market";
        let rec = match position {
            "above_market" => "Excellent offer! Accept or negotiate equity.".to_string(),
            "at_market" => "Fair offer. Consider negotiating for 10-15% more.".to_string(),
            "below_market" => format!("Below market. Counter with ${}-${}.", 150000, 180000),
            _ => "Unknown".to_string(),
        };
        assert_eq!(rec, "Fair offer. Consider negotiating for 10-15% more.");

        // Below market
        let position = "below_market";
        let rec = match position {
            "above_market" => "Excellent offer! Accept or negotiate equity.".to_string(),
            "at_market" => "Fair offer. Consider negotiating for 10-15% more.".to_string(),
            "below_market" => format!("Below market. Counter with ${}-${}.", 150000, 180000),
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

    #[test]
    fn test_seniority_from_negative_years() {
        // Edge case: negative years map to Principal (catch-all for values < 0)
        // This is because the match uses 0..=2 range, which doesn't include negatives
        assert_eq!(
            SeniorityLevel::from_years_of_experience(-5),
            SeniorityLevel::Principal
        );
        assert_eq!(
            SeniorityLevel::from_years_of_experience(-1),
            SeniorityLevel::Principal
        );
    }

    #[test]
    fn test_seniority_from_title_with_unicode() {
        // Test with special characters and unicode
        assert_eq!(
            SeniorityLevel::from_job_title("Senior Software Engineer™"),
            SeniorityLevel::Senior
        );
        assert_eq!(
            SeniorityLevel::from_job_title("Principal Engineér"),
            SeniorityLevel::Principal
        );
        assert_eq!(
            SeniorityLevel::from_job_title("Júnior Developer"),
            SeniorityLevel::Mid // "júnior" won't match "junior"
        );
    }

    #[test]
    fn test_seniority_from_title_multiple_keywords() {
        // If multiple keywords exist, priority order is: principal > staff > senior > entry
        assert_eq!(
            SeniorityLevel::from_job_title("Principal Staff Engineer"),
            SeniorityLevel::Principal
        );
        // "Senior Lead Architect" - contains both "senior" and "architect"
        // Checks principal first (no), then staff/architect (YES - "architect" matches) -> Staff
        assert_eq!(
            SeniorityLevel::from_job_title("Senior Lead Architect"),
            SeniorityLevel::Staff // "architect" keyword makes this Staff level
        );
        assert_eq!(
            SeniorityLevel::from_job_title("Staff Senior Engineer"),
            SeniorityLevel::Staff // "staff" has higher priority than "senior"
        );
    }

    #[test]
    fn test_seniority_level_serde() {
        // Test serialization/deserialization
        let level = SeniorityLevel::Senior;
        let json = serde_json::to_string(&level).unwrap();
        assert_eq!(json, r#""Senior""#);

        let deserialized: SeniorityLevel = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, SeniorityLevel::Senior);
    }

    #[test]
    fn test_salary_prediction_creation() {
        let prediction = SalaryPrediction {
            job_hash: "test_hash_123".to_string(),
            predicted_min: 100000,
            predicted_max: 180000,
            predicted_median: 140000,
            confidence_score: 0.85,
            prediction_method: "h1b_benchmark".to_string(),
            data_points_used: 42,
            created_at: Utc::now(),
        };

        assert_eq!(prediction.job_hash, "test_hash_123");
        assert_eq!(prediction.predicted_min, 100000);
        assert_eq!(prediction.predicted_max, 180000);
        assert_eq!(prediction.predicted_median, 140000);
        assert_eq!(prediction.confidence_score, 0.85);
        assert_eq!(prediction.data_points_used, 42);
    }

    #[test]
    fn test_salary_prediction_serde() {
        let now = Utc::now();
        let prediction = SalaryPrediction {
            job_hash: "abc123".to_string(),
            predicted_min: 120000,
            predicted_max: 160000,
            predicted_median: 140000,
            confidence_score: 0.9,
            prediction_method: "ml_model".to_string(),
            data_points_used: 100,
            created_at: now,
        };

        // Test serialization
        let json = serde_json::to_string(&prediction).unwrap();
        let deserialized: SalaryPrediction = serde_json::from_str(&json).unwrap();

        assert_eq!(deserialized.job_hash, "abc123");
        assert_eq!(deserialized.predicted_min, 120000);
        assert_eq!(deserialized.predicted_max, 160000);
        assert_eq!(deserialized.predicted_median, 140000);
        assert_eq!(deserialized.confidence_score, 0.9);
        assert_eq!(deserialized.prediction_method, "ml_model");
        assert_eq!(deserialized.data_points_used, 100);
    }

    #[test]
    fn test_offer_comparison_creation() {
        let comparison = OfferComparison {
            offer_id: 1,
            company: "TechCorp".to_string(),
            base_salary: 150000,
            total_compensation: 180000,
            market_median: Some(140000),
            market_position: "at_market".to_string(),
            recommendation: "Fair offer. Consider negotiating for 10-15% more.".to_string(),
        };

        assert_eq!(comparison.offer_id, 1);
        assert_eq!(comparison.company, "TechCorp");
        assert_eq!(comparison.base_salary, 150000);
        assert_eq!(comparison.total_compensation, 180000);
        assert_eq!(comparison.market_median, Some(140000));
        assert_eq!(comparison.market_position, "at_market");
    }

    #[test]
    fn test_offer_comparison_without_market_data() {
        let comparison = OfferComparison {
            offer_id: 2,
            company: "StartupXYZ".to_string(),
            base_salary: 130000,
            total_compensation: 150000,
            market_median: None,
            market_position: "unknown".to_string(),
            recommendation: "Insufficient data for recommendation.".to_string(),
        };

        assert_eq!(comparison.market_median, None);
        assert_eq!(comparison.market_position, "unknown");
        assert_eq!(
            comparison.recommendation,
            "Insufficient data for recommendation."
        );
    }

    #[test]
    fn test_normalize_job_title_edge_cases() {
        let analyzer = create_test_analyzer();

        // Empty string
        assert_eq!(analyzer.normalize_job_title(""), "");

        // Only whitespace - double space replacement reduces it
        assert_eq!(analyzer.normalize_job_title("   "), "  ");

        // Unicode characters
        assert_eq!(
            analyzer.normalize_job_title("Señor Software Engineer"),
            "software engineer"
        );

        // Numbers in title
        assert_eq!(
            analyzer.normalize_job_title("Software Engineer II"),
            "software engineer"
        );
        // "SWE3" -> "swe3" (lowercase) -> "software engineer3" (replace swe)
        // Then contains "software engineer" so returns just "software engineer"
        assert_eq!(analyzer.normalize_job_title("SWE3"), "software engineer");

        // Multiple replacements
        // "Sr. SWE II" -> "sr. swe ii" -> "senior swe ii" -> "senior software engineer ii"
        // Contains "software engineer" so returns just "software engineer"
        assert_eq!(
            analyzer.normalize_job_title("Sr. SWE II"),
            "software engineer"
        );
    }

    #[test]
    fn test_normalize_job_title_preserves_unknown_titles() {
        let analyzer = create_test_analyzer();

        // Titles that don't match patterns should be lowercased
        assert_eq!(
            analyzer.normalize_job_title("Blockchain Ninja"),
            "blockchain ninja"
        );
        assert_eq!(analyzer.normalize_job_title("DevOps Guru"), "devops guru");
        assert_eq!(
            analyzer.normalize_job_title("Full Stack Wizard"),
            "full stack wizard"
        );
    }

    #[test]
    fn test_normalize_location_edge_cases() {
        let analyzer = create_test_analyzer();

        // Case variations
        assert_eq!(
            analyzer.normalize_location("SAN FRANCISCO"),
            "san francisco, ca"
        );
        assert_eq!(analyzer.normalize_location("nYc"), "new york, ny");

        // Partial matches
        assert_eq!(
            analyzer.normalize_location("San Francisco Peninsula"),
            "san francisco, ca"
        );
        assert_eq!(
            analyzer.normalize_location("Greater Seattle Area"),
            "seattle, wa"
        );

        // No match - returns lowercase
        assert_eq!(analyzer.normalize_location("Portland, OR"), "portland, or");
        assert_eq!(analyzer.normalize_location("Remote - USA"), "remote - usa");
    }

    #[test]
    fn test_normalize_location_whitespace() {
        let analyzer = create_test_analyzer();

        // Leading/trailing whitespace
        assert_eq!(analyzer.normalize_location("  Seattle  "), "seattle, wa");
        assert_eq!(analyzer.normalize_location("\tNew York\n"), "new york, ny");
    }

    #[test]
    fn test_market_position_boundary_conditions() {
        // Test exact boundary values
        let predicted_median = 150000i64;
        let predicted_max = 180000i64;

        // Exactly at median
        let base_salary = 150000i64;
        let position = if base_salary >= predicted_max {
            "above_market"
        } else if base_salary >= predicted_median {
            "at_market"
        } else {
            "below_market"
        };
        assert_eq!(position, "at_market");

        // Exactly at max
        let base_salary = 180000i64;
        let position = if base_salary >= predicted_max {
            "above_market"
        } else if base_salary >= predicted_median {
            "at_market"
        } else {
            "below_market"
        };
        assert_eq!(position, "above_market");

        // One dollar below median
        let base_salary = 149999i64;
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
    fn test_recommendation_for_unknown_position() {
        let position = "something_else";
        let rec = match position {
            "above_market" => "Excellent offer! Accept or negotiate equity.".to_string(),
            "at_market" => "Fair offer. Consider negotiating for 10-15% more.".to_string(),
            "below_market" => format!("Below market. Counter with ${}-${}.", 150000, 180000),
            _ => "Unknown".to_string(),
        };
        assert_eq!(rec, "Unknown");
    }

    #[test]
    fn test_total_compensation_calculation() {
        // Test the logic from compare_offers for total comp
        let base_salary = 150000i64;
        let annual_bonus = 30000i64;
        let total_comp = base_salary + annual_bonus;

        assert_eq!(total_comp, 180000);

        // Zero bonus
        let base_salary = 150000i64;
        let annual_bonus = 0i64;
        let total_comp = base_salary + annual_bonus;
        assert_eq!(total_comp, 150000);

        // Large bonus
        let base_salary = 150000i64;
        let annual_bonus = 100000i64;
        let total_comp = base_salary + annual_bonus;
        assert_eq!(total_comp, 250000);
    }

    #[test]
    fn test_seniority_level_clone() {
        let level = SeniorityLevel::Senior;
        let cloned = level.clone();
        assert_eq!(level, cloned);
    }

    #[test]
    fn test_seniority_level_debug() {
        // Ensure Debug trait works
        let level = SeniorityLevel::Principal;
        let debug_str = format!("{:?}", level);
        assert!(debug_str.contains("Principal"));
    }

    #[test]
    fn test_salary_prediction_clone() {
        let prediction = SalaryPrediction {
            job_hash: "hash123".to_string(),
            predicted_min: 100000,
            predicted_max: 150000,
            predicted_median: 125000,
            confidence_score: 0.8,
            prediction_method: "test".to_string(),
            data_points_used: 10,
            created_at: Utc::now(),
        };

        let cloned = prediction.clone();
        assert_eq!(prediction.job_hash, cloned.job_hash);
        assert_eq!(prediction.predicted_min, cloned.predicted_min);
    }

    #[test]
    fn test_offer_comparison_clone() {
        let comparison = OfferComparison {
            offer_id: 1,
            company: "Test".to_string(),
            base_salary: 120000,
            total_compensation: 150000,
            market_median: Some(130000),
            market_position: "below_market".to_string(),
            recommendation: "Counter offer".to_string(),
        };

        let cloned = comparison.clone();
        assert_eq!(comparison.offer_id, cloned.offer_id);
        assert_eq!(comparison.company, cloned.company);
    }

    #[test]
    fn test_normalize_job_title_multiple_spaces() {
        let analyzer = create_test_analyzer();

        // Multiple consecutive spaces - only one pass of double-space replacement
        // "Software    Engineer" -> "Software   Engineer" (4 spaces become 3)
        assert_eq!(
            analyzer.normalize_job_title("Software    Engineer"),
            "software  engineer" // One replacement pass leaves double space
        );

        // Three spaces become two
        assert_eq!(
            analyzer.normalize_job_title("Software   Engineer"),
            "software  engineer" // Still has double space
        );

        // Two spaces become one
        assert_eq!(
            analyzer.normalize_job_title("Software  Engineer"),
            "software engineer"
        );
    }

    #[test]
    fn test_normalize_job_title_mixed_case_swe() {
        let analyzer = create_test_analyzer();

        assert_eq!(
            analyzer.normalize_job_title("Senior SWE"),
            "software engineer"
        );
        // After lowercase, "swe" matches and gets replaced with "software engineer"
        // Result contains "software engineer" so returns that
        assert_eq!(
            analyzer.normalize_job_title("sWe Intern"),
            "software engineer"
        );
    }

    #[test]
    fn test_normalize_location_sf_variations() {
        let analyzer = create_test_analyzer();

        // All should normalize to same value
        let locations = vec![
            "SF",
            "sf",
            "San Francisco",
            "san francisco",
            "San Francisco, CA",
            "SAN FRANCISCO, CALIFORNIA",
        ];

        for loc in locations {
            assert_eq!(
                analyzer.normalize_location(loc),
                "san francisco, ca",
                "Failed for location: {}",
                loc
            );
        }
    }

    #[test]
    fn test_seniority_from_title_with_extra_words() {
        // Test titles with extra descriptors
        assert_eq!(
            SeniorityLevel::from_job_title("Senior Backend Software Engineer"),
            SeniorityLevel::Senior
        );
        assert_eq!(
            SeniorityLevel::from_job_title("Principal Machine Learning Engineer"),
            SeniorityLevel::Principal
        );
        assert_eq!(
            SeniorityLevel::from_job_title("Staff Frontend Developer"),
            SeniorityLevel::Staff
        );
        assert_eq!(
            SeniorityLevel::from_job_title("Junior Full Stack Developer"),
            SeniorityLevel::Entry
        );
    }

    // Database-dependent tests using in-memory SQLite
    mod database_tests {
        use super::*;
        use sqlx::sqlite::SqlitePoolOptions;

        // Helper to create test database with schema
        async fn create_test_db() -> SqlitePool {
            let pool = SqlitePoolOptions::new()
                .connect(":memory:")
                .await
                .expect("Failed to create in-memory database");

            // Create jobs table
            sqlx::query(
                r#"
                CREATE TABLE jobs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    hash TEXT NOT NULL UNIQUE,
                    title TEXT NOT NULL,
                    company TEXT NOT NULL,
                    url TEXT NOT NULL,
                    location TEXT,
                    description TEXT,
                    score REAL,
                    source TEXT NOT NULL,
                    remote INTEGER,
                    salary_min INTEGER,
                    salary_max INTEGER,
                    currency TEXT DEFAULT 'USD',
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
                )
                "#,
            )
            .execute(&pool)
            .await
            .expect("Failed to create jobs table");

            // Create salary_benchmarks table
            sqlx::query(
                r#"
                CREATE TABLE salary_benchmarks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    job_title_normalized TEXT NOT NULL,
                    location_normalized TEXT NOT NULL,
                    seniority_level TEXT CHECK(seniority_level IN ('entry', 'mid', 'senior', 'staff', 'principal', 'unknown')),
                    min_salary INTEGER NOT NULL,
                    p25_salary INTEGER NOT NULL,
                    median_salary INTEGER NOT NULL,
                    p75_salary INTEGER NOT NULL,
                    max_salary INTEGER NOT NULL,
                    average_salary INTEGER NOT NULL,
                    sample_size INTEGER NOT NULL,
                    data_source TEXT DEFAULT 'h1b',
                    last_updated TEXT NOT NULL DEFAULT (datetime('now')),
                    created_at TEXT NOT NULL DEFAULT (datetime('now')),
                    UNIQUE(job_title_normalized, location_normalized, seniority_level, data_source)
                )
                "#,
            )
            .execute(&pool)
            .await
            .expect("Failed to create salary_benchmarks table");

            // Create job_salary_predictions table
            sqlx::query(
                r#"
                CREATE TABLE job_salary_predictions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    job_hash TEXT NOT NULL UNIQUE,
                    predicted_min INTEGER,
                    predicted_max INTEGER,
                    predicted_median INTEGER,
                    confidence_score REAL,
                    prediction_method TEXT,
                    data_points_used INTEGER,
                    created_at TEXT NOT NULL DEFAULT (datetime('now'))
                )
                "#,
            )
            .execute(&pool)
            .await
            .expect("Failed to create job_salary_predictions table");

            // Create negotiation_templates table
            sqlx::query(
                r#"
                CREATE TABLE negotiation_templates (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    template_name TEXT NOT NULL,
                    scenario TEXT NOT NULL,
                    template_text TEXT NOT NULL,
                    placeholders TEXT,
                    is_default INTEGER NOT NULL DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
                "#,
            )
            .execute(&pool)
            .await
            .expect("Failed to create negotiation_templates table");

            // Create applications table (for offers)
            sqlx::query(
                r#"
                CREATE TABLE applications (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    job_hash TEXT NOT NULL,
                    status TEXT NOT NULL,
                    applied_at TEXT NOT NULL,
                    FOREIGN KEY(job_hash) REFERENCES jobs(hash)
                )
                "#,
            )
            .execute(&pool)
            .await
            .expect("Failed to create applications table");

            // Create offers table
            sqlx::query(
                r#"
                CREATE TABLE offers (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    application_id INTEGER NOT NULL,
                    base_salary INTEGER,
                    annual_bonus INTEGER,
                    equity_shares INTEGER,
                    received_at TEXT NOT NULL,
                    FOREIGN KEY(application_id) REFERENCES applications(id)
                )
                "#,
            )
            .execute(&pool)
            .await
            .expect("Failed to create offers table");

            pool
        }

        // Insert test benchmark
        async fn insert_benchmark(
            pool: &SqlitePool,
            title: &str,
            location: &str,
            seniority: &str,
            min: i64,
            median: i64,
            p75: i64,
        ) {
            sqlx::query(
                r#"
                INSERT INTO salary_benchmarks (
                    job_title_normalized, location_normalized, seniority_level,
                    min_salary, p25_salary, median_salary, p75_salary, max_salary,
                    average_salary, sample_size
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                "#,
            )
            .bind(title)
            .bind(location)
            .bind(seniority)
            .bind(min)
            .bind((min + median) / 2)
            .bind(median)
            .bind(p75)
            .bind(p75 + 10000)
            .bind((min + median + p75) / 3)
            .bind(100)
            .execute(pool)
            .await
            .expect("Failed to insert benchmark");
        }

        // Insert test job
        async fn insert_job(pool: &SqlitePool, hash: &str, title: &str, location: &str) {
            sqlx::query(
                r#"
                INSERT INTO jobs (hash, title, company, url, location, source)
                VALUES (?, ?, 'Test Company', 'https://example.com', ?, 'test')
                "#,
            )
            .bind(hash)
            .bind(title)
            .bind(location)
            .execute(pool)
            .await
            .expect("Failed to insert job");
        }

        // Insert test template
        async fn insert_template(pool: &SqlitePool, scenario: &str, text: &str) {
            sqlx::query(
                r#"
                INSERT INTO negotiation_templates (template_name, scenario, template_text, placeholders, is_default)
                VALUES (?, ?, ?, '[]', 1)
                "#,
            )
            .bind(scenario)
            .bind(scenario)
            .bind(text)
            .execute(pool)
            .await
            .expect("Failed to insert template");
        }

        #[tokio::test]
        async fn test_salary_analyzer_new() {
            let pool = create_test_db().await;
            let analyzer = SalaryAnalyzer::new(pool);

            // Verify analyzer was created (basic check)
            assert_eq!(
                std::mem::size_of_val(&analyzer),
                std::mem::size_of::<SqlitePool>() * 3 // db + predictor + script_generator each have pool
            );
        }

        #[tokio::test]
        async fn test_predict_salary_for_job() {
            let pool = create_test_db().await;
            insert_job(
                &pool,
                "job123",
                "Senior Software Engineer",
                "San Francisco, CA",
            )
            .await;
            insert_benchmark(
                &pool,
                "software engineer",
                "san francisco, ca",
                "senior",
                150000,
                180000,
                220000,
            )
            .await;

            let analyzer = SalaryAnalyzer::new(pool);
            let result = analyzer.predict_salary_for_job("job123", None).await;

            assert!(result.is_ok());
            let prediction = result.unwrap();
            assert_eq!(prediction.job_hash, "job123");
            assert_eq!(prediction.predicted_min, 150000);
            assert_eq!(prediction.predicted_median, 180000);
            assert_eq!(prediction.predicted_max, 220000);
        }

        #[tokio::test]
        async fn test_predict_salary_for_job_with_experience() {
            let pool = create_test_db().await;
            insert_job(&pool, "job456", "Software Engineer", "New York, NY").await;
            insert_benchmark(
                &pool,
                "software engineer",
                "new york, ny",
                "entry",
                80000,
                100000,
                120000,
            )
            .await;

            let analyzer = SalaryAnalyzer::new(pool);
            // 2 years = Entry level
            let result = analyzer.predict_salary_for_job("job456", Some(2)).await;

            assert!(result.is_ok());
            let prediction = result.unwrap();
            assert_eq!(prediction.predicted_median, 100000);
        }

        #[tokio::test]
        async fn test_predict_salary_for_job_nonexistent() {
            let pool = create_test_db().await;
            let analyzer = SalaryAnalyzer::new(pool);

            let result = analyzer.predict_salary_for_job("nonexistent", None).await;
            assert!(result.is_err());
        }

        #[tokio::test]
        async fn test_get_benchmark_found() {
            let pool = create_test_db().await;
            insert_benchmark(
                &pool,
                "software engineer",
                "san francisco, ca",
                "mid",
                120000,
                150000,
                180000,
            )
            .await;

            let analyzer = SalaryAnalyzer::new(pool);
            let result = analyzer
                .get_benchmark(
                    "Software Engineer",
                    "San Francisco, CA",
                    SeniorityLevel::Mid,
                )
                .await;

            assert!(result.is_ok());
            let benchmark = result.unwrap();
            assert!(benchmark.is_some());

            let bench = benchmark.unwrap();
            assert_eq!(bench.job_title, "software engineer");
            assert_eq!(bench.location, "san francisco, ca");
            assert_eq!(bench.seniority_level, SeniorityLevel::Mid);
            assert_eq!(bench.min_salary, 120000);
            assert_eq!(bench.median_salary, 150000);
            assert_eq!(bench.p75_salary, 180000);
        }

        #[tokio::test]
        async fn test_get_benchmark_not_found() {
            let pool = create_test_db().await;
            let analyzer = SalaryAnalyzer::new(pool);

            let result = analyzer
                .get_benchmark("DevOps Engineer", "Austin, TX", SeniorityLevel::Senior)
                .await;

            assert!(result.is_ok());
            assert!(result.unwrap().is_none());
        }

        #[tokio::test]
        async fn test_get_benchmark_normalizes_inputs() {
            let pool = create_test_db().await;
            insert_benchmark(
                &pool,
                "software engineer",
                "new york, ny",
                "senior",
                140000,
                170000,
                200000,
            )
            .await;

            let analyzer = SalaryAnalyzer::new(pool);
            // Test with variations that should normalize
            let result = analyzer
                .get_benchmark("Sr. SWE", "NYC", SeniorityLevel::Senior)
                .await;

            assert!(result.is_ok());
            let benchmark = result.unwrap();
            assert!(benchmark.is_some());

            let bench = benchmark.unwrap();
            assert_eq!(bench.median_salary, 170000);
        }

        #[tokio::test]
        async fn test_get_benchmark_returns_latest() {
            let pool = create_test_db().await;

            // Insert first benchmark with data_source='h1b'
            insert_benchmark(
                &pool,
                "data scientist",
                "seattle, wa",
                "mid",
                100000,
                120000,
                140000,
            )
            .await;

            // Wait a tiny bit to ensure different timestamp
            tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;

            // Update the same benchmark (same data_source to avoid unique constraint)
            // This simulates a data refresh
            sqlx::query(
                r#"
                UPDATE salary_benchmarks
                SET min_salary = 110000,
                    p25_salary = 125000,
                    median_salary = 130000,
                    p75_salary = 150000,
                    max_salary = 160000,
                    average_salary = 135000,
                    sample_size = 200,
                    last_updated = datetime('now')
                WHERE job_title_normalized = 'data scientist'
                  AND location_normalized = 'seattle, wa'
                  AND seniority_level = 'mid'
                  AND data_source = 'h1b'
                "#,
            )
            .execute(&pool)
            .await
            .expect("Failed to update benchmark");

            let analyzer = SalaryAnalyzer::new(pool);
            let result = analyzer
                .get_benchmark("Data Scientist", "Seattle, WA", SeniorityLevel::Mid)
                .await
                .unwrap()
                .unwrap();

            // Should return the updated data (higher median)
            assert_eq!(result.median_salary, 130000);
            assert_eq!(result.sample_size, 200);
        }

        #[tokio::test]
        async fn test_generate_negotiation_script() {
            let pool = create_test_db().await;
            insert_template(
                &pool,
                "greeting",
                "Hello {{name}}, your offer is {{amount}}.",
            )
            .await;

            let analyzer = SalaryAnalyzer::new(pool);

            let mut params = std::collections::HashMap::new();
            params.insert("name".to_string(), "Alice".to_string());
            params.insert("amount".to_string(), "$150,000".to_string());

            let result = analyzer
                .generate_negotiation_script("greeting", params)
                .await;

            assert!(result.is_ok());
            assert_eq!(result.unwrap(), "Hello Alice, your offer is $150,000.");
        }

        #[tokio::test]
        async fn test_generate_negotiation_script_missing_template() {
            let pool = create_test_db().await;
            let analyzer = SalaryAnalyzer::new(pool);

            let params = std::collections::HashMap::new();
            let result = analyzer
                .generate_negotiation_script("nonexistent", params)
                .await;

            assert!(result.is_err());
        }

        #[tokio::test]
        async fn test_compare_offers_single() {
            let pool = create_test_db().await;

            // Setup: job, application, offer, prediction
            insert_job(&pool, "job_offer1", "Software Engineer", "Seattle, WA").await;

            sqlx::query("INSERT INTO applications (job_hash, status, applied_at) VALUES (?, 'offer', datetime('now'))")
                .bind("job_offer1")
                .execute(&pool)
                .await
                .unwrap();

            sqlx::query(
                "INSERT INTO offers (application_id, base_salary, annual_bonus, received_at) VALUES (1, 140000, 20000, datetime('now'))",
            )
            .execute(&pool)
            .await
            .unwrap();

            // Insert prediction
            sqlx::query(
                r#"
                INSERT INTO job_salary_predictions (job_hash, predicted_min, predicted_max, predicted_median, confidence_score, prediction_method, data_points_used)
                VALUES (?, 120000, 180000, 150000, 0.85, 'h1b_match', 50)
                "#,
            )
            .bind("job_offer1")
            .execute(&pool)
            .await
            .unwrap();

            let analyzer = SalaryAnalyzer::new(pool);
            let result = analyzer.compare_offers(vec![1]).await;

            assert!(result.is_ok());
            let comparisons = result.unwrap();
            assert_eq!(comparisons.len(), 1);

            let comp = &comparisons[0];
            assert_eq!(comp.offer_id, 1);
            assert_eq!(comp.company, "Test Company");
            assert_eq!(comp.base_salary, 140000);
            assert_eq!(comp.total_compensation, 160000); // 140000 + 20000
            assert_eq!(comp.market_median, Some(150000));
            assert_eq!(comp.market_position, "below_market"); // 140000 < 150000
            assert!(comp.recommendation.contains("Counter with"));
        }

        #[tokio::test]
        async fn test_compare_offers_multiple() {
            let pool = create_test_db().await;

            // First offer
            insert_job(&pool, "job1", "Data Scientist", "Boston, MA").await;
            sqlx::query("INSERT INTO applications (job_hash, status, applied_at) VALUES (?, 'offer', datetime('now'))")
                .bind("job1")
                .execute(&pool)
                .await
                .unwrap();
            sqlx::query(
                "INSERT INTO offers (application_id, base_salary, annual_bonus, received_at) VALUES (1, 130000, 15000, datetime('now'))",
            )
            .execute(&pool)
            .await
            .unwrap();
            sqlx::query(
                "INSERT INTO job_salary_predictions (job_hash, predicted_min, predicted_max, predicted_median, confidence_score, prediction_method, data_points_used) VALUES (?, 110000, 160000, 135000, 0.8, 'h1b_match', 40)",
            )
            .bind("job1")
            .execute(&pool)
            .await
            .unwrap();

            // Second offer
            insert_job(&pool, "job2", "Product Manager", "Denver, CO").await;
            sqlx::query("INSERT INTO applications (job_hash, status, applied_at) VALUES (?, 'offer', datetime('now'))")
                .bind("job2")
                .execute(&pool)
                .await
                .unwrap();
            sqlx::query(
                "INSERT INTO offers (application_id, base_salary, annual_bonus, received_at) VALUES (2, 150000, 25000, datetime('now'))",
            )
            .execute(&pool)
            .await
            .unwrap();
            sqlx::query(
                "INSERT INTO job_salary_predictions (job_hash, predicted_min, predicted_max, predicted_median, confidence_score, prediction_method, data_points_used) VALUES (?, 120000, 170000, 145000, 0.75, 'h1b_average', 30)",
            )
            .bind("job2")
            .execute(&pool)
            .await
            .unwrap();

            let analyzer = SalaryAnalyzer::new(pool);
            let result = analyzer.compare_offers(vec![1, 2]).await;

            assert!(result.is_ok());
            let comparisons = result.unwrap();
            assert_eq!(comparisons.len(), 2);

            // First offer: 130000 < 135000 (median) = below_market
            assert_eq!(comparisons[0].market_position, "below_market");

            // Second offer: 150000 > 145000 (median) but < 170000 (max) = at_market
            assert_eq!(comparisons[1].market_position, "at_market");
        }

        #[tokio::test]
        async fn test_compare_offers_above_market() {
            let pool = create_test_db().await;

            insert_job(&pool, "job_great", "Software Engineer", "Remote").await;
            sqlx::query("INSERT INTO applications (job_hash, status, applied_at) VALUES (?, 'offer', datetime('now'))")
                .bind("job_great")
                .execute(&pool)
                .await
                .unwrap();
            sqlx::query(
                "INSERT INTO offers (application_id, base_salary, annual_bonus, received_at) VALUES (1, 200000, 30000, datetime('now'))",
            )
            .execute(&pool)
            .await
            .unwrap();
            sqlx::query(
                "INSERT INTO job_salary_predictions (job_hash, predicted_min, predicted_max, predicted_median, confidence_score, prediction_method, data_points_used) VALUES (?, 120000, 180000, 150000, 0.9, 'h1b_match', 100)",
            )
            .bind("job_great")
            .execute(&pool)
            .await
            .unwrap();

            let analyzer = SalaryAnalyzer::new(pool);
            let result = analyzer.compare_offers(vec![1]).await.unwrap();

            // 200000 >= 180000 (max) = above_market
            assert_eq!(result[0].market_position, "above_market");
            assert_eq!(
                result[0].recommendation,
                "Excellent offer! Accept or negotiate equity."
            );
        }

        #[tokio::test]
        async fn test_compare_offers_no_prediction() {
            let pool = create_test_db().await;

            insert_job(&pool, "job_unknown", "Blockchain Engineer", "Miami, FL").await;
            sqlx::query("INSERT INTO applications (job_hash, status, applied_at) VALUES (?, 'offer', datetime('now'))")
                .bind("job_unknown")
                .execute(&pool)
                .await
                .unwrap();
            sqlx::query(
                "INSERT INTO offers (application_id, base_salary, annual_bonus, received_at) VALUES (1, 160000, 20000, datetime('now'))",
            )
            .execute(&pool)
            .await
            .unwrap();
            // No prediction inserted

            let analyzer = SalaryAnalyzer::new(pool);
            let result = analyzer.compare_offers(vec![1]).await.unwrap();

            assert_eq!(result[0].market_median, None);
            assert_eq!(result[0].market_position, "unknown");
            assert_eq!(
                result[0].recommendation,
                "Insufficient data for recommendation."
            );
        }

        #[tokio::test]
        async fn test_compare_offers_empty_list() {
            let pool = create_test_db().await;
            let analyzer = SalaryAnalyzer::new(pool);

            let result = analyzer.compare_offers(vec![]).await;

            assert!(result.is_ok());
            assert_eq!(result.unwrap().len(), 0);
        }

        #[tokio::test]
        async fn test_compare_offers_nonexistent_offer() {
            let pool = create_test_db().await;
            let analyzer = SalaryAnalyzer::new(pool);

            let result = analyzer.compare_offers(vec![999]).await;

            assert!(result.is_err());
        }

        #[tokio::test]
        async fn test_compare_offers_null_bonus() {
            let pool = create_test_db().await;

            insert_job(&pool, "job_null", "Engineer", "Chicago, IL").await;
            sqlx::query("INSERT INTO applications (job_hash, status, applied_at) VALUES (?, 'offer', datetime('now'))")
                .bind("job_null")
                .execute(&pool)
                .await
                .unwrap();
            // Insert offer with NULL bonus
            sqlx::query(
                "INSERT INTO offers (application_id, base_salary, annual_bonus, received_at) VALUES (1, 130000, NULL, datetime('now'))",
            )
            .execute(&pool)
            .await
            .unwrap();
            sqlx::query(
                "INSERT INTO job_salary_predictions (job_hash, predicted_min, predicted_max, predicted_median, confidence_score, prediction_method, data_points_used) VALUES (?, 100000, 150000, 125000, 0.7, 'default', 0)",
            )
            .bind("job_null")
            .execute(&pool)
            .await
            .unwrap();

            let analyzer = SalaryAnalyzer::new(pool);
            let result = analyzer.compare_offers(vec![1]).await.unwrap();

            // Total comp should be 130000 + 0
            assert_eq!(result[0].total_compensation, 130000);
        }

        #[tokio::test]
        async fn test_compare_offers_calculates_total_comp() {
            let pool = create_test_db().await;

            insert_job(&pool, "job_comp", "Engineer", "LA, CA").await;
            sqlx::query("INSERT INTO applications (job_hash, status, applied_at) VALUES (?, 'offer', datetime('now'))")
                .bind("job_comp")
                .execute(&pool)
                .await
                .unwrap();
            sqlx::query(
                "INSERT INTO offers (application_id, base_salary, annual_bonus, received_at) VALUES (1, 120000, 30000, datetime('now'))",
            )
            .execute(&pool)
            .await
            .unwrap();
            sqlx::query(
                "INSERT INTO job_salary_predictions (job_hash, predicted_min, predicted_max, predicted_median, confidence_score, prediction_method, data_points_used) VALUES (?, 100000, 160000, 130000, 0.75, 'h1b_match', 50)",
            )
            .bind("job_comp")
            .execute(&pool)
            .await
            .unwrap();

            let analyzer = SalaryAnalyzer::new(pool);
            let result = analyzer.compare_offers(vec![1]).await.unwrap();

            assert_eq!(result[0].base_salary, 120000);
            assert_eq!(result[0].total_compensation, 150000); // 120000 + 30000
        }

        #[tokio::test]
        async fn test_compare_offers_market_position_at_median() {
            let pool = create_test_db().await;

            insert_job(&pool, "job_exact", "Developer", "Portland, OR").await;
            sqlx::query("INSERT INTO applications (job_hash, status, applied_at) VALUES (?, 'offer', datetime('now'))")
                .bind("job_exact")
                .execute(&pool)
                .await
                .unwrap();
            // Base salary exactly at median
            sqlx::query(
                "INSERT INTO offers (application_id, base_salary, annual_bonus, received_at) VALUES (1, 150000, 10000, datetime('now'))",
            )
            .execute(&pool)
            .await
            .unwrap();
            sqlx::query(
                "INSERT INTO job_salary_predictions (job_hash, predicted_min, predicted_max, predicted_median, confidence_score, prediction_method, data_points_used) VALUES (?, 120000, 180000, 150000, 0.85, 'h1b_match', 60)",
            )
            .bind("job_exact")
            .execute(&pool)
            .await
            .unwrap();

            let analyzer = SalaryAnalyzer::new(pool);
            let result = analyzer.compare_offers(vec![1]).await.unwrap();

            // 150000 >= 150000 (median) but < 180000 (max) = at_market
            assert_eq!(result[0].market_position, "at_market");
            assert_eq!(
                result[0].recommendation,
                "Fair offer. Consider negotiating for 10-15% more."
            );
        }

        #[tokio::test]
        async fn test_compare_offers_market_position_at_max() {
            let pool = create_test_db().await;

            insert_job(&pool, "job_max", "Engineer", "Austin, TX").await;
            sqlx::query("INSERT INTO applications (job_hash, status, applied_at) VALUES (?, 'offer', datetime('now'))")
                .bind("job_max")
                .execute(&pool)
                .await
                .unwrap();
            // Base salary exactly at max
            sqlx::query(
                "INSERT INTO offers (application_id, base_salary, annual_bonus, received_at) VALUES (1, 200000, 15000, datetime('now'))",
            )
            .execute(&pool)
            .await
            .unwrap();
            sqlx::query(
                "INSERT INTO job_salary_predictions (job_hash, predicted_min, predicted_max, predicted_median, confidence_score, prediction_method, data_points_used) VALUES (?, 140000, 200000, 170000, 0.9, 'h1b_match', 80)",
            )
            .bind("job_max")
            .execute(&pool)
            .await
            .unwrap();

            let analyzer = SalaryAnalyzer::new(pool);
            let result = analyzer.compare_offers(vec![1]).await.unwrap();

            // 200000 >= 200000 (max) = above_market
            assert_eq!(result[0].market_position, "above_market");
        }
    }
}
