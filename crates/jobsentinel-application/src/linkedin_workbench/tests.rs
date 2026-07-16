use super::*;

async fn memory_db() -> Database {
    let db = Database::connect_memory().await.unwrap();
    db.migrate().await.unwrap();
    db
}

#[tokio::test]
async fn applied_event_creates_draft_application_without_hidden_browser_state() {
    let db = memory_db().await;

    let result = record_event(
        &db,
        LinkedInWorkbenchEventInput {
            event_type: LinkedInWorkbenchEventType::Applied,
            title: None,
            company: None,
            url: None,
            notes: Some("User clicked Easy Apply in LinkedIn.".to_string()),
        },
    )
    .await
    .unwrap();

    assert_eq!(result.status, "applied");
    assert!(result.needs_details);
    assert!(result.saved_as_bookmark);
    assert!(result.application_id.is_some());

    let app = db
        .application_tracker()
        .get_application(result.application_id.unwrap())
        .await
        .unwrap();
    assert_eq!(app.status, ApplicationStatus::Applied);
    assert!(app.applied_at.is_some());

    let job = db.get_job_by_hash(&result.job_hash).await.unwrap().unwrap();
    assert_eq!(job.source, SOURCE);
    assert_eq!(job.title, DEFAULT_TITLE);
    assert_eq!(job.company, DEFAULT_COMPANY);
    assert!(job.bookmarked);
    assert_eq!(
        job.notes.as_deref(),
        Some("User clicked Easy Apply in LinkedIn.")
    );
}

#[tokio::test]
async fn saved_event_uses_user_confirmed_url_and_does_not_create_application() {
    let db = memory_db().await;

    let result = record_event(
        &db,
        LinkedInWorkbenchEventInput {
            event_type: LinkedInWorkbenchEventType::Saved,
            title: Some("Staff Content Strategist".to_string()),
            company: Some("Example Co".to_string()),
            url: Some("https://www.linkedin.com/jobs/view/123?token=secret".to_string()),
            notes: None,
        },
    )
    .await
    .unwrap();

    assert_eq!(result.status, "saved");
    assert!(!result.needs_details);
    assert!(result.saved_as_bookmark);
    assert!(result.application_id.is_none());

    let job = db.get_job_by_hash(&result.job_hash).await.unwrap().unwrap();
    assert_eq!(job.title, "Staff Content Strategist");
    assert_eq!(job.company, "Example Co");
    assert_eq!(job.url, "https://www.linkedin.com/jobs/view/123");
    assert!(job.bookmarked);
}

#[tokio::test]
async fn not_interested_event_hides_local_draft() {
    let db = memory_db().await;

    let result = record_event(
        &db,
        LinkedInWorkbenchEventInput {
            event_type: LinkedInWorkbenchEventType::NotInterested,
            title: Some("Role to skip".to_string()),
            company: Some("Nope Co".to_string()),
            url: None,
            notes: None,
        },
    )
    .await
    .unwrap();

    assert!(result.hidden);
    let job = db.get_job_by_hash(&result.job_hash).await.unwrap().unwrap();
    assert!(job.hidden);
}

#[tokio::test]
async fn expanded_activity_events_use_local_application_ledger() {
    let db = memory_db().await;
    let tracker = db.application_tracker();

    let interview = record_event(
        &db,
        LinkedInWorkbenchEventInput {
            event_type: LinkedInWorkbenchEventType::Interview,
            title: Some("Support Lead".to_string()),
            company: Some("Example Co".to_string()),
            url: Some("https://www.linkedin.com/jobs/view/222".to_string()),
            notes: None,
        },
    )
    .await
    .unwrap();
    let interview_app = tracker
        .get_application(interview.application_id.expect("interview app"))
        .await
        .unwrap();
    assert_eq!(interview.status, "interview");
    assert_eq!(interview_app.status, ApplicationStatus::PhoneInterview);
    assert!(interview.saved_as_bookmark);

    let follow_up = record_event(
        &db,
        LinkedInWorkbenchEventInput {
            event_type: LinkedInWorkbenchEventType::FollowUp,
            title: Some("Support Lead".to_string()),
            company: Some("Example Co".to_string()),
            url: Some("https://www.linkedin.com/jobs/view/222?token=secret".to_string()),
            notes: Some("Sent a short follow-up.".to_string()),
        },
    )
    .await
    .unwrap();
    let follow_up_app = tracker
        .get_application(follow_up.application_id.expect("follow-up app"))
        .await
        .unwrap();
    assert_eq!(follow_up.status, "follow_up");
    assert!(follow_up_app.last_contact.is_some());

    let reminder = record_event(
        &db,
        LinkedInWorkbenchEventInput {
            event_type: LinkedInWorkbenchEventType::Reminder,
            title: Some("Support Lead".to_string()),
            company: Some("Example Co".to_string()),
            url: Some("https://www.linkedin.com/jobs/view/222".to_string()),
            notes: None,
        },
    )
    .await
    .unwrap();
    let reminder_application_id = reminder.application_id.expect("reminder app");
    let due_reminder_count = tracker
        .get_pending_reminders()
        .await
        .unwrap()
        .into_iter()
        .filter(|pending| pending.application_id == reminder_application_id)
        .count();
    assert_eq!(reminder.status, "reminder");
    assert!(reminder.saved_as_bookmark);
    assert_eq!(due_reminder_count, 0);

    let rejected = record_event(
        &db,
        LinkedInWorkbenchEventInput {
            event_type: LinkedInWorkbenchEventType::Rejected,
            title: Some("Support Lead".to_string()),
            company: Some("Example Co".to_string()),
            url: Some("https://www.linkedin.com/jobs/view/222".to_string()),
            notes: None,
        },
    )
    .await
    .unwrap();
    let rejected_app = tracker
        .get_application(rejected.application_id.expect("rejected app"))
        .await
        .unwrap();
    assert_eq!(rejected.status, "rejected");
    assert_eq!(rejected_app.status, ApplicationStatus::Rejected);
}

#[tokio::test]
async fn notes_remove_linkedin_session_material_before_storage() {
    let db = memory_db().await;

    let result = record_event(
        &db,
        LinkedInWorkbenchEventInput {
            event_type: LinkedInWorkbenchEventType::Applied,
            title: Some("Principal Security Engineer".to_string()),
            company: Some("Example Co".to_string()),
            url: Some(
                "https://www.linkedin.com/jobs/view/123?currentJobId=123&token=secret"
                    .to_string(),
            ),
            notes: Some(
                "Saved from https://www.linkedin.com/jobs/view/123?token=secret li_at=raw-cookie session=abc"
                    .to_string(),
            ),
        },
    )
    .await
    .unwrap();

    let job = db.get_job_by_hash(&result.job_hash).await.unwrap().unwrap();
    assert_eq!(job.url, "https://www.linkedin.com/jobs/view/123");
    let notes = job.notes.unwrap_or_default();
    assert!(notes.contains("https://www.linkedin.com/jobs/view/123"));
    assert!(notes.contains("li_at=[REDACTED]"));
    assert!(notes.contains("session=[removed]"));
    assert!(!notes.contains("token=secret"));
    assert!(!notes.contains("raw-cookie"));
}
