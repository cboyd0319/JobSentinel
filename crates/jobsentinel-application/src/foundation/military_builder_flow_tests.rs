// Characterizes the generic Resume Builder to local DOCX military-review workflow.

use super::saved_match_military_transition_tests::wording as transition_wording;
use super::*;
use crate::test_support::test_job;
use jobsentinel_documents::{
    ResumeExperience, ResumeExporter, ResumePersonalInfo, ResumeSkill, TemplateId,
};
use jobsentinel_domain::{v3_evaluation_inputs::MilitaryBranch, ResumeEvidenceCitation};
use jobsentinel_storage::{
    resume::{DraftExperience, DraftSkill},
    Database,
};

async fn build_and_upload_docx(
    database: &Database,
    name: &str,
    summary: &str,
    experience: Option<ResumeExperience>,
    skills: Vec<DraftSkill>,
) -> (i64, String) {
    let builder = database.resume_builder();
    let draft_id = builder.create_resume().await.unwrap();
    builder
        .update_contact(
            draft_id,
            ResumePersonalInfo {
                name: name.to_string(),
                email: "jordan@example.com".to_string(),
                ..ResumePersonalInfo::default()
            },
        )
        .await
        .unwrap();
    builder
        .update_summary(draft_id, summary.to_string())
        .await
        .unwrap();
    if let Some(experience) = experience {
        builder
            .add_experience(draft_id, DraftExperience { id: 0, experience })
            .await
            .unwrap();
    }
    builder.set_skills(draft_id, skills).await.unwrap();
    let draft = builder.get_resume(draft_id).await.unwrap().unwrap();
    assert!(draft.resume.military_info.is_none());
    assert!(draft.resume.clearance.is_none());

    let directory = tempfile::tempdir().unwrap();
    let path = directory.path().join("military-builder-resume.docx");
    std::fs::write(
        &path,
        ResumeExporter::export_docx(&draft.resume, TemplateId::Professional).unwrap(),
    )
    .unwrap();
    let resume_id = database
        .resume_matcher()
        .upload_resume(name, path.to_str().unwrap())
        .await
        .unwrap();
    let parsed_text = database
        .resume_matcher()
        .get_resume(resume_id)
        .await
        .unwrap()
        .parsed_text
        .unwrap();
    (resume_id, parsed_text)
}

async fn save_match(database: &Database, hash: &str, description: &str, resume_id: i64) {
    let mut job = test_job(hash, "Example role", "Example");
    job.description = Some(description.to_string());
    database.insert_job_if_new(&job).await.unwrap();
    database
        .resume_matcher()
        .match_resume_to_job(resume_id, hash)
        .await
        .unwrap();
}

async fn confirm_military_service(database: &Database, hash: &str, resume_id: i64) {
    assert!(confirm_saved_match_military_evidence(
        database,
        hash,
        resume_id,
        SavedMatchMilitaryEvidenceKind::MilitaryService,
    )
    .await
    .unwrap());
}

fn assert_suggestion_boundary(
    confirmation: &SavedMatchMilitaryTransitionConfirmation,
    clearance: Option<&str>,
) {
    let serialized = serde_json::to_value(confirmation).unwrap();
    assert_eq!(
        serialized.get("boundary"),
        Some(&serde_json::json!("suggestion_only"))
    );
    assert_eq!(
        serialized.get("clearance_currentness"),
        Some(&serde_json::json!("not_verified"))
    );
    assert_eq!(
        serialized.get("military_civilian_equivalence"),
        Some(&serde_json::json!("not_verified"))
    );
    assert_eq!(
        serialized.get("user_confirmed_current_clearance"),
        Some(&serde_json::to_value(clearance).unwrap())
    );
}

#[tokio::test]
async fn generic_resume_builder_docx_upload_enables_explicit_military_review_without_special_fields(
) {
    let database = Database::connect_memory().await.unwrap();
    database.migrate().await.unwrap();
    let (resume_id, parsed_text) = build_and_upload_docx(
        &database,
        "Jordan Lee",
        "Army 25B veteran and early-career network support professional; Current Secret clearance.",
        Some(ResumeExperience {
            company: "U.S. Army".to_string(),
            title: "25B Information Technology Specialist".to_string(),
            location: Some("Fort Carson, CO".to_string()),
            start_date: "2022-01".to_string(),
            end_date: Some("2025-01".to_string()),
            is_current: false,
            achievements: vec![
                "Configured tactical networks".to_string(),
                "Resolved service incidents".to_string(),
            ],
        }),
        vec![
            DraftSkill {
                category: "Credentials".to_string(),
                skill: ResumeSkill {
                    name: "CompTIA Security+".to_string(),
                    ..ResumeSkill::default()
                },
            },
            DraftSkill {
                category: "Technical".to_string(),
                skill: ResumeSkill {
                    name: "Network support".to_string(),
                    ..ResumeSkill::default()
                },
            },
        ],
    )
    .await;
    for evidence in [
        "Army 25B",
        "Configured tactical networks",
        "Resolved service incidents",
        "CompTIA Security+",
        "Secret clearance",
    ] {
        assert!(parsed_text.contains(evidence), "missing {evidence}");
    }

    let job_hash = "military-builder-docx-transition";
    save_match(&database, job_hash, "Required: network support", resume_id).await;

    let snapshot = database
        .resume_matcher()
        .get_resume_evidence_snapshot(resume_id)
        .await
        .unwrap()
        .unwrap();
    let military = ResumeEvidenceCitation::for_field(&snapshot, "military_info").unwrap();
    let clearance = ResumeEvidenceCitation::for_field(&snapshot, "clearance").unwrap();
    assert!(confirm_saved_match_military_evidence(
        &database,
        job_hash,
        resume_id,
        SavedMatchMilitaryEvidenceKind::MilitaryService,
    )
    .await
    .unwrap());
    assert!(confirm_saved_match_military_evidence(
        &database,
        job_hash,
        resume_id,
        SavedMatchMilitaryEvidenceKind::CurrentClearance,
    )
    .await
    .unwrap());
    let confirmed = database
        .read_saved_match_confirmed_evidence(job_hash, resume_id)
        .await
        .unwrap();
    let mut expected_evidence_ids = vec![military.evidence_id, clearance.evidence_id];
    expected_evidence_ids.sort();
    assert_eq!(confirmed.evidence_ids(), expected_evidence_ids);

    let pending = PendingMilitaryTransitionReviews::default();
    let token = prepare_pending_saved_match_military_transition_review(
        &database,
        &pending,
        job_hash,
        resume_id,
        MilitaryBranch::Army,
        transition_wording(),
    )
    .await
    .unwrap();
    let confirmation =
        confirm_pending_saved_match_military_transition_review(&database, &pending, &token)
            .await
            .unwrap();
    assert_eq!(confirmation.civilian_role(), "Technical support specialist");
    assert_eq!(
        confirmation.user_confirmed_current_clearance(),
        Some("Secret")
    );
    assert_suggestion_boundary(&confirmation, Some("Secret"));
    assert_eq!(
        serde_json::to_value(&confirmation).unwrap(),
        serde_json::json!({
            "civilian_role": "Technical support specialist",
            "civilian_responsibilities": [
                "Maintained secure network services",
                "Resolved user support incidents",
            ],
            "credential_wording": ["CompTIA Security+"],
            "user_confirmed_current_clearance": "Secret",
            "boundary": "suggestion_only",
            "clearance_currentness": "not_verified",
            "military_civilian_equivalence": "not_verified",
        })
    );
}

#[tokio::test]
async fn generic_builder_docx_supports_nontechnical_coast_guard_logistics_review_without_clearance()
{
    let database = Database::connect_memory().await.unwrap();
    database.migrate().await.unwrap();
    let (resume_id, parsed_text) = build_and_upload_docx(
        &database,
        "Morgan Reyes",
        "Coast Guard SK logistics specialist coordinating supply delivery for field teams.",
        Some(ResumeExperience {
            company: "U.S. Coast Guard".to_string(),
            title: "Logistics Specialist".to_string(),
            location: None,
            start_date: "2021-01".to_string(),
            end_date: Some("2025-01".to_string()),
            is_current: false,
            achievements: vec!["Coordinated supply delivery for field teams".to_string()],
        }),
        vec![DraftSkill {
            category: "Operations".to_string(),
            skill: ResumeSkill {
                name: "Inventory coordination".to_string(),
                ..ResumeSkill::default()
            },
        }],
    )
    .await;
    assert!(parsed_text.contains("Coast Guard SK logistics specialist"));
    assert!(parsed_text.contains("Coordinated supply delivery for field teams"));
    save_match(
        &database,
        "coast-guard-logistics-builder",
        "Required: inventory coordination",
        resume_id,
    )
    .await;
    confirm_military_service(&database, "coast-guard-logistics-builder", resume_id).await;

    let pending = PendingMilitaryTransitionReviews::default();
    let token = prepare_pending_saved_match_military_transition_review(
        &database,
        &pending,
        "coast-guard-logistics-builder",
        resume_id,
        MilitaryBranch::CoastGuard,
        MilitaryTransitionWording {
            occupation_code: "SK".to_string(),
            civilian_role: "Logistics coordinator".to_string(),
            responsibility_mappings: vec![MilitaryWordingMapping {
                military_evidence: "Coordinated supply delivery for field teams".to_string(),
                civilian_wording: "Coordinated supply delivery for field teams".to_string(),
            }],
            credential_mappings: Vec::new(),
            current_clearance: None,
        },
    )
    .await
    .unwrap();
    let confirmation =
        confirm_pending_saved_match_military_transition_review(&database, &pending, &token)
            .await
            .unwrap();
    assert_eq!(confirmation.civilian_role(), "Logistics coordinator");
    assert_eq!(
        confirmation.civilian_responsibilities(),
        ["Coordinated supply delivery for field teams"]
    );
    assert!(confirmation.credential_wording().is_empty());
    assert_eq!(confirmation.user_confirmed_current_clearance(), None);
    assert_suggestion_boundary(&confirmation, None);
}

#[tokio::test]
async fn generic_builder_docx_supports_early_career_air_force_review_without_work_history_or_clearance(
) {
    let database = Database::connect_memory().await.unwrap();
    database.migrate().await.unwrap();
    let (resume_id, parsed_text) = build_and_upload_docx(
        &database,
        "Casey Morgan",
        "Air Force 3D1X2 early-career applicant seeking entry-level help desk work.",
        None,
        vec![DraftSkill {
            category: "Technical".to_string(),
            skill: ResumeSkill {
                name: "Help desk".to_string(),
                ..ResumeSkill::default()
            },
        }],
    )
    .await;
    assert!(parsed_text.contains("Air Force 3D1X2"));
    assert!(parsed_text.contains("Help desk"));
    assert!(!parsed_text.contains("EXPERIENCE"));
    save_match(
        &database,
        "air-force-early-career-builder",
        "Required: help desk",
        resume_id,
    )
    .await;
    confirm_military_service(&database, "air-force-early-career-builder", resume_id).await;

    let pending = PendingMilitaryTransitionReviews::default();
    let token = prepare_pending_saved_match_military_transition_review(
        &database,
        &pending,
        "air-force-early-career-builder",
        resume_id,
        MilitaryBranch::AirForce,
        MilitaryTransitionWording {
            occupation_code: "3D1X2".to_string(),
            civilian_role: "Entry-level help desk specialist".to_string(),
            responsibility_mappings: Vec::new(),
            credential_mappings: Vec::new(),
            current_clearance: None,
        },
    )
    .await
    .unwrap();
    let confirmation =
        confirm_pending_saved_match_military_transition_review(&database, &pending, &token)
            .await
            .unwrap();
    assert_eq!(
        confirmation.civilian_role(),
        "Entry-level help desk specialist"
    );
    assert!(confirmation.civilian_responsibilities().is_empty());
    assert!(confirmation.credential_wording().is_empty());
    assert_eq!(confirmation.user_confirmed_current_clearance(), None);
    assert_suggestion_boundary(&confirmation, None);
}
