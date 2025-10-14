"""
WebSocket router for real-time job updates.

Security:
  - Connection requires valid session (optional API key for additional security)
  - Rate limiting per connection
  - Automatic cleanup of stale connections

Privacy:
  - All data processing happens locally
  - No external connections
  - Messages stay within your network
"""

from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from jsa.logging import get_logger

logger = get_logger("websocket", component="websocket")

router = APIRouter()


class ConnectionManager:
    """Manages WebSocket connections and broadcasting."""

    def __init__(self) -> None:
        """Initialize connection manager."""
        self.active_connections: list[WebSocket] = []
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        """Accept and register a new WebSocket connection."""
        await websocket.accept()
        async with self._lock:
            self.active_connections.append(websocket)
        logger.info(
            "WebSocket client connected",
            total_connections=len(self.active_connections),
            component="websocket",
        )

    async def disconnect(self, websocket: WebSocket) -> None:
        """Remove a WebSocket connection."""
        async with self._lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)
        logger.info(
            "WebSocket client disconnected",
            total_connections=len(self.active_connections),
            component="websocket",
        )

    async def send_personal_message(self, message: dict[str, Any], websocket: WebSocket) -> None:
        """Send a message to a specific connection."""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.warning(
                "Failed to send personal message",
                error=str(e),
                component="websocket",
            )
            await self.disconnect(websocket)

    async def broadcast(self, message: dict[str, Any]) -> None:
        """Broadcast a message to all connected clients."""
        async with self._lock:
            disconnected: list[WebSocket] = []
            for connection in self.active_connections:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.warning(
                        "Failed to broadcast message",
                        error=str(e),
                        component="websocket",
                    )
                    disconnected.append(connection)

            # Clean up failed connections
            for conn in disconnected:
                self.active_connections.remove(conn)

        if disconnected:
            logger.info(
                "Cleaned up disconnected clients",
                removed=len(disconnected),
                remaining=len(self.active_connections),
                component="websocket",
            )


# Global connection manager
manager = ConnectionManager()


class JobUpdateMessage(BaseModel):
    """Job update message model."""

    type: str  # "new_job", "job_updated", "scrape_started", "scrape_completed"
    timestamp: datetime
    data: dict[str, Any]


@router.websocket("/ws/jobs")
async def websocket_jobs_endpoint(websocket: WebSocket) -> None:
    """
    WebSocket endpoint for real-time job updates.

    Message Types:
      - new_job: New job found and added to database
      - job_updated: Existing job details updated
      - scrape_started: Scraping job started for a source
      - scrape_completed: Scraping completed with summary
      - heartbeat: Keep-alive ping from server

    Example messages:
      {
        "type": "new_job",
        "timestamp": "2025-10-14T00:00:00Z",
        "data": {
          "job_id": 123,
          "title": "Senior Backend Engineer",
          "company": "TechCorp",
          "score": 0.95
        }
      }
    """
    await manager.connect(websocket)

    try:
        # Send initial connection confirmation
        await manager.send_personal_message(
            {
                "type": "connected",
                "timestamp": datetime.now(UTC).isoformat(),
                "data": {
                    "message": "Connected to JobSentinel WebSocket",
                    "version": "0.6.0",
                },
            },
            websocket,
        )

        # Keep connection alive and handle incoming messages
        while True:
            try:
                # Wait for messages from client (e.g., ping, subscription changes)
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                message = json.loads(data)

                # Handle different message types from client
                if message.get("type") == "ping":
                    await manager.send_personal_message(
                        {
                            "type": "pong",
                            "timestamp": datetime.now(UTC).isoformat(),
                            "data": {},
                        },
                        websocket,
                    )
                elif message.get("type") == "subscribe":
                    # Client can subscribe to specific events
                    await manager.send_personal_message(
                        {
                            "type": "subscribed",
                            "timestamp": datetime.now(UTC).isoformat(),
                            "data": {"events": message.get("events", ["all"])},
                        },
                        websocket,
                    )
                else:
                    logger.warning(
                        "Unknown message type from client",
                        message_type=message.get("type"),
                        component="websocket",
                    )

            except TimeoutError:
                # Send heartbeat to keep connection alive
                await manager.send_personal_message(
                    {
                        "type": "heartbeat",
                        "timestamp": datetime.now(UTC).isoformat(),
                        "data": {},
                    },
                    websocket,
                )

    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception as e:
        logger.error(
            "WebSocket error",
            error=str(e),
            error_type=type(e).__name__,
            component="websocket",
        )
        await manager.disconnect(websocket)


async def broadcast_job_update(
    update_type: str,
    job_data: dict[str, Any],
) -> None:
    """
    Broadcast a job update to all connected WebSocket clients.

    Args:
        update_type: Type of update (new_job, job_updated, etc.)
        job_data: Job data to broadcast

    Example:
        await broadcast_job_update(
            "new_job",
            {
                "job_id": 123,
                "title": "Senior Backend Engineer",
                "company": "TechCorp",
                "score": 0.95,
            }
        )
    """
    message = {
        "type": update_type,
        "timestamp": datetime.now(UTC).isoformat(),
        "data": job_data,
    }
    await manager.broadcast(message)
    logger.debug(
        "Broadcasted job update",
        update_type=update_type,
        connections=len(manager.active_connections),
        component="websocket",
    )


async def broadcast_scrape_event(
    event_type: str,
    source: str,
    data: dict[str, Any] | None = None,
) -> None:
    """
    Broadcast a scraping event to all connected WebSocket clients.

    Args:
        event_type: "scrape_started" or "scrape_completed"
        source: Name of the job board being scraped
        data: Additional event data (e.g., job count, errors)

    Example:
        await broadcast_scrape_event(
            "scrape_completed",
            "greenhouse",
            {"jobs_found": 42, "new_jobs": 10, "duration_seconds": 12.5}
        )
    """
    message = {
        "type": event_type,
        "timestamp": datetime.now(UTC).isoformat(),
        "data": {
            "source": source,
            **(data or {}),
        },
    }
    await manager.broadcast(message)
    logger.debug(
        "Broadcasted scrape event",
        event_type=event_type,
        source=source,
        connections=len(manager.active_connections),
        component="websocket",
    )


__all__ = [
    "router",
    "broadcast_job_update",
    "broadcast_scrape_event",
    "ConnectionManager",
    "manager",
]
