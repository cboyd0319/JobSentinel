//! Scoring Configuration
//!
//! User-configurable scoring weights for job matching.

use serde::{Deserialize, Serialize};

/// Scoring weight configuration
///
/// All weights should be in range [0.0, 1.0] and sum to approximately 1.0
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoringConfig {
    /// Skills match weight (default: 0.40)
    pub skills_weight: f64,

    /// Salary match weight (default: 0.25)
    pub salary_weight: f64,

    /// Location match weight (default: 0.20)
    pub location_weight: f64,

    /// Company preference weight (default: 0.10)
    pub company_weight: f64,

    /// Job recency weight (default: 0.05)
    pub recency_weight: f64,
}

impl Default for ScoringConfig {
    fn default() -> Self {
        Self {
            skills_weight: 0.40,
            salary_weight: 0.25,
            location_weight: 0.20,
            company_weight: 0.10,
            recency_weight: 0.05,
        }
    }
}

impl ScoringConfig {
    /// Tolerance for weight sum validation (±0.01)
    pub const WEIGHT_SUM_TOLERANCE: f64 = 0.01;

    /// Expected weight sum (1.0)
    pub const EXPECTED_WEIGHT_SUM: f64 = 1.0;

    /// Validate that weights sum to approximately 1.0
    ///
    /// Returns an error if the sum is outside the acceptable range.
    pub fn validate(&self) -> Result<(), String> {
        // Check all weights are non-negative
        if self.skills_weight < 0.0
            || self.salary_weight < 0.0
            || self.location_weight < 0.0
            || self.company_weight < 0.0
            || self.recency_weight < 0.0
        {
            return Err("All weights must be non-negative".to_string());
        }

        // Check all weights are at most 1.0
        if self.skills_weight > 1.0
            || self.salary_weight > 1.0
            || self.location_weight > 1.0
            || self.company_weight > 1.0
            || self.recency_weight > 1.0
        {
            return Err("All weights must be at most 1.0".to_string());
        }

        // Calculate sum
        let sum = self.skills_weight
            + self.salary_weight
            + self.location_weight
            + self.company_weight
            + self.recency_weight;

        // Check sum is approximately 1.0
        let diff = (sum - Self::EXPECTED_WEIGHT_SUM).abs();
        if diff > Self::WEIGHT_SUM_TOLERANCE {
            return Err(format!(
                "Weights must sum to approximately {} (got {:.4}, diff: {:.4})",
                Self::EXPECTED_WEIGHT_SUM,
                sum,
                diff
            ));
        }

        Ok(())
    }

    /// Calculate the sum of all weights
    pub fn sum(&self) -> f64 {
        self.skills_weight
            + self.salary_weight
            + self.location_weight
            + self.company_weight
            + self.recency_weight
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config_is_valid() {
        let config = ScoringConfig::default();
        assert!(config.validate().is_ok());
        assert_eq!(config.sum(), 1.0);
    }

    #[test]
    fn test_valid_custom_config() {
        let config = ScoringConfig {
            skills_weight: 0.50,
            salary_weight: 0.20,
            location_weight: 0.15,
            company_weight: 0.10,
            recency_weight: 0.05,
        };
        assert!(config.validate().is_ok());
    }

    #[test]
    fn test_weights_sum_too_high() {
        let config = ScoringConfig {
            skills_weight: 0.50,
            salary_weight: 0.30,
            location_weight: 0.30,
            company_weight: 0.10,
            recency_weight: 0.05,
        };
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_weights_sum_too_low() {
        let config = ScoringConfig {
            skills_weight: 0.20,
            salary_weight: 0.15,
            location_weight: 0.10,
            company_weight: 0.05,
            recency_weight: 0.02,
        };
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_negative_weight() {
        let config = ScoringConfig {
            skills_weight: -0.10,
            salary_weight: 0.55,
            location_weight: 0.20,
            company_weight: 0.10,
            recency_weight: 0.05,
        };
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_weight_exceeds_one() {
        let config = ScoringConfig {
            skills_weight: 1.5,
            salary_weight: 0.0,
            location_weight: 0.0,
            company_weight: 0.0,
            recency_weight: 0.0,
        };
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_weight_sum_within_tolerance() {
        let config = ScoringConfig {
            skills_weight: 0.40,
            salary_weight: 0.25,
            location_weight: 0.20,
            company_weight: 0.10,
            recency_weight: 0.049, // Sum = 0.999 (within tolerance)
        };
        assert!(config.validate().is_ok());
    }

    #[test]
    fn test_weight_sum_outside_tolerance() {
        let config = ScoringConfig {
            skills_weight: 0.40,
            salary_weight: 0.25,
            location_weight: 0.20,
            company_weight: 0.10,
            recency_weight: 0.02, // Sum = 0.97 (outside tolerance)
        };
        assert!(config.validate().is_err());
    }

    #[test]
    fn test_all_zeros() {
        let config = ScoringConfig {
            skills_weight: 0.0,
            salary_weight: 0.0,
            location_weight: 0.0,
            company_weight: 0.0,
            recency_weight: 0.0,
        };
        assert!(config.validate().is_err());
    }
}
