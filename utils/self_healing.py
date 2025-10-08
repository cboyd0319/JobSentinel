"""
Self-healing mechanisms for automated recovery from common failures.
"""

import asyncio
import os
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Callable, Optional

from utils.logging import get_logger

logger = get_logger("self_healing")


@dataclass
class RecoveryAction:
    """Represents a recovery action that can be taken."""

    name: str
    condition: Callable[[], bool]
    action: Callable[[], Any]
    max_retries: int = 3
    cooldown_seconds: int = 60


class SelfHealingMonitor:
    """Monitor system health and automatically recover from failures."""

    def __init__(self):
        self.last_recovery_time = {}
        self.recovery_count = {}
        self.recovery_actions = []
        self._register_default_actions()

    def _register_default_actions(self):
        """Register default recovery actions."""
        # Database connection recovery
        self.register_action(
            RecoveryAction(
                name="database_reconnect",
                condition=self._check_database_connection,
                action=self._recover_database_connection,
                max_retries=3,
                cooldown_seconds=300,
            )
        )

        # Cloud storage reconnection
        self.register_action(
            RecoveryAction(
                name="cloud_storage_reconnect",
                condition=self._check_cloud_storage,
                action=self._recover_cloud_storage,
                max_retries=3,
                cooldown_seconds=300,
            )
        )

        # Cache cleanup for memory issues
        self.register_action(
            RecoveryAction(
                name="cache_cleanup",
                condition=self._check_memory_pressure,
                action=self._cleanup_cache,
                max_retries=1,
                cooldown_seconds=600,
            )
        )

    def register_action(self, action: RecoveryAction):
        """Register a new recovery action."""
        self.recovery_actions.append(action)
        logger.info(f"Registered recovery action: {action.name}")

    async def check_and_heal(self) -> dict:
        """Check system health and execute recovery actions if needed."""
        results = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "actions_taken": [],
            "failures": [],
        }

        for action in self.recovery_actions:
            try:
                # Check if action is needed
                if not action.condition():
                    logger.debug(f"Recovery action not needed: {action.name}")
                    continue

                # Check cooldown
                last_run = self.last_recovery_time.get(action.name, 0)
                if time.time() - last_run < action.cooldown_seconds:
                    logger.debug(f"Recovery action in cooldown: {action.name}")
                    continue

                # Check max retries
                count = self.recovery_count.get(action.name, 0)
                if count >= action.max_retries:
                    logger.warning(
                        f"Recovery action {action.name} exceeded max retries ({action.max_retries})"
                    )
                    results["failures"].append(
                        {
                            "action": action.name,
                            "reason": "max_retries_exceeded",
                            "count": count,
                        }
                    )
                    continue

                # Execute recovery action
                logger.info(f"Executing recovery action: {action.name}")
                if asyncio.iscoroutinefunction(action.action):
                    result = await action.action()
                else:
                    result = action.action()

                self.last_recovery_time[action.name] = time.time()
                self.recovery_count[action.name] = count + 1

                results["actions_taken"].append(
                    {
                        "action": action.name,
                        "result": result,
                        "retry_count": self.recovery_count[action.name],
                    }
                )

                logger.info(f"Recovery action completed: {action.name}")

            except Exception as e:
                logger.error(f"Recovery action failed: {action.name} - {e}")
                results["failures"].append({"action": action.name, "error": str(e)})

        return results

    def _check_database_connection(self) -> bool:
        """Check if database connection needs recovery."""
        try:
            import asyncio

            from src.database import async_engine

            # Try a simple query
            async def test_connection():
                async with async_engine.connect() as conn:
                    await conn.execute("SELECT 1")
                return True

            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    # Can't test in running loop
                    return False
                return not asyncio.run(test_connection())
            except (asyncio.TimeoutError, ConnectionError, OSError) as conn_exc:
                logger.debug(f"Connection test failed: {conn_exc}")
                return True

        except Exception as e:
            logger.error(f"Database connection check failed: {e}")
            return True

    async def _recover_database_connection(self) -> str:
        """Attempt to recover database connection."""
        try:
            from src.database import init_db

            # Reinitialize database
            await init_db()

            logger.info("Database connection recovered")
            return "success"
        except Exception as e:
            logger.error(f"Database recovery failed: {e}")
            return f"failed: {e}"

    def _check_cloud_storage(self) -> bool:
        """Check if cloud storage connection needs recovery."""
        storage_bucket = os.getenv("STORAGE_BUCKET")
        if not storage_bucket:
            return False  # Not configured, skip

        try:
            from google.cloud import storage

            client = storage.Client()
            bucket = client.bucket(storage_bucket)
            # Try to list blobs (lightweight operation)
            list(bucket.list_blobs(max_results=1))
            return False  # Working fine
        except Exception as e:
            logger.error(f"Cloud storage check failed: {e}")
            return True

    def _recover_cloud_storage(self) -> str:
        """Attempt to recover cloud storage connection."""
        try:
            from google.cloud import storage

            # Recreate client
            client = storage.Client()

            # Test connection
            storage_bucket = os.getenv("STORAGE_BUCKET")
            bucket = client.bucket(storage_bucket)
            list(bucket.list_blobs(max_results=1))

            logger.info("Cloud storage connection recovered")
            return "success"
        except Exception as e:
            logger.error(f"Cloud storage recovery failed: {e}")
            return f"failed: {e}"

    def _check_memory_pressure(self) -> bool:
        """Check if system is under memory pressure."""
        try:
            import psutil

            memory = psutil.virtual_memory()

            # Trigger cleanup if memory usage > 85%
            return memory.percent > 85
        except Exception as e:
            logger.error(f"Memory check failed: {e}")
            return False

    def _cleanup_cache(self) -> str:
        """Clean up caches to free memory."""
        try:
            from utils.cache import job_cache

            # Get stats before cleanup
            stats_before = job_cache.get_stats()

            # Clear cache
            job_cache.clear()

            # Log results
            logger.info(f"Cache cleared: {stats_before['job_hashes_count']} entries removed")
            return f"cleared_{stats_before['job_hashes_count']}_entries"

        except Exception as e:
            logger.error(f"Cache cleanup failed: {e}")
            return f"failed: {e}"

    def reset_recovery_counts(self, action_name: Optional[str] = None):
        """Reset recovery counts (useful after successful operation)."""
        if action_name:
            self.recovery_count[action_name] = 0
            logger.info(f"Reset recovery count for: {action_name}")
        else:
            self.recovery_count.clear()
            logger.info("Reset all recovery counts")


# Global instance
self_healing_monitor = SelfHealingMonitor()


async def run_self_healing_check():
    """Run self-healing checks and return results."""
    return await self_healing_monitor.check_and_heal()
