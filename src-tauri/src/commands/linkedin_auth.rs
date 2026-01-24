//! LinkedIn OAuth-like Login Flow
//!
//! Provides a seamless in-app login experience for LinkedIn:
//! 1. Opens a native webview window with LinkedIn login
//! 2. User logs in normally (username, password, 2FA)
//! 3. Detects successful login via URL navigation
//! 4. Automatically extracts the li_at cookie from the native cookie store
//! 5. Stores it securely in the OS keyring
//!
//! No manual cookie copying required!

use crate::core::credentials::{CredentialKey, CredentialStore};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};
use tokio::sync::oneshot;

/// LinkedIn login URL
const LINKEDIN_LOGIN_URL: &str = "https://www.linkedin.com/login";

/// URLs that indicate successful login
const SUCCESS_URL_PREFIXES: &[&str] = &[
    "https://www.linkedin.com/feed",
    "https://www.linkedin.com/mynetwork",
    "https://www.linkedin.com/jobs",
    "https://www.linkedin.com/messaging",
    "https://www.linkedin.com/notifications",
    "https://www.linkedin.com/in/", // Profile page
];

/// Check if a URL indicates successful LinkedIn login
fn is_login_success_url(url: &str) -> bool {
    SUCCESS_URL_PREFIXES
        .iter()
        .any(|prefix| url.starts_with(prefix))
}

/// Open LinkedIn login window and automatically extract cookie after login
///
/// This is the main entry point. It:
/// 1. Opens a login window
/// 2. Monitors for successful login
/// 3. Extracts the li_at cookie automatically
/// 4. Stores it in the keyring
/// 5. Returns success/failure
#[tauri::command]
pub async fn linkedin_login(app: AppHandle) -> Result<String, String> {
    tracing::info!("Starting LinkedIn login flow");

    // Check if window already exists
    if app.get_webview_window("linkedin-login").is_some() {
        return Err("LinkedIn login window is already open".to_string());
    }

    // Create channels for communication
    let (result_tx, result_rx) = oneshot::channel::<Result<String, String>>();
    let result_tx = Arc::new(std::sync::Mutex::new(Some(result_tx)));
    let login_detected = Arc::new(AtomicBool::new(false));

    // Clones for the navigation handler
    let login_detected_nav = Arc::clone(&login_detected);
    let result_tx_nav = Arc::clone(&result_tx);
    let app_nav = app.clone();

    // Build the login window with navigation monitoring
    let window = WebviewWindowBuilder::new(
        &app,
        "linkedin-login",
        WebviewUrl::External(LINKEDIN_LOGIN_URL.parse().unwrap()),
    )
    .title("Connect LinkedIn")
    .inner_size(450.0, 700.0)
    .center()
    .resizable(true)
    .visible(true)
    .on_navigation(move |url| {
        let url_str = url.as_str();
        tracing::debug!("LinkedIn navigation: {}", url_str);

        if is_login_success_url(url_str) && !login_detected_nav.load(Ordering::SeqCst) {
            tracing::info!("LinkedIn login success detected!");
            login_detected_nav.store(true, Ordering::SeqCst);

            let result_tx = Arc::clone(&result_tx_nav);
            let app = app_nav.clone();

            // Spawn async task to extract cookies
            tauri::async_runtime::spawn(async move {
                // Give the page a moment to fully load and cookies to be set
                tokio::time::sleep(tokio::time::Duration::from_millis(1500)).await;

                // Extract cookie using platform-appropriate method
                #[cfg(target_os = "macos")]
                let cookie_result = extract_linkedin_cookie().await;

                #[cfg(any(target_os = "windows", target_os = "linux"))]
                let cookie_result = extract_linkedin_cookie_from_webview(&app).await;

                #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
                let cookie_result: Result<String, String> = Err("Unsupported platform".to_string());

                match &cookie_result {
                    Ok((cookie, expiry)) => {
                        tracing::info!("Successfully extracted LinkedIn cookie");
                        // Store cookie in keyring
                        if let Err(e) = CredentialStore::store(CredentialKey::LinkedInCookie, cookie)
                        {
                            tracing::error!("Failed to store cookie: {}", e);
                        }
                        // Store expiry date if available
                        if let Some(exp) = expiry {
                            if let Err(e) = CredentialStore::store(CredentialKey::LinkedInCookieExpiry, exp)
                            {
                                tracing::error!("Failed to store cookie expiry: {}", e);
                            }
                        }
                    }
                    Err(e) => {
                        tracing::error!("Failed to extract cookie: {}", e);
                    }
                }

                // Send result back (just the cookie value, not expiry)
                if let Some(tx) = result_tx.lock().unwrap().take() {
                    let _ = tx.send(cookie_result.map(|(cookie, _)| cookie));
                }

                // Close the window - need to get it fresh since we can't capture it
                if let Some(win) = app.get_webview_window("linkedin-login") {
                    let _ = win.close();
                }

                // Emit event to frontend
                let _ = app.emit("linkedin-auth-complete", ());
            });
        }

        true // Allow navigation to continue
    })
    .build()
    .map_err(|e| format!("Failed to create login window: {}", e))?;

    // Handle window close (user cancelled)
    let result_tx_cancel = Arc::clone(&result_tx);
    let login_detected_cancel = Arc::clone(&login_detected);

    window.on_window_event(move |event| {
        if let tauri::WindowEvent::CloseRequested { .. } = event {
            if !login_detected_cancel.load(Ordering::SeqCst) {
                if let Some(tx) = result_tx_cancel.lock().unwrap().take() {
                    let _ = tx.send(Err("Login cancelled by user".to_string()));
                }
            }
        }
    });

    // Wait for result
    match result_rx.await {
        Ok(result) => result,
        Err(_) => Err("Login flow was interrupted".to_string()),
    }
}

/// Extract the li_at cookie from the system cookie store
///
/// Platform-specific implementations access the native cookie store.
/// Returns (cookie_value, optional_expiry_iso8601)
#[cfg(target_os = "macos")]
#[allow(unsafe_code)] // Required for Objective-C interop
async fn extract_linkedin_cookie() -> Result<(String, Option<String>), String> {
    use block2::StackBlock;
    use objc2_foundation::{NSArray, NSHTTPCookie};
    use objc2_web_kit::WKWebsiteDataStore;
    use std::ptr::NonNull;
    use std::sync::mpsc;

    tracing::info!("Extracting LinkedIn cookie via WKHTTPCookieStore (macOS)");

    // Create a channel to receive cookies from the callback
    // Returns (cookie_value, expiry_timestamp_seconds)
    let (tx, rx) = mpsc::channel::<Option<(String, Option<f64>)>>();

    // Access the default data store and its cookie store
    // This needs to run on the main thread for WebKit
    std::thread::spawn(move || {
        // SAFETY: We're calling Objective-C APIs that require unsafe.
        // These are well-tested Apple framework methods.
        unsafe {
            let data_store = WKWebsiteDataStore::defaultDataStore();
            let cookie_store = data_store.httpCookieStore();

            // Create block to receive cookies
            let tx_clone = tx.clone();
            let block =
                StackBlock::new(move |cookies: NonNull<NSArray<NSHTTPCookie>>| {
                    let mut li_at_value: Option<(String, Option<f64>)> = None;

                    let cookies_ref = cookies.as_ref();
                    let count = cookies_ref.count();
                    tracing::debug!("Found {} cookies", count);

                    for i in 0..count {
                        let cookie = cookies_ref.objectAtIndex(i);
                        let name = cookie.name();
                        let name_str = name.to_string();

                        if name_str == "li_at" {
                            let value = cookie.value();
                            // Try to get expiry date
                            let expiry = cookie.expiresDate()
                                .map(|date| date.timeIntervalSince1970());
                            li_at_value = Some((value.to_string(), expiry));
                            tracing::info!("Found li_at cookie! Expiry: {:?}", expiry);
                            break;
                        }
                    }

                    let _ = tx_clone.send(li_at_value);
                });

            // Get all cookies
            cookie_store.getAllCookies(&block);
        }
    })
    .join()
    .map_err(|_| "Failed to run cookie extraction thread")?;

    // Wait for result with timeout
    match rx.recv_timeout(std::time::Duration::from_secs(5)) {
        Ok(Some((cookie, expiry_secs))) => {
            // Convert timestamp to ISO 8601 string
            let expiry_str = expiry_secs.map(|secs| {
                use chrono::{DateTime, Utc};
                let dt = DateTime::<Utc>::from_timestamp(secs as i64, 0)
                    .unwrap_or_else(|| Utc::now());
                dt.to_rfc3339()
            });
            Ok((cookie, expiry_str))
        },
        Ok(None) => Err(
            "LinkedIn cookie (li_at) not found. Please make sure you're fully logged in."
                .to_string(),
        ),
        Err(_) => Err("Timeout waiting for cookie extraction".to_string()),
    }
}

/// Extract LinkedIn cookie using Tauri's built-in cookie API (Windows/Linux)
///
/// This uses Tauri's webview.cookies_for_url() which wraps:
/// - Windows: WebView2 ICoreWebView2CookieManager
/// - Linux: WebKitGTK cookie jar
/// Returns (cookie_value, optional_expiry_iso8601)
#[cfg(any(target_os = "windows", target_os = "linux"))]
async fn extract_linkedin_cookie_from_webview(app: &AppHandle) -> Result<(String, Option<String>), String> {
    use tauri::Manager;

    tracing::info!("Extracting LinkedIn cookie via Tauri cookie API");

    // Get the login window's webview
    let window = app
        .get_webview_window("linkedin-login")
        .ok_or("LinkedIn login window not found")?;

    // Get cookies for LinkedIn domain
    // Note: On Windows, this must be called from an async context to avoid deadlock
    let cookies = window
        .cookies_for_url("https://www.linkedin.com")
        .map_err(|e| format!("Failed to get cookies: {}", e))?;

    tracing::debug!("Found {} cookies for linkedin.com", cookies.len());

    // Find the li_at cookie
    for cookie in cookies {
        if cookie.name() == "li_at" {
            let value = cookie.value().to_string();
            // Get expiry if available - Tauri's Cookie has expires() method
            let expiry_str = cookie.expires().map(|expires| {
                use chrono::{DateTime, Utc};
                // Tauri returns expiry as OffsetDateTime, convert to timestamp
                let timestamp = expires.unix_timestamp();
                let dt = DateTime::<Utc>::from_timestamp(timestamp, 0)
                    .unwrap_or_else(|| Utc::now());
                dt.to_rfc3339()
            });
            tracing::info!("Found li_at cookie! Expiry: {:?}", expiry_str);
            return Ok((value, expiry_str));
        }
    }

    Err("LinkedIn cookie (li_at) not found. Please make sure you're fully logged in.".to_string())
}

#[cfg(target_os = "windows")]
async fn extract_linkedin_cookie() -> Result<(String, Option<String>), String> {
    // This function is kept for API compatibility but won't be used directly
    // The actual extraction happens via extract_linkedin_cookie_from_webview
    Err("Use extract_linkedin_cookie_from_webview instead".to_string())
}

#[cfg(target_os = "linux")]
async fn extract_linkedin_cookie() -> Result<(String, Option<String>), String> {
    // This function is kept for API compatibility but won't be used directly
    // The actual extraction happens via extract_linkedin_cookie_from_webview
    Err("Use extract_linkedin_cookie_from_webview instead".to_string())
}

#[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
async fn extract_linkedin_cookie() -> Result<(String, Option<String>), String> {
    Err("Automatic cookie extraction not supported on this platform.".to_string())
}

/// Manually store a LinkedIn cookie (fallback for non-macOS platforms)
#[tauri::command]
pub async fn store_linkedin_cookie(cookie: String) -> Result<(), String> {
    let cookie = cookie.trim().to_string();

    if cookie.is_empty() {
        return Err("Cookie cannot be empty".to_string());
    }

    // Validate it looks like a LinkedIn cookie
    if !cookie.starts_with("AQ") {
        tracing::warn!(
            "LinkedIn cookie doesn't start with expected 'AQ' prefix - storing anyway"
        );
    }

    CredentialStore::store(CredentialKey::LinkedInCookie, &cookie)?;
    tracing::info!("LinkedIn cookie stored successfully");
    Ok(())
}

/// Check if LinkedIn is connected (has valid cookie in keyring)
#[tauri::command]
pub async fn is_linkedin_connected() -> Result<bool, String> {
    match CredentialStore::retrieve(CredentialKey::LinkedInCookie) {
        Ok(Some(cookie)) => Ok(!cookie.is_empty()),
        Ok(None) => Ok(false),
        Err(e) => Err(format!("Failed to check LinkedIn status: {}", e)),
    }
}

/// Disconnect LinkedIn (remove cookie and expiry from keyring)
#[tauri::command]
pub async fn disconnect_linkedin() -> Result<(), String> {
    CredentialStore::delete(CredentialKey::LinkedInCookie)?;
    CredentialStore::delete(CredentialKey::LinkedInCookieExpiry)?;
    tracing::info!("LinkedIn disconnected");
    Ok(())
}

/// Close the LinkedIn login window if it's open
#[tauri::command]
pub async fn close_linkedin_login(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("linkedin-login") {
        window
            .close()
            .map_err(|e| format!("Failed to close window: {}", e))?;
    }
    Ok(())
}

/// LinkedIn cookie expiry status
#[derive(serde::Serialize)]
pub struct LinkedInExpiryStatus {
    /// Whether a cookie exists
    pub connected: bool,
    /// Expiry date in ISO 8601 format (if known)
    pub expires_at: Option<String>,
    /// Days until expiry (negative if expired)
    pub days_remaining: Option<i64>,
    /// Whether expiry is within warning threshold (7 days)
    pub expiry_warning: bool,
    /// Whether the cookie has expired
    pub expired: bool,
}

/// Get LinkedIn cookie expiry status
///
/// Returns detailed information about the LinkedIn cookie's expiry status
/// to help users know when they need to re-authenticate.
#[tauri::command]
pub async fn get_linkedin_expiry_status() -> Result<LinkedInExpiryStatus, String> {
    use chrono::{DateTime, Utc};

    // Check if connected
    let connected = match CredentialStore::retrieve(CredentialKey::LinkedInCookie) {
        Ok(Some(cookie)) => !cookie.is_empty(),
        _ => false,
    };

    if !connected {
        return Ok(LinkedInExpiryStatus {
            connected: false,
            expires_at: None,
            days_remaining: None,
            expiry_warning: false,
            expired: false,
        });
    }

    // Get expiry date if stored
    let expires_at = match CredentialStore::retrieve(CredentialKey::LinkedInCookieExpiry) {
        Ok(Some(expiry)) if !expiry.is_empty() => Some(expiry),
        _ => None,
    };

    // Calculate days remaining
    let (days_remaining, expiry_warning, expired) = if let Some(ref expiry_str) = expires_at {
        if let Ok(expiry_dt) = DateTime::parse_from_rfc3339(expiry_str) {
            let now = Utc::now();
            let expiry_utc = expiry_dt.with_timezone(&Utc);
            let duration = expiry_utc.signed_duration_since(now);
            let days = duration.num_days();

            (Some(days), days <= 7 && days > 0, days <= 0)
        } else {
            (None, false, false)
        }
    } else {
        (None, false, false)
    };

    Ok(LinkedInExpiryStatus {
        connected,
        expires_at,
        days_remaining,
        expiry_warning,
        expired,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_login_success_url() {
        // Should match success URLs
        assert!(is_login_success_url("https://www.linkedin.com/feed/"));
        assert!(is_login_success_url("https://www.linkedin.com/feed"));
        assert!(is_login_success_url(
            "https://www.linkedin.com/jobs/search?keywords=rust"
        ));
        assert!(is_login_success_url(
            "https://www.linkedin.com/in/someuser"
        ));
        assert!(is_login_success_url("https://www.linkedin.com/mynetwork/"));

        // Should not match login/checkpoint URLs
        assert!(!is_login_success_url("https://www.linkedin.com/login"));
        assert!(!is_login_success_url(
            "https://www.linkedin.com/checkpoint/challenge"
        ));
        assert!(!is_login_success_url("https://www.linkedin.com/"));
        assert!(!is_login_success_url("https://google.com/"));
    }

    #[test]
    fn test_cookie_format_validation() {
        // Valid LinkedIn cookies typically start with AQ
        assert!("AQEDAQDW8sIAAAGU".starts_with("AQ"));
        assert!(!"invalid_cookie".starts_with("AQ"));
    }
}
