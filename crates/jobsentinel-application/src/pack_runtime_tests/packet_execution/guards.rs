//! Proves draft-packet approval fails when rendered or non-rendered source state changes.

use super::*;

#[tokio::test]
async fn changed_reviewed_claim_fails_without_committing_a_receipt() {
    let (database, job_hash, resume_id) = saved_match().await;
    let evidence_id = confirm_first_evidence(&database, &job_hash, resume_id).await;
    let (artifact_root, publisher, generation) = activated_packet_pack(&database, 524_288).await;
    let prepared = prepare_draft_packet_task(
        &database,
        artifact_root.path(),
        PACKET_PUBLISHER_ID,
        PACKET_PACK_ID,
        generation,
        std::slice::from_ref(&publisher),
        NaiveDate::from_ymd_opt(2026, 7, 20).unwrap(),
        &job_hash,
        resume_id,
    )
    .await
    .unwrap();
    save_saved_match_evidence_packet_claim(
        &database,
        &job_hash,
        resume_id,
        "Added after the user reviewed the packet.".to_string(),
        vec![evidence_id],
    )
    .await
    .unwrap();

    assert!(execute_draft_packet_task(
        &database,
        artifact_root.path(),
        std::slice::from_ref(&publisher),
        NaiveDate::from_ymd_opt(2026, 7, 20).unwrap(),
        &prepared.task.run_id,
        &prepared.task.approval_reference,
        &job_hash,
        resume_id,
    )
    .await
    .is_err());
    let run = database
        .get_pack_task(&prepared.task.run_id)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(run.status, PackTaskStatus::Failed);
    assert!(run.receipt_id.is_none());
}

#[tokio::test]
async fn changed_non_rendered_case_state_fails_without_committing_a_receipt() {
    let (database, job_hash, resume_id) = saved_match().await;
    confirm_first_evidence(&database, &job_hash, resume_id).await;
    let (artifact_root, publisher, generation) = activated_packet_pack(&database, 524_288).await;
    let prepared = prepare_draft_packet_task(
        &database,
        artifact_root.path(),
        PACKET_PUBLISHER_ID,
        PACKET_PACK_ID,
        generation,
        std::slice::from_ref(&publisher),
        NaiveDate::from_ymd_opt(2026, 7, 20).unwrap(),
        &job_hash,
        resume_id,
    )
    .await
    .unwrap();
    database
        .application_tracker()
        .create_application(&job_hash)
        .await
        .unwrap();

    assert!(execute_draft_packet_task(
        &database,
        artifact_root.path(),
        std::slice::from_ref(&publisher),
        NaiveDate::from_ymd_opt(2026, 7, 20).unwrap(),
        &prepared.task.run_id,
        &prepared.task.approval_reference,
        &job_hash,
        resume_id,
    )
    .await
    .is_err());
    let run = database
        .get_pack_task(&prepared.task.run_id)
        .await
        .unwrap()
        .unwrap();
    assert_eq!(run.status, PackTaskStatus::Failed);
    assert!(run.receipt_id.is_none());
}
