//! Runs cited resume reviews off the async executor with exclusive local model ownership.

#[cfg(feature = "embedded-ml")]
use crate::application::resume::SemanticUnavailableReason;
use crate::application::resume::{
    self, ActiveResumeAnalysisError, ResumeAnalysisInput, ResumeJobReview, ResumeMatchingProfile,
};
use crate::bootstrap::operation::{OperationAdmission, OperationLease, State};
use crate::bootstrap::AppState;
use crate::ipc::errors::user_friendly_error;
use std::sync::Arc;

#[tauri::command]
pub(crate) async fn analyze_resume_for_job(
    resume: ResumeAnalysisInput,
    job_description: String,
    matching_profile: Option<ResumeMatchingProfile>,
    request_id: Option<String>,
    operation: State<'_, Arc<OperationAdmission>>,
) -> Result<ResumeJobReview, String> {
    analyze_resume_for_job_inner(
        resume,
        job_description,
        matching_profile,
        request_id,
        operation.lease(),
    )
    .await
}

pub(super) async fn analyze_resume_for_job_inner(
    resume: ResumeAnalysisInput,
    job_description: String,
    matching_profile: Option<ResumeMatchingProfile>,
    request_id: Option<String>,
    operation: Arc<OperationLease>,
) -> Result<ResumeJobReview, String> {
    #[cfg(feature = "embedded-ml")]
    let request = crate::ipc::ml::InferenceRequest(Default::default());
    #[cfg(feature = "embedded-ml")]
    let cancellation = request.0.clone();
    #[cfg(feature = "embedded-ml")]
    let reservation =
        crate::ipc::ml::reserve_inference(request_id.clone(), cancellation.clone()).ok();
    let _ = request_id;
    tokio::task::spawn_blocking(move || {
        let _operation = operation;
        #[cfg(feature = "embedded-ml")]
        cancellation
            .check()
            .map_err(|_| "Resume review cancelled.".to_string())?;
        #[cfg(feature = "embedded-ml")]
        if let Some(reservation) = reservation {
            let _reservation = reservation;
            let directory = crate::ipc::ml::matching_directory()?;
            return resume::review_structured_resume_for_job_with_cancellation(
                resume,
                &job_description,
                matching_profile,
                directory.path,
                cancellation,
            )
            .map_err(|error| user_friendly_error("Failed to analyze resume", error));
        }
        let review = resume::analyze_structured_resume_for_job_with_profile(
            resume,
            &job_description,
            matching_profile,
        )
        .map(ResumeJobReview::from)
        .map_err(|error| user_friendly_error("Failed to analyze resume", error))?;
        #[cfg(feature = "embedded-ml")]
        let review = review.without_semantic(SemanticUnavailableReason::Busy);
        Ok(review)
    })
    .await
    .map_err(|error| user_friendly_error("Resume review could not finish", error))?
}

#[tauri::command]
pub(crate) async fn analyze_active_resume_for_job(
    job_description: String,
    matching_profile: Option<ResumeMatchingProfile>,
    request_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<ResumeJobReview, String> {
    if job_description.trim().is_empty() {
        return Err("Paste the job post, then review again.".to_string());
    }
    let operation = state.lease();
    let database = state.database.clone();
    let runtime = tokio::runtime::Handle::current();
    #[cfg(feature = "embedded-ml")]
    let request = crate::ipc::ml::InferenceRequest(Default::default());
    #[cfg(feature = "embedded-ml")]
    let cancellation = request.0.clone();
    #[cfg(feature = "embedded-ml")]
    let reservation =
        crate::ipc::ml::reserve_inference(request_id.clone(), cancellation.clone()).ok();
    let _ = request_id;
    tokio::task::spawn_blocking(move || {
        let _operation = operation;
        #[cfg(feature = "embedded-ml")]
        cancellation
            .check()
            .map_err(|_| "Resume review cancelled.".to_string())?;
        #[cfg(feature = "embedded-ml")]
        if let Some(reservation) = reservation {
            let _reservation = reservation;
            let directory = crate::ipc::ml::matching_directory()?;
            return runtime
                .block_on(resume::review_active_resume_for_job_with_cancellation(
                    &database,
                    &job_description,
                    matching_profile,
                    directory.path,
                    cancellation,
                ))
                .map_err(active_review_error);
        }
        let review = runtime
            .block_on(resume::review_active_resume_without_semantic(
                &database,
                &job_description,
                matching_profile,
            ))
            .map_err(active_review_error)?;
        #[cfg(feature = "embedded-ml")]
        let review = review.without_semantic(SemanticUnavailableReason::Busy);
        Ok(review)
    })
    .await
    .map_err(|error| user_friendly_error("Resume review could not finish", error))?
}

#[tauri::command]
pub(crate) async fn match_resume_semantic(
    resume_id: i64,
    job_hash: String,
    request_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<serde_json::Value, String> {
    super::resume_match_debugger_commands::validate_saved_match_debugger_args(
        &job_hash, resume_id,
    )?;
    #[cfg(not(feature = "embedded-ml"))]
    {
        let _ = (state, request_id);
        Ok(serde_json::Value::Null)
    }
    #[cfg(feature = "embedded-ml")]
    {
        let request = crate::ipc::ml::InferenceRequest(Default::default());
        let cancellation = request.0.clone();
        let reservation = crate::ipc::ml::reserve_inference(request_id, cancellation.clone())?;
        let operation = state.lease();
        let database = state.database.clone();
        let runtime = tokio::runtime::Handle::current();
        tokio::task::spawn_blocking(move || {
            let _operation = operation;
            let _reservation = reservation;
            let directory = crate::ipc::ml::matching_directory()?;
            let result = runtime
                .block_on(resume::match_resume_semantic_with_cancellation(
                    &database,
                    directory.path,
                    resume_id,
                    &job_hash,
                    cancellation,
                ))
                .map_err(|error| user_friendly_error("Failed to review saved match", error))?;
            serde_json::to_value(result)
                .map_err(|error| user_friendly_error("Failed to serialize review", error))
        })
        .await
        .map_err(|error| user_friendly_error("Saved match review could not finish", error))?
    }
}

fn active_review_error(error: ActiveResumeAnalysisError) -> String {
    match error {
        ActiveResumeAnalysisError::Missing => "Choose or add a resume before reviewing job fit.".into(),
        ActiveResumeAnalysisError::Unreadable => "JobSentinel could not find readable text in the active resume. Add a PDF, DOCX, TXT, Markdown, or HTML resume with readable text, or use Import from Resume App.".into(),
        ActiveResumeAnalysisError::Changed => "Your active resume changed while the review was running. Review it and try again.".into(),
        ActiveResumeAnalysisError::Internal(error) => user_friendly_error("Failed to analyze active resume", error),
    }
}

#[cfg(all(test, feature = "embedded-ml"))]
mod tests {
    use super::*;

    #[tokio::test]
    async fn review_dispatch_uses_isolated_model_free_matching_and_busy_fallback() {
        let _serial = crate::ipc::ml::MODEL_TEST_LOCK.lock().await;
        let mut input = ResumeAnalysisInput::default();
        input.resume.summary = Some("Rust".into());
        let review = analyze_resume_for_job_inner(
            input.clone(),
            "Required: Rust".into(),
            None,
            None,
            Arc::new(OperationAdmission::default()).admit().unwrap(),
        )
        .await
        .unwrap();
        assert_eq!(
            serde_json::to_value(review.semantic_assessment.unwrap()).unwrap()["runtime_profile"],
            "deterministic_exact"
        );
        assert!(review.semantic_unavailable_reason.is_none());
        let reservation = crate::ipc::ml::reserve_model_lifecycle(None).unwrap();
        let busy = analyze_resume_for_job_inner(
            input,
            "Required: Rust".into(),
            None,
            None,
            Arc::new(OperationAdmission::default()).admit().unwrap(),
        )
        .await
        .unwrap();
        assert_eq!(
            busy.semantic_unavailable_reason,
            Some(SemanticUnavailableReason::Busy)
        );
        assert!(busy.semantic_assessment.is_none());
        assert_eq!(
            serde_json::to_value(review.analysis).unwrap(),
            serde_json::to_value(busy.analysis).unwrap()
        );
        drop(reservation);
        assert!(crate::ipc::ml::reserve_model_lifecycle(None).is_ok());
    }
}
