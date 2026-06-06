//! Configuration Management
//!
//! Handles loading, validating, and saving user preferences.

// Module declarations
mod defaults;
mod io;
mod types;
mod validation;
mod validation_error;

// Re-export public types
pub(crate) use io::write_file_atomic_private;
pub use types::{
    AlertConfig, AutoRefreshConfig, Config, DesktopConfig, DiscordConfig, EmailConfig,
    JobsWithGptApproval, JobsWithGptPayload, LinkedInConfig, LocationPreferences, SlackConfig,
    TeamsConfig, TelegramConfig,
};
pub use validation_error::{ValidationError, ValidationErrors};

// Tests
#[cfg(test)]
#[path = "tests.rs"]
mod tests;

#[cfg(test)]
#[path = "validation_tests.rs"]
mod validation_tests;
