# Multi-stage build for optimized container size
FROM python:3.12.10-slim AS builder

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir --user -r requirements.txt

# Production stage using distroless image
FROM gcr.io/distroless/python3-debian12:latest AS runtime

ENV PYTHONUNBUFFERED=1 \
    PATH="/home/nonroot/.local/bin:${PATH}"

WORKDIR /app

# Copy Python dependencies from builder
COPY --from=builder /root/.local /home/nonroot/.local

# Copy application code
COPY src/ ./src/
COPY utils/ ./utils/
COPY sources/ ./sources/
COPY notify/ ./notify/
COPY matchers/ ./matchers/
COPY templates/ ./templates/
COPY config/ ./config/

# Use non-root user from distroless image
USER nonroot

# Direct Python execution instead of shell script
ENTRYPOINT ["python3", "src/agent.py"]
