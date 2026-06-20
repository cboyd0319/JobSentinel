//! Embedded Machine Learning Module
//!
//! Optional module for on-device ML inference using governed local models.
//! Provides semantic skill matching via sentence embeddings.
//!
//! ## Features
//! - Pinned model lock with revision and SHA-256 verification
//! - Qwen3 embedding and reranker profiles for the production direction
//! - Legacy all-MiniLM baseline while the Qwen3 backend is wired
//! - Explicit model download on user or developer action
//! - Pure Rust inference with Metal acceleration (macOS)
//! - Graceful fallback to keyword matching if disabled
//!
//! ## Usage
//! Enable with `embedded-ml` feature flag in Cargo.toml

#![cfg(feature = "embedded-ml")]

mod contracts;
mod embeddings;
mod evaluation;
mod hybrid;
mod manifest;
mod matcher;
mod model;
mod qwen3;
mod runtime;

#[cfg(test)]
mod tests;

pub use contracts::{
    EvidenceItem, EvidenceMatch, EvidenceMatcher, Gap, GapAnalyzer, JobExtractor,
    JobPostingRiskSignals, JobRequirement, MatchExplanation, RawJobPosting, RecommendationKind,
    RequirementClassifier, RequirementStrength, ResumeDocument, ResumeExtractor, RoleFamily,
    RoleFamilyFitSignals, ScoreConfidence, SkillMention, SkillRelation, StructuredJob,
    StructuredResume, TextSpan,
};
pub use embeddings::EmbeddingGenerator;
pub use evaluation::{
    EvalDatasetKind, EvalFixtureSet, EvidenceLabel, EvidenceLabelEvent, EvidenceLabelExample,
    FeedbackAction, FeedbackEvidenceSummary, HardNegativeExample, HardNegativeMiningSource,
    JobFeedbackEvent, MatchBlocker, ModelImprovementPhase, PairwisePreferenceExample,
    RankingFeatures, RetrievalProvenance,
};
pub use hybrid::{HybridCandidate, HybridScore, HybridScorer, HybridWeights};
pub use manifest::{
    load_model_manifest, model_lock_hash, InstructionProfile, ModelFileSpec, ModelKind,
    ModelManifest, ModelSpec, ScoreThresholds,
};
pub use matcher::{SemanticMatchResult, SemanticMatcher};
pub use model::{ModelManager, ModelStatus};
pub use qwen3::{Qwen3EmbeddingBackend, Qwen3RerankerBackend};
pub use runtime::{
    EmbeddingBackend, EmbeddingInput, EmbeddingInputKind, RerankCandidate, RerankQuery,
    RerankQueryKind, RerankScore, RerankerBackend, RuntimeCompatibility, VectorFreshness,
    VectorFreshnessKey, VectorProvenance,
};

use anyhow::Result;
use thiserror::Error;

/// ML-related errors
#[derive(Error, Debug)]
pub enum MlError {
    #[error("model not downloaded")]
    ModelNotDownloaded(String),

    #[error("model loading failed")]
    ModelLoadFailed(String),

    #[error("inference failed")]
    InferenceFailed(String),

    #[error("tokenization failed")]
    TokenizationFailed(String),

    #[error("download failed")]
    DownloadFailed(String),

    #[error("local ML file operation failed")]
    Io(#[from] std::io::Error),
}

/// Check if ML is available and model is ready
pub async fn is_ml_available(app_data_dir: &std::path::Path) -> Result<bool> {
    let manager = ModelManager::new(app_data_dir.to_path_buf());
    Ok(manager.is_model_downloaded())
}
