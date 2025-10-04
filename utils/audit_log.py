"""
Audit logging for MCP server calls and security events.

Tracks tool invocations, detects anomalies, and provides forensic data.
Cost: FREE (JSON file logging)
Impact: HIGH (incident response, compliance, anomaly detection)
"""

import json
import time
from typing import Optional, Dict, Any, List
from pathlib import Path
from datetime import datetime, timedelta
from collections import defaultdict
from utils.logging import get_logger

logger = get_logger("audit_log")


class AuditLogger:
 """Structured audit logger for security events."""

 def __init__(self, log_file: str = "logs/audit.jsonl"):
 """
 Initialize audit logger.

 Args:
 log_file: Path to JSONL audit log file
 """
 self.log_file = Path(log_file)
 self.log_file.parent.mkdir(parents=True, exist_ok=True)

 # Touch file if it doesn't exist
 if not self.log_file.exists():
 self.log_file.touch()

 logger.info(f"Initialized AuditLogger: {log_file}")

 def log_event(
 self,
 event_type: str,
 server_name: str,
 tool_name: Optional[str] = None,
 arguments: Optional[Dict] = None,
 result: Optional[str] = None,
 error: Optional[str] = None,
 metadata: Optional[Dict] = None
 ):
 """
 Log security event.

 Args:
 event_type: Type of event (mcp_call, rate_limit, auth_fail, etc.)
 server_name: Name of MCP server
 tool_name: Name of tool invoked (if applicable)
 arguments: Tool arguments (sensitive data will be redacted)
 result: Result status (success/failure)
 error: Error message if applicable
 metadata: Additional context
 """
 event = {
 "timestamp": datetime.utcnow().isoformat() + "Z",
 "event_type": event_type,
 "server_name": server_name,
 "tool_name": tool_name,
 "arguments": self._redact_sensitive(arguments) if arguments else None,
 "result": result,
 "error": error,
 "metadata": metadata or {}
 }

 # Write to JSONL
 try:
 with open(self.log_file, "a") as f:
 f.write(json.dumps(event) + "\n")
 except Exception as e:
 logger.error(f"Failed to write audit log: {e}")

 def log_mcp_call(
 self,
 server_name: str,
 tool_name: str,
 arguments: Dict,
 result: str = "success",
 error: Optional[str] = None,
 duration_ms: Optional[float] = None
 ):
 """Log MCP tool invocation."""
 metadata = {}
 if duration_ms is not None:
 metadata["duration_ms"] = duration_ms

 self.log_event(
 event_type="mcp_call",
 server_name=server_name,
 tool_name=tool_name,
 arguments=arguments,
 result=result,
 error=error,
 metadata=metadata
 )

 def log_rate_limit(self, server_name: str, tool_name: Optional[str] = None):
 """Log rate limit exceeded."""
 self.log_event(
 event_type="rate_limit",
 server_name=server_name,
 tool_name=tool_name,
 result="blocked",
 metadata={"reason": "rate_limit_exceeded"}
 )

 def log_auth_failure(self, server_name: str, reason: str):
 """Log authentication failure."""
 self.log_event(
 event_type="auth_failure",
 server_name=server_name,
 result="failure",
 error=reason
 )

 def log_security_event(
 self,
 event_type: str,
 server_name: str,
 severity: str,
 description: str,
 metadata: Optional[Dict] = None
 ):
 """Log security event (injection attempt, path traversal, etc.)."""
 meta = metadata or {}
 meta["severity"] = severity

 self.log_event(
 event_type=event_type,
 server_name=server_name,
 result="blocked",
 error=description,
 metadata=meta
 )

 def _redact_sensitive(self, data: Dict) -> Dict:
 """
 Redact sensitive data from arguments.

 Replaces values for keys containing: password, token, key, secret, cookie
 """
 if not isinstance(data, dict):
 return data

 redacted = {}
 sensitive_patterns = ['password', 'token', 'key', 'secret', 'cookie', 'auth']

 for key, value in data.items():
 # Check if key contains sensitive pattern
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

 def get_recent_events(
 self,
 hours: int = 24,
 event_type: Optional[str] = None,
 server_name: Optional[str] = None
 ) -> List[Dict]:
 """
 Get recent audit events.

 Args:
 hours: Look back N hours
 event_type: Filter by event type
 server_name: Filter by server name

 Returns:
 List of matching events
 """
 cutoff = datetime.utcnow() - timedelta(hours=hours)
 events = []

 try:
 with open(self.log_file, "r") as f:
 for line in f:
 try:
 event = json.loads(line.strip())

 # Parse timestamp
 timestamp = datetime.fromisoformat(
 event["timestamp"].replace("Z", "+00:00")
 )

 # Filter by time
 if timestamp < cutoff:
 continue

 # Filter by event type
 if event_type and event["event_type"] != event_type:
 continue

 # Filter by server
 if server_name and event["server_name"] != server_name:
 continue

 events.append(event)

 except (json.JSONDecodeError, KeyError) as e:
 logger.debug(f"Skipping malformed audit log line: {e}")

 except FileNotFoundError:
 pass

 return events

 def get_stats(self, hours: int = 24) -> Dict[str, Any]:
 """
 Get audit log statistics.

 Returns:
 Statistics about recent activity
 """
 events = self.get_recent_events(hours=hours)

 # Count by server
 server_counts = defaultdict(int)
 tool_counts = defaultdict(int)
 event_type_counts = defaultdict(int)
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
 "top_tools": dict(sorted(
 tool_counts.items(),
 key=lambda x: x[1],
 reverse=True
 )[:10])
 }


class AnomalyDetector:
 """Detects anomalous patterns in audit logs."""

 def __init__(self, audit_logger: AuditLogger):
 self.audit_logger = audit_logger

 def detect_anomalies(self, hours: int = 1) -> List[Dict]:
 """
 Detect anomalous patterns in recent events.

 Returns:
 List of detected anomalies with severity and description
 """
 anomalies = []
 events = self.audit_logger.get_recent_events(hours=hours)

 if not events:
 return anomalies

 # 1. High error rate (>20%)
 error_count = sum(
 1 for e in events if e.get("result") in ["failure", "blocked"]
 )
 error_rate = error_count / len(events)

 if error_rate > 0.2:
 anomalies.append({
 "severity": "high",
 "type": "high_error_rate",
 "description": f"Error rate is {error_rate:.1%} ({error_count}/{len(events)} events)",
 "recommendation": "Investigate failing MCP servers or check for attacks"
 })

 # 2. Excessive rate limiting (>10 events/hour)
 rate_limit_events = [
 e for e in events if e["event_type"] == "rate_limit"
 ]

 if len(rate_limit_events) > 10:
 anomalies.append({
 "severity": "medium",
 "type": "excessive_rate_limiting",
 "description": f"Rate limit exceeded {len(rate_limit_events)} times in last {hours}h",
 "recommendation": "Check for runaway loops or increase rate limits"
 })

 # 3. Auth failures (any)
 auth_failures = [
 e for e in events if e["event_type"] == "auth_failure"
 ]

 if auth_failures:
 anomalies.append({
 "severity": "high",
 "type": "authentication_failures",
 "description": f"Detected {len(auth_failures)} authentication failures",
 "recommendation": "Review credentials and check for unauthorized access attempts"
 })

 # 4. Security events (injection, path traversal, etc.)
 security_events = [
 e for e in events
 if e["event_type"] in ["injection_attempt", "path_traversal", "suspicious_activity"]
 ]

 if security_events:
 anomalies.append({
 "severity": "critical",
 "type": "security_events",
 "description": f"Detected {len(security_events)} security events",
 "recommendation": "IMMEDIATE ACTION: Review security logs and check for compromised servers"
 })

 # 5. Unusual server activity (>3x normal)
 server_counts = defaultdict(int)
 for event in events:
 server_counts[event["server_name"]] += 1

 avg_count = sum(server_counts.values()) / len(server_counts) if server_counts else 0

 for server, count in server_counts.items():
 if count > avg_count * 3 and count > 50:
 anomalies.append({
 "severity": "medium",
 "type": "unusual_server_activity",
 "description": f"Server '{server}' has {count} events (3x+ average)",
 "recommendation": f"Review activity for '{server}' - possible runaway loop or abuse"
 })

 return anomalies

 def print_anomaly_report(self, hours: int = 1):
 """Print human-readable anomaly report."""
 anomalies = self.detect_anomalies(hours=hours)

 if not anomalies:
 print(f"[OK] No anomalies detected in last {hours}h")
 return

 print(f"\n[WARNING] ANOMALY REPORT (Last {hours}h)")
 print("=" * 60)

 for anomaly in sorted(anomalies, key=lambda x: {"critical": 0, "high": 1, "medium": 2}.get(x["severity"], 3)):
 severity = anomaly["severity"].upper()
 icon = {"critical": "[CRITICAL]", "high": "[WARNING]", "medium": ""}.get(anomaly["severity"], "[INFO]")

 print(f"\n{icon} [{severity}] {anomaly['type']}")
 print(f" {anomaly['description']}")
 print(f" → {anomaly['recommendation']}")

 print("\n" + "=" * 60)


# Global audit logger instance
audit_logger = AuditLogger()
anomaly_detector = AnomalyDetector(audit_logger)
