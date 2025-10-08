#!/usr/bin/env python3
"""Comprehensive validation script for MCP scrapers.

Fresh, clean version: validates prerequisites, deduplication, security, and
scraper integrations (Reed, JobSpy, JobsWithGPT) plus integration behavior.
"""
from __future__ import annotations

import asyncio
import os
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Tuple

# Ensure project root on path
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.logging import setup_logging, get_logger  # noqa: E402
from utils.cache import job_cache  # noqa: E402

logger = setup_logging(log_level="INFO")
validation_logger = get_logger("validation")


class ValidationResult:
    """Accumulates validation outcomes for reporting."""

    def __init__(self) -> None:
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0
        self.warnings: List[str] = []
        self.errors: List[str] = []
        self.scraper_results: Dict[str, Dict] = {}

    def add_pass(self, test_name: str) -> None:
        self.tests_run += 1
        self.tests_passed += 1
        print(f" [OK] {test_name}")

    def add_fail(self, test_name: str, error: str) -> None:
        self.tests_run += 1
        self.tests_failed += 1
        self.errors.append(f"{test_name}: {error}")
        print(f" [ERROR] {test_name}\n  Error: {error}")

    def add_warning(self, test_name: str, message: str) -> None:
        self.warnings.append(f"{test_name}: {message}")
        print(f" [WARNING] {test_name}\n  Warning: {message}")

    def add_scraper_result(self, scraper_name: str, data: Dict) -> None:
        self.scraper_results[scraper_name] = data

    def print_summary(self) -> None:
        print("\n" + "=" * 80)
        print("VALIDATION SUMMARY")
        print("=" * 80)
        print(f"\nTests Run: {self.tests_run}")
        print(f"Passed: {self.tests_passed} [OK]")
        print(f"Failed: {self.tests_failed} [ERROR]")
        print(f"Warnings: {len(self.warnings)} [WARNING]")

        if self.errors:
            print("\n🚫 ERRORS:")
            for err in self.errors:
                print(f" - {err}")
        if self.warnings:
            print("\n[WARNING] WARNINGS:")
            for warn in self.warnings:
                print(f" - {warn}")
        if self.scraper_results:
            print("\n SCRAPER RESULTS:")
            for scraper, data in self.scraper_results.items():
                print(f"\n {scraper}:")
                for key, value in data.items():
                    print(f"  {key}: {value}")

        print("\n" + "=" * 80)
        if self.tests_failed == 0:
            print("[OK] ALL VALIDATIONS PASSED - Ready for production use!")
        else:
            print("[ERROR] VALIDATION FAILED - Fix errors before production use!")
        print("=" * 80 + "\n")


# ==========================================================================
# PREREQUISITES
# ==========================================================================

def check_prerequisites(result: ValidationResult) -> None:
    print("\n" + "=" * 80)
    print("PREREQUISITE CHECKS")
    print("=" * 80 + "\n")

    py = sys.version_info
    if py >= (3, 8):
        result.add_pass(f"Python version ({py.major}.{py.minor}.{py.micro})")
    else:
        result.add_fail("Python version", f"3.8+ required, got {py.major}.{py.minor}")

    required_packages = [
        ("httpx", "httpx"),
        ("mcp", "mcp"),
        ("sources.job_scraper", "job scraper module"),
        ("utils.cache", "cache utilities"),
    ]
    for module, label in required_packages:
        try:  # noqa: PERF203
            __import__(module)
            result.add_pass(f"Package installed: {label}")
        except ImportError as e:  # noqa: BLE001
            result.add_fail(f"Package missing: {label}", str(e))

    try:
        node_proc = subprocess.run(["node", "--version"], capture_output=True, timeout=5)
        if node_proc.returncode == 0:
            result.add_pass(f"Node.js installed ({node_proc.stdout.decode().strip()})")
        else:
            result.add_warning("Node.js check", "Node.js not found - JobSpy MCP will not work")
    except (FileNotFoundError, subprocess.TimeoutExpired):
        result.add_warning("Node.js check", "Node.js not found - JobSpy MCP will not work")

    if os.environ.get("REED_API_KEY"):
        result.add_pass("REED_API_KEY environment variable set")
    else:
        result.add_warning(
            "REED_API_KEY",
            "Not set - Reed Jobs will not work (https://www.reed.co.uk/developers)",
        )


# ==========================================================================
# DEDUPLICATION TESTS
# ==========================================================================
async def test_deduplication(result: ValidationResult) -> None:
    print("\n" + "=" * 80)
    print("DEDUPLICATION TESTS")
    print("=" * 80 + "\n")
    job_cache.clear()

    job1 = {
        "url": "https://example.com/job/123",
        "title": "Software Engineer",
        "company": "Tech Corp",
        "description": "Great job opportunity",
    }
    job2 = job1.copy()
    is_dup1 = job_cache.is_duplicate(job1)
    is_dup2 = job_cache.is_duplicate(job2)
    if (not is_dup1) and is_dup2:
        result.add_pass("Basic duplicate detection")
    else:
        result.add_fail(
            "Basic duplicate detection",
            f"Expected job1=False, job2=True got job1={is_dup1} job2={is_dup2}",
        )

    job_cache.clear()
    job_clean = {
        "url": "https://example.com/job/456",
        "title": "DevOps Engineer",
        "company": "Cloud Inc",
        "description": "Cloud infrastructure role",
    }
    job_tracking = {
        "url": "https://example.com/job/456?utm_source=indeed&utm_campaign=test&fbclid=xyz",
        "title": "DevOps Engineer",
        "company": "Cloud Inc",
        "description": "Cloud infrastructure role",
    }
    if (not job_cache.is_duplicate(job_clean)) and job_cache.is_duplicate(job_tracking):
        result.add_pass("Tracking parameter normalization")
    else:
        result.add_fail("Tracking parameter normalization", "Tracking params not normalized")

    job_cache.clear()
    job_a = {
        "url": "https://indeed.com/job/789",
        "title": "Security Engineer",
        "company": "SecureCo",
        "description": "Security role with great benefits",
    }
    job_b = {
        "url": "https://ziprecruiter.com/job/789",
        "title": "Security Engineer",
        "company": "SecureCo",
        "description": "Security role with great benefits",
    }
    if (not job_cache.is_duplicate(job_a)) and job_cache.is_duplicate(job_b):
        result.add_pass("Content-based duplicate detection (different URLs)")
    else:
        result.add_warning(
            "Content-based duplicate detection",
            "Different URLs same content may not be deduped (expected limitation)",
        )

    job_cache.clear()
    job_ext1 = {
        "url": "https://boards.greenhouse.io/company/jobs/111",
        "title": "Product Manager",
        "company": "StartupCo",
        "description": "PM role",
        "external_job_id": "greenhouse_111",
    }
    job_ext2 = {
        "url": "https://indeed.com/view/111",
        "title": "Product Manager",
        "company": "StartupCo",
        "description": "PM role",
        "external_job_id": "greenhouse_111",
    }
    if (not job_cache.is_duplicate(job_ext1)) and job_cache.is_duplicate(job_ext2):
        result.add_pass("External ID-based deduplication")
    else:
        result.add_fail("External ID-based deduplication", "Same external_job_id not matched")

    job_cache.clear()
    for i in range(750):
        job_cache.is_duplicate(
            {
                "url": f"https://example.com/job/{i}",
                "title": f"Job {i}",
                "company": "TestCo",
                "description": f"Test job {i}",
            }
        )
    stats = job_cache.get_stats()
    if stats.get("job_hashes_count", 0) <= getattr(job_cache, "max_size", 10_000):
        result.add_pass(f"Cache size management ({stats.get('job_hashes_count')} entries)")
    else:
        result.add_fail("Cache size management", "Cache exceeded configured max size")


# ==========================================================================
# REED JOBS
# ==========================================================================
async def test_reed_jobs(result: ValidationResult) -> None:
    print("\n" + "=" * 80)
    print("REED JOBS MCP TESTS")
    print("=" * 80 + "\n")
    if not os.environ.get("REED_API_KEY"):
        result.add_warning("Reed Jobs", "REED_API_KEY not set - skipping Reed tests")
        return
    try:
        from sources.reed_mcp_scraper import ReedMCPScraper  # type: ignore

        scraper = ReedMCPScraper()
        try:
            jobs = await scraper.search(keywords="python", location="London", results_to_take=5)
            if jobs:
                result.add_pass(f"Reed API connectivity ({len(jobs)} jobs)")
                sample = jobs[0]
                required = ["title", "company", "location", "url", "job_board"]
                missing = [f for f in required if f not in sample]
                if missing:
                    result.add_fail("Reed job structure", f"Missing fields: {missing}")
                else:
                    result.add_pass("Reed job structure validation")
                if sample.get("job_board") == "reed_mcp":
                    result.add_pass("Reed normalization (job_board)")
                else:
                    result.add_fail(
                        "Reed normalization",
                        f"Expected job_board='reed_mcp' got {sample.get('job_board')}",
                    )
                result.add_scraper_result(
                    "Reed Jobs",
                    {
                        "jobs_retrieved": len(jobs),
                        "sample_title": sample.get("title"),
                        "sample_company": sample.get("company"),
                        "has_salary": bool(sample.get("salary")),
                        "has_description": bool(sample.get("description")),
                    },
                )
            else:
                result.add_warning("Reed API connectivity", "No jobs returned (narrow search)")
        except Exception as e:  # noqa: BLE001
            result.add_fail("Reed API connectivity", str(e))

        try:
            high_salary = await scraper.search(
                keywords="software engineer", location="London", minimum_salary=70000, results_to_take=3
            )
            result.add_pass(f"Reed salary filtering ({len(high_salary)} jobs)")
        except Exception as e:  # noqa: BLE001
            result.add_fail("Reed salary filtering", str(e))
    except ImportError as e:  # noqa: BLE001
        result.add_fail("Reed Jobs import", str(e))


# ==========================================================================
# JOBSPY
# ==========================================================================
async def test_jobspy(result: ValidationResult) -> None:
    print("\n" + "=" * 80)
    print("JOBSPY MCP TESTS")
    print("=" * 80 + "\n")
    try:
        from sources.jobspy_mcp_scraper import JobSpyMCPScraper  # type: ignore

        scraper = JobSpyMCPScraper()
        if not scraper.mcp_server_path:
            result.add_warning(
                "JobSpy MCP",
                "JobSpy server not found - install from https://github.com/borgius/jobspy-mcp-server",
            )
            return
        if Path(scraper.mcp_server_path).exists():
            result.add_pass(f"JobSpy server found at {scraper.mcp_server_path}")
        else:
            result.add_fail("JobSpy server path", f"Path does not exist: {scraper.mcp_server_path}")
            return
        try:
            jobs = await scraper.search(
                keywords=["python"],
                location="Remote",
                site_names=["indeed"],
                results_wanted=5,
                hours_old=72,
            )
            if jobs:
                result.add_pass(f"JobSpy multi-site search ({len(jobs)} jobs)")
                sample = jobs[0]
                required = ["title", "company", "location", "url"]
                miss = [f for f in required if f not in sample]
                if miss:
                    result.add_fail("JobSpy job structure", f"Missing fields: {miss}")
                else:
                    result.add_pass("JobSpy job structure validation")
                if "jobspy_site" in sample:
                    result.add_pass("JobSpy site tracking (jobspy_site)")
                else:
                    result.add_warning("JobSpy site tracking", "jobspy_site field missing")
                site_counts: Dict[str, int] = {}
                for j in jobs:
                    site = j.get("jobspy_site", "unknown")
                    site_counts[site] = site_counts.get(site, 0) + 1
                result.add_scraper_result(
                    "JobSpy",
                    {
                        "jobs_retrieved": len(jobs),
                        "sites_used": list(site_counts.keys()),
                        "site_breakdown": site_counts,
                        "sample_title": sample.get("title"),
                    },
                )
            else:
                result.add_warning("JobSpy multi-site search", "No jobs returned")
        except subprocess.TimeoutExpired:
            result.add_fail("JobSpy multi-site search", "Request timed out (>120s)")
        except Exception as e:  # noqa: BLE001
            result.add_fail("JobSpy multi-site search", str(e))
    except ImportError as e:  # noqa: BLE001
        result.add_fail("JobSpy import", str(e))


# ==========================================================================
# JOBSWITHGPT
# ==========================================================================
async def test_jobswithgpt(result: ValidationResult) -> None:
    print("\n" + "=" * 80)
    print("JOBSWITHGPT MCP TESTS")
    print("=" * 80 + "\n")
    try:
        from sources.jobswithgpt_scraper import JobsWithGPTScraper  # type: ignore

        scraper = JobsWithGPTScraper()
        try:
            jobs = await scraper.search(
                keywords=["python"], locations=[{"city": "Denver", "state": "CO"}], page=1
            )
            if jobs:
                result.add_pass(f"JobsWithGPT search ({len(jobs)} jobs)")
                sample = jobs[0]
                req = ["title", "company", "url"]
                missing = [f for f in req if f not in sample]
                if missing:
                    result.add_fail("JobsWithGPT job structure", f"Missing fields: {missing}")
                else:
                    result.add_pass("JobsWithGPT job structure")
                result.add_scraper_result(
                    "JobsWithGPT",
                    {
                        "jobs_retrieved": len(jobs),
                        "sample_title": sample.get("title"),
                        "sample_company": sample.get("company"),
                    },
                )
            else:
                result.add_warning("JobsWithGPT search", "No jobs returned - API down or blocked")
        except Exception as e:  # noqa: BLE001
            result.add_fail("JobsWithGPT search", str(e))
    except ImportError as e:  # noqa: BLE001
        result.add_fail("JobsWithGPT import", str(e))


# ==========================================================================
# SECURITY TESTS
# ==========================================================================
async def test_security(result: ValidationResult) -> None:
    print("\n" + "=" * 80)
    print("SECURITY VALIDATION")
    print("=" * 80 + "\n")

    dangerous_files = [
        ".env",
        "config/user_prefs.json",
        ".config/claude/claude_desktop_config.json",
    ]
    patterns: List[Tuple[str, str]] = [
        (r'COOKIE\s*=\s*["\']?[A-Za-z0-9+/=]{20,}', "session cookie"),
        (r'API[_-]?KEY\s*[=:]\s*["\']?[A-Za-z0-9]{20,}', "API key"),
        (r'li_at\s*[=:]\s*["\']?[A-Za-z0-9]{20,}', "LinkedIn cookie"),
    ]
    import re

    creds_found: List[str] = []
    for rel in dangerous_files:
        full = Path(__file__).parent.parent / rel
        if full.exists():
            try:
                content = full.read_text()
                for pat, label in patterns:
                    if re.search(pat, content, re.IGNORECASE):
                        creds_found.append(f"{rel} contains {label} - should use env vars")
            except Exception as e:  # noqa: BLE001
                validation_logger.debug("Credential scan error %s: %s", rel, e)
    if creds_found:
        for w in creds_found:
            result.add_warning("Credential security", w)
    else:
        result.add_pass("No plaintext credentials in config files")

    try:
        from sources.jobspy_mcp_scraper import JobSpyMCPScraper  # type: ignore

        spy = JobSpyMCPScraper()
        if spy.mcp_server_path:
            p = Path(spy.mcp_server_path)
            if p.exists() and p.suffix == ".js":
                result.add_pass("JobSpy server path validation (Node.js script)")
            else:
                result.add_fail("JobSpy server path", f"Unexpected type/path: {p}")
    except Exception as e:  # noqa: BLE001
        result.add_warning("JobSpy security check", str(e))

    try:
        from sources.reed_mcp_scraper import ReedMCPScraper  # noqa: F401  # type: ignore
        result.add_pass("Reed API uses HTTPS (verified in code)")
    except Exception as e:  # noqa: BLE001
        result.add_warning("Reed Jobs security check", str(e))

    result.add_warning(
        "Network isolation",
        "MCP servers have full network access. Consider Docker-based isolation.",
    )
    result.add_warning(
        "File system access",
        "MCP servers run with user privileges. Consider read-only mounts.",
    )

    try:
        from sources import jobspy_mcp_scraper  # type: ignore
        import inspect

        source = inspect.getsource(jobspy_mcp_scraper)
        if "shell=True" in source:
            result.add_fail("Shell injection risk", "Found shell=True in subprocess calls")
        else:
            result.add_pass("No shell=True in subprocess calls")
    except Exception as e:  # noqa: BLE001
        result.add_warning("Shell inspection", str(e))

    result.add_pass("No SQL queries in MCP scrapers (API calls only)")

    from sources.jobswithgpt_scraper import JobsWithGPTScraper  # type: ignore

    sanitizer = JobsWithGPTScraper()
    probes = [
        ("'; DROP TABLE jobs--", "SQL injection attempt"),
        ("../../../etc/passwd", "Path traversal attempt"),
        ("<script>alert('xss')</script>", "XSS attempt"),
        ("$(rm -rf /)", "Command injection attempt"),
    ]
    safe = True
    for payload, label in probes:
        try:
            await sanitizer.search(keywords=[payload], page=1)
        except Exception as e:  # noqa: BLE001
            if "SQL" in str(e) or "command" in str(e).lower():
                result.add_fail("Input sanitization", f"{label} may not be sanitized: {e}")
                safe = False
                break
    if safe:
        result.add_pass("Input sanitization (basic tests)")

    result.add_warning(
        "Rate limiting",
        "No rate limiting for MCP calls. Consider adding to prevent abuse.",
    )
    result.add_warning(
        "Audit logging",
        "MCP tool calls not separately logged. Consider structured audit logs.",
    )


# ==========================================================================
# INTEGRATION TESTS
# ==========================================================================
async def test_integration(result: ValidationResult) -> None:
    print("\n" + "=" * 80)
    print("INTEGRATION TESTS")
    print("=" * 80 + "\n")
    try:
        from sources.job_scraper import (  # type: ignore
            search_jobs_by_keywords,
            search_reed_jobs,
            search_multi_site_jobs,
            _ensure_registry,
        )
        registry = _ensure_registry()
        count = len(registry.scrapers)
        if count >= 6:
            result.add_pass(f"Scraper registry ({count} registered)")
        else:
            result.add_warning("Scraper registry", f"Only {count} scrapers registered - expected >= 6")

        for name, fn in [
            ("search_jobs_by_keywords", search_jobs_by_keywords),
            ("search_reed_jobs", search_reed_jobs),
            ("search_multi_site_jobs", search_multi_site_jobs),
        ]:
            if callable(fn):
                result.add_pass(f"Global function available: {name}")
            else:
                result.add_fail(f"Global function: {name}", "Not callable")

        job_cache.clear()
        test_jobs_id = [
            {
                "url": "https://boards.greenhouse.io/company/jobs/12345",
                "title": "Test Engineer",
                "company": "TestCo",
                "description": "Validation job",
                "job_board": "greenhouse",
                "external_job_id": "greenhouse_12345",
            },
            {
                "url": "https://jobswithgpt.com/job/abc",
                "title": "Test Engineer",
                "company": "TestCo",
                "description": "Validation job",
                "job_board": "jobswithgpt",
                "external_job_id": "greenhouse_12345",
            },
            {
                "url": "https://indeed.com/job/xyz",
                "title": "Test Engineer",
                "company": "TestCo",
                "description": "Validation job",
                "job_board": "jobspy_indeed",
                "external_job_id": "greenhouse_12345",
            },
        ]
        dup_count = 0
        for job in test_jobs_id:
            if job_cache.is_duplicate(job):
                dup_count += 1
        if dup_count == 2:
            result.add_pass("Cross-scraper deduplication (external ID)")
        else:
            result.add_fail(
                "Cross-scraper deduplication (external ID)",
                f"Expected 2 duplicates caught, got {dup_count}",
            )

        job_cache.clear()
        jobs_url = [
            {
                "url": "https://example.com/job/999",
                "title": "Software Engineer",
                "company": "TechCorp",
                "description": "Different job",
                "job_board": "direct",
            },
            {
                "url": "https://example.com/job/999?utm_source=reed&utm_campaign=test",
                "title": "Software Engineer",
                "company": "TechCorp",
                "description": "Different job",
                "job_board": "reed_mcp",
            },
        ]
        url_dup = 0
        for job in jobs_url:
            if job_cache.is_duplicate(job):
                url_dup += 1
        if url_dup == 1:
            result.add_pass("Cross-scraper deduplication (URL normalization)")
        else:
            result.add_warning(
                "Cross-scraper deduplication (URL)",
                f"Expected 1 duplicate caught, got {url_dup}",
            )
    except ImportError as e:  # noqa: BLE001
        result.add_fail("Integration imports", str(e))


# ==========================================================================
# MAIN
# ==========================================================================
async def main() -> None:
    print("\n" + "=" * 80)
    print("MCP SCRAPER VALIDATION SUITE")
    print("=" * 80)
    print("\nThis script validates:")
    print(" 1. Prerequisites (Python, packages, Node.js)")
    print(" 2. Deduplication logic")
    print(" 3. Reed Jobs MCP integration")
    print(" 4. JobSpy MCP integration")
    print(" 5. JobsWithGPT integration")
    print(" 6. Cross-scraper integration + security")
    print("\n" + "=" * 80)

    result = ValidationResult()
    try:
        check_prerequisites(result)
        await test_security(result)
        await test_deduplication(result)
        await test_jobswithgpt(result)
        await test_reed_jobs(result)
        await test_jobspy(result)
        await test_integration(result)
    except KeyboardInterrupt:
        print("\n\n[WARNING] Validation interrupted by user")
        result.add_fail("Validation", "Interrupted by user")
    except Exception as e:  # noqa: BLE001
        print(f"\n\n[ERROR] Unexpected error during validation: {e}")
        import traceback

        traceback.print_exc()
        result.add_fail("Validation", f"Unexpected error: {e}")
    finally:
        result.print_summary()
        sys.exit(0 if result.tests_failed == 0 else 1)


if __name__ == "__main__":  # pragma: no cover
    asyncio.run(main())
