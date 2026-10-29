//! Pure JobSentinel business values and canonical normalization.

mod application_assistance;
#[cfg(test)]
mod contract_tests;
pub mod contracts;
mod country_codes;
#[cfg(test)]
mod employer_evaluation_tests;
pub mod evaluation_assertions;
pub mod evaluation_inputs;
#[cfg(test)]
mod evaluation_tests;
pub mod evaluations;
pub mod evidence;
#[cfg(test)]
mod evidence_reviewer_evaluation_tests;
mod external_ai;
pub mod foundation;
mod job;
mod job_geography;
mod job_hash;
mod listed_pay;
pub mod manifests;
pub mod normalization;
#[cfg(test)]
mod pack_payload_tests;
pub mod pack_payloads;
#[cfg(test)]
mod pack_static_skill_tests;
#[cfg(test)]
mod region_manifest_tests;
pub mod region_starter;
mod scoring_config;
#[cfg(test)]
mod signed_pack_tests;
pub mod signed_packs;
pub mod source_authorization;
pub mod source_consent;
#[cfg(test)]
mod source_freshness_tests;
pub mod source_manifest;
#[cfg(test)]
mod source_manifest_linkedin_tests;
#[cfg(test)]
mod source_manifest_tests;
#[cfg(test)]
mod source_manifest_user_actions_tests;
#[cfg(test)]
mod source_simulator_tests;
pub mod veteran_public_service;

pub use application_assistance::{
    requires_user_answer, screening_question_matches, AnswerSource, AnswerStatistics,
    AnswerSuggestion, ApplicationAttempt, ApplicationProfile, ApplicationProfileInput, AtsPlatform,
    AutomationStats, AutomationStatus, ModificationExample, ScreeningAnswer,
};
pub use country_codes::{country_options, normalize_country_code};
pub use evaluations::{
    parse_evaluation_set, EvaluationAssertion, EvaluationCase, EvaluationCategory,
    EvaluationEvidenceTarget, EvaluationSet, EvaluationVerificationTarget, MilitaryServiceBasis,
    ProtectedVeteranAnswerBasis,
};
pub use evidence::{ResumeEvidenceCitation, ResumeEvidenceSnapshot};
pub use external_ai::{ExternalAiConfig, ExternalAiProvider, ExternalAiRedactionConfig};
pub use job::Job;
pub use job_geography::{CountryObservation, JobGeography, LocationObservation};
pub use job_hash::calculate_job_hash;
pub use listed_pay::{ListedPay, PayQualifier};
pub use manifests::{PackExecutionClass, PrivacyLabel};
pub use normalization::canonicalize_job_url;
pub use region_starter::{
    parse_region_starter_data, RegionCvProfile, RegionMappingType, RegionPackContent,
    RegionSourceNote, RegionStarterData, RegionTaxonomyMapping,
};
pub use scoring_config::ScoringConfig;
