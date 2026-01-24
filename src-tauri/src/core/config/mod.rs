//! Configuration Management
//!
//! Handles loading, validating, and saving user preferences.

// Module declarations
mod defaults;
mod io;
mod types;
mod validation;

// Re-export public types
pub use types::{
    AlertConfig, AutoRefreshConfig, Config, DesktopConfig, DiscordConfig, EmailConfig,
    LinkedInConfig, LocationPreferences, SlackConfig, TeamsConfig, TelegramConfig,
};

// Tests
#[cfg(test)]
#[path = "tests.rs"]
mod tests;
