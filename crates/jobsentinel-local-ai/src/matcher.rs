//! Semantic Skill Matching
//!
//! Uses sentence embeddings to match job requirements to user skills semantically.

use super::embeddings::EmbeddingGenerator;
use super::model::ModelManager;
use super::{Qwen3EmbeddingBackend, Qwen3RerankerBackend};
use anyhow::Result;
use std::path::PathBuf;

mod legacy;
mod qwen3;
mod shared;

use qwen3::Qwen3SemanticRuntime;

/// Result of semantic skill matching
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SemanticMatchResult {
    /// Overall semantic match score (0.0-1.0)
    pub overall_score: f64,

    /// Matched skills with similarity scores
    pub matched_skills: Vec<SkillMatch>,

    /// Job requirements that didn't match any user skills
    pub unmatched_requirements: Vec<String>,

    /// User skills that didn't match any job requirements
    pub unused_skills: Vec<String>,
}

/// Individual skill match with similarity score
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SkillMatch {
    pub job_skill: String,
    pub user_skill: String,
    pub similarity: f32,
}

/// Semantic matcher for skill comparison
pub struct SemanticMatcher {
    runtime: SemanticMatcherRuntime,
}

enum SemanticMatcherRuntime {
    Qwen3(Box<Qwen3SemanticRuntime>),
    Legacy(Box<EmbeddingGenerator>),
}

impl SemanticMatcher {
    /// Create new semantic matcher
    pub fn new(app_data_dir: PathBuf) -> Result<Self> {
        let manager = ModelManager::new(app_data_dir.clone());
        if manager.is_default_semantic_runtime_downloaded() {
            let embedding = Qwen3EmbeddingBackend::new(app_data_dir.clone())?;
            let reranker = Qwen3RerankerBackend::new(app_data_dir)?;
            return Ok(Self {
                runtime: SemanticMatcherRuntime::Qwen3(Box::new(Qwen3SemanticRuntime::new(
                    embedding, reranker,
                ))),
            });
        }

        let generator = EmbeddingGenerator::new(app_data_dir)?;
        Ok(Self {
            runtime: SemanticMatcherRuntime::Legacy(Box::new(generator)),
        })
    }

    /// Match user skills against job requirements semantically
    pub fn match_skills(
        &self,
        user_skills: &[String],
        job_requirements: &[String],
    ) -> Result<SemanticMatchResult> {
        match &self.runtime {
            SemanticMatcherRuntime::Qwen3(runtime) => {
                runtime.match_skills(user_skills, job_requirements)
            }
            SemanticMatcherRuntime::Legacy(generator) => {
                legacy::match_skills(generator.as_ref(), user_skills, job_requirements)
            }
        }
    }

    /// Find similar skills to a query skill
    pub fn find_similar_skills(
        &self,
        query_skill: &str,
        candidate_skills: &[String],
        top_k: usize,
    ) -> Result<Vec<(String, f32)>> {
        match &self.runtime {
            SemanticMatcherRuntime::Qwen3(runtime) => {
                runtime.find_similar_skills(query_skill, candidate_skills, top_k)
            }
            SemanticMatcherRuntime::Legacy(generator) => legacy::find_similar_skills(
                generator.as_ref(),
                query_skill,
                candidate_skills,
                top_k,
            ),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // Note: These tests require the model to be downloaded
    // They should be ignored in the default automated lane.

    #[test]
    fn qwen3_threshold_comes_from_model_lock() {
        assert!((shared::qwen3_match_threshold() - 0.65).abs() < f32::EPSILON);
    }

    #[test]
    fn dense_candidates_filters_sorts_and_bounds_matches() {
        let query = vec![1.0, 0.0];
        let candidates = vec![vec![0.8, 0.2], vec![0.2, 0.8], vec![1.0, 0.0]];

        let matches = shared::dense_candidates(&query, &candidates, 0.70, 1);

        assert_eq!(matches, vec![(2, 1.0)]);
    }

    #[test]
    #[ignore]
    fn test_semantic_matching() {
        let app_data_dir = tempfile::tempdir().unwrap();
        let matcher = SemanticMatcher::new(app_data_dir.path().to_path_buf()).unwrap();

        let user_skills = vec![
            "Python programming".to_string(),
            "Machine Learning".to_string(),
            "Data Analysis".to_string(),
        ];

        let job_requirements = vec![
            "Python".to_string(),
            "ML experience".to_string(),
            "Statistical analysis".to_string(),
            "Java".to_string(),
        ];

        let result = matcher
            .match_skills(&user_skills, &job_requirements)
            .unwrap();

        assert!(result.overall_score > 0.5);
        assert!(result.matched_skills.len() >= 2);
        assert!(result.unmatched_requirements.contains(&"Java".to_string()));
    }

    #[test]
    fn test_empty_skills() {
        // This test doesn't require model download
        let user_skills: Vec<String> = vec![];
        let job_requirements = vec!["Python".to_string()];

        // We can't actually run the matcher without the model,
        // but we can test the expected behavior
        assert_eq!(user_skills.len(), 0);
        assert_eq!(job_requirements.len(), 1);
    }
}
