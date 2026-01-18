//! Tauri Command Handlers
//!
//! This module contains all Tauri commands (RPC-style functions) that can be invoked
//! from the React frontend using `invoke()`.

use chrono::{DateTime, Utc};
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::core::{config::Config, db::Database, scheduler::Scheduler};

// Module declarations (public for Tauri macro access)
pub mod ats;
pub mod automation;
pub mod config;
pub mod credentials;
pub mod ghost;
pub mod jobs;
pub mod market;
pub mod resume;
pub mod salary;
pub mod user_data;

#[cfg(test)]
mod tests;

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

// ============================================================================
// Re-export all command functions for Tauri
// ============================================================================

// Job commands
pub use jobs::{
    find_duplicates, get_bookmarked_jobs, get_job_by_id, get_job_notes, get_recent_jobs,
    get_scraping_status, get_statistics, hide_job, merge_duplicates, search_jobs,
    search_jobs_query, set_job_notes, toggle_bookmark, unhide_job,
};

// ATS commands
pub use ats::{
    add_application_notes, complete_interview, complete_reminder, create_application,
    delete_interview, detect_ghosted_applications, get_application_stats,
    get_applications_kanban, get_past_interviews, get_pending_reminders,
    get_upcoming_interviews, schedule_interview, update_application_status,
};

// Resume commands
pub use resume::{
    // Matcher commands
    get_active_resume, get_match_result, get_recent_matches, get_user_skills,
    match_resume_to_job, set_active_resume, upload_resume,
    // Builder commands
    add_resume_education, add_resume_experience, create_resume_draft, delete_resume_draft,
    delete_resume_education, delete_resume_experience, get_resume_draft, set_resume_skills,
    update_resume_contact, update_resume_summary,
    // Template commands
    list_resume_templates, render_resume_html, render_resume_text,
    // Export commands
    export_resume_docx, export_resume_text,
    // ATS analysis commands
    analyze_resume_for_job, analyze_resume_format, extract_job_keywords, get_ats_power_words,
    improve_bullet_point,
};

// Salary commands
pub use salary::{
    compare_offers, generate_negotiation_script, get_salary_benchmark, predict_salary,
};

// Market intelligence commands
pub use market::{
    get_active_companies, get_hottest_locations, get_market_alerts, get_trending_skills,
    run_market_analysis,
};

// Ghost detection commands
pub use ghost::{get_ghost_jobs, get_ghost_statistics, get_recent_jobs_filtered};

// User data commands
pub use user_data::{
    add_search_history, clear_search_history, create_cover_letter_template,
    create_saved_search, delete_cover_letter_template, delete_saved_search,
    get_cover_letter_template, get_interview_followup, get_interview_prep_checklist,
    get_notification_preferences, get_search_history, import_cover_letter_templates,
    import_saved_searches, list_cover_letter_templates, list_saved_searches,
    save_interview_followup, save_interview_prep_item, save_notification_preferences,
    update_cover_letter_template, use_saved_search,
};

// Config commands
pub use config::{
    complete_setup, get_config, is_first_run, save_config, validate_slack_webhook,
};

// Credential commands
pub use credentials::{
    delete_credential, get_credential_status, has_credential, retrieve_credential, store_credential,
};

// Automation commands (One-Click Apply)
pub use automation::{
    // Profile management
    approve_automation_attempt, cancel_automation_attempt, create_automation_attempt,
    detect_ats_from_html, detect_ats_platform, find_answer_for_question, get_application_profile,
    get_automation_stats, get_automation_attempt, get_pending_attempts, get_screening_answers,
    upsert_application_profile, upsert_screening_answer,
    // Browser control
    close_automation_browser, fill_application_form, is_browser_running, launch_automation_browser,
    take_automation_screenshot,
};
