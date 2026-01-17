//! Ghost Job Detection
//!
//! Identifies fake, stale, or misleading job listings using multiple signals:
//!
//! - **Stale listings**: Jobs posted 60+ days ago
//! - **Reposted jobs**: Same job appearing multiple times (evergreen postings)
//! - **Generic content**: Buzzword-heavy descriptions with no substance
//! - **Missing details**: Vague responsibilities, no salary, unclear requirements
//! - **Unrealistic requirements**: Entry-level with 10+ years experience
//! - **Company behavior**: Companies with 50+ perpetually open positions
//!
//! # Example
//!
//! ```ignore
//! let detector = GhostDetector::new(GhostConfig::default());
//! let analysis = detector.analyze(&job, repost_count, company_open_jobs);
//! if analysis.score >= 0.5 {
//!     println!("Likely ghost job: {:?}", analysis.reasons);
//! }
//! ```

use chrono::{DateTime, Utc};
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::sync::LazyLock;

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
    /// Suspicious company behavior
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
    /// Repost count threshold for suspicion
    pub repost_threshold: i64,
    /// Minimum description length (chars) - below this is suspicious
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
    [
        r"fast[- ]paced environment",
        r"work hard[,]? play hard",
        r"like a family",
        r"wear many hats",
        r"self[- ]starter",
        r"rockstar",
        r"\bninja\b",
        r"\bguru\b",
        r"\bwizard\b",
        r"dynamic environment",
        r"competitive compensation",
        r"great benefits",
        r"exciting opportunity",
        r"growing company",
        r"make an impact",
        r"hit the ground running",
        r"synergy",
        r"disrupt(ive|or|ion)?",
        r"passionate about",
        r"team player",
    ]
    .iter()
    .filter_map(|p| Regex::new(&format!(r"(?i){p}")).ok())
    .collect()
});

/// Lazy-initialized regex patterns for vague job titles
static VAGUE_TITLES: LazyLock<Vec<Regex>> = LazyLock::new(|| {
    [
        r"^various\s+(positions?|roles?)",
        r"^multiple\s+(positions?|openings?)",
        r"^(general|open)\s+application",
        r"talent\s+pool",
        r"future\s+opportunities?",
        r"^(we'?re|we are)\s+hiring",
        r"join\s+(our|the)\s+team",
    ]
    .iter()
    .filter_map(|p| Regex::new(&format!(r"(?i){p}")).ok())
    .collect()
});

/// Lazy-initialized regex patterns for unrealistic requirements
static UNREALISTIC_PATTERNS: LazyLock<Vec<Regex>> = LazyLock::new(|| {
    [
        // Entry level + many years experience
        r"entry[- ]level.*(\d{2,})\+?\s*(years?|yrs?)",
        r"junior.*(\d{2,})\+?\s*(years?|yrs?)",
        // Associate + senior-level years
        r"associate.*(\d{7,})\+?\s*(years?|yrs?)",
        // New grad + experience
        r"(new|recent)\s+grad(uate)?.*(\d{3,})\+?\s*(years?|yrs?)",
    ]
    .iter()
    .filter_map(|p| Regex::new(&format!(r"(?i){p}")).ok())
    .collect()
});

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

        // 2. Reposted multiple times
        if repost_count >= self.config.repost_threshold {
            let weight = 0.15 * (f64::from(repost_count.min(10) as i32) / 10.0);
            reasons.push(GhostReason {
                category: GhostCategory::Repost,
                description: format!("Reposted {repost_count} times"),
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
                description: format!("{generic_count} generic phrases detected"),
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
                description: format!("Missing: {}", missing_details.join(", ")),
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
                description: "Unrealistic experience requirements".to_string(),
                weight: 0.2,
                severity: Severity::High,
            });
            total_weight += 0.2;
        }

        // 6. Vague/suspicious title
        if self.has_vague_title(title) {
            reasons.push(GhostReason {
                category: GhostCategory::Generic,
                description: "Vague or generic job title".to_string(),
                weight: 0.25,
                severity: Severity::High,
            });
            total_weight += 0.25;
        }

        // 7. Too short description
        if !description.is_empty() && description.len() < self.config.min_description_length {
            reasons.push(GhostReason {
                category: GhostCategory::MissingDetails,
                description: format!("Very short description ({} chars)", description.len()),
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
                description: format!("Company has {company_open_jobs} open positions"),
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
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_job_created_at(days_ago: i64) -> DateTime<Utc> {
        Utc::now() - chrono::Duration::days(days_ago)
    }

    #[test]
    fn test_fresh_job_low_ghost_score() {
        let detector = GhostDetector::new(GhostConfig::default());
        let created_at = create_test_job_created_at(5); // 5 days ago

        let analysis = detector.analyze(
            "Senior Software Engineer",
            Some(
                "We are looking for a Senior Software Engineer to join our team. \
                 You will be responsible for designing and implementing software solutions. \
                 Requirements: - 5+ years of experience - Strong Python skills - Experience with distributed systems",
            ),
            Some(150000),
            Some(200000),
            Some("San Francisco, CA"),
            Some(false),
            created_at,
            0, // no reposts
            10, // small company
        );

        assert!(
            analysis.score < 0.3,
            "Fresh job with good details should have low ghost score, got {}",
            analysis.score
        );
    }

    #[test]
    fn test_stale_job_increases_score() {
        let detector = GhostDetector::new(GhostConfig::default());
        let created_at = create_test_job_created_at(90); // 90 days ago

        let analysis = detector.analyze(
            "Software Engineer",
            Some("A normal job description that is reasonably long."),
            None,
            None,
            Some("Remote"),
            Some(true),
            created_at,
            0,
            10,
        );

        assert!(
            analysis.score >= 0.2,
            "90-day old job should have ghost score >= 0.2, got {}",
            analysis.score
        );
        assert!(analysis
            .reasons
            .iter()
            .any(|r| r.category == GhostCategory::Stale));
    }

    #[test]
    fn test_repost_increases_score() {
        let detector = GhostDetector::new(GhostConfig::default());
        let created_at = create_test_job_created_at(5);

        let analysis = detector.analyze(
            "Software Engineer",
            Some("A normal job description."),
            None,
            None,
            Some("NYC"),
            None,
            created_at,
            5, // reposted 5 times
            10,
        );

        assert!(
            analysis.score >= 0.07,
            "Job reposted 5 times should have increased ghost score, got {}",
            analysis.score
        );
        assert!(analysis
            .reasons
            .iter()
            .any(|r| r.category == GhostCategory::Repost));
    }

    #[test]
    fn test_generic_phrases_detected() {
        let detector = GhostDetector::new(GhostConfig::default());
        let created_at = create_test_job_created_at(5);

        let analysis = detector.analyze(
            "Software Engineer",
            Some(
                "We're looking for a rockstar ninja who can hit the ground running \
                 in our fast-paced environment. We work hard play hard and are like a family. \
                 Must be a self-starter passionate about making an impact.",
            ),
            None,
            None,
            Some("Remote"),
            Some(true),
            created_at,
            0,
            10,
        );

        assert!(analysis
            .reasons
            .iter()
            .any(|r| r.category == GhostCategory::Generic));
    }

    #[test]
    fn test_vague_title_high_score() {
        let detector = GhostDetector::new(GhostConfig::default());
        let created_at = create_test_job_created_at(5);

        let analysis = detector.analyze(
            "Various Positions Available",
            Some("We're hiring for multiple roles. Apply now!"),
            None,
            None,
            None,
            None,
            created_at,
            0,
            10,
        );

        assert!(
            analysis.score >= 0.25,
            "Vague title should have high ghost score, got {}",
            analysis.score
        );
    }

    #[test]
    fn test_unrealistic_requirements() {
        let detector = GhostDetector::new(GhostConfig::default());
        let created_at = create_test_job_created_at(5);

        let analysis = detector.analyze(
            "Junior Developer",
            Some("Entry-level position requiring 10+ years of experience with React and Node.js."),
            None,
            None,
            Some("NYC"),
            None,
            created_at,
            0,
            10,
        );

        assert!(analysis
            .reasons
            .iter()
            .any(|r| r.category == GhostCategory::Unrealistic));
    }

    #[test]
    fn test_company_with_many_open_jobs() {
        let detector = GhostDetector::new(GhostConfig::default());
        let created_at = create_test_job_created_at(5);

        let analysis = detector.analyze(
            "Software Engineer",
            Some("A normal job description with good details."),
            Some(100000),
            Some(150000),
            Some("NYC"),
            None,
            created_at,
            0,
            100, // company has 100 open positions
        );

        assert!(analysis
            .reasons
            .iter()
            .any(|r| r.category == GhostCategory::CompanyBehavior));
    }

    #[test]
    fn test_combined_signals_add_up() {
        let detector = GhostDetector::new(GhostConfig::default());
        let created_at = create_test_job_created_at(120); // 120 days old

        let analysis = detector.analyze(
            "Various Positions", // vague title
            Some("Fast-paced environment. Work hard play hard. Like a family."), // short + generic
            None,                // no salary
            None,
            None, // no location
            None,
            created_at,
            6,  // reposted 6 times
            60, // many open positions
        );

        assert!(
            analysis.score >= 0.5,
            "Job with multiple ghost signals should have high score, got {}",
            analysis.score
        );
        assert!(
            analysis.reasons.len() >= 3,
            "Should have multiple reasons, got {}",
            analysis.reasons.len()
        );
    }

    #[test]
    fn test_score_capped_at_one() {
        let detector = GhostDetector::new(GhostConfig::default());
        let created_at = create_test_job_created_at(200); // very old

        let analysis = detector.analyze(
            "Join Our Team!!!", // vague
            Some(
                "We want passionate rockstars who can hit the ground running in our fast-paced, \
                  dynamic environment. We're like a family and work hard play hard!",
            ), // very generic
            None,
            None,
            None,
            None,
            created_at,
            10,  // many reposts
            200, // tons of open positions
        );

        assert!(
            analysis.score <= 1.0,
            "Ghost score should be capped at 1.0, got {}",
            analysis.score
        );
    }

    #[test]
    fn test_confidence_increases_with_data() {
        let detector = GhostDetector::new(GhostConfig::default());
        let created_at = create_test_job_created_at(5);

        // Minimal data
        let analysis_minimal = detector.analyze(
            "Engineer",
            Some("Job."),
            None,
            None,
            None,
            None,
            created_at,
            0,
            10,
        );

        // Full data
        let analysis_full = detector.analyze(
            "Senior Software Engineer",
            Some(&"x".repeat(600)), // long description
            Some(150000),
            Some(200000),
            Some("NYC"),
            Some(false),
            created_at,
            0,
            10,
        );

        assert!(
            analysis_full.confidence > analysis_minimal.confidence,
            "More data should increase confidence: {} vs {}",
            analysis_full.confidence,
            analysis_minimal.confidence
        );
    }
}
