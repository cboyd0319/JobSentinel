//! Salary Benchmarks
//!
//! Manages salary benchmark data from H1B database and user reports.

use super::SeniorityLevel;
use anyhow::Result;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{Row, SqlitePool};

/// Salary benchmark data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SalaryBenchmark {
    pub job_title: String,
    pub location: String,
    pub seniority_level: SeniorityLevel,
    pub min_salary: i64,
    pub p25_salary: i64,    // 25th percentile
    pub median_salary: i64,  // 50th percentile
    pub p75_salary: i64,     // 75th percentile
    pub max_salary: i64,
    pub average_salary: i64,
    pub sample_size: i64,
    pub last_updated: DateTime<Utc>,
}

impl SalaryBenchmark {
    /// Get salary range description
    pub fn range_description(&self) -> String {
        format!(
            "${}-${} (median: ${})",
            Self::format_salary(self.min_salary),
            Self::format_salary(self.max_salary),
            Self::format_salary(self.median_salary)
        )
    }

    /// Format salary with commas
    fn format_salary(amount: i64) -> String {
        let s = amount.to_string();
        let mut result = String::new();
        for (i, c) in s.chars().rev().enumerate() {
            if i > 0 && i % 3 == 0 {
                result.insert(0, ',');
            }
            result.insert(0, c);
        }
        result
    }

    /// Check if salary is competitive
    pub fn is_competitive(&self, offered_salary: i64) -> &'static str {
        if offered_salary >= self.p75_salary {
            "excellent"
        } else if offered_salary >= self.median_salary {
            "competitive"
        } else if offered_salary >= self.p25_salary {
            "fair"
        } else {
            "below_market"
        }
    }

    /// Get negotiation recommendation
    pub fn negotiation_target(&self, current_offer: i64) -> i64 {
        if current_offer < self.median_salary {
            // Aim for median
            self.median_salary
        } else if current_offer < self.p75_salary {
            // Aim for 75th percentile
            self.p75_salary
        } else {
            // Already great, maybe push 5% higher
            (current_offer as f64 * 1.05) as i64
        }
    }
}

/// Benchmark manager
pub struct BenchmarkManager {
    db: SqlitePool,
}

impl BenchmarkManager {
    pub fn new(db: SqlitePool) -> Self {
        Self { db }
    }

    /// Upsert salary benchmark
    pub async fn upsert_benchmark(&self, benchmark: &SalaryBenchmark) -> Result<()> {
        let seniority_str = benchmark.seniority_level.as_str();

        sqlx::query(
            r#"
            INSERT INTO salary_benchmarks (
                job_title_normalized, location_normalized, seniority_level,
                min_salary, p25_salary, median_salary, p75_salary,
                max_salary, average_salary, sample_size, data_source,
                last_updated
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'h1b', datetime('now'))
            ON CONFLICT(job_title_normalized, location_normalized, seniority_level, data_source)
            DO UPDATE SET
                min_salary = excluded.min_salary,
                p25_salary = excluded.p25_salary,
                median_salary = excluded.median_salary,
                p75_salary = excluded.p75_salary,
                max_salary = excluded.max_salary,
                average_salary = excluded.average_salary,
                sample_size = excluded.sample_size,
                last_updated = datetime('now')
            "#,
        )
        .bind(&benchmark.job_title)
        .bind(&benchmark.location)
        .bind(seniority_str)
        .bind(benchmark.min_salary)
        .bind(benchmark.p25_salary)
        .bind(benchmark.median_salary)
        .bind(benchmark.p75_salary)
        .bind(benchmark.max_salary)
        .bind(benchmark.average_salary)
        .bind(benchmark.sample_size)
        .execute(&self.db)
        .await?;

        Ok(())
    }

    /// Get all benchmarks for a job title
    pub async fn get_benchmarks_for_title(&self, job_title: &str) -> Result<Vec<SalaryBenchmark>> {
        let rows = sqlx::query(
            r#"
            SELECT job_title_normalized, location_normalized, seniority_level,
                   min_salary, p25_salary, median_salary, p75_salary,
                   max_salary, average_salary, sample_size, last_updated
            FROM salary_benchmarks
            WHERE job_title_normalized LIKE ?
            ORDER BY sample_size DESC
            LIMIT 50
            "#,
        )
        .bind(format!("%{}%", job_title.to_lowercase()))
        .fetch_all(&self.db)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| SalaryBenchmark {
                job_title: r.try_get::<String, _>("job_title_normalized").unwrap_or_default(),
                location: r.try_get::<String, _>("location_normalized").unwrap_or_default(),
                seniority_level: SeniorityLevel::parse(
                    &r.try_get::<String, _>("seniority_level").unwrap_or_default(),
                ),
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
            })
            .collect())
    }

    /// Get top paying locations for a job title
    pub async fn get_top_paying_locations(
        &self,
        job_title: &str,
        limit: usize,
    ) -> Result<Vec<(String, i64)>> {
        let rows = sqlx::query(
            r#"
            SELECT location_normalized, median_salary
            FROM salary_benchmarks
            WHERE job_title_normalized = ?
            ORDER BY median_salary DESC
            LIMIT ?
            "#,
        )
        .bind(job_title)
        .bind(limit as i64)
        .fetch_all(&self.db)
        .await?;

        Ok(rows
            .into_iter()
            .map(|r| {
                (
                    r.try_get::<String, _>("location_normalized").unwrap_or_default(),
                    r.try_get::<i64, _>("median_salary").unwrap_or(0),
                )
            })
            .collect())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_salary_formatting() {
        assert_eq!(SalaryBenchmark::format_salary(150000), "150,000");
        assert_eq!(SalaryBenchmark::format_salary(1500000), "1,500,000");
        assert_eq!(SalaryBenchmark::format_salary(50000), "50,000");
    }

    #[test]
    fn test_salary_formatting_edge_cases() {
        assert_eq!(SalaryBenchmark::format_salary(0), "0");
        assert_eq!(SalaryBenchmark::format_salary(1), "1");
        assert_eq!(SalaryBenchmark::format_salary(100), "100");
        assert_eq!(SalaryBenchmark::format_salary(1000), "1,000");
        assert_eq!(SalaryBenchmark::format_salary(10000), "10,000");
        assert_eq!(SalaryBenchmark::format_salary(100000), "100,000");
        assert_eq!(SalaryBenchmark::format_salary(1000000), "1,000,000");
    }

    #[test]
    fn test_range_description() {
        let benchmark = create_test_benchmark();
        let description = benchmark.range_description();
        assert_eq!(description, "$100,000-$250,000 (median: $150,000)");
    }

    #[test]
    fn test_competitiveness_check() {
        let benchmark = SalaryBenchmark {
            job_title: "Software Engineer".to_string(),
            location: "San Francisco, CA".to_string(),
            seniority_level: SeniorityLevel::Mid,
            min_salary: 100000,
            p25_salary: 120000,
            median_salary: 150000,
            p75_salary: 180000,
            max_salary: 250000,
            average_salary: 155000,
            sample_size: 500,
            last_updated: Utc::now(),
        };

        assert_eq!(benchmark.is_competitive(190000), "excellent");
        assert_eq!(benchmark.is_competitive(160000), "competitive");
        assert_eq!(benchmark.is_competitive(130000), "fair");
        assert_eq!(benchmark.is_competitive(110000), "below_market");
    }

    #[test]
    fn test_competitiveness_boundary_conditions() {
        let benchmark = create_test_benchmark();

        // Exactly at boundaries
        assert_eq!(benchmark.is_competitive(180000), "excellent"); // p75
        assert_eq!(benchmark.is_competitive(150000), "competitive"); // median
        assert_eq!(benchmark.is_competitive(120000), "fair"); // p25
        assert_eq!(benchmark.is_competitive(100000), "below_market"); // min

        // Just above boundaries
        assert_eq!(benchmark.is_competitive(180001), "excellent");
        assert_eq!(benchmark.is_competitive(150001), "competitive");
        assert_eq!(benchmark.is_competitive(120001), "fair");

        // Just below boundaries
        assert_eq!(benchmark.is_competitive(179999), "competitive");
        assert_eq!(benchmark.is_competitive(149999), "fair");
        assert_eq!(benchmark.is_competitive(119999), "below_market");
    }

    #[test]
    fn test_competitiveness_extreme_values() {
        let benchmark = create_test_benchmark();

        // Way above market
        assert_eq!(benchmark.is_competitive(500000), "excellent");

        // Way below market
        assert_eq!(benchmark.is_competitive(50000), "below_market");
    }

    #[test]
    fn test_negotiation_target() {
        let benchmark = SalaryBenchmark {
            job_title: "Software Engineer".to_string(),
            location: "San Francisco, CA".to_string(),
            seniority_level: SeniorityLevel::Mid,
            min_salary: 100000,
            p25_salary: 120000,
            median_salary: 150000,
            p75_salary: 180000,
            max_salary: 250000,
            average_salary: 155000,
            sample_size: 500,
            last_updated: Utc::now(),
        };

        // Below median - aim for median
        assert_eq!(benchmark.negotiation_target(130000), 150000);

        // At median - aim for p75
        assert_eq!(benchmark.negotiation_target(150000), 180000);

        // Above p75 - push 5% higher
        assert_eq!(benchmark.negotiation_target(200000), 210000);
    }

    #[test]
    fn test_negotiation_target_edge_cases() {
        let benchmark = create_test_benchmark();

        // Exactly at median
        assert_eq!(benchmark.negotiation_target(150000), 180000);

        // Just below median
        assert_eq!(benchmark.negotiation_target(149999), 150000);

        // Exactly at p75
        assert_eq!(benchmark.negotiation_target(180000), 189000); // 5% of 180000 = 189000

        // Just below p75
        assert_eq!(benchmark.negotiation_target(179999), 180000);

        // Very low offer
        assert_eq!(benchmark.negotiation_target(80000), 150000);
    }

    #[test]
    fn test_negotiation_target_5_percent_calculation() {
        let benchmark = create_test_benchmark();

        // Above p75 - should push 5% higher
        let current = 200000;
        let expected = (current as f64 * 1.05) as i64;
        assert_eq!(benchmark.negotiation_target(current), expected);
        assert_eq!(benchmark.negotiation_target(200000), 210000);

        let current = 250000;
        let expected = (current as f64 * 1.05) as i64;
        assert_eq!(benchmark.negotiation_target(current), expected);
        assert_eq!(benchmark.negotiation_target(250000), 262500);
    }

    #[test]
    fn test_different_seniority_levels() {
        for seniority in [
            SeniorityLevel::Entry,
            SeniorityLevel::Mid,
            SeniorityLevel::Senior,
            SeniorityLevel::Staff,
            SeniorityLevel::Principal,
            SeniorityLevel::Unknown,
        ] {
            let benchmark = SalaryBenchmark {
                job_title: "Software Engineer".to_string(),
                location: "San Francisco, CA".to_string(),
                seniority_level: seniority,
                min_salary: 100000,
                p25_salary: 120000,
                median_salary: 150000,
                p75_salary: 180000,
                max_salary: 250000,
                average_salary: 155000,
                sample_size: 500,
                last_updated: Utc::now(),
            };

            // Just verify it works for all seniority levels
            assert_eq!(benchmark.is_competitive(160000), "competitive");
        }
    }

    // Helper function to create a standard test benchmark
    fn create_test_benchmark() -> SalaryBenchmark {
        SalaryBenchmark {
            job_title: "Software Engineer".to_string(),
            location: "San Francisco, CA".to_string(),
            seniority_level: SeniorityLevel::Mid,
            min_salary: 100000,
            p25_salary: 120000,
            median_salary: 150000,
            p75_salary: 180000,
            max_salary: 250000,
            average_salary: 155000,
            sample_size: 500,
            last_updated: Utc::now(),
        }
    }

    #[test]
    fn test_format_salary_with_zero() {
        assert_eq!(SalaryBenchmark::format_salary(0), "0");
    }

    #[test]
    fn test_format_salary_single_digit() {
        assert_eq!(SalaryBenchmark::format_salary(5), "5");
    }

    #[test]
    fn test_format_salary_two_digits() {
        assert_eq!(SalaryBenchmark::format_salary(42), "42");
    }

    #[test]
    fn test_format_salary_three_digits() {
        assert_eq!(SalaryBenchmark::format_salary(999), "999");
    }

    #[test]
    fn test_format_salary_large_values() {
        assert_eq!(SalaryBenchmark::format_salary(10000000), "10,000,000");
        assert_eq!(SalaryBenchmark::format_salary(999999999), "999,999,999");
    }

    #[test]
    fn test_range_description_with_zero_values() {
        let benchmark = SalaryBenchmark {
            job_title: "Intern".to_string(),
            location: "Remote".to_string(),
            seniority_level: SeniorityLevel::Entry,
            min_salary: 0,
            p25_salary: 0,
            median_salary: 0,
            p75_salary: 0,
            max_salary: 0,
            average_salary: 0,
            sample_size: 1,
            last_updated: Utc::now(),
        };
        assert_eq!(benchmark.range_description(), "$0-$0 (median: $0)");
    }

    #[test]
    fn test_range_description_with_small_values() {
        let benchmark = SalaryBenchmark {
            job_title: "Junior".to_string(),
            location: "Small Town".to_string(),
            seniority_level: SeniorityLevel::Entry,
            min_salary: 500,
            p25_salary: 750,
            median_salary: 1000,
            p75_salary: 1500,
            max_salary: 2000,
            average_salary: 1100,
            sample_size: 10,
            last_updated: Utc::now(),
        };
        assert_eq!(benchmark.range_description(), "$500-$2,000 (median: $1,000)");
    }

    #[test]
    fn test_is_competitive_with_zero_offer() {
        let benchmark = create_test_benchmark();
        assert_eq!(benchmark.is_competitive(0), "below_market");
    }

    #[test]
    fn test_is_competitive_with_zero_benchmarks() {
        let benchmark = SalaryBenchmark {
            job_title: "Test".to_string(),
            location: "Test".to_string(),
            seniority_level: SeniorityLevel::Mid,
            min_salary: 0,
            p25_salary: 0,
            median_salary: 0,
            p75_salary: 0,
            max_salary: 0,
            average_salary: 0,
            sample_size: 0,
            last_updated: Utc::now(),
        };
        // Any positive offer is excellent when benchmarks are zero
        assert_eq!(benchmark.is_competitive(50000), "excellent");
        assert_eq!(benchmark.is_competitive(0), "excellent");
    }

    #[test]
    fn test_negotiation_target_with_zero_offer() {
        let benchmark = create_test_benchmark();
        assert_eq!(benchmark.negotiation_target(0), 150000); // Should aim for median
    }

    #[test]
    fn test_negotiation_target_with_zero_benchmarks() {
        let benchmark = SalaryBenchmark {
            job_title: "Test".to_string(),
            location: "Test".to_string(),
            seniority_level: SeniorityLevel::Mid,
            min_salary: 0,
            p25_salary: 0,
            median_salary: 0,
            p75_salary: 0,
            max_salary: 0,
            average_salary: 0,
            sample_size: 0,
            last_updated: Utc::now(),
        };
        // When all benchmarks are 0, offer >= p75 (0), so push 5% higher
        assert_eq!(benchmark.negotiation_target(50000), 52500); // 50000 * 1.05
    }

    #[test]
    fn test_negotiation_target_very_high_offer() {
        let benchmark = create_test_benchmark();
        // Extremely high offer should still get 5% bump
        let offer = 1000000;
        let expected = (offer as f64 * 1.05) as i64;
        assert_eq!(benchmark.negotiation_target(offer), expected);
        assert_eq!(benchmark.negotiation_target(1000000), 1050000);
    }

    #[test]
    fn test_negotiation_target_rounding() {
        let benchmark = create_test_benchmark();
        // Test that 5% calculation rounds correctly
        assert_eq!(benchmark.negotiation_target(181000), 190050); // 181000 * 1.05 = 190050
        assert_eq!(benchmark.negotiation_target(199999), 209998); // 199999 * 1.05 = 209998.95 -> 209998
    }

    #[test]
    fn test_all_percentiles_equal() {
        let benchmark = SalaryBenchmark {
            job_title: "Unique Role".to_string(),
            location: "Nowhere".to_string(),
            seniority_level: SeniorityLevel::Mid,
            min_salary: 100000,
            p25_salary: 100000,
            median_salary: 100000,
            p75_salary: 100000,
            max_salary: 100000,
            average_salary: 100000,
            sample_size: 1,
            last_updated: Utc::now(),
        };

        // All salaries are the same
        assert_eq!(benchmark.is_competitive(100000), "excellent");
        assert_eq!(benchmark.is_competitive(99999), "below_market");
        assert_eq!(benchmark.is_competitive(100001), "excellent");
        assert_eq!(benchmark.negotiation_target(100000), 105000); // 5% bump
    }

    #[test]
    fn test_inverted_percentiles() {
        // This shouldn't happen in practice, but test defensive behavior
        // With inverted data: min=250k, p25=200k, median=150k, p75=100k, max=50k
        let benchmark = SalaryBenchmark {
            job_title: "Bad Data".to_string(),
            location: "Nowhere".to_string(),
            seniority_level: SeniorityLevel::Mid,
            min_salary: 250000,
            p25_salary: 200000,
            median_salary: 150000,
            p75_salary: 100000,
            max_salary: 50000,
            average_salary: 150000,
            sample_size: 10,
            last_updated: Utc::now(),
        };

        // Logic still works based on >= comparisons (even with inverted data)
        // 120000 >= 100000 (p75) -> excellent
        // 160000 >= 100000 (p75) -> excellent
        // 250000 >= 100000 (p75) -> excellent
        // 90000 < 100000, 90000 < 150000, 90000 < 200000 -> below_market
        assert_eq!(benchmark.is_competitive(120000), "excellent");
        assert_eq!(benchmark.is_competitive(160000), "excellent");
        assert_eq!(benchmark.is_competitive(250000), "excellent");
        assert_eq!(benchmark.is_competitive(90000), "below_market");
    }

    #[test]
    fn test_sample_size_zero() {
        let benchmark = SalaryBenchmark {
            job_title: "No Data".to_string(),
            location: "Unknown".to_string(),
            seniority_level: SeniorityLevel::Unknown,
            min_salary: 0,
            p25_salary: 0,
            median_salary: 0,
            p75_salary: 0,
            max_salary: 0,
            average_salary: 0,
            sample_size: 0,
            last_updated: Utc::now(),
        };

        // Should handle zero sample size without panic
        assert_eq!(benchmark.range_description(), "$0-$0 (median: $0)");
        assert_eq!(benchmark.is_competitive(50000), "excellent");
        assert_eq!(benchmark.negotiation_target(50000), 52500); // 50000 * 1.05
    }

    #[test]
    fn test_entry_level_benchmarks() {
        let benchmark = SalaryBenchmark {
            job_title: "Junior Developer".to_string(),
            location: "Austin, TX".to_string(),
            seniority_level: SeniorityLevel::Entry,
            min_salary: 50000,
            p25_salary: 60000,
            median_salary: 70000,
            p75_salary: 80000,
            max_salary: 90000,
            average_salary: 72000,
            sample_size: 200,
            last_updated: Utc::now(),
        };

        assert_eq!(benchmark.is_competitive(85000), "excellent");
        assert_eq!(benchmark.is_competitive(75000), "competitive");
        assert_eq!(benchmark.is_competitive(65000), "fair");
        assert_eq!(benchmark.is_competitive(55000), "below_market");

        assert_eq!(benchmark.negotiation_target(65000), 70000); // Below median -> median
        assert_eq!(benchmark.negotiation_target(75000), 80000); // Between median and p75 -> p75
        assert_eq!(benchmark.negotiation_target(85000), 89250); // Above p75 -> 5% bump
    }

    #[test]
    fn test_principal_level_benchmarks() {
        let benchmark = SalaryBenchmark {
            job_title: "Principal Engineer".to_string(),
            location: "Seattle, WA".to_string(),
            seniority_level: SeniorityLevel::Principal,
            min_salary: 200000,
            p25_salary: 250000,
            median_salary: 300000,
            p75_salary: 350000,
            max_salary: 500000,
            average_salary: 320000,
            sample_size: 100,
            last_updated: Utc::now(),
        };

        assert_eq!(benchmark.is_competitive(400000), "excellent");
        assert_eq!(benchmark.is_competitive(320000), "competitive");
        assert_eq!(benchmark.is_competitive(260000), "fair");
        assert_eq!(benchmark.is_competitive(220000), "below_market");

        assert_eq!(benchmark.negotiation_target(280000), 300000);
        assert_eq!(benchmark.negotiation_target(320000), 350000);
        assert_eq!(benchmark.negotiation_target(400000), 420000);
    }

    #[test]
    fn test_range_description_formatting_consistency() {
        let benchmark = create_test_benchmark();
        let desc = benchmark.range_description();

        // Verify format structure
        assert!(desc.starts_with('$'));
        assert!(desc.contains('-'));
        assert!(desc.contains("(median: $"));
        assert!(desc.ends_with(')'));

        // Verify no extra spaces
        assert!(!desc.contains("  "));
    }

    #[test]
    fn test_competitiveness_at_exact_percentiles() {
        let benchmark = create_test_benchmark();

        // Test exact matches at each percentile boundary
        assert_eq!(benchmark.is_competitive(benchmark.p75_salary), "excellent");
        assert_eq!(benchmark.is_competitive(benchmark.median_salary), "competitive");
        assert_eq!(benchmark.is_competitive(benchmark.p25_salary), "fair");
        assert_eq!(benchmark.is_competitive(benchmark.min_salary), "below_market");
    }

    #[test]
    fn test_negotiation_incremental_offers() {
        let benchmark = create_test_benchmark();

        // Test a range of offers to ensure monotonic behavior
        let offers = vec![90000, 110000, 130000, 150000, 170000, 190000, 210000];

        for offer in offers {
            let target = benchmark.negotiation_target(offer);
            // Target should generally increase (or stay same if already at max strategy)
            assert!(target >= offer, "Negotiation target should be at least the current offer");
        }
    }

    #[test]
    fn test_different_locations_same_title() {
        let sf_benchmark = SalaryBenchmark {
            job_title: "Software Engineer".to_string(),
            location: "San Francisco, CA".to_string(),
            seniority_level: SeniorityLevel::Mid,
            min_salary: 140000,
            p25_salary: 160000,
            median_salary: 180000,
            p75_salary: 220000,
            max_salary: 300000,
            average_salary: 190000,
            sample_size: 1000,
            last_updated: Utc::now(),
        };

        let austin_benchmark = SalaryBenchmark {
            job_title: "Software Engineer".to_string(),
            location: "Austin, TX".to_string(),
            seniority_level: SeniorityLevel::Mid,
            min_salary: 90000,
            p25_salary: 110000,
            median_salary: 130000,
            p75_salary: 150000,
            max_salary: 200000,
            average_salary: 135000,
            sample_size: 500,
            last_updated: Utc::now(),
        };

        // Same offer, different competitiveness based on location
        let offer = 140000;
        assert_eq!(sf_benchmark.is_competitive(offer), "below_market");
        assert_eq!(austin_benchmark.is_competitive(offer), "competitive");
    }
}
