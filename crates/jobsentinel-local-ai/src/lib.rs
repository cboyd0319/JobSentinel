//! Exposes governed on-device matching, model provenance, and cooperative inference cancellation.

#![cfg(feature = "embedded-ml")]

mod cancellation;
mod contracts;
mod embeddings;
mod evaluation;
mod hybrid;
mod manifest;
mod matcher;
mod model;
mod provenance;
mod qwen3;
mod runtime;

#[cfg(test)]
mod tests;

pub use cancellation::{InferenceCancellation, InferenceCancelled};
pub use contracts::{
    EvidenceItem, EvidenceMatch, EvidenceMatcher, ExtractedResume, Gap, GapAnalyzer, JobExtractor,
    JobPostingRiskSignals, JobRequirement, MatchExplanation, RawJobPosting, RecommendationKind,
    RequirementClassifier, RequirementStrength, ResumeDocument, ResumeExtractor, RoleFamily,
    RoleFamilyFitSignals, ScoreConfidence, SkillMention, SkillRelation, StructuredJob, TextSpan,
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
    load_model_manifest, model_lock_hash, validate_v3_vector_contract, InstructionProfile,
    ModelFileSpec, ModelKind, ModelManifest, ModelSpec, ScoreThresholds,
};
pub use matcher::{
    validate_local_matching_inputs, validate_resume_embeddings, SemanticMatchResult,
    SemanticMatcher, SemanticRuntimeProfile, SemanticUnmatchedReason, SkillMatch,
    UnmatchedRequirementDiagnostic,
};
pub use model::status::{ModelCacheHealth, ModelStatus};
pub use model::ModelManager;
pub use provenance::default_resume_embedding_provenance;
pub use qwen3::{Qwen3EmbeddingBackend, Qwen3RerankerBackend};
pub use runtime::{
    EmbeddingBackend, EmbeddingInput, EmbeddingInputKind, RerankCandidate, RerankQuery,
    RerankQueryKind, RerankScore, RerankerBackend, RuntimeCompatibility, VectorFreshness,
    VectorFreshnessKey, VectorProvenance,
};

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
