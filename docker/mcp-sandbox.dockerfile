# Minimal Docker container for isolating MCP servers
# Cost: FREE (uses existing Docker, no external services)
# Impact: CRITICAL (prevents MCP servers from compromising host)

FROM python:3.11-slim

# Create non-root user
RUN useradd -m -u 1000 -s /bin/bash mcp && \
    mkdir -p /app /data && \
    chown -R mcp:mcp /app /data

# Install minimal dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        curl \
        ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Install Node.js (for Node-based MCP servers)
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Switch to non-root user
USER mcp
WORKDIR /app

# Install Python MCP dependencies
COPY --chown=mcp:mcp requirements-mcp.txt /app/
RUN pip install --user --no-cache-dir -r requirements-mcp.txt

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV NODE_ENV=production

# Default command (override per MCP server)
CMD ["python3", "-m", "mcp.server"]

# Security labels
LABEL security.sandbox=true
LABEL security.network=none
LABEL security.readonly=true
