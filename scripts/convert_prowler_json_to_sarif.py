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


def extract_findings_from_json(data: Any) -> List[Dict[str, Any]]:
    """Extract findings from Prowler JSON-OCSF format."""
    findings = []

    # Debug: Print structure info
    print(f"DEBUG: JSON data type: {type(data)}")

    # Handle different possible JSON structures
    if isinstance(data, list):
        print(f"DEBUG: Processing list with {len(data)} items")
        # If data is a list of findings
        findings = data
    elif isinstance(data, dict):
        print(f"DEBUG: Processing dict with keys: {list(data.keys())}")
        # If data is a dict, look for findings in common locations
        if 'findings' in data:
            findings = data['findings']
            print(f"DEBUG: Found 'findings' key with {len(findings) if isinstance(findings, list) else 1} items")
        elif 'results' in data:
            findings = data['results']
            print(f"DEBUG: Found 'results' key with {len(findings) if isinstance(findings, list) else 1} items")
        else:
            # Check if this might be a newline-delimited JSON file
            print("DEBUG: No 'findings' or 'results' key found. Keys available:", list(data.keys())[:10])
            # Assume the dict itself is a finding
            findings = [data]
    else:
        print(f"DEBUG: Unexpected data type: {type(data)}")

    print(f"DEBUG: Extracted {len(findings)} findings")
    if findings and len(findings) > 0:
        print(f"DEBUG: First finding keys: {list(findings[0].keys()) if isinstance(findings[0], dict) else 'Not a dict'}")
        print(f"DEBUG: First finding sample: {str(findings[0])[:200]}...")

    return findings


def build_sarif_from_json(json_data: Dict[str, Any]) -> Dict[str, Any]:
    """Build SARIF from Prowler JSON-OCSF data."""
    findings = extract_findings_from_json(json_data)

    rules: Dict[str, Dict[str, Any]] = {}
    results: List[Dict[str, Any]] = []

    for finding in findings:
        # Extract OCSF status fields
        status = str(finding.get('status', '')).lower()
        status_code = str(finding.get('status_code', '')).upper()
        status_id = str(finding.get('status_id', ''))
        status_detail = str(finding.get('status_detail', ''))

        # Debug the status values for the first few findings
        if len(results) < 3:
            print(f"DEBUG: Finding {len(results)+1}:")
            print(f"  status: '{status}'")
            print(f"  status_code: '{status_code}'")
            print(f"  status_id: '{status_id}'")
            print(f"  status_detail: '{status_detail}'")
            print(f"  Available keys: {list(finding.keys())}")

        # Check OCSF Detection Finding status
        # In OCSF Detection Finding format:
        # - status: 'new' + status_id: '1' = newly discovered security finding
        # - These ARE the security issues we want to report
        # - activity_name: 'create' means the finding was created/detected
        activity_name = finding.get('activity_name', '').lower()

        is_security_finding = (
            status == 'new' and status_id == '1' or  # OCSF new finding
            status_code == 'FAIL' or                  # Explicit fail
            status in {'fail', 'failed', 'failure'} or
            activity_name == 'create'                 # Created/detected finding
        )

        if not is_security_finding:
            if len(results) < 3:  # Debug first few non-security findings too
                print(f"DEBUG: Skipping finding - not a security finding (status: '{status}', status_id: '{status_id}')")
            continue

        # Extract rule information from OCSF Detection Finding
        finding_info = finding.get('finding_info', {})

        rule_id = (
            finding.get('check_id') or
            finding_info.get('uid') or
            finding.get('uid') or
            'prowler-finding'
        )

        rule_name = (
            finding_info.get('title') or
            finding.get('check_title') or
            finding.get('title') or
            rule_id
        )

        rule_desc = (
            finding_info.get('desc') or
            finding.get('check_description') or
            finding.get('description') or
            status_detail or
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

        # Extract severity from OCSF format
        severity = finding.get('severity', 'Medium')
        severity_id = finding.get('severity_id', 3)  # OCSF default medium = 3
        sarif_level = map_severity_to_level(str(severity))

        # Build result message from OCSF fields
        message_text = (
            status_detail or
            finding_info.get('desc') or
            finding.get('message') or
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

        # Create SARIF result with required location
        # SARIF requires at least one location for each result
        resources = finding.get('resources', [])
        resource_name = finding.get('resource_name', '')

        # Build location information
        if resources and len(resources) > 0:
            # Use first resource if available
            resource = resources[0]
            location_text = resource.get('name', resource.get('uid', 'Repository'))
        elif resource_name:
            location_text = resource_name
        else:
            # Default location for repository-level findings
            location_text = "Repository"

        result = {
            "ruleId": rule_id,
            "level": sarif_level,
            "message": {"text": message_text},
            "properties": properties,
            "locations": [{
                "physicalLocation": {
                    "artifactLocation": {
                        "uri": "repository"
                    }
                },
                "message": {
                    "text": location_text
                }
            }]
        }

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
            content = f.read().strip()

        # Try to parse as regular JSON first
        try:
            json_data = json.loads(content)
        except json.JSONDecodeError:
            # If that fails, try as newline-delimited JSON (NDJSON)
            print("DEBUG: Failed to parse as regular JSON, trying NDJSON format")
            lines = content.split('\n')
            json_data = []
            for line_num, line in enumerate(lines, 1):
                line = line.strip()
                if line:
                    try:
                        json_data.append(json.loads(line))
                    except json.JSONDecodeError as line_err:
                        print(f"DEBUG: Failed to parse line {line_num}: {line_err}")
                        print(f"DEBUG: Line content (first 100 chars): {line[:100]}...")
                        continue
            print(f"DEBUG: Parsed {len(json_data)} objects from NDJSON")

    except Exception as e:
        raise SystemExit(f"Error reading JSON file: {e}")

    sarif = build_sarif_from_json(json_data)

    with output_path.open('w', encoding='utf-8') as f:
        json.dump(sarif, f, indent=2, ensure_ascii=False)

    print(f"Converted {len(sarif['runs'][0]['results'])} findings to SARIF format")


if __name__ == "__main__":
    main()