//! Verifies reviewed applied logging and operation-specific pending drafts.

use super::*;

#[tokio::test]
async fn applied_logging_queues_a_local_draft_with_missing_details() {
    let database = bookmarklet_test_database().await;
    let (active_pairing, code) =
        bookmarklet_pairing_for_operation("https://example.com", SourceOperation::AppliedLogging);
    let pending_imports = bookmarklet_pending_imports();
    let body = bookmarklet_import_body(
        &code,
        serde_json::json!({"url": "https://example.com/jobs/1"}),
    );

    let (response, _) = handle_import_request(
        &bookmarklet_import_request(&body),
        &active_pairing,
        pending_imports.clone(),
        database.clone(),
    )
    .await;
    let parsed: serde_json::Value = serde_json::from_str(&response).unwrap();
    let previews = pending_bookmarklet_import_previews(&pending_imports);

    assert_eq!(parsed["success"], true, "{parsed}");
    assert_eq!(previews.len(), 1);
    let preview = serde_json::to_value(&previews[0]).unwrap();
    assert_eq!(preview["operation"], "applied_logging");
    assert_eq!(
        preview["missing_fields"],
        serde_json::json!(["title", "company"])
    );
    assert_eq!(stored_job_count(&database).await, 0);
}

#[tokio::test]
async fn confirming_an_applied_draft_rechecks_authority_and_marks_it_applied() {
    let database = bookmarklet_test_database().await;
    let (active_pairing, code) =
        bookmarklet_pairing_for_operation("https://example.com", SourceOperation::AppliedLogging);
    let pending_imports = bookmarklet_pending_imports();
    let body = bookmarklet_import_body(
        &code,
        serde_json::json!({"url": "https://example.com/jobs/1"}),
    );
    handle_import_request(
        &bookmarklet_import_request(&body),
        &active_pairing,
        pending_imports.clone(),
        database.clone(),
    )
    .await;
    let preview = pending_bookmarklet_import_previews(&pending_imports)
        .pop()
        .unwrap();

    database.set_authorization_allowed(false);
    let blocked =
        confirm_pending_bookmarklet_imports(&database, &pending_imports, &[preview.id.clone()])
            .await;

    assert_eq!(
        blocked.unwrap_err(),
        BOOKMARKLET_AUTHORIZATION_FAILURE_MESSAGE
    );
    assert_eq!(stored_job_count(&database).await, 0);

    database.set_authorization_allowed(true);
    let result =
        confirm_pending_bookmarklet_imports(&database, &pending_imports, &[preview.id]).await;
    let stored = database.jobs().remove(0);

    assert_eq!(result.unwrap().imported, 1);
    assert_eq!(stored.title, "Job title not added");
    assert_eq!(stored.company, "Company not added");
    assert!(database.is_applied(&stored.hash));
}

#[tokio::test]
async fn applied_logging_rejects_extra_page_state() {
    for extra in [
        serde_json::json!({"description": "hidden description"}),
        serde_json::json!({"location": "hidden location"}),
        serde_json::json!({"remote": true}),
        serde_json::json!({
            "@type": "JobPosting",
            "hiringOrganization": {"name": "Hidden organization"}
        }),
    ] {
        let database = bookmarklet_test_database().await;
        let (active_pairing, code) = bookmarklet_pairing_for_operation(
            "https://example.com",
            SourceOperation::AppliedLogging,
        );
        let pending_imports = bookmarklet_pending_imports();
        let mut job = serde_json::json!({
            "title": "Visible title",
            "company": "Visible company",
            "url": "https://example.com/jobs/1"
        });
        job.as_object_mut()
            .unwrap()
            .extend(extra.as_object().unwrap().clone());
        let body = bookmarklet_import_body(&code, job);

        let (response, _) = handle_import_request(
            &bookmarklet_import_request(&body),
            &active_pairing,
            pending_imports.clone(),
            database,
        )
        .await;
        let parsed: serde_json::Value = serde_json::from_str(&response).unwrap();

        assert_eq!(parsed["error"], INVALID_BOOKMARKLET_PAYLOAD_MESSAGE);
        assert!(pending_bookmarklet_import_previews(&pending_imports).is_empty());
    }
}

#[tokio::test]
async fn capture_and_applied_drafts_survive_both_queue_orders() {
    for operations in [
        [
            SourceOperation::VisiblePageCapture,
            SourceOperation::AppliedLogging,
        ],
        [
            SourceOperation::AppliedLogging,
            SourceOperation::VisiblePageCapture,
        ],
    ] {
        for include_capture in [true, false] {
            let database = bookmarklet_test_database().await;
            let pending = bookmarklet_pending_imports();
            for operation in operations {
                let (pairing, code) =
                    bookmarklet_pairing_for_operation("https://example.com", operation);
                let mut job = serde_json::json!({"title":"Engineer","company":"Example","url":"https://example.com/jobs/1"});
                if operation == SourceOperation::VisiblePageCapture {
                    job["description"] = serde_json::json!("Reviewed visible job details");
                }
                let body = bookmarklet_import_body(&code, job);
                handle_import_request(
                    &bookmarklet_import_request(&body),
                    &pairing,
                    pending.clone(),
                    database.clone(),
                )
                .await;
            }
            let previews = pending_bookmarklet_import_previews(&pending);
            assert_eq!(previews.len(), 2);
            let ids: Vec<_> = previews
                .into_iter()
                .filter(|item| include_capture || item.operation == SourceOperation::AppliedLogging)
                .map(|item| item.id)
                .collect();
            confirm_pending_bookmarklet_imports(&database, &pending, &ids)
                .await
                .unwrap();
            assert!(database.is_applied(&database.jobs()[0].hash));
            assert_eq!(
                database.jobs()[0].description.as_deref(),
                if include_capture {
                    Some("Reviewed visible job details")
                } else {
                    None
                }
            );
            assert_eq!(
                pending_bookmarklet_import_previews(&pending).len(),
                usize::from(!include_capture)
            );
        }
    }
}

#[tokio::test]
async fn partial_confirmation_retires_success_before_retry() {
    let database = bookmarklet_test_database().await;
    let pending = bookmarklet_pending_imports();
    for number in [1, 2] {
        let (pairing, code) = bookmarklet_pairing_for_operation(
            "https://example.com",
            SourceOperation::AppliedLogging,
        );
        let body = bookmarklet_import_body(
            &code,
            serde_json::json!({"title":format!("Engineer {number}"),"company":"Example","url":format!("https://example.com/jobs/{number}")}),
        );
        handle_import_request(
            &bookmarklet_import_request(&body),
            &pairing,
            pending.clone(),
            database.clone(),
        )
        .await;
    }
    let ids: Vec<_> = pending_bookmarklet_import_previews(&pending)
        .into_iter()
        .map(|item| item.id)
        .collect();
    database
        .fail_after_first
        .store(true, std::sync::atomic::Ordering::Relaxed);
    assert!(
        confirm_pending_bookmarklet_imports(&database, &pending, &ids)
            .await
            .is_err()
    );
    assert_eq!(pending_bookmarklet_import_previews(&pending).len(), 1);
    assert_eq!(database.applied_count(), 1);
    database
        .fail_after_first
        .store(false, std::sync::atomic::Ordering::Relaxed);
    confirm_pending_bookmarklet_imports(&database, &pending, &ids)
        .await
        .unwrap();
    assert_eq!(database.applied_count(), 2);
    assert!(pending_bookmarklet_import_previews(&pending).is_empty());
}
