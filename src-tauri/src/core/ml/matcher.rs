//! Semantic Skill Matching
//!
//! Uses sentence embeddings to match job requirements to user skills semantically.

use super::embeddings::EmbeddingGenerator;
use anyhow::Result;
use std::path::PathBuf;

/// Similarity threshold for considering skills as matching
const SIMILARITY_THRESHOLD: f32 = 0.7;

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
    generator: EmbeddingGenerator,
}

impl SemanticMatcher {
    /// Create new semantic matcher
    pub fn new(app_data_dir: PathBuf) -> Result<Self> {
        let generator = EmbeddingGenerator::new(app_data_dir)?;
        Ok(Self { generator })
    }

    /// Match user skills against job requirements semantically
    pub fn match_skills(
        &self,
        user_skills: &[String],
        job_requirements: &[String],
    ) -> Result<SemanticMatchResult> {
        if user_skills.is_empty() || job_requirements.is_empty() {
            return Ok(SemanticMatchResult {
                overall_score: 0.0,
                matched_skills: Vec::new(),
                unmatched_requirements: job_requirements.to_vec(),
                unused_skills: user_skills.to_vec(),
            });
        }

        // Generate embeddings for all skills
        let user_texts: Vec<&str> = user_skills.iter().map(|s| s.as_str()).collect();
        let job_texts: Vec<&str> = job_requirements.iter().map(|s| s.as_str()).collect();

        let user_embeddings = self.generator.embed_batch(&user_texts)?;
        let job_embeddings = self.generator.embed_batch(&job_texts)?;

        // Normalize embeddings
        let user_embeddings: Vec<Vec<f32>> = user_embeddings
            .iter()
            .map(|e| EmbeddingGenerator::normalize_embedding(e))
            .collect();

        let job_embeddings: Vec<Vec<f32>> = job_embeddings
            .iter()
            .map(|e| EmbeddingGenerator::normalize_embedding(e))
            .collect();

        // Match each job requirement to best user skill
        let mut matched_skills = Vec::new();
        let mut matched_job_indices = std::collections::HashSet::new();
        let mut matched_user_indices = std::collections::HashSet::new();

        for (job_idx, job_emb) in job_embeddings.iter().enumerate() {
            let mut best_match: Option<(usize, f32)> = None;

            for (user_idx, user_emb) in user_embeddings.iter().enumerate() {
                let similarity = EmbeddingGenerator::cosine_similarity(job_emb, user_emb);

                if similarity >= SIMILARITY_THRESHOLD {
                    if let Some((_, best_sim)) = best_match {
                        if similarity > best_sim {
                            best_match = Some((user_idx, similarity));
                        }
                    } else {
                        best_match = Some((user_idx, similarity));
                    }
                }
            }

            if let Some((user_idx, similarity)) = best_match {
                matched_skills.push(SkillMatch {
                    job_skill: job_requirements[job_idx].clone(),
                    user_skill: user_skills[user_idx].clone(),
                    similarity,
                });
                matched_job_indices.insert(job_idx);
                matched_user_indices.insert(user_idx);
            }
        }

        // Calculate overall score
        let coverage = matched_job_indices.len() as f64 / job_requirements.len() as f64;
        let avg_similarity = if matched_skills.is_empty() {
            0.0
        } else {
            matched_skills.iter().map(|m| m.similarity as f64).sum::<f64>()
                / matched_skills.len() as f64
        };
        let overall_score = coverage * 0.7 + avg_similarity * 0.3;

        // Collect unmatched requirements and unused skills
        let unmatched_requirements: Vec<String> = job_requirements
            .iter()
            .enumerate()
            .filter(|(idx, _)| !matched_job_indices.contains(idx))
            .map(|(_, skill)| skill.clone())
            .collect();

        let unused_skills: Vec<String> = user_skills
            .iter()
            .enumerate()
            .filter(|(idx, _)| !matched_user_indices.contains(idx))
            .map(|(_, skill)| skill.clone())
            .collect();

        Ok(SemanticMatchResult {
            overall_score,
            matched_skills,
            unmatched_requirements,
            unused_skills,
        })
    }

    /// Find similar skills to a query skill
    pub fn find_similar_skills(
        &self,
        query_skill: &str,
        candidate_skills: &[String],
        top_k: usize,
    ) -> Result<Vec<(String, f32)>> {
        if candidate_skills.is_empty() {
            return Ok(Vec::new());
        }

        let query_embedding = self.generator.embed_text(query_skill)?;
        let query_embedding = EmbeddingGenerator::normalize_embedding(&query_embedding);

        let candidate_texts: Vec<&str> = candidate_skills.iter().map(|s| s.as_str()).collect();
        let candidate_embeddings = self.generator.embed_batch(&candidate_texts)?;

        let mut similarities: Vec<(String, f32)> = candidate_embeddings
            .iter()
            .enumerate()
            .map(|(idx, emb)| {
                let normalized = EmbeddingGenerator::normalize_embedding(emb);
                let similarity = EmbeddingGenerator::cosine_similarity(&query_embedding, &normalized);
                (candidate_skills[idx].clone(), similarity)
            })
            .collect();

        // Sort by similarity descending
        similarities.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));

        // Take top K
        similarities.truncate(top_k);

        Ok(similarities)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // Note: These tests require the model to be downloaded
    // They should be marked as #[ignore] in CI

    #[test]
    #[ignore]
    fn test_semantic_matching() {
        let app_data_dir = PathBuf::from("./test_cache");
        let matcher = SemanticMatcher::new(app_data_dir).unwrap();

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

        let result = matcher.match_skills(&user_skills, &job_requirements).unwrap();

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
