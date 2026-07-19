use super::*;

#[test]
fn format_import_error_sanitizes_internal_details() {
    let cases = [
        ImportError::InvalidUrl(
            "https://user:pass@example.com/job?token=secret#private".to_string(),
        ),
        ImportError::HtmlParseError("selector failed near private content".to_string()),
        ImportError::InvalidJsonLd("candidate-specific payload".to_string()),
        ImportError::DatabaseError("sqlite locked at a private path".to_string()),
    ];

    for error in cases {
        let message = format_import_error(&error);
        assert!(!message.contains("secret"));
        assert!(!message.contains("private content"));
        assert!(!message.contains("candidate-specific"));
        assert!(!message.contains("private path"));
    }
}

#[test]
fn native_review_message_names_the_page_without_private_url_data() {
    let message = job_link_review_message(
        "https://user:pass@example.com/jobs/1?token=secret&location=Denver#private",
    );

    assert!(message.contains("https://example.com/jobs/1"));
    for private in ["user", "pass", "secret", "Denver", "private"] {
        assert!(!message.contains(private), "{private}");
    }
}

#[test]
fn native_review_target_is_canonical_and_policy_checked() {
    assert_eq!(
        prepare_job_import_target(
            "https://user:pass@example.com/jobs/1?utm_source=mail&jobId=42#private"
        )
        .unwrap(),
        "https://example.com/jobs/1?jobId=42"
    );
    assert!(matches!(
        prepare_job_import_target("https://www.linkedin.com/jobs/view/1"),
        Err(ImportError::SourcePolicyBlocked {
            visible_capture_allowed: false
        })
    ));
}

#[test]
fn format_import_error_explains_https_required() {
    let message = format_import_error(&ImportError::InvalidUrl(
        "Blocked insecure URL: https required".to_string(),
    ));

    assert_eq!(
        message,
        "Paste an https job posting link from your browser address bar."
    );
}

#[test]
fn format_import_error_explains_retired_source_policy() {
    assert_eq!(
        format_import_error(&ImportError::SourcePolicyBlocked {
            visible_capture_allowed: true,
        }),
        "JobSentinel cannot fetch this pasted link. Open it in your browser and use visible Browser Import or manual entry."
    );
    assert_eq!(
        format_import_error(&ImportError::SourcePolicyBlocked {
            visible_capture_allowed: false,
        }),
        "JobSentinel cannot fetch or capture this source. Open it in your browser or use manual entry."
    );
}

#[test]
fn format_import_error_explains_stale_and_duplicate_previews() {
    assert_eq!(
        format_import_error(&ImportError::PendingImportNotFound),
        "This job preview expired. Check the job link again before saving."
    );
    assert_eq!(
        format_import_error(&ImportError::AlreadyExists),
        "This job is already in your saved jobs."
    );
}
