//! Pure job-posting quality analysis for JobSentinel.
//!
//! Identifies stale, low-detail, or hard-to-verify job listings using multiple signals
//! combined with ML-like scoring algorithms:
//!
//! ## Core Signals
//! - **Stale listings**: Jobs posted 60+ days ago
//! - **Reposted jobs**: Same job appearing multiple times (evergreen postings)
//! - **Generic content**: Buzzword-heavy descriptions with no substance
//! - **Missing details**: Vague responsibilities, no salary, unclear requirements
//! - **Unrealistic requirements**: Entry-level with 10+ years experience
//! - **Employer patterns**: Companies with many open postings in local data
//!
//! ## ML-Enhanced Features (v2.5.5)
//! - **Substance-to-fluff ratio**: Measures actionable content vs. buzzwords
//! - **Urgency signals**: Detects pressure-style urgency wording
//! - **Sentiment analysis**: Identifies overly promotional language
//! - **Pattern matching**: TF-IDF style matching against low-detail patterns
//! - **Sigmoid scoring**: Non-linear weight combination for better discrimination
//!
//! # Example
//!
//! ```ignore
//! let detector = GhostDetector::new(GhostConfig::default());
//! let analysis = detector.analyze(&job, repost_count, company_open_jobs);
//! if analysis.score >= 0.5 {
//!     println!("Posting needs review: {:?}", analysis.reasons);
//! }
//! ```

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

mod patterns;
mod scoring;

pub use scoring::{JobScore, ScoreBreakdown};

/// Ghost detection result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GhostAnalysis {
    /// Ghost score (0.0 = likely real, 1.0 = likely ghost)
    pub score: f64,
    /// Reasons that contributed to the ghost score
    pub reasons: Vec<GhostReason>,
    /// Confidence level of the analysis (0.0 - 1.0)
    pub confidence: f64,
}

/// Individual ghost signal detection
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GhostReason {
    /// Signal category
    pub category: GhostCategory,
    /// Human-readable description
    pub description: String,
    /// Weight contribution to total score (0.0 - 1.0)
    pub weight: f64,
    /// Severity level
    pub severity: Severity,
}

/// Categories of ghost job signals
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum GhostCategory {
    /// Job posted too long ago
    Stale,
    /// Same job reposted multiple times
    Repost,
    /// Generic/template description
    Generic,
    /// Missing key details
    MissingDetails,
    /// Unrealistic requirements
    Unrealistic,
    /// Employer posting pattern
    CompanyBehavior,
}

/// Severity of the ghost signal
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Severity {
    Low,
    Medium,
    High,
}

/// Ghost detection engine configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GhostConfig {
    /// Days after which a job is considered stale
    pub stale_threshold_days: i64,
    /// Repeated posting count threshold for review
    pub repost_threshold: i64,
    /// Minimum description length (chars) - below this needs review
    pub min_description_length: usize,
    /// Whether to penalize missing salary
    pub penalize_missing_salary: bool,
    /// Ghost score threshold for warning (0.0 - 1.0)
    pub warning_threshold: f64,
    /// Ghost score threshold for hiding by default (0.0 - 1.0)
    pub hide_threshold: f64,
}

impl Default for GhostConfig {
    fn default() -> Self {
        Self {
            stale_threshold_days: 60,
            repost_threshold: 3,
            min_description_length: 200,
            penalize_missing_salary: false, // Many real jobs don't list salary
            warning_threshold: 0.3,
            hide_threshold: 0.7,
        }
    }
}

/// Ghost job detection engine
pub struct GhostDetector {
    config: GhostConfig,
}

impl GhostDetector {
    /// Create a new ghost detector with the given configuration
    #[must_use]
    pub fn new(config: GhostConfig) -> Self {
        Self { config }
    }

    /// Analyze a job for ghost indicators
    ///
    /// # Arguments
    /// * `title` - Job title
    /// * `description` - Job description (optional)
    /// * `salary_min` - Minimum salary (optional)
    /// * `salary_max` - Maximum salary (optional)
    /// * `location` - Job location (optional)
    /// * `remote` - Whether job is remote (optional)
    /// * `created_at` - When the job was first seen
    /// * `repost_count` - Number of times this job has been reposted
    /// * `company_open_jobs` - Number of open jobs at this company
    #[allow(clippy::too_many_arguments)]
    pub fn analyze(
        &self,
        title: &str,
        description: Option<&str>,
        salary_min: Option<i64>,
        salary_max: Option<i64>,
        location: Option<&str>,
        remote: Option<bool>,
        created_at: DateTime<Utc>,
        repost_count: i64,
        company_open_jobs: i64,
    ) -> GhostAnalysis {
        let mut reasons = Vec::new();
        let mut total_weight = 0.0;

        let description = description.unwrap_or("");
        let title_lower = title.to_lowercase();

        // === Age-based signals ===

        // 1. Stale listing (posted 60+ days ago)
        let age_days = Utc::now().signed_duration_since(created_at).num_days();
        if age_days >= self.config.stale_threshold_days {
            let weight = self.calculate_stale_weight(age_days);
            reasons.push(GhostReason {
                category: GhostCategory::Stale,
                description: format!("Posted {age_days} days ago"),
                weight,
                severity: if age_days > 90 {
                    Severity::High
                } else {
                    Severity::Medium
                },
            });
            total_weight += weight;
        }

        // 2. Reposted multiple times (with age-based decay)
        if repost_count >= self.config.repost_threshold {
            let base_weight = 0.15 * (f64::from(repost_count.min(10) as i32) / 10.0);

            // Apply age-based decay: reposts older than 6 months have reduced weight
            let decay_factor = self.calculate_repost_decay_factor(age_days);
            let weight = base_weight * decay_factor;

            let description = if decay_factor < 1.0 {
                format!("Repeated posting seen {repost_count} times (older sighting)")
            } else {
                format!("Repeated posting seen {repost_count} times")
            };

            reasons.push(GhostReason {
                category: GhostCategory::Repost,
                description,
                weight,
                severity: if repost_count > 5 {
                    Severity::High
                } else {
                    Severity::Medium
                },
            });
            total_weight += weight;
        }

        // === Content-based signals ===

        // 3. Generic/template descriptions
        let generic_count = self.count_generic_phrases(description);
        if generic_count >= 3 {
            let weight = 0.1 * (f64::from(generic_count.min(6) as u32) / 6.0);
            reasons.push(GhostReason {
                category: GhostCategory::Generic,
                description: format!("{generic_count} low-detail phrases found"),
                weight,
                severity: if generic_count > 5 {
                    Severity::Medium
                } else {
                    Severity::Low
                },
            });
            total_weight += weight;
        }

        // 4. Missing key details
        let missing_details =
            self.check_missing_details(description, salary_min, salary_max, location, remote);
        if !missing_details.is_empty() {
            let weight = 0.05 * missing_details.len() as f64;
            let weight = weight.min(0.15);
            reasons.push(GhostReason {
                category: GhostCategory::MissingDetails,
                description: format!("Missing details: {}", missing_details.join(", ")),
                weight,
                severity: if missing_details.len() > 2 {
                    Severity::Medium
                } else {
                    Severity::Low
                },
            });
            total_weight += weight;
        }

        // 5. Unrealistic requirements
        if self.has_unrealistic_requirements(&title_lower, description) {
            reasons.push(GhostReason {
                category: GhostCategory::Unrealistic,
                description: "Unusual experience requirement".to_string(),
                weight: 0.2,
                severity: Severity::High,
            });
            total_weight += 0.2;
        }

        // 6. Broad or unclear title
        if self.has_vague_title(title) {
            reasons.push(GhostReason {
                category: GhostCategory::Generic,
                description: "Broad or unclear job title".to_string(),
                weight: 0.25,
                severity: Severity::High,
            });
            total_weight += 0.25;
        }

        // 7. Too short description
        if !description.is_empty() && description.len() < self.config.min_description_length {
            reasons.push(GhostReason {
                category: GhostCategory::MissingDetails,
                description: format!("Short posting description ({} chars)", description.len()),
                weight: 0.1,
                severity: Severity::Low,
            });
            total_weight += 0.1;
        }

        // === Company behavior signals ===

        // 8. Company has many open positions (potential mass hiring or ghost postings)
        if company_open_jobs > 50 {
            let weight = 0.05 * (f64::from((company_open_jobs - 50).min(100) as i32) / 100.0);
            reasons.push(GhostReason {
                category: GhostCategory::CompanyBehavior,
                description: format!("Employer has {company_open_jobs} open postings in this data"),
                weight,
                severity: Severity::Low,
            });
            total_weight += weight;
        }

        // Calculate final score (capped at 1.0)
        let score = total_weight.min(1.0);

        // Calculate confidence based on data availability
        let confidence =
            self.calculate_confidence(description.len(), salary_min, salary_max, location);

        GhostAnalysis {
            score,
            reasons,
            confidence,
        }
    }
}

mod analysis;

#[cfg(test)]
mod tests;
