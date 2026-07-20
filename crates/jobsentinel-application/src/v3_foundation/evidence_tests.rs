use super::*;
use crate::test_support::test_job;
use jobsentinel_domain::{
    v3_foundation::{
        CaseFileEventInput, CaseFileEventKind, EventMetadata, EventOrigin, GraphProvenance,
    },
    v3_manifests::PrivacyLabel,
    ResumeEvidenceCitation, ResumeEvidenceSnapshot,
};
use jobsentinel_storage::Database;

fn user_confirmation(case_file_id: &str, evidence_id: &str) -> CaseFileEventInput {
    CaseFileEventInput {
        case_file_id: case_file_id.to_string(),
        kind: CaseFileEventKind::EvidenceLinked,
        origin: EventOrigin::User,
        user_action: true,
        privacy_labels: [PrivacyLabel::LocalOnly, PrivacyLabel::Sensitive],
        metadata: EventMetadata::LocalReference {
            reference_id: evidence_id.to_string(),
        },
    }
}

#[tokio::test]
async fn application_requires_explicit_exact_resume_evidence_confirmation() {
    let database = Database::connect_memory().await.unwrap();
    database.migrate().await.unwrap();
    database
        .insert_job_if_new(&test_job("job-1", "Office Assistant", "Example"))
        .await
        .unwrap();
    let case_file = create_or_reuse_case_file(&database, "job-1").await.unwrap();
    let snapshot = ResumeEvidenceSnapshot {
        source_id: "resume-1".to_string(),
        revision: "revision-1".to_string(),
    };
    let citation =
        ResumeEvidenceCitation::for_field(&snapshot, "experience.0.achievements.0").unwrap();
    let confirmation = user_confirmation(&case_file.case_file_id, &citation.evidence_id);

    assert_eq!(
        record_case_file_event(&database, &confirmation)
            .await
            .unwrap_err(),
        FoundationError::InvalidInput
    );
    assert!(database
        .list_case_file_events(&case_file.case_file_id)
        .await
        .unwrap()
        .is_empty());
    assert!(
        confirm_resume_evidence_for_case(&database, &snapshot, &citation, &confirmation)
            .await
            .unwrap()
    );
    let links = read_case_file_evidence_links(&database, &case_file.case_file_id)
        .await
        .unwrap();
    assert_eq!(links.len(), 1);
    assert_eq!(links[0].object_id, citation.evidence_id);
    assert_eq!(links[0].provenance, GraphProvenance::UserConfirmed);

    let mut tampered = citation.clone();
    tampered.field_path = "summary".to_string();
    assert_eq!(
        confirm_resume_evidence_for_case(&database, &snapshot, &tampered, &confirmation)
            .await
            .unwrap_err(),
        FoundationError::InvalidInput
    );

    let edited_snapshot = ResumeEvidenceSnapshot {
        source_id: snapshot.source_id.clone(),
        revision: "revision-2".to_string(),
    };
    let edited_citation =
        ResumeEvidenceCitation::for_field(&edited_snapshot, &citation.field_path).unwrap();
    assert_eq!(
        confirm_resume_evidence_for_case(&database, &edited_snapshot, &citation, &confirmation)
            .await
            .unwrap_err(),
        FoundationError::InvalidInput
    );
    assert!(links
        .iter()
        .all(|link| link.object_id != edited_citation.evidence_id));

    let mut system_event = user_confirmation(&case_file.case_file_id, &edited_citation.evidence_id);
    system_event.origin = EventOrigin::System;
    system_event.user_action = false;
    assert_eq!(
        confirm_resume_evidence_for_case(
            &database,
            &edited_snapshot,
            &edited_citation,
            &system_event,
        )
        .await
        .unwrap_err(),
        FoundationError::InvalidInput
    );
}
