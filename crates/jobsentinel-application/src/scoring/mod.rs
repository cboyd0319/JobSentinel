//! Job Scoring Engine
//!
//! Multi-factor scoring algorithm with configurable weights:
//! - Skills: 40% (default)
//! - Salary: 25% (default)
//! - Location: 20% (default)
//! - Company: 10% (default)
//! - Recency: 5% (default)

mod cache;
mod company_normalization;
mod components;
mod remote;
mod synonyms;

pub use cache::{
    clear_score_cache, get_cached_score, invalidate_job, invalidate_resume, score_cache_stats,
    set_cached_score, ScoreCacheKey, ScoreCacheStats,
};
pub use jobsentinel_domain::ScoringConfig;
pub use jobsentinel_intelligence::{JobScore, ScoreBreakdown};
pub use remote::{detect_remote_status, score_remote_match, RemoteStatus, UserRemotePreference};
pub use synonyms::SynonymMap;

use crate::config::Config;
use chrono::Utc;
use company_normalization::company_suffix_patterns;
use jobsentinel_domain::Job;
use jobsentinel_storage::Database;
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

    for suffix in company_suffix_patterns() {
        if let Some(stripped) = result.strip_suffix(suffix.as_str()) {
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
type ScoreComponent = (f64, Vec<String>);

/// Scoring engine
pub struct ScoringEngine {
    config: Arc<Config>,
    scoring_config: ScoringConfig,
    synonym_map: SynonymMap,
    database: Option<Arc<Database>>,
}

impl ScoringEngine {
    #[must_use]
    pub fn new(config: Arc<Config>) -> Self {
        Self {
            config,
            scoring_config: ScoringConfig::default(),
            synonym_map: SynonymMap::new(),
            database: None,
        }
    }

    /// Create a new scoring engine with database support (for resume matching)
    #[must_use]
    pub fn with_database(config: Arc<Config>, database: Arc<Database>) -> Self {
        Self {
            config,
            scoring_config: ScoringConfig::default(),
            synonym_map: SynonymMap::new(),
            database: Some(database),
        }
    }

    /// Create a new scoring engine with a custom synonym map
    #[must_use]
    pub fn with_synonym_map(config: Arc<Config>, synonym_map: SynonymMap) -> Self {
        Self {
            config,
            scoring_config: ScoringConfig::default(),
            synonym_map,
            database: None,
        }
    }

    /// Create a new scoring engine with database and custom synonym map
    #[must_use]
    pub fn with_database_and_synonym_map(
        config: Arc<Config>,
        database: Arc<Database>,
        synonym_map: SynonymMap,
    ) -> Self {
        Self {
            config,
            scoring_config: ScoringConfig::default(),
            synonym_map,
            database: Some(database),
        }
    }

    /// Create a new scoring engine with custom scoring config
    #[must_use]
    pub fn with_scoring_config(config: Arc<Config>, scoring_config: ScoringConfig) -> Self {
        Self {
            config,
            scoring_config,
            synonym_map: SynonymMap::new(),
            database: None,
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

        Self::build_job_score(
            job.id,
            skills_score,
            salary_score,
            location_score,
            company_score,
            recency_score,
        )
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
            if let Some(ref database) = self.database {
                match self.score_skills_with_resume(job, database).await {
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

        Self::build_job_score(
            job.id,
            skills_score,
            salary_score,
            location_score,
            company_score,
            recency_score,
        )
    }

    fn build_job_score(
        job_id: i64,
        skills_score: ScoreComponent,
        salary_score: ScoreComponent,
        location_score: ScoreComponent,
        company_score: ScoreComponent,
        recency_score: ScoreComponent,
    ) -> JobScore {
        let raw_total =
            skills_score.0 + salary_score.0 + location_score.0 + company_score.0 + recency_score.0;

        let total = if raw_total > 1.0 {
            tracing::warn!(
                "Job score {} exceeded 1.0 ({:.4}), clamping. This may indicate a scoring bug.",
                job_id,
                raw_total
            );
            raw_total.clamp(0.0, 1.0)
        } else if raw_total < 0.0 {
            tracing::warn!(
                "Job score {} was negative ({:.4}), clamping. This may indicate a scoring bug.",
                job_id,
                raw_total
            );
            0.0
        } else {
            raw_total
        };

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
        database: &Database,
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
        let matcher = database.resume_matcher();

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

    /// Check if job meets immediate alert threshold
    #[must_use]
    pub fn should_alert_immediately(&self, score: &JobScore) -> bool {
        score.total >= self.config.immediate_alert_threshold
    }
}

#[cfg(test)]
mod tests;
