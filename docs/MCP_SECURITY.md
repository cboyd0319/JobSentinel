# MCP Server Security Guide

**⚠️ CRITICAL:** MCP servers are untrusted plugins that can execute code, access your filesystem/network, and steal credentials. Treat them like production dependencies with significant security implications.

---

## 🚨 Threat Model

### What Can Go Wrong

**1. Supply Chain & Remote Code Execution**
- MCP servers can ship malicious code
- High-severity RCEs have been found in the MCP ecosystem
- Compromised dependencies can execute arbitrary code

**2. Credential Leakage**
- Servers often require cookies/API keys in plaintext config
- Clients run with your user privileges (no sandbox by default)
- Perfect target for data exfiltration

**3. Prompt/Tool Injection**
- LLMs can be tricked into invoking dangerous tools
- "Confused deputy" attacks can cross tenant boundaries
- Overly broad tool scopes amplify damage

**4. Over-Privileged Access**
- Static secrets create impersonation risk
- Fragmented identity models across tools
- No built-in principle of least privilege

**5. Network & Filesystem Access**
- Full network access (can exfiltrate data)
- Full filesystem access (can read SSH keys, browser cookies, etc.)
- No isolation between MCP servers

---

## 🛡️ Defense-in-Depth Strategy

### 1. Sandbox Execution (HIGHEST PRIORITY)

**Docker Isolation (Recommended):**

```bash
# Minimal hardened Docker run for MCP servers
docker run --rm \
  --user 65532:65532 \              # Non-root user
  --read-only \                      # Read-only root filesystem
  --cap-drop ALL \                   # Drop all capabilities
  --security-opt no-new-privileges \ # No privilege escalation
  --pids-limit 256 \                 # Limit process spawning
  --memory 256m \                    # Memory limit
  --cpus 0.5 \                       # CPU limit
  -v "$PWD/output:/work:rw" \        # Only mount what's needed
  --mount type=tmpfs,destination=/tmp,tmpfs-mode=1777,tmpfs-size=64m \
  --env REED_API_KEY="${REED_API_KEY}" \
  --network none \                   # Disable network (enable if needed)
  ghcr.io/your-org/mcp-server:1.0.0
```

**Without Docker (macOS/Windows):**

- Use OS-level sandboxing (macOS Sandbox, Windows AppLocker)
- Configure outbound firewall (Little Snitch, Windows Firewall)
- Mount project directories read-only where possible
- Run MCP processes as dedicated low-privilege user

**Network Isolation:**

```bash
# If network is needed, allowlist specific domains
--network bridge \
--dns 8.8.8.8 \
# Use iptables/nftables to restrict outbound to specific IPs
```

### 2. Kill Static Secrets

**❌ NEVER DO THIS:**

```json
{
  "mcp_servers": {
    "linkedin": {
      "env": {
        "LINKEDIN_COOKIE": "AQEDARxxxxxxxxxxxxx"  // ❌ DANGER!
      }
    }
  }
}
```

**✅ DO THIS INSTEAD:**

```bash
# Use environment variables (not in config files)
export REED_API_KEY=$(vault read -field=api_key secret/reed)

# Short-lived tokens (refresh every hour)
export REED_TOKEN=$(get-short-lived-token)

# OAuth/OIDC where possible (not cookies)
export OAUTH_TOKEN=$(oauth-flow --scope jobs:read)
```

**Token Exchange & Down-Scoping:**

```python
# Validate audience and scope before using tokens
def validate_and_downscope(id_token: str) -> str:
    claims = verify_jwt(id_token, jwks_url)

    # Validate audience
    assert claims["aud"] == "your-mcp-server"

    # Validate scopes
    assert "jobs.read" in claims.get("scopes", [])

    # Exchange for down-scoped token
    downscoped_token = exchange_token(
        id_token,
        scopes=["jobs.read"],  # Minimal scope needed
        lifetime=3600  # 1 hour
    )

    return downscoped_token
```

### 3. Principle of Least Privilege

**Per-Tool Allowlist:**

```json
{
  "mcp_tools": {
    "search_jobs": {
      "enabled": true,
      "network": ["https://api.reed.co.uk", "https://jobswithgpt.com"],
      "filesystem": {
        "read": ["./output/*.json"],
        "write": ["./output/*.json"],
        "execute": []
      },
      "max_requests_per_hour": 100
    },
    "search_linkedin": {
      "enabled": false,  // Disabled by default (high risk)
      "requires_consent": true,
      "network": ["https://www.linkedin.com"],
      "filesystem": {
        "read": [],
        "write": []
      }
    },
    "write_file": {
      "enabled": true,
      "filesystem": {
        "write": ["./output/*.json"]  // Restricted to output dir
      }
    },
    "exec_shell": {
      "enabled": false  // Never enable unless absolutely necessary
    }
  }
}
```

**Enforce at Runtime:**

```python
def check_tool_permission(tool_name: str, operation: str, target: str) -> bool:
    """Enforce tool permissions before execution."""
    policy = load_tool_policy(tool_name)

    if not policy.get("enabled"):
        raise PermissionError(f"Tool {tool_name} is disabled")

    if operation == "network":
        allowed_hosts = policy.get("network", [])
        if not any(target.startswith(host) for host in allowed_hosts):
            raise PermissionError(f"Network access to {target} denied")

    if operation in ["read", "write", "execute"]:
        allowed_paths = policy.get("filesystem", {}).get(operation, [])
        if not any(fnmatch.fnmatch(target, pattern) for pattern in allowed_paths):
            raise PermissionError(f"{operation} access to {target} denied")

    return True
```

### 4. User Consent & Dry-Run Mode

**Before Destructive Operations:**

```python
async def execute_tool_with_consent(tool_name: str, params: Dict) -> Any:
    """Require user consent before destructive operations."""

    # Show what will happen
    preview = f"""
    Tool: {tool_name}
    Action: {params.get('action')}
    Target: {params.get('target')}

    This will:
    - Write to: {params.get('output_path')}
    - Access network: {params.get('url')}

    Proceed? [y/N]:
    """

    print(preview)

    if not get_user_consent():
        raise UserCancelledError("Operation cancelled by user")

    # Execute with audit logging
    with audit_log(tool_name, params):
        return await execute_tool(tool_name, params)
```

**Dry-Run Mode:**

```bash
# Show what would happen without executing
python -m src.agent --mode dry-run --enable-mcp-servers

# Output:
# DRY RUN: Would call search_jobs(keywords=['python'], location='London')
# DRY RUN: Would write 50 jobs to ./output/jobs.json
# DRY RUN: Would send Slack notification with 5 high-score jobs
```

### 5. Input Validation & Sanitization

**Schema Validation:**

```python
from pydantic import BaseModel, HttpUrl, constr, validator

class SearchJobsRequest(BaseModel):
    """Strict schema for job search requests."""

    keywords: List[constr(max_length=100)] = []  # Limit length
    location: Optional[constr(max_length=200)]
    page: int = Field(ge=1, le=100)  # Limit page range

    @validator('keywords')
    def sanitize_keywords(cls, v):
        """Prevent injection attacks."""
        dangerous_patterns = [
            r'[;&|`$]',  # Shell metacharacters
            r'\.\.',     # Path traversal
            r'<script',  # XSS
            r'DROP\s+TABLE',  # SQL injection
        ]

        for keyword in v:
            for pattern in dangerous_patterns:
                if re.search(pattern, keyword, re.IGNORECASE):
                    raise ValueError(f"Dangerous pattern detected: {pattern}")

        return v

# Use strict validation before passing to MCP
request = SearchJobsRequest(**user_input)  # Raises ValidationError if invalid
```

**Escape Shell Commands:**

```python
# ❌ NEVER DO THIS
os.system(f"node {server_path} --input {user_input}")  # Shell injection!

# ✅ DO THIS INSTEAD
subprocess.run(
    ["node", server_path, "--input", user_input],
    shell=False,  # Never use shell=True
    timeout=30,
    capture_output=True,
    check=True
)
```

### 6. Supply Chain Security

**Pin Versions & Verify:**

```python
# Install with hash verification
pip install \
  --require-hashes \
  --only-binary :all: \
  mcp==1.16.0 \
  --hash sha256:abcd1234...

# For Node.js MCP servers
npm ci  # Use lockfile
npm audit  # Check for vulnerabilities
```

**Verify Before Use:**

```bash
#!/bin/bash
# Verify MCP server before running

SERVER_PATH="$1"
EXPECTED_HASH="sha256:abcd1234..."

# Compute hash
ACTUAL_HASH=$(sha256sum "$SERVER_PATH" | cut -d' ' -f1)

if [ "$ACTUAL_HASH" != "$EXPECTED_HASH" ]; then
  echo "❌ Hash mismatch! Server may be compromised."
  exit 1
fi

# Run static analysis
eslint "$SERVER_PATH"
bandit -r "$SERVER_PATH"  # For Python

echo "✅ Verification passed"
```

**Generate SBOM:**

```bash
# Python
pip-audit --format json > sbom.json

# Node.js
npm sbom --sbom-format cyclonedx > sbom.json

# Scan for vulnerabilities
grype sbom:./sbom.json
```

### 7. Multi-Tenancy Isolation

**Never Mix User Data:**

```python
class MCPServerPool:
    """Per-user MCP server instances."""

    def __init__(self):
        self.servers = {}  # user_id -> server instance

    def get_server(self, user_id: str) -> MCPServer:
        """Get isolated server for user."""
        if user_id not in self.servers:
            # Launch isolated server per user
            self.servers[user_id] = launch_isolated_server(
                user_id=user_id,
                workspace=f"/workspaces/{user_id}",
                network_policy=f"allow-{user_id}",
                secrets=load_user_secrets(user_id)
            )

        return self.servers[user_id]

    def cleanup_user(self, user_id: str):
        """Destroy user's server and data."""
        if user_id in self.servers:
            self.servers[user_id].terminate()
            shutil.rmtree(f"/workspaces/{user_id}", ignore_errors=True)
            del self.servers[user_id]
```

**Tenant-Aware Middleware:**

```python
def tenant_middleware(request):
    """Enforce tenant isolation at request level."""
    tenant_id = extract_tenant_id(request)

    # Validate tenant can access this MCP server
    if not authorize_tenant(tenant_id, request.mcp_server):
        raise PermissionError("Tenant not authorized for this server")

    # Inject tenant context
    request.context["tenant_id"] = tenant_id
    request.context["allowed_data"] = get_tenant_data_scope(tenant_id)

    return request
```

### 8. Observability & Audit Logging

**Structured Audit Logs:**

```python
import structlog

audit_logger = structlog.get_logger("mcp.audit")

def audit_mcp_call(tool_name: str, user_id: str, params: Dict, result: Any):
    """Log all MCP tool invocations."""
    audit_logger.info(
        "mcp_tool_invoked",
        tool=tool_name,
        user_id=user_id,
        timestamp=datetime.utcnow().isoformat(),
        params=redact_sensitive_fields(params),
        result_size=len(str(result)),
        network_access=params.get("url"),
        filesystem_access=params.get("file_path"),
        duration_ms=result.get("duration_ms")
    )
```

**Anomaly Detection:**

```python
class AnomalyDetector:
    """Detect suspicious MCP activity."""

    def check_anomalies(self, event: Dict) -> List[str]:
        warnings = []

        # Detect excessive filesystem access
        if event.get("files_accessed", 0) > 100:
            warnings.append("Excessive filesystem access")

        # Detect wide reads (credential harvesting)
        paths = event.get("file_paths", [])
        sensitive_patterns = [".ssh", ".aws", ".env", "cookie"]
        if any(p in str(paths) for p in sensitive_patterns):
            warnings.append("Access to sensitive paths detected")

        # Detect high egress (data exfil)
        if event.get("bytes_uploaded", 0) > 10_000_000:  # 10MB
            warnings.append("High network egress detected")

        # Detect rapid requests (abuse)
        if event.get("requests_per_minute", 0) > 100:
            warnings.append("Rate limit exceeded")

        return warnings
```

**Rate Limiting:**

```python
from functools import wraps
from time import time

class RateLimiter:
    def __init__(self, max_calls: int, period: int):
        self.max_calls = max_calls
        self.period = period
        self.calls = []

    def __call__(self, func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            now = time()

            # Remove old calls
            self.calls = [c for c in self.calls if c > now - self.period]

            # Check limit
            if len(self.calls) >= self.max_calls:
                raise RateLimitError(
                    f"Rate limit exceeded: {self.max_calls} calls per {self.period}s"
                )

            self.calls.append(now)
            return await func(*args, **kwargs)

        return wrapper

# Usage
@RateLimiter(max_calls=100, period=3600)  # 100 calls per hour
async def search_jobs_mcp(keywords):
    # ... MCP call ...
    pass
```

### 9. Panic Button & Revocation

**Quick Disable:**

```python
def disable_mcp_server(server_name: str, reason: str):
    """Emergency disable of MCP server."""

    # Update config
    config = load_config()
    config["mcp_servers"][server_name]["enabled"] = False
    save_config(config)

    # Kill running processes
    kill_mcp_processes(server_name)

    # Revoke credentials
    revoke_credentials(server_name)

    # Alert
    send_alert(
        severity="HIGH",
        message=f"MCP server '{server_name}' disabled: {reason}"
    )

    # Audit log
    audit_logger.critical(
        "mcp_server_disabled",
        server=server_name,
        reason=reason,
        timestamp=datetime.utcnow().isoformat()
    )
```

**User-Accessible Panic Button:**

```bash
# Emergency stop script
./scripts/mcp-panic-stop.sh <server_name>

# Output:
# 🚨 EMERGENCY STOP INITIATED
# ✅ Disabled server in config
# ✅ Killed 3 processes
# ✅ Revoked API credentials
# ✅ Alert sent to admin
```

---

## 🔧 Implementation Checklist

### For Job Scraper Project

- [ ] **Sandbox JobSpy MCP** - Run in Docker with `--network none` by default
- [ ] **Secrets Management** - Move `REED_API_KEY` to environment only (never in config)
- [ ] **Input Validation** - Add Pydantic schemas for all MCP requests
- [ ] **Audit Logging** - Log all MCP calls with structured logs
- [ ] **Rate Limiting** - Implement per-server rate limits
- [ ] **Panic Button** - Add `./scripts/disable-mcp-server.sh` script
- [ ] **Documentation** - Document security implications in README
- [ ] **Testing** - Run `scripts/validate-mcp-scrapers.py` security tests

### For Publishing MCP Servers (If Applicable)

- [ ] **SECURITY.md** - Document threat model and safe defaults
- [ ] **Signed Releases** - Sign releases with GPG, publish checksums
- [ ] **SBOM** - Generate and publish Software Bill of Materials
- [ ] **Auth Built-In** - Use OIDC/OAuth, not "paste your cookie"
- [ ] **RBAC** - Implement per-tool permissions
- [ ] **Introspection** - Provide `get_my_permissions` tool
- [ ] **Security Scanning** - CI pipeline with Snyk/Grype/Trivy
- [ ] **Vulnerability Disclosure** - security@yourdomain.com

---

## 📚 References & Resources

- **MCP Security Spec:** https://modelcontextprotocol.io/docs/security
- **Anthropic Security Guidance:** https://docs.anthropic.com/claude/docs/security
- **OWASP Top 10:** https://owasp.org/www-project-top-ten/
- **CWE-78 (Command Injection):** https://cwe.mitre.org/data/definitions/78.html
- **Supply Chain Security:** https://slsa.dev/

---

## ⚠️ Current Status: Job Scraper Project

**Security Posture:**

| Control | Status | Risk |
|---------|--------|------|
| **Sandbox Execution** | ❌ Not Implemented | 🔴 HIGH |
| **Credential Management** | ⚠️ Partial (env vars used) | 🟡 MEDIUM |
| **Input Validation** | ⚠️ Basic (httpx handles some) | 🟡 MEDIUM |
| **Audit Logging** | ❌ Not Implemented | 🟡 MEDIUM |
| **Rate Limiting** | ❌ Not Implemented | 🟡 MEDIUM |
| **Shell Injection** | ✅ Safe (subprocess lists, no shell=True) | 🟢 LOW |
| **Supply Chain** | ⚠️ Pinned versions, no hash verify | 🟡 MEDIUM |

**Recommended Actions (Priority Order):**

1. **🔴 CRITICAL:** Implement Docker sandbox for JobSpy MCP
2. **🔴 CRITICAL:** Add secrets scanning to CI (detect credentials in config)
3. **🟡 HIGH:** Implement audit logging for all MCP calls
4. **🟡 HIGH:** Add rate limiting per MCP server
5. **🟡 MEDIUM:** Create panic button script
6. **🟢 LOW:** Add hash verification for MCP server files

---

*Document created: 2025-10-03*
*Last updated: 2025-10-03*
*Owner: Chad Boyd (@cboyd0319)*
*Security is not optional - protect your users!*
