use super::{map_error, FoundationError};
use chrono::NaiveDate;
use jobsentinel_domain::{
    v3_evaluation_inputs::MilitaryBranch,
    v3_foundation::{
        CareerRelation, CaseFileEventInput, CaseFileEventKind, EventMetadata, EventOrigin,
        GraphProvenance,
    },
    v3_veteran_public_service::{
        reviewed_veteran_public_service_resource, VeteranResourceAccess, VeteranResourceUse,
    },
    ResumeEvidenceCitation, ResumeEvidenceSnapshot,
};
use jobsentinel_storage::Database;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MilitarySuggestionBoundary {
    AwaitingUserReview,
    SuggestionOnly,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum MilitarySuggestionReviewStatus {
    UserReviewed,
}

pub struct MilitaryReviewResource {
    resource_id: String,
    display_name: String,
    url: String,
    intended_use: VeteranResourceUse,
    runtime_access: VeteranResourceAccess,
    reviewed_on: NaiveDate,
    source_release: Option<String>,
}

impl MilitaryReviewResource {
    #[must_use]
    pub fn resource_id(&self) -> &str {
        &self.resource_id
    }

    #[must_use]
    pub fn display_name(&self) -> &str {
        &self.display_name
    }

    #[must_use]
    pub fn url(&self) -> &str {
        &self.url
    }

    #[must_use]
    pub fn intended_use(&self) -> VeteranResourceUse {
        self.intended_use
    }

    #[must_use]
    pub fn runtime_access(&self) -> VeteranResourceAccess {
        self.runtime_access
    }

    #[must_use]
    pub fn reviewed_on(&self) -> NaiveDate {
        self.reviewed_on
    }

    #[must_use]
    pub fn source_release(&self) -> Option<&str> {
        self.source_release.as_deref()
    }
}

/// Move-only review state for user-entered wording. The resource is context, not authorship.
pub struct MilitaryOccupationReviewDraft {
    review_id: String,
    case_file_id: String,
    branch: MilitaryBranch,
    occupation_code: String,
    civilian_role: String,
    snapshot: ResumeEvidenceSnapshot,
    citation: ResumeEvidenceCitation,
    resume_id: i64,
    review_resource: MilitaryReviewResource,
}

impl MilitaryOccupationReviewDraft {
    #[must_use]
    pub fn review_id(&self) -> &str {
        &self.review_id
    }

    #[must_use]
    pub fn branch(&self) -> MilitaryBranch {
        self.branch
    }

    #[must_use]
    pub fn occupation_code(&self) -> &str {
        &self.occupation_code
    }

    #[must_use]
    pub fn civilian_role(&self) -> &str {
        &self.civilian_role
    }

    #[must_use]
    pub fn evidence_id(&self) -> &str {
        &self.citation.evidence_id
    }

    #[must_use]
    pub fn review_resource(&self) -> &MilitaryReviewResource {
        &self.review_resource
    }

    #[must_use]
    pub const fn boundary(&self) -> MilitarySuggestionBoundary {
        MilitarySuggestionBoundary::AwaitingUserReview
    }
}

/// An in-memory suggestion confirmed from one exact review draft and fresh local evidence.
pub struct MilitaryOccupationSuggestion {
    case_file_id: String,
    branch: MilitaryBranch,
    occupation_code: String,
    civilian_role: String,
    evidence_id: String,
    review_resource: MilitaryReviewResource,
}

impl MilitaryOccupationSuggestion {
    #[must_use]
    pub fn case_file_id(&self) -> &str {
        &self.case_file_id
    }

    #[must_use]
    pub fn branch(&self) -> MilitaryBranch {
        self.branch
    }

    #[must_use]
    pub fn occupation_code(&self) -> &str {
        &self.occupation_code
    }

    #[must_use]
    pub fn civilian_role(&self) -> &str {
        &self.civilian_role
    }

    #[must_use]
    pub fn evidence_id(&self) -> &str {
        &self.evidence_id
    }

    #[must_use]
    pub fn review_resource(&self) -> &MilitaryReviewResource {
        &self.review_resource
    }

    #[must_use]
    pub const fn review_status(&self) -> MilitarySuggestionReviewStatus {
        MilitarySuggestionReviewStatus::UserReviewed
    }

    #[must_use]
    pub const fn boundary(&self) -> MilitarySuggestionBoundary {
        MilitarySuggestionBoundary::SuggestionOnly
    }
}

#[allow(clippy::too_many_arguments)]
pub fn prepare_military_occupation_review(
    case_file_id: &str,
    branch: MilitaryBranch,
    occupation_code: String,
    civilian_role: String,
    snapshot: &ResumeEvidenceSnapshot,
    citation: &ResumeEvidenceCitation,
    resource_id: &str,
    today: NaiveDate,
) -> Result<MilitaryOccupationReviewDraft, FoundationError> {
    if !valid_trimmed_text(&occupation_code, 32)
        || !valid_trimmed_text(&civilian_role, 256)
        || citation.field_path != "military_info"
        || ResumeEvidenceCitation::for_field(snapshot, "military_info").as_ref() != Some(citation)
    {
        return Err(FoundationError::InvalidInput);
    }
    let resume_id = snapshot
        .source_id
        .strip_prefix("resume:")
        .and_then(|value| value.parse::<i64>().ok())
        .filter(|value| *value > 0)
        .filter(|value| snapshot.source_id == format!("resume:{value}"))
        .ok_or(FoundationError::InvalidInput)?;
    let resource = reviewed_veteran_public_service_resource(resource_id, today)
        .map_err(|_| FoundationError::InvalidInput)?;
    if resource.resource_id != "onet-military-crosswalk"
        || resource.intended_use != VeteranResourceUse::OccupationCrosswalk
        || resource.runtime_access != VeteranResourceAccess::ManualReviewOnly
        || !resource.intended_use.requires_user_confirmed_evidence()
    {
        return Err(FoundationError::InvalidInput);
    }

    Ok(MilitaryOccupationReviewDraft {
        review_id: Uuid::new_v4().to_string(),
        case_file_id: case_file_id.to_string(),
        branch,
        occupation_code,
        civilian_role,
        snapshot: snapshot.clone(),
        citation: citation.clone(),
        resume_id,
        review_resource: MilitaryReviewResource {
            resource_id: resource.resource_id,
            display_name: resource.display_name,
            url: resource.url,
            intended_use: resource.intended_use,
            runtime_access: resource.runtime_access,
            reviewed_on: resource.reviewed_on,
            source_release: resource.source_release,
        },
    })
}

pub async fn confirm_military_occupation_review(
    database: &Database,
    review: MilitaryOccupationReviewDraft,
    receipt: &CaseFileEventInput,
) -> Result<MilitaryOccupationSuggestion, FoundationError> {
    let exact_reference = matches!(
        &receipt.metadata,
        EventMetadata::LocalReference { reference_id } if reference_id == &review.review_id
    );
    if receipt.validate().is_err()
        || receipt.case_file_id != review.case_file_id
        || receipt.kind != CaseFileEventKind::PrivacyReceiptRecorded
        || receipt.origin != EventOrigin::User
        || !receipt.user_action
        || !exact_reference
    {
        return Err(FoundationError::InvalidInput);
    }
    let (current_snapshot, links) = database
        .read_case_file_resume_evidence_context(&review.case_file_id, review.resume_id)
        .await
        .map_err(map_error)?
        .ok_or(FoundationError::Conflict)?;
    if current_snapshot != review.snapshot
        || !links.iter().any(|link| {
            link.relation == CareerRelation::Evidence
                && link.provenance == GraphProvenance::UserConfirmed
                && link.object_id == review.citation.evidence_id
        })
    {
        return Err(FoundationError::Conflict);
    }

    Ok(MilitaryOccupationSuggestion {
        case_file_id: review.case_file_id,
        branch: review.branch,
        occupation_code: review.occupation_code,
        civilian_role: review.civilian_role,
        evidence_id: review.citation.evidence_id,
        review_resource: review.review_resource,
    })
}

fn valid_trimmed_text(value: &str, maximum: usize) -> bool {
    !value.is_empty()
        && value == value.trim()
        && value.chars().count() <= maximum
        && !value.chars().any(char::is_control)
}
