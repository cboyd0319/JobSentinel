use super::{map_error, FoundationError};
use jobsentinel_domain::{
    v3_foundation::{
        CareerGraphLink, CareerRelation, CaseFileEventInput, CaseFileEventKind, EventMetadata,
        EventOrigin, GraphProvenance,
    },
    ResumeEvidenceCitation, ResumeEvidenceSnapshot,
};
use jobsentinel_storage::Database;
use std::collections::HashSet;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PacketEvidenceBoundary {
    ClearanceCurrentnessUnverified,
    MilitaryCivilianEquivalenceUnverified,
}

/// An in-memory, user-authored packet claim. It is not a durable packet version.
pub struct EvidenceBoundPacketClaim {
    case_file_id: String,
    claim_id: String,
    text: String,
    evidence_ids: Vec<String>,
    boundaries: Vec<PacketEvidenceBoundary>,
}

impl EvidenceBoundPacketClaim {
    #[must_use]
    pub fn case_file_id(&self) -> &str {
        &self.case_file_id
    }

    #[must_use]
    pub fn claim_id(&self) -> &str {
        &self.claim_id
    }

    #[must_use]
    pub fn text(&self) -> &str {
        &self.text
    }

    #[must_use]
    pub fn evidence_ids(&self) -> &[String] {
        &self.evidence_ids
    }

    #[must_use]
    pub fn boundaries(&self) -> &[PacketEvidenceBoundary] {
        &self.boundaries
    }
}

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

pub async fn prepare_evidence_bound_packet_claim(
    database: &Database,
    case_file_id: &str,
    claim_id: &str,
    reviewed_user_text: String,
    snapshot: &ResumeEvidenceSnapshot,
    citations: &[ResumeEvidenceCitation],
) -> Result<EvidenceBoundPacketClaim, FoundationError> {
    let parsed_claim_id = Uuid::parse_str(claim_id).map_err(|_| FoundationError::InvalidInput)?;
    if parsed_claim_id.is_nil()
        || parsed_claim_id.to_string() != claim_id
        || reviewed_user_text.trim().is_empty()
        || reviewed_user_text.len() > 8_192
        || citations.is_empty()
        || citations.len() > 32
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
    let (current_snapshot, links) = database
        .read_case_file_resume_evidence_context(case_file_id, resume_id)
        .await
        .map_err(map_error)?
        .ok_or(FoundationError::Conflict)?;
    if &current_snapshot != snapshot {
        return Err(FoundationError::Conflict);
    }

    let confirmed_ids = links
        .iter()
        .filter(|link| link.provenance == GraphProvenance::UserConfirmed)
        .map(|link| link.object_id.as_str())
        .collect::<HashSet<_>>();
    let mut evidence_ids = Vec::with_capacity(citations.len());
    let mut seen = HashSet::with_capacity(citations.len());
    let mut boundaries = Vec::new();
    for citation in citations {
        if ResumeEvidenceCitation::for_field(snapshot, &citation.field_path).as_ref()
            != Some(citation)
            || !seen.insert(citation.evidence_id.as_str())
        {
            return Err(FoundationError::InvalidInput);
        }
        if !confirmed_ids.contains(citation.evidence_id.as_str()) {
            return Err(FoundationError::Conflict);
        }
        evidence_ids.push(citation.evidence_id.clone());
        let boundary = match citation.field_path.as_str() {
            "clearance" => Some(PacketEvidenceBoundary::ClearanceCurrentnessUnverified),
            "military_info" => Some(PacketEvidenceBoundary::MilitaryCivilianEquivalenceUnverified),
            _ => None,
        };
        if let Some(boundary) = boundary {
            if !boundaries.contains(&boundary) {
                boundaries.push(boundary);
            }
        }
    }

    Ok(EvidenceBoundPacketClaim {
        case_file_id: case_file_id.to_string(),
        claim_id: claim_id.to_string(),
        text: reviewed_user_text,
        evidence_ids,
        boundaries,
    })
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
