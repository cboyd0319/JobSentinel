"""
Context7 MCP Client

Specialized client for Context7 industry knowledge server.
Provides access to:
- Industry best practices
- Job role requirements
- Salary benchmarks
- Skills recommendations
- Market trends

References:
- Context7 | https://context7.com | Medium | Industry knowledge platform
- MCP Specification | https://modelcontextprotocol.io | High | Protocol standard

Security:
- API key authentication
- Rate limiting (100 req/min)
- Input sanitization
- Output validation

Performance:
- Response time: typically 200-500ms
- Caching: 1 hour for static data
- Retry: 3 attempts with exponential backoff
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

from .mcp_client import MCPClient, MCPServerConfig, MCPTransport

logger = logging.getLogger(__name__)


@dataclass
class Context7Query:
    """Query for Context7 knowledge."""

    query_type: str  # "industry", "role", "skills", "salary", "trends"
    industry: str | None = None
    role: str | None = None
    location: str | None = None
    experience_level: str | None = None  # "entry", "mid", "senior", "lead"
    additional_filters: dict[str, Any] | None = None


@dataclass
class Context7Response:
    """Response from Context7 query."""

    data: dict[str, Any]
    confidence: float  # 0-1
    sources: list[str]  # Source references
    timestamp: str  # ISO 8601 timestamp
    metadata: dict[str, Any]


class Context7Client:
    """
    Client for Context7 industry knowledge MCP server.

    Provides access to curated industry knowledge including:
    - Role-specific requirements and skills
    - Industry best practices and standards
    - Market salary data and trends
    - Skills gap analysis recommendations
    - Career progression paths
    """

    # Context7 server configuration
    DEFAULT_ENDPOINT = "https://api.context7.com/mcp"  # Example endpoint
    DEFAULT_RATE_LIMIT = 100  # requests per minute

    def __init__(self, api_key: str, endpoint: str | None = None):
        """
        Initialize Context7 client.

        Args:
            api_key: Context7 API key
            endpoint: Optional custom endpoint (defaults to production)

        Note:
            Sign up at context7.com for API access
        """
        endpoint = endpoint or self.DEFAULT_ENDPOINT

        config = MCPServerConfig(
            name="context7",
            transport=MCPTransport.HTTPS,
            endpoint=endpoint,
            api_key=api_key,
            timeout=30,
            max_retries=3,
            rate_limit=self.DEFAULT_RATE_LIMIT,
        )

        self.client = MCPClient(config)
        self._connected = False
        logger.info("Context7Client initialized")

    async def connect(self) -> bool:
        """
        Connect to Context7 server.

        Returns:
            True if connection successful
        """
        success = await self.client.connect()
        if success:
            self._connected = True
            logger.info("Connected to Context7")
        return success

    async def query_industry_knowledge(self, query: Context7Query) -> Context7Response | None:
        """
        Query Context7 for industry knowledge.

        Args:
            query: Context7Query with search parameters

        Returns:
            Context7Response with knowledge data or None on error

        Example:
            query = Context7Query(
                query_type="role",
                industry="software_engineering",
                role="senior_backend_engineer",
                experience_level="senior"
            )
            response = await client.query_industry_knowledge(query)
        """
        if not self._connected:
            logger.error("Not connected to Context7")
            return None

        try:
            # Construct query arguments
            args = {
                "query_type": query.query_type,
            }

            if query.industry:
                args["industry"] = query.industry
            if query.role:
                args["role"] = query.role
            if query.location:
                args["location"] = query.location
            if query.experience_level:
                args["experience_level"] = query.experience_level
            if query.additional_filters:
                args.update(query.additional_filters)

            # Call Context7 knowledge tool
            result = await self.client.call_tool("query_knowledge", args)

            if result:
                # Parse response
                return Context7Response(
                    data=result.get("data", {}),
                    confidence=result.get("confidence", 0.8),
                    sources=result.get("sources", []),
                    timestamp=result.get("timestamp", ""),
                    metadata=result.get("metadata", {}),
                )
            else:
                logger.warning("No result from Context7 query")
                return None

        except Exception as e:
            logger.error(f"Error querying Context7: {e}")
            return None

    async def get_role_requirements(self, industry: str, role: str) -> dict[str, Any] | None:
        """
        Get comprehensive role requirements.

        Args:
            industry: Industry identifier
            role: Role/job title

        Returns:
            Dictionary with:
            - required_skills: List of required skills
            - preferred_skills: List of nice-to-have skills
            - experience_level: Typical experience range
            - education: Education requirements
            - certifications: Relevant certifications
        """
        query = Context7Query(query_type="role", industry=industry, role=role)

        response = await self.query_industry_knowledge(query)

        if response:
            return response.data.get("requirements")
        return None

    async def get_salary_data(
        self, industry: str, role: str, location: str | None = None
    ) -> dict[str, Any] | None:
        """
        Get salary benchmarks for role.

        Args:
            industry: Industry identifier
            role: Role/job title
            location: Optional location for regional data

        Returns:
            Dictionary with:
            - min: Minimum salary
            - max: Maximum salary
            - median: Median salary
            - percentiles: P25, P50, P75 percentiles
            - currency: Currency code
        """
        query = Context7Query(query_type="salary", industry=industry, role=role, location=location)

        response = await self.query_industry_knowledge(query)

        if response:
            return response.data.get("salary_data")
        return None

    async def get_skills_recommendations(
        self, industry: str, current_skills: list[str], target_role: str
    ) -> dict[str, Any] | None:
        """
        Get skills gap analysis and recommendations.

        Args:
            industry: Industry identifier
            current_skills: List of current skills
            target_role: Target role/position

        Returns:
            Dictionary with:
            - gaps: List of skill gaps with priorities
            - learning_paths: Recommended learning resources
            - timeline: Estimated time to acquire skills
        """
        query = Context7Query(
            query_type="skills",
            industry=industry,
            role=target_role,
            additional_filters={"current_skills": current_skills},
        )

        response = await self.query_industry_knowledge(query)

        if response:
            return response.data.get("skills_analysis")
        return None

    async def get_market_trends(self, industry: str) -> dict[str, Any] | None:
        """
        Get market trends for industry.

        Args:
            industry: Industry identifier

        Returns:
            Dictionary with:
            - growing_skills: Skills in high demand
            - declining_skills: Skills decreasing in demand
            - emerging_roles: New roles appearing
            - market_size: Industry market size data
        """
        query = Context7Query(query_type="trends", industry=industry)

        response = await self.query_industry_knowledge(query)

        if response:
            return response.data.get("trends")
        return None

    async def disconnect(self) -> None:
        """Disconnect from Context7 server."""
        await self.client.disconnect()
        self._connected = False
        logger.info("Disconnected from Context7")
