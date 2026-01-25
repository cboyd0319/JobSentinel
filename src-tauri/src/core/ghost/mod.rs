//! Ghost Job Detection v2 (ML-Enhanced)
//!
//! Identifies fake, stale, or misleading job listings using multiple signals
//! combined with ML-like scoring algorithms:
//!
//! ## Core Signals
//! - **Stale listings**: Jobs posted 60+ days ago
//! - **Reposted jobs**: Same job appearing multiple times (evergreen postings)
//! - **Generic content**: Buzzword-heavy descriptions with no substance
//! - **Missing details**: Vague responsibilities, no salary, unclear requirements
//! - **Unrealistic requirements**: Entry-level with 10+ years experience
//! - **Company behavior**: Companies with 50+ perpetually open positions
//!
//! ## ML-Enhanced Features (v2.5.5)
//! - **Substance-to-fluff ratio**: Measures actionable content vs. buzzwords
//! - **Urgency signals**: Detects fake urgency patterns
//! - **Sentiment analysis**: Identifies overly promotional language
//! - **Pattern matching**: TF-IDF style matching against known ghost patterns
//! - **Sigmoid scoring**: Non-linear weight combination for better discrimination
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

// ==================== ML-Enhanced Patterns (v2.5.5) ====================

/// Urgency signals that indicate fake pressure tactics
static URGENCY_PATTERNS: LazyLock<Vec<Regex>> = LazyLock::new(|| {
    [
        r"(urgent|immediately|asap|right\s+away)",
        r"(hiring\s+now|start\s+immediately)",
        r"(don'?t\s+miss|limited\s+time)",
        r"(act\s+fast|apply\s+today)",
        r"(positions?\s+filling\s+fast)",
        r"(won'?t\s+last\s+long)",
        r"(immediate\s+opening)",
        r"(interview\s+this\s+week)",
    ]
    .iter()
    .filter_map(|p| Regex::new(&format!(r"(?i){p}")).ok())
    .collect()
});

/// Overly promotional language (sentiment signal)
static PROMOTIONAL_PATTERNS: LazyLock<Vec<Regex>> = LazyLock::new(|| {
    [
        r"(amazing|incredible|unbelievable)\s+(opportunity|role|position)",
        r"(dream\s+job|once\s+in\s+a\s+lifetime)",
        r"(best|top|leading)\s+company\s+in",
        r"(change\s+your\s+life|life[- ]changing)",
        r"(unlimited\s+(potential|growth|earning))",
        r"(world[- ]class|cutting[- ]edge|revolutionary)",
        r"(groundbreaking|trailblazing)",
        r"(skyrocket|explosive\s+growth)",
    ]
    .iter()
    .filter_map(|p| Regex::new(&format!(r"(?i){p}")).ok())
    .collect()
});

/// Substance keywords - terms that indicate real job content
static SUBSTANCE_KEYWORDS: LazyLock<Vec<&'static str>> = LazyLock::new(|| {
    vec![
        // Technical terms
        "api",
        "database",
        "server",
        "client",
        "architecture",
        "design",
        "implement",
        "build",
        "develop",
        "test",
        "deploy",
        "maintain",
        "debug",
        "optimize",
        "integrate",
        "scale",
        "monitor",
        "automate",
        "document",
        "review",
        // Specific technologies (sampled - these indicate real requirements)
        "python",
        "java",
        "javascript",
        "typescript",
        "rust",
        "go",
        "sql",
        "react",
        "angular",
        "vue",
        "node",
        "docker",
        "kubernetes",
        "aws",
        "azure",
        "gcp",
        "linux",
        "git",
        "ci/cd",
        "agile",
        "scrum",
        // Business substance
        "revenue",
        "customers",
        "users",
        "stakeholders",
        "deliverables",
        "deadline",
        "milestone",
        "sprint",
        "roadmap",
        "specification",
        "requirement",
        "analysis",
        "report",
        "metrics",
        "kpi",
    ]
});

/// Fluff keywords - terms that add no substance
static FLUFF_KEYWORDS: LazyLock<Vec<&'static str>> = LazyLock::new(|| {
    vec![
        // Generic positivity
        "exciting",
        "amazing",
        "incredible",
        "wonderful",
        "fantastic",
        "thrilling",
        "dynamic",
        "vibrant",
        "energetic",
        "passionate",
        // Empty promises
        "competitive",
        "attractive",
        "generous",
        "excellent",
        "outstanding",
        "exceptional",
        "world-class",
        "best-in-class",
        "top-tier",
        // Meaningless descriptors
        "synergy",
        "leverage",
        "optimize",
        "maximize",
        "streamline",
        "holistic",
        "innovative",
        "cutting-edge",
        "state-of-the-art",
        "next-generation",
        "game-changing",
        "disruptive",
    ]
});

/// Known ghost job patterns (template-like descriptions)
static GHOST_TEMPLATES: LazyLock<Vec<&'static str>> = LazyLock::new(|| {
    vec![
        // Generic opener patterns
        "we are looking for a motivated",
        "seeking a talented individual",
        "join our growing team",
        "opportunity to work with",
        "looking for someone who",
        "ideal candidate will have",
        // Generic closer patterns
        "competitive salary and benefits",
        "great work environment",
        "room for growth",
        "make a difference",
        "be part of something",
    ]
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

        // 2. Reposted multiple times (with age-based decay)
        if repost_count >= self.config.repost_threshold {
            let base_weight = 0.15 * (f64::from(repost_count.min(10) as i32) / 10.0);

            // Apply age-based decay: reposts older than 6 months have reduced weight
            let decay_factor = self.calculate_repost_decay_factor(age_days);
            let weight = base_weight * decay_factor;

            let description = if decay_factor < 1.0 {
                format!("Reposted {repost_count} times (older repost)")
            } else {
                format!("Reposted {repost_count} times")
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

    /// Calculate decay factor for repost weight based on age
    ///
    /// Reduces weight for older reposts to account for historical data:
    /// - < 90 days: 1.0 (full weight)
    /// - 90-180 days: 0.5 (half weight)
    /// - > 180 days: 0.25 (quarter weight)
    fn calculate_repost_decay_factor(&self, age_days: i64) -> f64 {
        if age_days < 90 {
            1.0 // Recent reposts are highly suspicious
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

    /// Count urgency patterns (fake pressure tactics)
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
            .filter(|kw| text_lower.contains(*kw))
            .count();

        let fluff_count = FLUFF_KEYWORDS
            .iter()
            .filter(|kw| text_lower.contains(*kw))
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

    /// Calculate similarity to known ghost job templates (TF-IDF style)
    fn calculate_template_similarity(&self, text: &str) -> f64 {
        let text_lower = text.to_lowercase();
        let mut matches = 0;
        let total = GHOST_TEMPLATES.len();

        for template in GHOST_TEMPLATES.iter() {
            if text_lower.contains(template) {
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

        // 1. Urgency patterns (fake pressure)
        let urgency_count = self.count_urgency_patterns(&combined_text);
        if urgency_count >= 2 {
            let weight = 0.08 * (urgency_count.min(4) as f64 / 4.0);
            base_analysis.reasons.push(GhostReason {
                category: GhostCategory::Generic,
                description: format!("{} urgency pressure patterns detected", urgency_count),
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
                description: format!(
                    "Overly promotional language ({} patterns)",
                    promotional_count
                ),
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
                    "Low substance ratio ({:.0}% actionable content)",
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
                    "Matches ghost job templates ({:.0}% similarity)",
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
    fn test_repost_aging_reduces_weight() {
        let detector = GhostDetector::new(GhostConfig::default());

        // Recent repost (30 days old) - full weight
        let recent_created = create_test_job_created_at(30);
        let recent_analysis = detector.analyze(
            "Software Engineer",
            Some("A normal job description."),
            None,
            None,
            Some("NYC"),
            None,
            recent_created,
            5, // reposted 5 times
            10,
        );

        // Old repost (120 days old) - 50% weight
        let old_created = create_test_job_created_at(120);
        let old_analysis = detector.analyze(
            "Software Engineer",
            Some("A normal job description."),
            None,
            None,
            Some("NYC"),
            None,
            old_created,
            5, // reposted 5 times
            10,
        );

        // Very old repost (200 days old) - 25% weight
        let very_old_created = create_test_job_created_at(200);
        let very_old_analysis = detector.analyze(
            "Software Engineer",
            Some("A normal job description."),
            None,
            None,
            Some("NYC"),
            None,
            very_old_created,
            5, // reposted 5 times
            10,
        );

        // Get repost weights
        let recent_repost_weight = recent_analysis
            .reasons
            .iter()
            .find(|r| r.category == GhostCategory::Repost)
            .map(|r| r.weight)
            .expect("Should have repost reason");

        let old_repost_weight = old_analysis
            .reasons
            .iter()
            .find(|r| r.category == GhostCategory::Repost)
            .map(|r| r.weight)
            .expect("Should have repost reason");

        let very_old_repost_weight = very_old_analysis
            .reasons
            .iter()
            .find(|r| r.category == GhostCategory::Repost)
            .map(|r| r.weight)
            .expect("Should have repost reason");

        // Recent should be highest
        assert!(
            recent_repost_weight > old_repost_weight,
            "Recent repost should have higher weight than old: {} vs {}",
            recent_repost_weight,
            old_repost_weight
        );

        // Old should be higher than very old
        assert!(
            old_repost_weight > very_old_repost_weight,
            "Old repost should have higher weight than very old: {} vs {}",
            old_repost_weight,
            very_old_repost_weight
        );

        // Verify approximate decay factors (allowing for rounding)
        let decay_120 = old_repost_weight / recent_repost_weight;
        let decay_200 = very_old_repost_weight / recent_repost_weight;

        assert!(
            (decay_120 - 0.5).abs() < 0.01,
            "120-day decay should be ~0.5, got {}",
            decay_120
        );
        assert!(
            (decay_200 - 0.25).abs() < 0.01,
            "200-day decay should be ~0.25, got {}",
            decay_200
        );
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

    // ==================== ML-Enhanced Tests (v2.5.5) ====================

    #[test]
    fn test_ml_urgency_detection() {
        let detector = GhostDetector::new(GhostConfig::default());
        let created_at = create_test_job_created_at(5);

        let analysis = detector.analyze_enhanced(
            "Software Engineer - URGENT",
            Some(
                "We are hiring now! This position is filling fast. Apply today and \
                 interview this week. Don't miss this opportunity - act fast!",
            ),
            Some(100000),
            Some(150000),
            Some("NYC"),
            None,
            created_at,
            0,
            10,
        );

        // Should detect urgency patterns
        assert!(
            analysis
                .reasons
                .iter()
                .any(|r| r.description.contains("urgency")),
            "Should detect urgency patterns"
        );
    }

    #[test]
    fn test_ml_promotional_language() {
        let detector = GhostDetector::new(GhostConfig::default());
        let created_at = create_test_job_created_at(5);

        let analysis = detector.analyze_enhanced(
            "Amazing Opportunity - Dream Job",
            Some(
                "This is an incredible opportunity at the best company in the industry. \
                 Join our world-class team and change your life with unlimited potential. \
                 This groundbreaking role offers explosive growth.",
            ),
            Some(100000),
            Some(150000),
            Some("Remote"),
            Some(true),
            created_at,
            0,
            10,
        );

        // Should detect promotional language
        assert!(
            analysis
                .reasons
                .iter()
                .any(|r| r.description.contains("promotional")),
            "Should detect overly promotional language"
        );
    }

    #[test]
    fn test_ml_substance_ratio() {
        let detector = GhostDetector::new(GhostConfig::default());
        let created_at = create_test_job_created_at(5);

        // Low substance (all fluff)
        let low_substance = detector.analyze_enhanced(
            "Developer",
            Some(
                "We offer an exciting, dynamic, innovative, cutting-edge opportunity \
                 in a vibrant, energetic environment. We're looking for passionate, \
                 exceptional candidates to join our world-class team. Competitive \
                 salary and outstanding benefits in our state-of-the-art workplace.",
            ),
            None,
            None,
            Some("NYC"),
            None,
            created_at,
            0,
            10,
        );

        // High substance (technical)
        let high_substance = detector.analyze_enhanced(
            "Senior Software Engineer",
            Some(
                "You will design and implement scalable APIs using Python and SQL. \
                 Build and deploy services on AWS using Docker and Kubernetes. \
                 Review code, write tests, and optimize database queries. \
                 Integrate with CI/CD pipelines and monitor production systems.",
            ),
            Some(150000),
            Some(200000),
            Some("NYC"),
            None,
            created_at,
            0,
            10,
        );

        assert!(
            low_substance.score > high_substance.score,
            "Low substance should have higher ghost score: {} vs {}",
            low_substance.score,
            high_substance.score
        );
    }

    #[test]
    fn test_ml_template_matching() {
        let detector = GhostDetector::new(GhostConfig::default());
        let created_at = create_test_job_created_at(5);

        let analysis = detector.analyze_enhanced(
            "Software Engineer",
            Some(
                "We are looking for a motivated individual to join our growing team. \
                 The ideal candidate will have experience working with technology. \
                 Great opportunity to work with amazing people. Competitive salary \
                 and benefits. Room for growth and be part of something special.",
            ),
            None,
            None,
            Some("Remote"),
            Some(true),
            created_at,
            0,
            10,
        );

        // Should match ghost templates
        assert!(
            analysis
                .reasons
                .iter()
                .any(|r| r.description.contains("template")),
            "Should detect ghost job templates"
        );
    }

    #[test]
    fn test_ml_sigmoid_transform() {
        let detector = GhostDetector::new(GhostConfig::default());

        // Test sigmoid at different points
        let low = detector.sigmoid_transform(0.1);
        let mid = detector.sigmoid_transform(0.4);
        let high = detector.sigmoid_transform(0.7);

        // Should be monotonically increasing
        assert!(low < mid, "Sigmoid should increase: {} < {}", low, mid);
        assert!(mid < high, "Sigmoid should increase: {} < {}", mid, high);

        // Should be bounded 0-1
        assert!(low >= 0.0 && low <= 1.0, "Low value bounded");
        assert!(mid >= 0.0 && mid <= 1.0, "Mid value bounded");
        assert!(high >= 0.0 && high <= 1.0, "High value bounded");

        // Mid value should be around 0.5 (sigmoid centered at 0.4)
        assert!(
            (mid - 0.5).abs() < 0.1,
            "Sigmoid should be ~0.5 at center, got {}",
            mid
        );
    }

    #[test]
    fn test_ml_enhanced_vs_basic() {
        let detector = GhostDetector::new(GhostConfig::default());
        let created_at = create_test_job_created_at(5);

        let description = Some(
            "Amazing opportunity at our exciting company! We're hiring now - don't miss out! \
             Join our incredible team in this life-changing role. We offer unlimited potential \
             and competitive salary. Looking for a motivated self-starter to hit the ground running.",
        );

        let basic = detector.analyze(
            "Software Engineer",
            description,
            None,
            None,
            Some("NYC"),
            None,
            created_at,
            0,
            10,
        );

        let enhanced = detector.analyze_enhanced(
            "Software Engineer",
            description,
            None,
            None,
            Some("NYC"),
            None,
            created_at,
            0,
            10,
        );

        // Enhanced should detect more signals
        assert!(
            enhanced.reasons.len() >= basic.reasons.len(),
            "Enhanced should find at least as many reasons: {} vs {}",
            enhanced.reasons.len(),
            basic.reasons.len()
        );

        // Enhanced should have higher confidence
        assert!(
            enhanced.confidence >= basic.confidence,
            "Enhanced should have equal or higher confidence: {} vs {}",
            enhanced.confidence,
            basic.confidence
        );
    }

    #[test]
    fn test_ml_real_job_low_score() {
        let detector = GhostDetector::new(GhostConfig::default());
        let created_at = create_test_job_created_at(3);

        let analysis = detector.analyze_enhanced(
            "Senior Backend Engineer",
            Some(
                "We're building the next generation of financial infrastructure. \
                 \n\nResponsibilities:\n\
                 - Design and implement RESTful APIs using Python/Django\n\
                 - Build scalable microservices on AWS (ECS, Lambda, RDS)\n\
                 - Write comprehensive tests and maintain >80% coverage\n\
                 - Participate in code reviews and architectural discussions\n\
                 - Debug and optimize SQL queries for PostgreSQL\n\
                 \nRequirements:\n\
                 - 5+ years of backend development experience\n\
                 - Strong proficiency in Python and SQL\n\
                 - Experience with Docker and Kubernetes\n\
                 - Familiarity with CI/CD pipelines (Jenkins, GitHub Actions)\n\
                 \nBenefits: $180k-$220k base + equity",
            ),
            Some(180000),
            Some(220000),
            Some("San Francisco, CA"),
            Some(false),
            created_at,
            0,
            25,
        );

        assert!(
            analysis.score < 0.3,
            "Well-written real job should have low ghost score, got {}",
            analysis.score
        );
    }
}
