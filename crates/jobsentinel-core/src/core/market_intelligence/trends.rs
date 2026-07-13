//! Market Trend Data Structures
//!
//! Provides data models for skill demand, salary trends, and role demand.

use chrono::NaiveDate;
use serde::{Deserialize, Serialize};

/// Skill demand trend over time
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillDemandTrend {
    pub id: i64,
    pub skill_name: String,
    pub date: NaiveDate,
    pub mention_count: i64,
    pub job_count: i64,
    pub avg_salary: Option<i64>,
    pub median_salary: Option<i64>,
    pub top_company: Option<String>,
    pub top_location: Option<String>,
}

impl SkillDemandTrend {
    /// Calculate growth percentage compared to previous period
    pub fn calculate_growth(&self, previous: &Self) -> f64 {
        if previous.mention_count == 0 {
            return 0.0;
        }
        ((self.mention_count - previous.mention_count) as f64 / previous.mention_count as f64)
            * 100.0
    }

    /// Is this skill trending up?
    pub fn is_trending_up(&self, previous: &Self, threshold_pct: f64) -> bool {
        self.calculate_growth(previous) >= threshold_pct
    }
}

/// Salary trend over time for a specific role and location
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SalaryTrend {
    pub id: i64,
    pub job_title_normalized: String,
    pub location_normalized: String,
    pub date: NaiveDate,
    pub min_salary: i64,
    pub p25_salary: i64,
    pub median_salary: i64,
    pub p75_salary: i64,
    pub max_salary: i64,
    pub avg_salary: i64,
    pub sample_size: i64,
    pub salary_growth_pct: Option<f64>,
}

impl SalaryTrend {
    /// Format salary range as string
    pub fn range_description(&self) -> String {
        format!(
            "${}-${} (median: ${})",
            format_thousands(self.min_salary),
            format_thousands(self.max_salary),
            format_thousands(self.median_salary)
        )
    }

    /// Is salary growth positive?
    pub fn is_growing(&self) -> bool {
        self.salary_growth_pct.unwrap_or(0.0) > 0.0
    }

    /// Is salary growth significant? (>10%)
    pub fn is_significant_growth(&self) -> bool {
        self.salary_growth_pct.unwrap_or(0.0) >= 10.0
    }
}

/// Format number with thousands separators
fn format_thousands(n: i64) -> String {
    let s = n.to_string();
    let mut result = String::new();
    for (i, c) in s.chars().rev().enumerate() {
        if i > 0 && i % 3 == 0 {
            result.push(',');
        }
        result.push(c);
    }
    result.chars().rev().collect()
}

/// Role demand trend over time
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoleDemandTrend {
    pub id: i64,
    pub job_title_normalized: String,
    pub date: NaiveDate,
    pub job_count: i64,
    pub avg_salary: Option<i64>,
    pub median_salary: Option<i64>,
    pub top_company: Option<String>,
    pub top_location: Option<String>,
    pub avg_experience_years: Option<f64>,
    pub remote_percentage: Option<f64>,
    pub demand_trend: Option<String>, // 'rising', 'stable', 'falling'
}

impl RoleDemandTrend {
    /// Is this role in high demand?
    pub fn is_high_demand(&self, threshold: i64) -> bool {
        self.job_count >= threshold
    }

    /// Is remote work common for this role?
    pub fn is_remote_friendly(&self) -> bool {
        self.remote_percentage.unwrap_or(0.0) >= 50.0
    }

    /// Get trend direction
    pub fn trend_direction(&self) -> &str {
        self.demand_trend.as_deref().unwrap_or("unknown")
    }
}

/// Company hiring velocity data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompanyHiringVelocity {
    pub id: i64,
    pub company_name: String,
    pub date: NaiveDate,
    pub jobs_posted_count: i64,
    pub jobs_filled_count: i64,
    pub jobs_active_count: i64,
    pub avg_days_to_fill: Option<f64>,
    pub top_role: Option<String>,
    pub top_location: Option<String>,
    pub is_actively_hiring: bool,
    pub hiring_trend: Option<String>, // 'increasing', 'stable', 'decreasing'
}

impl CompanyHiringVelocity {
    /// Is company hiring aggressively?
    pub fn is_aggressive_hiring(&self) -> bool {
        self.jobs_posted_count >= 10
    }

    /// Calculate fill rate (jobs filled / jobs posted)
    pub fn fill_rate(&self) -> f64 {
        if self.jobs_posted_count == 0 {
            return 0.0;
        }
        (self.jobs_filled_count as f64 / self.jobs_posted_count as f64) * 100.0
    }
}

/// Location job density data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocationJobDensity {
    pub id: i64,
    pub location_normalized: String,
    pub city: Option<String>,
    pub state: Option<String>,
    pub country: String,
    pub date: NaiveDate,
    pub job_count: i64,
    pub remote_job_count: i64,
    pub avg_salary: Option<i64>,
    pub median_salary: Option<i64>,
    pub top_skill: Option<String>,
    pub top_company: Option<String>,
    pub top_role: Option<String>,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
}

impl LocationJobDensity {
    /// Calculate remote work percentage
    pub fn remote_percentage(&self) -> f64 {
        if self.job_count == 0 {
            return 0.0;
        }
        (self.remote_job_count as f64 / self.job_count as f64) * 100.0
    }

    /// Is this a hot job market?
    pub fn is_hot_market(&self, threshold: i64) -> bool {
        self.job_count >= threshold
    }

    /// Format location name
    pub fn location_display(&self) -> String {
        if let (Some(city), Some(state)) = (&self.city, &self.state) {
            format!("{}, {}", city, state)
        } else {
            self.location_normalized.clone()
        }
    }
}

#[cfg(test)]
mod tests;
