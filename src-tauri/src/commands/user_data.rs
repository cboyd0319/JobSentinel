//! User data persistence Tauri commands (E3: Backend Persistence)
//!
//! Commands for cover letter templates, interview prep, saved searches, and notification preferences.

use crate::commands::AppState;
use crate::core::user_data::{
    CoverLetterTemplate, FollowUpReminder, NotificationPreferences, PrepChecklistItem, SavedSearch,
    TemplateCategory, UserDataManager,
};
use tauri::State;

// ============================================================================
// Cover Letter Templates
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

// ============================================================================
// Interview Prep Checklists
// ============================================================================

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

// ============================================================================
// Follow-up Reminders
// ============================================================================

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

// ============================================================================
// Saved Searches
// ============================================================================

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

// ============================================================================
// Notification Preferences
// ============================================================================

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

// ============================================================================
// Search History
// ============================================================================

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
