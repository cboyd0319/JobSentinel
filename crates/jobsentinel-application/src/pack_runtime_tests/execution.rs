//! Proves static-skill reads and reviewed tasks are integrity-bound and stale-state safe.

use super::*;
use crate::{
    pack_runtime::{
        cancel_reviewed_pack_task, disable_pack_artifact, execute_evidence_review_task,
        open_active_static_skill, prepare_evidence_review_task,
    },
    v3_foundation::{confirm_saved_match_debugger_evidence, prepare_saved_match_debugger},
};
use chrono::Utc;
use jobsentinel_storage::pack_tasks::PackTaskStatus;

async fn activated_evidence_pack(
    database: &Database,
) -> (tempfile::TempDir, TrustedPublisherKey, u64) {
    let artifact_root = tempfile::tempdir().unwrap();
    let (publisher, envelope) = signed_evidence_review_pack(1);
    let staged = stage_pack_artifact(
        database,
        artifact_root.path(),
        &envelope,
        std::slice::from_ref(&publisher),
        NaiveDate::from_ymd_opt(2026, 7, 20).unwrap(),
    )
    .await
    .unwrap();
    let active = activate_pack_artifact(
        database,
        artifact_root.path(),
        EVIDENCE_PUBLISHER_ID,
        EVIDENCE_PACK_ID,
        1,
        staged.generation,
        std::slice::from_ref(&publisher),
        NaiveDate::from_ymd_opt(2026, 7, 20).unwrap(),
    )
    .await
    .unwrap();
    (artifact_root, publisher, active.generation)
}

async fn activated_static_skill_pack(
    database: &Database,
) -> (tempfile::TempDir, TrustedPublisherKey, u64) {
    let artifact_root = tempfile::tempdir().unwrap();
    let (publisher, envelope) = signed_static_skill_pack(1);
    let staged = stage_pack_artifact(
        database,
        artifact_root.path(),
        &envelope,
        std::slice::from_ref(&publisher),
        NaiveDate::from_ymd_opt(2026, 7, 20).unwrap(),
    )
    .await
    .unwrap();
    let active = activate_pack_artifact(
        database,
        artifact_root.path(),
        SKILL_PUBLISHER_ID,
        SKILL_PACK_ID,
        1,
        staged.generation,
        std::slice::from_ref(&publisher),
        NaiveDate::from_ymd_opt(2026, 7, 20).unwrap(),
    )
    .await
    .unwrap();
    (artifact_root, publisher, active.generation)
}

#[tokio::test]
async fn active_static_skill_reloads_verified_plain_content() {
    let database = Database::connect_memory().await.unwrap();
    database.migrate().await.unwrap();
    let (artifact_root, publisher, generation) = activated_static_skill_pack(&database).await;

    let skill = open_active_static_skill(
        &database,
        artifact_root.path(),
        SKILL_PUBLISHER_ID,
        SKILL_PACK_ID,
        generation,
        std::slice::from_ref(&publisher),
        NaiveDate::from_ymd_opt(2026, 7, 20).unwrap(),
    )
    .await
    .unwrap();

    assert_eq!(skill.skill_name, "resume-evidence-review");
    assert!(skill.skill_md.contains("## Guardrails"));
    assert_eq!(skill.resources.len(), 1);
    assert_eq!(skill.resources[0].path, "references/rubric.md");
    assert_eq!(
        skill.resources[0].content,
        "# Evidence rubric\n\nUse only confirmed local evidence.\n"
    );
    let handoff = skill.handoff.unwrap();
    assert_eq!(handoff.task_kind, AgentTaskKind::EvidenceReview);
    assert_eq!(handoff.label, "Open Resume Evidence Reviewer");
}

#[tokio::test]
async fn inactive_or_stale_static_skill_cannot_be_opened() {
    let database = Database::connect_memory().await.unwrap();
    database.migrate().await.unwrap();
    let (artifact_root, publisher, generation) = activated_static_skill_pack(&database).await;
    let today = NaiveDate::from_ymd_opt(2026, 7, 20).unwrap();

    assert!(open_active_static_skill(
        &database,
        artifact_root.path(),
        SKILL_PUBLISHER_ID,
        SKILL_PACK_ID,
        generation - 1,
        std::slice::from_ref(&publisher),
        today,
    )
    .await
    .is_err());

    let disabled = disable_pack_artifact(&database, SKILL_PUBLISHER_ID, SKILL_PACK_ID, generation)
        .await
        .unwrap();
    assert!(open_active_static_skill(
        &database,
        artifact_root.path(),
        SKILL_PUBLISHER_ID,
        SKILL_PACK_ID,
        disabled.generation,
        std::slice::from_ref(&publisher),
        today,
    )
    .await
    .is_err());
}

#[tokio::test]
async fn altered_active_static_skill_is_quarantined_without_exposing_content() {
    let database = Database::connect_memory().await.unwrap();
    database.migrate().await.unwrap();
    let (artifact_root, publisher, generation) = activated_static_skill_pack(&database).await;
    std::fs::write(walk_files(artifact_root.path()).pop().unwrap(), b"altered").unwrap();

    assert!(open_active_static_skill(
        &database,
        artifact_root.path(),
        SKILL_PUBLISHER_ID,
        SKILL_PACK_ID,
        generation,
        std::slice::from_ref(&publisher),
        NaiveDate::from_ymd_opt(2026, 7, 20).unwrap(),
    )
    .await
    .is_err());
    let stream = database
        .get_pack_stream(SKILL_PUBLISHER_ID, SKILL_PACK_ID)
        .await
        .unwrap();
    assert_eq!(stream.availability, PackAvailability::Quarantined);
    assert_eq!(stream.active_release_sequence, None);
}

#[tokio::test]
async fn exact_reviewed_evidence_task_is_single_use_bounded_and_audited() {
    let (database, job_hash, resume_id) = saved_match().await;
    let (artifact_root, publisher, generation) = activated_evidence_pack(&database).await;

    let prepared = prepare_evidence_review_task(
        &database,
        artifact_root.path(),
        EVIDENCE_PUBLISHER_ID,
        EVIDENCE_PACK_ID,
        generation,
        std::slice::from_ref(&publisher),
        NaiveDate::from_ymd_opt(2026, 7, 20).unwrap(),
        &job_hash,
        resume_id,
    )
    .await
    .unwrap();

    assert_eq!(prepared.task_kind, AgentTaskKind::EvidenceReview);
    assert_eq!(prepared.plan.len(), 2);
    assert_eq!(prepared.max_duration_seconds, 30);
    assert_eq!(prepared.max_output_bytes, 262_144);
    assert_eq!(
        prepared.privacy_labels,
        [PrivacyLabel::LocalOnly, PrivacyLabel::Sensitive]
    );
    assert_eq!(prepared.data_categories, [DataCategory::ResumeEvidence]);

    let result = execute_evidence_review_task(
        &database,
        artifact_root.path(),
        std::slice::from_ref(&publisher),
        NaiveDate::from_ymd_opt(2026, 7, 20).unwrap(),
        &prepared.run_id,
        &prepared.approval_reference,
        &job_hash,
        resume_id,
    )
    .await
    .unwrap();
    let encoded = serde_json::to_vec(&result).unwrap();
    assert!(encoded.len() <= prepared.max_output_bytes as usize);
    assert!(!result.review.requirements().is_empty());
    assert!(!encoded
        .windows("Managed scheduling".len())
        .any(|value| value == b"Managed scheduling"));

    let run = database
        .get_pack_task(&prepared.run_id)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(run.status, PackTaskStatus::Succeeded);
    assert_eq!(run.receipt_id.as_deref(), Some(result.receipt_id.as_str()));
    let receipt = database
        .get_privacy_receipt(&result.receipt_id)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(receipt.pack_id.as_deref(), Some(EVIDENCE_PACK_ID));
    assert!(!receipt.data_left_device);

    assert!(execute_evidence_review_task(
        &database,
        artifact_root.path(),
        std::slice::from_ref(&publisher),
        NaiveDate::from_ymd_opt(2026, 7, 20).unwrap(),
        &prepared.run_id,
        &prepared.approval_reference,
        &job_hash,
        resume_id,
    )
    .await
    .is_err());
}

#[tokio::test]
async fn cancelled_review_cannot_execute() {
    let (database, job_hash, resume_id) = saved_match().await;
    let (artifact_root, publisher, generation) = activated_evidence_pack(&database).await;
    let prepared = prepare_evidence_review_task(
        &database,
        artifact_root.path(),
        EVIDENCE_PUBLISHER_ID,
        EVIDENCE_PACK_ID,
        generation,
        std::slice::from_ref(&publisher),
        NaiveDate::from_ymd_opt(2026, 7, 20).unwrap(),
        &job_hash,
        resume_id,
    )
    .await
    .unwrap();

    cancel_reviewed_pack_task(&database, &prepared.run_id)
        .await
        .unwrap();

    assert!(execute_evidence_review_task(
        &database,
        artifact_root.path(),
        std::slice::from_ref(&publisher),
        NaiveDate::from_ymd_opt(2026, 7, 20).unwrap(),
        &prepared.run_id,
        &prepared.approval_reference,
        &job_hash,
        resume_id,
    )
    .await
    .is_err());
    assert_eq!(
        database
            .get_pack_task(&prepared.run_id)
            .await
            .unwrap()
            .unwrap()
            .status,
        PackTaskStatus::Cancelled
    );
}

#[tokio::test]
async fn disabled_pack_cannot_commit_an_approved_review() {
    let (database, job_hash, resume_id) = saved_match().await;
    let (artifact_root, publisher, generation) = activated_evidence_pack(&database).await;
    let prepared = prepare_evidence_review_task(
        &database,
        artifact_root.path(),
        EVIDENCE_PUBLISHER_ID,
        EVIDENCE_PACK_ID,
        generation,
        std::slice::from_ref(&publisher),
        NaiveDate::from_ymd_opt(2026, 7, 20).unwrap(),
        &job_hash,
        resume_id,
    )
    .await
    .unwrap();
    disable_pack_artifact(
        &database,
        EVIDENCE_PUBLISHER_ID,
        EVIDENCE_PACK_ID,
        generation,
    )
    .await
    .unwrap();

    assert!(execute_evidence_review_task(
        &database,
        artifact_root.path(),
        std::slice::from_ref(&publisher),
        NaiveDate::from_ymd_opt(2026, 7, 20).unwrap(),
        &prepared.run_id,
        &prepared.approval_reference,
        &job_hash,
        resume_id,
    )
    .await
    .is_err());
    let run = database
        .get_pack_task(&prepared.run_id)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(run.status, PackTaskStatus::Pending);
    assert!(run.receipt_id.is_none());
}

#[tokio::test]
async fn changed_saved_input_fails_without_a_receipt() {
    let (database, job_hash, resume_id) = saved_match().await;
    let (artifact_root, publisher, generation) = activated_evidence_pack(&database).await;
    let prepared = prepare_evidence_review_task(
        &database,
        artifact_root.path(),
        EVIDENCE_PUBLISHER_ID,
        EVIDENCE_PACK_ID,
        generation,
        std::slice::from_ref(&publisher),
        NaiveDate::from_ymd_opt(2026, 7, 20).unwrap(),
        &job_hash,
        resume_id,
    )
    .await
    .unwrap();
    let mut changed = database.get_job_by_hash(&job_hash).await.unwrap().unwrap();
    changed.description = Some("Required: scheduling and payroll".to_string());
    changed.updated_at = Utc::now() + chrono::Duration::seconds(1);
    database.upsert_job(&changed).await.unwrap();

    assert!(execute_evidence_review_task(
        &database,
        artifact_root.path(),
        std::slice::from_ref(&publisher),
        NaiveDate::from_ymd_opt(2026, 7, 20).unwrap(),
        &prepared.run_id,
        &prepared.approval_reference,
        &job_hash,
        resume_id,
    )
    .await
    .is_err());
    let run = database
        .get_pack_task(&prepared.run_id)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(run.status, PackTaskStatus::Failed);
    assert!(run.receipt_id.is_none());
}

#[tokio::test]
async fn changed_evidence_confirmation_fails_without_a_receipt() {
    let (database, job_hash, resume_id) = saved_match().await;
    let (artifact_root, publisher, generation) = activated_evidence_pack(&database).await;
    let debugger = prepare_saved_match_debugger(&database, &job_hash, resume_id)
        .await
        .unwrap();
    let evidence_id = debugger
        .requirements()
        .iter()
        .flat_map(|requirement| requirement.evidence())
        .next()
        .unwrap()
        .evidence_id()
        .to_string();
    let prepared = prepare_evidence_review_task(
        &database,
        artifact_root.path(),
        EVIDENCE_PUBLISHER_ID,
        EVIDENCE_PACK_ID,
        generation,
        std::slice::from_ref(&publisher),
        NaiveDate::from_ymd_opt(2026, 7, 20).unwrap(),
        &job_hash,
        resume_id,
    )
    .await
    .unwrap();
    confirm_saved_match_debugger_evidence(
        &database,
        &job_hash,
        resume_id,
        debugger.debugger_id(),
        &evidence_id,
    )
    .await
    .unwrap();

    assert!(execute_evidence_review_task(
        &database,
        artifact_root.path(),
        std::slice::from_ref(&publisher),
        NaiveDate::from_ymd_opt(2026, 7, 20).unwrap(),
        &prepared.run_id,
        &prepared.approval_reference,
        &job_hash,
        resume_id,
    )
    .await
    .is_err());
    let run = database
        .get_pack_task(&prepared.run_id)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(run.status, PackTaskStatus::Failed);
    assert!(run.receipt_id.is_none());
}
