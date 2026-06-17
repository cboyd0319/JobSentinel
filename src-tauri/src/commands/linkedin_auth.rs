//! Legacy LinkedIn auth command boundary.
//!
//! LinkedIn automatic monitoring is disabled by JobSentinel source policy.
//! These commands remain registered only so older frontends and stored app
//! state fail closed instead of reaching hidden endpoints or collecting
//! session cookies.

use crate::commands::errors::user_friendly_error;
use crate::commands::AppState;
use crate::core::credentials::{CredentialKey, CredentialService};
use tauri::{AppHandle, Manager, State};

pub const LINKEDIN_AUTH_DISABLED_MESSAGE: &str =
    "LinkedIn automatic monitoring is disabled by JobSentinel source policy. \
     Use job-site search links to open LinkedIn yourself, or monitor official \
     company and ATS sources instead.";

/// Legacy LinkedIn credential expiry status.
#[derive(serde::Serialize)]
pub struct LinkedInExpiryStatus {
    /// Whether a LinkedIn session credential is active.
    pub connected: bool,
    /// Expiry date in ISO 8601 format, if applicable.
    pub expires_at: Option<String>,
    /// Days until expiry, if applicable.
    pub days_remaining: Option<i64>,
    /// Whether expiry is close.
    pub expiry_warning: bool,
    /// Whether the credential is expired.
    pub expired: bool,
}

fn disabled_error() -> String {
    LINKEDIN_AUTH_DISABLED_MESSAGE.to_string()
}

/// LinkedIn login is disabled by source policy.
#[tauri::command]
pub async fn linkedin_login(app: AppHandle) -> Result<String, String> {
    close_linkedin_login(app).await?;
    Err(disabled_error())
}

/// Storing LinkedIn session cookies is disabled by source policy.
#[tauri::command]
pub async fn store_linkedin_cookie(cookie: String) -> Result<(), String> {
    drop(cookie);
    Err(disabled_error())
}

/// LinkedIn is not connected because automatic monitoring is disabled.
#[tauri::command]
pub async fn is_linkedin_connected() -> Result<bool, String> {
    Ok(false)
}

/// Remove legacy LinkedIn session entries from the OS credential store.
pub async fn disconnect_linkedin_with_credentials(
    credentials: &CredentialService,
) -> Result<(), String> {
    credentials
        .delete(CredentialKey::LinkedInCookie)
        .await
        .map_err(|e| user_friendly_error("Failed to remove legacy LinkedIn credential", e))?;
    credentials
        .delete(CredentialKey::LinkedInCookieExpiry)
        .await
        .map_err(|e| user_friendly_error("Failed to remove legacy LinkedIn credential", e))?;
    tracing::info!("Removed legacy LinkedIn credential entries");
    Ok(())
}

/// Remove legacy LinkedIn session entries from secure storage.
#[tauri::command]
pub async fn disconnect_linkedin(state: State<'_, AppState>) -> Result<(), String> {
    disconnect_linkedin_with_credentials(state.credentials.as_ref()).await
}

/// Close any legacy LinkedIn login window if it exists.
#[tauri::command]
pub async fn close_linkedin_login(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("linkedin-login") {
        window
            .close()
            .map_err(|e| user_friendly_error("Failed to close legacy LinkedIn window", e))?;
    }
    Ok(())
}

/// Expiry status is inactive because automatic monitoring is disabled.
#[tauri::command]
pub async fn get_linkedin_expiry_status() -> Result<LinkedInExpiryStatus, String> {
    Ok(LinkedInExpiryStatus {
        connected: false,
        expires_at: None,
        days_remaining: None,
        expiry_warning: false,
        expired: false,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn storing_linkedin_cookie_fails_closed() {
        let err = store_linkedin_cookie("legacy-session-value".to_string())
            .await
            .unwrap_err();

        assert!(err.contains("source policy"));
        assert!(!err.contains("legacy-session-value"));
    }

    #[tokio::test]
    async fn linked_in_status_is_always_disconnected() {
        assert!(!is_linkedin_connected().await.unwrap());
    }

    #[tokio::test]
    async fn linked_in_expiry_status_is_inactive() {
        let status = get_linkedin_expiry_status().await.unwrap();

        assert!(!status.connected);
        assert!(status.expires_at.is_none());
        assert!(status.days_remaining.is_none());
        assert!(!status.expiry_warning);
        assert!(!status.expired);
    }
}
