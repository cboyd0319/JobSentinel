//! Job Scoring Engine
//!
//! Multi-factor scoring algorithm:
//! - Skills: 40%
//! - Salary: 25%
//! - Location: 20%
//! - Company: 10%
//! - Recency: 5%

use crate::core::{config::Config, db::Job};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::sync::Arc;

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
    config: Arc<Config>,
}

impl ScoringEngine {
    pub fn new(config: Arc<Config>) -> Self {
        Self { config }
    }

    /// Score a job
    pub fn score(&self, job: &Job) -> JobScore {
        let skills_score = self.score_skills(job);
        let salary_score = self.score_salary(job);
        let location_score = self.score_location(job);
        let company_score = self.score_company(job);
        let recency_score = self.score_recency(job);

        let raw_total =
            skills_score.0 + salary_score.0 + location_score.0 + company_score.0 + recency_score.0;

        // Ensure score is within valid bounds (0.0 - 1.0)
        // Log a warning if raw total exceeds 1.0 (indicates potential scoring bug)
        let total = if raw_total > 1.0 {
            tracing::warn!(
                "Job score {} exceeded 1.0 ({:.4}), clamping. This may indicate a scoring bug.",
                job.id,
                raw_total
            );
            1.0
        } else if raw_total < 0.0 {
            tracing::warn!(
                "Job score {} was negative ({:.4}), clamping. This may indicate a scoring bug.",
                job.id,
                raw_total
            );
            0.0
        } else {
            raw_total
        };

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
    use crate::core::config::{Config, LocationPreferences};

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
            auto_refresh: Default::default(),
            immediate_alert_threshold: 0.9,
            scraping_interval_hours: 2,
            alerts: Default::default(),
            greenhouse_urls: vec![],
            lever_urls: vec![],
            linkedin: Default::default(),
            indeed: Default::default(),
            jobswithgpt_endpoint: "https://api.jobswithgpt.com/mcp".to_string(),
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
            hidden: false,
            bookmarked: false,
            notes: None,
            included_in_digest: false,
        }
    }

    #[test]
    fn test_perfect_match() {
        let config = create_test_config();
        let job = create_test_job();
        let engine = ScoringEngine::new(Arc::new(config));

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
        // Make salary below floor to reduce total score
        job.salary_min = Some(100000);

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        assert!(
            score.total < 0.5,
            "Score should be low for non-matching title, got: {}",
            score.total
        );
    }

    #[test]
    fn test_salary_too_low() {
        let config = create_test_config();
        let mut job = create_test_job();
        job.salary_min = Some(100000);

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        assert!(
            score.breakdown.salary == 0.0,
            "Salary score should be 0 for below floor"
        );
    }

    #[test]
    fn test_title_in_blocklist() {
        let config = create_test_config();
        let mut job = create_test_job();
        // Title contains both allowlist term "Security Engineer" AND blocklist term "Manager"
        // Should fail on blocklist check (which comes after allowlist)
        job.title = "Security Engineering Manager".to_string();

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        assert_eq!(
            score.breakdown.skills, 0.0,
            "Skills score should be 0 for blocked title"
        );
        // Check for the blocklist reason specifically
        assert!(
            score.reasons.contains(&"Title in blocklist".to_string()),
            "Should have blocklist reason, got: {:?}",
            score.reasons
        );
    }

    #[test]
    fn test_keyword_matching_case_insensitive() {
        let config = create_test_config();
        let mut job = create_test_job();
        job.description = Some("Looking for kubernetes and aws experience".to_string());

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        // Should match both keywords despite lowercase
        assert_eq!(
            score.breakdown.skills, 0.40,
            "Should match keywords case-insensitively"
        );
    }

    #[test]
    fn test_keyword_matching_partial() {
        let config = create_test_config();
        let mut job = create_test_job();
        job.description = Some("Experience with Kubernetes-native applications and AWS cloud".to_string());

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        // Should match both keywords partially
        assert_eq!(
            score.breakdown.skills, 0.40,
            "Should match keywords with partial matches"
        );
    }

    #[test]
    fn test_excluded_keyword() {
        let config = create_test_config();
        let mut job = create_test_job();
        job.description = Some("Security Engineer with sales responsibilities, AWS and Kubernetes experience".to_string());

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        assert_eq!(
            score.breakdown.skills, 0.0,
            "Skills score should be 0 for excluded keyword"
        );
        assert!(score
            .reasons
            .contains(&"Contains excluded keyword".to_string()));
    }

    #[test]
    fn test_partial_keyword_match() {
        let config = create_test_config();
        let mut job = create_test_job();
        job.description = Some("Security Engineer with AWS experience".to_string()); // Only 1 of 2 keywords

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        // Should get 50% of skills score (1 of 2 keywords)
        assert_eq!(
            score.breakdown.skills, 0.20,
            "Skills score should be 50% for partial match"
        );
    }

    #[test]
    fn test_no_boost_keywords() {
        let mut config = create_test_config();
        config.keywords_boost.clear();
        let job = create_test_job();

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        // Should get full skills score when no boost keywords configured
        assert_eq!(
            score.breakdown.skills, 0.40,
            "Should get full skills score with no boost keywords"
        );
    }

    #[test]
    fn test_location_remote_match() {
        let config = create_test_config();
        let mut job = create_test_job();
        job.remote = Some(true);
        job.location = Some("Remote".to_string());

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        assert_eq!(
            score.breakdown.location, 0.20,
            "Should get full location score for remote match"
        );
        assert!(score
            .reasons
            .iter()
            .any(|r| r.contains("Remote job")));
    }

    #[test]
    fn test_location_hybrid_no_match() {
        let config = create_test_config();
        let mut job = create_test_job();
        job.remote = Some(false);
        job.location = Some("San Francisco, CA (Hybrid)".to_string());

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        assert_eq!(
            score.breakdown.location, 0.0,
            "Should get 0 location score for hybrid when not allowed"
        );
    }

    #[test]
    fn test_location_onsite_no_match() {
        let config = create_test_config();
        let mut job = create_test_job();
        job.remote = Some(false);
        job.location = Some("New York, NY".to_string());

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        assert_eq!(
            score.breakdown.location, 0.0,
            "Should get 0 location score for onsite when not allowed"
        );
    }

    #[test]
    fn test_salary_not_specified() {
        let config = create_test_config();
        let mut job = create_test_job();
        job.salary_min = None;
        job.salary_max = None;

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        assert_eq!(
            score.breakdown.salary, 0.125,
            "Should get 50% salary score when not specified"
        );
        assert!(score
            .reasons
            .iter()
            .any(|r| r.contains("Salary not specified")));
    }

    #[test]
    fn test_salary_at_floor() {
        let config = create_test_config();
        let mut job = create_test_job();
        job.salary_min = Some(150000);

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        assert_eq!(
            score.breakdown.salary, 0.25,
            "Should get full salary score at floor"
        );
    }

    #[test]
    fn test_no_salary_requirement() {
        let mut config = create_test_config();
        config.salary_floor_usd = 0;
        let mut job = create_test_job();
        job.salary_min = None;

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        assert_eq!(
            score.breakdown.salary, 0.25,
            "Should get full salary score when no requirement"
        );
    }

    #[test]
    fn test_recency_fresh_job() {
        let config = create_test_config();
        let job = create_test_job(); // Created at Utc::now()

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        assert_eq!(
            score.breakdown.recency, 0.05,
            "Should get full recency score for fresh job"
        );
    }

    #[test]
    fn test_recency_old_job() {
        let config = create_test_config();
        let mut job = create_test_job();
        job.created_at = Utc::now() - chrono::Duration::days(45);

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        assert_eq!(
            score.breakdown.recency, 0.0,
            "Should get 0 recency score for jobs older than 30 days"
        );
    }

    #[test]
    fn test_recency_moderate_age() {
        let config = create_test_config();
        let mut job = create_test_job();
        job.created_at = Utc::now() - chrono::Duration::days(15);

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        // Should get partial recency score (between 0 and max)
        assert!(
            score.breakdown.recency > 0.0 && score.breakdown.recency < 0.05,
            "Should get partial recency score for moderately old job, got: {}",
            score.breakdown.recency
        );
    }

    #[test]
    fn test_score_normalization() {
        let config = create_test_config();
        let job = create_test_job();

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        assert!(
            score.total >= 0.0 && score.total <= 1.0,
            "Total score should be between 0 and 1, got: {}",
            score.total
        );
        assert!(
            score.breakdown.skills >= 0.0 && score.breakdown.skills <= 0.40,
            "Skills score should be between 0 and 0.40"
        );
        assert!(
            score.breakdown.salary >= 0.0 && score.breakdown.salary <= 0.25,
            "Salary score should be between 0 and 0.25"
        );
        assert!(
            score.breakdown.location >= 0.0 && score.breakdown.location <= 0.20,
            "Location score should be between 0 and 0.20"
        );
        assert!(
            score.breakdown.company >= 0.0 && score.breakdown.company <= 0.10,
            "Company score should be between 0 and 0.10"
        );
        assert!(
            score.breakdown.recency >= 0.0 && score.breakdown.recency <= 0.05,
            "Recency score should be between 0 and 0.05"
        );
    }

    #[test]
    fn test_empty_title() {
        let config = create_test_config();
        let mut job = create_test_job();
        job.title = "".to_string();

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        assert_eq!(
            score.breakdown.skills, 0.0,
            "Should get 0 skills score for empty title"
        );
    }

    #[test]
    fn test_empty_description() {
        let config = create_test_config();
        let mut job = create_test_job();
        job.description = None;

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        // With no description and no keywords matched, score will be 0
        // But the job should still be scored (not crash)
        assert!(
            score.total >= 0.0,
            "Should handle empty description without crashing"
        );
    }

    #[test]
    fn test_immediate_alert_threshold() {
        let config = create_test_config();
        let job = create_test_job();

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        // Perfect match should trigger immediate alert (threshold is 0.9)
        assert!(
            engine.should_alert_immediately(&score),
            "Perfect match should trigger immediate alert"
        );
    }

    #[test]
    fn test_no_immediate_alert_low_score() {
        let config = create_test_config();
        let mut job = create_test_job();
        job.salary_min = Some(100000); // Below floor
        job.description = Some("Basic description".to_string()); // No keywords

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        assert!(
            !engine.should_alert_immediately(&score),
            "Low score should not trigger immediate alert"
        );
    }

    #[test]
    fn test_location_remote_in_title() {
        let config = create_test_config();
        let mut job = create_test_job();
        job.title = "Remote Security Engineer".to_string();
        job.remote = None;
        job.location = None;

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        assert_eq!(
            score.breakdown.location, 0.20,
            "Should detect remote from title"
        );
    }

    #[test]
    fn test_location_remote_in_location_string() {
        let config = create_test_config();
        let mut job = create_test_job();
        job.remote = None;
        job.location = Some("United States - Remote".to_string());

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        assert_eq!(
            score.breakdown.location, 0.20,
            "Should detect remote from location string"
        );
    }

    #[test]
    fn test_location_hybrid_match() {
        let mut config = create_test_config();
        config.location_preferences.allow_remote = false;
        config.location_preferences.allow_hybrid = true;
        config.location_preferences.allow_onsite = false;

        let mut job = create_test_job();
        job.remote = Some(false);
        job.location = Some("San Francisco, CA (Hybrid)".to_string());

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        assert_eq!(
            score.breakdown.location, 0.20,
            "Should get full location score for hybrid when allowed"
        );
        assert!(score
            .reasons
            .iter()
            .any(|r| r.contains("Hybrid job")));
    }

    #[test]
    fn test_location_onsite_match() {
        let mut config = create_test_config();
        config.location_preferences.allow_remote = false;
        config.location_preferences.allow_hybrid = false;
        config.location_preferences.allow_onsite = true;

        let mut job = create_test_job();
        job.remote = Some(false);
        job.location = Some("New York, NY".to_string());

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        assert_eq!(
            score.breakdown.location, 0.20,
            "Should get full location score for onsite when allowed"
        );
        assert!(score
            .reasons
            .iter()
            .any(|r| r.contains("Onsite job")));
    }

    #[test]
    fn test_location_no_location_data() {
        let config = create_test_config();
        let mut job = create_test_job();
        job.remote = None;
        job.location = None;
        job.title = "Security Engineer".to_string(); // No "remote" in title

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        // Should be detected as onsite (not remote, not hybrid)
        // But config doesn't allow onsite, so should get 0
        assert_eq!(
            score.breakdown.location, 0.0,
            "Should get 0 when no location data and onsite not allowed"
        );
    }

    #[test]
    fn test_excluded_keyword_in_title() {
        let config = create_test_config();
        let mut job = create_test_job();
        job.title = "Security Engineer - Sales".to_string(); // Excluded keyword in title
        job.description = Some("AWS and Kubernetes experience".to_string());

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        assert_eq!(
            score.breakdown.skills, 0.0,
            "Skills score should be 0 for excluded keyword in title"
        );
        assert!(score
            .reasons
            .contains(&"Contains excluded keyword".to_string()));
    }

    #[test]
    fn test_recency_exactly_7_days() {
        let config = create_test_config();
        let mut job = create_test_job();
        job.created_at = Utc::now() - chrono::Duration::days(7);

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        assert_eq!(
            score.breakdown.recency, 0.05,
            "Should get full recency score at exactly 7 days"
        );
    }

    #[test]
    fn test_recency_exactly_30_days() {
        let config = create_test_config();
        let mut job = create_test_job();
        job.created_at = Utc::now() - chrono::Duration::days(30);

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        // At 30 days, should get minimal score (almost 0)
        assert!(
            score.breakdown.recency < 0.01,
            "Should get near-zero recency score at 30 days, got: {}",
            score.breakdown.recency
        );
    }

    #[test]
    fn test_empty_allowlist() {
        let mut config = create_test_config();
        config.title_allowlist.clear();
        let job = create_test_job();

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        // With empty allowlist, no titles should match
        assert_eq!(
            score.breakdown.skills, 0.0,
            "Should get 0 skills score with empty allowlist"
        );
        assert!(score
            .reasons
            .contains(&"Title not in allowlist".to_string()));
    }

    #[test]
    fn test_multiple_allowlist_matches() {
        let mut config = create_test_config();
        config.title_allowlist = vec![
            "Engineer".to_string(),
            "Developer".to_string(),
            "Security".to_string(),
        ];
        let mut job = create_test_job();
        job.title = "Senior Security Engineer".to_string(); // Matches multiple

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        // Should pass allowlist check (only needs to match one)
        assert!(
            score.breakdown.skills > 0.0,
            "Should pass allowlist with multiple matches"
        );
    }

    #[test]
    fn test_threshold_edge_cases() {
        let mut config = create_test_config();
        config.immediate_alert_threshold = 0.9;
        let job = create_test_job();

        let engine = ScoringEngine::new(Arc::new(config));

        // Test with score exactly at threshold
        let mut score = engine.score(&job);
        score.total = 0.9; // Manually set to threshold
        assert!(
            engine.should_alert_immediately(&score),
            "Should alert at exactly threshold"
        );

        // Test just below threshold
        score.total = 0.899;
        assert!(
            !engine.should_alert_immediately(&score),
            "Should not alert just below threshold"
        );

        // Test above threshold
        score.total = 0.95;
        assert!(
            engine.should_alert_immediately(&score),
            "Should alert above threshold"
        );
    }

    #[test]
    fn test_all_preferences_allowed() {
        let mut config = create_test_config();
        config.location_preferences.allow_remote = true;
        config.location_preferences.allow_hybrid = true;
        config.location_preferences.allow_onsite = true;

        // Test remote
        let mut job = create_test_job();
        job.remote = Some(true);
        job.location = Some("Remote".to_string());
        let engine = ScoringEngine::new(Arc::new(config.clone()));
        let score = engine.score(&job);
        assert_eq!(score.breakdown.location, 0.20, "Remote should score full");

        // Test hybrid
        job.remote = Some(false);
        job.location = Some("Hybrid".to_string());
        let score = engine.score(&job);
        assert_eq!(score.breakdown.location, 0.20, "Hybrid should score full");

        // Test onsite
        job.remote = Some(false);
        job.location = Some("New York, NY".to_string());
        let score = engine.score(&job);
        assert_eq!(score.breakdown.location, 0.20, "Onsite should score full");
    }

    #[test]
    fn test_zero_boost_keywords_match() {
        let mut config = create_test_config();
        config.keywords_boost = vec!["Rust".to_string()];
        let mut job = create_test_job();
        job.description = Some("No matching keywords here".to_string());

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        // Should get 0 skills score when no boost keywords match
        assert_eq!(
            score.breakdown.skills, 0.0,
            "Should get 0 skills score when no boost keywords match"
        );
    }

    #[test]
    fn test_recency_boundary_8_days() {
        let config = create_test_config();
        let mut job = create_test_job();
        job.created_at = Utc::now() - chrono::Duration::days(8);

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        // At 8 days, should get partial score (in the decay range)
        assert!(
            score.breakdown.recency > 0.0 && score.breakdown.recency < 0.05,
            "Should get partial recency score at 8 days, got: {}",
            score.breakdown.recency
        );
    }

    #[test]
    fn test_case_sensitivity_comprehensive() {
        let config = create_test_config();
        let mut job = create_test_job();

        // Test uppercase keywords in description
        job.description = Some("KUBERNETES and AWS experience".to_string());
        let engine = ScoringEngine::new(Arc::new(config.clone()));
        let score = engine.score(&job);
        assert_eq!(
            score.breakdown.skills, 0.40,
            "Should match uppercase keywords"
        );

        // Test mixed case in title
        job.title = "sEcUrItY eNgInEeR".to_string();
        let score = engine.score(&job);
        assert!(
            score.breakdown.skills > 0.0,
            "Should match mixed case title"
        );

        // Test excluded keyword in uppercase
        job.description = Some("SALES experience required".to_string());
        let score = engine.score(&job);
        assert_eq!(
            score.breakdown.skills, 0.0,
            "Should exclude uppercase excluded keywords"
        );
    }

    #[test]
    fn test_scoring_consistency() {
        let config = create_test_config();
        let job = create_test_job();
        let engine = ScoringEngine::new(Arc::new(config));

        // Score the same job twice
        let score1 = engine.score(&job);
        let score2 = engine.score(&job);

        assert_eq!(
            score1.total, score2.total,
            "Scoring should be deterministic"
        );
        assert_eq!(
            score1.breakdown.skills, score2.breakdown.skills,
            "Skills breakdown should be consistent"
        );
        assert_eq!(
            score1.breakdown.salary, score2.breakdown.salary,
            "Salary breakdown should be consistent"
        );
    }

    #[test]
    fn test_empty_location_string() {
        let config = create_test_config();
        let mut job = create_test_job();
        job.remote = None;
        job.location = Some("".to_string()); // Empty string

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        // Empty location should be treated as onsite
        // Config doesn't allow onsite, so should get 0
        assert_eq!(
            score.breakdown.location, 0.0,
            "Empty location should be treated as onsite"
        );
    }
}
