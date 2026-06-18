//! HTTP server implementation for bookmarklet
//!
//! Runs a simple HTTP server on localhost to receive job data from browser bookmarklets.

use super::BookmarkletJobData;
use crate::core::{
    calculate_job_hash,
    db::{Database, Job},
    url_security::canonicalize_user_supplied_job_url,
};
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

const BOOKMARKLET_TOKEN_HEADER: &str = "x-jobsentinel-token";
const CONTENT_LENGTH_HEADER: &str = "content-length";
const HEADER_BODY_SEPARATOR: &[u8] = b"\r\n\r\n";
const MAX_BOOKMARKLET_REQUEST_BYTES: usize = 8192;
const MAX_BOOKMARKLET_CONNECTIONS: usize = 16;
#[cfg(not(test))]
const BOOKMARKLET_READ_TIMEOUT: Duration = Duration::from_secs(3);
#[cfg(test)]
const BOOKMARKLET_READ_TIMEOUT: Duration = Duration::from_millis(50);
const BOOKMARKLET_TOKEN_LIFETIME_MINUTES: i64 = 60;
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
        let listener = bookmarklet_listener(port).await?;

        // Create shutdown channel
        let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel();

        // Spawn server task
        let handle = tokio::spawn(async move {
            if let Err(e) = run_server(listener, auth_state, database, shutdown_rx).await {
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
                        tokio::spawn(async move {
                            let _connection_permit = connection_permit;
                            if let Err(_e) =
                                handle_connection(stream, auth, db).await
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
    } else if is_bookmarklet_import_request(&request) {
        handle_import_request(&request, &auth_state, database).await
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
                if request_buffer_has_complete_body(&buffer[..total_read]) {
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
        "HTTP/1.1 {}\r\nContent-Type: {}\r\nContent-Length: {}\r\n\r\n{}",
        status,
        content_type,
        response.len(),
        response
    )
}

fn has_valid_bookmarklet_token(request: &str, auth_token: &str) -> bool {
    !auth_token.is_empty()
        && request_header_value(request, BOOKMARKLET_TOKEN_HEADER)
            .is_some_and(|value| value == auth_token)
}

fn body_has_valid_bookmarklet_token(body: &serde_json::Value, auth_token: &str) -> bool {
    !auth_token.is_empty()
        && body
            .get("token")
            .and_then(serde_json::Value::as_str)
            .is_some_and(|value| value == auth_token)
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

fn bookmarklet_job_value(mut body: serde_json::Value) -> serde_json::Value {
    if let Some(job) = body.get("job") {
        return job.clone();
    }

    if let serde_json::Value::Object(ref mut map) = body {
        map.remove("token");
    }

    body
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
        normalized == format!("localhost:{port}") || normalized == format!("127.0.0.1:{port}")
    })
}

fn request_buffer_has_complete_body(buffer: &[u8]) -> bool {
    let Some(header_end) = buffer
        .windows(HEADER_BODY_SEPARATOR.len())
        .position(|window| window == HEADER_BODY_SEPARATOR)
    else {
        return false;
    };

    let headers = String::from_utf8_lossy(&buffer[..header_end]);
    let body_start = header_end + HEADER_BODY_SEPARATOR.len();
    let content_length = request_header_value(&headers, CONTENT_LENGTH_HEADER)
        .and_then(|value| value.parse::<usize>().ok())
        .unwrap_or(0);

    buffer.len() >= body_start + content_length
}

fn is_bookmarklet_import_request(request: &str) -> bool {
    request.starts_with("POST /api/bookmarklet/import ")
        || request.starts_with("POST /api/bookmarklet/import?")
}

/// Handle import request
async fn handle_import_request(
    request: &str,
    auth_state: &Arc<RwLock<BookmarkletAuthState>>,
    database: Arc<Database>,
) -> (String, String) {
    // Extract JSON body from request
    let body = if let Some(body_start) = request.find("\r\n\r\n") {
        &request[body_start + 4..]
    } else {
        return (
            json_error_response("Invalid request format"),
            "application/json".to_string(),
        );
    };

    let body_value: serde_json::Value = match serde_json::from_str(body) {
        Ok(data) => data,
        Err(e) => {
            tracing::error!(
                line = e.line(),
                column = e.column(),
                "Failed to parse bookmarklet job data"
            );
            return (
                json_error_response(INVALID_BOOKMARKLET_PAYLOAD_MESSAGE),
                "application/json".to_string(),
            );
        }
    };

    if !consume_valid_bookmarklet_token(auth_state, request, &body_value, Utc::now()) {
        return (
            json_error_response(BOOKMARKLET_UNAUTHORIZED_MESSAGE),
            "application/json".to_string(),
        );
    }

    let job_data: BookmarkletJobData =
        match serde_json::from_value(bookmarklet_job_value(body_value)) {
            Ok(data) => data,
            Err(_) => {
                tracing::error!("Failed to parse bookmarklet job data");
                return (
                    json_error_response(INVALID_BOOKMARKLET_PAYLOAD_MESSAGE),
                    "application/json".to_string(),
                );
            }
        };

    // Validate job data
    if let Err(e) = job_data.validate() {
        return (json_error_response(e), "application/json".to_string());
    }

    // Extract fields
    let title = job_data.title.trim().to_string();
    let company = job_data
        .get_company()
        .map(|value| value.trim().to_string())
        .unwrap_or_default();
    let description = if job_data.description.trim().is_empty() {
        None
    } else {
        Some(job_data.description.trim().to_string())
    };
    let location = job_data
        .get_location()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty());
    let remote = job_data.is_remote();
    let url = match canonicalize_user_supplied_job_url(job_data.url.trim()) {
        Ok(url) => url,
        Err(_) => {
            return (
                json_error_response("Job link must be a public http or https address"),
                "application/json".to_string(),
            );
        }
    };

    // Calculate job hash for deduplication
    let job_hash = calculate_job_hash(&company, &title, location.as_deref(), &url);

    // Check if job already exists
    match database.job_exists_by_hash(&job_hash).await {
        Ok(true) => {
            return (
                json_error_response("Job already exists in database"),
                "application/json".to_string(),
            );
        }
        Ok(false) => {}
        Err(_e) => {
            tracing::error!(
                error_kind = "database",
                "Database error checking bookmarklet job existence"
            );
            return (
                json_error_response(BOOKMARKLET_DATABASE_FAILURE_MESSAGE),
                "application/json".to_string(),
            );
        }
    }

    // Insert job into database through the shared job storage validator.
    let created_at = Utc::now();
    let job = Job {
        id: 0,
        hash: job_hash.clone(),
        title: title.clone(),
        company: company.clone(),
        url: url.clone(),
        location: location.clone(),
        description: description.clone(),
        score: None,
        score_reasons: None,
        source: "bookmarklet".to_string(),
        remote: Some(remote),
        salary_min: None,
        salary_max: None,
        currency: None,
        created_at,
        updated_at: created_at,
        last_seen: created_at,
        times_seen: 1,
        immediate_alert_sent: false,
        included_in_digest: false,
        hidden: false,
        bookmarked: false,
        notes: None,
        ghost_score: None,
        ghost_reasons: None,
        first_seen: Some(created_at),
        repost_count: 0,
    };

    let result = database.upsert_job(&job).await;

    match result {
        Ok(job_id) => {
            tracing::info!(
                job_id,
                job_hash_len = job_hash.len(),
                title_chars = title.chars().count(),
                company_chars = company.chars().count(),
                has_location = location.is_some(),
                remote,
                "Job imported from bookmarklet"
            );
            (
                r#"{"success":true,"message":"Job imported successfully"}"#.to_string(),
                "application/json".to_string(),
            )
        }
        Err(_e) => {
            tracing::error!(
                error_kind = "database",
                "Database error inserting bookmarklet job"
            );
            (
                json_error_response(BOOKMARKLET_DATABASE_FAILURE_MESSAGE),
                "application/json".to_string(),
            )
        }
    }
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
