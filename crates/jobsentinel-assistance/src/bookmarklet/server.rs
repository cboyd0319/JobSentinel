//! HTTP server implementation for bookmarklet
//!
//! Runs a simple HTTP server on localhost to receive job data from browser bookmarklets.

use super::pending::{
    new_pending_bookmarklet_imports, pending_bookmarklet_import_previews,
    PendingBookmarkletImportPreview, PendingBookmarkletImports,
};
use super::{constant_time_ascii_eq, BookmarkletRepository};
use chrono::{DateTime, TimeDelta, Utc};
#[cfg(test)]
use jobsentinel_domain::calculate_job_hash;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::{Arc, RwLock};
use std::time::Duration;
use thiserror::Error;
use tokio::sync::{OwnedSemaphorePermit, Semaphore};
use tokio::task::JoinHandle;
use uuid::Uuid;

mod imports;
mod listener;

use imports::handle_import_request;
pub use imports::{confirm_pending_bookmarklet_imports, discard_pending_bookmarklet_imports};
use listener::bind_bookmarklet_listener;

const BOOKMARKLET_TOKEN_HEADER: &str = "x-jobsentinel-token";
const CONTENT_LENGTH_HEADER: &str = "content-length";
const HEADER_BODY_SEPARATOR: &[u8] = b"\r\n\r\n";
const MAX_BOOKMARKLET_REQUEST_BYTES: usize = 24 * 1024;
const MAX_BOOKMARKLET_CONNECTIONS: usize = 16;
const MAX_BOOKMARKLET_JOBS_PER_REQUEST: usize = 12;
#[cfg(not(test))]
const BOOKMARKLET_READ_TIMEOUT: Duration = Duration::from_secs(3);
#[cfg(test)]
const BOOKMARKLET_READ_TIMEOUT: Duration = Duration::from_millis(50);
const BOOKMARKLET_TOKEN_LIFETIME_MINUTES: i64 = 60;
const MAX_BOOKMARKLET_TITLE_LENGTH: usize = 500;
const MAX_BOOKMARKLET_COMPANY_LENGTH: usize = 200;
const MAX_BOOKMARKLET_URL_LENGTH: usize = 2000;
const MAX_BOOKMARKLET_LOCATION_LENGTH: usize = 200;
const MAX_BOOKMARKLET_DESCRIPTION_LENGTH: usize = 50000;
const INVALID_BOOKMARKLET_PAYLOAD_MESSAGE: &str =
    "Invalid bookmarklet payload. Reload the page and try again.";
const BOOKMARKLET_DATABASE_FAILURE_MESSAGE: &str =
    "JobSentinel could not save this job. Restart the app and try again.";
const BOOKMARKLET_UNAUTHORIZED_MESSAGE: &str =
    "Browser import code expired. Copy the browser button again and retry.";

/// Bookmarklet server configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BookmarkletConfig {
    pub port: u16,
    pub auth_token: String,
    pub auth_token_expires_at: DateTime<Utc>,
}

impl Default for BookmarkletConfig {
    fn default() -> Self {
        Self {
            port: 4321,
            auth_token: Uuid::new_v4().to_string(),
            auth_token_expires_at: bookmarklet_auth_expiry(),
        }
    }
}

impl BookmarkletConfig {
    pub fn refresh_auth_token(&mut self) {
        self.auth_token = Uuid::new_v4().to_string();
        self.auth_token_expires_at = bookmarklet_auth_expiry();
    }

    #[must_use]
    pub fn auth_token_is_current(&self, now: DateTime<Utc>) -> bool {
        !self.auth_token.is_empty() && now <= self.auth_token_expires_at
    }
}

fn bookmarklet_auth_expiry() -> DateTime<Utc> {
    Utc::now() + TimeDelta::minutes(BOOKMARKLET_TOKEN_LIFETIME_MINUTES)
}

#[derive(Debug, Clone)]
struct BookmarkletAuthState {
    auth_token: String,
    auth_token_expires_at: DateTime<Utc>,
}

impl From<&BookmarkletConfig> for BookmarkletAuthState {
    fn from(config: &BookmarkletConfig) -> Self {
        Self {
            auth_token: config.auth_token.clone(),
            auth_token_expires_at: config.auth_token_expires_at,
        }
    }
}

#[cfg(test)]
fn current_bookmarklet_auth(
    auth_state: &Arc<RwLock<BookmarkletAuthState>>,
) -> BookmarkletAuthState {
    match auth_state.read() {
        Ok(state) => state.clone(),
        Err(poisoned) => poisoned.into_inner().clone(),
    }
}

fn sync_bookmarklet_auth(
    auth_state: &Arc<RwLock<BookmarkletAuthState>>,
    config: &BookmarkletConfig,
) {
    let next = BookmarkletAuthState::from(config);
    match auth_state.write() {
        Ok(mut state) => *state = next,
        Err(poisoned) => *poisoned.into_inner() = next,
    }
}

/// Bookmarklet server errors
#[derive(Debug, Error)]
pub enum BookmarkletError {
    #[error("Server is already running")]
    AlreadyRunning,

    #[error("Server is not running")]
    NotRunning,

    #[error("Failed to bind to port {port}: {source}")]
    BindError { port: u16, source: std::io::Error },

    #[error("Database error: {0}")]
    DatabaseError(String),

    #[error("Invalid job data: {0}")]
    InvalidData(String),
}

/// HTTP server for receiving bookmarklet data
pub struct BookmarkletServer {
    config: BookmarkletConfig,
    auth_state: Arc<RwLock<BookmarkletAuthState>>,
    pending_imports: PendingBookmarkletImports,
    server_handle: Option<JoinHandle<()>>,
    shutdown_tx: Option<tokio::sync::oneshot::Sender<()>>,
}

impl BookmarkletServer {
    /// Create a new bookmarklet server
    pub fn new(config: BookmarkletConfig) -> Self {
        let auth_state = Arc::new(RwLock::new(BookmarkletAuthState::from(&config)));
        Self {
            config,
            auth_state,
            pending_imports: new_pending_bookmarklet_imports(),
            server_handle: None,
            shutdown_tx: None,
        }
    }

    /// Get current configuration
    pub fn config(&self) -> &BookmarkletConfig {
        &self.config
    }

    /// Set new configuration (only when server is stopped)
    pub fn set_config(&mut self, config: BookmarkletConfig) {
        self.config = config;
        sync_bookmarklet_auth(&self.auth_state, &self.config);
    }

    /// Update only the local browser import safety code.
    pub fn update_auth_token(&mut self, auth_token: String, auth_token_expires_at: DateTime<Utc>) {
        self.config.auth_token = auth_token;
        self.config.auth_token_expires_at = auth_token_expires_at;
        sync_bookmarklet_auth(&self.auth_state, &self.config);
    }

    /// Clone the in-memory review queue for command handlers.
    pub fn pending_import_store(&self) -> PendingBookmarkletImports {
        self.pending_imports.clone()
    }

    /// List imports waiting for explicit user confirmation.
    pub fn pending_imports(&self) -> Vec<PendingBookmarkletImportPreview> {
        pending_bookmarklet_import_previews(&self.pending_imports)
    }

    /// Check if server is running
    pub fn is_running(&self) -> bool {
        self.server_handle.is_some()
    }

    /// Start the HTTP server
    pub async fn start(
        &mut self,
        config: BookmarkletConfig,
        repository: Arc<dyn BookmarkletRepository>,
    ) -> Result<u16, BookmarkletError> {
        if self.is_running() {
            return Err(BookmarkletError::AlreadyRunning);
        }

        self.config = config;
        self.config.refresh_auth_token();
        let requested_port = self.config.port;
        let (listener, port) = bind_bookmarklet_listener(requested_port).await?;
        self.config.port = port;
        sync_bookmarklet_auth(&self.auth_state, &self.config);
        let auth_state = self.auth_state.clone();
        let pending_imports = self.pending_imports.clone();

        // Create shutdown channel
        let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel();

        // Spawn server task
        let handle = tokio::spawn(async move {
            if let Err(e) = run_server(
                listener,
                auth_state,
                pending_imports,
                repository,
                shutdown_rx,
            )
            .await
            {
                tracing::error!(error = %bookmarklet_error_label(&e), "Bookmarklet server error");
            }
        });

        self.server_handle = Some(handle);
        self.shutdown_tx = Some(shutdown_tx);

        tracing::info!(port = port, "Bookmarklet server started");
        Ok(port)
    }

    /// Stop the HTTP server
    pub async fn stop(&mut self) -> Result<(), BookmarkletError> {
        if !self.is_running() {
            return Err(BookmarkletError::NotRunning);
        }

        // Send shutdown signal
        if let Some(tx) = self.shutdown_tx.take() {
            let _ = tx.send(());
        }

        // Wait for server to stop
        if let Some(handle) = self.server_handle.take() {
            let _ = handle.await;
        }

        tracing::info!("Bookmarklet server stopped");
        Ok(())
    }
}

impl Default for BookmarkletServer {
    fn default() -> Self {
        Self::new(BookmarkletConfig::default())
    }
}

async fn run_server(
    listener: tokio::net::TcpListener,
    auth_state: Arc<RwLock<BookmarkletAuthState>>,
    pending_imports: PendingBookmarkletImports,
    repository: Arc<dyn BookmarkletRepository>,
    mut shutdown_rx: tokio::sync::oneshot::Receiver<()>,
) -> Result<(), BookmarkletError> {
    if let Ok(address) = listener.local_addr() {
        tracing::info!(address = %address, "Listening on bookmarklet import port");
    }

    let connection_limit = Arc::new(Semaphore::new(MAX_BOOKMARKLET_CONNECTIONS));

    // Accept connections until shutdown
    loop {
        tokio::select! {
            result = listener.accept() => {
                match result {
                    Ok((stream, _)) => {
                        let Some(connection_permit) =
                            try_bookmarklet_connection_permit(&connection_limit)
                        else {
                            tracing::warn!("Bookmarklet connection limit reached");
                            continue;
                        };
                        let repository = repository.clone();
                        let auth = auth_state.clone();
                        let pending = pending_imports.clone();
                        tokio::spawn(async move {
                            let _connection_permit = connection_permit;
                            if let Err(_e) =
                                handle_connection(stream, auth, pending, repository).await
                            {
                                tracing::error!("Bookmarklet connection failed");
                            }
                        });
                    }
                    Err(e) => {
                        tracing::error!(
                            error_kind = ?e.kind(),
                            "Bookmarklet connection accept failed"
                        );
                    }
                }
            }
            _ = &mut shutdown_rx => {
                tracing::info!("Shutdown signal received");
                break;
            }
        }
    }

    Ok(())
}

fn try_bookmarklet_connection_permit(
    connection_limit: &Arc<Semaphore>,
) -> Option<OwnedSemaphorePermit> {
    Arc::clone(connection_limit).try_acquire_owned().ok()
}

/// Handle a single HTTP connection
async fn handle_connection(
    stream: tokio::net::TcpStream,
    auth_state: Arc<RwLock<BookmarkletAuthState>>,
    pending_imports: PendingBookmarkletImports,
    repository: Arc<dyn BookmarkletRepository>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    use tokio::io::AsyncWriteExt;

    let request = read_bookmarklet_request(&stream).await?;
    let local_addr = stream.local_addr()?;

    // Parse request
    let (response, content_type) = if !has_valid_bookmarklet_host(&request, local_addr.port()) {
        (
            json_error_response("Invalid browser import host"),
            "application/json".to_string(),
        )
    } else if !has_allowed_bookmarklet_origin(&request) {
        (
            json_error_response("Invalid browser import origin"),
            "application/json".to_string(),
        )
    } else if is_bookmarklet_import_request(&request) {
        handle_import_request(&request, &auth_state, pending_imports, repository).await
    } else if request.starts_with("OPTIONS") {
        ("OK".to_string(), "text/plain".to_string())
    } else {
        (
            json_error_response("Not found"),
            "application/json".to_string(),
        )
    };

    // Send response with CORS headers
    let status = if response.starts_with("{\"error\"") {
        "400 Bad Request"
    } else {
        "200 OK"
    };

    let response_data = http_response_data(status, &content_type, &response);

    let mut writable_stream = stream;
    writable_stream.write_all(response_data.as_bytes()).await?;
    writable_stream.flush().await?;

    Ok(())
}

async fn read_bookmarklet_request(
    stream: &tokio::net::TcpStream,
) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    let bytes = tokio::time::timeout(
        BOOKMARKLET_READ_TIMEOUT,
        read_bookmarklet_request_bytes(stream),
    )
    .await
    .map_err(|_| {
        std::io::Error::new(
            std::io::ErrorKind::TimedOut,
            "Bookmarklet request timed out",
        )
    })??;

    Ok(String::from_utf8_lossy(&bytes).into_owned())
}

async fn read_bookmarklet_request_bytes(
    stream: &tokio::net::TcpStream,
) -> std::io::Result<Vec<u8>> {
    let mut buffer = vec![0u8; MAX_BOOKMARKLET_REQUEST_BYTES];
    let mut total_read = 0;

    loop {
        match stream.try_read(&mut buffer[total_read..]) {
            Ok(0) => break,
            Ok(n) => {
                total_read += n;
                if total_read >= buffer.len() {
                    break;
                }
                if request_buffer_should_stop_reading(&buffer[..total_read], buffer.len()) {
                    break;
                }
            }
            Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                tokio::time::sleep(Duration::from_millis(10)).await;
            }
            Err(e) => return Err(e),
        }
    }

    buffer.truncate(total_read);
    Ok(buffer)
}

mod protocol;

use protocol::*;

#[cfg(test)]
mod tests;
