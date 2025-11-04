//! Cloud Deployment Modules (v2.0)
//!
//! This module contains code for deploying JobSentinel to cloud environments.
//! All cloud functionality is optional and not compiled into the desktop application.
//!
//! ## Supported Cloud Providers
//!
//! - **GCP** (Google Cloud Platform): Cloud Run, Cloud Scheduler, Cloud SQL
//! - **AWS** (Amazon Web Services): Lambda, EventBridge, RDS
//!
//! ## Architecture
//!
//! Cloud deployments use the same core business logic as the desktop app,
//! but replace the Tauri UI layer with:
//! - HTTP API endpoints (for triggering scrapes)
//! - Scheduled jobs (cron-based execution)
//! - Cloud storage (for configuration and database)
//!
//! ## Feature Flags
//!
//! Cloud modules are only compiled when explicitly enabled:
//! ```toml
//! [features]
//! gcp = ["google-cloud-sdk", "tokio"]
//! aws = ["aws-sdk-lambda", "tokio"]
//! ```

pub mod common;

#[cfg(feature = "gcp")]
pub mod gcp;

#[cfg(feature = "aws")]
pub mod aws;

/// Cloud provider type
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CloudProvider {
    GCP,
    AWS,
}

/// Cloud deployment configuration
#[derive(Debug, Clone)]
pub struct CloudConfig {
    pub provider: CloudProvider,
    pub project_id: String,
    pub region: String,
}

/// Initialize cloud-specific features
///
/// This should be called when running in a cloud environment.
#[cfg(any(feature = "gcp", feature = "aws"))]
pub async fn initialize(config: CloudConfig) -> Result<(), Box<dyn std::error::Error>> {
    match config.provider {
        #[cfg(feature = "gcp")]
        CloudProvider::GCP => gcp::initialize(config).await,

        #[cfg(feature = "aws")]
        CloudProvider::AWS => aws::initialize(config).await,

        #[allow(unreachable_patterns)]
        _ => Err("Cloud provider not enabled in build".into()),
    }
}
