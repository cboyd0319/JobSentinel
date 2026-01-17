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
mod tests {
    use super::*;
    use chrono::Utc;

    #[test]
    fn test_skill_growth_calculation() {
        let today = Utc::now().date_naive();
        let prev = SkillDemandTrend {
            id: 1,
            skill_name: "React".to_string(),
            date: today,
            mention_count: 100,
            job_count: 50,
            avg_salary: Some(120000),
            median_salary: Some(115000),
            top_company: None,
            top_location: None,
        };

        let curr = SkillDemandTrend {
            id: 2,
            skill_name: "React".to_string(),
            date: today,
            mention_count: 150,
            job_count: 75,
            avg_salary: Some(125000),
            median_salary: Some(120000),
            top_company: None,
            top_location: None,
        };

        assert_eq!(curr.calculate_growth(&prev), 50.0);
        assert!(curr.is_trending_up(&prev, 25.0));
    }

    #[test]
    fn test_salary_trend_growth() {
        let today = Utc::now().date_naive();
        let trend = SalaryTrend {
            id: 1,
            job_title_normalized: "software engineer".to_string(),
            location_normalized: "san francisco, ca".to_string(),
            date: today,
            min_salary: 100000,
            p25_salary: 120000,
            median_salary: 150000,
            p75_salary: 180000,
            max_salary: 250000,
            avg_salary: 155000,
            sample_size: 100,
            salary_growth_pct: Some(12.5),
        };

        assert!(trend.is_growing());
        assert!(trend.is_significant_growth());
        assert_eq!(
            trend.range_description(),
            "$100,000-$250,000 (median: $150,000)"
        );
    }

    #[test]
    fn test_role_demand_analysis() {
        let today = Utc::now().date_naive();
        let role = RoleDemandTrend {
            id: 1,
            job_title_normalized: "software engineer".to_string(),
            date: today,
            job_count: 500,
            avg_salary: Some(150000),
            median_salary: Some(145000),
            top_company: Some("Google".to_string()),
            top_location: Some("Remote".to_string()),
            avg_experience_years: Some(4.5),
            remote_percentage: Some(65.0),
            demand_trend: Some("rising".to_string()),
        };

        assert!(role.is_high_demand(100));
        assert!(role.is_remote_friendly());
        assert_eq!(role.trend_direction(), "rising");
    }

    #[test]
    fn test_company_hiring_velocity() {
        let today = Utc::now().date_naive();
        let velocity = CompanyHiringVelocity {
            id: 1,
            company_name: "TechCorp".to_string(),
            date: today,
            jobs_posted_count: 25,
            jobs_filled_count: 15,
            jobs_active_count: 50,
            avg_days_to_fill: Some(30.0),
            top_role: Some("Software Engineer".to_string()),
            top_location: Some("Remote".to_string()),
            is_actively_hiring: true,
            hiring_trend: Some("increasing".to_string()),
        };

        assert!(velocity.is_aggressive_hiring());
        assert_eq!(velocity.fill_rate(), 60.0);
    }

    #[test]
    fn test_location_density() {
        let today = Utc::now().date_naive();
        let density = LocationJobDensity {
            id: 1,
            location_normalized: "san francisco, ca".to_string(),
            city: Some("San Francisco".to_string()),
            state: Some("CA".to_string()),
            country: "US".to_string(),
            date: today,
            job_count: 1000,
            remote_job_count: 400,
            avg_salary: Some(160000),
            median_salary: Some(150000),
            top_skill: Some("Python".to_string()),
            top_company: Some("Meta".to_string()),
            top_role: Some("Software Engineer".to_string()),
            latitude: Some(37.7749),
            longitude: Some(-122.4194),
        };

        assert_eq!(density.remote_percentage(), 40.0);
        assert!(density.is_hot_market(500));
        assert_eq!(density.location_display(), "San Francisco, CA");
    }

    #[test]
    fn test_skill_growth_zero_previous() {
        let today = Utc::now().date_naive();
        let prev = SkillDemandTrend {
            id: 1,
            skill_name: "Go".to_string(),
            date: today,
            mention_count: 0,
            job_count: 0,
            avg_salary: None,
            median_salary: None,
            top_company: None,
            top_location: None,
        };

        let curr = SkillDemandTrend {
            id: 2,
            skill_name: "Go".to_string(),
            date: today,
            mention_count: 50,
            job_count: 25,
            avg_salary: Some(130000),
            median_salary: Some(125000),
            top_company: None,
            top_location: None,
        };

        assert_eq!(curr.calculate_growth(&prev), 0.0);
    }

    #[test]
    fn test_skill_negative_growth() {
        let today = Utc::now().date_naive();
        let prev = SkillDemandTrend {
            id: 1,
            skill_name: "jQuery".to_string(),
            date: today,
            mention_count: 200,
            job_count: 100,
            avg_salary: Some(100000),
            median_salary: Some(95000),
            top_company: None,
            top_location: None,
        };

        let curr = SkillDemandTrend {
            id: 2,
            skill_name: "jQuery".to_string(),
            date: today,
            mention_count: 100,
            job_count: 50,
            avg_salary: Some(90000),
            median_salary: Some(85000),
            top_company: None,
            top_location: None,
        };

        assert_eq!(curr.calculate_growth(&prev), -50.0);
        assert!(!curr.is_trending_up(&prev, 25.0));
    }

    #[test]
    fn test_skill_exact_threshold() {
        let today = Utc::now().date_naive();
        let prev = SkillDemandTrend {
            id: 1,
            skill_name: "Rust".to_string(),
            date: today,
            mention_count: 100,
            job_count: 50,
            avg_salary: Some(120000),
            median_salary: Some(115000),
            top_company: None,
            top_location: None,
        };

        let curr = SkillDemandTrend {
            id: 2,
            skill_name: "Rust".to_string(),
            date: today,
            mention_count: 125,
            job_count: 62,
            avg_salary: Some(125000),
            median_salary: Some(120000),
            top_company: None,
            top_location: None,
        };

        assert_eq!(curr.calculate_growth(&prev), 25.0);
        assert!(curr.is_trending_up(&prev, 25.0));
    }

    #[test]
    fn test_salary_trend_no_growth() {
        let today = Utc::now().date_naive();
        let trend = SalaryTrend {
            id: 1,
            job_title_normalized: "developer".to_string(),
            location_normalized: "remote".to_string(),
            date: today,
            min_salary: 80000,
            p25_salary: 100000,
            median_salary: 120000,
            p75_salary: 140000,
            max_salary: 180000,
            avg_salary: 125000,
            sample_size: 50,
            salary_growth_pct: Some(0.0),
        };

        assert!(!trend.is_growing());
        assert!(!trend.is_significant_growth());
    }

    #[test]
    fn test_salary_trend_negative_growth() {
        let today = Utc::now().date_naive();
        let trend = SalaryTrend {
            id: 1,
            job_title_normalized: "qa engineer".to_string(),
            location_normalized: "austin, tx".to_string(),
            date: today,
            min_salary: 70000,
            p25_salary: 85000,
            median_salary: 100000,
            p75_salary: 115000,
            max_salary: 140000,
            avg_salary: 102000,
            sample_size: 30,
            salary_growth_pct: Some(-5.5),
        };

        assert!(!trend.is_growing());
        assert!(!trend.is_significant_growth());
    }

    #[test]
    fn test_salary_range_formatting() {
        let today = Utc::now().date_naive();
        let trend = SalaryTrend {
            id: 1,
            job_title_normalized: "senior engineer".to_string(),
            location_normalized: "seattle, wa".to_string(),
            date: today,
            min_salary: 150000,
            p25_salary: 175000,
            median_salary: 200000,
            p75_salary: 225000,
            max_salary: 300000,
            avg_salary: 205000,
            sample_size: 100,
            salary_growth_pct: Some(15.5),
        };

        assert_eq!(
            trend.range_description(),
            "$150,000-$300,000 (median: $200,000)"
        );
    }

    #[test]
    fn test_role_demand_low_threshold() {
        let today = Utc::now().date_naive();
        let role = RoleDemandTrend {
            id: 1,
            job_title_normalized: "niche specialist".to_string(),
            date: today,
            job_count: 50,
            avg_salary: Some(130000),
            median_salary: Some(125000),
            top_company: None,
            top_location: None,
            avg_experience_years: Some(5.0),
            remote_percentage: Some(40.0),
            demand_trend: Some("stable".to_string()),
        };

        assert!(!role.is_high_demand(100));
        assert!(role.is_high_demand(25));
        assert!(!role.is_remote_friendly());
    }

    #[test]
    fn test_role_demand_no_trend() {
        let today = Utc::now().date_naive();
        let role = RoleDemandTrend {
            id: 1,
            job_title_normalized: "consultant".to_string(),
            date: today,
            job_count: 200,
            avg_salary: Some(140000),
            median_salary: Some(135000),
            top_company: None,
            top_location: None,
            avg_experience_years: Some(7.0),
            remote_percentage: None,
            demand_trend: None,
        };

        assert_eq!(role.trend_direction(), "unknown");
        assert!(!role.is_remote_friendly());
    }

    #[test]
    fn test_company_hiring_velocity_zero_posted() {
        let today = Utc::now().date_naive();
        let velocity = CompanyHiringVelocity {
            id: 1,
            company_name: "SlowCorp".to_string(),
            date: today,
            jobs_posted_count: 0,
            jobs_filled_count: 5,
            jobs_active_count: 10,
            avg_days_to_fill: Some(45.0),
            top_role: None,
            top_location: None,
            is_actively_hiring: false,
            hiring_trend: Some("decreasing".to_string()),
        };

        assert!(!velocity.is_aggressive_hiring());
        assert_eq!(velocity.fill_rate(), 0.0);
    }

    #[test]
    fn test_company_hiring_velocity_exact_threshold() {
        let today = Utc::now().date_naive();
        let velocity = CompanyHiringVelocity {
            id: 1,
            company_name: "ThresholdCorp".to_string(),
            date: today,
            jobs_posted_count: 10,
            jobs_filled_count: 5,
            jobs_active_count: 25,
            avg_days_to_fill: Some(30.0),
            top_role: Some("Engineer".to_string()),
            top_location: Some("Remote".to_string()),
            is_actively_hiring: true,
            hiring_trend: Some("stable".to_string()),
        };

        assert!(velocity.is_aggressive_hiring());
        assert_eq!(velocity.fill_rate(), 50.0);
    }

    #[test]
    fn test_location_density_zero_jobs() {
        let today = Utc::now().date_naive();
        let density = LocationJobDensity {
            id: 1,
            location_normalized: "nowhere, xx".to_string(),
            city: Some("Nowhere".to_string()),
            state: Some("XX".to_string()),
            country: "US".to_string(),
            date: today,
            job_count: 0,
            remote_job_count: 0,
            avg_salary: None,
            median_salary: None,
            top_skill: None,
            top_company: None,
            top_role: None,
            latitude: None,
            longitude: None,
        };

        assert_eq!(density.remote_percentage(), 0.0);
        assert!(!density.is_hot_market(10));
    }

    #[test]
    fn test_location_density_100_percent_remote() {
        let today = Utc::now().date_naive();
        let density = LocationJobDensity {
            id: 1,
            location_normalized: "remote".to_string(),
            city: None,
            state: None,
            country: "Global".to_string(),
            date: today,
            job_count: 500,
            remote_job_count: 500,
            avg_salary: Some(145000),
            median_salary: Some(140000),
            top_skill: Some("JavaScript".to_string()),
            top_company: Some("RemoteCo".to_string()),
            top_role: Some("Full Stack Developer".to_string()),
            latitude: None,
            longitude: None,
        };

        assert_eq!(density.remote_percentage(), 100.0);
        assert_eq!(density.location_display(), "remote");
    }

    #[test]
    fn test_location_display_without_state() {
        let today = Utc::now().date_naive();
        let density = LocationJobDensity {
            id: 1,
            location_normalized: "london".to_string(),
            city: Some("London".to_string()),
            state: None,
            country: "UK".to_string(),
            date: today,
            job_count: 750,
            remote_job_count: 200,
            avg_salary: Some(80000),
            median_salary: Some(75000),
            top_skill: Some("TypeScript".to_string()),
            top_company: Some("BritishTech".to_string()),
            top_role: Some("Backend Engineer".to_string()),
            latitude: Some(51.5074),
            longitude: Some(-0.1278),
        };

        assert_eq!(density.location_display(), "london");
    }

    #[test]
    fn test_format_thousands() {
        assert_eq!(format_thousands(1000), "1,000");
        assert_eq!(format_thousands(10000), "10,000");
        assert_eq!(format_thousands(100000), "100,000");
        assert_eq!(format_thousands(1000000), "1,000,000");
        assert_eq!(format_thousands(999), "999");
        assert_eq!(format_thousands(0), "0");
    }
}
