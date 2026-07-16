use anyhow::Result;
use candle_core::{Device, Tensor};
use tokenizers::Tokenizer;

use crate::qwen3::{DEFAULT_PAD_TOKEN_ID, QWEN3_RERANKER_PREFIX, QWEN3_RERANKER_SUFFIX};
use crate::runtime::{
    EmbeddingInput, EmbeddingInputKind, RerankCandidate, RerankQuery, RerankQueryKind,
};
use crate::MlError;

pub(super) struct TokenBatch {
    pub(super) input_ids: Tensor,
    pub(super) attention_mask: Tensor,
}

pub(super) fn tokenize_left_padded(
    tokenizer: &Tokenizer,
    texts: &[String],
    max_tokens: usize,
    device: &Device,
) -> Result<TokenBatch> {
    if max_tokens == 0 {
        anyhow::bail!("Qwen3 max token limit must be positive");
    }

    let mut token_rows = Vec::with_capacity(texts.len());
    let mut mask_rows = Vec::with_capacity(texts.len());

    for text in texts {
        let encoding = tokenizer
            .encode(text.as_str(), true)
            .map_err(|error| MlError::TokenizationFailed(error.to_string()))?;
        let mut ids = encoding.get_ids().to_vec();
        let mut mask = encoding.get_attention_mask().to_vec();

        if ids.is_empty() {
            ids.push(DEFAULT_PAD_TOKEN_ID);
            mask.push(1);
        }

        ids.truncate(max_tokens);
        mask.truncate(max_tokens);
        token_rows.push(ids);
        mask_rows.push(mask);
    }

    token_rows_to_left_padded_batch(token_rows, mask_rows, device)
}

pub(super) fn tokenize_rerank_inputs(
    tokenizer: &Tokenizer,
    texts: &[String],
    max_tokens: usize,
    device: &Device,
) -> Result<TokenBatch> {
    if max_tokens == 0 {
        anyhow::bail!("Qwen3 reranker max token limit must be positive");
    }

    let prefix_ids = encode_tokenizer_fragment(tokenizer, QWEN3_RERANKER_PREFIX)?;
    let suffix_ids = encode_tokenizer_fragment(tokenizer, QWEN3_RERANKER_SUFFIX)?;
    let reserved_tokens = prefix_ids.len() + suffix_ids.len();
    if reserved_tokens >= max_tokens {
        anyhow::bail!("Qwen3 reranker prompt wrapper exceeds max token limit");
    }
    let body_limit = max_tokens - reserved_tokens;

    let mut token_rows = Vec::with_capacity(texts.len());
    let mut mask_rows = Vec::with_capacity(texts.len());
    for text in texts {
        let mut body_ids = encode_tokenizer_fragment(tokenizer, text)?;
        body_ids.truncate(body_limit);

        let mut ids = Vec::with_capacity(prefix_ids.len() + body_ids.len() + suffix_ids.len());
        ids.extend(prefix_ids.iter().copied());
        ids.extend(body_ids);
        ids.extend(suffix_ids.iter().copied());
        let mask = vec![1_u32; ids.len()];

        token_rows.push(ids);
        mask_rows.push(mask);
    }

    token_rows_to_left_padded_batch(token_rows, mask_rows, device)
}

fn encode_tokenizer_fragment(tokenizer: &Tokenizer, text: &str) -> Result<Vec<u32>> {
    tokenizer
        .encode(text, false)
        .map(|encoding| encoding.get_ids().to_vec())
        .map_err(|error| MlError::TokenizationFailed(error.to_string()).into())
}

fn token_rows_to_left_padded_batch(
    token_rows: Vec<Vec<u32>>,
    mask_rows: Vec<Vec<u32>>,
    device: &Device,
) -> Result<TokenBatch> {
    let mut seq_len = 1;
    for ids in &token_rows {
        seq_len = seq_len.max(ids.len());
    }

    let batch_size = token_rows.len();
    let mut input_ids = Vec::with_capacity(batch_size * seq_len);
    let mut attention_mask = Vec::with_capacity(batch_size * seq_len);

    for (ids, mask) in token_rows.iter().zip(mask_rows.iter()) {
        let pad = seq_len.saturating_sub(ids.len());
        input_ids.extend(std::iter::repeat_n(DEFAULT_PAD_TOKEN_ID, pad));
        attention_mask.extend(std::iter::repeat_n(0.0_f32, pad));
        input_ids.extend(ids.iter().copied());
        attention_mask.extend(mask.iter().map(|&value| value as f32));
    }

    let input_ids = Tensor::from_vec(input_ids, (batch_size, seq_len), device)
        .map_err(|error| MlError::InferenceFailed(error.to_string()))?;
    let attention_mask = Tensor::from_vec(attention_mask, (batch_size, seq_len), device)
        .map_err(|error| MlError::InferenceFailed(error.to_string()))?;

    Ok(TokenBatch {
        input_ids,
        attention_mask,
    })
}

pub(super) fn format_embedding_input(input: &EmbeddingInput) -> String {
    let instruction = input.instruction.as_deref().map(str::trim).unwrap_or("");
    if instruction.is_empty() {
        return input.text.clone();
    }

    match input.input_kind {
        EmbeddingInputKind::Query | EmbeddingInputKind::Requirement => {
            format!("Instruct: {instruction}\nQuery: {}", input.text)
        }
        EmbeddingInputKind::Summary
        | EmbeddingInputKind::Document
        | EmbeddingInputKind::ResumeChunk
        | EmbeddingInputKind::JobChunk => input.text.clone(),
    }
}

pub(super) fn format_rerank_inputs(
    query: &RerankQuery,
    candidates: &[&RerankCandidate],
) -> Vec<String> {
    let instruction = query
        .instruction
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| default_rerank_instruction(&query.query_kind));

    candidates
        .iter()
        .map(|candidate| {
            format!(
                "<Instruct>: {instruction}\n<Query>: {}\n<Document>: {}",
                query.text, candidate.text
            )
        })
        .collect()
}

fn default_rerank_instruction(query_kind: &RerankQueryKind) -> &'static str {
    match query_kind {
        RerankQueryKind::ResumeRequirement => {
            "Given a job requirement and a resume passage, determine whether the passage provides concrete evidence that the candidate satisfies the requirement."
        }
        RerankQueryKind::JobSearch => {
            "Given a candidate profile and a job posting, determine whether the job is a strong fit for the candidate's concrete skills, seniority, role intent, location, and domain evidence."
        }
        RerankQueryKind::SkillEvidence => {
            "Given a skill phrase and a professional evidence passage, determine whether the passage shows direct hands-on evidence for the skill."
        }
        RerankQueryKind::TitleSeniority => {
            "Given a target title or seniority requirement and a professional evidence passage, determine whether the passage supports the expected title and seniority level."
        }
        RerankQueryKind::GapAnalysis => {
            "Given a missing or weak job requirement and a resume passage, determine whether the passage closes the gap with concrete evidence."
        }
    }
}
