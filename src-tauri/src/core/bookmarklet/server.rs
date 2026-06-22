//! HTTP server implementation for bookmarklet
//!
//! Runs a simple HTTP server on localhost to receive job data from browser bookmarklets.

use super::pending::{
    new_pending_bookmarklet_imports, pending_bookmarklet_import_previews,
    PendingBookmarkletImportPreview, PendingBookmarkletImports,
};
#[cfg(test)]
use crate::core::calculate_job_hash;
use crate::core::db::Database;
use chrono::{DateTime, TimeDelta, Utc};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::net::SocketAddr;
use std::sync::{Arc, RwLock};
use std::time::Duration;
use thiserror::Error;
use tokio::sync::{OwnedSemaphorePermit, Semaphore};
use tokio::task::JoinHandle;
use uuid::Uuid;

mod imports;

use imports::handle_import_request;
pub use imports::{confirm_pending_bookmarklet_imports, discard_pending_bookmarklet_imports};

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
        database: Arc<Database>,
    ) -> Result<(), BookmarkletError> {
        if self.is_running() {
            return Err(BookmarkletError::AlreadyRunning);
        }

        self.config = config;
        self.config.refresh_auth_token();
        let port = self.config.port;
        sync_bookmarklet_auth(&self.auth_state, &self.config);
        let auth_state = self.auth_state.clone();
        let pending_imports = self.pending_imports.clone();
        let listener = bookmarklet_listener(port).await?;

        // Create shutdown channel
        let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel();

        // Spawn server task
        let handle = tokio::spawn(async move {
            if let Err(e) =
                run_server(listener, auth_state, pending_imports, database, shutdown_rx).await
            {
                tracing::error!(error = %bookmarklet_error_label(&e), "Bookmarklet server error");
            }
        });

        self.server_handle = Some(handle);
        self.shutdown_tx = Some(shutdown_tx);

        tracing::info!(port = port, "Bookmarklet server started");
        Ok(())
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

/// Bind the local listener before the UI reports the helper as running.
async fn bookmarklet_listener(port: u16) -> Result<tokio::net::TcpListener, BookmarkletError> {
    use std::net::{IpAddr, Ipv4Addr};

    let addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::LOCALHOST), port);
    tokio::net::TcpListener::bind(addr)
        .await
        .map_err(|e| BookmarkletError::BindError { port, source: e })
}

async fn run_server(
    listener: tokio::net::TcpListener,
    auth_state: Arc<RwLock<BookmarkletAuthState>>,
    pending_imports: PendingBookmarkletImports,
    database: Arc<Database>,
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
                        let db = database.clone();
                        let auth = auth_state.clone();
                        let pending = pending_imports.clone();
                        tokio::spawn(async move {
                            let _connection_permit = connection_permit;
                            if let Err(_e) =
                                handle_connection(stream, auth, pending, db).await
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
    database: Arc<Database>,
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
        handle_import_request(&request, &auth_state, pending_imports, database).await
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

fn http_response_data(status: &str, content_type: &str, response: &str) -> String {
    format!(
        "HTTP/1.1 {}\r\nContent-Type: {}\r\nContent-Length: {}\r\nCache-Control: no-store\r\nPragma: no-cache\r\nX-Content-Type-Options: nosniff\r\nReferrer-Policy: no-referrer\r\nCross-Origin-Resource-Policy: same-origin\r\nConnection: close\r\n\r\n{}",
        status,
        content_type,
        response.len(),
        response
    )
}

fn constant_time_ascii_eq(left: &str, right: &str) -> bool {
    let left_bytes = left.as_bytes();
    let right_bytes = right.as_bytes();
    let max_len = left_bytes.len().max(right_bytes.len());
    let mut diff = left_bytes.len() ^ right_bytes.len();

    for index in 0..max_len {
        let left_byte = left_bytes.get(index).copied().unwrap_or(0);
        let right_byte = right_bytes.get(index).copied().unwrap_or(0);
        diff |= usize::from(left_byte ^ right_byte);
    }

    diff == 0
}

fn has_valid_bookmarklet_token(request: &str, auth_token: &str) -> bool {
    !auth_token.is_empty()
        && request_header_value(request, BOOKMARKLET_TOKEN_HEADER)
            .is_some_and(|value| constant_time_ascii_eq(value, auth_token))
}

fn body_has_valid_bookmarklet_token(body: &serde_json::Value, auth_token: &str) -> bool {
    !auth_token.is_empty()
        && body
            .get("token")
            .and_then(serde_json::Value::as_str)
            .is_some_and(|value| constant_time_ascii_eq(value, auth_token))
}

fn bookmarklet_body_or_header_has_token(
    request: &str,
    body: &serde_json::Value,
    auth_token: &str,
) -> bool {
    has_valid_bookmarklet_token(request, auth_token)
        || body_has_valid_bookmarklet_token(body, auth_token)
}

fn consume_valid_bookmarklet_token(
    auth_state: &Arc<RwLock<BookmarkletAuthState>>,
    request: &str,
    body: &serde_json::Value,
    now: DateTime<Utc>,
) -> bool {
    let mut state = match auth_state.write() {
        Ok(state) => state,
        Err(poisoned) => poisoned.into_inner(),
    };

    let valid = now <= state.auth_token_expires_at
        && bookmarklet_body_or_header_has_token(request, body, &state.auth_token);

    if valid {
        state.auth_token.clear();
        state.auth_token_expires_at = now - TimeDelta::seconds(1);
    }

    valid
}

fn bookmarklet_job_value(body: &serde_json::Value) -> serde_json::Value {
    if let Some(job) = body.get("job") {
        return job.clone();
    }

    let mut body = body.clone();
    if let serde_json::Value::Object(ref mut map) = body {
        map.remove("token");
    }

    body
}

fn bookmarklet_job_values(body: &serde_json::Value) -> Result<Vec<serde_json::Value>, String> {
    let Some(jobs) = body.get("jobs") else {
        return Ok(vec![bookmarklet_job_value(body)]);
    };

    let Some(jobs) = jobs.as_array() else {
        return Err(INVALID_BOOKMARKLET_PAYLOAD_MESSAGE.to_string());
    };

    if jobs.is_empty() || jobs.len() > MAX_BOOKMARKLET_JOBS_PER_REQUEST {
        return Err(INVALID_BOOKMARKLET_PAYLOAD_MESSAGE.to_string());
    }

    Ok(jobs.clone())
}

fn request_header_value<'a>(request: &'a str, header_name: &str) -> Option<&'a str> {
    for line in request.lines().skip(1) {
        let line = line.trim_end_matches('\r');
        if line.is_empty() {
            return None;
        }

        if let Some((name, value)) = line.split_once(':') {
            if name.trim().eq_ignore_ascii_case(header_name) {
                return Some(value.trim());
            }
        }
    }

    None
}

fn has_valid_bookmarklet_host(request: &str, port: u16) -> bool {
    request_header_value(request, "host").is_some_and(|value| {
        let normalized = value.trim().to_ascii_lowercase();
        normalized == format!("localhost:{port}")
            || normalized == format!("127.0.0.1:{port}")
            || normalized == format!("[::1]:{port}")
    })
}

fn has_allowed_bookmarklet_origin(request: &str) -> bool {
    request_header_value(request, "origin").is_none_or(is_http_or_https_url)
        && request_header_value(request, "referer").is_none_or(is_http_or_https_url)
}

fn is_http_or_https_url(value: &str) -> bool {
    http_or_https_origin(value).is_some()
}

fn http_or_https_origin(value: &str) -> Option<(String, String, u16)> {
    let Ok(url) = url::Url::parse(value.trim()) else {
        return None;
    };

    if !matches!(url.scheme(), "http" | "https") {
        return None;
    }

    Some((
        url.scheme().to_string(),
        url.host_str()?.trim_end_matches('.').to_ascii_lowercase(),
        url.port_or_known_default()?,
    ))
}

fn bookmarklet_job_url_values(body: &serde_json::Value) -> Vec<&str> {
    if let Some(jobs) = body.get("jobs").and_then(serde_json::Value::as_array) {
        return jobs
            .iter()
            .filter_map(|job| job.get("url").and_then(serde_json::Value::as_str))
            .collect();
    }

    body.get("job")
        .and_then(|job| job.get("url"))
        .or_else(|| body.get("url"))
        .and_then(serde_json::Value::as_str)
        .into_iter()
        .collect()
}

fn bookmarklet_payload_matches_request_origin(request: &str, body: &serde_json::Value) -> bool {
    bookmarklet_job_url_values(body).into_iter().all(|job_url| {
        let Some(job_origin) = http_or_https_origin(job_url) else {
            return true;
        };

        request_header_value(request, "origin").is_none_or(|origin| {
            http_or_https_origin(origin).is_some_and(|request_origin| request_origin == job_origin)
        }) && request_header_value(request, "referer").is_none_or(|referer| {
            http_or_https_origin(referer).is_some_and(|request_origin| request_origin == job_origin)
        })
    })
}

fn request_buffer_has_complete_body(buffer: &[u8]) -> bool {
    let Some((body_start, content_length)) = request_body_start_and_content_length(buffer) else {
        return false;
    };

    buffer.len() >= body_start + content_length
}

fn request_buffer_has_declared_oversized_body(buffer: &[u8], max_bytes: usize) -> bool {
    let Some((body_start, content_length)) = request_body_start_and_content_length(buffer) else {
        return false;
    };

    body_start
        .checked_add(content_length)
        .is_none_or(|declared_size| declared_size > max_bytes)
}

fn request_buffer_should_stop_reading(buffer: &[u8], max_bytes: usize) -> bool {
    request_buffer_has_complete_body(buffer)
        || request_buffer_has_declared_oversized_body(buffer, max_bytes)
}

fn request_body_start_and_content_length(buffer: &[u8]) -> Option<(usize, usize)> {
    let header_end = buffer
        .windows(HEADER_BODY_SEPARATOR.len())
        .position(|window| window == HEADER_BODY_SEPARATOR)?;

    let headers = String::from_utf8_lossy(&buffer[..header_end]);
    let body_start = header_end + HEADER_BODY_SEPARATOR.len();
    let content_length = request_header_value(&headers, CONTENT_LENGTH_HEADER)
        .and_then(|value| value.parse::<usize>().ok())
        .unwrap_or(0);

    Some((body_start, content_length))
}

fn is_bookmarklet_import_request(request: &str) -> bool {
    request.starts_with("POST /api/bookmarklet/import ")
        || request.starts_with("POST /api/bookmarklet/import?")
}

fn bookmarklet_error_label(error: &BookmarkletError) -> &'static str {
    match error {
        BookmarkletError::AlreadyRunning => "already_running",
        BookmarkletError::NotRunning => "not_running",
        BookmarkletError::BindError { .. } => "bind_error",
        BookmarkletError::DatabaseError(_) => "database_error",
        BookmarkletError::InvalidData(_) => "invalid_data",
    }
}

fn json_error_response(message: impl AsRef<str>) -> String {
    json!({ "error": message.as_ref() }).to_string()
}

#[cfg(test)]
mod tests;
