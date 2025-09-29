#!/usr/bin/env python3
"""Convert Prowler JSON-OCSF output into SARIF 2.1.0."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Dict, List, Any


def map_severity_to_level(severity: str) -> str:
    """Map Prowler severity to SARIF level."""
    severity_map = {
        "critical": "error",
        "high": "error",
        "medium": "warning",
        "low": "note",
        "informational": "note",
        "info": "note"
    }
    return severity_map.get(severity.lower(), "warning")


def extract_findings_from_json(data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Extract findings from Prowler JSON-OCSF format."""
    findings = []

    # Handle different possible JSON structures
    if isinstance(data, list):
        # If data is a list of findings
        findings = data
    elif isinstance(data, dict):
        # If data is a dict, look for findings in common locations
        if 'findings' in data:
            findings = data['findings']
        elif 'results' in data:
            findings = data['results']
        else:
            # Assume the dict itself is a finding
            findings = [data]

    return findings


def build_sarif_from_json(json_data: Dict[str, Any]) -> Dict[str, Any]:
    """Build SARIF from Prowler JSON-OCSF data."""
    findings = extract_findings_from_json(json_data)

    rules: Dict[str, Dict[str, Any]] = {}
    results: List[Dict[str, Any]] = []

    for finding in findings:
        # Skip if not a failed finding
        status = finding.get('status', '').lower()
        if status not in {'fail', 'failed', 'failure'}:
            continue

        # Extract rule information
        rule_id = (
            finding.get('check_id') or
            finding.get('control_id') or
            finding.get('rule_id') or
            finding.get('id') or
            'prowler-finding'
        )

        rule_name = (
            finding.get('check_title') or
            finding.get('control_title') or
            finding.get('title') or
            finding.get('name') or
            rule_id
        )

        rule_desc = (
            finding.get('check_description') or
            finding.get('control_description') or
            finding.get('description') or
            finding.get('notes') or
            'Prowler security finding'
        )

        # Add rule to rules dict if not already present
        if rule_id not in rules:
            rules[rule_id] = {
                "id": rule_id,
                "name": rule_name,
                "shortDescription": {"text": rule_name},
                "fullDescription": {"text": rule_desc},
                "helpUri": finding.get("remediation_url", ""),
                "properties": {
                    "tags": ["security", "prowler"]
                }
            }

        # Extract severity and map to SARIF level
        severity = finding.get('severity', finding.get('level', 'medium'))
        sarif_level = map_severity_to_level(str(severity))

        # Build result message
        message_text = (
            finding.get('status_extended') or
            finding.get('description') or
            finding.get('notes') or
            f"{rule_name}: Security finding detected"
        )

        # Build properties
        properties = {
            "status": status,
            "severity": severity
        }

        # Add additional context if available
        for key in ['service', 'category', 'region', 'location', 'resource_id', 'account_id']:
            if key in finding and finding[key]:
                properties[key] = finding[key]

        # Create SARIF result
        result = {
            "ruleId": rule_id,
            "level": sarif_level,
            "message": {"text": message_text},
            "properties": properties
        }

        # Add location if available (for repository-level findings, this might be minimal)
        if finding.get('resource_id') or finding.get('resource_name'):
            result["locations"] = [{
                "message": {
                    "text": finding.get('resource_id') or finding.get('resource_name', 'Repository')
                }
            }]

        results.append(result)

    # Build SARIF structure
    sarif = {
        "$schema": "https://schemastore.azurewebsites.net/schemas/json/sarif-2.1.0.json",
        "version": "2.1.0",
        "runs": [{
            "tool": {
                "driver": {
                    "name": "Prowler",
                    "informationUri": "https://github.com/prowler-cloud/prowler",
                    "version": "5.12.2",
                    "rules": list(rules.values())
                }
            },
            "results": results
        }]
    }

    return sarif


def main() -> None:
    """Main conversion function."""
    if len(sys.argv) != 3:
        raise SystemExit(
            "Usage: convert_prowler_json_to_sarif.py <input.json> <output.sarif>"
        )

    json_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])

    if not json_path.is_file():
        raise SystemExit(f"JSON file not found: {json_path}")

    try:
        with json_path.open('r', encoding='utf-8') as f:
            json_data = json.load(f)
    except json.JSONDecodeError as e:
        raise SystemExit(f"Invalid JSON file: {e}")

    sarif = build_sarif_from_json(json_data)

    with output_path.open('w', encoding='utf-8') as f:
        json.dump(sarif, f, indent=2, ensure_ascii=False)

    print(f"Converted {len(sarif['runs'][0]['results'])} findings to SARIF format")


if __name__ == "__main__":
    main()