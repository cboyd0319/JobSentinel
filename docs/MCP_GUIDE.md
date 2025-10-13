# Model Context Protocol (MCP) Integration Guide

**Last Updated:** October 13, 2025  
**Status:** ✅ Operational (2 servers ready, 2 optional with API keys)

## TL;DR

JobSentinel uses Model Context Protocol (MCP) servers to enhance GitHub Copilot with external knowledge sources. Two servers work out-of-the-box (`fetch`, `playwright`), two are optional and require API keys (`context7`, `openai-websearch`). GitHub operations work automatically through Copilot's built-in OAuth.

**Quick actions:**
- Validate config: `python scripts/validate_mcp_config.py`
- Test connections: Check validation script output
- Add API keys: Repository Settings → Secrets → Actions (optional)

---

## What is MCP?

**Model Context Protocol** is an open standard that lets AI assistants (like GitHub Copilot) access external data sources and tools through a standardized interface.

### Key Benefits
- **Up-to-date documentation** — Context7 provides current library docs (Python, Playwright, Flask, etc.)
- **Web search** — OpenAI web search for real-time information
- **Browser automation** — Playwright server for web scraping and testing
- **HTTP client** — Fetch server for API requests
- **GitHub operations** — Built-in server for repos, issues, PRs (no config needed)

### References
- [MCP Specification](https://modelcontextprotocol.io/specification)
- [MCP Server Registry](https://github.com/modelcontextprotocol/servers)
- [Anthropic MCP Documentation](https://docs.anthropic.com/en/docs/agents-and-tools)

---

## Current Configuration

Configuration file: `.github/copilot-mcp.json`

| Server | Type | Status | Requirements |
|--------|------|--------|--------------|
| **fetch** | Local (npx) | ✅ Ready | None (npx available) |
| **playwright** | Local (npx) | ✅ Ready | None (npx available) |
| **context7** | HTTP | ⚠️ Needs API Key | `COPILOT_MCP_CONTEXT7_API_KEY` secret |
| **openai-websearch** | Local (uvx) | ⚠️ Needs API Key | `COPILOT_MCP_OPENAI_API_KEY` secret |
| **GitHub** | Built-in | ✅ Ready | OAuth (automatic) |

### ✅ What Works Out-of-the-Box

1. **fetch** — HTTP requests to public APIs
2. **playwright** — Browser automation and scraping
3. **GitHub operations** — Repos, issues, PRs, workflows (OAuth-based, no config needed)

### ⚠️ What Needs API Keys (Optional)

1. **context7** — Library documentation lookup
   - Get API key: https://context7.com
   - Add secret: `COPILOT_MCP_CONTEXT7_API_KEY`

2. **openai-websearch** — Web search via OpenAI
   - Get API key: https://platform.openai.com
   - Add secret: `COPILOT_MCP_OPENAI_API_KEY`

---

## Setup Instructions

### Prerequisites
- Node.js/npm installed (for `npx` commands)
- Python 3.11+ with `uv` or `uvx` (for OpenAI web search, optional)
- GitHub Copilot enabled in VS Code or GitHub Codespaces

### Option 1: Use Without API Keys (Default)
The `fetch` and `playwright` servers work immediately. No setup required.

```bash
# Validate configuration
python scripts/validate_mcp_config.py

# Expected output:
# ✅ fetch: Ready (npx available)
# ✅ playwright: Ready (npx available)
# ⚠️ context7: Needs API key
# ⚠️ openai-websearch: Needs API key
# ✅ GitHub: Built-in (OAuth)
```

### Option 2: Enable All Servers (Recommended)

#### Step 1: Get API Keys

1. **Context7 API Key**
   - Sign up at https://context7.com
   - Navigate to API Keys section
   - Create new key (free tier available)

2. **OpenAI API Key**
   - Sign up at https://platform.openai.com
   - Navigate to API Keys section
   - Create new key with appropriate billing limits

#### Step 2: Add Secrets to GitHub Repository

**Repository Settings → Secrets and variables → Actions → New repository secret**

Add two secrets:

| Name | Value |
|------|-------|
| `COPILOT_MCP_CONTEXT7_API_KEY` | Your Context7 API key |
| `COPILOT_MCP_OPENAI_API_KEY` | Your OpenAI API key |

**Security note:** These secrets are only accessible to GitHub Actions. They are not exposed in logs or to external services.

#### Step 3: Validate Configuration

```bash
# Run validation with secrets (if testing locally)
export COPILOT_MCP_CONTEXT7_API_KEY="your-key"
export COPILOT_MCP_OPENAI_API_KEY="your-key"
python scripts/validate_mcp_config.py

# Expected output:
# ✅ All servers operational
```

#### Step 4: Test in GitHub Copilot

Open VS Code or GitHub Codespaces:

1. Open GitHub Copilot Chat
2. Try context7: "Show me the latest Playwright API for page.goto()"
3. Try web search: "What are the current best practices for Python asyncio?"
4. Try fetch: "Make a GET request to https://api.github.com/zen"

---

## Server Details

### 1. fetch (Local/npx)
**Purpose:** HTTP client for API requests  
**Type:** Local server via `@modelcontextprotocol/server-fetch`  
**Status:** ✅ Ready (no config needed)

**Example use cases:**
- Query public REST APIs
- Fetch JSON data
- Test API endpoints
- Download content

**Configuration:**
```json
{
  "fetch": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-fetch"]
  }
}
```

### 2. playwright (Local/npx)
**Purpose:** Browser automation and web scraping  
**Type:** Local server via `@modelcontextprotocol/server-playwright`  
**Status:** ✅ Ready (no config needed)

**Example use cases:**
- Scrape job listings from public sites
- Test web UI interactions
- Capture screenshots
- Automate browser tasks

**Configuration:**
```json
{
  "playwright": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-playwright"]
  }
}
```

### 3. context7 (HTTP)
**Purpose:** Up-to-date library documentation  
**Type:** HTTP API server  
**Status:** ⚠️ Requires API key

**Supported libraries:**
- Python stdlib, Django, Flask, FastAPI
- JavaScript: React, Next.js, Express
- Testing: Playwright, Pytest, Jest
- Data: Pandas, NumPy, SQLAlchemy
- 100+ more libraries

**Configuration:**
```json
{
  "context7": {
    "url": "https://api.context7.com/v1/mcp",
    "headers": {
      "Authorization": "Bearer ${COPILOT_MCP_CONTEXT7_API_KEY}"
    }
  }
}
```

**Example queries:**
- "Show me Flask Blueprint API documentation"
- "What's the latest Pydantic v2 validation syntax?"
- "Playwright page.locator() method examples"

### 4. openai-websearch (Local/uvx)
**Purpose:** Web search via OpenAI  
**Type:** Local server via Python package  
**Status:** ⚠️ Requires API key

**Example use cases:**
- Current events and trends
- Latest best practices
- Technology comparisons
- Real-time information

**Configuration:**
```json
{
  "openai-websearch": {
    "command": "uvx",
    "args": ["mcp-server-openai-websearch"],
    "env": {
      "OPENAI_API_KEY": "${COPILOT_MCP_OPENAI_API_KEY}"
    }
  }
}
```

**Install uvx (if needed):**
```bash
# macOS
brew install uv

# Ubuntu/Debian
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### 5. GitHub (Built-in)
**Purpose:** GitHub operations (repos, issues, PRs, workflows)  
**Type:** Built-in to GitHub Copilot  
**Status:** ✅ Ready (OAuth-based, no config needed)

**Example capabilities:**
- List issues and PRs
- Create branches
- Search code
- Trigger workflows
- Read repository contents

**Important:** ❌ **Do NOT configure GitHub MCP server manually**. It uses OAuth through Copilot's built-in integration. Personal Access Tokens (PAT) are not supported for MCP authentication.

---

## Troubleshooting

### Error: "Personal Access Tokens are not supported for this endpoint"

**Symptom:** GitHub MCP server fails with PAT authentication error

**Cause:** GitHub MCP uses OAuth, not Personal Access Tokens

**Fix:** Remove any manual GitHub MCP server configuration from `copilot-mcp.json`. The built-in server works automatically through Copilot's OAuth.

```json
{
  // ❌ REMOVE THIS - not needed
  "github": {
    "command": "...",
    "env": {
      "GITHUB_PERSONAL_ACCESS_TOKEN": "..."
    }
  }
}
```

### Error: "API key environment variable not set"

**Symptom:** Context7 or OpenAI web search fails

**Cause:** Missing API key secret in GitHub repository

**Fix:**
1. Verify secrets exist: Repository Settings → Secrets → Actions
2. Check secret names match exactly:
   - `COPILOT_MCP_CONTEXT7_API_KEY`
   - `COPILOT_MCP_OPENAI_API_KEY`
3. For local testing, export environment variables:
   ```bash
   export COPILOT_MCP_CONTEXT7_API_KEY="your-key"
   export COPILOT_MCP_OPENAI_API_KEY="your-key"
   ```

### Error: "Command not found: uvx"

**Symptom:** OpenAI web search server fails to start

**Cause:** `uv` not installed

**Fix:**
```bash
# macOS
brew install uv

# Ubuntu/Debian
curl -LsSf https://astral.sh/uv/install.sh | sh
source $HOME/.local/bin/env

# Verify installation
uvx --version
```

### Error: "Command not found: npx"

**Symptom:** fetch or playwright servers fail to start

**Cause:** Node.js/npm not installed

**Fix:**
```bash
# macOS
brew install node

# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
npx --version
```

### Server connectivity issues

**Symptom:** MCP server connects but queries fail

**Debugging steps:**
1. Run validation script: `python scripts/validate_mcp_config.py`
2. Check server logs in VS Code: Output panel → GitHub Copilot
3. Verify network connectivity to external services
4. Test API keys directly:
   ```bash
   # Test Context7
   curl -H "Authorization: Bearer YOUR_KEY" https://api.context7.com/v1/health
   
   # Test OpenAI
   curl -H "Authorization: Bearer YOUR_KEY" https://api.openai.com/v1/models
   ```

---

## Security Considerations

### API Key Management
- ✅ Store keys as GitHub Secrets (encrypted at rest)
- ✅ Use repository secrets, not organization secrets (least privilege)
- ❌ Never commit API keys to version control
- ❌ Never log API keys in debug output

### Rate Limiting
- Context7: Free tier has rate limits (check your plan)
- OpenAI: Set billing limits to prevent unexpected costs
- Fetch/Playwright: Respect target site robots.txt and rate limits

### Data Privacy
- MCP servers may send queries to external services
- Context7: Sends library names/versions only (no code)
- OpenAI: Sends query text to OpenAI API
- Fetch/Playwright: You control what data is sent/retrieved

---

## Testing & Validation

### Automated Validation Script

```bash
# Full validation
python scripts/validate_mcp_config.py

# Expected output format:
# ✅ fetch: Ready (npx available)
# ✅ playwright: Ready (npx available)
# ⚠️ context7: Needs API key (COPILOT_MCP_CONTEXT7_API_KEY)
# ⚠️ openai-websearch: Needs API key (COPILOT_MCP_OPENAI_API_KEY)
# ✅ GitHub: Built-in (OAuth)
#
# Summary: 3/5 servers operational
```

### Manual Testing in Copilot Chat

1. **Test fetch:**
   ```
   @github Use MCP fetch server to get https://api.github.com/zen
   ```

2. **Test playwright:**
   ```
   @github Use MCP playwright to take a screenshot of https://github.com
   ```

3. **Test context7 (if configured):**
   ```
   @github Use MCP context7 to show Flask Blueprint documentation
   ```

4. **Test web search (if configured):**
   ```
   @github Search the web for "Python 3.13 new features"
   ```

---

## Advanced Configuration

### Custom MCP Servers

You can add custom MCP servers to `copilot-mcp.json`. See template in `examples/custom_mcp_server.py`.

**Example custom server:**
```json
{
  "custom-api": {
    "command": "python",
    "args": ["path/to/custom_mcp_server.py"],
    "env": {
      "API_KEY": "${CUSTOM_API_KEY}"
    }
  }
}
```

### Planned Integrations (v0.7+)

| Server | Purpose | Status |
|--------|---------|--------|
| **BLS OEWS** | Salary data (Bureau of Labor Statistics) | ✅ Built-in |
| **LinkedIn Skills Graph** | Skills taxonomy and mapping | 📋 Planned v0.7 |
| **OpenRouter** | Multi-LLM gateway | 📋 Planned v0.7 |

---

## Related Documentation

- [API Integration Guide](API_INTEGRATION_GUIDE.md) — Adding job board scrapers
- [Best Practices](BEST_PRACTICES.md) — Production-grade patterns
- [Architecture](ARCHITECTURE.md) — System design and data flow
- [Security](../SECURITY.md) — Security policies and disclosure

---

## Quick Reference

| Task | Command |
|------|---------|
| Validate config | `python scripts/validate_mcp_config.py` |
| View config | `cat .github/copilot-mcp.json` |
| Add API key (local) | `export COPILOT_MCP_CONTEXT7_API_KEY="..."` |
| Test in Copilot | Open Copilot Chat, mention `@github` and server name |
| Check logs | VS Code → Output panel → GitHub Copilot |

**Need help?** See [Troubleshooting](#troubleshooting) or open an issue with:
- Output from `python scripts/validate_mcp_config.py`
- Relevant VS Code logs (Output → GitHub Copilot)
- Steps to reproduce
