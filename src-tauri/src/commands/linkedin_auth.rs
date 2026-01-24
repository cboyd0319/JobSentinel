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

                // Extract cookie using platform-native method
                let cookie_result = extract_linkedin_cookie().await;

                match &cookie_result {
                    Ok(cookie) => {
                        tracing::info!("Successfully extracted LinkedIn cookie");
                        // Store in keyring
                        if let Err(e) = CredentialStore::store(CredentialKey::LinkedInCookie, cookie)
                        {
                            tracing::error!("Failed to store cookie: {}", e);
                        }
                    }
                    Err(e) => {
                        tracing::error!("Failed to extract cookie: {}", e);
                    }
                }

                // Send result back
                if let Some(tx) = result_tx.lock().unwrap().take() {
                    let _ = tx.send(cookie_result);
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
#[cfg(target_os = "macos")]
#[allow(unsafe_code)] // Required for Objective-C interop
async fn extract_linkedin_cookie() -> Result<String, String> {
    use block2::StackBlock;
    use objc2_foundation::{NSArray, NSHTTPCookie};
    use objc2_web_kit::WKWebsiteDataStore;
    use std::ptr::NonNull;
    use std::sync::mpsc;

    tracing::info!("Extracting LinkedIn cookie via WKHTTPCookieStore (macOS)");

    // Create a channel to receive cookies from the callback
    let (tx, rx) = mpsc::channel::<Option<String>>();

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
                    let mut li_at_value: Option<String> = None;

                    let cookies_ref = cookies.as_ref();
                    let count = cookies_ref.count();
                    tracing::debug!("Found {} cookies", count);

                    for i in 0..count {
                        let cookie = cookies_ref.objectAtIndex(i);
                        let name = cookie.name();
                        let name_str = name.to_string();

                        if name_str == "li_at" {
                            let value = cookie.value();
                            li_at_value = Some(value.to_string());
                            tracing::info!("Found li_at cookie!");
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
        Ok(Some(cookie)) => Ok(cookie),
        Ok(None) => Err(
            "LinkedIn cookie (li_at) not found. Please make sure you're fully logged in."
                .to_string(),
        ),
        Err(_) => Err("Timeout waiting for cookie extraction".to_string()),
    }
}

#[cfg(target_os = "windows")]
async fn extract_linkedin_cookie() -> Result<String, String> {
    // Windows WebView2 cookie extraction would go here
    // For now, return an error indicating manual entry is needed
    Err("Automatic cookie extraction not yet supported on Windows. Please enter your cookie manually.".to_string())
}

#[cfg(target_os = "linux")]
async fn extract_linkedin_cookie() -> Result<String, String> {
    // Linux WebKitGTK cookie extraction would go here
    Err("Automatic cookie extraction not yet supported on Linux. Please enter your cookie manually.".to_string())
}

#[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
async fn extract_linkedin_cookie() -> Result<String, String> {
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

/// Disconnect LinkedIn (remove cookie from keyring)
#[tauri::command]
pub async fn disconnect_linkedin() -> Result<(), String> {
    CredentialStore::delete(CredentialKey::LinkedInCookie)?;
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
