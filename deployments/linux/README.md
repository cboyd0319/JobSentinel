# Linux Deployment

Linux-specific deployment files and configurations.

## Local Development (`local/`)

Reserved for Linux-specific local setup scripts and configurations.

**Note**: Most Linux deployments can use the Docker or direct Python installation methods documented in the main README.

### Standard Installation (Python)
```bash
# From repository root
git clone https://github.com/cboyd0319/JobSentinel
cd JobSentinel
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
python -m jsa.cli run-once
```

### Docker Installation
```bash
# Use common Docker deployment
docker build -f deployments/common/docker/Dockerfile -t jobsentinel:latest .
docker run -d \
  --name jobsentinel \
  -v $(pwd)/config:/app/config:ro \
  -v $(pwd)/data:/app/data \
  --env-file .env \
  jobsentinel:latest
```

## Cloud Deployment (`cloud/`)

Linux-specific cloud deployment configurations (if needed in the future).

Common cloud deployments (AWS, GCP, Azure) use the infrastructure in `deployments/common/cloud/` and `deployments/common/terraform/`.

## Documentation

For deployment guides, see:
- `/docs/DEPLOYMENT_GUIDE.md`
- `/docs/README.md`
- Main `/README.md`
