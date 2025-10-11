FROM python:3.13.8-slim

WORKDIR /app

# Install system dependencies
# Set DEBIAN_FRONTEND=noninteractive to suppress debconf warnings
RUN export DEBIAN_FRONTEND=noninteractive && \
    apt-get update && apt-get install -y --no-install-recommends \
    curl=8.14.1-2 \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser -u 1001 appuser

# Copy requirements and install Python dependencies as root
COPY requirements.txt .

# Install requirements with better error handling
# Using --root-user-action=ignore to suppress pip warnings in container build
RUN pip install --no-cache-dir --upgrade pip --root-user-action=ignore && \
    pip install --no-cache-dir -r requirements.txt --root-user-action=ignore

# Install playwright browsers (still as root since it needs system deps)
# Set DEBIAN_FRONTEND for playwright deps install
RUN playwright install chromium && \
    DEBIAN_FRONTEND=noninteractive playwright install-deps chromium

# Copy application code
COPY . .

# Set proper ownership for non-root user
RUN chown -R appuser:appuser /app

# Set up proper Python path
ENV PYTHONPATH=/app

# Switch to non-root user
USER appuser

# Run the job scraper
CMD ["python3", "src/agent.py", "--mode", "poll"]
