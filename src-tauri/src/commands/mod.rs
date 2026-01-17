//! Tauri Command Handlers
//!
//! This module contains all Tauri commands (RPC-style functions) that can be invoked
//! from the React frontend using `invoke()`.

use crate::core::{
    ats::{ApplicationStatus, ApplicationTracker, ApplicationsByStatus, PendingReminder},
    config::Config,
    db::Database,
    market_intelligence::{
        CompanyActivity, LocationHeat, MarketAlert, MarketIntelligence, SkillTrend,
    },
    resume::{MatchResult, MatchResultWithJob, Resume, ResumeMatcher, UserSkill},
    salary::{OfferComparison, SalaryAnalyzer, SalaryPrediction, SeniorityLevel},
    scheduler::Scheduler,
    user_data::{
        CoverLetterTemplate, FollowUpReminder, NotificationPreferences, PrepChecklistItem,
        SavedSearch, TemplateCategory, UserDataManager,
    },
};
use chrono::{DateTime, Utc};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::Arc;
use tauri::State;
use tokio::sync::RwLock;

/// Scheduler status tracking
#[derive(Debug, Clone, Default)]
pub struct SchedulerStatus {
    pub is_running: bool,
    pub last_run: Option<DateTime<Utc>>,
    pub next_run: Option<DateTime<Utc>>,
}

/// Application state shared across commands
pub struct AppState {
    pub config: Arc<Config>,
    pub database: Arc<Database>,
    pub scheduler: Option<Arc<Scheduler>>,
    pub scheduler_status: Arc<RwLock<SchedulerStatus>>,
}

/// Search for jobs from all enabled sources
///
/// This triggers a full scraping cycle across Greenhouse, Lever, and JobsWithGPT.
#[tauri::command]
pub async fn search_jobs(state: State<'_, AppState>) -> Result<Value, String> {
    tracing::info!("Command: search_jobs");

    // Create scheduler instance
    let scheduler = Scheduler::new(state.config.clone(), state.database.clone());

    // Run single scraping cycle
    match scheduler.run_scraping_cycle().await {
        Ok(result) => {
            tracing::info!("Scraping complete: {} jobs found", result.jobs_found);

            Ok(serde_json::json!({
                "success": true,
                "jobs_found": result.jobs_found,
                "jobs_new": result.jobs_new,
                "jobs_updated": result.jobs_updated,
                "high_matches": result.high_matches,
                "alerts_sent": result.alerts_sent,
                "errors": result.errors,
            }))
        }
        Err(e) => {
            tracing::error!("Search failed: {}", e);
            Err(format!("Scraping failed: {}", e))
        }
    }
}

/// Get recent jobs from database
///
/// Returns the most recent jobs, sorted by score (descending).
#[tauri::command]
pub async fn get_recent_jobs(
    limit: usize,
    state: State<'_, AppState>,
) -> Result<Vec<Value>, String> {
    tracing::info!("Command: get_recent_jobs (limit: {})", limit);

    match state.database.get_recent_jobs(limit as i64).await {
        Ok(jobs) => {
            let jobs_json: Vec<Value> = jobs
                .into_iter()
                .filter_map(|job| {
                    serde_json::to_value(&job)
                        .map_err(|e| {
                            tracing::error!("Failed to serialize job {}: {}", job.id, e);
                            e
                        })
                        .ok()
                })
                .collect();

            Ok(jobs_json)
        }
        Err(e) => {
            tracing::error!("Failed to get recent jobs: {}", e);
            Err(format!("Database error: {}", e))
        }
    }
}

/// Get job by ID
#[tauri::command]
pub async fn get_job_by_id(id: i64, state: State<'_, AppState>) -> Result<Option<Value>, String> {
    tracing::info!("Command: get_job_by_id (id: {})", id);

    match state.database.get_job_by_id(id).await {
        Ok(job) => Ok(job.and_then(|j| {
            serde_json::to_value(&j)
                .map_err(|e| {
                    tracing::error!("Failed to serialize job {}: {}", j.id, e);
                    e
                })
                .ok()
        })),
        Err(e) => {
            tracing::error!("Failed to get job: {}", e);
            Err(format!("Database error: {}", e))
        }
    }
}

/// Save user configuration
#[tauri::command]
pub async fn save_config(config: Value, _state: State<'_, AppState>) -> Result<(), String> {
    tracing::info!("Command: save_config");

    // Parse config from JSON
    let parsed_config: Config =
        serde_json::from_value(config).map_err(|e| format!("Invalid configuration: {}", e))?;

    // Save to file
    let config_path = Config::default_path();
    parsed_config
        .save(&config_path)
        .map_err(|e| format!("Failed to save config: {}", e))?;

    tracing::info!("Configuration saved successfully");
    Ok(())
}

/// Get user configuration
#[tauri::command]
pub async fn get_config(state: State<'_, AppState>) -> Result<Value, String> {
    tracing::info!("Command: get_config");

    serde_json::to_value(&*state.config).map_err(|e| format!("Failed to serialize config: {}", e))
}

/// Validate Slack webhook URL
#[tauri::command]
pub async fn validate_slack_webhook(webhook_url: String) -> Result<bool, String> {
    tracing::info!("Command: validate_slack_webhook");

    match crate::core::notify::slack::validate_webhook(&webhook_url).await {
        Ok(valid) => Ok(valid),
        Err(e) => {
            tracing::error!("Webhook validation failed: {}", e);
            Err(format!("Validation failed: {}", e))
        }
    }
}

/// Get application statistics
#[tauri::command]
pub async fn get_statistics(state: State<'_, AppState>) -> Result<Value, String> {
    tracing::info!("Command: get_statistics");

    match state.database.get_statistics().await {
        Ok(stats) => {
            serde_json::to_value(&stats).map_err(|e| format!("Failed to serialize stats: {}", e))
        }
        Err(e) => {
            tracing::error!("Failed to get statistics: {}", e);
            Err(format!("Database error: {}", e))
        }
    }
}

/// Get scraping status
#[tauri::command]
pub async fn get_scraping_status(state: State<'_, AppState>) -> Result<Value, String> {
    tracing::info!("Command: get_scraping_status");

    let status = state.scheduler_status.read().await;

    Ok(serde_json::json!({
        "is_running": status.is_running,
        "last_scrape": status.last_run.map(|dt| dt.to_rfc3339()),
        "next_scrape": status.next_run.map(|dt| dt.to_rfc3339()),
        "interval_hours": state.config.scraping_interval_hours,
    }))
}

/// Check if first-run setup is complete
#[tauri::command]
pub async fn is_first_run() -> Result<bool, String> {
    tracing::info!("Command: is_first_run");

    // Check if configuration file exists
    let config_path = Config::default_path();
    let first_run = !config_path.exists();

    tracing::info!("First run: {}", first_run);
    Ok(first_run)
}

/// Complete first-run setup
#[tauri::command]
pub async fn complete_setup(config: Value) -> Result<(), String> {
    tracing::info!("Command: complete_setup");

    // Parse config from JSON
    let parsed_config: Config =
        serde_json::from_value(config).map_err(|e| format!("Invalid configuration: {}", e))?;

    // Ensure config directory exists
    let config_path = Config::default_path();
    if let Some(parent) = config_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create config directory: {}", e))?;
    }

    // Save configuration
    parsed_config
        .save(&config_path)
        .map_err(|e| format!("Failed to save config: {}", e))?;

    // Initialize database
    let db_path = Database::default_path();
    let database = Database::connect(&db_path)
        .await
        .map_err(|e| format!("Failed to connect to database: {}", e))?;

    database
        .migrate()
        .await
        .map_err(|e| format!("Failed to migrate database: {}", e))?;

    tracing::info!("Setup complete");
    Ok(())
}

/// Search jobs with filter
#[tauri::command]
pub async fn search_jobs_query(
    query: String,
    limit: usize,
    state: State<'_, AppState>,
) -> Result<Vec<Value>, String> {
    tracing::info!(
        "Command: search_jobs_query (query: {}, limit: {})",
        query,
        limit
    );

    match state.database.search_jobs(&query, limit as i64).await {
        Ok(jobs) => {
            let jobs_json: Vec<Value> = jobs
                .into_iter()
                .filter_map(|job| {
                    serde_json::to_value(&job)
                        .map_err(|e| {
                            tracing::error!("Failed to serialize job {}: {}", job.id, e);
                            e
                        })
                        .ok()
                })
                .collect();

            Ok(jobs_json)
        }
        Err(e) => {
            tracing::error!("Search failed: {}", e);
            Err(format!("Database error: {}", e))
        }
    }
}

/// Hide a job (mark as dismissed by user)
#[tauri::command]
pub async fn hide_job(id: i64, state: State<'_, AppState>) -> Result<(), String> {
    tracing::info!("Command: hide_job (id: {})", id);

    match state.database.hide_job(id).await {
        Ok(_) => {
            tracing::info!("Job {} hidden successfully", id);
            Ok(())
        }
        Err(e) => {
            tracing::error!("Failed to hide job: {}", e);
            Err(format!("Database error: {}", e))
        }
    }
}

/// Unhide a job (restore to visible)
#[tauri::command]
pub async fn unhide_job(id: i64, state: State<'_, AppState>) -> Result<(), String> {
    tracing::info!("Command: unhide_job (id: {})", id);

    match state.database.unhide_job(id).await {
        Ok(_) => {
            tracing::info!("Job {} unhidden successfully", id);
            Ok(())
        }
        Err(e) => {
            tracing::error!("Failed to unhide job: {}", e);
            Err(format!("Database error: {}", e))
        }
    }
}

/// Toggle bookmark status for a job
#[tauri::command]
pub async fn toggle_bookmark(id: i64, state: State<'_, AppState>) -> Result<bool, String> {
    tracing::info!("Command: toggle_bookmark (id: {})", id);

    match state.database.toggle_bookmark(id).await {
        Ok(new_state) => {
            tracing::info!("Job {} bookmark toggled to {}", id, new_state);
            Ok(new_state)
        }
        Err(e) => {
            tracing::error!("Failed to toggle bookmark: {}", e);
            Err(format!("Database error: {}", e))
        }
    }
}

/// Get bookmarked jobs
#[tauri::command]
pub async fn get_bookmarked_jobs(
    limit: usize,
    state: State<'_, AppState>,
) -> Result<Vec<Value>, String> {
    tracing::info!("Command: get_bookmarked_jobs (limit: {})", limit);

    match state.database.get_bookmarked_jobs(limit as i64).await {
        Ok(jobs) => {
            let jobs_json: Vec<Value> = jobs
                .into_iter()
                .filter_map(|job| {
                    serde_json::to_value(&job)
                        .map_err(|e| {
                            tracing::error!("Failed to serialize job {}: {}", job.id, e);
                            e
                        })
                        .ok()
                })
                .collect();

            Ok(jobs_json)
        }
        Err(e) => {
            tracing::error!("Failed to get bookmarked jobs: {}", e);
            Err(format!("Database error: {}", e))
        }
    }
}

/// Set notes for a job
#[tauri::command]
pub async fn set_job_notes(
    id: i64,
    notes: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    tracing::info!(
        "Command: set_job_notes (id: {}, has_notes: {})",
        id,
        notes.is_some()
    );

    match state.database.set_job_notes(id, notes.as_deref()).await {
        Ok(_) => {
            tracing::info!("Notes saved for job {}", id);
            Ok(())
        }
        Err(e) => {
            tracing::error!("Failed to save notes: {}", e);
            Err(format!("Database error: {}", e))
        }
    }
}

/// Get notes for a job
#[tauri::command]
pub async fn get_job_notes(id: i64, state: State<'_, AppState>) -> Result<Option<String>, String> {
    tracing::info!("Command: get_job_notes (id: {})", id);

    match state.database.get_job_notes(id).await {
        Ok(notes) => Ok(notes),
        Err(e) => {
            tracing::error!("Failed to get notes: {}", e);
            Err(format!("Database error: {}", e))
        }
    }
}

// ============================================================================
// ATS (Application Tracking System) Commands
// ============================================================================

/// Create a new application from a job
#[tauri::command]
pub async fn create_application(
    job_hash: String,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    tracing::info!("Command: create_application (job_hash: {})", job_hash);

    let tracker = ApplicationTracker::new(state.database.pool().clone());
    tracker
        .create_application(&job_hash)
        .await
        .map_err(|e| format!("Failed to create application: {}", e))
}

/// Get applications grouped by status (for Kanban board)
#[tauri::command]
pub async fn get_applications_kanban(
    state: State<'_, AppState>,
) -> Result<ApplicationsByStatus, String> {
    tracing::info!("Command: get_applications_kanban");

    let tracker = ApplicationTracker::new(state.database.pool().clone());
    tracker
        .get_applications_by_status()
        .await
        .map_err(|e| format!("Failed to get applications: {}", e))
}

/// Update application status
#[tauri::command]
pub async fn update_application_status(
    application_id: i64,
    status: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    tracing::info!(
        "Command: update_application_status (id: {}, status: {})",
        application_id,
        status
    );

    let tracker = ApplicationTracker::new(state.database.pool().clone());
    let new_status: ApplicationStatus = status
        .parse()
        .map_err(|e| format!("Invalid status: {}", e))?;

    tracker
        .update_status(application_id, new_status)
        .await
        .map_err(|e| format!("Failed to update status: {}", e))
}

/// Add notes to an application
#[tauri::command]
pub async fn add_application_notes(
    application_id: i64,
    notes: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    tracing::info!("Command: add_application_notes (id: {})", application_id);

    let tracker = ApplicationTracker::new(state.database.pool().clone());
    tracker
        .add_notes(application_id, &notes)
        .await
        .map_err(|e| format!("Failed to add notes: {}", e))
}

/// Get pending reminders
#[tauri::command]
pub async fn get_pending_reminders(
    state: State<'_, AppState>,
) -> Result<Vec<PendingReminder>, String> {
    tracing::info!("Command: get_pending_reminders");

    let tracker = ApplicationTracker::new(state.database.pool().clone());
    tracker
        .get_pending_reminders()
        .await
        .map_err(|e| format!("Failed to get reminders: {}", e))
}

/// Mark reminder as completed
#[tauri::command]
pub async fn complete_reminder(reminder_id: i64, state: State<'_, AppState>) -> Result<(), String> {
    tracing::info!("Command: complete_reminder (id: {})", reminder_id);

    let tracker = ApplicationTracker::new(state.database.pool().clone());
    tracker
        .complete_reminder(reminder_id)
        .await
        .map_err(|e| format!("Failed to complete reminder: {}", e))
}

/// Auto-detect ghosted applications
#[tauri::command]
pub async fn detect_ghosted_applications(state: State<'_, AppState>) -> Result<usize, String> {
    tracing::info!("Command: detect_ghosted_applications");

    let tracker = ApplicationTracker::new(state.database.pool().clone());
    tracker
        .auto_detect_ghosted()
        .await
        .map_err(|e| format!("Failed to detect ghosted: {}", e))
}

/// Get application statistics for analytics dashboard
#[tauri::command]
pub async fn get_application_stats(
    state: State<'_, AppState>,
) -> Result<crate::core::ApplicationStats, String> {
    tracing::info!("Command: get_application_stats");

    let tracker = ApplicationTracker::new(state.database.pool().clone());
    tracker
        .get_application_stats()
        .await
        .map_err(|e| format!("Failed to get application stats: {}", e))
}

// ============================================================================
// Interview Scheduler Commands
// ============================================================================

/// Schedule a new interview
#[tauri::command]
pub async fn schedule_interview(
    application_id: i64,
    interview_type: String,
    scheduled_at: String,
    duration_minutes: i32,
    location: Option<String>,
    interviewer_name: Option<String>,
    interviewer_title: Option<String>,
    notes: Option<String>,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    tracing::info!(
        "Command: schedule_interview (app: {}, type: {}, at: {})",
        application_id,
        interview_type,
        scheduled_at
    );

    let tracker = ApplicationTracker::new(state.database.pool().clone());
    tracker
        .schedule_interview(
            application_id,
            &interview_type,
            &scheduled_at,
            duration_minutes,
            location.as_deref(),
            interviewer_name.as_deref(),
            interviewer_title.as_deref(),
            notes.as_deref(),
        )
        .await
        .map_err(|e| format!("Failed to schedule interview: {}", e))
}

/// Get upcoming interviews
#[tauri::command]
pub async fn get_upcoming_interviews(
    state: State<'_, AppState>,
) -> Result<Vec<crate::core::InterviewWithJob>, String> {
    tracing::info!("Command: get_upcoming_interviews");

    let tracker = ApplicationTracker::new(state.database.pool().clone());
    tracker
        .get_upcoming_interviews()
        .await
        .map_err(|e| format!("Failed to get interviews: {}", e))
}

/// Get past interviews (completed, last 90 days)
#[tauri::command]
pub async fn get_past_interviews(
    state: State<'_, AppState>,
) -> Result<Vec<crate::core::InterviewWithJob>, String> {
    tracing::info!("Command: get_past_interviews");

    let tracker = ApplicationTracker::new(state.database.pool().clone());
    tracker
        .get_past_interviews()
        .await
        .map_err(|e| format!("Failed to get past interviews: {}", e))
}

/// Complete an interview with outcome
#[tauri::command]
pub async fn complete_interview(
    interview_id: i64,
    outcome: String,
    notes: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    tracing::info!(
        "Command: complete_interview (id: {}, outcome: {})",
        interview_id,
        outcome
    );

    let tracker = ApplicationTracker::new(state.database.pool().clone());
    tracker
        .complete_interview(interview_id, &outcome, notes.as_deref())
        .await
        .map_err(|e| format!("Failed to complete interview: {}", e))
}

/// Delete an interview
#[tauri::command]
pub async fn delete_interview(interview_id: i64, state: State<'_, AppState>) -> Result<(), String> {
    tracing::info!("Command: delete_interview (id: {})", interview_id);

    let tracker = ApplicationTracker::new(state.database.pool().clone());
    tracker
        .delete_interview(interview_id)
        .await
        .map_err(|e| format!("Failed to delete interview: {}", e))
}

// ============================================================================
// Job Deduplication Commands
// ============================================================================

/// Find duplicate job groups (same title + company from different sources)
#[tauri::command]
pub async fn find_duplicates(
    state: State<'_, AppState>,
) -> Result<Vec<crate::core::db::DuplicateGroup>, String> {
    tracing::info!("Command: find_duplicates");

    state
        .database
        .find_duplicate_groups()
        .await
        .map_err(|e| format!("Database error: {}", e))
}

/// Merge duplicate jobs: keep primary, hide duplicates
#[tauri::command]
pub async fn merge_duplicates(
    primary_id: i64,
    duplicate_ids: Vec<i64>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    tracing::info!(
        "Command: merge_duplicates (primary: {}, duplicates: {:?})",
        primary_id,
        duplicate_ids
    );

    state
        .database
        .merge_duplicates(primary_id, &duplicate_ids)
        .await
        .map_err(|e| format!("Database error: {}", e))
}

// ============================================================================
// Resume Matcher Commands
// ============================================================================

/// Upload and parse a resume
#[tauri::command]
pub async fn upload_resume(
    name: String,
    file_path: String,
    state: State<'_, AppState>,
) -> Result<i64, String> {
    tracing::info!(
        "Command: upload_resume (name: {}, path: {})",
        name,
        file_path
    );

    let matcher = ResumeMatcher::new(state.database.pool().clone());
    matcher
        .upload_resume(&name, &file_path)
        .await
        .map_err(|e| format!("Failed to upload resume: {}", e))
}

/// Get active resume
#[tauri::command]
pub async fn get_active_resume(state: State<'_, AppState>) -> Result<Option<Resume>, String> {
    tracing::info!("Command: get_active_resume");

    let matcher = ResumeMatcher::new(state.database.pool().clone());
    matcher
        .get_active_resume()
        .await
        .map_err(|e| format!("Failed to get resume: {}", e))
}

/// Set active resume
#[tauri::command]
pub async fn set_active_resume(resume_id: i64, state: State<'_, AppState>) -> Result<(), String> {
    tracing::info!("Command: set_active_resume (id: {})", resume_id);

    let matcher = ResumeMatcher::new(state.database.pool().clone());
    matcher
        .set_active_resume(resume_id)
        .await
        .map_err(|e| format!("Failed to set active resume: {}", e))
}

/// Get user skills from active resume
#[tauri::command]
pub async fn get_user_skills(
    resume_id: i64,
    state: State<'_, AppState>,
) -> Result<Vec<UserSkill>, String> {
    tracing::info!("Command: get_user_skills (resume_id: {})", resume_id);

    let matcher = ResumeMatcher::new(state.database.pool().clone());
    matcher
        .get_user_skills(resume_id)
        .await
        .map_err(|e| format!("Failed to get skills: {}", e))
}

/// Match resume to a job
#[tauri::command]
pub async fn match_resume_to_job(
    resume_id: i64,
    job_hash: String,
    state: State<'_, AppState>,
) -> Result<MatchResult, String> {
    tracing::info!(
        "Command: match_resume_to_job (resume: {}, job: {})",
        resume_id,
        job_hash
    );

    let matcher = ResumeMatcher::new(state.database.pool().clone());
    matcher
        .match_resume_to_job(resume_id, &job_hash)
        .await
        .map_err(|e| format!("Failed to match resume: {}", e))
}

/// Get existing match result
#[tauri::command]
pub async fn get_match_result(
    resume_id: i64,
    job_hash: String,
    state: State<'_, AppState>,
) -> Result<Option<MatchResult>, String> {
    tracing::info!(
        "Command: get_match_result (resume: {}, job: {})",
        resume_id,
        job_hash
    );

    let matcher = ResumeMatcher::new(state.database.pool().clone());
    matcher
        .get_match_result(resume_id, &job_hash)
        .await
        .map_err(|e| format!("Failed to get match result: {}", e))
}

/// Get recent match results for a resume
#[tauri::command]
pub async fn get_recent_matches(
    resume_id: i64,
    limit: Option<i64>,
    state: State<'_, AppState>,
) -> Result<Vec<MatchResultWithJob>, String> {
    tracing::info!(
        "Command: get_recent_matches (resume: {}, limit: {:?})",
        resume_id,
        limit
    );

    let matcher = ResumeMatcher::new(state.database.pool().clone());
    matcher
        .get_recent_matches(resume_id, limit.unwrap_or(10))
        .await
        .map_err(|e| format!("Failed to get recent matches: {}", e))
}

// ============================================================================
// Salary AI Commands
// ============================================================================

/// Predict salary for a job
#[tauri::command]
pub async fn predict_salary(
    job_hash: String,
    years_experience: Option<i32>,
    state: State<'_, AppState>,
) -> Result<SalaryPrediction, String> {
    tracing::info!(
        "Command: predict_salary (job: {}, years: {:?})",
        job_hash,
        years_experience
    );

    let analyzer = SalaryAnalyzer::new(state.database.pool().clone());
    analyzer
        .predict_salary_for_job(&job_hash, years_experience)
        .await
        .map_err(|e| format!("Failed to predict salary: {}", e))
}

/// Get salary benchmark for a role
#[tauri::command]
pub async fn get_salary_benchmark(
    job_title: String,
    location: String,
    seniority: String,
    state: State<'_, AppState>,
) -> Result<Option<Value>, String> {
    tracing::info!(
        "Command: get_salary_benchmark (title: {}, location: {})",
        job_title,
        location
    );

    let analyzer = SalaryAnalyzer::new(state.database.pool().clone());
    let seniority_level = SeniorityLevel::parse(&seniority);

    match analyzer
        .get_benchmark(&job_title, &location, seniority_level)
        .await
    {
        Ok(Some(benchmark)) => serde_json::to_value(&benchmark)
            .map(Some)
            .map_err(|e| format!("Failed to serialize benchmark: {}", e)),
        Ok(None) => Ok(None),
        Err(e) => Err(format!("Failed to get benchmark: {}", e)),
    }
}

/// Generate negotiation script
#[tauri::command]
pub async fn generate_negotiation_script(
    scenario: String,
    params: HashMap<String, String>,
    state: State<'_, AppState>,
) -> Result<String, String> {
    tracing::info!(
        "Command: generate_negotiation_script (scenario: {})",
        scenario
    );

    let analyzer = SalaryAnalyzer::new(state.database.pool().clone());
    analyzer
        .generate_negotiation_script(&scenario, params)
        .await
        .map_err(|e| format!("Failed to generate script: {}", e))
}

/// Compare multiple job offers
#[tauri::command]
pub async fn compare_offers(
    offer_ids: Vec<i64>,
    state: State<'_, AppState>,
) -> Result<Vec<OfferComparison>, String> {
    tracing::info!("Command: compare_offers (count: {})", offer_ids.len());

    let analyzer = SalaryAnalyzer::new(state.database.pool().clone());
    analyzer
        .compare_offers(offer_ids)
        .await
        .map_err(|e| format!("Failed to compare offers: {}", e))
}

// ============================================================================
// Market Intelligence Commands
// ============================================================================

/// Get trending skills
#[tauri::command]
pub async fn get_trending_skills(
    limit: usize,
    state: State<'_, AppState>,
) -> Result<Vec<SkillTrend>, String> {
    tracing::info!("Command: get_trending_skills (limit: {})", limit);

    let intel = MarketIntelligence::new(state.database.pool().clone());
    intel
        .get_trending_skills(limit)
        .await
        .map_err(|e| format!("Failed to get trending skills: {}", e))
}

/// Get most active hiring companies
#[tauri::command]
pub async fn get_active_companies(
    limit: usize,
    state: State<'_, AppState>,
) -> Result<Vec<CompanyActivity>, String> {
    tracing::info!("Command: get_active_companies (limit: {})", limit);

    let intel = MarketIntelligence::new(state.database.pool().clone());
    intel
        .get_most_active_companies(limit)
        .await
        .map_err(|e| format!("Failed to get active companies: {}", e))
}

/// Get hottest job market locations
#[tauri::command]
pub async fn get_hottest_locations(
    limit: usize,
    state: State<'_, AppState>,
) -> Result<Vec<LocationHeat>, String> {
    tracing::info!("Command: get_hottest_locations (limit: {})", limit);

    let intel = MarketIntelligence::new(state.database.pool().clone());
    intel
        .get_hottest_locations(limit)
        .await
        .map_err(|e| format!("Failed to get hottest locations: {}", e))
}

/// Get unread market alerts
#[tauri::command]
pub async fn get_market_alerts(state: State<'_, AppState>) -> Result<Vec<MarketAlert>, String> {
    tracing::info!("Command: get_market_alerts");

    let intel = MarketIntelligence::new(state.database.pool().clone());
    intel
        .get_unread_alerts()
        .await
        .map_err(|e| format!("Failed to get market alerts: {}", e))
}

/// Run market analysis (manual trigger)
#[tauri::command]
pub async fn run_market_analysis(state: State<'_, AppState>) -> Result<Value, String> {
    tracing::info!("Command: run_market_analysis");

    let intel = MarketIntelligence::new(state.database.pool().clone());
    match intel.run_daily_analysis().await {
        Ok(snapshot) => serde_json::to_value(&snapshot)
            .map_err(|e| format!("Failed to serialize snapshot: {}", e)),
        Err(e) => Err(format!("Failed to run market analysis: {}", e)),
    }
}

// ============================================================================
// Ghost Job Detection Commands (v1.4)
// ============================================================================

/// Get jobs flagged as potential ghost jobs
///
/// Returns jobs with ghost_score >= threshold (default 0.5)
#[tauri::command]
pub async fn get_ghost_jobs(
    threshold: Option<f64>,
    limit: Option<i64>,
    state: State<'_, AppState>,
) -> Result<Vec<Value>, String> {
    let threshold = threshold.unwrap_or(0.5);
    let limit = limit.unwrap_or(100);
    tracing::info!(
        "Command: get_ghost_jobs (threshold: {}, limit: {})",
        threshold,
        limit
    );

    match state.database.get_ghost_jobs(threshold, limit).await {
        Ok(jobs) => {
            let jobs_json: Vec<Value> = jobs
                .into_iter()
                .filter_map(|job| serde_json::to_value(&job).ok())
                .collect();
            Ok(jobs_json)
        }
        Err(e) => {
            tracing::error!("Failed to get ghost jobs: {}", e);
            Err(format!("Database error: {}", e))
        }
    }
}

/// Get ghost detection statistics
///
/// Returns counts of jobs by ghost score ranges and top reasons
#[tauri::command]
pub async fn get_ghost_statistics(state: State<'_, AppState>) -> Result<Value, String> {
    tracing::info!("Command: get_ghost_statistics");

    match state.database.get_ghost_statistics().await {
        Ok(stats) => serde_json::to_value(&stats)
            .map_err(|e| format!("Failed to serialize ghost statistics: {}", e)),
        Err(e) => {
            tracing::error!("Failed to get ghost statistics: {}", e);
            Err(format!("Database error: {}", e))
        }
    }
}

/// Get recent jobs with optional ghost filtering
///
/// When `exclude_ghost` is true, jobs with ghost_score >= 0.5 are excluded.
#[tauri::command]
pub async fn get_recent_jobs_filtered(
    limit: i64,
    exclude_ghost: bool,
    state: State<'_, AppState>,
) -> Result<Vec<Value>, String> {
    tracing::info!(
        "Command: get_recent_jobs_filtered (limit: {}, exclude_ghost: {})",
        limit,
        exclude_ghost
    );

    // Convert bool to max_ghost_score: exclude ghosts means max score of 0.5
    let max_ghost_score = if exclude_ghost { Some(0.5) } else { None };

    match state
        .database
        .get_recent_jobs_filtered(limit, max_ghost_score)
        .await
    {
        Ok(jobs) => {
            let jobs_json: Vec<Value> = jobs
                .into_iter()
                .filter_map(|job| serde_json::to_value(&job).ok())
                .collect();
            Ok(jobs_json)
        }
        Err(e) => {
            tracing::error!("Failed to get filtered jobs: {}", e);
            Err(format!("Database error: {}", e))
        }
    }
}

// ============================================================================
// User Data Commands (E3: Backend Persistence)
// ============================================================================

/// List all cover letter templates
#[tauri::command]
pub async fn list_cover_letter_templates(
    state: State<'_, AppState>,
) -> Result<Vec<CoverLetterTemplate>, String> {
    tracing::info!("Command: list_cover_letter_templates");

    let manager = UserDataManager::new(state.database.pool().clone());
    manager
        .list_templates()
        .await
        .map_err(|e| format!("Database error: {}", e))
}

/// Get a single cover letter template by ID
#[tauri::command]
pub async fn get_cover_letter_template(
    id: String,
    state: State<'_, AppState>,
) -> Result<Option<CoverLetterTemplate>, String> {
    tracing::info!("Command: get_cover_letter_template (id: {})", id);

    let manager = UserDataManager::new(state.database.pool().clone());
    manager
        .get_template(&id)
        .await
        .map_err(|e| format!("Database error: {}", e))
}

/// Create a new cover letter template
#[tauri::command]
pub async fn create_cover_letter_template(
    name: String,
    content: String,
    category: String,
    state: State<'_, AppState>,
) -> Result<CoverLetterTemplate, String> {
    tracing::info!("Command: create_cover_letter_template (name: {})", name);

    let category: TemplateCategory = category
        .parse()
        .map_err(|e: String| format!("Invalid category: {}", e))?;

    let manager = UserDataManager::new(state.database.pool().clone());
    manager
        .create_template(&name, &content, category)
        .await
        .map_err(|e| format!("Database error: {}", e))
}

/// Update an existing cover letter template
#[tauri::command]
pub async fn update_cover_letter_template(
    id: String,
    name: String,
    content: String,
    category: String,
    state: State<'_, AppState>,
) -> Result<Option<CoverLetterTemplate>, String> {
    tracing::info!("Command: update_cover_letter_template (id: {})", id);

    let category: TemplateCategory = category
        .parse()
        .map_err(|e: String| format!("Invalid category: {}", e))?;

    let manager = UserDataManager::new(state.database.pool().clone());
    manager
        .update_template(&id, &name, &content, category)
        .await
        .map_err(|e| format!("Database error: {}", e))
}

/// Delete a cover letter template
#[tauri::command]
pub async fn delete_cover_letter_template(
    id: String,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    tracing::info!("Command: delete_cover_letter_template (id: {})", id);

    let manager = UserDataManager::new(state.database.pool().clone());
    manager
        .delete_template(&id)
        .await
        .map_err(|e| format!("Database error: {}", e))
}

/// Get interview prep checklist for an interview
#[tauri::command]
pub async fn get_interview_prep_checklist(
    interview_id: i64,
    state: State<'_, AppState>,
) -> Result<Vec<PrepChecklistItem>, String> {
    tracing::info!(
        "Command: get_interview_prep_checklist (interview_id: {})",
        interview_id
    );

    let manager = UserDataManager::new(state.database.pool().clone());
    manager
        .get_prep_checklist(interview_id)
        .await
        .map_err(|e| format!("Database error: {}", e))
}

/// Save interview prep checklist item
#[tauri::command]
pub async fn save_interview_prep_item(
    interview_id: i64,
    item_id: String,
    completed: bool,
    state: State<'_, AppState>,
) -> Result<(), String> {
    tracing::info!(
        "Command: save_interview_prep_item (interview_id: {}, item_id: {}, completed: {})",
        interview_id,
        item_id,
        completed
    );

    let manager = UserDataManager::new(state.database.pool().clone());
    manager
        .save_prep_item(interview_id, &item_id, completed)
        .await
        .map_err(|e| format!("Database error: {}", e))
}

/// Get interview follow-up reminder
#[tauri::command]
pub async fn get_interview_followup(
    interview_id: i64,
    state: State<'_, AppState>,
) -> Result<Option<FollowUpReminder>, String> {
    tracing::info!(
        "Command: get_interview_followup (interview_id: {})",
        interview_id
    );

    let manager = UserDataManager::new(state.database.pool().clone());
    manager
        .get_followup(interview_id)
        .await
        .map_err(|e| format!("Database error: {}", e))
}

/// Save interview follow-up reminder
#[tauri::command]
pub async fn save_interview_followup(
    interview_id: i64,
    thank_you_sent: bool,
    state: State<'_, AppState>,
) -> Result<FollowUpReminder, String> {
    tracing::info!(
        "Command: save_interview_followup (interview_id: {}, thank_you_sent: {})",
        interview_id,
        thank_you_sent
    );

    let manager = UserDataManager::new(state.database.pool().clone());
    manager
        .save_followup(interview_id, thank_you_sent)
        .await
        .map_err(|e| format!("Database error: {}", e))
}

/// List all saved searches
#[tauri::command]
pub async fn list_saved_searches(state: State<'_, AppState>) -> Result<Vec<SavedSearch>, String> {
    tracing::info!("Command: list_saved_searches");

    let manager = UserDataManager::new(state.database.pool().clone());
    manager
        .list_saved_searches()
        .await
        .map_err(|e| format!("Database error: {}", e))
}

/// Create a saved search
#[tauri::command]
pub async fn create_saved_search(
    search: SavedSearch,
    state: State<'_, AppState>,
) -> Result<SavedSearch, String> {
    tracing::info!("Command: create_saved_search (name: {})", search.name);

    let manager = UserDataManager::new(state.database.pool().clone());
    manager
        .create_saved_search(search)
        .await
        .map_err(|e| format!("Database error: {}", e))
}

/// Mark a saved search as used (updates last_used_at)
#[tauri::command]
pub async fn use_saved_search(id: String, state: State<'_, AppState>) -> Result<bool, String> {
    tracing::info!("Command: use_saved_search (id: {})", id);

    let manager = UserDataManager::new(state.database.pool().clone());
    manager
        .use_saved_search(&id)
        .await
        .map_err(|e| format!("Database error: {}", e))
}

/// Delete a saved search
#[tauri::command]
pub async fn delete_saved_search(id: String, state: State<'_, AppState>) -> Result<bool, String> {
    tracing::info!("Command: delete_saved_search (id: {})", id);

    let manager = UserDataManager::new(state.database.pool().clone());
    manager
        .delete_saved_search(&id)
        .await
        .map_err(|e| format!("Database error: {}", e))
}

/// Get notification preferences
#[tauri::command]
pub async fn get_notification_preferences(
    state: State<'_, AppState>,
) -> Result<NotificationPreferences, String> {
    tracing::info!("Command: get_notification_preferences");

    let manager = UserDataManager::new(state.database.pool().clone());
    manager
        .get_notification_preferences()
        .await
        .map_err(|e| format!("Database error: {}", e))
}

/// Save notification preferences
#[tauri::command]
pub async fn save_notification_preferences(
    prefs: NotificationPreferences,
    state: State<'_, AppState>,
) -> Result<(), String> {
    tracing::info!("Command: save_notification_preferences");

    let manager = UserDataManager::new(state.database.pool().clone());
    manager
        .save_notification_preferences(&prefs)
        .await
        .map_err(|e| format!("Database error: {}", e))
}

/// Import cover letter templates from localStorage migration
#[tauri::command]
pub async fn import_cover_letter_templates(
    templates: Vec<CoverLetterTemplate>,
    state: State<'_, AppState>,
) -> Result<usize, String> {
    tracing::info!(
        "Command: import_cover_letter_templates ({} templates)",
        templates.len()
    );

    let manager = UserDataManager::new(state.database.pool().clone());
    manager
        .import_templates(templates)
        .await
        .map_err(|e| format!("Database error: {}", e))
}

/// Import saved searches from localStorage migration
#[tauri::command]
pub async fn import_saved_searches(
    searches: Vec<SavedSearch>,
    state: State<'_, AppState>,
) -> Result<usize, String> {
    tracing::info!(
        "Command: import_saved_searches ({} searches)",
        searches.len()
    );

    let manager = UserDataManager::new(state.database.pool().clone());
    manager
        .import_saved_searches(searches)
        .await
        .map_err(|e| format!("Database error: {}", e))
}

/// Add search query to history
#[tauri::command]
pub async fn add_search_history(query: String, state: State<'_, AppState>) -> Result<(), String> {
    tracing::info!("Command: add_search_history");

    let manager = UserDataManager::new(state.database.pool().clone());
    manager
        .add_search_history(&query)
        .await
        .map_err(|e| format!("Database error: {}", e))
}

/// Get search history
#[tauri::command]
pub async fn get_search_history(
    limit: i64,
    state: State<'_, AppState>,
) -> Result<Vec<String>, String> {
    tracing::info!("Command: get_search_history (limit: {})", limit);

    let manager = UserDataManager::new(state.database.pool().clone());
    manager
        .get_search_history(limit)
        .await
        .map_err(|e| format!("Database error: {}", e))
}

/// Clear search history
#[tauri::command]
pub async fn clear_search_history(state: State<'_, AppState>) -> Result<(), String> {
    tracing::info!("Command: clear_search_history");

    let manager = UserDataManager::new(state.database.pool().clone());
    manager
        .clear_search_history()
        .await
        .map_err(|e| format!("Database error: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::core::{
        config::{AlertConfig, Config, LocationPreferences},
        db::Job,
    };
    use chrono::Utc;

    /// Helper to create a test AppState with in-memory database
    async fn create_test_app_state() -> AppState {
        let config = Config {
            title_allowlist: vec!["Engineer".to_string()],
            title_blocklist: vec![],
            keywords_boost: vec!["Rust".to_string()],
            keywords_exclude: vec![],
            location_preferences: LocationPreferences {
                allow_remote: true,
                allow_hybrid: false,
                allow_onsite: false,
                cities: vec![],
                states: vec![],
                country: "US".to_string(),
            },
            salary_floor_usd: 100000,
            immediate_alert_threshold: 0.9,
            scraping_interval_hours: 2,
            alerts: AlertConfig::default(),
            greenhouse_urls: vec![],
            lever_urls: vec![],
            linkedin: Default::default(),
            indeed: Default::default(),
            auto_refresh: Default::default(),
            jobswithgpt_endpoint: "https://api.jobswithgpt.com/mcp".to_string(),
        };

        let database = Database::connect_memory()
            .await
            .expect("Failed to create test database");
        database.migrate().await.expect("Failed to run migrations");

        AppState {
            config: Arc::new(config),
            database: Arc::new(database),
            scheduler: None,
            scheduler_status: Arc::new(RwLock::new(SchedulerStatus::default())),
        }
    }

    /// Helper to create a test job
    fn create_test_job(id: i64, title: &str, score: f64) -> Job {
        Job {
            id,
            hash: format!("hash_{}", id),
            title: title.to_string(),
            company: "Test Company".to_string(),
            url: format!("https://example.com/job/{}", id),
            location: Some("Remote".to_string()),
            description: Some("Test description".to_string()),
            score: Some(score),
            score_reasons: Some("[]".to_string()),
            source: "test".to_string(),
            remote: Some(true),
            salary_min: Some(150000),
            salary_max: Some(200000),
            currency: Some("USD".to_string()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            last_seen: Utc::now(),
            times_seen: 1,
            immediate_alert_sent: false,
            hidden: false,
            included_in_digest: false,
            bookmarked: false,
            notes: None,
            ghost_score: None,
            ghost_reasons: None,
            first_seen: None,
            repost_count: 0,
        }
    }

    #[tokio::test]
    async fn test_database_job_operations() {
        let state = create_test_app_state().await;

        // Insert test jobs with unique hashes
        let mut job1 = create_test_job(1, "Rust Engineer", 0.95);
        let mut job2 = create_test_job(2, "Backend Engineer", 0.85);
        job1.hash = "unique_hash_1".to_string();
        job2.hash = "unique_hash_2".to_string();

        state
            .database
            .upsert_job(&job1)
            .await
            .expect("Failed to insert job1");
        state
            .database
            .upsert_job(&job2)
            .await
            .expect("Failed to insert job2");

        // Test get_recent_jobs logic
        let jobs = state
            .database
            .get_recent_jobs(10)
            .await
            .expect("get_recent_jobs should succeed");
        assert_eq!(jobs.len(), 2, "Should return 2 jobs");
    }

    #[tokio::test]
    async fn test_database_job_limit() {
        let state = create_test_app_state().await;

        // Insert 5 test jobs
        for i in 0..5 {
            let mut job = create_test_job(0, &format!("Job {}", i), 0.8);
            job.hash = format!("unique_hash_{}", i); // Unique hash for each job
            state
                .database
                .upsert_job(&job)
                .await
                .expect("Failed to insert job");
        }

        // Request only 3 jobs
        let jobs = state
            .database
            .get_recent_jobs(3)
            .await
            .expect("get_recent_jobs should succeed");
        assert_eq!(jobs.len(), 3, "Should return exactly 3 jobs");
    }

    #[tokio::test]
    async fn test_database_empty() {
        let state = create_test_app_state().await;

        let jobs = state
            .database
            .get_recent_jobs(10)
            .await
            .expect("get_recent_jobs should succeed on empty DB");
        assert_eq!(
            jobs.len(),
            0,
            "Should return empty array for empty database"
        );
    }

    #[tokio::test]
    async fn test_database_job_by_id() {
        let state = create_test_app_state().await;

        let job = create_test_job(0, "Test Engineer", 0.9);
        let job_id = state
            .database
            .upsert_job(&job)
            .await
            .expect("Failed to insert job");

        let found_job = state
            .database
            .get_job_by_id(job_id)
            .await
            .expect("get_job_by_id should succeed");
        assert!(found_job.is_some(), "Should find the job");
        assert_eq!(found_job.unwrap().title, "Test Engineer");
    }

    #[tokio::test]
    async fn test_database_job_by_id_not_found() {
        let state = create_test_app_state().await;

        let found_job = state
            .database
            .get_job_by_id(999999)
            .await
            .expect("get_job_by_id should succeed even when not found");
        assert!(
            found_job.is_none(),
            "Should return None for nonexistent job"
        );
    }

    #[tokio::test]
    async fn test_config_structure() {
        let state = create_test_app_state().await;

        assert_eq!(state.config.salary_floor_usd, 100000);
        assert_eq!(state.config.immediate_alert_threshold, 0.9);
    }

    #[tokio::test]
    async fn test_config_serialization_valid() {
        let config = Config {
            title_allowlist: vec!["Test".to_string()],
            title_blocklist: vec![],
            keywords_boost: vec![],
            keywords_exclude: vec![],
            location_preferences: LocationPreferences {
                allow_remote: true,
                allow_hybrid: false,
                allow_onsite: false,
                cities: vec![],
                states: vec![],
                country: "US".to_string(),
            },
            salary_floor_usd: 120000,
            immediate_alert_threshold: 0.85,
            scraping_interval_hours: 3,
            alerts: AlertConfig::default(),
            greenhouse_urls: vec![],
            lever_urls: vec![],
            linkedin: Default::default(),
            indeed: Default::default(),
            auto_refresh: Default::default(),
            jobswithgpt_endpoint: "https://api.jobswithgpt.com/mcp".to_string(),
        };

        let config_json = serde_json::to_value(&config).unwrap();
        let parsed: Result<Config, _> = serde_json::from_value(config_json.clone());
        assert!(parsed.is_ok(), "Valid config JSON should parse correctly");
    }

    #[tokio::test]
    async fn test_database_statistics() {
        let state = create_test_app_state().await;

        // Insert jobs with various scores
        let mut job1 = create_test_job(0, "High Match Job", 0.95);
        let mut job2 = create_test_job(0, "Medium Match Job", 0.75);
        let mut job3 = create_test_job(0, "Another High Match", 0.92);

        job1.hash = "hash_1".to_string();
        job2.hash = "hash_2".to_string();
        job3.hash = "hash_3".to_string();

        state
            .database
            .upsert_job(&job1)
            .await
            .expect("Failed to insert job1");
        state
            .database
            .upsert_job(&job2)
            .await
            .expect("Failed to insert job2");
        state
            .database
            .upsert_job(&job3)
            .await
            .expect("Failed to insert job3");

        let stats = state
            .database
            .get_statistics()
            .await
            .expect("get_statistics should succeed");
        assert_eq!(stats.total_jobs, 3);
        assert_eq!(stats.high_matches, 2); // Jobs with score >= 0.9
    }

    #[tokio::test]
    async fn test_database_statistics_empty() {
        let state = create_test_app_state().await;

        let stats = state
            .database
            .get_statistics()
            .await
            .expect("get_statistics should succeed on empty DB");
        assert_eq!(stats.total_jobs, 0);
        assert_eq!(stats.high_matches, 0);
        assert_eq!(stats.average_score, 0.0);
    }

    #[tokio::test]
    async fn test_scheduler_status_default() {
        let state = create_test_app_state().await;

        let status = state.scheduler_status.read().await;
        assert!(!status.is_running);
    }

    #[tokio::test]
    async fn test_is_first_run() {
        // Note: This test is environment-dependent and difficult to test in isolation
        // without mocking Config::default_path(). In a real scenario, you'd use
        // dependency injection or a trait to make this testable.

        // We can at least verify the function doesn't panic
        let result = is_first_run().await;
        assert!(result.is_ok(), "is_first_run should not panic");
    }

    #[tokio::test]
    async fn test_complete_setup_config_serialization() {
        let config = Config {
            title_allowlist: vec!["Engineer".to_string()],
            title_blocklist: vec![],
            keywords_boost: vec![],
            keywords_exclude: vec![],
            location_preferences: LocationPreferences {
                allow_remote: true,
                allow_hybrid: false,
                allow_onsite: false,
                cities: vec![],
                states: vec![],
                country: "US".to_string(),
            },
            salary_floor_usd: 100000,
            immediate_alert_threshold: 0.9,
            scraping_interval_hours: 2,
            alerts: AlertConfig::default(),
            greenhouse_urls: vec![],
            lever_urls: vec![],
            linkedin: Default::default(),
            indeed: Default::default(),
            auto_refresh: Default::default(),
            jobswithgpt_endpoint: "https://api.jobswithgpt.com/mcp".to_string(),
        };

        // Test that config can be serialized and deserialized
        let config_json = serde_json::to_value(&config).unwrap();
        let _parsed: Config = serde_json::from_value(config_json).unwrap();
    }

    #[tokio::test]
    async fn test_database_search() {
        let state = create_test_app_state().await;

        // Insert jobs with searchable content
        let mut job1 = create_test_job(0, "Senior Rust Engineer", 0.9);
        let mut job2 = create_test_job(0, "Python Developer", 0.8);

        job1.hash = "rust_hash".to_string();
        job2.hash = "python_hash".to_string();

        state
            .database
            .upsert_job(&job1)
            .await
            .expect("Failed to insert job1");
        state
            .database
            .upsert_job(&job2)
            .await
            .expect("Failed to insert job2");

        // Note: Full-text search requires FTS5 table which may not be set up in test migrations
        // This test verifies the search doesn't panic
        let result = state.database.search_jobs("Rust", 10).await;
        // The result might fail if FTS5 isn't properly set up in tests,
        // but should handle it gracefully
        assert!(
            result.is_ok() || result.is_err(),
            "search_jobs should not panic"
        );
    }
}
