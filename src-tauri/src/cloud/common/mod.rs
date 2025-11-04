//! Common Cloud Utilities
//!
//! Shared code used across all cloud providers (GCP, AWS).
//! This includes configuration parsing, environment detection, and common patterns.

use std::path::PathBuf;

/// Detect if running in a cloud environment
pub fn is_cloud_environment() -> bool {
    // Check common cloud environment variables
    std::env::var("KUBERNETES_SERVICE_HOST").is_ok()
        || std::env::var("AWS_EXECUTION_ENV").is_ok()
        || std::env::var("GCP_PROJECT").is_ok()
        || std::env::var("GOOGLE_CLOUD_PROJECT").is_ok()
}

/// Get cloud-specific data directory
///
/// In cloud environments, this typically points to:
/// - /tmp (ephemeral storage)
/// - Mounted volumes (persistent storage)
pub fn get_cloud_data_dir() -> PathBuf {
    std::env::var("DATA_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("/tmp/jobsentinel"))
}

/// Get cloud-specific configuration directory
pub fn get_cloud_config_dir() -> PathBuf {
    std::env::var("CONFIG_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("/etc/jobsentinel"))
}

/// Cloud deployment mode
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DeploymentMode {
    /// Serverless function (Lambda, Cloud Functions)
    Serverless,

    /// Container (Cloud Run, ECS)
    Container,

    /// Virtual machine (Compute Engine, EC2)
    VM,
}

/// Detect deployment mode based on environment
pub fn detect_deployment_mode() -> Option<DeploymentMode> {
    if std::env::var("AWS_LAMBDA_FUNCTION_NAME").is_ok()
        || std::env::var("FUNCTION_NAME").is_ok()
    {
        Some(DeploymentMode::Serverless)
    } else if std::env::var("KUBERNETES_SERVICE_HOST").is_ok() || is_cloud_run() {
        Some(DeploymentMode::Container)
    } else if is_cloud_environment() {
        Some(DeploymentMode::VM)
    } else {
        None
    }
}

/// Check if running on Google Cloud Run
fn is_cloud_run() -> bool {
    std::env::var("K_SERVICE").is_ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_deployment_mode_local() {
        // In local development, should return None
        let mode = detect_deployment_mode();
        assert!(mode.is_none() || matches!(mode, Some(DeploymentMode::Container)));
    }
}
