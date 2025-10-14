"""Audit logging for MCP server calls and security events.

Tracks tool invocations, detects anomalies, and provides forensic data.
Cost: FREE (JSON file logging)
Impact: HIGH (incident response, compliance, anomaly detection)
"""

from __future__ import annotations

import json
import threading
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

from utils.logging import get_logger

logger = get_logger("audit_log")


class AuditLogger:
    """Structured audit logger for security and MCP events.

    Features:
                            * JSONL append-only log (one event per line)
                            * Automatic sensitive field redaction
                            * Optional size-based rotation (simple rename + truncate)
                            * Thread-safe writes (basic lock) to prevent interleaving
    """

    def __init__(
        self,
        log_file: str = "logs/audit.jsonl",
        rotate_max_bytes: int | None = 5_000_000,
        rotate_backups: int = 3,
    ) -> None:
        self.log_file: Path = Path(log_file)
        self.log_file.parent.mkdir(parents=True, exist_ok=True)
        if not self.log_file.exists():
            self.log_file.touch()
        self.rotate_max_bytes = rotate_max_bytes
        self.rotate_backups = rotate_backups
        self._lock = threading.Lock()
        logger.info(
            "Initialized AuditLogger: %s (rotation=%s)",
            log_file,
            "on" if rotate_max_bytes else "off",
        )

    # ------------------------------------------------------------------
    # Core logging primitive
    # ------------------------------------------------------------------
    def log_event(
        self,
        event_type: str,
        server_name: str,
        tool_name: str | None = None,
        arguments: dict[str, Any] | None = None,
        result: str | None = None,
        error: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        event: dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "event_type": event_type,
            "server_name": server_name,
            "tool_name": tool_name,
            "arguments": self._redact_sensitive(arguments) if arguments else None,
            "result": result,
            "error": error,
            "metadata": metadata or {},
        }
        try:
            with self._lock:
                if self.rotate_max_bytes and self.log_file.stat().st_size > self.rotate_max_bytes:
                    self._rotate()
                with open(self.log_file, "a", encoding="utf-8") as f:
                    f.write(json.dumps(event, ensure_ascii=False) + "\n")
        except Exception as e:  # pragma: no cover
            logger.error("Failed to write audit log: %s", e)

    # Convenience wrappers -------------------------------------------------
    def log_mcp_call(
        self,
        server_name: str,
        tool_name: str,
        arguments: dict[str, Any],
        result: str = "success",
        error: str | None = None,
        duration_ms: float | None = None,
    ) -> None:
        metadata: dict[str, Any] = {}
        if duration_ms is not None:
            metadata["duration_ms"] = duration_ms
        self.log_event(
            event_type="mcp_call",
            server_name=server_name,
            tool_name=tool_name,
            arguments=arguments,
            result=result,
            error=error,
            metadata=metadata,
        )

    def log_rate_limit(self, server_name: str, tool_name: str | None = None) -> None:
        self.log_event(
            event_type="rate_limit",
            server_name=server_name,
            tool_name=tool_name,
            result="blocked",
            metadata={"reason": "rate_limit_exceeded"},
        )

    def log_auth_failure(self, server_name: str, reason: str) -> None:
        self.log_event(
            event_type="auth_failure",
            server_name=server_name,
            result="failure",
            error=reason,
        )

    def log_security_event(
        self,
        event_type: str,
        server_name: str,
        severity: str,
        description: str,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        meta = metadata or {}
        meta["severity"] = severity
        self.log_event(
            event_type=event_type,
            server_name=server_name,
            result="blocked",
            error=description,
            metadata=meta,
        )

    # Internal helpers -----------------------------------------------------
    def _redact_sensitive(self, data: dict[str, Any]) -> dict[str, Any]:
        if not isinstance(data, dict):
            return data
        redacted: dict[str, Any] = {}
        sensitive_patterns = [
            "password",
            "token",
            "key",
            "secret",
            "cookie",
            "auth",
        ]
        for key, value in data.items():
            if any(pattern in key.lower() for pattern in sensitive_patterns):
                redacted[key] = "***REDACTED***"
            elif isinstance(value, dict):
                redacted[key] = self._redact_sensitive(value)
            elif isinstance(value, list):
                redacted[key] = [
                    self._redact_sensitive(item) if isinstance(item, dict) else item
                    for item in value
                ]
            else:
                redacted[key] = value
        return redacted

    # Query APIs -----------------------------------------------------------
    def get_recent_events(
        self,
        hours: int = 24,
        event_type: str | None = None,
        server_name: str | None = None,
    ) -> list[dict[str, Any]]:
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        events: list[dict[str, Any]] = []
        try:
            with open(self.log_file, encoding="utf-8") as f:
                for line in f:
                    try:
                        event = json.loads(line.strip())
                        timestamp = datetime.fromisoformat(
                            event["timestamp"].replace("Z", "+00:00")
                        )
                        if timestamp < cutoff:
                            continue
                        if event_type and event["event_type"] != event_type:
                            continue
                        if server_name and event["server_name"] != server_name:
                            continue
                        events.append(event)
                    except (json.JSONDecodeError, KeyError):  # pragma: no cover
                        logger.debug("Skipping malformed audit log line")
        except FileNotFoundError:  # pragma: no cover
            return []
        return events

    def get_stats(self, hours: int = 24) -> dict[str, Any]:
        events = self.get_recent_events(hours=hours)
        server_counts: dict[str, int] = defaultdict(int)
        tool_counts: dict[str, int] = defaultdict(int)
        event_type_counts: dict[str, int] = defaultdict(int)
        error_count = 0
        for event in events:
            server_counts[event["server_name"]] += 1
            event_type_counts[event["event_type"]] += 1
            if event.get("tool_name"):
                tool_counts[event["tool_name"]] += 1
            if event.get("result") in ["failure", "blocked"]:
                error_count += 1
        return {
            "time_window_hours": hours,
            "total_events": len(events),
            "error_count": error_count,
            "error_rate": error_count / len(events) if events else 0,
            "events_by_type": dict(event_type_counts),
            "events_by_server": dict(server_counts),
            "top_tools": dict(sorted(tool_counts.items(), key=lambda x: x[1], reverse=True)[:10]),
        }

    # Rotation -------------------------------------------------------------
    def _rotate(self) -> None:
        if not self.log_file.exists():  # nothing to rotate
            return
        _shift_backups(self.log_file, self.rotate_backups)
        dst = _rotate_filename(self.log_file, 1)
        _safe_rename(self.log_file, dst)
        _touch(self.log_file)
        _maybe_warn_empty_after_rotate(self.log_file)
        _log_rotation_summary(self.log_file, self.rotate_backups)
        _validate_post_rotate(self.log_file)


class AnomalyDetector:
    """Detect basic anomalous patterns in audit logs."""

    def __init__(self, audit_logger: AuditLogger):
        self.audit_logger = audit_logger

    def detect_anomalies(self, hours: int = 1) -> list[dict[str, Any]]:
        anomalies: list[dict[str, Any]] = []
        events = self.audit_logger.get_recent_events(hours=hours)
        if not events:
            return anomalies
        # 1. High error rate (>20%)
        error_count = sum(1 for e in events if e.get("result") in ["failure", "blocked"])
        error_rate = error_count / len(events)
        if error_rate > 0.2:
            anomalies.append(
                {
                    "severity": "high",
                    "type": "high_error_rate",
                    "description": f"Error rate is {error_rate:.1%} ({error_count}/{len(events)} events)",
                    "recommendation": "Investigate failing MCP servers or check for attacks",
                }
            )
        # 2. Excessive rate limiting (>10 events/hour)
        rate_limit_events = [e for e in events if e["event_type"] == "rate_limit"]
        if len(rate_limit_events) > 10:
            anomalies.append(
                {
                    "severity": "medium",
                    "type": "excessive_rate_limiting",
                    "description": f"Rate limit exceeded {len(rate_limit_events)} times in last {hours}h",
                    "recommendation": "Check for runaway loops or increase rate limits",
                }
            )
        # 3. Auth failures (any)
        auth_failures = [e for e in events if e["event_type"] == "auth_failure"]
        if auth_failures:
            anomalies.append(
                {
                    "severity": "high",
                    "type": "authentication_failures",
                    "description": f"Detected {len(auth_failures)} authentication failures",
                    "recommendation": "Review credentials and check for unauthorized access attempts",
                }
            )
        # 4. Security events (injection, path traversal, suspicious activity)
        security_events = [
            e
            for e in events
            if e["event_type"] in ["injection_attempt", "path_traversal", "suspicious_activity"]
        ]
        if security_events:
            anomalies.append(
                {
                    "severity": "critical",
                    "type": "security_events",
                    "description": f"Detected {len(security_events)} security events",
                    "recommendation": "IMMEDIATE ACTION: Review logs for compromise",
                }
            )
        # 5. Unusual server activity (>3x average and >50 total events)
        server_counts: dict[str, int] = defaultdict(int)
        for ev in events:
            server_counts[ev["server_name"]] += 1
        avg_count = sum(server_counts.values()) / len(server_counts) if server_counts else 0
        for server, count in server_counts.items():
            if count > avg_count * 3 and count > 50:
                anomalies.append(
                    {
                        "severity": "medium",
                        "type": "unusual_server_activity",
                        "description": f"Server '{server}' has {count} events (3x+ average)",
                        "recommendation": f"Review '{server}' for runaway loop or abuse",
                    }
                )
        return anomalies

    def print_anomaly_report(self, hours: int = 1) -> None:
        anomalies = self.detect_anomalies(hours=hours)
        if not anomalies:
            print(f"[OK] No anomalies detected in last {hours}h")
            return
        print(f"\n[WARNING] ANOMALY REPORT (Last {hours}h)")
        print("=" * 60)
        for anomaly in sorted(
            anomalies, key=lambda x: {"critical": 0, "high": 1, "medium": 2}.get(x["severity"], 3)
        ):
            severity = anomaly["severity"].upper()
            icon = {"critical": "[CRITICAL]", "high": "[WARNING]", "medium": ""}.get(
                anomaly["severity"], "[INFO]"
            )
            print(f"\n{icon} [{severity}] {anomaly['type']}")
            print(f" {anomaly['description']}")
            print(f" → {anomaly['recommendation']}")
        print("\n" + "=" * 60)


# ----------------------------------------------------------------------
# Rotation helper utilities (module-level; pure functions ease testing)
# ----------------------------------------------------------------------
def _rotate_filename(base: Path, index: int) -> Path:
    return base.with_name(f"{base.name}.{index}")


def _shift_backups(base: Path, keep: int) -> None:
    if keep <= 0:
        return
    oldest = _rotate_filename(base, keep)
    if oldest.exists():  # remove oldest beyond retention
        try:
            oldest.unlink()
        except OSError:  # pragma: no cover
            logger.warning("Failed to remove oldest audit log backup: %s", oldest)
    for i in range(keep - 1, 0, -1):
        src = _rotate_filename(base, i)
        dst = _rotate_filename(base, i + 1)
        if src.exists():
            try:
                src.rename(dst)
            except OSError:  # pragma: no cover
                logger.warning("Failed to rotate audit log backup: %s -> %s", src, dst)


def _safe_rename(src: Path, dst: Path) -> None:
    try:
        src.rename(dst)
    except OSError as e:  # pragma: no cover
        logger.error("Failed to rename log file during rotation: %s", e)


def _read_jsonl(path: Path):  # Iterable[Dict[str, Any]] but generator; dynamic
    try:
        with open(path, encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    yield json.loads(line)
                except json.JSONDecodeError:  # pragma: no cover
                    continue
    except FileNotFoundError:  # pragma: no cover
        return


def _validate_jsonl(path: Path) -> bool:
    for _ in _read_jsonl(path):  # at least one object -> valid
        return True
    return False


def _human_size(num: int) -> str:
    for unit in ["B", "KB", "MB", "GB"]:
        if num < 1024:
            return f"{num:.1f}{unit}"
        num /= 1024
    return f"{num:.1f}TB"


def _log_rotation_summary(base: Path, keep: int) -> None:
    existing = [p for p in base.parent.glob(f"{base.name}.*") if p.is_file()]
    if existing:
        summary = ", ".join(f"{p.name}({_human_size(p.stat().st_size)})" for p in sorted(existing))
        logger.info("Audit log rotation backups: %s", summary)


def _maybe_warn_empty_after_rotate(path: Path) -> None:
    if path.exists() and path.stat().st_size == 0:
        logger.debug("Audit log truncated (post-rotation)")


def _validate_post_rotate(current: Path) -> None:
    if not current.exists():  # pragma: no cover
        logger.warning("Audit log missing after rotation")


def _touch(path: Path) -> None:
    if not path.exists():  # pragma: no cover
        try:
            path.touch()
        except OSError:  # pragma: no cover
            logger.error("Failed to recreate audit log file")


# Global instances --------------------------------------------------------
audit_logger = AuditLogger()
anomaly_detector = AnomalyDetector(audit_logger)
