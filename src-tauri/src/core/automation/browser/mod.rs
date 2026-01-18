//! Browser Automation Module
//!
//! Provides headless Chrome browser control for form filling.
//! Uses chromiumoxide for CDP (Chrome DevTools Protocol) communication.
//!
//! **Features:**
//! - Visible browser mode (user watches form being filled)
//! - Form field filling
//! - File upload support (resumes)
//! - Screenshot capture
//!
//! **Safety:**
//! - No auto-submit functionality
//! - User must manually click submit
//! - CAPTCHA detection triggers pause

mod manager;
mod page;

pub use manager::BrowserManager;
pub use page::{AutomationPage, FillResult};
