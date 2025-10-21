# Secure Coding Guide

**For JobSentinel Contributors**

This guide provides security best practices and code examples to help you write secure code for JobSentinel. Follow these guidelines to prevent common vulnerabilities.

---

## Table of Contents

1. [Input Validation](#input-validation)
2. [Subprocess Safety](#subprocess-safety)
3. [File Operations](#file-operations)
4. [HTTP Requests (SSRF Prevention)](#http-requests-ssrf-prevention)
5. [SQL Injection Prevention](#sql-injection-prevention)
6. [Secrets Management](#secrets-management)
7. [Logging Security](#logging-security)
8. [Deserialization Safety](#deserialization-safety)
9. [Cryptography](#cryptography)
10. [Web UI Security](#web-ui-security)

---

## Input Validation

**Rule:** Validate and sanitize ALL inputs from external sources (job boards, user config, CLI arguments, web requests).

### ✅ Good Example

```python
from pydantic import BaseModel, Field, validator

class JobSearchPrefs(BaseModel):
    keywords: list[str] = Field(min_items=1, max_items=50)
    min_salary: int = Field(ge=0, le=1_000_000)
    locations: list[str] = Field(max_items=20)
    
    @validator('keywords')
    def validate_keywords(cls, v):
        """Ensure keywords are alphanumeric + spaces only."""
        for keyword in v:
            if not keyword.replace(' ', '').isalnum():
                raise ValueError(f"Invalid keyword: {keyword}")
        return v
```

### ❌ Bad Example

```python
def search_jobs(keyword):
    # No validation - could be malicious!
    return db.query(f"SELECT * FROM jobs WHERE title LIKE '%{keyword}%'")
```

---

## Subprocess Safety

**Rule:** Never use `shell=True`. Always pass arguments as a list, not a string.

### ✅ Good Example

```python
import subprocess
import shlex

def run_ripgrep(pattern: str, file_path: str) -> str:
    """Safe subprocess call with argument list."""
    # Validate inputs first
    if not file_path.startswith("/app/data/"):
        raise ValueError("File path outside allowed directory")
    
    # Use argument list (shell=False is default)
    result = subprocess.run(
        ["rg", "--", pattern, file_path],  # -- prevents pattern being interpreted as flag
        capture_output=True,
        text=True,
        timeout=10,
    )
    return result.stdout
```

### ❌ Bad Example

```python
def run_ripgrep_unsafe(pattern: str, file_path: str) -> str:
    """VULNERABLE to command injection!"""
    cmd = f"rg {pattern} {file_path}"  # What if pattern is "; rm -rf /"?
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return result.stdout
```

### Justifying subprocess with shell=True

If you **must** use shell features (pipes, wildcards), document why and add to `pyproject.toml`:

```toml
[tool.ruff.lint.per-file-ignores]
"deploy/common/app/src/jsa/my_module.py" = ["S603", "S607"]  # subprocess with trusted input (setup wizard)
```

And add a comment in the code:

```python
# S603, S607: shell=True needed for wildcard expansion, input is from config file (trusted)
subprocess.run("ls /app/data/*.json", shell=True, check=True)
```

---

## File Operations

**Rule:** Validate file paths to prevent path traversal attacks.

### ✅ Good Example

```python
from pathlib import Path

def validate_path(user_path: str, base_dir: str = "/app/data") -> Path:
    """Validate and resolve file path to prevent traversal."""
    base = Path(base_dir).resolve()
    target = (base / user_path).resolve()
    
    # Ensure resolved path is within base directory
    if not target.is_relative_to(base):
        raise ValueError(f"Path traversal attempt: {user_path}")
    
    return target

def read_log_file(filename: str) -> str:
    """Safe file reading with path validation."""
    log_path = validate_path(filename, base_dir="/app/logs")
    return log_path.read_text()
```

### ❌ Bad Example

```python
def read_log_file_unsafe(filename: str) -> str:
    """VULNERABLE to path traversal!"""
    # What if filename is "../../etc/passwd"?
    with open(f"/app/logs/{filename}") as f:
        return f.read()
```

### Test Case

```python
def test_path_traversal_blocked():
    """Ensure path traversal is blocked."""
    with pytest.raises(ValueError, match="Path traversal"):
        validate_path("../../etc/passwd", base_dir="/app/data")
    
    with pytest.raises(ValueError, match="Path traversal"):
        validate_path("/etc/passwd", base_dir="/app/data")
```

---

## HTTP Requests (SSRF Prevention)

**Rule:** Validate URLs before making requests to prevent SSRF.

### ✅ Good Example

```python
import ipaddress
from urllib.parse import urlparse

def validate_url(url: str, allowed_schemes: list[str] = None) -> str:
    """Validate URL to prevent SSRF attacks."""
    if allowed_schemes is None:
        allowed_schemes = ["https"]  # Default to HTTPS only
    
    parsed = urlparse(url)
    
    # Check scheme
    if parsed.scheme not in allowed_schemes:
        raise ValueError(f"URL scheme must be one of {allowed_schemes}")
    
    # Block private IP addresses
    if parsed.hostname:
        try:
            ip = ipaddress.ip_address(parsed.hostname)
            if ip.is_private or ip.is_loopback or ip.is_link_local:
                raise ValueError(f"Private/local IP addresses not allowed: {ip}")
        except ValueError:
            pass  # Not an IP address, hostname is OK
    
    # Block localhost
    if parsed.hostname in ("localhost", "127.0.0.1", "::1", "0.0.0.0"):
        raise ValueError("localhost not allowed")
    
    return url

def fetch_job_listing(url: str) -> dict:
    """Safe HTTP request with URL validation."""
    validated_url = validate_url(url, allowed_schemes=["https"])
    response = requests.get(validated_url, timeout=10)
    response.raise_for_status()
    return response.json()
```

### ❌ Bad Example

```python
def fetch_job_listing_unsafe(url: str) -> dict:
    """VULNERABLE to SSRF!"""
    # What if url is "http://169.254.169.254/latest/meta-data/iam/security-credentials/"?
    response = requests.get(url)
    return response.json()
```

### Test Cases

```python
def test_ssrf_localhost_blocked():
    with pytest.raises(ValueError, match="localhost"):
        validate_url("http://localhost:6379/")

def test_ssrf_private_ip_blocked():
    with pytest.raises(ValueError, match="Private"):
        validate_url("http://192.168.1.1/admin")
        
def test_ssrf_cloud_metadata_blocked():
    with pytest.raises(ValueError, match="Private"):
        validate_url("http://169.254.169.254/latest/meta-data/")
```

---

## SQL Injection Prevention

**Rule:** Always use parameterized queries or an ORM. Never use string formatting.

### ✅ Good Example

```python
from sqlalchemy import select
from sqlmodel import Session

def search_jobs(session: Session, keyword: str) -> list[Job]:
    """Safe query using SQLAlchemy ORM."""
    # ORM automatically parameterizes
    statement = select(Job).where(Job.title.contains(keyword))
    return session.exec(statement).all()

# Alternative: parameterized raw SQL
def search_jobs_raw(session: Session, keyword: str) -> list[Job]:
    """Safe raw SQL with parameterization."""
    sql = "SELECT * FROM jobs WHERE title LIKE :keyword"
    result = session.execute(sql, {"keyword": f"%{keyword}%"})
    return result.fetchall()
```

### ❌ Bad Example

```python
def search_jobs_unsafe(session: Session, keyword: str) -> list[Job]:
    """VULNERABLE to SQL injection!"""
    # What if keyword is "' OR '1'='1"?
    sql = f"SELECT * FROM jobs WHERE title LIKE '%{keyword}%'"
    result = session.execute(sql)
    return result.fetchall()
```

---

## Secrets Management

**Rule:** Never hardcode secrets. Use environment variables or `.env` files.

### ✅ Good Example

```python
import os
from dotenv import load_dotenv

load_dotenv()  # Load from .env file

REED_API_KEY = os.getenv("REED_API_KEY")
SLACK_WEBHOOK = os.getenv("SLACK_WEBHOOK_URL")

if not REED_API_KEY:
    raise ValueError("REED_API_KEY not set in environment")

def fetch_reed_jobs():
    headers = {"Authorization": f"Basic {REED_API_KEY}"}
    response = requests.get("https://api.reed.co.uk/jobs", headers=headers)
    return response.json()
```

### ❌ Bad Example

```python
# NEVER DO THIS!
REED_API_KEY = "sk_live_abc123xyz..."  # Hardcoded secret
SLACK_WEBHOOK = "https://hooks.slack.com/services/T00/B00/xyz..."
```

### .env File Example

```bash
# .env (NEVER commit this file!)
REED_API_KEY=your_api_key_here
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
DATABASE_URL=sqlite:///./data/jobs.db
```

### .env.example File

```bash
# .env.example (safe to commit)
REED_API_KEY=your_reed_api_key_here
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
DATABASE_URL=sqlite:///./data/jobs.db
```

---

## Logging Security

**Rule:** Never log secrets or sensitive data.

### ✅ Good Example

```python
import logging

logger = logging.getLogger(__name__)

def authenticate_user(username: str, password: str):
    logger.info(f"Authentication attempt for user: {username}")  # OK to log username
    # ... authentication logic ...
    logger.info(f"User {username} authenticated successfully")

def fetch_api_data(api_key: str):
    # Redact the secret
    redacted_key = api_key[:8] + "..." if len(api_key) > 8 else "***"
    logger.debug(f"Fetching data with API key: {redacted_key}")
    # ... fetch logic ...
```

### ❌ Bad Example

```python
def authenticate_user_unsafe(username: str, password: str):
    logger.info(f"Authenticating user: {username} with password: {password}")  # NEVER LOG PASSWORDS!

def fetch_api_data_unsafe(api_key: str):
    logger.debug(f"Using API key: {api_key}")  # NEVER LOG SECRETS!
```

### Structured Logging with Redaction

```python
import logging
import re

class SecretRedactingFilter(logging.Filter):
    """Filter to redact secrets from log messages."""
    
    SECRET_PATTERNS = [
        r'api_key=\S+',
        r'password=\S+',
        r'token=\S+',
    ]
    
    def filter(self, record):
        for pattern in self.SECRET_PATTERNS:
            record.msg = re.sub(pattern, lambda m: m.group(0).split('=')[0] + '=***', record.msg)
        return True

logger = logging.getLogger(__name__)
logger.addFilter(SecretRedactingFilter())
```

---

## Deserialization Safety

**Rule:** Never use `pickle` or `yaml.load()` on untrusted data. Use JSON or `yaml.safe_load()`.

### ✅ Good Example

```python
import json

def load_config(file_path: str) -> dict:
    """Safe JSON deserialization."""
    with open(file_path) as f:
        return json.load(f)  # JSON is safe

# If you must use YAML:
import yaml

def load_yaml_config(file_path: str) -> dict:
    """Safe YAML deserialization."""
    with open(file_path) as f:
        return yaml.safe_load(f)  # safe_load prevents code execution
```

### ❌ Bad Example

```python
import pickle
import yaml

def load_config_unsafe(file_path: str) -> dict:
    """VULNERABLE to arbitrary code execution!"""
    with open(file_path, "rb") as f:
        return pickle.load(f)  # pickle can execute arbitrary code!

def load_yaml_unsafe(file_path: str) -> dict:
    """VULNERABLE to arbitrary code execution!"""
    with open(file_path) as f:
        return yaml.load(f)  # yaml.load() can execute arbitrary code!
```

---

## Cryptography

**Rule:** Use secure random number generators for security-sensitive operations.

### ✅ Good Example

```python
import secrets

def generate_api_token() -> str:
    """Generate a cryptographically secure token."""
    return secrets.token_urlsafe(32)

def generate_password_reset_code() -> str:
    """Generate a secure 6-digit code."""
    return str(secrets.randbelow(1_000_000)).zfill(6)
```

### ❌ Bad Example

```python
import random

def generate_api_token_unsafe() -> str:
    """INSECURE! Uses predictable random numbers."""
    return ''.join(random.choices('abcdefghijklmnopqrstuvwxyz0123456789', k=32))
```

---

## Web UI Security

**Rule:** Use framework built-ins for XSS prevention. Don't use `dangerouslySetInnerHTML` in React.

### ✅ Good Example (React)

```tsx
function JobCard({ job }: { job: Job }) {
  // React automatically escapes variables
  return (
    <div className="job-card">
      <h3>{job.title}</h3>  {/* Safe - React escapes */}
      <p>{job.description}</p>  {/* Safe - React escapes */}
    </div>
  );
}
```

### ❌ Bad Example (React)

```tsx
function JobCard({ job }: { job: Job }) {
  // VULNERABLE to XSS!
  return (
    <div className="job-card">
      <h3 dangerouslySetInnerHTML={{ __html: job.title }} />  {/* UNSAFE! */}
    </div>
  );
}
```

### ✅ Good Example (Flask/Jinja2)

```python
from flask import Flask, render_template

app = Flask(__name__)

@app.route("/job/<job_id>")
def show_job(job_id):
    job = get_job(job_id)
    # Jinja2 auto-escapes by default
    return render_template("job.html", job=job)
```

**job.html:**
```html
<!-- Jinja2 auto-escapes -->
<h1>{{ job.title }}</h1>  <!-- Safe -->
<p>{{ job.description }}</p>  <!-- Safe -->
```

### ❌ Bad Example (Flask)

```python
from flask import Flask, Markup

@app.route("/job/<job_id>")
def show_job_unsafe(job_id):
    job = get_job(job_id)
    # VULNERABLE to XSS!
    return f"<h1>{job.title}</h1><p>{job.description}</p>"  # Unescaped HTML
```

---

## Security Checklist for Pull Requests

Before submitting a PR, verify:

- [ ] All user inputs are validated (Pydantic models, type checking)
- [ ] No `shell=True` in subprocess calls (or justified + documented)
- [ ] File paths are validated (use `validate_path()`)
- [ ] URLs are validated (use `validate_url()`)
- [ ] No secrets in code (use `.env`)
- [ ] No secrets in logs (use redaction)
- [ ] SQL queries use ORM or parameterization
- [ ] No `pickle`, `yaml.load()`, or `eval()` on untrusted data
- [ ] Use `secrets` module for tokens/passwords (not `random`)
- [ ] React/Jinja2 auto-escaping enabled (no `dangerouslySetInnerHTML`)
- [ ] Tests added for security-critical code
- [ ] Security scans pass (Bandit, Semgrep, Ruff)

---

## Tools & Commands

### Run Security Scans Locally

```bash
# Lint and security checks
make lint          # Ruff + Black + mypy
make security      # Bandit + Semgrep + pip-audit

# Individual tools
ruff check --select S deploy/common/app/src/  # Security rules
bandit -r deploy/common/app/src/              # SAST
semgrep scan --config auto                     # Advanced SAST
pip-audit                                      # Dependency vulnerabilities
```

### Pre-commit Hooks

```bash
# Install pre-commit hooks
pre-commit install

# Run manually
pre-commit run --all-files
```

---

## Additional Resources

- **[SECURITY.md](../SECURITY.md)** - Vulnerability disclosure policy
- **[RISK_LEDGER.md](../security/RISK_LEDGER.md)** - Current security risks
- **[PYSEC Guidelines](./copilot/PYSEC.md)** - Python security engineering standards
- **[OWASP Top 10](https://owasp.org/www-project-top-ten/)** - Web application security risks
- **[CWE Top 25](https://cwe.mitre.org/top25/)** - Most dangerous software weaknesses

---

## Questions?

- **Security issues:** See [SECURITY.md](../SECURITY.md)
- **Coding questions:** [GitHub Discussions](https://github.com/cboyd0319/JobSentinel/discussions)

---

*Remember: Security is everyone's responsibility. When in doubt, ask for a security review!*

**Last Updated:** 2025-10-21
