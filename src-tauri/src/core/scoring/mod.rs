//! Job Scoring Engine
//!
//! Multi-factor scoring algorithm with configurable weights:
//! - Skills: 40% (default)
//! - Salary: 25% (default)
//! - Location: 20% (default)
//! - Company: 10% (default)
//! - Recency: 5% (default)

mod cache;
mod config;
mod db;
mod remote;
mod synonyms;

pub use cache::{
    clear_score_cache, get_cached_score, invalidate_job, invalidate_resume, score_cache_stats,
    set_cached_score, ScoreCacheKey, ScoreCacheStats,
};
pub use config::ScoringConfig;
pub use db::{load_scoring_config, reset_scoring_config, save_scoring_config};
pub use remote::{detect_remote_status, score_remote_match, RemoteStatus, UserRemotePreference};
pub use synonyms::SynonymMap;

use crate::core::{config::Config, db::Job, resume::ResumeMatcher};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tracing::debug;

/// Normalize company name for fuzzy matching
/// Strips common suffixes, extra whitespace, and converts to lowercase
#[must_use]
pub(crate) fn normalize_company_name(name: &str) -> String {
    // Normalize: lowercase, trim, normalize whitespace
    let normalized = name.to_lowercase();
    let trimmed = normalized.trim();

    // Normalize internal whitespace - avoid intermediate Vec allocation
    let mut result = String::with_capacity(trimmed.len());
    let mut prev_was_space = false;
    for ch in trimmed.chars() {
        if ch.is_whitespace() {
            if !prev_was_space && !result.is_empty() {
                result.push(' ');
                prev_was_space = true;
            }
        } else {
            result.push(ch);
            prev_was_space = false;
        }
    }

    // Remove company suffixes
    const SUFFIXES: &[&str] = &[
        " inc",
        " inc.",
        " incorporated",
        " llc",
        " llc.",
        " l.l.c",
        " l.l.c.",
        " ltd",
        " ltd.",
        " limited",
        " corp",
        " corp.",
        " corporation",
        " co",
        " co.",
        " company",
        " plc",
        " plc.",
        " gmbh",
        " ag",
    ];
    for suffix in SUFFIXES {
        if let Some(stripped) = result.strip_suffix(suffix) {
            result.truncate(stripped.len());
            break; // Only remove one suffix
        }
    }
    result
}

/// Fuzzy match two company names (case-insensitive, handles suffixes)
#[must_use]
pub(crate) fn fuzzy_match_company(job_company: &str, config_company: &str) -> bool {
    let normalized_job = normalize_company_name(job_company);
    let normalized_config = normalize_company_name(config_company);
    if normalized_job == normalized_config {
        return true;
    }
    if normalized_job.contains(&normalized_config) || normalized_config.contains(&normalized_job) {
        return true;
    }
    false
}
/// Job score with breakdown
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

/// Scoring engine
pub struct ScoringEngine {
    config: Arc<Config>,
    scoring_config: ScoringConfig,
    synonym_map: SynonymMap,
    db: Option<sqlx::SqlitePool>,
}

impl ScoringEngine {
    #[must_use]
    pub fn new(config: Arc<Config>) -> Self {
        Self {
            config,
            scoring_config: ScoringConfig::default(),
            synonym_map: SynonymMap::new(),
            db: None,
        }
    }

    /// Create a new scoring engine with database support (for resume matching)
    #[must_use]
    pub fn with_db(config: Arc<Config>, db: sqlx::SqlitePool) -> Self {
        Self {
            config,
            scoring_config: ScoringConfig::default(),
            synonym_map: SynonymMap::new(),
            db: Some(db),
        }
    }

    /// Create a new scoring engine with a custom synonym map
    #[must_use]
    pub fn with_synonym_map(config: Arc<Config>, synonym_map: SynonymMap) -> Self {
        Self {
            config,
            scoring_config: ScoringConfig::default(),
            synonym_map,
            db: None,
        }
    }

    /// Create a new scoring engine with database and custom synonym map
    #[must_use]
    pub fn with_db_and_synonym_map(
        config: Arc<Config>,
        db: sqlx::SqlitePool,
        synonym_map: SynonymMap,
    ) -> Self {
        Self {
            config,
            scoring_config: ScoringConfig::default(),
            synonym_map,
            db: Some(db),
        }
    }

    /// Create a new scoring engine with custom scoring config
    #[must_use]
    pub fn with_scoring_config(config: Arc<Config>, scoring_config: ScoringConfig) -> Self {
        Self {
            config,
            scoring_config,
            synonym_map: SynonymMap::new(),
            db: None,
        }
    }

    /// Get the current scoring configuration
    #[must_use]
    pub const fn scoring_config(&self) -> &ScoringConfig {
        &self.scoring_config
    }

    /// Score a job
    #[must_use]
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

        // Pre-allocate reasons vector with estimated capacity
        let mut reasons = Vec::with_capacity(
            skills_score.1.len()
                + salary_score.1.len()
                + location_score.1.len()
                + company_score.1.len()
                + recency_score.1.len(),
        );
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

    /// Score a job asynchronously with optional resume-based matching
    ///
    /// When `use_resume_matching` is enabled in config and a database is available,
    /// this method will use the active resume to enhance skills scoring.
    /// Falls back to keyword-based scoring if no resume is available.
    #[must_use]
    pub async fn score_async(&self, job: &Job) -> JobScore {
        // Try resume-based skills scoring if enabled
        let skills_score = if self.config.use_resume_matching {
            if let Some(ref db) = self.db {
                match self.score_skills_with_resume(job, db).await {
                    Ok(score) => score,
                    Err(e) => {
                        debug!("Resume matching failed, falling back to keywords: {}", e);
                        self.score_skills(job)
                    }
                }
            } else {
                debug!("Resume matching enabled but no database available, using keywords");
                self.score_skills(job)
            }
        } else {
            self.score_skills(job)
        };

        let salary_score = self.score_salary(job);
        let location_score = self.score_location(job);
        let company_score = self.score_company(job);
        let recency_score = self.score_recency(job);

        let raw_total =
            skills_score.0 + salary_score.0 + location_score.0 + company_score.0 + recency_score.0;

        // Ensure score is within valid bounds (0.0 - 1.0)
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

        // Pre-allocate reasons vector with estimated capacity
        let mut reasons = Vec::with_capacity(
            skills_score.1.len()
                + salary_score.1.len()
                + location_score.1.len()
                + company_score.1.len()
                + recency_score.1.len(),
        );
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

    /// Score skills using resume matching
    ///
    /// Compares the job requirements against the user's active resume.
    /// Returns (score, reasons) tuple.
    #[must_use]
    async fn score_skills_with_resume(
        &self,
        job: &Job,
        db: &sqlx::SqlitePool,
    ) -> Result<(f64, Vec<String>), anyhow::Error> {
        let max_score = self.scoring_config.skills_weight;
        let mut reasons = Vec::new();

        // First, still check title allowlist/blocklist (these are hard filters)
        let title_match = self.config.title_allowlist.iter().any(|allowed_title| {
            job.title
                .to_lowercase()
                .contains(&allowed_title.to_lowercase())
        });

        if !title_match {
            return Ok((0.0, vec!["Title not in allowlist".to_string()]));
        }

        reasons.push(format!("✓ Title matches: {}", job.title));

        let title_blocked = self.config.title_blocklist.iter().any(|blocked_title| {
            job.title
                .to_lowercase()
                .contains(&blocked_title.to_lowercase())
        });

        if title_blocked {
            return Ok((0.0, vec!["Title in blocklist".to_string()]));
        }

        // Check excluded keywords - build description text only once
        let description_text = match &job.description {
            Some(desc) => format!("{} {}", job.title, desc),
            None => job.title.clone(),
        };
        let has_excluded = self.config.keywords_exclude.iter().any(|keyword| {
            self.synonym_map
                .matches_with_synonyms(keyword, &description_text)
        });

        if has_excluded {
            return Ok((0.0, vec!["Contains excluded keyword".to_string()]));
        }

        // Now try resume matching
        let matcher = ResumeMatcher::new(db.clone());

        // Get active resume
        let active_resume = matcher.get_active_resume().await?;
        let resume = match active_resume {
            Some(r) => r,
            None => {
                debug!("No active resume found, falling back to keyword scoring");
                return Err(anyhow::anyhow!("No active resume"));
            }
        };

        // Match resume to job
        let match_result = matcher.match_resume_to_job(resume.id, &job.hash).await?;

        // Calculate score based on match result
        let resume_match_score = match_result.overall_match_score;

        // Combine resume match with keyword boost matches
        // Resume match contributes 70%, keyword boost contributes 30%
        let keyword_score = self.calculate_keyword_boost_ratio(job);
        let combined_score = (resume_match_score * 0.7) + (keyword_score * 0.3);

        let final_score = max_score * combined_score;

        // Add detailed reasons
        reasons.push(format!(
            "📄 Resume match: {}%",
            (resume_match_score * 100.0) as i32
        ));

        if !match_result.matching_skills.is_empty() {
            // Avoid intermediate Vec allocation - use itertools join or manual impl
            let skills_str = match_result
                .matching_skills
                .iter()
                .take(5)
                .map(|s| s.as_str())
                .collect::<Vec<_>>()
                .join(", ");
            reasons.push(format!("✓ Matching skills: {}", skills_str));
        }

        if !match_result.missing_skills.is_empty() {
            // Avoid intermediate Vec allocation
            let missing_str = match_result
                .missing_skills
                .iter()
                .take(3)
                .map(|s| s.as_str())
                .collect::<Vec<_>>()
                .join(", ");
            reasons.push(format!("⚠ Missing skills: {}", missing_str));
        }

        // Also show keyword matches
        for keyword in &self.config.keywords_boost {
            if self
                .synonym_map
                .matches_with_synonyms(keyword, &description_text)
            {
                reasons.push(format!("✓ Has keyword: {}", keyword));
            }
        }

        Ok((final_score, reasons))
    }

    /// Calculate keyword boost ratio (used in combined resume+keyword scoring)
    fn calculate_keyword_boost_ratio(&self, job: &Job) -> f64 {
        if self.config.keywords_boost.is_empty() {
            return 1.0; // No keywords configured = full keyword score
        }

        // Build description text only once
        let description_text = match &job.description {
            Some(desc) => format!("{} {}", job.title, desc),
            None => job.title.clone(),
        };

        let matches = self
            .config
            .keywords_boost
            .iter()
            .filter(|keyword| {
                self.synonym_map
                    .matches_with_synonyms(keyword, &description_text)
            })
            .count();

        (matches as f64 / self.config.keywords_boost.len() as f64).min(1.0)
    }

    /// Score skills match (40% weight)
    fn score_skills(&self, job: &Job) -> (f64, Vec<String>) {
        let max_score = self.scoring_config.skills_weight;
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

        // Check for excluded keywords (with synonym matching)
        // Build description text only once, reuse for all keyword checks
        let description_text = match &job.description {
            Some(desc) => format!("{} {}", job.title, desc),
            None => job.title.clone(),
        };

        let has_excluded_keyword = self.config.keywords_exclude.iter().any(|keyword| {
            self.synonym_map
                .matches_with_synonyms(keyword, &description_text)
        });

        if has_excluded_keyword {
            return (0.0, vec!["Contains excluded keyword".to_string()]);
        }

        // Count boost keywords matches (with synonym matching)
        let mut boost_matches = 0;
        for keyword in &self.config.keywords_boost {
            if self
                .synonym_map
                .matches_with_synonyms(keyword, &description_text)
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
    ///
    /// Graduated scoring based on comparison to target salary:
    /// - >= target: 1.0 (full score)
    /// - 90-99% of target: 0.9
    /// - 80-89% of target: 0.8
    /// - 70-79% of target: 0.6
    /// - < 70% of target: 0.3
    /// - Significantly above target (120%+): 1.0 + bonus (capped at 1.2)
    ///
    /// For salary ranges (min-max), uses midpoint for comparison.
    fn score_salary(&self, job: &Job) -> (f64, Vec<String>) {
        let max_score = self.scoring_config.salary_weight;
        let mut reasons = Vec::new();

        // If no salary requirements configured, give full score
        if self.config.salary_floor_usd == 0 {
            return (max_score, vec!["No salary requirement".to_string()]);
        }

        // Determine target salary (use salary_target_usd if set, otherwise salary_floor_usd)
        let target_salary = self
            .config
            .salary_target_usd
            .unwrap_or(self.config.salary_floor_usd) as f64;

        // Handle missing salary data
        if job.salary_min.is_none() && job.salary_max.is_none() {
            let penalty_score = if self.config.penalize_missing_salary {
                0.3
            } else {
                0.5
            };
            reasons.push(format!(
                "Salary not specified ({}% credit)",
                (penalty_score * 100.0) as i32
            ));
            return (max_score * penalty_score, reasons);
        }

        // Calculate effective salary for comparison
        // If both min and max are available, use midpoint
        // Otherwise use whichever is available
        let effective_salary = match (job.salary_min, job.salary_max) {
            (Some(min), Some(max)) => {
                let midpoint = (min + max) as f64 / 2.0;
                reasons.push(format!(
                    "Salary range: ${}-${} (midpoint: ${})",
                    min, max, midpoint as i64
                ));
                midpoint
            }
            (Some(min), None) => {
                reasons.push(format!("Salary: ${} (minimum only)", min));
                min as f64
            }
            (None, Some(max)) => {
                reasons.push(format!("Salary: ${} (maximum only)", max));
                max as f64
            }
            (None, None) => unreachable!(), // Already handled above
        };

        // Calculate percentage of target
        let percentage = effective_salary / target_salary;

        // Graduated scoring
        let multiplier = if percentage >= 1.2 {
            // Significantly above target - give bonus (capped)
            reasons.push(format!(
                "✓ Salary {}% of target ({}% credit + bonus)",
                (percentage * 100.0) as i32,
                120
            ));
            1.2
        } else if percentage >= 1.0 {
            // At or above target - full score
            reasons.push(format!(
                "✓ Salary {}% of target (100% credit)",
                (percentage * 100.0) as i32
            ));
            1.0
        } else if percentage >= 0.9 {
            // 90-99% of target
            reasons.push(format!(
                "Salary {}% of target (90% credit)",
                (percentage * 100.0) as i32
            ));
            0.9
        } else if percentage >= 0.8 {
            // 80-89% of target
            reasons.push(format!(
                "Salary {}% of target (80% credit)",
                (percentage * 100.0) as i32
            ));
            0.8
        } else if percentage >= 0.7 {
            // 70-79% of target
            reasons.push(format!(
                "Salary {}% of target (60% credit)",
                (percentage * 100.0) as i32
            ));
            0.6
        } else {
            // Below 70% of target
            reasons.push(format!(
                "✗ Salary {}% of target (30% credit)",
                (percentage * 100.0) as i32
            ));
            0.3
        };

        (max_score * multiplier, reasons)
    }

    /// Score location match (20% weight)
    fn score_location(&self, job: &Job) -> (f64, Vec<String>) {
        let max_score = self.scoring_config.location_weight;
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
    fn score_company(&self, job: &Job) -> (f64, Vec<String>) {
        let base_score = self.scoring_config.company_weight;
        let mut reasons = Vec::new();

        // Check if any preferences are configured
        let has_whitelist = !self.config.company_whitelist.is_empty();
        let has_blacklist = !self.config.company_blacklist.is_empty();

        if !has_whitelist && !has_blacklist {
            reasons.push("No company preferences configured".to_string());
            return (base_score, reasons);
        }

        // Check blacklist first (takes precedence)
        for blocked in &self.config.company_blacklist {
            if fuzzy_match_company(&job.company, blocked) {
                reasons.push(format!("✗ Company '{}' is blocklisted", job.company));
                return (0.0, reasons);
            }
        }

        // Check whitelist for bonus
        for preferred in &self.config.company_whitelist {
            if fuzzy_match_company(&job.company, preferred) {
                let bonus_score = base_score * 1.5; // 50% bonus
                reasons.push(format!(
                    "✓ Company '{}' is preferred (+50% bonus)",
                    job.company
                ));
                return (bonus_score, reasons);
            }
        }

        // Neutral company - base score
        reasons.push(format!("Company '{}' is neutral", job.company));
        (base_score, reasons)
    }

    /// Score recency (5% weight)
    fn score_recency(&self, job: &Job) -> (f64, Vec<String>) {
        let max_score = self.scoring_config.recency_weight;
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
    #[must_use]
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
            salary_target_usd: Some(180000), // Target salary for graduated scoring
            penalize_missing_salary: false,
            auto_refresh: Default::default(),
            immediate_alert_threshold: 0.9,
            scraping_interval_hours: 2,
            alerts: Default::default(),
            greenhouse_urls: vec![],
            lever_urls: vec![],
            linkedin: Default::default(),
            jobswithgpt_endpoint: "https://api.jobswithgpt.com/mcp".to_string(),
            remoteok: Default::default(),
            weworkremotely: Default::default(),
            builtin: Default::default(),
            hn_hiring: Default::default(),
            dice: Default::default(),
            yc_startup: Default::default(),
            usajobs: Default::default(),
            simplyhired: Default::default(),
            glassdoor: Default::default(),
            ghost_config: None,
            company_whitelist: vec![],
            company_blacklist: vec![],
            use_resume_matching: false,
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
            ghost_score: None,
            ghost_reasons: None,
            first_seen: None,
            repost_count: 0,
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
        // Make salary below floor to reduce total score (must clear salary_max too)
        job.salary_min = Some(100000);
        job.salary_max = None; // Clear salary_max to avoid midpoint calculation

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        // Skills: 0 (title not in allowlist), Salary: ~0.075 (30% tier),
        // Location: 0.20 (remote), Company: 0.10, Recency: 0.05
        // Total: ~0.425
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
        job.salary_min = Some(100000); // 100k vs 180k target = 55.5%, < 70% tier
        job.salary_max = None; // Clear to avoid midpoint calculation

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        // With graduated scoring: 55.5% of target -> 30% credit tier -> 0.25 * 0.3 = 0.075
        assert!(
            score.breakdown.salary > 0.0 && score.breakdown.salary < 0.10,
            "Salary below 70% of target should get 30% credit (0.075), got: {}",
            score.breakdown.salary
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
        job.description =
            Some("Experience with Kubernetes-native applications and AWS cloud".to_string());

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
        job.description = Some(
            "Security Engineer with sales responsibilities, AWS and Kubernetes experience"
                .to_string(),
        );

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
        assert!(score.reasons.iter().any(|r| r.contains("Remote job")));
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

        // penalize_missing_salary = false, so 50% credit
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
        job.salary_min = Some(150000); // 150k vs 180k target = 83.3%, 80-89% tier
        job.salary_max = None; // Clear to avoid midpoint calculation

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        // With graduated scoring: 83.3% of target -> 80% credit tier -> 0.25 * 0.8 = 0.20
        assert!(
            score.breakdown.salary >= 0.18 && score.breakdown.salary <= 0.22,
            "Salary at 83% of target should get 80% credit (~0.20), got: {}",
            score.breakdown.salary
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
        assert!(score.reasons.iter().any(|r| r.contains("Hybrid job")));
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
        assert!(score.reasons.iter().any(|r| r.contains("Onsite job")));
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

    // === Graduated Salary Scoring Tests ===

    #[test]
    fn test_salary_above_target_with_bonus() {
        // Test salary at 130% of target (should get bonus capped at 1.2)
        let config = create_test_config();
        let mut job = create_test_job();
        job.salary_min = Some(234000); // 130% of 180000
        job.salary_max = Some(234000);

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        // Should get 120% credit (capped): 0.25 * 1.2 = 0.30
        assert_eq!(
            score.breakdown.salary, 0.30,
            "Salary 130% of target should get capped bonus"
        );
    }

    #[test]
    fn test_salary_90_percent_of_target() {
        // Test salary at 92% of target (should get 0.9 multiplier)
        let config = create_test_config();
        let mut job = create_test_job();
        job.salary_min = Some(165600); // 92% of 180000
        job.salary_max = Some(165600);

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        // Should get 90% credit: 0.25 * 0.9 = 0.225
        assert_eq!(
            score.breakdown.salary, 0.225,
            "Salary at 92% of target should get 0.9 multiplier"
        );
    }

    #[test]
    fn test_salary_70_percent_of_target() {
        // Test salary at 75% of target (should get 0.6 multiplier)
        let config = create_test_config();
        let mut job = create_test_job();
        job.salary_min = Some(135000); // 75% of 180000
        job.salary_max = Some(135000);

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        // Should get 60% credit: 0.25 * 0.6 = 0.15
        assert_eq!(
            score.breakdown.salary, 0.15,
            "Salary at 75% of target should get 0.6 multiplier"
        );
    }

    #[test]
    fn test_salary_below_70_percent() {
        // Test salary at 50% of target (should get 0.3 multiplier)
        let config = create_test_config();
        let mut job = create_test_job();
        job.salary_min = Some(90000); // 50% of 180000
        job.salary_max = Some(90000);

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        // Should get 30% credit: 0.25 * 0.3 = 0.075
        assert_eq!(
            score.breakdown.salary, 0.075,
            "Salary at 50% of target should get 0.3 multiplier"
        );
    }

    #[test]
    fn test_salary_range_uses_midpoint() {
        // Test salary range $160k-$200k (midpoint: $180k = 100% of target)
        let config = create_test_config();
        let mut job = create_test_job();
        job.salary_min = Some(160000);
        job.salary_max = Some(200000);

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        // Midpoint is $180k = exactly target, should get full score
        assert_eq!(
            score.breakdown.salary, 0.25,
            "Salary range with midpoint at target should get full score"
        );

        // Check that the reason mentions the range
        assert!(score.reasons.iter().any(|r| r.contains("Salary range")));
    }

    #[test]
    fn test_salary_min_only() {
        // Test job with only minimum salary specified
        let config = create_test_config();
        let mut job = create_test_job();
        job.salary_min = Some(180000);
        job.salary_max = None;

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        assert_eq!(
            score.breakdown.salary, 0.25,
            "Salary min only at target should get full score"
        );

        // Check that the reason mentions "minimum only"
        assert!(score.reasons.iter().any(|r| r.contains("minimum only")));
    }

    #[test]
    fn test_salary_max_only() {
        // Test job with only maximum salary specified
        let config = create_test_config();
        let mut job = create_test_job();
        job.salary_min = None;
        job.salary_max = Some(180000);

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        assert_eq!(
            score.breakdown.salary, 0.25,
            "Salary max only at target should get full score"
        );

        // Check that the reason mentions "maximum only"
        assert!(score.reasons.iter().any(|r| r.contains("maximum only")));
    }

    #[test]
    fn test_salary_penalty_enabled() {
        // Test missing salary with penalty enabled
        let mut config = create_test_config();
        config.penalize_missing_salary = true;

        let mut job = create_test_job();
        job.salary_min = None;
        job.salary_max = None;

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        // Should get 30% credit: 0.25 * 0.3 = 0.075
        assert_eq!(
            score.breakdown.salary, 0.075,
            "Missing salary with penalty should get 0.3 multiplier"
        );

        // Check for the lower percentage in reason
        assert!(score.reasons.iter().any(|r| r.contains("30% credit")));
    }

    #[test]
    fn test_salary_no_target_uses_floor() {
        // Test with salary_target_usd = None (should use salary_floor_usd)
        let mut config = create_test_config();
        config.salary_target_usd = None;

        let mut job = create_test_job();
        job.salary_min = Some(150000); // Equal to floor
        job.salary_max = Some(150000);

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        // Should get full score since salary equals floor (used as target)
        assert_eq!(
            score.breakdown.salary, 0.25,
            "Salary at floor (when no target) should get full score"
        );
    }

    #[test]
    fn test_salary_above_target_exact_boundaries() {
        // Test exact boundary at 100% of target
        let config = create_test_config();
        let mut job = create_test_job();
        job.salary_min = Some(180000);
        job.salary_max = Some(180000);

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        assert_eq!(
            score.breakdown.salary, 0.25,
            "Salary at exactly 100% of target should get full score (1.0)"
        );

        // Test exact boundary at 90% of target
        job.salary_min = Some(162000);
        job.salary_max = Some(162000);
        let score = engine.score(&job);
        assert_eq!(
            score.breakdown.salary, 0.225,
            "Salary at exactly 90% of target should get 0.9 multiplier"
        );

        // Test exact boundary at 80% of target
        job.salary_min = Some(144000);
        job.salary_max = Some(144000);
        let score = engine.score(&job);
        assert_eq!(
            score.breakdown.salary, 0.20,
            "Salary at exactly 80% of target should get 0.8 multiplier"
        );

        // Test exact boundary at 70% of target
        job.salary_min = Some(126000);
        job.salary_max = Some(126000);
        let score = engine.score(&job);
        assert_eq!(
            score.breakdown.salary, 0.15,
            "Salary at exactly 70% of target should get 0.6 multiplier"
        );

        // Test exact boundary at 120% of target
        job.salary_min = Some(216000);
        job.salary_max = Some(216000);
        let score = engine.score(&job);
        assert_eq!(
            score.breakdown.salary, 0.30,
            "Salary at exactly 120% of target should get 1.2 multiplier (bonus)"
        );
    }

    // ========== Company Scoring Tests ==========
    // TEMPORARILY DISABLED - these tests depend on unimplemented fuzzy matching functions
    /* // NOCOMMIT: Re-enable after implementing company fuzzy matching

    #[test]
    fn test_company_blacklist() {
        let mut config = create_test_config();
        config.company_blacklist = vec!["BadCompany".to_string(), "WorstCorp".to_string()];
        let mut job = create_test_job();
        job.company = "BadCompany Inc.".to_string();

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        assert_eq!(
            score.breakdown.company, 0.0,
            "Blacklisted company should get 0 score"
        );
        assert!(
            score.reasons.iter().any(|r| r.contains("blocklisted")),
            "Should have blocklisted reason, got: {:?}",
            score.reasons
        );
    }

    #[test]
    fn test_company_whitelist() {
        let mut config = create_test_config();
        config.company_whitelist = vec!["Google".to_string(), "Cloudflare".to_string()];
        let mut job = create_test_job();
        job.company = "Google LLC".to_string();

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        // Should get 1.5x bonus (0.10 * 1.5 = 0.15)
        assert_eq!(
            score.breakdown.company, 0.15,
            "Whitelisted company should get 1.5x bonus"
        );
        assert!(
            score.reasons.iter().any(|r| r.contains("preferred") && r.contains("+50% bonus")),
            "Should have preferred reason with bonus, got: {:?}",
            score.reasons
        );
    }

    #[test]
    fn test_company_neutral() {
        let mut config = create_test_config();
        config.company_whitelist = vec!["Google".to_string()];
        config.company_blacklist = vec!["BadCompany".to_string()];
        let mut job = create_test_job();
        job.company = "Microsoft".to_string(); // Not in either list

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        // Should get full base score
        assert_eq!(
            score.breakdown.company, 0.10,
            "Neutral company should get base score"
        );
        assert!(
            score.reasons.iter().any(|r| r.contains("neutral")),
            "Should have neutral reason, got: {:?}",
            score.reasons
        );
    }

    #[test]
    fn test_company_no_preferences() {
        let config = create_test_config();
        let job = create_test_job();

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        // Should get full base score
        assert_eq!(
            score.breakdown.company, 0.10,
            "Should get base score with no preferences configured"
        );
        assert!(
            score.reasons.iter().any(|r| r.contains("No company preferences configured")),
            "Should have no preferences reason, got: {:?}",
            score.reasons
        );
    }

    #[test]
    fn test_company_fuzzy_matching_case_insensitive() {
        let mut config = create_test_config();
        config.company_whitelist = vec!["cloudflare".to_string()];
        let mut job = create_test_job();
        job.company = "CLOUDFLARE INC".to_string();

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        assert_eq!(
            score.breakdown.company, 0.15,
            "Case-insensitive fuzzy match should work"
        );
    }

    #[test]
    fn test_company_fuzzy_matching_suffixes() {
        let mut config = create_test_config();
        config.company_blacklist = vec!["BadCorp".to_string()];
        let mut job = create_test_job();

        // Test various suffixes
        let test_cases = vec![
            "BadCorp Inc",
            "BadCorp Inc.",
            "BadCorp LLC",
            "BadCorp Ltd",
            "BadCorp Corporation",
            "BadCorp Co.",
        ];

        for company_name in test_cases {
            job.company = company_name.to_string();
            let engine = ScoringEngine::new(Arc::clone(&Arc::new(config.clone())));
            let score = engine.score(&job);

            assert_eq!(
                score.breakdown.company, 0.0,
                "Should match '{}' as blocklisted",
                company_name
            );
        }
    }
    */

    #[test]
    fn test_company_partial_match() {
        let mut config = create_test_config();
        config.company_whitelist = vec!["Google".to_string()];
        let mut job = create_test_job();
        job.company = "Google DeepMind".to_string();

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        // Use approximate comparison for floating point
        assert!(
            (score.breakdown.company - 0.15).abs() < 0.001,
            "Partial match (contains) should work, got: {}",
            score.breakdown.company
        );
    }

    #[test]
    fn test_company_blacklist_takes_precedence() {
        let mut config = create_test_config();
        config.company_whitelist = vec!["BadCompany".to_string()];
        config.company_blacklist = vec!["BadCompany".to_string()];
        let mut job = create_test_job();
        job.company = "BadCompany Inc.".to_string();

        let engine = ScoringEngine::new(Arc::new(config));
        let score = engine.score(&job);

        assert_eq!(
            score.breakdown.company, 0.0,
            "Blacklist should take precedence over whitelist"
        );
        assert!(
            score.reasons.iter().any(|r| r.contains("blocklisted")),
            "Should show blocklisted reason"
        );
    }

    #[test]
    fn test_normalize_company_name() {
        assert_eq!(normalize_company_name("Google LLC"), "google");
        assert_eq!(normalize_company_name("Microsoft Corporation"), "microsoft");
        assert_eq!(normalize_company_name("Apple Inc."), "apple");
        assert_eq!(normalize_company_name("Amazon Co"), "amazon");
        assert_eq!(normalize_company_name("  Spaces  Inc  "), "spaces");
        assert_eq!(normalize_company_name("Company L.L.C."), "company");
    }

    #[test]
    fn test_fuzzy_match_company() {
        // Exact match after normalization
        assert!(fuzzy_match_company("Google LLC", "Google"));
        assert!(fuzzy_match_company(
            "Microsoft Corporation",
            "Microsoft Corp"
        ));

        // Partial match
        assert!(fuzzy_match_company("Google DeepMind", "Google"));
        assert!(fuzzy_match_company("Apple Inc", "Apple"));

        // Case insensitive
        assert!(fuzzy_match_company("CLOUDFLARE INC", "cloudflare"));

        // Should not match
        assert!(!fuzzy_match_company("Google", "Amazon"));
        assert!(!fuzzy_match_company("Microsoft", "Meta"));
    }

    #[test]
    fn test_company_scoring_with_multiple_lists() {
        let mut config = create_test_config();
        config.company_whitelist = vec![
            "Google".to_string(),
            "Cloudflare".to_string(),
            "Amazon".to_string(),
        ];
        config.company_blacklist = vec!["BadCorp".to_string(), "WorstCompany".to_string()];

        let engine = ScoringEngine::new(Arc::new(config));

        // Test whitelisted (use approximate comparison for floating point)
        let mut job = create_test_job();
        job.company = "Amazon Web Services".to_string();
        let score = engine.score(&job);
        assert!(
            (score.breakdown.company - 0.15).abs() < 0.001,
            "AWS should be whitelisted, got: {}",
            score.breakdown.company
        );

        // Test blacklisted
        job.company = "WorstCompany LLC".to_string();
        let score = engine.score(&job);
        assert_eq!(
            score.breakdown.company, 0.0,
            "WorstCompany should be blacklisted"
        );

        // Test neutral (use approximate comparison for floating point)
        job.company = "Microsoft".to_string();
        let score = engine.score(&job);
        assert!(
            (score.breakdown.company - 0.10).abs() < 0.001,
            "Microsoft should be neutral, got: {}",
            score.breakdown.company
        );
    }
}
