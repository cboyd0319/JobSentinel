#!/usr/bin/env python3
"""Convert Prowler CSV output into SARIF 2.1.0."""

from __future__ import annotations

import csv
import json
import sys
from pathlib import Path
from typing import Dict, List


def normalize_keys(row: Dict[str, str]) -> Dict[str, str]:
    return {
        (key or "").strip().replace(" ", "_").upper(): (value or "").strip()
        for key, value in row.items()
    }


def build_sarif(rows: List[Dict[str, str]]) -> Dict[str, object]:
    severity_map = {
        "CRITICAL": "error",
        "HIGH": "error",
        "MEDIUM": "warning",
        "LOW": "note",
        "INFORMATIONAL": "note",
    }

    rules: Dict[str, Dict[str, object]] = {}
    results: List[Dict[str, object]] = []

    for raw in rows:
        row = normalize_keys(raw)
        status = row.get("STATUS", "").upper()
        if status not in {"FAIL", "FAILED"}:
            continue

        rule_id = row.get("CONTROL_ID") or row.get("CHECK_ID") or "prowler-control"
        rule_name = (
            row.get("CONTROL_TITLE")
            or row.get("CHECK_TITLE")
            or rule_id
        )
        rule_desc = (
            row.get("CONTROL_DESCRIPTION")
            or row.get("CHECK_DESCRIPTION")
            or row.get("NOTES")
            or "Prowler finding"
        )

        rules.setdefault(
            rule_id,
            {
                "id": rule_id,
                "name": rule_name,
                "shortDescription": {"text": rule_name},
                "fullDescription": {"text": rule_desc},
            },
        )

        level = row.get("LEVEL") or row.get("SEVERITY") or "LOW"
        sarif_level = severity_map.get(level.upper(), "warning")
        message = row.get("DESCRIPTION") or row.get("NOTES") or rule_desc

        properties = {"status": status}
        service = row.get("SERVICE") or row.get("CATEGORY")
        if service:
            properties["service"] = service
        region = row.get("REGION") or row.get("LOCATION")
        if region:
            properties["region"] = region

        results.append(
            {
                "ruleId": rule_id,
                "level": sarif_level,
                "message": {"text": f"{rule_name}: {message}"},
                "properties": properties,
            }
        )

    runs = [
        {
            "tool": {
                "driver": {
                    "name": "Prowler",
                    "informationUri": "https://github.com/prowler-cloud/prowler",
                    "rules": list(rules.values()),
                }
            },
            "results": results,
        }
    ]

    return {
        "$schema": "https://schemastore.azurewebsites.net/schemas/json/sarif-2.1.0.json",
        "version": "2.1.0",
        "runs": runs,
    }


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("Usage: convert_prowler_csv_to_sarif.py <input.csv> <output.sarif>")

    csv_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])

    if not csv_path.is_file():
        raise SystemExit(f"CSV file not found: {csv_path}")

    with csv_path.open(newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        rows = list(reader)

    sarif = build_sarif(rows)
    output_path.write_text(json.dumps(sarif), encoding="utf-8")


if __name__ == "__main__":
    main()
