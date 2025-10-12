"""
MCP Server Integration Domain

Enables JobSentinel to connect to Model Context Protocol (MCP) servers
for enhanced capabilities:
- Context7: Industry knowledge and best practices
- Custom MCP servers: Company data, market intelligence
- Knowledge bases: Real-time information access
- AI agent orchestration

References:
- MCP Specification | https://modelcontextprotocol.io | High | Standard protocol
- Context7 | https://context7.com | Medium | Industry knowledge server
- Anthropic MCP | https://github.com/anthropics/mcp | High | Reference implementation

Security:
- OWASP ASVS V5.1 input validation
- TLS/SSL for remote connections
- API key management per NIST SP 800-63B
- Rate limiting per server
"""

from .mcp_client import MCPClient, MCPServerConfig, MCPTransport
from .context7_client import Context7Client, Context7Query, Context7Response
from .knowledge_enhancer import KnowledgeEnhancer, KnowledgeRequest, KnowledgeResponse

__all__ = [
    "MCPClient",
    "MCPServerConfig",
    "MCPTransport",
    "Context7Client",
    "Context7Query",
    "Context7Response",
    "KnowledgeEnhancer",
    "KnowledgeRequest",
    "KnowledgeResponse",
]
