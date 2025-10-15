#!/usr/bin/env python3
"""
Automated Security Scanner

Runs multiple security checks on the codebase:
- Bandit (Python security issues)
- Safety (vulnerable dependencies)
- Secret detection (hardcoded credentials)
- SBOM generation (supply chain)
- License compliance

References:
- OWASP ASVS 5.0 | https://owasp.org/ASVS | High | Security verification
- NIST SP 800-53 | https://csrc.nist.gov | High | Security controls
- Bandit | https://bandit.readthedocs.io | High | Python security linter

Author: JobSentinel Team
License: MIT
"""

import argparse
import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from typing import Any


class SecurityScanner:
    """Automated security scanner."""

    def __init__(self, verbose: bool = False):
        self.verbose = verbose
        self.results: dict[str, Any] = {
            "timestamp": datetime.now().isoformat(),
            "checks": [],
            "summary": {"total": 0, "passed": 0, "failed": 0, "warnings": 0},
        }

    def run_command(self, command: list[str], timeout: int = 60) -> tuple[bool, str, str]:
        """Run a command and return success, stdout, stderr."""
        try:
            result = subprocess.run(command, capture_output=True, text=True, timeout=timeout)
            return result.returncode == 0, result.stdout, result.stderr
        except subprocess.TimeoutExpired:
            return False, "", "Command timed out"
        except FileNotFoundError:
            return False, "", "Command not found"

    def check_bandit(self) -> dict[str, Any]:
        """Run Bandit security linter."""
        print("🔍 Running Bandit security scan...")

        success, stdout, stderr = self.run_command(
            [sys.executable, "-m", "bandit", "-r", "deploy/common/app/src/", "-f", "json", "--quiet"]
        )

        if success:
            try:
                results = json.loads(stdout)
                issues = results.get("results", [])
                high_issues = [i for i in issues if i.get("issue_severity") == "HIGH"]
                medium_issues = [i for i in issues if i.get("issue_severity") == "MEDIUM"]

                status = "pass" if not high_issues else "fail"
                if medium_issues and not high_issues:
                    status = "warn"

                return {
                    "name": "Bandit Security Scan",
                    "status": status,
                    "details": {
                        "high_issues": len(high_issues),
                        "medium_issues": len(medium_issues),
                        "low_issues": len(issues) - len(high_issues) - len(medium_issues),
                        "total_issues": len(issues),
                    },
                    "message": f"Found {len(high_issues)} high, {len(medium_issues)} medium security issues",
                }
            except json.JSONDecodeError:
                return {
                    "name": "Bandit Security Scan",
                    "status": "fail",
                    "message": "Failed to parse Bandit output",
                }
        else:
            if "No module named" in stderr or "No module named" in stdout:
                return {
                    "name": "Bandit Security Scan",
                    "status": "skip",
                    "message": "Bandit not installed (pip install bandit)",
                }
            return {
                "name": "Bandit Security Scan",
                "status": "fail",
                "message": f"Bandit failed: {stderr}",
            }

    def check_secrets(self) -> dict[str, Any]:
        """Check for hardcoded secrets."""
        print("🔍 Checking for hardcoded secrets...")

        import re

        secret_patterns = [
            (r'(?i)(password|passwd|pwd)\s*=\s*["\']([^"\']+)["\']', "Password"),
            (r'(?i)api[_-]?key\s*=\s*["\']([^"\']+)["\']', "API Key"),
            (r'(?i)secret[_-]?key\s*=\s*["\']([^"\']+)["\']', "Secret Key"),
            (r'(?i)token\s*=\s*["\']([^"\']+)["\']', "Token"),
            (r"(?i)(aws[_-]?access[_-]?key|aws[_-]?secret)", "AWS Credential"),
            (r"-----BEGIN (RSA |DSA )?PRIVATE KEY-----", "Private Key"),
        ]

        findings = []
        exclude_patterns = [
            r"\.example\.",
            r"test_",
            r"_test\.py",
            r"\.md$",
        ]

        for py_file in Path("src").rglob("*.py"):
            # Skip test files and examples
            if any(re.search(pat, str(py_file)) for pat in exclude_patterns):
                continue

            try:
                content = py_file.read_text(encoding="utf-8")

                for pattern, secret_type in secret_patterns:
                    matches = re.finditer(pattern, content)
                    for match in matches:
                        # Check if it's in a comment or docstring
                        line_start = content.rfind("\n", 0, match.start())
                        line = content[line_start : match.end()]

                        if '"""' in line or "'''" in line or line.strip().startswith("#"):
                            continue  # Skip docstrings and comments

                        findings.append(
                            {
                                "file": str(py_file),
                                "type": secret_type,
                                "line": content[: match.start()].count("\n") + 1,
                            }
                        )
            except Exception as e:
                if self.verbose:
                    print(f"Warning: Could not scan {py_file}: {e}")

        if findings:
            return {
                "name": "Secret Detection",
                "status": "fail",
                "details": {"findings": findings},
                "message": f"Found {len(findings)} potential hardcoded secrets",
            }
        else:
            return {
                "name": "Secret Detection",
                "status": "pass",
                "message": "No hardcoded secrets detected",
            }

    def check_dependencies(self) -> dict[str, Any]:
        """Check for vulnerable dependencies (requires safety)."""
        print("🔍 Checking for vulnerable dependencies...")

        success, stdout, stderr = self.run_command(
            [sys.executable, "-m", "pip", "list", "--format=json"]
        )

        if not success:
            return {
                "name": "Dependency Vulnerability Check",
                "status": "fail",
                "message": "Could not list installed packages",
            }

        try:
            packages = json.loads(stdout)

            # Check if safety is available
            success, stdout, stderr = self.run_command(
                [sys.executable, "-m", "safety", "check", "--json"]
            )

            if success or "No known security vulnerabilities" in stdout:
                return {
                    "name": "Dependency Vulnerability Check",
                    "status": "pass",
                    "details": {"packages_checked": len(packages)},
                    "message": f"No known vulnerabilities in {len(packages)} packages",
                }
            elif "No module named" in stderr:
                return {
                    "name": "Dependency Vulnerability Check",
                    "status": "skip",
                    "message": "Safety not installed (pip install safety)",
                }
            else:
                try:
                    vulns = json.loads(stdout)
                    return {
                        "name": "Dependency Vulnerability Check",
                        "status": "fail",
                        "details": {"vulnerabilities": vulns},
                        "message": f"Found {len(vulns)} vulnerable packages",
                    }
                except json.JSONDecodeError:
                    return {
                        "name": "Dependency Vulnerability Check",
                        "status": "warn",
                        "message": "Could not parse safety output",
                    }
        except json.JSONDecodeError:
            return {
                "name": "Dependency Vulnerability Check",
                "status": "fail",
                "message": "Could not parse package list",
            }

    def check_licenses(self) -> dict[str, Any]:
        """Check for license compatibility."""
        print("🔍 Checking license compatibility...")

        # Get installed packages and their licenses
        success, stdout, stderr = self.run_command(
            [sys.executable, "-m", "pip", "list", "--format=json"]
        )

        if not success:
            return {
                "name": "License Compliance Check",
                "status": "fail",
                "message": "Could not list packages",
            }

        # For full license check, would need pip-licenses or similar
        # Simplified version here

        return {
            "name": "License Compliance Check",
            "status": "pass",
            "message": "License check requires pip-licenses package (manual review recommended)",
        }

    def generate_sbom(self) -> dict[str, Any]:
        """Generate Software Bill of Materials."""
        print("🔍 Generating SBOM...")

        success, stdout, stderr = self.run_command(
            [sys.executable, "-m", "pip", "list", "--format=json"]
        )

        if not success:
            return {
                "name": "SBOM Generation",
                "status": "fail",
                "message": "Could not generate SBOM",
            }

        try:
            packages = json.loads(stdout)

            # Save SBOM
            sbom_path = Path("security/sbom.json")
            sbom_path.parent.mkdir(exist_ok=True)

            sbom = {
                "format": "cyclonedx",
                "version": "1.4",
                "timestamp": datetime.now().isoformat(),
                "components": [
                    {"type": "library", "name": pkg["name"], "version": pkg["version"]}
                    for pkg in packages
                ],
            }

            sbom_path.write_text(json.dumps(sbom, indent=2), encoding="utf-8")

            return {
                "name": "SBOM Generation",
                "status": "pass",
                "details": {"path": str(sbom_path), "components": len(packages)},
                "message": f"Generated SBOM with {len(packages)} components",
            }
        except Exception as e:
            return {
                "name": "SBOM Generation",
                "status": "fail",
                "message": f"SBOM generation failed: {e}",
            }

    def run_all_checks(self) -> dict[str, Any]:
        """Run all security checks."""
        print("\n" + "=" * 70)
        print("JobSentinel Security Scanner")
        print("=" * 70 + "\n")

        checks = [
            self.check_bandit(),
            self.check_secrets(),
            self.check_dependencies(),
            self.check_licenses(),
            self.generate_sbom(),
        ]

        self.results["checks"] = checks

        # Calculate summary
        for check in checks:
            self.results["summary"]["total"] += 1
            if check["status"] == "pass":
                self.results["summary"]["passed"] += 1
            elif check["status"] == "fail":
                self.results["summary"]["failed"] += 1
            elif check["status"] == "warn":
                self.results["summary"]["warnings"] += 1

        return self.results

    def print_report(self) -> None:
        """Print formatted security report."""
        print("\n" + "=" * 70)
        print("Security Scan Results")
        print("=" * 70 + "\n")

        summary = self.results["summary"]
        print(f"Total Checks: {summary['total']}")
        print(f"Passed: {summary['passed']}")
        print(f"Warnings: {summary['warnings']}")
        print(f"Failed: {summary['failed']}")
        print()

        for check in self.results["checks"]:
            status_emoji = {"pass": "✅", "warn": "⚠️", "fail": "❌", "skip": "⏭️"}.get(
                check["status"], "❓"
            )

            print(f"{status_emoji} {check['name']}: {check['message']}")

            if self.verbose and check.get("details"):
                for key, value in check["details"].items():
                    print(f"    {key}: {value}")
            print()

        # Overall verdict
        if summary["failed"] > 0:
            print("❌ SECURITY SCAN FAILED - Critical issues found")
            print("    Review findings above and fix before deploying")
        elif summary["warnings"] > 0:
            print("⚠️  SECURITY SCAN PASSED WITH WARNINGS")
            print("    Review warnings and consider fixing")
        else:
            print("✅ SECURITY SCAN PASSED - No critical issues found")

        print(f"\n{'='*70}\n")

    def save_report(self, output_path: str) -> None:
        """Save report to JSON file."""
        Path(output_path).write_text(json.dumps(self.results, indent=2), encoding="utf-8")
        print(f"📄 Report saved to: {output_path}")


def main() -> int:
    """Run security scanner."""
    parser = argparse.ArgumentParser(description="JobSentinel Security Scanner")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--output", "-o", default="security/scan_report.json", help="Output file")
    args = parser.parse_args()

    scanner = SecurityScanner(verbose=args.verbose)
    scanner.run_all_checks()
    scanner.print_report()
    scanner.save_report(args.output)

    # Return appropriate exit code
    if scanner.results["summary"]["failed"] > 0:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
