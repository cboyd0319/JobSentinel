//! Builds ATS reviews from captured resume context and binds optional semantic results to that snapshot.

use super::*;

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub enum SemanticUnavailableReason {
    Busy,
    InputUnavailable,
    ModelUnavailable,
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
pub struct ResumeReviewSnapshot {
    pub resume_id: i64,
    pub revision: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, serde::Serialize)]
pub struct ResumeJobReview {
    #[serde(flatten)]
    pub analysis: AtsAnalysisResult,
    pub resume_snapshot: Option<ResumeReviewSnapshot>,
    pub semantic_unavailable_reason: Option<SemanticUnavailableReason>,
    #[cfg(feature = "embedded-ml")]
    pub semantic_assessment: Option<EvidenceBoundSemanticMatch>,
}

impl From<AtsAnalysisResult> for ResumeJobReview {
    fn from(analysis: AtsAnalysisResult) -> Self {
        Self {
            analysis,
            resume_snapshot: None,
            semantic_unavailable_reason: None,
            #[cfg(feature = "embedded-ml")]
            semantic_assessment: None,
        }
    }
}

impl ResumeJobReview {
    pub(super) fn with_resume_snapshot(mut self, context: &ActiveResumeAnalysisContext) -> Self {
        self.resume_snapshot = Some(ResumeReviewSnapshot {
            resume_id: context.resume_id,
            revision: context.revision,
        });
        self
    }

    pub fn without_semantic(mut self, reason: SemanticUnavailableReason) -> Self {
        self.semantic_unavailable_reason = Some(reason);
        #[cfg(feature = "embedded-ml")]
        {
            self.semantic_assessment = None;
        }
        self
    }
}

pub(super) fn analyze_captured_resume(
    context: &ActiveResumeAnalysisContext,
    job_description: &str,
    profile: Option<ResumeMatchingProfile>,
) -> AtsAnalysisResult {
    let evidence_snapshot = ResumeEvidenceSnapshot {
        source_id: format!("resume:{}", context.resume_id),
        revision: context.revision.to_rfc3339(),
    };
    match profile {
        Some(profile) => AtsAnalyzer::analyze_text_for_job_with_source_snapshot_and_profile(
            context.parsed_text.trim(),
            &context.skill_names,
            job_description,
            context.source_text.as_deref(),
            &evidence_snapshot,
            profile,
        ),
        None => AtsAnalyzer::analyze_text_for_job_with_source_and_snapshot(
            context.parsed_text.trim(),
            &context.skill_names,
            job_description,
            context.source_text.as_deref(),
            &evidence_snapshot,
        ),
    }
}
