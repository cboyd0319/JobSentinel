//! Browser Manager
//!
//! Manages browser lifecycle and page creation.

use anyhow::{Context, Result};
use chromiumoxide::browser::{Browser, BrowserConfig};
use futures_util::StreamExt;
use std::sync::Arc;
use tokio::sync::Mutex;

use super::page::AutomationPage;

/// Browser manager for automation
pub struct BrowserManager {
    browser: Arc<Mutex<Option<Browser>>>,
}

impl BrowserManager {
    /// Create a new browser manager (browser not yet launched)
    pub fn new() -> Self {
        Self {
            browser: Arc::new(Mutex::new(None)),
        }
    }

    /// Launch the browser
    ///
    /// Launches Chrome in visible mode so user can watch form filling.
    #[tracing::instrument(skip(self), level = "info")]
    pub async fn launch(&self) -> Result<()> {
        use std::time::Instant;

        let start = Instant::now();
        tracing::info!("Launching browser in visible mode");
        let mut browser_guard = self.browser.lock().await;

        if browser_guard.is_some() {
            tracing::debug!("Browser already launched, skipping");
            return Ok(()); // Already launched
        }

        // Configure browser for visible mode (not headless)
        let config = BrowserConfig::builder()
            .window_size(1280, 900)
            // Visible mode - user can see form being filled
            .with_head()
            // Disable sandbox for compatibility
            .arg("--no-sandbox")
            .arg("--disable-setuid-sandbox")
            // Disable automation detection where possible
            .arg("--disable-blink-features=AutomationControlled")
            .build()
            .map_err(|e| anyhow::anyhow!("Failed to build browser config: {}", e))?;

        // Launch browser
        let (browser, mut handler) = Browser::launch(config)
            .await
            .context("Failed to launch browser. Is Chrome/Chromium installed?")?;

        // Spawn handler task to process browser events
        tokio::spawn(async move {
            while let Some(event) = handler.next().await {
                if let Err(e) = event {
                    tracing::debug!(error = %e, "Browser handler event error");
                }
            }
            tracing::debug!("Browser handler task terminated");
        });

        let duration = start.elapsed();
        tracing::info!(
            elapsed_ms = duration.as_millis(),
            "Browser launched successfully (visible mode, 1280x900)"
        );
        *browser_guard = Some(browser);

        Ok(())
    }

    /// Create a new page for automation
    ///
    /// Returns an AutomationPage that provides form filling methods.
    #[tracing::instrument(skip(self), fields(url = %url), level = "info")]
    pub async fn new_page(&self, url: &str) -> Result<AutomationPage> {
        use std::time::Instant;

        let start = Instant::now();
        tracing::debug!("Creating new browser page");
        let browser_guard = self.browser.lock().await;
        let browser = browser_guard
            .as_ref()
            .context("Browser not launched. Call launch() first.")?;

        let page = browser
            .new_page(url)
            .await
            .context("Failed to create new page")?;

        tracing::debug!("Waiting for page navigation to complete");
        // Wait for page to load
        page.wait_for_navigation()
            .await
            .context("Failed to wait for navigation")?;

        let duration = start.elapsed();
        tracing::info!(
            elapsed_ms = duration.as_millis(),
            "Browser page created and loaded"
        );

        Ok(AutomationPage::new(page))
    }

    /// Close the browser
    pub async fn close(&self) -> Result<()> {
        let mut browser_guard = self.browser.lock().await;

        if let Some(browser) = browser_guard.take() {
            // Close all pages first (graceful shutdown)
            if let Ok(pages) = browser.pages().await {
                for page in pages {
                    let _ = page.close().await;
                }
            }
            tracing::info!("Browser closed");
        }

        Ok(())
    }

    /// Check if browser is running
    pub async fn is_running(&self) -> bool {
        self.browser.lock().await.is_some()
    }
}

impl Default for BrowserManager {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_browser_manager_new() {
        let manager = BrowserManager::new();
        // Just verify it can be created
        assert!(true, "BrowserManager created successfully");
        drop(manager);
    }

    #[tokio::test]
    #[ignore = "Requires Chrome installed - run manually"]
    async fn test_browser_launch() {
        let manager = BrowserManager::new();
        assert!(!manager.is_running().await);

        manager.launch().await.expect("Failed to launch browser");
        assert!(manager.is_running().await);

        manager.close().await.expect("Failed to close browser");
        assert!(!manager.is_running().await);
    }
}
