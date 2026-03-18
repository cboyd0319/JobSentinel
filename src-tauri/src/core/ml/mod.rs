//! Embedded Machine Learning Module
//!
//! Optional module for on-device ML inference using Candle framework.
//! Provides semantic skill matching via sentence embeddings.
//!
//! ## Features
//! - Quantized all-MiniLM-L6-v2 model (~20MB) for sentence embeddings
//! - Model download on first use (via HuggingFace Hub)
//! - Pure Rust inference with Metal acceleration (macOS)
//! - Graceful fallback to keyword matching if disabled
//!
//! ## Usage
//! Enable with `embedded-ml` feature flag in Cargo.toml

#![cfg(feature = "embedded-ml")]

mod embeddings;
mod matcher;
mod model;

#[cfg(test)]
mod tests;

pub use embeddings::EmbeddingGenerator;
pub use matcher::{SemanticMatchResult, SemanticMatcher};
pub use model::{ModelManager, ModelStatus};

use anyhow::Result;
use thiserror::Error;

/// ML-related errors
#[derive(Error, Debug)]
pub enum MlError {
    #[error("model not downloaded: {0}")]
    ModelNotDownloaded(String),

    #[error("model loading failed: {0}")]
    ModelLoadFailed(String),

    #[error("inference failed: {0}")]
    InferenceFailed(String),

    #[error("tokenization failed: {0}")]
    TokenizationFailed(String),

    #[error("download failed: {0}")]
    DownloadFailed(String),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}

/// Check if ML is available and model is ready
pub async fn is_ml_available(app_data_dir: &std::path::Path) -> Result<bool> {
    let manager = ModelManager::new(app_data_dir.to_path_buf());
    Ok(manager.is_model_downloaded())
}
