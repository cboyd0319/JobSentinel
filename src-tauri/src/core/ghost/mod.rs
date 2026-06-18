//! Ghost Job Detection v2 (ML-Enhanced)
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
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::sync::LazyLock;

const JOB_POSTING_RISK_TAXONOMY_JSON: &str =
    include_str!("../../../../src/shared/jobPostingRiskTaxonomy.json");

static JOB_POSTING_RISK_TAXONOMY: LazyLock<JobPostingRiskTaxonomy> =
    LazyLock::new(load_job_posting_risk_taxonomy);

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct JobPostingRiskTaxonomy {
    schema_version: u32,
    generic_phrases: Vec<String>,
    vague_title_patterns: Vec<String>,
    unrealistic_requirement_patterns: Vec<String>,
    urgency_patterns: Vec<String>,
    promotional_patterns: Vec<String>,
    substance_keywords: Vec<String>,
    fluff_keywords: Vec<String>,
    ghost_templates: Vec<String>,
}

fn load_job_posting_risk_taxonomy() -> JobPostingRiskTaxonomy {
    let taxonomy: JobPostingRiskTaxonomy =
        match serde_json::from_str(JOB_POSTING_RISK_TAXONOMY_JSON) {
            Ok(taxonomy) => taxonomy,
            Err(error) => panic!("job posting risk taxonomy must be valid JSON: {error}"),
        };

    assert_eq!(
        taxonomy.schema_version, 1,
        "unsupported job posting risk taxonomy schema version"
    );

    taxonomy
}

fn compile_case_insensitive_patterns(patterns: &[String], label: &str) -> Vec<Regex> {
    patterns
        .iter()
        .map(|pattern| {
            let case_insensitive_pattern = format!("(?i){pattern}");
            match Regex::new(&case_insensitive_pattern) {
                Ok(regex) => regex,
                Err(error) => panic!("invalid {label} regex pattern {pattern:?}: {error}"),
            }
        })
        .collect()
}

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

/// Lazy-initialized regex patterns for generic phrases
static GENERIC_PHRASES: LazyLock<Vec<Regex>> = LazyLock::new(|| {
    compile_case_insensitive_patterns(&JOB_POSTING_RISK_TAXONOMY.generic_phrases, "generic phrase")
});

/// Lazy-initialized regex patterns for vague job titles
static VAGUE_TITLES: LazyLock<Vec<Regex>> = LazyLock::new(|| {
    compile_case_insensitive_patterns(
        &JOB_POSTING_RISK_TAXONOMY.vague_title_patterns,
        "vague title",
    )
});

/// Lazy-initialized regex patterns for unrealistic requirements
static UNREALISTIC_PATTERNS: LazyLock<Vec<Regex>> = LazyLock::new(|| {
    compile_case_insensitive_patterns(
        &JOB_POSTING_RISK_TAXONOMY.unrealistic_requirement_patterns,
        "unrealistic requirement",
    )
});

// ==================== ML-Enhanced Patterns (v2.5.5) ====================

/// Urgency signals that indicate pressure-style wording
static URGENCY_PATTERNS: LazyLock<Vec<Regex>> = LazyLock::new(|| {
    compile_case_insensitive_patterns(&JOB_POSTING_RISK_TAXONOMY.urgency_patterns, "urgency")
});

/// Promotional wording patterns (sentiment signal)
static PROMOTIONAL_PATTERNS: LazyLock<Vec<Regex>> = LazyLock::new(|| {
    compile_case_insensitive_patterns(
        &JOB_POSTING_RISK_TAXONOMY.promotional_patterns,
        "promotional",
    )
});

/// Substance keywords - terms that indicate real job content
static SUBSTANCE_KEYWORDS: LazyLock<Vec<String>> =
    LazyLock::new(|| JOB_POSTING_RISK_TAXONOMY.substance_keywords.clone());

/// Fluff keywords - terms that add no substance
static FLUFF_KEYWORDS: LazyLock<Vec<String>> =
    LazyLock::new(|| JOB_POSTING_RISK_TAXONOMY.fluff_keywords.clone());

/// Known ghost job patterns (template-like descriptions)
static GHOST_TEMPLATES: LazyLock<Vec<String>> =
    LazyLock::new(|| JOB_POSTING_RISK_TAXONOMY.ghost_templates.clone());

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

    /// Calculate weight for stale listing based on age
    fn calculate_stale_weight(&self, age_days: i64) -> f64 {
        // Progressive weight: 60 days = 0.1, 90 days = 0.2, 120+ days = 0.3
        if age_days >= 120 {
            0.3
        } else if age_days >= 90 {
            0.2
        } else if age_days >= self.config.stale_threshold_days {
            0.1
        } else {
            0.0
        }
    }

    /// Calculate decay factor for repost weight based on age
    ///
    /// Reduces weight for older reposts to account for historical data:
    /// - < 90 days: 1.0 (full weight)
    /// - 90-180 days: 0.5 (half weight)
    /// - > 180 days: 0.25 (quarter weight)
    fn calculate_repost_decay_factor(&self, age_days: i64) -> f64 {
        if age_days < 90 {
            1.0 // Recent repeated sightings carry full weight
        } else if age_days < 180 {
            0.5 // Older reposts less concerning (may be historical data)
        } else {
            0.25 // Very old reposts carry minimal weight
        }
    }

    /// Count generic/buzzword phrases in description
    fn count_generic_phrases(&self, description: &str) -> usize {
        GENERIC_PHRASES
            .iter()
            .filter(|re| re.is_match(description))
            .count()
    }

    /// Check for missing important details
    fn check_missing_details(
        &self,
        description: &str,
        salary_min: Option<i64>,
        salary_max: Option<i64>,
        location: Option<&str>,
        remote: Option<bool>,
    ) -> Vec<&'static str> {
        let mut missing = Vec::new();
        let desc_lower = description.to_lowercase();

        // Check for missing salary (only if configured to penalize)
        if self.config.penalize_missing_salary
            && salary_min.is_none()
            && salary_max.is_none()
            && !desc_lower.contains("salary")
            && !description.contains('$')
            && !desc_lower.contains("compensation")
        {
            missing.push("salary information");
        }

        // Check for vague responsibilities (no bullet points or clear structure)
        if !description.contains('\u{2022}') // bullet point
            && !description.contains('-')
            && !description.contains('*')
            && description.len() > 100
        {
            // Likely a wall of text without clear structure
            missing.push("clear responsibilities");
        }

        // Check for missing location when not explicitly remote
        if location.is_none() && remote != Some(true) {
            missing.push("location");
        }

        missing
    }

    /// Check for unrealistic experience requirements
    fn has_unrealistic_requirements(&self, title: &str, description: &str) -> bool {
        let combined = format!("{title} {description}");
        UNREALISTIC_PATTERNS.iter().any(|re| re.is_match(&combined))
    }

    /// Check for vague/generic job titles
    fn has_vague_title(&self, title: &str) -> bool {
        VAGUE_TITLES.iter().any(|re| re.is_match(title))
    }

    /// Calculate analysis confidence based on data availability
    fn calculate_confidence(
        &self,
        desc_len: usize,
        salary_min: Option<i64>,
        salary_max: Option<i64>,
        location: Option<&str>,
    ) -> f64 {
        let mut confidence: f64 = 0.5; // Base confidence

        // More description = higher confidence
        if desc_len > 500 {
            confidence += 0.2;
        } else if desc_len > 200 {
            confidence += 0.1;
        }

        // Salary data available = higher confidence
        if salary_min.is_some() || salary_max.is_some() {
            confidence += 0.15;
        }

        // Location data available = higher confidence
        if location.is_some() {
            confidence += 0.15;
        }

        confidence.min(1.0)
    }

    // ==================== ML-Enhanced Methods (v2.5.5) ====================

    /// Count urgency-style wording patterns
    fn count_urgency_patterns(&self, text: &str) -> usize {
        URGENCY_PATTERNS
            .iter()
            .filter(|re| re.is_match(text))
            .count()
    }

    /// Count promotional/overly positive language
    fn count_promotional_patterns(&self, text: &str) -> usize {
        PROMOTIONAL_PATTERNS
            .iter()
            .filter(|re| re.is_match(text))
            .count()
    }

    /// Calculate substance-to-fluff ratio (higher = more substance)
    fn calculate_substance_ratio(&self, text: &str) -> f64 {
        let text_lower = text.to_lowercase();

        // Check if text has any words
        if text_lower.split_whitespace().next().is_none() {
            return 0.0;
        }

        let substance_count = SUBSTANCE_KEYWORDS
            .iter()
            .filter(|keyword| text_lower.contains(keyword.as_str()))
            .count();

        let fluff_count = FLUFF_KEYWORDS
            .iter()
            .filter(|keyword| text_lower.contains(keyword.as_str()))
            .count();

        // Avoid division by zero
        if fluff_count == 0 && substance_count == 0 {
            return 0.5; // Neutral
        }

        if fluff_count == 0 {
            return 1.0; // All substance
        }

        // Ratio: substance / (substance + fluff)
        substance_count as f64 / (substance_count + fluff_count) as f64
    }

    /// Calculate similarity to known low-detail posting patterns (TF-IDF style)
    fn calculate_template_similarity(&self, text: &str) -> f64 {
        let text_lower = text.to_lowercase();
        let mut matches = 0;
        let total = GHOST_TEMPLATES.len();

        for template in GHOST_TEMPLATES.iter() {
            if text_lower.contains(template.as_str()) {
                matches += 1;
            }
        }

        if total == 0 {
            return 0.0;
        }

        // Normalize to 0-1
        matches as f64 / total as f64
    }

    /// Apply sigmoid transformation for non-linear scoring
    /// This helps discriminate between borderline and clear cases
    fn sigmoid_transform(&self, score: f64) -> f64 {
        // Centered at 0.5 with moderate steepness
        // This amplifies differences near the decision boundary
        let k = 6.0; // Steepness
        let x0 = 0.4; // Center point
        1.0 / (1.0 + (-k * (score - x0)).exp())
    }

    /// Perform full ML-enhanced analysis
    pub fn analyze_enhanced(
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
        // Start with base analysis
        let mut base_analysis = self.analyze(
            title,
            description,
            salary_min,
            salary_max,
            location,
            remote,
            created_at,
            repost_count,
            company_open_jobs,
        );

        let description = description.unwrap_or("");
        if description.is_empty() {
            return base_analysis;
        }

        let combined_text = format!("{} {}", title, description);

        // === ML-Enhanced Signals ===

        // 1. Urgency-style wording
        let urgency_count = self.count_urgency_patterns(&combined_text);
        if urgency_count >= 2 {
            let weight = 0.08 * (urgency_count.min(4) as f64 / 4.0);
            base_analysis.reasons.push(GhostReason {
                category: GhostCategory::Generic,
                description: format!("{urgency_count} urgency-style phrases found"),
                weight,
                severity: if urgency_count >= 3 {
                    Severity::Medium
                } else {
                    Severity::Low
                },
            });
        }

        // 2. Promotional language (overly positive sentiment)
        let promotional_count = self.count_promotional_patterns(&combined_text);
        if promotional_count >= 2 {
            let weight = 0.1 * (promotional_count.min(4) as f64 / 4.0);
            base_analysis.reasons.push(GhostReason {
                category: GhostCategory::Generic,
                description: format!("promotional wording ({} phrases)", promotional_count),
                weight,
                severity: if promotional_count >= 3 {
                    Severity::Medium
                } else {
                    Severity::Low
                },
            });
        }

        // 3. Low substance-to-fluff ratio
        let substance_ratio = self.calculate_substance_ratio(description);
        if substance_ratio < 0.3 && description.len() > 200 {
            let weight = 0.12 * (1.0 - substance_ratio);
            base_analysis.reasons.push(GhostReason {
                category: GhostCategory::MissingDetails,
                description: format!(
                    "Limited concrete detail ({:.0}% actionable content)",
                    substance_ratio * 100.0
                ),
                weight,
                severity: if substance_ratio < 0.15 {
                    Severity::Medium
                } else {
                    Severity::Low
                },
            });
        }

        // 4. High template similarity
        let template_sim = self.calculate_template_similarity(&combined_text);
        if template_sim >= 0.3 {
            let weight = 0.15 * template_sim;
            base_analysis.reasons.push(GhostReason {
                category: GhostCategory::Generic,
                description: format!(
                    "Similar to repeated low-detail posting patterns ({:.0}% match)",
                    template_sim * 100.0
                ),
                weight,
                severity: if template_sim >= 0.5 {
                    Severity::High
                } else {
                    Severity::Medium
                },
            });
        }

        // Recalculate total score with all signals
        let raw_score: f64 = base_analysis.reasons.iter().map(|r| r.weight).sum();

        // Apply sigmoid transformation for better discrimination
        base_analysis.score = self.sigmoid_transform(raw_score.min(1.0));

        // Boost confidence for ML-enhanced analysis
        base_analysis.confidence = (base_analysis.confidence + 0.1).min(1.0);

        base_analysis
    }
}

#[cfg(test)]
mod tests;
