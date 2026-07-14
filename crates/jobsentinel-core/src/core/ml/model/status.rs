pub(super) const MODEL_CACHE_METADATA_FILE: &str = ".jobsentinel-model.json";

/// Model download and loading status.
#[derive(Debug, Clone, serde::Serialize)]
pub struct ModelStatus {
    pub is_downloaded: bool,
    pub model_size_bytes: Option<u64>,
    pub model_id: String,
    pub revision: String,
    pub backend: String,
    pub manifest_hash: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub(crate) struct ModelCacheMetadata {
    pub manifest_version: u32,
    pub manifest_hash: String,
    pub model_id: String,
    pub kind: String,
    pub repo: String,
    pub revision: String,
    pub source_url: String,
    pub backend: String,
    pub license: String,
    pub downloaded_at: String,
    pub verified_at: String,
}
