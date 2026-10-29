//! Rejects oversized Qwen inputs and constructs bounded, untruncated token batches.

use anyhow::Result;
use candle_core::{Device, Tensor};
use tokenizers::Tokenizer;

use crate::qwen3::{
    DEFAULT_PAD_TOKEN_ID, MAX_INFERENCE_BATCH, MAX_INFERENCE_TOKENS, QWEN3_RERANKER_PREFIX,
    QWEN3_RERANKER_SUFFIX,
};
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
    validate_tokenization_inputs(tokenizer, texts)?;
    let max_tokens = max_tokens.min(MAX_INFERENCE_TOKENS);
    anyhow::ensure!(max_tokens > 0, "Qwen3 max token limit must be positive");

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

        anyhow::ensure!(
            ids.len() <= max_tokens,
            "Qwen3 input exceeds the inference token budget"
        );
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
    validate_tokenization_inputs(tokenizer, texts)?;
    let max_tokens = max_tokens.min(MAX_INFERENCE_TOKENS);
    anyhow::ensure!(
        max_tokens > 0,
        "Qwen3 reranker max token limit must be positive"
    );

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
        let body_ids = encode_tokenizer_fragment(tokenizer, text)?;
        anyhow::ensure!(
            body_ids.len() <= body_limit,
            "Qwen3 reranker input exceeds the inference token budget"
        );

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

fn validate_tokenization_inputs(tokenizer: &Tokenizer, texts: &[String]) -> Result<()> {
    anyhow::ensure!(
        texts.len() <= MAX_INFERENCE_BATCH,
        "Qwen3 inference batch exceeds its budget"
    );
    anyhow::ensure!(
        texts.iter().all(|text| text.len() <= 64 * 1024),
        "Qwen3 formatted input exceeds its byte budget"
    );
    anyhow::ensure!(
        tokenizer.get_truncation().is_none(),
        "Qwen3 tokenization must not silently truncate evidence"
    );
    Ok(())
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

#[cfg(test)]
mod budget_tests {
    use super::*;
    fn tokenizer() -> Tokenizer {
        let model = tokenizers::models::wordlevel::WordLevel::builder()
            .vocab([("[UNK]".into(), 0), ("x".into(), 1)].into_iter().collect())
            .unk_token("[UNK]".into())
            .build()
            .unwrap();
        let mut tokenizer = Tokenizer::new(model);
        tokenizer.with_pre_tokenizer(Some(tokenizers::pre_tokenizers::whitespace::Whitespace));
        tokenizer
    }
    #[test]
    fn tokenization_refuses_evidence_instead_of_truncating_it() {
        let tokenizer = tokenizer();
        assert!(tokenize_left_padded(&tokenizer, &["x".into()], 8, &Device::Cpu).is_ok());
        assert!(tokenize_left_padded(&tokenizer, &["x ".repeat(9)], 8, &Device::Cpu).is_err());
        assert!(
            tokenize_left_padded(&tokenizer, &["x".into(), "x".into()], 32768, &Device::Cpu)
                .is_err()
        );
        assert!(tokenize_rerank_inputs(&tokenizer, &["x".into()], 32768, &Device::Cpu).is_ok());
        assert!(tokenize_rerank_inputs(
            &tokenizer,
            &["x ".repeat(MAX_INFERENCE_TOKENS)],
            32768,
            &Device::Cpu
        )
        .is_err());
        assert!(
            tokenize_left_padded(&tokenizer, &["x".repeat(65537)], 32768, &Device::Cpu).is_err()
        );
    }
    #[test]
    #[ignore = "requires verified tokenizer-only fixtures in JOBSENTINEL_QWEN_TOKENIZER_CACHE"]
    fn governed_tokenizers_preserve_existing_fixture_inputs_within_budget() {
        use sha2::{Digest, Sha256};
        let root = std::path::PathBuf::from(
            std::env::var_os("JOBSENTINEL_QWEN_TOKENIZER_CACHE").expect("explicit tokenizer cache"),
        );
        let manifest = crate::manifest::load_model_manifest().unwrap();
        let load = |spec: &crate::manifest::ModelSpec| {
            let file = spec.file("tokenizer.json").unwrap();
            let bytes = std::fs::read(root.join(format!("{}.json", spec.id))).unwrap();
            assert_eq!(Some(bytes.len() as u64), file.size_bytes);
            assert_eq!(hex::encode(Sha256::digest(&bytes)), file.sha256);
            Tokenizer::from_bytes(bytes).unwrap()
        };
        let embedding = load(manifest.default_embedding().unwrap());
        let reranker = load(manifest.default_reranker().unwrap());
        let mut fixtures = crate::EvalFixtureSet::seed().unwrap().hard_negatives;
        let regional: crate::EvalFixtureSet = serde_json::from_str(include_str!(
            "../eval_fixtures/regional_requirement_hard_negatives_v1.json"
        ))
        .unwrap();
        fixtures.extend(regional.hard_negatives);
        let instruction = manifest
            .instruction_profiles
            .get("resume_requirement_v1")
            .unwrap()
            .query
            .clone();
        let mut maxima = (0, 0);
        for fixture in fixtures {
            let query = RerankQuery {
                text: fixture.query.clone(),
                instruction: Some(instruction.clone()),
                query_kind: RerankQueryKind::ResumeRequirement,
            };
            let formatted = format_embedding_input(&EmbeddingInput {
                text: fixture.query,
                instruction: Some(instruction.clone()),
                input_kind: EmbeddingInputKind::Requirement,
            });
            maxima.0 = maxima.0.max(
                tokenize_left_padded(&embedding, &[formatted], 32768, &Device::Cpu)
                    .unwrap()
                    .input_ids
                    .dims2()
                    .unwrap()
                    .1,
            );
            for text in [fixture.positive, fixture.hard_negative] {
                maxima.0 = maxima.0.max(
                    tokenize_left_padded(
                        &embedding,
                        std::slice::from_ref(&text),
                        32768,
                        &Device::Cpu,
                    )
                    .unwrap()
                    .input_ids
                    .dims2()
                    .unwrap()
                    .1,
                );
                let candidate = RerankCandidate {
                    id: "fixture".into(),
                    text,
                    metadata: serde_json::Value::Null,
                };
                maxima.1 = maxima.1.max(
                    tokenize_rerank_inputs(
                        &reranker,
                        &format_rerank_inputs(&query, &[&candidate]),
                        32768,
                        &Device::Cpu,
                    )
                    .unwrap()
                    .input_ids
                    .dims2()
                    .unwrap()
                    .1,
                );
            }
        }
        eprintln!(
            "Existing fixtures maximum tokens: embedding={}, reranker={}",
            maxima.0, maxima.1
        );
    }
}
