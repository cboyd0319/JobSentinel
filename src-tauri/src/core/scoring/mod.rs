//! Job Scoring Engine
//!
//! Multi-factor scoring algorithm:
//! - Skills: 40%
//! - Salary: 25%
//! - Location: 20%
//! - Company: 10%
//! - Recency: 5%

use crate::core::{config::Config, db::Job};
use chrono::{DateTime, Utc};
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
    pub skills: f64,   // 0.0 - 0.40
    pub salary: f64,   // 0.0 - 0.25
    pub location: f64, // 0.0 - 0.20
    pub company: f64,  // 0.0 - 0.10
    pub recency: f64,  // 0.0 - 0.05
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
        let skills_score = self.score_skills(job);
        let salary_score = self.score_salary(job);
        let location_score = self.score_location(job);
        let company_score = self.score_company(job);
        let recency_score = self.score_recency(job);

        let total =
            skills_score.0 + salary_score.0 + location_score.0 + company_score.0 + recency_score.0;

        let mut reasons = Vec::new();
        reasons.extend(skills_score.1);
        reasons.extend(salary_score.1);
        reasons.extend(location_score.1);
        reasons.extend(company_score.1);
        reasons.extend(recency_score.1);

        JobScore {
            total,
            breakdown: ScoreBreakdown {
                skills: skills_score.0,
                salary: salary_score.0,
                location: location_score.0,
                company: company_score.0,
                recency: recency_score.0,
            },
            reasons,
        }
    }

    /// Score skills match (40% weight)
    fn score_skills(&self, job: &Job) -> (f64, Vec<String>) {
        let max_score = 0.40;
        let mut reasons = Vec::new();

        // Check if title is in allowlist
        let title_match = self.config.title_allowlist.iter().any(|allowed_title| {
            job.title
                .to_lowercase()
                .contains(&allowed_title.to_lowercase())
        });

        if !title_match {
            return (0.0, vec!["Title not in allowlist".to_string()]);
        }

        reasons.push(format!("✓ Title matches: {}", job.title));

        // Check if title is in blocklist
        let title_blocked = self.config.title_blocklist.iter().any(|blocked_title| {
            job.title
                .to_lowercase()
                .contains(&blocked_title.to_lowercase())
        });

        if title_blocked {
            return (0.0, vec!["Title in blocklist".to_string()]);
        }

        // Check for excluded keywords
        let description_text =
            format!("{} {}", job.title, job.description.as_deref().unwrap_or(""));
        let has_excluded_keyword = self.config.keywords_exclude.iter().any(|keyword| {
            description_text
                .to_lowercase()
                .contains(&keyword.to_lowercase())
        });

        if has_excluded_keyword {
            return (0.0, vec!["Contains excluded keyword".to_string()]);
        }

        // Count boost keywords matches
        let mut boost_matches = 0;
        for keyword in &self.config.keywords_boost {
            if description_text
                .to_lowercase()
                .contains(&keyword.to_lowercase())
            {
                boost_matches += 1;
                reasons.push(format!("✓ Has keyword: {}", keyword));
            }
        }

        // Calculate skills score based on boost keyword matches
        let score = if self.config.keywords_boost.is_empty() {
            max_score // Full score if no boost keywords configured
        } else {
            let match_ratio = boost_matches as f64 / self.config.keywords_boost.len() as f64;
            max_score * match_ratio.min(1.0)
        };

        (score, reasons)
    }

    /// Score salary match (25% weight)
    fn score_salary(&self, job: &Job) -> (f64, Vec<String>) {
        let max_score = 0.25;
        let mut reasons = Vec::new();

        if self.config.salary_floor_usd == 0 {
            // No salary requirement configured
            return (max_score, vec!["No salary requirement".to_string()]);
        }

        // Check if salary is available
        if let Some(salary_min) = job.salary_min {
            if salary_min >= self.config.salary_floor_usd {
                reasons.push(format!("✓ Salary >= ${}", self.config.salary_floor_usd));
                return (max_score, reasons);
            } else {
                reasons.push(format!(
                    "✗ Salary ${} < ${}",
                    salary_min, self.config.salary_floor_usd
                ));
                return (0.0, reasons);
            }
        }

        // Salary not specified - give partial credit
        reasons.push("Salary not specified (50% credit)".to_string());
        (max_score * 0.5, reasons)
    }

    /// Score location match (20% weight)
    fn score_location(&self, job: &Job) -> (f64, Vec<String>) {
        let max_score = 0.20;
        let mut reasons = Vec::new();

        let location_text = job.location.as_deref().unwrap_or("").to_lowercase();
        let title_text = job.title.to_lowercase();

        // Check if job is remote
        let is_remote = job.remote.unwrap_or(false)
            || location_text.contains("remote")
            || title_text.contains("remote");

        // Check if job is hybrid
        let is_hybrid = location_text.contains("hybrid");

        // Check if job is onsite
        let is_onsite = !is_remote && !is_hybrid;

        if is_remote && self.config.location_preferences.allow_remote {
            reasons.push("✓ Remote job (matches preference)".to_string());
            return (max_score, reasons);
        }

        if is_hybrid && self.config.location_preferences.allow_hybrid {
            reasons.push("✓ Hybrid job (matches preference)".to_string());
            return (max_score, reasons);
        }

        if is_onsite && self.config.location_preferences.allow_onsite {
            reasons.push("✓ Onsite job (matches preference)".to_string());
            return (max_score, reasons);
        }

        // Location doesn't match preferences
        reasons.push("✗ Location doesn't match preferences".to_string());
        (0.0, reasons)
    }

    /// Score company preference (10% weight)
    fn score_company(&self, _job: &Job) -> (f64, Vec<String>) {
        let max_score = 0.10;

        // For v1.0, we don't have company allowlist/blocklist in config
        // Give full score for now
        (
            max_score,
            vec!["Company preference not configured".to_string()],
        )
    }

    /// Score recency (5% weight)
    fn score_recency(&self, job: &Job) -> (f64, Vec<String>) {
        let max_score = 0.05;
        let mut reasons = Vec::new();

        let now = Utc::now();
        let age = now.signed_duration_since(job.created_at);
        let days_old = age.num_days();

        if days_old <= 7 {
            reasons.push(format!("✓ Posted {} days ago (fresh)", days_old));
            (max_score, reasons)
        } else if days_old <= 30 {
            let score = max_score * (1.0 - (days_old as f64 - 7.0) / 23.0);
            reasons.push(format!(
                "Posted {} days ago ({}% credit)",
                days_old,
                (score / max_score * 100.0) as i32
            ));
            (score, reasons)
        } else {
            reasons.push(format!("✗ Posted {} days ago (too old)", days_old));
            (0.0, reasons)
        }
    }

    /// Check if job meets immediate alert threshold
    pub fn should_alert_immediately(&self, score: &JobScore) -> bool {
        score.total >= self.config.immediate_alert_threshold
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::config::{AlertConfig, Config, LocationPreferences, SlackConfig};

    fn create_test_config() -> Config {
        Config {
            title_allowlist: vec!["Security Engineer".to_string()],
            title_blocklist: vec!["Manager".to_string()],
            keywords_boost: vec!["Kubernetes".to_string(), "AWS".to_string()],
            keywords_exclude: vec!["sales".to_string()],
            location_preferences: LocationPreferences {
                allow_remote: true,
                allow_hybrid: false,
                allow_onsite: false,
                cities: vec![],
                states: vec![],
                country: "US".to_string(),
            },
            salary_floor_usd: 150000,
            immediate_alert_threshold: 0.9,
            scraping_interval_hours: 2,
            alerts: AlertConfig {
                slack: SlackConfig {
                    enabled: true,
                    webhook_url: "".to_string(),
                },
            },
        }
    }

    fn create_test_job() -> Job {
        Job {
            id: 1,
            hash: "test".to_string(),
            title: "Security Engineer".to_string(),
            company: "Cloudflare".to_string(),
            url: "https://example.com".to_string(),
            location: Some("Remote".to_string()),
            description: Some(
                "We need a Security Engineer with Kubernetes and AWS experience".to_string(),
            ),
            score: None,
            score_reasons: None,
            source: "greenhouse".to_string(),
            remote: Some(true),
            salary_min: Some(160000),
            salary_max: Some(200000),
            currency: Some("USD".to_string()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            last_seen: Utc::now(),
            times_seen: 1,
            immediate_alert_sent: false,
            included_in_digest: false,
        }
    }

    #[test]
    fn test_perfect_match() {
        let config = create_test_config();
        let job = create_test_job();
        let engine = ScoringEngine::new(config);

        let score = engine.score(&job);

        // Skills: 40% (title + 2 keywords)
        // Salary: 25% (above floor)
        // Location: 20% (remote)
        // Company: 10% (full)
        // Recency: 5% (fresh)
        // Total: ~100%
        assert!(score.total >= 0.95, "Score should be high: {}", score.total);
    }

    #[test]
    fn test_title_not_in_allowlist() {
        let config = create_test_config();
        let mut job = create_test_job();
        job.title = "Product Manager".to_string();

        let engine = ScoringEngine::new(config);
        let score = engine.score(&job);

        assert!(
            score.total < 0.5,
            "Score should be low for non-matching title"
        );
    }

    #[test]
    fn test_salary_too_low() {
        let config = create_test_config();
        let mut job = create_test_job();
        job.salary_min = Some(100000);

        let engine = ScoringEngine::new(config);
        let score = engine.score(&job);

        assert!(
            score.breakdown.salary == 0.0,
            "Salary score should be 0 for below floor"
        );
    }
}
