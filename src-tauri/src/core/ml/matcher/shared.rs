use super::{SemanticMatchResult, SkillMatch};
use crate::core::ml::embeddings::EmbeddingGenerator;
use crate::core::ml::manifest::load_model_manifest;
use std::cmp::Ordering;
use std::collections::HashSet;

/// Similarity threshold for considering skills as matching.
pub(super) const SIMILARITY_THRESHOLD: f32 = 0.7;
pub(super) const QWEN3_RERANK_TOP_K: usize = 25;
pub(super) const QWEN3_REQUIREMENT_INSTRUCTION: &str =
    "Retrieve resume skills or passages that provide concrete evidence for this job requirement.";

pub(super) fn dense_candidates(
    query_embedding: &[f32],
    candidate_embeddings: &[Vec<f32>],
    threshold: f32,
    top_k: usize,
) -> Vec<(usize, f32)> {
    let mut candidates: Vec<(usize, f32)> = candidate_embeddings
        .iter()
        .enumerate()
        .filter_map(|(candidate_idx, candidate_embedding)| {
            let similarity =
                EmbeddingGenerator::cosine_similarity(query_embedding, candidate_embedding);
            (similarity >= threshold).then_some((candidate_idx, similarity))
        })
        .collect();

    candidates.sort_by(|left, right| {
        right
            .1
            .partial_cmp(&left.1)
            .unwrap_or(Ordering::Equal)
            .then_with(|| left.0.cmp(&right.0))
    });
    candidates.truncate(top_k);
    candidates
}

pub(super) fn build_match_result(
    user_skills: &[String],
    job_requirements: &[String],
    matched_skills: Vec<SkillMatch>,
    matched_job_indices: HashSet<usize>,
    matched_user_indices: HashSet<usize>,
) -> SemanticMatchResult {
    let coverage = matched_job_indices.len() as f64 / job_requirements.len() as f64;
    let avg_similarity = if matched_skills.is_empty() {
        0.0
    } else {
        matched_skills
            .iter()
            .map(|m| m.similarity as f64)
            .sum::<f64>()
            / matched_skills.len() as f64
    };
    let overall_score = coverage * 0.7 + avg_similarity * 0.3;

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

    SemanticMatchResult {
        overall_score,
        matched_skills,
        unmatched_requirements,
        unused_skills,
    }
}

pub(super) fn qwen3_match_threshold() -> f32 {
    load_model_manifest()
        .ok()
        .and_then(|manifest| {
            manifest
                .thresholds
                .get("resume_requirement")
                .map(|thresholds| thresholds.medium)
        })
        .unwrap_or(SIMILARITY_THRESHOLD)
}
