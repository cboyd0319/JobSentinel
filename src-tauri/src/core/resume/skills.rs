//! Skill Extraction from Resumes
//!
//! Self-contained keyword-based skill extraction.
//! No external dependencies - works 100% offline with the app.

use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::sync::LazyLock;

const RESUME_SKILL_TAXONOMY_JSON: &str =
    include_str!("../../../../resources/taxonomies/resume-skills.json");

static RESUME_SKILL_TAXONOMY: LazyLock<ResumeSkillTaxonomy> =
    LazyLock::new(load_resume_skill_taxonomy);

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ResumeSkillTaxonomy {
    schema_version: u32,
    categories: Vec<SkillCategory>,
}

#[derive(Debug, Clone, Deserialize)]
struct SkillCategory {
    id: String,
    skills: Vec<String>,
}

fn load_resume_skill_taxonomy() -> ResumeSkillTaxonomy {
    let taxonomy: ResumeSkillTaxonomy = match serde_json::from_str(RESUME_SKILL_TAXONOMY_JSON) {
        Ok(taxonomy) => taxonomy,
        Err(error) => panic!("resume skill taxonomy must be valid JSON: {error}"),
    };

    assert_eq!(
        taxonomy.schema_version, 1,
        "unsupported resume skill taxonomy schema version"
    );
    assert!(
        !taxonomy.categories.is_empty(),
        "resume skill taxonomy must define at least one category"
    );

    let mut category_ids = HashSet::new();
    for category in &taxonomy.categories {
        assert!(
            !category.id.trim().is_empty(),
            "resume skill taxonomy contains a blank category id"
        );
        assert!(
            category_ids.insert(category.id.as_str()),
            "resume skill taxonomy contains duplicate category id {:?}",
            category.id
        );
        assert!(
            !category.skills.is_empty(),
            "resume skill taxonomy category {:?} must contain skills",
            category.id
        );

        for skill in &category.skills {
            assert!(
                !skill.trim().is_empty(),
                "resume skill taxonomy category {:?} contains a blank skill",
                category.id
            );
        }
    }

    taxonomy
}

/// Extracted skill with metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractedSkill {
    pub skill_name: String,
    pub skill_category: Option<String>,
    pub confidence_score: f64,
}

/// Skill extractor using keyword matching
///
/// This is a fully self-contained skill extraction system that:
/// - Recognizes technical, workplace, and role-specific skills
/// - Requires no external services or ML models
/// - Works 100% offline
/// - Is deterministic and fast
pub struct SkillExtractor {
    skill_database: SkillDatabase,
}

impl SkillExtractor {
    pub fn new() -> Self {
        Self {
            skill_database: SkillDatabase::default(),
        }
    }

    /// Extract skills from resume text
    ///
    /// Returns a list of skills with confidence scores and categories
    pub fn extract_skills(&self, text: &str) -> Vec<ExtractedSkill> {
        let text_lower = text.to_lowercase();
        let mut found_skills = Vec::new();
        let mut seen_skills = HashSet::new();

        // Extract from all categories
        for category in &self.skill_database.categories {
            self.extract_category(
                &text_lower,
                &category.skills,
                category.id.as_str(),
                &mut found_skills,
                &mut seen_skills,
            );
        }

        // Sort by confidence score (highest first)
        found_skills.sort_by(|a, b| {
            b.confidence_score
                .partial_cmp(&a.confidence_score)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        found_skills
    }

    /// Extract skills from a specific category
    fn extract_category(
        &self,
        text: &str,
        skills: &[String],
        category: &str,
        found_skills: &mut Vec<ExtractedSkill>,
        seen_skills: &mut HashSet<String>,
    ) {
        for skill in skills {
            if self.contains_skill(text, skill) && !seen_skills.contains(skill) {
                found_skills.push(ExtractedSkill {
                    skill_name: skill.clone(),
                    skill_category: Some(category.to_string()),
                    confidence_score: self.calculate_confidence(text, skill),
                });
                seen_skills.insert(skill.clone());
            }
        }
    }

    /// Check if skill is present in text (case-insensitive, word boundary aware)
    fn contains_skill(&self, text: &str, skill: &str) -> bool {
        let skill_lower = skill.to_lowercase();

        skill_match_count(text, &skill_lower) > 0
    }

    /// Calculate confidence score based on:
    /// - Frequency of mentions (0.5)
    /// - Context (appears in "Skills" section vs elsewhere) (0.3)
    /// - Base confidence (0.2)
    fn calculate_confidence(&self, text: &str, skill: &str) -> f64 {
        let skill_lower = skill.to_lowercase();

        // Count occurrences
        let count = skill_match_count(text, &skill_lower);
        let frequency_score = (count as f64 * 0.1).min(0.5);

        // Check if in "Skills" section
        let context_score = if text.contains("skills") && text.contains(&skill_lower) {
            0.3
        } else {
            0.15
        };

        // Base confidence
        let base_score = 0.2;

        (frequency_score + context_score + base_score).min(1.0)
    }
}

fn skill_match_count(text: &str, skill: &str) -> usize {
    if skill.trim().is_empty() {
        return 0;
    }

    text.match_indices(skill)
        .filter(|(start, _)| skill_match_has_boundaries(text, skill, *start))
        .count()
}

fn skill_match_has_boundaries(text: &str, skill: &str, start: usize) -> bool {
    let end = start + skill.len();
    let before_is_term = text[..start]
        .chars()
        .next_back()
        .is_some_and(is_skill_term_char);
    let after_is_term = text[end..].chars().next().is_some_and(is_skill_term_char);

    !before_is_term && !after_is_term
}

fn is_skill_term_char(ch: char) -> bool {
    ch.is_alphanumeric() || matches!(ch, '#' | '+')
}

impl Default for SkillExtractor {
    fn default() -> Self {
        Self::new()
    }
}

/// Database of known skills across technical, workplace, and role-specific categories.
#[derive(Debug, Clone)]
struct SkillDatabase {
    categories: Vec<SkillCategory>,
}

impl Default for SkillDatabase {
    fn default() -> Self {
        Self {
            categories: RESUME_SKILL_TAXONOMY.categories.clone(),
        }
    }
}

#[cfg(test)]
#[path = "skills_tests.rs"]
mod tests;
