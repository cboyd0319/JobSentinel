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
pub use jobsentinel_domain::{ExternalAiConfig, ExternalAiProvider, ExternalAiRedactionConfig};
pub use types::sources::{
    BuiltInConfig, DiceConfig, GlassdoorConfig, HnHiringConfig, LinkedInConfig, RemoteOkConfig,
    SimplyHiredConfig, UsaJobsConfig, WeWorkRemotelyConfig, YcStartupConfig,
};
pub use types::{
    AlertConfig, AutoRefreshConfig, Config, DesktopConfig, DiscordConfig, EmailConfig,
    JobsWithGptApproval, JobsWithGptPayload, LocationPreferences, RestrictedSourceAcknowledgements,
    SlackConfig, TeamsConfig, TelegramConfig,
};
pub use validation_error::{ValidationError, ValidationErrors};

// Tests
#[cfg(test)]
#[path = "tests.rs"]
mod tests;

#[cfg(test)]
#[path = "validation_tests.rs"]
mod validation_tests;
