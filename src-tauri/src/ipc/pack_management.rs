//! Exposes renderer-safe pack-management state without granting pack authority.

use crate::application::pack_runtime::{list_pack_management_reviews, PackManagementReview};
use crate::bootstrap::AppState;
use crate::desktop::Database;
use crate::ipc::errors::user_friendly_error;
use tauri::State;

#[tauri::command]
pub(crate) async fn list_pack_management(
    state: State<'_, AppState>,
) -> Result<Vec<PackManagementReview>, String> {
    list_pack_management_for_database(state.database.as_ref()).await
}

async fn list_pack_management_for_database(
    database: &Database,
) -> Result<Vec<PackManagementReview>, String> {
    list_pack_management_reviews(database)
        .await
        .map_err(|error| user_friendly_error("Pack information is unavailable", error))
}

#[cfg(test)]
mod tests {
    use super::list_pack_management_for_database;
    use crate::desktop::Database;

    #[tokio::test]
    async fn list_command_returns_the_renderer_safe_management_projection() {
        let database = Database::connect_memory().await.unwrap();
        database.migrate().await.unwrap();

        assert!(list_pack_management_for_database(&database)
            .await
            .unwrap()
            .is_empty());
    }
}
