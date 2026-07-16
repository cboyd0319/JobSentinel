use super::shared::{
    build_match_result, dense_candidates, qwen3_match_threshold, QWEN3_REQUIREMENT_INSTRUCTION,
    QWEN3_RERANK_TOP_K,
};
use super::{SemanticMatchResult, SkillMatch};
use crate::embeddings::EmbeddingGenerator;
use crate::runtime::{
    EmbeddingBackend, EmbeddingInput, EmbeddingInputKind, RerankCandidate, RerankQuery,
    RerankQueryKind, RerankerBackend,
};
use crate::{Qwen3EmbeddingBackend, Qwen3RerankerBackend};
use anyhow::Result;
use std::cmp::Ordering;
use std::collections::HashSet;

pub(super) struct Qwen3SemanticRuntime {
    embedding: Qwen3EmbeddingBackend,
    reranker: Qwen3RerankerBackend,
    threshold: f32,
}

impl Qwen3SemanticRuntime {
    pub(super) fn new(embedding: Qwen3EmbeddingBackend, reranker: Qwen3RerankerBackend) -> Self {
        Self {
            embedding,
            reranker,
            threshold: qwen3_match_threshold(),
        }
    }

    pub(super) fn match_skills(
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

        let user_inputs: Vec<EmbeddingInput> = user_skills
            .iter()
            .map(|skill| EmbeddingInput {
                text: skill.clone(),
                instruction: None,
                input_kind: EmbeddingInputKind::ResumeChunk,
            })
            .collect();
        let user_embeddings = self.embedding.embed_documents(&user_inputs)?;

        let job_inputs: Vec<EmbeddingInput> = job_requirements
            .iter()
            .map(|requirement| EmbeddingInput {
                text: requirement.clone(),
                instruction: Some(QWEN3_REQUIREMENT_INSTRUCTION.to_string()),
                input_kind: EmbeddingInputKind::Requirement,
            })
            .collect();
        let job_embeddings = job_inputs
            .iter()
            .map(|input| self.embedding.embed_query(input))
            .collect::<Result<Vec<_>>>()?;

        let mut matched_skills = Vec::new();
        let mut matched_job_indices = HashSet::new();
        let mut matched_user_indices = HashSet::new();

        for (job_idx, job_emb) in job_embeddings.iter().enumerate() {
            let dense_candidates = dense_candidates(
                job_emb,
                &user_embeddings,
                self.threshold,
                QWEN3_RERANK_TOP_K,
            );

            if let Some((user_idx, similarity)) =
                self.reranked_best_match(job_idx, job_requirements, user_skills, &dense_candidates)?
            {
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

    fn reranked_best_match(
        &self,
        job_idx: usize,
        job_requirements: &[String],
        user_skills: &[String],
        dense_candidates: &[(usize, f32)],
    ) -> Result<Option<(usize, f32)>> {
        if dense_candidates.is_empty() {
            return Ok(None);
        }

        let candidates: Vec<RerankCandidate> = dense_candidates
            .iter()
            .map(|(user_idx, similarity)| RerankCandidate {
                id: user_idx.to_string(),
                text: user_skills[*user_idx].clone(),
                metadata: serde_json::json!({ "dense_similarity": similarity }),
            })
            .collect();
        let scores = self.reranker.rerank(
            &RerankQuery {
                text: job_requirements[job_idx].clone(),
                instruction: Some(QWEN3_REQUIREMENT_INSTRUCTION.to_string()),
                query_kind: RerankQueryKind::ResumeRequirement,
            },
            &candidates,
        )?;

        let Some(top) = scores.first() else {
            return Ok(None);
        };
        let Ok(user_idx) = top.candidate_id.parse::<usize>() else {
            return Ok(None);
        };
        let similarity = dense_candidates
            .iter()
            .find(|(candidate_idx, _)| *candidate_idx == user_idx)
            .map(|(_, similarity)| *similarity)
            .unwrap_or_default();

        Ok(Some((user_idx, similarity)))
    }

    pub(super) fn find_similar_skills(
        &self,
        query_skill: &str,
        candidate_skills: &[String],
        top_k: usize,
    ) -> Result<Vec<(String, f32)>> {
        if candidate_skills.is_empty() {
            return Ok(Vec::new());
        }

        let query_embedding = self.embedding.embed_query(&EmbeddingInput {
            text: query_skill.to_string(),
            instruction: Some(QWEN3_REQUIREMENT_INSTRUCTION.to_string()),
            input_kind: EmbeddingInputKind::Requirement,
        })?;
        let candidate_inputs: Vec<EmbeddingInput> = candidate_skills
            .iter()
            .map(|skill| EmbeddingInput {
                text: skill.clone(),
                instruction: None,
                input_kind: EmbeddingInputKind::ResumeChunk,
            })
            .collect();
        let candidate_embeddings = self.embedding.embed_documents(&candidate_inputs)?;

        let mut similarities: Vec<(String, f32)> = candidate_embeddings
            .iter()
            .enumerate()
            .map(|(idx, emb)| {
                let similarity = EmbeddingGenerator::cosine_similarity(&query_embedding, emb);
                (candidate_skills[idx].clone(), similarity)
            })
            .collect();

        similarities.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(Ordering::Equal));
        similarities.truncate(top_k);

        Ok(similarities)
    }
}
