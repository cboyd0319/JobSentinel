//! Job Scoring Engine
//!
//! Multi-factor scoring algorithm:
//! - Skills: 40%
//! - Salary: 25%
//! - Location: 20%
//! - Company: 10%
//! - Recency: 5%

use crate::core::{config::Config, db::Job};
use serde::{Deserialize, Serialize};

/// Job score with breakdown
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobScore {
    /// Total score (0.0 - 1.0)
    pub total: f64,

    /// Score breakdown
    pub breakdown: ScoreBreakdown,

    /// Human-readable reasons
    pub reasons: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoreBreakdown {
    pub skills: f64,    // 0.0 - 0.40
    pub salary: f64,    // 0.0 - 0.25
    pub location: f64,  // 0.0 - 0.20
    pub company: f64,   // 0.0 - 0.10
    pub recency: f64,   // 0.0 - 0.05
}

/// Scoring engine
pub struct ScoringEngine {
    config: Config,
}

impl ScoringEngine {
    pub fn new(config: Config) -> Self {
        Self { config }
    }

    /// Score a job
    pub fn score(&self, job: &Job) -> JobScore {
        // TODO: Implement multi-factor scoring
        JobScore {
            total: 0.0,
            breakdown: ScoreBreakdown {
                skills: 0.0,
                salary: 0.0,
                location: 0.0,
                company: 0.0,
                recency: 0.0,
            },
            reasons: vec![],
        }
    }

    /// Check if job meets immediate alert threshold
    pub fn should_alert_immediately(&self, score: &JobScore) -> bool {
        score.total >= self.config.immediate_alert_threshold
    }
}
