//! Salary Benchmarks
//!
//! Manages salary benchmark data from H1B database and user reports.

use super::SeniorityLevel;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Salary benchmark data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SalaryBenchmark {
    pub job_title: String,
    pub location: String,
    pub seniority_level: SeniorityLevel,
    pub min_salary: i64,
    pub p25_salary: i64,    // 25th percentile
    pub median_salary: i64, // 50th percentile
    pub p75_salary: i64,    // 75th percentile
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

#[cfg(test)]
#[path = "benchmarks_tests.rs"]
mod tests;
