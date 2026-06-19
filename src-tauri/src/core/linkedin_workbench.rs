//! User-controlled LinkedIn Workbench ledger.
//!
//! This module records only explicit JobSentinel-side user actions. It does not
//! inspect LinkedIn pages, browser storage, cookies, network traffic, or session
//! state.

use crate::core::ats::{ApplicationStatus, ApplicationTracker};
use crate::core::db::{Database, Job};
use crate::core::job_hash::calculate_job_hash;
use crate::core::url_security::canonicalize_user_supplied_job_url;
use anyhow::Result;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use uuid::Uuid;

const DEFAULT_LINKEDIN_URL: &str = "https://www.linkedin.com/jobs/";
const DEFAULT_APPLIED_URL: &str = "https://www.linkedin.com/jobs-tracker/?stage=applied";
const DEFAULT_TITLE: &str = "LinkedIn application";
const DEFAULT_COMPANY: &str = "Company needs details";
const SOURCE: &str = "LinkedIn";
const MAX_TITLE_CHARS: usize = 500;
const MAX_COMPANY_CHARS: usize = 200;
const MAX_NOTE_CHARS: usize = 5_000;

#[derive(Clone, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum LinkedInWorkbenchEventType {
    Applied,
    Saved,
    Tracking,
    Note,
    NotInterested,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LinkedInWorkbenchEventInput {
    pub event_type: LinkedInWorkbenchEventType,
    pub title: Option<String>,
    pub company: Option<String>,
    pub url: Option<String>,
    pub notes: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LinkedInWorkbenchEventResult {
    pub job_id: i64,
    pub job_hash: String,
    pub application_id: Option<i64>,
    pub status: String,
    pub needs_details: bool,
    pub saved_as_bookmark: bool,
    pub hidden: bool,
}

pub async fn record_event(
    database: &Database,
    input: LinkedInWorkbenchEventInput,
) -> Result<LinkedInWorkbenchEventResult> {
    let event_type = input.event_type.clone();
    let title = trim_to_limit(input.title.as_deref(), MAX_TITLE_CHARS)
        .unwrap_or_else(|| DEFAULT_TITLE.to_string());
    let company = trim_to_limit(input.company.as_deref(), MAX_COMPANY_CHARS)
        .unwrap_or_else(|| DEFAULT_COMPANY.to_string());
    let notes = trim_to_limit(input.notes.as_deref(), MAX_NOTE_CHARS);
    let user_url = input
        .url
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());
    let needs_url = user_url.is_none();
    let url = match user_url {
        Some(value) => canonicalize_user_supplied_job_url(value).map_err(anyhow::Error::msg)?,
        None if event_type == LinkedInWorkbenchEventType::Applied => {
            DEFAULT_APPLIED_URL.to_string()
        }
        None => DEFAULT_LINKEDIN_URL.to_string(),
    };
    let needs_details = title == DEFAULT_TITLE || company == DEFAULT_COMPANY || needs_url;
    let job_hash = if user_url.is_some() {
        calculate_job_hash(&company, &title, None, &url)
    } else {
        draft_hash()
    };
    let now = Utc::now();

    let job = Job {
        id: 0,
        hash: job_hash.clone(),
        title,
        company,
        url,
        location: None,
        description: Some("Created from a user-controlled LinkedIn Workbench action.".to_string()),
        score: None,
        score_reasons: None,
        source: SOURCE.to_string(),
        remote: None,
        salary_min: None,
        salary_max: None,
        currency: Some("USD".to_string()),
        created_at: now,
        updated_at: now,
        last_seen: now,
        times_seen: 1,
        immediate_alert_sent: false,
        included_in_digest: false,
        hidden: false,
        bookmarked: false,
        notes: None,
        ghost_score: None,
        ghost_reasons: None,
        first_seen: Some(now),
        repost_count: 0,
    };

    let job_id = database.upsert_job(&job).await?;
    if let Some(notes) = notes.as_deref() {
        database.set_job_notes(job_id, Some(notes)).await?;
    }

    let mut application_id = None;
    let mut saved_as_bookmark = false;
    let mut hidden = false;
    let tracker = ApplicationTracker::new(database.pool().clone());

    match event_type {
        LinkedInWorkbenchEventType::Applied => {
            let id = ensure_application(&tracker, database, &job_hash).await?;
            tracker
                .update_status(id, ApplicationStatus::Applied)
                .await?;
            application_id = Some(id);
            database.set_bookmark(job_id, true).await?;
            saved_as_bookmark = true;
        }
        LinkedInWorkbenchEventType::Saved => {
            database.set_bookmark(job_id, true).await?;
            saved_as_bookmark = true;
        }
        LinkedInWorkbenchEventType::Tracking => {
            application_id = Some(ensure_application(&tracker, database, &job_hash).await?);
            database.set_bookmark(job_id, true).await?;
            saved_as_bookmark = true;
        }
        LinkedInWorkbenchEventType::Note => {}
        LinkedInWorkbenchEventType::NotInterested => {
            database.hide_job(job_id).await?;
            hidden = true;
        }
    }

    Ok(LinkedInWorkbenchEventResult {
        job_id,
        job_hash,
        application_id,
        status: status_for_event(&event_type).to_string(),
        needs_details,
        saved_as_bookmark,
        hidden,
    })
}

async fn ensure_application(
    tracker: &ApplicationTracker,
    database: &Database,
    job_hash: &str,
) -> Result<i64> {
    if let Some(id) =
        sqlx::query_scalar::<_, i64>("SELECT id FROM applications WHERE job_hash = ? LIMIT 1")
            .bind(job_hash)
            .fetch_optional(database.pool())
            .await?
    {
        return Ok(id);
    }

    tracker.create_application(job_hash).await
}

fn draft_hash() -> String {
    let mut hasher = Sha256::new();
    hasher.update(b"linkedin-workbench-draft:");
    hasher.update(Uuid::new_v4().as_bytes());
    hex::encode(hasher.finalize())
}

fn status_for_event(event_type: &LinkedInWorkbenchEventType) -> &'static str {
    match event_type {
        LinkedInWorkbenchEventType::Applied => "applied",
        LinkedInWorkbenchEventType::Saved => "saved",
        LinkedInWorkbenchEventType::Tracking => "tracking",
        LinkedInWorkbenchEventType::Note => "noted",
        LinkedInWorkbenchEventType::NotInterested => "not_interested",
    }
}

fn trim_to_limit(value: Option<&str>, limit: usize) -> Option<String> {
    let trimmed = value?.trim();
    if trimmed.is_empty() {
        return None;
    }

    Some(trimmed.chars().take(limit).collect())
}

#[cfg(test)]
mod tests {
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

        let app = ApplicationTracker::new(db.pool().clone())
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
}
