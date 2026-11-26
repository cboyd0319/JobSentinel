//! Runs governed Qwen3 embedding and reranking with bounded inference workloads.

mod config;
mod embedding;
mod model;
mod pooling;
mod reranker;
#[cfg(test)]
mod tests;
mod tokenization;

pub use embedding::Qwen3EmbeddingBackend;
pub use reranker::Qwen3RerankerBackend;

pub(super) const QWEN3_CANDLE_BACKEND: &str = "qwen3-candle";
pub(super) const QWEN3_RERANKER_CANDLE_BACKEND: &str = "qwen3-reranker-candle";
pub(super) const MAX_INFERENCE_TOKENS: usize = 512;
pub(super) const MAX_INFERENCE_BATCH: usize = 1;
pub(super) const DEFAULT_PAD_TOKEN_ID: u32 = 0;
pub(super) const DEFAULT_RERANKER_MAX_PAIRS: usize = 50;
pub(super) const QWEN3_RERANKER_PREFIX: &str = "<|im_start|>system\nJudge whether the Document meets the requirements based on the Query and the Instruct provided. Note that the answer can only be \"yes\" or \"no\".<|im_end|>\n<|im_start|>user\n";
pub(super) const QWEN3_RERANKER_SUFFIX: &str =
    "<|im_end|>\n<|im_start|>assistant\n<think>\n\n</think>\n\n";
