//! HTTP server implementation for bookmarklet
//!
//! Runs a simple HTTP server on localhost to receive job data from browser bookmarklets.

use super::BookmarkletJobData;
use crate::core::db::Database;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::net::SocketAddr;
use std::sync::Arc;
use thiserror::Error;
use tokio::task::JoinHandle;

/// Bookmarklet server configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BookmarkletConfig {
    pub port: u16,
}

impl Default for BookmarkletConfig {
    fn default() -> Self {
        Self { port: 4321 }
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
    BindError {
        port: u16,
        source: std::io::Error,
    },

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

        // Create shutdown channel
        let (shutdown_tx, shutdown_rx) = tokio::sync::oneshot::channel();

        // Spawn server task
        let handle = tokio::spawn(async move {
            if let Err(e) = run_server(port, database, shutdown_rx).await {
                tracing::error!(error = %e, "Bookmarklet server error");
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
                        tokio::spawn(async move {
                            if let Err(e) = handle_connection(stream, db).await {
                                tracing::error!("Connection error: {}", e);
                            }
                        });
                    }
                    Err(e) => {
                        tracing::error!("Accept error: {}", e);
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
    database: Arc<Database>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    use tokio::io::AsyncWriteExt;

    let mut buffer = vec![0u8; 8192];
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
                // Check if we've read the headers
                if buffer[..total_read].windows(4).any(|w| w == b"\r\n\r\n") {
                    break;
                }
            }
            Err(ref e) if e.kind() == std::io::ErrorKind::WouldBlock => {
                // Wait for more data
                tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;
                continue;
            }
            Err(e) => return Err(Box::new(e)),
        }
    }

    let request = String::from_utf8_lossy(&buffer[..total_read]);

    // Parse request
    let (response, content_type) = if request.starts_with("POST /api/bookmarklet/import") {
        handle_import_request(&request, database).await
    } else if request.starts_with("OPTIONS") {
        // Handle preflight CORS request
        (
            "OK".to_string(),
            "text/plain".to_string(),
        )
    } else {
        (
            r#"{"error":"Not found"}"#.to_string(),
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
        "HTTP/1.1 {}\r\nContent-Type: {}\r\nContent-Length: {}\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: POST, OPTIONS\r\nAccess-Control-Allow-Headers: Content-Type\r\n\r\n{}",
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

/// Handle import request
async fn handle_import_request(
    request: &str,
    database: Arc<Database>,
) -> (String, String) {
    // Extract JSON body from request
    let body = if let Some(body_start) = request.find("\r\n\r\n") {
        &request[body_start + 4..]
    } else {
        return (
            r#"{"error":"Invalid request format"}"#.to_string(),
            "application/json".to_string(),
        );
    };

    // Parse JSON
    let job_data: BookmarkletJobData = match serde_json::from_str(body) {
        Ok(data) => data,
        Err(e) => {
            tracing::error!("Failed to parse job data: {}", e);
            return (
                format!(r#"{{"error":"Invalid JSON: {}"}}"#, e),
                "application/json".to_string(),
            );
        }
    };

    // Validate job data
    if let Err(e) = job_data.validate() {
        return (
            format!(r#"{{"error":"{}"}}"#, e),
            "application/json".to_string(),
        );
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
                r#"{"error":"Job already exists in database"}"#.to_string(),
                "application/json".to_string(),
            );
        }
        Ok(false) => {}
        Err(e) => {
            tracing::error!("Database error checking job existence: {}", e);
            return (
                format!(r#"{{"error":"Database error: {}"}}"#, e),
                "application/json".to_string(),
            );
        }
    }

    // Insert job into database
    let created_at = Utc::now();
    let result = sqlx::query!(
        r#"
        INSERT INTO jobs (
            hash, title, company, url, location, description,
            source, remote, created_at, updated_at, last_seen, times_seen
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
        job_hash,
        title,
        company,
        url,
        location,
        description,
        "bookmarklet",
        remote,
        created_at,
        created_at,
        created_at,
        1
    )
    .execute(database.pool())
    .await;

    match result {
        Ok(_) => {
            tracing::info!(
                title = %title,
                company = %company,
                "Job imported from bookmarklet"
            );
            (
                r#"{"success":true,"message":"Job imported successfully"}"#.to_string(),
                "application/json".to_string(),
            )
        }
        Err(e) => {
            tracing::error!("Database error inserting job: {}", e);
            (
                format!(r#"{{"error":"Failed to import job: {}"}}"#, e),
                "application/json".to_string(),
            )
        }
    }
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

    #[tokio::test]
    async fn test_bookmarklet_server_lifecycle() {
        let config = BookmarkletConfig { port: 0 }; // Use random port
        let mut server = BookmarkletServer::new(config);

        assert!(!server.is_running());

        // Note: Cannot fully test start/stop without a real database
        // This would require integration tests
    }
}
