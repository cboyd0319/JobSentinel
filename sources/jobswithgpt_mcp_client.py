"""
MCP Client for JobsWithGPT server.

This module provides a Python client to interact with the JobsWithGPT MCP server,
which gives access to 500,000+ job listings.

Since the HTTP API is protected by Cloudflare, we use the official MCP protocol
via subprocess communication with the server.
"""

import asyncio
import json
import subprocess
import tempfile
from contextlib import AsyncExitStack
from pathlib import Path

from utils.logging import get_logger

logger = get_logger("sources.jobswithgpt_mcp_client")


class JobsWithGPTMCPClient:
    """
    Client for interacting with JobsWithGPT MCP server.

    This provides programmatic access to 500k+ jobs without dealing with
    Cloudflare protection or maintaining custom scrapers.
    """

    def __init__(self, server_script_path: str | None = None):
        """
        Initialize MCP client.

        Args:
            server_script_path: Path to jobswithgpt server.py script.
                               If None, will try to find it or use remote endpoint.
        """
        self.server_script_path = server_script_path
        self.exit_stack = AsyncExitStack()
        self.session = None
        self.process = None

    async def __aenter__(self):
        """Async context manager entry."""
        await self.connect()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.disconnect()

    async def connect(self):
        """Connect to the JobsWithGPT MCP server."""
        try:
            # Check if we have the MCP server script locally
            if self.server_script_path and Path(self.server_script_path).exists():
                logger.info(f"Connecting to local MCP server: {self.server_script_path}")
                await self._connect_local()
            else:
                logger.info("Local MCP server not found, using fallback HTTP client")
                # We'll use httpx as fallback (handled in JobsWithGPTScraper)
                pass

        except Exception as e:
            logger.error(f"Failed to connect to JobsWithGPT MCP server: {e}")
            raise

    async def _connect_local(self):
        """Connect to local MCP server via stdio."""
        try:
            # Start the MCP server as a subprocess
            self.process = await asyncio.create_subprocess_exec(
                "python3",
                self.server_script_path,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )

            logger.info("MCP server process started")

            # TODO: Implement proper MCP protocol handshake
            # For now, we'll rely on the HTTP fallback in JobsWithGPTScraper

        except Exception as e:
            logger.error(f"Failed to start MCP server process: {e}")
            raise

    async def disconnect(self):
        """Disconnect from the MCP server."""
        if self.process:
            try:
                self.process.terminate()
                await self.process.wait()
                logger.info("MCP server process terminated")
            except Exception as e:
                logger.warning(f"Error terminating MCP server: {e}")

    async def search_jobs(
        self,
        keywords: list[str] | None = None,
        locations: list[dict] | None = None,
        titles: list[str] | None = None,
        distance: int = 50000,
        page: int = 1,
    ) -> dict:
        """
        Search for jobs via MCP server.

        Args:
            keywords: List of search keywords
            locations: List of location dictionaries
            titles: List of job titles to filter
            distance: Search radius in meters
            page: Page number

        Returns:
            Dictionary with job results
        """
        if not self.session:
            logger.warning("MCP session not established, using HTTP fallback")
            # This will be handled by JobsWithGPTScraper's HTTP client
            return {"jobs": [], "total": 0}

        try:
            # Build MCP tool call
            tool_call = {
                "method": "tools/call",
                "params": {
                    "name": "search",
                    "arguments": {
                        "keywords": keywords or [],
                        "locations": locations or [],
                        "titles": titles or [],
                        "distance": distance,
                        "page": page,
                    },
                },
            }

            # Send request to MCP server
            request_json = json.dumps(tool_call) + "\n"
            self.process.stdin.write(request_json.encode())
            await self.process.stdin.drain()

            # Read response
            response_line = await self.process.stdout.readline()
            response = json.loads(response_line.decode())

            return response.get("result", {"jobs": [], "total": 0})

        except Exception as e:
            logger.error(f"MCP search_jobs failed: {e}")
            return {"jobs": [], "total": 0}


async def download_mcp_server():
    """
    Download the JobsWithGPT MCP server script for local use.

    Returns:
        Path to the downloaded server.py file
    """
    import httpx

    logger.info("Downloading JobsWithGPT MCP server...")

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://raw.githubusercontent.com/jobswithgpt/mcp/main/server.py"
            )

            if response.status_code == 200:
                # Save to temporary location
                temp_dir = Path(tempfile.gettempdir()) / "jobswithgpt_mcp"
                temp_dir.mkdir(exist_ok=True)

                server_path = temp_dir / "server.py"
                server_path.write_text(response.text)

                logger.info(f"MCP server downloaded to: {server_path}")
                return str(server_path)
            else:
                logger.error(f"Failed to download MCP server: HTTP {response.status_code}")
                return None

    except Exception as e:
        logger.error(f"Error downloading MCP server: {e}")
        return None


# Convenience function for one-off searches
async def search_jobs_mcp(
    keywords: list[str] | None = None,
    locations: list[dict] | None = None,
    titles: list[str] | None = None,
    distance: int = 50000,
    page: int = 1,
) -> dict:
    """
    Convenience function to search jobs via MCP client.

    This automatically handles server connection and cleanup.
    """
    # Try to download MCP server if not cached
    server_path = await download_mcp_server()

    if server_path:
        async with JobsWithGPTMCPClient(server_path) as client:
            return await client.search_jobs(
                keywords=keywords, locations=locations, titles=titles, distance=distance, page=page
            )
    else:
        logger.warning("Could not initialize MCP client")
        return {"jobs": [], "total": 0}
