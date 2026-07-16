use super::shared::{build_match_result, dense_candidates, SIMILARITY_THRESHOLD};
use super::{SemanticMatchResult, SkillMatch};
use crate::embeddings::EmbeddingGenerator;
use anyhow::Result;
use std::cmp::Ordering;
use std::collections::HashSet;

pub(super) fn match_skills(
    generator: &EmbeddingGenerator,
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

    let user_texts: Vec<&str> = user_skills.iter().map(|s| s.as_str()).collect();
    let job_texts: Vec<&str> = job_requirements.iter().map(|s| s.as_str()).collect();

    let user_embeddings = generator.embed_batch(&user_texts)?;
    let job_embeddings = generator.embed_batch(&job_texts)?;

    let user_embeddings: Vec<Vec<f32>> = user_embeddings
        .iter()
        .map(|e| EmbeddingGenerator::normalize_embedding(e))
        .collect();

    let job_embeddings: Vec<Vec<f32>> = job_embeddings
        .iter()
        .map(|e| EmbeddingGenerator::normalize_embedding(e))
        .collect();

    let mut matched_skills = Vec::new();
    let mut matched_job_indices = HashSet::new();
    let mut matched_user_indices = HashSet::new();

    for (job_idx, job_emb) in job_embeddings.iter().enumerate() {
        let best_match = dense_candidates(job_emb, &user_embeddings, SIMILARITY_THRESHOLD, 1)
            .into_iter()
            .next();

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

    Ok(build_match_result(
        user_skills,
        job_requirements,
        matched_skills,
        matched_job_indices,
        matched_user_indices,
    ))
}

pub(super) fn find_similar_skills(
    generator: &EmbeddingGenerator,
    query_skill: &str,
    candidate_skills: &[String],
    top_k: usize,
) -> Result<Vec<(String, f32)>> {
    if candidate_skills.is_empty() {
        return Ok(Vec::new());
    }

    let query_embedding = generator.embed_text(query_skill)?;
    let query_embedding = EmbeddingGenerator::normalize_embedding(&query_embedding);

    let candidate_texts: Vec<&str> = candidate_skills.iter().map(|s| s.as_str()).collect();
    let candidate_embeddings = generator.embed_batch(&candidate_texts)?;

    let mut similarities: Vec<(String, f32)> = candidate_embeddings
        .iter()
        .enumerate()
        .map(|(idx, emb)| {
            let normalized = EmbeddingGenerator::normalize_embedding(emb);
            let similarity = EmbeddingGenerator::cosine_similarity(&query_embedding, &normalized);
            (candidate_skills[idx].clone(), similarity)
        })
        .collect();

    similarities.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(Ordering::Equal));
    similarities.truncate(top_k);

    Ok(similarities)
}
