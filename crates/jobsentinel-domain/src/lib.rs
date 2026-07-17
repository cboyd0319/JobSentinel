//! Pure JobSentinel business values and canonical normalization.

mod application_assistance;
mod external_ai;
mod job;
mod job_hash;
pub mod normalization;
mod scoring_config;

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
