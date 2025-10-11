# Docker Deployment

This directory contains Docker configurations for containerized deployment of JobSentinel.

## Files

- **Dockerfile** - Main production container image
- **docker-compose.mcp.yml** - MCP server development environment
- **mcp-sandbox.dockerfile** - Sandbox environment for MCP testing

## Production Deployment

### Build Image

```bash
docker build -f docker/Dockerfile -t jobsentinel:latest .
```

### Run Container

```bash
docker run -d \
  --name jobsentinel \
  -v $(pwd)/config:/app/config:ro \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  jobsentinel:latest
```

### Environment Variables

Required environment variables (set in `.env` or pass via `-e`):

```bash
# Core Configuration
JOBSENTINEL_CONFIG=/app/config/config.yaml

# Optional: Override defaults
JOBSENTINEL_LOG_LEVEL=INFO
JOBSENTINEL_DATA_DIR=/app/data
```

## MCP Development

For MCP server development and testing:

```bash
docker-compose -f docker/docker-compose.mcp.yml up
```

## Security Notes

- Container runs as non-root user (`appuser`, UID 1001)
- Minimal base image (python:3.13.8-slim)
- No unnecessary system packages
- Secrets should be mounted or passed via environment variables
- Use read-only mounts for configuration files

## Related Documentation

- [Quickstart Guide](../docs/quickstart.md)
- [Architecture](../docs/ARCHITECTURE.md)
- [Deployment Guide](../docs/deployment.md) _(coming soon)_
