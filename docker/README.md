# Docker Deployment

Run JobSentinel in a container.

## Build

```bash
docker build -f docker/Dockerfile -t jobsentinel:latest .
```

## Run

```bash
docker run -d \
  --name jobsentinel \
  -v $(pwd)/config:/app/config:ro \
  -v $(pwd)/data:/app/data \
  jobsentinel:latest
```

## Environment

Set in `.env` or pass via `-e`:
```bash
JOBSENTINEL_CONFIG=/app/config/config.yaml
JOBSENTINEL_LOG_LEVEL=INFO
```

## Security

- Runs as non-root (`appuser`, UID 1001)
- Base: python:3.11.10-slim
- Mount secrets via env vars, not baked in image
- Config mount read-only

## Files

- `Dockerfile` — Production image
- `docker-compose.mcp.yml` — MCP dev environment
- `mcp-sandbox.dockerfile` — MCP testing sandbox
