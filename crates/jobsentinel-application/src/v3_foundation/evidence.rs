use super::{map_error, FoundationError};
use jobsentinel_domain::{
    v3_foundation::{
        CareerGraphLink, CareerRelation, CaseFileEventInput, CaseFileEventKind, EventMetadata,
        EventOrigin, GraphProvenance,
    },
    ResumeEvidenceCitation, ResumeEvidenceSnapshot,
};
use jobsentinel_storage::Database;
use uuid::Uuid;

pub async fn confirm_resume_evidence_for_case(
    database: &Database,
    snapshot: &ResumeEvidenceSnapshot,
    citation: &ResumeEvidenceCitation,
    confirmation: &CaseFileEventInput,
) -> Result<bool, FoundationError> {
    let reference_matches = matches!(
        &confirmation.metadata,
        EventMetadata::LocalReference { reference_id } if reference_id == &citation.evidence_id
    );
    if ResumeEvidenceCitation::for_field(snapshot, &citation.field_path).as_ref() != Some(citation)
        || confirmation.validate().is_err()
        || confirmation.kind != CaseFileEventKind::EvidenceLinked
        || confirmation.origin != EventOrigin::User
        || !confirmation.user_action
        || !reference_matches
    {
        return Err(FoundationError::InvalidInput);
    }
    let link = CareerGraphLink {
        link_id: Uuid::new_v4().to_string(),
        subject_id: confirmation.case_file_id.clone(),
        relation: CareerRelation::Evidence,
        object_id: citation.evidence_id.clone(),
        provenance: GraphProvenance::UserConfirmed,
        provenance_ref: None,
    };
    database
        .insert_case_file_evidence(&link, confirmation)
        .await
        .map_err(map_error)
}

pub async fn read_case_file_evidence_links(
    database: &Database,
    case_file_id: &str,
) -> Result<Vec<CareerGraphLink>, FoundationError> {
    database
        .list_case_file_evidence_links(case_file_id)
        .await
        .map_err(map_error)
}
