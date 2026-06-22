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
    pub skills: f64,   // 0.0 - max_skills_weight
    pub salary: f64,   // 0.0 - max_salary_weight
    pub location: f64, // 0.0 - max_location_weight
    pub company: f64,  // 0.0 - max_company_weight
    pub recency: f64,  // 0.0 - max_recency_weight
}
