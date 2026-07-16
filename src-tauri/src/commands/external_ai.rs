//! Thin Tauri adapter for reviewed external-AI requests.

use crate::{application, commands::AppState};
use tauri::State;

pub(crate) use jobsentinel_application::{ExternalAiCommandRequest, ExternalAiCommandResponse};

#[tauri::command]
pub(crate) async fn send_external_ai_request(
    request: ExternalAiCommandRequest,
    state: State<'_, AppState>,
) -> Result<ExternalAiCommandResponse, String> {
    tracing::info!(
        feature = %request.feature,
        provider = ?request.provider,
        "Command: send_external_ai_request"
    );

    let config = {
        let config = state.config.read().await;
        config.external_ai.clone()
    };
    application::send_external_ai_request(&request, &config, state.credentials.as_ref()).await
}
