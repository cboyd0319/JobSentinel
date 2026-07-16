//! LinkedIn Workbench commands.

use crate::application::linkedin_workbench::{
    record_event, LinkedInWorkbenchEventInput, LinkedInWorkbenchEventResult,
};
use crate::commands::errors::user_friendly_error;
use crate::commands::AppState;
use tauri::State;

#[tauri::command]
pub(crate) async fn record_linkedin_workbench_event(
    input: LinkedInWorkbenchEventInput,
    state: State<'_, AppState>,
) -> Result<LinkedInWorkbenchEventResult, String> {
    record_event(&state.database, input)
        .await
        .map_err(|error| user_friendly_error("Failed to save LinkedIn work", error))
}
