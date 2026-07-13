//! User-controlled LinkedIn Workbench ledger.
//!
//! This module records only explicit JobSentinel-side user actions. It does not
//! inspect LinkedIn pages, browser storage, cookies, network traffic, or session
//! state.

use crate::core::ats::{ApplicationStatus, ApplicationTracker};
use crate::core::calculate_job_hash;
use crate::core::url_security::{canonicalize_user_supplied_job_url, sanitize_url_for_logging};
use crate::core::{db::Database, Job};
use anyhow::Result;
use chrono::{Duration, Utc};
use regex::{Captures, Regex};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::sync::LazyLock;
use url::Url;
use uuid::Uuid;

const DEFAULT_LINKEDIN_URL: &str = "https://www.linkedin.com/jobs/";
const DEFAULT_APPLIED_URL: &str = "https://www.linkedin.com/jobs-tracker/?stage=applied";
const DEFAULT_TITLE: &str = "LinkedIn application";
const DEFAULT_COMPANY: &str = "Company needs details";
const SOURCE: &str = "LinkedIn";
const MAX_TITLE_CHARS: usize = 500;
const MAX_COMPANY_CHARS: usize = 200;
const MAX_NOTE_CHARS: usize = 5_000;
const SENSITIVE_NOTE_FIELD_REPLACEMENT: &str = "[removed]";

#[allow(clippy::expect_used)]
static NOTE_URL_REGEX: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"https?://[^\s"'<>\\)]+"#).expect("note URL regex must compile"));
#[allow(clippy::expect_used)]
static LINKEDIN_COOKIE_REGEX: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"li_at=[^\s;]+").expect("LinkedIn cookie regex must compile"));
#[allow(clippy::expect_used)]
static SENSITIVE_NOTE_FIELD_REGEX: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r#"(?i)\b(access_token|refresh_token|api[_-]?key|token|secret|password|session|auth|credential)=([^\s&"'<>\\)]+)"#,
    )
    .expect("sensitive note field regex must compile")
});

#[derive(Clone, Debug, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum LinkedInWorkbenchEventType {
    Applied,
    Saved,
    Tracking,
    Rejected,
    Interview,
    FollowUp,
    Reminder,
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
    let notes = sanitize_workbench_notes(input.notes.as_deref());
    let user_url = input
        .url
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty());
    let needs_url = user_url.is_none();
    let url = match user_url {
        Some(value) => canonicalize_workbench_url(value).map_err(anyhow::Error::msg)?,
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
        LinkedInWorkbenchEventType::Rejected => {
            let id = ensure_application(&tracker, database, &job_hash).await?;
            tracker
                .update_status(id, ApplicationStatus::Rejected)
                .await?;
            application_id = Some(id);
        }
        LinkedInWorkbenchEventType::Interview => {
            let id = ensure_application(&tracker, database, &job_hash).await?;
            tracker
                .update_status(id, ApplicationStatus::PhoneInterview)
                .await?;
            application_id = Some(id);
            database.set_bookmark(job_id, true).await?;
            saved_as_bookmark = true;
        }
        LinkedInWorkbenchEventType::FollowUp => {
            let id = ensure_application(&tracker, database, &job_hash).await?;
            tracker.record_follow_up(id).await?;
            application_id = Some(id);
            database.set_bookmark(job_id, true).await?;
            saved_as_bookmark = true;
        }
        LinkedInWorkbenchEventType::Reminder => {
            let id = ensure_application(&tracker, database, &job_hash).await?;
            tracker
                .set_reminder(
                    id,
                    "follow_up",
                    Utc::now() + Duration::days(3),
                    "Review this LinkedIn job in JobSentinel",
                )
                .await?;
            application_id = Some(id);
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
        LinkedInWorkbenchEventType::Rejected => "rejected",
        LinkedInWorkbenchEventType::Interview => "interview",
        LinkedInWorkbenchEventType::FollowUp => "follow_up",
        LinkedInWorkbenchEventType::Reminder => "reminder",
        LinkedInWorkbenchEventType::Note => "noted",
        LinkedInWorkbenchEventType::NotInterested => "not_interested",
    }
}

fn canonicalize_workbench_url(value: &str) -> Result<String, String> {
    let canonical = canonicalize_user_supplied_job_url(value)?;
    let Ok(mut parsed) = Url::parse(&canonical) else {
        return Ok(canonical);
    };

    if parsed.host_str().is_some_and(|host| {
        host.eq_ignore_ascii_case("linkedin.com") || host.ends_with(".linkedin.com")
    }) {
        parsed.set_query(None);
        parsed.set_fragment(None);
        return Ok(parsed.to_string());
    }

    Ok(canonical)
}

fn sanitize_workbench_notes(value: Option<&str>) -> Option<String> {
    let trimmed = value?.trim();
    if trimmed.is_empty() {
        return None;
    }

    let without_cookies = LINKEDIN_COOKIE_REGEX
        .replace_all(trimmed, "li_at=[REDACTED]")
        .to_string();
    let without_sensitive_fields = SENSITIVE_NOTE_FIELD_REGEX
        .replace_all(&without_cookies, |captures: &Captures<'_>| {
            format!(
                "{}={}",
                captures.get(1).map_or("value", |value| value.as_str()),
                SENSITIVE_NOTE_FIELD_REPLACEMENT
            )
        })
        .to_string();
    let without_sensitive_urls = NOTE_URL_REGEX
        .replace_all(&without_sensitive_fields, |captures: &Captures<'_>| {
            let raw_url = captures.get(0).map_or("", |value| value.as_str());
            canonicalize_workbench_url(raw_url)
                .unwrap_or_else(|_| sanitize_url_for_logging(raw_url))
        })
        .to_string();

    Some(
        without_sensitive_urls
            .chars()
            .take(MAX_NOTE_CHARS)
            .collect(),
    )
}

fn trim_to_limit(value: Option<&str>, limit: usize) -> Option<String> {
    let trimmed = value?.trim();
    if trimmed.is_empty() {
        return None;
    }

    Some(trimmed.chars().take(limit).collect())
}

#[cfg(test)]
mod tests;
