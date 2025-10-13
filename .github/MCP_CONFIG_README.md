# MCP Server Configuration Guide

This directory contains the configuration for Model Context Protocol (MCP) servers used by GitHub Copilot.

## Current Configuration

The file `copilot-mcp.json` configures external MCP servers that enhance Copilot's capabilities.

### Configured Servers

| Server | Type | Status | Requirements |
|--------|------|--------|--------------|
| **context7** | HTTP | ⚠️ Needs API Key | `COPILOT_MCP_CONTEXT7_API_KEY` secret |
| **openai-websearch** | Local | ⚠️ Needs API Key | `COPILOT_MCP_OPENAI_API_KEY` secret |
| **fetch** | Local | ✅ Ready | None (npx available) |
| **playwright** | Local | ✅ Ready | None (npx available) |

### Built-in GitHub MCP Server

**Important:** GitHub Copilot has built-in MCP tools for GitHub operations (repositories, issues, PRs, etc.) that do **NOT** need to be configured in `copilot-mcp.json`. These tools use OAuth authentication through Copilot's built-in integration.

❌ **Do NOT use Personal Access Tokens (PAT)** for GitHub MCP server - they are not supported  
✅ GitHub MCP tools work automatically through Copilot's OAuth

The `COPILOT_MCP_GITHUB_PERSONAL_ACCESS_TOKEN` secret (if present) is reserved for other GitHub API integrations, **not** for MCP server authentication.

## Setup Instructions

### 1. Configure API Keys (Optional)

To enable the context7 and openai-websearch servers, add these secrets to your GitHub repository:

**Repository Settings → Secrets and variables → Actions → New repository secret**

1. **COPILOT_MCP_CONTEXT7_API_KEY**
   - Get your API key from https://context7.com
   - This enables up-to-date documentation lookup for Python, Playwright, Flask, etc.

2. **COPILOT_MCP_OPENAI_API_KEY**
   - Get your API key from https://platform.openai.com
   - This enables web search capabilities through OpenAI

### 2. Validate Configuration

Run the validation script to check all MCP servers:

```bash
python3 scripts/validate_mcp_config.py
```

Expected output:
```
Total servers: 4
Passed: 2-4 (depending on API key configuration)
Failed: 0-2
```

### 3. Test Connectivity

The validation script checks:
- ✅ Command availability (uvx, npx)
- ✅ Environment variables (API keys)
- ✅ Basic connectivity (HTTP endpoints)

## Server Details

### context7 (HTTP)
**Purpose:** Version-specific documentation and code examples  
**Cost:** Freemium (100 queries/month free)  
**Setup:** Requires API key from https://context7.com

### openai-websearch (Local/uvx)
**Purpose:** Web search through OpenAI  
**Cost:** Pay-per-use (OpenAI pricing)  
**Setup:** Requires OpenAI API key

### fetch (Local/npx)
**Purpose:** Fetch web content for analysis  
**Cost:** Free  
**Setup:** None (uses npx)

### playwright (Local/npx)
**Purpose:** Browser automation for testing  
**Cost:** Free  
**Setup:** None (uses npx)

## Troubleshooting

### "Personal Access Tokens are not supported for this endpoint"

This error occurs when trying to use a PAT with the GitHub MCP server endpoint (`https://api.githubcopilot.com/mcp/`).

**Solution:** Don't add GitHub MCP server to `copilot-mcp.json`. The GitHub tools are built-in to Copilot and use OAuth authentication automatically.

### "API key environment variable not set"

**For local development:**
```bash
export COPILOT_MCP_CONTEXT7_API_KEY="your-key-here"
export COPILOT_MCP_OPENAI_API_KEY="your-key-here"
```

**For GitHub Actions / Copilot:**
Add secrets in Repository Settings → Secrets and variables → Actions

### "Command not found: uvx/npx"

**uvx:** Install uv package manager
```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

**npx:** Install Node.js (includes npm/npx)
```bash
# Ubuntu/Debian
sudo apt-get install nodejs npm

# macOS
brew install node
```

### Server connectivity issues

Run validation script with verbose output:
```bash
python3 scripts/validate_mcp_config.py
```

Check:
1. Network connectivity to HTTP endpoints
2. API keys are correctly set
3. Commands (uvx, npx) are in PATH

## Adding Custom MCP Servers

To add a new MCP server, edit `copilot-mcp.json`:

```json
{
  "mcpServers": {
    "your-server-name": {
      "description": "What this server does",
      "type": "http" | "local",
      "url": "https://your-endpoint.com/mcp",  // for HTTP
      "command": "your-command",                 // for local
      "args": ["arg1", "arg2"],                 // for local
      "headers": {                               // for HTTP
        "API_KEY": "$YOUR_SECRET_NAME"
      },
      "env": {                                   // for local
        "API_KEY": "$YOUR_SECRET_NAME"
      },
      "tools": ["*"]  // or specific tool names
    }
  }
}
```

Then run validation:
```bash
python3 scripts/validate_mcp_config.py
```

## References

- [MCP Specification](https://modelcontextprotocol.io)
- [GitHub MCP Server Guide](https://github.blog/ai-and-ml/generative-ai/a-practical-guide-on-how-to-use-the-github-mcp-server/)
- [JobSentinel MCP Integration Docs](../docs/MCP_INTEGRATION.md)

## Security Notes

🔒 **Never commit API keys to version control**  
🔒 **Use environment variables or GitHub Secrets**  
🔒 **Rotate keys regularly**  
🔒 **Use minimum required permissions**

API keys should be:
- Stored in GitHub Secrets (for CI/CD)
- Stored in `.env` file (for local development, gitignored)
- Referenced as environment variables in config (`$VAR_NAME`)
