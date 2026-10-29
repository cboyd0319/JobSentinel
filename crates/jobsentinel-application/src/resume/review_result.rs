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

#[cfg(test)]
mod tests {
    use super::super::{
        read_bounded_resume_source, read_html_resume_source_for_format_review,
        read_managed_html_source, MAX_RESUME_FILE_BYTES,
    };

    #[test]
    fn portable_html_review_uses_moved_managed_reference() {
        let root = tempfile::tempdir().unwrap();
        let original = root.path().join("original");
        let managed = original.join("resume-uploads");
        std::fs::create_dir_all(&managed).unwrap();
        let name = "7d9d16a1-2e5d-4b32-9eb2-bfbffb4ee871--resume.html";
        let path = managed.join(name);
        std::fs::write(&path, "<html><body>Visible resume</body></html>").unwrap();
        let reference =
            jobsentinel_platform::managed_resume_reference(&path, &managed, true).unwrap();
        let moved = root.path().join("moved");
        std::fs::rename(original, &moved).unwrap();
        let managed = moved.join("resume-uploads");
        assert!(read_managed_html_source(&reference, &managed, true)
            .unwrap()
            .contains("Visible resume"));
        assert!(read_managed_html_source(path.to_str().unwrap(), &managed, true).is_none());
        assert!(read_managed_html_source(
            &reference.replace("resume-uploads", "application-resumes"),
            &managed,
            true
        )
        .is_none());
    }

    #[test]
    fn html_resume_source_is_available_only_for_bounded_format_review() {
        let directory = tempfile::tempdir().unwrap();
        let html_path = directory.path().join("Private Resume.html");
        let text_path = directory.path().join("Private Resume.txt");
        let oversized_path = directory.path().join("Private Large Resume.html");
        std::fs::write(&html_path, "<html><body>Jordan Lee</body></html>").unwrap();
        std::fs::write(&text_path, "Jordan Lee").unwrap();
        std::fs::File::create(&oversized_path)
            .unwrap()
            .set_len(MAX_RESUME_FILE_BYTES + 1)
            .unwrap();

        let source = read_html_resume_source_for_format_review(&html_path.to_string_lossy())
            .expect("HTML source should be available for local format review");

        assert!(source.contains("Jordan Lee"));
        assert!(read_html_resume_source_for_format_review(&text_path.to_string_lossy()).is_none());
        assert!(
            read_html_resume_source_for_format_review(&oversized_path.to_string_lossy()).is_none()
        );
        assert!(
            read_bounded_resume_source(std::fs::File::open(&oversized_path).unwrap()).is_none()
        );
    }
}
