use super::BookmarkletError;
use std::io::ErrorKind;
use std::net::{IpAddr, Ipv4Addr, SocketAddr};
use tokio::net::TcpListener;

/// Bind before the UI reports Browser Import as running. If another local app
/// owns the requested port, let the operating system choose an available one.
pub(super) async fn bind_bookmarklet_listener(
    requested_port: u16,
) -> Result<(TcpListener, u16), BookmarkletError> {
    let listener = match bind_loopback(requested_port).await {
        Ok(listener) => listener,
        Err(BookmarkletError::BindError { source, .. })
            if source.kind() == ErrorKind::AddrInUse =>
        {
            tracing::warn!(
                requested_port,
                "Browser Import port is in use; selecting an available loopback port"
            );
            bind_loopback(0).await?
        }
        Err(error) => return Err(error),
    };
    let port = listener
        .local_addr()
        .map_err(|source| BookmarkletError::BindError {
            port: requested_port,
            source,
        })?
        .port();

    Ok((listener, port))
}

async fn bind_loopback(port: u16) -> Result<TcpListener, BookmarkletError> {
    let address = SocketAddr::new(IpAddr::V4(Ipv4Addr::LOCALHOST), port);
    TcpListener::bind(address)
        .await
        .map_err(|source| BookmarkletError::BindError { port, source })
}
