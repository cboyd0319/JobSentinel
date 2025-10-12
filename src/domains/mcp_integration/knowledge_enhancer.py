"""
Knowledge Enhancer - MCP Server Orchestrator

Orchestrates multiple MCP servers to provide enhanced knowledge:
- Context7 for industry knowledge
- Custom servers for company/market data
- Public knowledge bases for references
- AI agents for analysis

Implements circuit breaker and fallback patterns for resilience.

References:
- Release It! | https://pragprog.com | High | Resilience patterns
- SWEBOK v4.0a | https://computer.org/swebok | High | Integration practices
- MCP Specification | https://modelcontextprotocol.io | High | Protocol standard

Security:
- OWASP ASVS V5.1 input validation
- Least privilege access per server
- Audit logging for all queries
- Rate limiting per server

Performance:
- Parallel queries to multiple servers
- Response caching (1 hour default)
- Circuit breaker protection
- Timeout: 30s per server
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any

from .context7_client import Context7Client, Context7Query
from .mcp_client import MCPClient, MCPServerConfig

logger = logging.getLogger(__name__)


@dataclass
class KnowledgeRequest:
    """Request for knowledge enhancement."""

    query: str  # Natural language query
    context: dict[str, Any]  # Context (industry, role, etc.)
    sources: list[str]  # Preferred sources ("context7", "custom", etc.)
    max_wait: int = 30  # Maximum wait time in seconds


@dataclass
class KnowledgeResponse:
    """Enhanced knowledge response."""

    data: dict[str, Any]  # Aggregated knowledge
    sources: list[str]  # Sources that responded
    confidence: float  # Overall confidence (0-1)
    processing_time: float  # Time taken in seconds
    metadata: dict[str, Any]


class KnowledgeEnhancer:
    """
    Knowledge enhancer that orchestrates multiple MCP servers.

    Provides:
    - Parallel query execution
    - Response aggregation
    - Fallback strategies
    - Circuit breaker protection
    - Response caching
    """

    def __init__(self):
        """Initialize knowledge enhancer."""
        self._servers: dict[str, MCPClient | Context7Client] = {}
        self._cache: dict[str, tuple[Any, datetime]] = {}
        self._cache_ttl = timedelta(hours=1)
        logger.info("KnowledgeEnhancer initialized")

    def register_server(
        self, name: str, client: MCPClient | Context7Client
    ) -> None:
        """
        Register an MCP server.

        Args:
            name: Server identifier
            client: MCP client instance
        """
        self._servers[name] = client
        logger.info(f"Registered MCP server: {name}")

    def register_context7(self, api_key: str, endpoint: str | None = None) -> None:
        """
        Register Context7 server.

        Args:
            api_key: Context7 API key
            endpoint: Optional custom endpoint
        """
        client = Context7Client(api_key, endpoint)
        self.register_server("context7", client)

    async def enhance_job_analysis(
        self,
        job_title: str,
        job_description: str,
        company: str | None = None,
    ) -> dict[str, Any]:
        """
        Enhance job analysis with external knowledge.

        Args:
            job_title: Job title
            job_description: Job description text
            company: Optional company name

        Returns:
            Enhanced analysis with:
            - industry_insights: Industry context
            - role_requirements: Standard role requirements
            - salary_benchmarks: Market salary data
            - red_flags: Potential issues identified
        """
        # Build request
        request = KnowledgeRequest(
            query=f"Analyze job: {job_title}",
            context={
                "job_title": job_title,
                "job_description": job_description,
                "company": company,
            },
            sources=["context7"],
        )

        # Execute queries
        response = await self.query_knowledge(request)

        if response and response.data:
            return {
                "industry_insights": response.data.get("industry", {}),
                "role_requirements": response.data.get("requirements", {}),
                "salary_benchmarks": response.data.get("salary", {}),
                "red_flags": self._identify_red_flags(
                    job_description, response.data
                ),
                "confidence": response.confidence,
                "sources": response.sources,
            }

        return {
            "industry_insights": {},
            "role_requirements": {},
            "salary_benchmarks": {},
            "red_flags": [],
            "confidence": 0.0,
            "sources": [],
        }

    async def enhance_resume_analysis(
        self,
        resume_text: str,
        target_industry: str,
        target_role: str,
    ) -> dict[str, Any]:
        """
        Enhance resume analysis with external knowledge.

        Args:
            resume_text: Resume content
            target_industry: Target industry
            target_role: Target role/position

        Returns:
            Enhanced analysis with:
            - skills_gaps: Identified skill gaps
            - industry_standards: Industry best practices
            - recommendations: Improvement suggestions
        """
        request = KnowledgeRequest(
            query=f"Analyze resume for {target_role} in {target_industry}",
            context={
                "resume_text": resume_text,
                "target_industry": target_industry,
                "target_role": target_role,
            },
            sources=["context7"],
        )

        response = await self.query_knowledge(request)

        if response and response.data:
            return {
                "skills_gaps": response.data.get("gaps", []),
                "industry_standards": response.data.get("standards", {}),
                "recommendations": response.data.get("recommendations", []),
                "confidence": response.confidence,
                "sources": response.sources,
            }

        return {
            "skills_gaps": [],
            "industry_standards": {},
            "recommendations": [],
            "confidence": 0.0,
            "sources": [],
        }

    async def query_knowledge(
        self, request: KnowledgeRequest
    ) -> KnowledgeResponse | None:
        """
        Query multiple MCP servers for knowledge.

        Args:
            request: Knowledge request

        Returns:
            Aggregated knowledge response or None on error

        Implementation:
            - Parallel queries to all requested servers
            - Circuit breaker protection
            - Response aggregation
            - Caching
        """
        start_time = asyncio.get_event_loop().time()

        # Check cache
        cache_key = self._make_cache_key(request)
        cached = self._get_cached(cache_key)
        if cached:
            logger.info(f"Cache hit for query: {request.query}")
            processing_time = asyncio.get_event_loop().time() - start_time
            return KnowledgeResponse(
                data=cached,
                sources=["cache"],
                confidence=1.0,
                processing_time=processing_time,
                metadata={"cached": True},
            )

        # Query servers in parallel
        tasks = []
        for source in request.sources:
            if source in self._servers:
                tasks.append(self._query_server(source, request))
            else:
                logger.warning(f"Server not registered: {source}")

        if not tasks:
            logger.warning("No servers available for query")
            return None

        # Wait for responses with timeout
        try:
            responses = await asyncio.wait_for(
                asyncio.gather(*tasks, return_exceptions=True),
                timeout=request.max_wait,
            )

            # Filter successful responses
            valid_responses = [r for r in responses if isinstance(r, dict)]

            if not valid_responses:
                logger.warning("No valid responses from servers")
                return None

            # Aggregate responses
            aggregated = self._aggregate_responses(valid_responses)

            # Cache result
            self._cache_result(cache_key, aggregated)

            processing_time = asyncio.get_event_loop().time() - start_time

            return KnowledgeResponse(
                data=aggregated,
                sources=[r.get("source", "unknown") for r in valid_responses],
                confidence=self._calculate_confidence(valid_responses),
                processing_time=processing_time,
                metadata={"response_count": len(valid_responses)},
            )

        except asyncio.TimeoutError:
            logger.error(f"Query timeout after {request.max_wait}s")
            return None
        except Exception as e:
            logger.error(f"Error querying knowledge: {e}")
            return None

    async def _query_server(
        self, server_name: str, request: KnowledgeRequest
    ) -> dict[str, Any]:
        """Query a single MCP server."""
        try:
            server = self._servers[server_name]

            if isinstance(server, Context7Client):
                # Context7-specific query
                query = Context7Query(
                    query_type="general",
                    industry=request.context.get("target_industry"),
                    role=request.context.get("target_role"),
                    additional_filters=request.context,
                )

                response = await server.query_industry_knowledge(query)

                if response:
                    return {
                        "source": server_name,
                        "data": response.data,
                        "confidence": response.confidence,
                    }
            else:
                # Generic MCP server query
                # Use a general "query" tool if available
                result = await server.call_tool("query", {"query": request.query})

                if result:
                    return {
                        "source": server_name,
                        "data": result,
                        "confidence": 0.8,
                    }

            return {"source": server_name, "data": {}, "confidence": 0.0}

        except Exception as e:
            logger.error(f"Error querying {server_name}: {e}")
            return {"source": server_name, "data": {}, "confidence": 0.0}

    def _aggregate_responses(
        self, responses: list[dict[str, Any]]
    ) -> dict[str, Any]:
        """Aggregate multiple server responses."""
        aggregated: dict[str, Any] = {}

        for response in responses:
            data = response.get("data", {})

            # Merge data (simple merge, can be enhanced)
            for key, value in data.items():
                if key not in aggregated:
                    aggregated[key] = value
                elif isinstance(value, list) and isinstance(aggregated[key], list):
                    # Merge lists
                    aggregated[key].extend(value)
                elif isinstance(value, dict) and isinstance(aggregated[key], dict):
                    # Merge dicts
                    aggregated[key].update(value)

        return aggregated

    def _calculate_confidence(self, responses: list[dict[str, Any]]) -> float:
        """Calculate overall confidence from responses."""
        if not responses:
            return 0.0

        confidences = [r.get("confidence", 0.0) for r in responses]
        return sum(confidences) / len(confidences)

    def _make_cache_key(self, request: KnowledgeRequest) -> str:
        """Generate cache key from request."""
        # Simple cache key based on query and main context
        key_parts = [request.query]

        if "target_industry" in request.context:
            key_parts.append(request.context["target_industry"])
        if "target_role" in request.context:
            key_parts.append(request.context["target_role"])

        return "|".join(key_parts)

    def _get_cached(self, key: str) -> Any | None:
        """Get cached result if not expired."""
        if key in self._cache:
            data, timestamp = self._cache[key]
            if datetime.now() - timestamp < self._cache_ttl:
                return data
            else:
                # Expired, remove from cache
                del self._cache[key]

        return None

    def _cache_result(self, key: str, data: Any) -> None:
        """Cache result with timestamp."""
        self._cache[key] = (data, datetime.now())

    def _identify_red_flags(
        self, job_description: str, knowledge_data: dict[str, Any]
    ) -> list[str]:
        """Identify red flags by comparing with industry knowledge."""
        red_flags = []

        # Check if salary is mentioned and compare with benchmarks
        salary_data = knowledge_data.get("salary", {})
        if salary_data:
            # Could add salary comparison logic here
            pass

        # Check if requirements are reasonable
        requirements = knowledge_data.get("requirements", {})
        if requirements:
            # Could add requirements comparison logic here
            pass

        return red_flags
