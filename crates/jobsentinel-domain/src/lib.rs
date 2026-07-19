//! Pure JobSentinel business values and canonical normalization.

mod application_assistance;
mod external_ai;
mod job;
mod job_hash;
pub mod normalization;
mod scoring_config;
#[cfg(test)]
mod v3_contract_tests;
pub mod v3_contracts;
pub mod v3_evaluation_assertions;
pub mod v3_evaluation_inputs;
#[cfg(test)]
mod v3_evaluation_tests;
pub mod v3_evaluations;
pub mod v3_manifests;

pub use application_assistance::{
    screening_question_matches, AnswerSource, AnswerStatistics, AnswerSuggestion,
    ApplicationAttempt, ApplicationProfile, ApplicationProfileInput, AtsPlatform, AutomationStats,
    AutomationStatus, ModificationExample, ScreeningAnswer,
};
pub use external_ai::{ExternalAiConfig, ExternalAiProvider, ExternalAiRedactionConfig};
pub use job::Job;
pub use job_hash::calculate_job_hash;
pub use normalization::canonicalize_job_url;
pub use scoring_config::ScoringConfig;
pub use v3_contracts::{read_v3_compatibility, CompatibilityDecision, CompatibilityInputKind};
pub use v3_evaluations::{
    parse_v3_evaluation_set, EvaluationAssertion, EvaluationCategory, EvaluationEvidenceTarget,
    EvaluationVerificationTarget, MilitaryServiceBasis, ProtectedVeteranAnswerBasis,
    V3EvaluationCase, V3EvaluationSet,
};
pub use v3_manifests::{PackExecutionClass, PrivacyLabel};
