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

        reasons.push(format!("Title matches: {}", job.title));

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
            "Resume match: {}%",
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
            reasons.push(format!("Matching skills: {}", skills_str));
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
            reasons.push(format!("Missing skills: {}", missing_str));
        }

        // Also show keyword matches
        for keyword in &self.config.keywords_boost {
            if self
                .synonym_map
                .matches_with_synonyms(keyword, &description_text)
            {
                reasons.push(format!("Keyword match: {}", keyword));
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

        reasons.push(format!("Title matches: {}", job.title));

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
                reasons.push(format!("Keyword match: {}", keyword));
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
                "Salary {}% of target ({}% credit + bonus)",
                (percentage * 100.0) as i32,
                120
            ));
            1.2
        } else if percentage >= 1.0 {
            // At or above target - full score
            reasons.push(format!(
                "Salary {}% of target (100% credit)",
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
                "Salary below target: {}% of target (30% credit)",
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
            reasons.push("Remote job (matches preference)".to_string());
            return (max_score, reasons);
        }

        if is_hybrid && self.config.location_preferences.allow_hybrid {
            reasons.push("Hybrid job (matches preference)".to_string());
            return (max_score, reasons);
        }

        if is_onsite && self.config.location_preferences.allow_onsite {
            reasons.push("Onsite job (matches preference)".to_string());
            return (max_score, reasons);
        }

        // Location doesn't match preferences
        reasons.push("Location doesn't match preferences".to_string());
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
                reasons.push(format!("Company '{}' is blocklisted", job.company));
                return (0.0, reasons);
            }
        }

        // Check whitelist for bonus
        for preferred in &self.config.company_whitelist {
            if fuzzy_match_company(&job.company, preferred) {
                let bonus_score = base_score * 1.5; // 50% bonus
                reasons.push(format!(
                    "Company '{}' is preferred (+50% bonus)",
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
            reasons.push(format!("Posted {} days ago (fresh)", days_old));
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
            reasons.push(format!("Posted {} days ago (too old)", days_old));
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
mod tests;
