FROM python:3.13-slim  # Latest stable (local Windows uses 3.12.10)

WORKDIR /app

# Install system dependencies
# Set DEBIAN_FRONTEND=noninteractive to suppress debconf warnings
RUN export DEBIAN_FRONTEND=noninteractive && \
    apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -r appuser && useradd -r -g appuser -u 1001 appuser

# Copy requirements and install Python dependencies as root
COPY requirements.txt .

# Install requirements with better error handling
# Using --root-user-action=ignore to suppress pip warnings in container build
RUN pip install --no-cache-dir --upgrade pip --root-user-action=ignore && \
    pip install --no-cache-dir --root-user-action=ignore \
        python-dotenv>=1.1.0 \
        requests>=2.32.0 \
        beautifulsoup4>=4.12.0 \
        lxml>=6.0.0 \
        pydantic>=2.11.0 \
        sqlmodel>=0.0.25 \
        tenacity>=9.0.0 \
        aiofiles>=24.1.0 \
        psutil>=7.0.0 \
        tzlocal>=5.2 \
        google-cloud-storage>=2.18.0 \
        Flask>=3.1.0 \
        playwright>=1.49.0

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