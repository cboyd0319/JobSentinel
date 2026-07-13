use super::*;

impl GhostDetector {
    /// Calculate weight for stale listing based on age
    pub(super) fn calculate_stale_weight(&self, age_days: i64) -> f64 {
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
    pub(super) fn calculate_repost_decay_factor(&self, age_days: i64) -> f64 {
        if age_days < 90 {
            1.0 // Recent repeated sightings carry full weight
        } else if age_days < 180 {
            0.5 // Older reposts less concerning (may be historical data)
        } else {
            0.25 // Very old reposts carry minimal weight
        }
    }

    /// Count generic/buzzword phrases in description
    pub(super) fn count_generic_phrases(&self, description: &str) -> usize {
        patterns::generic_phrases()
            .iter()
            .filter(|re| re.is_match(description))
            .count()
    }

    /// Check for missing important details
    pub(super) fn check_missing_details(
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
    pub(super) fn has_unrealistic_requirements(&self, title: &str, description: &str) -> bool {
        let combined = format!("{title} {description}");
        patterns::unrealistic_patterns()
            .iter()
            .any(|re| re.is_match(&combined))
    }

    /// Check for vague/generic job titles
    pub(super) fn has_vague_title(&self, title: &str) -> bool {
        patterns::vague_titles().iter().any(|re| re.is_match(title))
    }

    /// Calculate analysis confidence based on data availability
    pub(super) fn calculate_confidence(
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
    pub(super) fn count_urgency_patterns(&self, text: &str) -> usize {
        patterns::urgency_patterns()
            .iter()
            .filter(|re| re.is_match(text))
            .count()
    }

    /// Count promotional/overly positive language
    pub(super) fn count_promotional_patterns(&self, text: &str) -> usize {
        patterns::promotional_patterns()
            .iter()
            .filter(|re| re.is_match(text))
            .count()
    }

    /// Calculate substance-to-fluff ratio (higher = more substance)
    pub(super) fn calculate_substance_ratio(&self, text: &str) -> f64 {
        let text_lower = text.to_lowercase();

        // Check if text has any words
        if text_lower.split_whitespace().next().is_none() {
            return 0.0;
        }

        let substance_count = patterns::substance_keywords()
            .iter()
            .filter(|keyword| text_lower.contains(keyword.as_str()))
            .count();

        let fluff_count = patterns::fluff_keywords()
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
    pub(super) fn calculate_template_similarity(&self, text: &str) -> f64 {
        let text_lower = text.to_lowercase();
        let mut matches = 0;
        let templates = patterns::ghost_templates();
        let total = templates.len();

        for template in templates {
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
    pub(super) fn sigmoid_transform(&self, score: f64) -> f64 {
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
