//! HTTP server implementation for bookmarklet
//!
//! Runs a simple HTTP server on localhost to receive job data from browser bookmarklets.

use super::BookmarkletJobData;
use crate::core::db::Database;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::json;
use sha2::{Digest, Sha256};
use std::net::SocketAddr;
use std::sync::Arc;
use thiserror::Error;
use tokio::task::JoinHandle;
use uuid::Uuid;

const BOOKMARKLET_TOKEN_HEADER: &str = "x-jobsentinel-token";
const CONTENT_LENGTH_HEADER: &str = "content-length";
const HEADER_BODY_SEPARATOR: &[u8] = b"\r\n\r\n";
const MAX_BOOKMARKLET_REQUEST_BYTES: usize = 8192;
const INVALID_BOOKMARKLET_PAYLOAD_MESSAGE: &str =
    "Invalid bookmarklet payload. Reload the page and try again.";
const BOOKMARKLET_DATABASE_FAILURE_MESSAGE: &str =
    "JobSentinel could not save this job. Restart the app and try again.";

/// Bookmarklet server configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BookmarkletConfig {
    pub port: u16,
    pub auth_token: String,
}

impl Default for BookmarkletConfig {
    fn default() -> Self {
        Self {
            port: 4321,
            auth_token: Uuid::new_v4().to_string(),
        }
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
    server_handle: Option<JoinHandle<()>>,
    shutdown_tx: Option<tokio::sync::oneshot::Sender<()>>,
}

impl BookmarkletServer {
    /// Create a new bookmarklet server
    pub fn new(config: BookmarkletConfig) -> Self {
        Self {
            config,
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
        let port = self.config.port;
        let auth_token = self.config.auth_token.clone();

        // Create shutdown channel
        let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel();

        // Spawn server task
        let handle = tokio::spawn(async move {
            if let Err(e) = run_server(port, auth_token, database, shutdown_rx).await {
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

/// Run the HTTP server
async fn run_server(
    port: u16,
    auth_token: String,
    database: Arc<Database>,
    mut shutdown_rx: tokio::sync::oneshot::Receiver<()>,
) -> Result<(), BookmarkletError> {
    use std::net::{IpAddr, Ipv4Addr};

    // Create a simple HTTP listener
    let addr = SocketAddr::new(IpAddr::V4(Ipv4Addr::LOCALHOST), port);
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .map_err(|e| BookmarkletError::BindError { port, source: e })?;

    tracing::info!("Listening on http://{}", addr);

    // Accept connections until shutdown
    loop {
        tokio::select! {
            result = listener.accept() => {
                match result {
                    Ok((stream, _)) => {
                        let db = database.clone();
                        let token = auth_token.clone();
                        tokio::spawn(async move {
                            if let Err(_e) = handle_connection(stream, token, db).await {
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

/// Handle a single HTTP connection
async fn handle_connection(
    stream: tokio::net::TcpStream,
    auth_token: String,
    database: Arc<Database>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    use tokio::io::AsyncWriteExt;

    let mut buffer = vec![0u8; MAX_BOOKMARKLET_REQUEST_BYTES];
    let mut total_read = 0;

    // Read request
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
                // Wait for more data
                tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
            }
            Err(e) => return Err(Box::new(e)),
        }
    }

    let request = String::from_utf8_lossy(&buffer[..total_read]);

    // Parse request
    let (response, content_type) = if request.starts_with("POST /api/bookmarklet/import") {
        if has_valid_bookmarklet_token(&request, &auth_token) {
            handle_import_request(&request, database).await
        } else {
            (
                json_error_response("Unauthorized bookmarklet request"),
                "application/json".to_string(),
            )
        }
    } else if request.starts_with("OPTIONS") {
        // Handle preflight CORS request
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

    let response_data = format!(
        "HTTP/1.1 {}\r\nContent-Type: {}\r\nContent-Length: {}\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: POST, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type, X-JobSentinel-Token\r\n\r\n{}",
        status,
        content_type,
        response.len(),
        response
    );

    let mut writable_stream = stream;
    writable_stream.write_all(response_data.as_bytes()).await?;
    writable_stream.flush().await?;

    Ok(())
}

fn has_valid_bookmarklet_token(request: &str, auth_token: &str) -> bool {
    !auth_token.is_empty()
        && request_header_value(request, BOOKMARKLET_TOKEN_HEADER)
            .is_some_and(|value| value == auth_token)
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

/// Handle import request
async fn handle_import_request(request: &str, database: Arc<Database>) -> (String, String) {
    // Extract JSON body from request
    let body = if let Some(body_start) = request.find("\r\n\r\n") {
        &request[body_start + 4..]
    } else {
        return (
            json_error_response("Invalid request format"),
            "application/json".to_string(),
        );
    };

    // Parse JSON
    let job_data: BookmarkletJobData = match serde_json::from_str(body) {
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

    // Validate job data
    if let Err(e) = job_data.validate() {
        return (json_error_response(e), "application/json".to_string());
    }

    // Extract fields
    let title = job_data.title.clone();
    let company = job_data.get_company().unwrap_or_default();
    let description = if job_data.description.is_empty() {
        None
    } else {
        Some(job_data.description.clone())
    };
    let location = job_data.get_location();
    let remote = job_data.is_remote();
    let url = job_data.url.clone();

    // Calculate job hash for deduplication
    let job_hash = calculate_job_hash(&company, &title, &url);

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

    // Insert job into database
    let created_at = Utc::now();
    let result = sqlx::query(
        r#"
        INSERT INTO jobs (
            hash, title, company, url, location, description,
            source, remote, created_at, updated_at, last_seen, times_seen
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(&job_hash)
    .bind(&title)
    .bind(&company)
    .bind(&url)
    .bind(&location)
    .bind(&description)
    .bind("bookmarklet")
    .bind(remote)
    .bind(created_at)
    .bind(created_at)
    .bind(created_at)
    .bind(1)
    .execute(database.pool())
    .await;

    match result {
        Ok(_) => {
            tracing::info!(
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

/// Calculate job hash for deduplication
fn calculate_job_hash(company: &str, title: &str, url: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(company.to_lowercase().as_bytes());
    hasher.update(title.to_lowercase().as_bytes());
    hasher.update(url.as_bytes());
    hex::encode(hasher.finalize())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_job_hash() {
        let hash1 = calculate_job_hash("Google", "Software Engineer", "https://example.com/job/1");
        let hash2 = calculate_job_hash("Google", "Software Engineer", "https://example.com/job/1");
        let hash3 = calculate_job_hash("Google", "Software Engineer", "https://example.com/job/2");

        assert_eq!(hash1, hash2);
        assert_ne!(hash1, hash3);
    }

    #[test]
    fn test_json_error_response_escapes_message() {
        let response = json_error_response("bad \"quote\"\nnext line");
        let parsed: serde_json::Value =
            serde_json::from_str(&response).expect("error response should be valid JSON");

        assert_eq!(parsed["error"], "bad \"quote\"\nnext line");
    }

    #[test]
    fn test_bookmarklet_token_validation_requires_matching_header() {
        let request = "POST /api/bookmarklet/import HTTP/1.1\r\nHost: localhost\r\nX-JobSentinel-Token: secret-token\r\n\r\n{}";

        assert!(has_valid_bookmarklet_token(request, "secret-token"));
        assert!(!has_valid_bookmarklet_token(request, "other-token"));
        assert!(!has_valid_bookmarklet_token(request, ""));
        assert!(!has_valid_bookmarklet_token(
            "POST /api/bookmarklet/import HTTP/1.1\r\nHost: localhost\r\n\r\n{}",
            "secret-token"
        ));
        assert!(!has_valid_bookmarklet_token(
            "POST /api/bookmarklet/import HTTP/1.1\r\nHost: localhost\r\n\r\nX-JobSentinel-Token: secret-token",
            "secret-token"
        ));
    }

    #[test]
    fn test_request_buffer_waits_for_declared_body() {
        let headers_only = b"POST /api/bookmarklet/import HTTP/1.1\r\nHost: localhost\r\nContent-Length: 5\r\n\r\n";
        let complete_request = b"POST /api/bookmarklet/import HTTP/1.1\r\nHost: localhost\r\nContent-Length: 5\r\n\r\nhello";

        assert!(!request_buffer_has_complete_body(headers_only));
        assert!(request_buffer_has_complete_body(complete_request));
        assert!(request_buffer_has_complete_body(
            b"OPTIONS /api/bookmarklet/import HTTP/1.1\r\nHost: localhost\r\n\r\n"
        ));
    }

    #[tokio::test]
    async fn test_bookmarklet_server_lifecycle() {
        let config = BookmarkletConfig {
            port: 0,
            ..Default::default()
        }; // Use random port
        let server = BookmarkletServer::new(config);

        assert!(!server.is_running());

        // Note: Cannot fully test start/stop without a real database
        // This would require integration tests
    }
}
