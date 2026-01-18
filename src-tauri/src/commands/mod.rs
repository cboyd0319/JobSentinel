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
pub mod health;
pub mod jobs;
pub mod market;
pub mod resume;
pub mod salary;
pub mod scoring;
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
    delete_interview, detect_ghosted_applications, get_application_stats, get_applications_kanban,
    get_past_interviews, get_pending_reminders, get_upcoming_interviews, schedule_interview,
    update_application_status,
};

// Resume commands
pub use resume::{
    // Skill management commands (Phase 1)
    add_user_skill,
    delete_user_skill,
    update_user_skill,
    // Resume library commands (Phase 2)
    delete_resume,
    list_all_resumes,
    // Builder commands
    add_resume_education,
    add_resume_experience,
    // ATS analysis commands
    analyze_resume_for_job,
    analyze_resume_format,
    create_resume_draft,
    delete_resume_draft,
    delete_resume_education,
    delete_resume_experience,
    // Export commands
    export_resume_docx,
    export_resume_text,
    extract_job_keywords,
    // Matcher commands
    get_active_resume,
    get_ats_power_words,
    get_match_result,
    get_recent_matches,
    get_resume_draft,
    get_user_skills,
    improve_bullet_point,
    // Template commands
    list_resume_templates,
    match_resume_to_job,
    render_resume_html,
    render_resume_text,
    set_active_resume,
    set_resume_skills,
    update_resume_contact,
    update_resume_summary,
    upload_resume,
};

// Salary commands
pub use salary::{
    compare_offers, generate_negotiation_script, get_salary_benchmark, predict_salary,
};

// Scoring configuration commands
pub use scoring::{
    get_scoring_config, reset_scoring_config_cmd, update_scoring_config, validate_scoring_config,
};

// Market intelligence commands
pub use market::{
    get_active_companies, get_hottest_locations, get_market_alerts, get_trending_skills,
    run_market_analysis,
};

// Ghost detection commands
pub use ghost::{
    clear_ghost_feedback, get_ghost_config, get_ghost_feedback, get_ghost_jobs,
    get_ghost_statistics, get_recent_jobs_filtered, mark_job_as_ghost, mark_job_as_real,
    reset_ghost_config, set_ghost_config,
};

// User data commands
pub use user_data::{
    add_search_history, clear_search_history, create_cover_letter_template, create_saved_search,
    delete_cover_letter_template, delete_saved_search, get_cover_letter_template,
    get_interview_followup, get_interview_prep_checklist, get_notification_preferences,
    get_search_history, import_cover_letter_templates, import_saved_searches,
    list_cover_letter_templates, list_saved_searches, save_interview_followup,
    save_interview_prep_item, save_notification_preferences, update_cover_letter_template,
    use_saved_search,
};

// Config commands
pub use config::{complete_setup, get_config, is_first_run, save_config, validate_slack_webhook};

// Credential commands
pub use credentials::{
    delete_credential, get_credential_status, has_credential, retrieve_credential, store_credential,
};

// Automation commands (One-Click Apply)
pub use automation::{
    // Profile management
    approve_automation_attempt,
    cancel_automation_attempt,
    // Browser control
    close_automation_browser,
    create_automation_attempt,
    detect_ats_from_html,
    detect_ats_platform,
    fill_application_form,
    find_answer_for_question,
    get_application_profile,
    get_automation_attempt,
    get_automation_stats,
    get_pending_attempts,
    get_screening_answers,
    is_browser_running,
    launch_automation_browser,
    take_automation_screenshot,
    upsert_application_profile,
    upsert_screening_answer,
};

// Health monitoring commands
pub use health::{
    get_expiring_credentials, get_health_summary, get_linkedin_cookie_health, get_scraper_configs,
    get_scraper_health, get_scraper_runs, run_all_smoke_tests, run_scraper_smoke_test,
    set_scraper_enabled,
};
