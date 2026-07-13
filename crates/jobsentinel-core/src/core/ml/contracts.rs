//! Domain contracts for evidence-grounded resume and job matching.

use anyhow::Result;

use crate::core::ml::{EvidenceLabel, MatchBlocker};

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RoleFamily {
    SecurityEngineering,
    DetectionEngineering,
    CloudSecurity,
    ProductSecurity,
    PlatformSecurity,
    SoftwareEngineering,
    DevOpsPlatform,
    DataEngineering,
    ProductManagement,
    ContentStrategy,
    Operations,
    Healthcare,
    CustomerSupport,
    Sales,
    Marketing,
    Education,
    Trades,
    Other,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RecommendationKind {
    RealJobPosting,
    SearchQuerySuggestion,
    TargetRoleSuggestion,
    ResumeImprovementSuggestion,
}

impl RecommendationKind {
    pub fn is_real_job(&self) -> bool {
        matches!(self, Self::RealJobPosting)
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RoleFamilyFitSignals {
    pub exact_title_similarity: f32,
    pub role_family_match: f32,
    pub adjacent_role_family_match: f32,
    pub seniority_fit: f32,
    pub domain_fit: f32,
}

impl RoleFamilyFitSignals {
    pub fn score(&self) -> f32 {
        weighted_average([
            (self.exact_title_similarity, 0.25),
            (self.role_family_match, 0.25),
            (self.adjacent_role_family_match, 0.15),
            (self.seniority_fit, 0.20),
            (self.domain_fit, 0.15),
        ])
    }
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SkillRelation {
    Alias,
    ProductExample,
    Broader,
    Narrower,
    Adjacent,
    Prerequisite,
    Confusable,
}

impl SkillRelation {
    pub fn is_equivalent(&self) -> bool {
        matches!(self, Self::Alias)
    }
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
pub struct TextSpan {
    pub start: usize,
    pub end: usize,
}

impl TextSpan {
    pub fn is_valid_for(&self, text: &str) -> bool {
        self.start <= self.end
            && self.end <= text.len()
            && text.is_char_boundary(self.start)
            && text.is_char_boundary(self.end)
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct SkillMention {
    pub original_text: String,
    pub canonical_skill: String,
    pub category: String,
    pub relation_strength: f32,
    pub evidence_span: TextSpan,
    pub confidence: f32,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RequirementStrength {
    HardRequired,
    SoftRequired,
    Preferred,
    Responsibility,
    Fluff,
    Unknown,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct JobRequirement {
    pub id: String,
    pub text: String,
    pub strength: RequirementStrength,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct EvidenceItem {
    pub requirement_id: String,
    pub source_id: String,
    pub text: String,
    pub span: Option<TextSpan>,
    pub label: EvidenceLabel,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ScoreConfidence {
    NoEvidence,
    Low,
    Medium,
    High,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct MatchExplanation {
    pub strong_evidence: Vec<EvidenceItem>,
    pub partial_evidence: Vec<EvidenceItem>,
    pub missing_requirements: Vec<JobRequirement>,
    pub hard_blockers: Vec<MatchBlocker>,
    pub confidence: ScoreConfidence,
}

impl MatchExplanation {
    pub fn evidence_count(&self) -> usize {
        self.strong_evidence.len() + self.partial_evidence.len()
    }
}

#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
pub struct JobPostingRiskSignals {
    pub hidden_text_detected: bool,
    pub keyword_stuffing_score: f32,
    pub apply_domain_mismatch: bool,
    pub suspicious_contact_method: bool,
    pub salary_claim_confidence: f32,
    pub duplicate_cluster_size: usize,
    pub llm_instruction_in_page: bool,
}

impl JobPostingRiskSignals {
    pub fn needs_user_review(&self) -> bool {
        self.hidden_text_detected
            || self.apply_domain_mismatch
            || self.suspicious_contact_method
            || self.llm_instruction_in_page
            || self.keyword_stuffing_score >= 0.70
    }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ResumeDocument {
    pub id: String,
    pub text: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct StructuredResume {
    pub id: String,
    pub summary: Option<String>,
    pub skills: Vec<SkillMention>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RawJobPosting {
    pub id: String,
    pub title: String,
    pub company: String,
    pub text: String,
    pub source_url: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct StructuredJob {
    pub id: String,
    pub title: String,
    pub company: String,
    pub role_family: Option<RoleFamily>,
    pub requirements: Vec<JobRequirement>,
    pub risk_signals: JobPostingRiskSignals,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct EvidenceMatch {
    pub requirement_id: String,
    pub evidence: EvidenceItem,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Gap {
    pub requirement_id: String,
    pub description: String,
    pub blocker: Option<MatchBlocker>,
}

pub trait ResumeExtractor {
    fn extract(&self, input: ResumeDocument) -> Result<StructuredResume>;
}

pub trait JobExtractor {
    fn extract(&self, input: RawJobPosting) -> Result<StructuredJob>;
}

pub trait RequirementClassifier {
    fn classify(&self, job: &StructuredJob) -> Result<Vec<JobRequirement>>;
}

pub trait EvidenceMatcher {
    fn match_evidence(
        &self,
        requirement: &JobRequirement,
        resume: &StructuredResume,
    ) -> Result<Vec<EvidenceMatch>>;
}

pub trait GapAnalyzer {
    fn analyze(
        &self,
        requirements: &[JobRequirement],
        evidence: &[EvidenceMatch],
    ) -> Result<Vec<Gap>>;
}

fn weighted_average(signals: [(f32, f32); 5]) -> f32 {
    let (weighted, total_weight) =
        signals
            .into_iter()
            .fold((0.0_f32, 0.0_f32), |(weighted, total), (signal, weight)| {
                if weight <= 0.0 {
                    return (weighted, total);
                }

                (weighted + signal.clamp(0.0, 1.0) * weight, total + weight)
            });

    if total_weight > 0.0 {
        weighted / total_weight
    } else {
        0.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generated_recommendations_are_not_real_jobs() {
        assert!(RecommendationKind::RealJobPosting.is_real_job());
        assert!(!RecommendationKind::SearchQuerySuggestion.is_real_job());
        assert!(!RecommendationKind::TargetRoleSuggestion.is_real_job());
        assert!(!RecommendationKind::ResumeImprovementSuggestion.is_real_job());
    }

    #[test]
    fn role_family_fit_blends_title_family_seniority_and_domain() {
        let exact = RoleFamilyFitSignals {
            exact_title_similarity: 1.0,
            role_family_match: 1.0,
            adjacent_role_family_match: 0.0,
            seniority_fit: 1.0,
            domain_fit: 1.0,
        };
        let adjacent = RoleFamilyFitSignals {
            exact_title_similarity: 0.30,
            role_family_match: 0.0,
            adjacent_role_family_match: 1.0,
            seniority_fit: 0.80,
            domain_fit: 0.90,
        };

        assert!(exact.score() > adjacent.score());
        assert!(adjacent.score() > 0.40);
    }

    #[test]
    fn confusable_skill_relations_are_not_equivalent() {
        assert!(SkillRelation::Alias.is_equivalent());
        assert!(!SkillRelation::Confusable.is_equivalent());
        assert!(!SkillRelation::ProductExample.is_equivalent());
    }

    #[test]
    fn text_spans_validate_utf8_boundaries() {
        let text = "built CloudTrail detections";
        let valid = TextSpan { start: 6, end: 16 };
        let invalid = TextSpan {
            start: 6,
            end: text.len() + 1,
        };

        assert!(valid.is_valid_for(text));
        assert!(!invalid.is_valid_for(text));
    }

    #[test]
    fn risky_posting_signals_require_user_review() {
        let mut signals = JobPostingRiskSignals::default();
        assert!(!signals.needs_user_review());

        signals.llm_instruction_in_page = true;
        assert!(signals.needs_user_review());
    }

    #[test]
    fn match_explanations_keep_evidence_separate_from_gaps() {
        let explanation = MatchExplanation {
            strong_evidence: vec![EvidenceItem {
                requirement_id: "req_cloudtrail".to_string(),
                source_id: "resume_chunk_1".to_string(),
                text: "Built CloudTrail detections for suspicious permission changes.".to_string(),
                span: None,
                label: EvidenceLabel::StrongDirectEvidence,
            }],
            partial_evidence: Vec::new(),
            missing_requirements: vec![JobRequirement {
                id: "req_fedramp".to_string(),
                text: "FedRAMP authorization package ownership".to_string(),
                strength: RequirementStrength::Preferred,
            }],
            hard_blockers: Vec::new(),
            confidence: ScoreConfidence::High,
        };

        assert_eq!(explanation.evidence_count(), 1);
        assert_eq!(explanation.missing_requirements.len(), 1);
    }
}
