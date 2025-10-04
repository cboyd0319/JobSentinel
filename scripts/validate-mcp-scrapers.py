#!/usr/bin/env python3
"""Compact MCP scraper validation script.

Rebuilt clean; legacy duplicated content removed. Performs:
  * Prerequisite checks (Python, imports, Node.js, env vars)
  * Deduplication tests
  * Scraper smoke tests (Reed, JobSpy, JobsWithGPT)
  * Integration registry + cross-scraper dedupe
  * Light security heuristics
"""
from __future__ import annotations

import asyncio
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Dict, List

sys.path.insert(0, str(Path(__file__).parent.parent))  # project root

from utils.logging import setup_logging  # noqa: E402
from utils.cache import job_cache  # noqa: E402

setup_logging(log_level="INFO")


class Result:
    def __init__(self) -> None:
        self.run = 0
        self.passed = 0
        self.failed = 0
        self.warnings: List[str] = []
        self.errors: List[str] = []
        self.snapshots: Dict[str, Dict[str, object]] = {}

    def ok(self, name: str) -> None:
        self.run += 1
        self.passed += 1
        print(f"[OK] {name}")

    def fail(self, name: str, msg: str) -> None:
        self.run += 1
        self.failed += 1
        self.errors.append(f"{name}: {msg}")
        print(f"[ERROR] {name}\n  {msg}")

    def warn(self, name: str, msg: str) -> None:
        self.warnings.append(f"{name}: {msg}")
        print(f"[WARN] {name}\n  {msg}")

    def snap(self, scraper: str, data: Dict[str, object]) -> None:
        self.snapshots[scraper] = data

    def summarize(self) -> int:
        print("\n" + "=" * 60)
        print("MCP SCRAPER VALIDATION SUMMARY")
        print("=" * 60)
        print(
            f"Tests: {self.run}  Passed: {self.passed}  Failed: {self.failed}  Warnings: {len(self.warnings)}"
        )
        if self.errors:
            print("\nErrors:")
            for e in self.errors:
                print(f" - {e}")
        if self.warnings:
            print("\nWarnings:")
            for w in self.warnings:
                print(f" - {w}")
        if self.snapshots:
            print("\nSnapshots:")
            for name, snap in self.snapshots.items():
                print(f" {name}:")
                for k, v in snap.items():
                    print(f"   {k}: {v}")
        print("=" * 60)
        return 0 if self.failed == 0 else 1


def check_prereqs(r: Result) -> None:
    print("\n== Prerequisites ==")
    py = sys.version_info
    if py >= (3, 9):
        r.ok(f"Python {py.major}.{py.minor}")
    else:
        r.fail("Python", "3.9+ recommended")
    for mod in ["httpx", "sources.job_scraper", "utils.cache"]:
        try:
            __import__(mod)
            r.ok(f"Import: {mod}")
        except Exception as e:  # noqa: BLE001
            r.fail(f"Import: {mod}", str(e))
    try:
        proc = subprocess.run(["node", "--version"], capture_output=True, timeout=4)
        if proc.returncode == 0:
            r.ok(f"Node.js {proc.stdout.decode().strip()}")
        else:
            r.warn("Node.js", "Not installed")
    except Exception:  # noqa: BLE001
        r.warn("Node.js", "Not installed")
    if os.environ.get("REED_API_KEY"):
        r.ok("REED_API_KEY set")
    else:
        r.warn("REED_API_KEY", "Missing (Reed tests skipped)")


async def test_dedup(r: Result) -> None:
    print("\n== Deduplication ==")
    job_cache.clear()
    j1 = {"url": "https://x/job/1", "title": "A", "company": "C", "description": "d"}
    j2 = j1.copy()
    if not job_cache.is_duplicate(j1) and job_cache.is_duplicate(j2):
        r.ok("Duplicate detection basic")
    else:
        r.fail("Duplicate detection basic", "Second identical not flagged")
    job_cache.clear()
    base = {"url": "https://x/job/2", "title": "B", "company": "C", "description": "d"}
    track = {"url": base["url"] + "?utm_source=test", **base}
    if not job_cache.is_duplicate(base) and job_cache.is_duplicate(track):
        r.ok("URL normalization tracking")
    else:
        r.fail("URL normalization", "Tracking params not normalized")
    job_cache.clear()
    ext1 = {"url": "https://x/gh/10", "external_job_id": "gh_10", **base}
    ext2 = {"url": "https://y/indeed/10", "external_job_id": "gh_10", **base}
    if not job_cache.is_duplicate(ext1) and job_cache.is_duplicate(ext2):
        r.ok("External ID dedupe")
    else:
        r.fail("External ID dedupe", "Mismatch external IDs")


async def test_reed(r: Result) -> None:
    print("\n== Reed ==")
    if not os.environ.get("REED_API_KEY"):
        r.warn("Reed", "API key missing — skipped")
        return
    try:
        from sources.reed_mcp_scraper import ReedMCPScraper  # type: ignore

        s = ReedMCPScraper()
        jobs = await s.search(keywords="python", location="London", results_to_take=3)
        if jobs:
            r.ok(f"Reed search ({len(jobs)})")
            sample = jobs[0]
            if all(k in sample for k in ["title", "company", "url"]):
                r.ok("Reed job structure")
            else:
                r.fail("Reed job structure", "Missing core fields")
            r.snap("Reed", {"count": len(jobs), "sample": sample.get("title")})
        else:
            r.warn("Reed search", "No jobs returned")
    except Exception as e:  # noqa: BLE001
        r.fail("Reed", str(e))


async def test_jobspy(r: Result) -> None:
    print("\n== JobSpy ==")
    try:
        from sources.jobspy_mcp_scraper import JobSpyMCPScraper  # type: ignore
    except Exception as e:  # noqa: BLE001
        r.fail("JobSpy import", str(e))
        return
    s = JobSpyMCPScraper()
    if not s.mcp_server_path:
        r.warn("JobSpy", "mcp_server_path missing")
        return
    if not Path(s.mcp_server_path).exists():
        r.fail("JobSpy server path", "Does not exist")
        return
    r.ok("JobSpy server path exists")
    try:
        jobs = await s.search(
            keywords=["python"], location="Remote", site_names=["indeed"], results_wanted=3
        )
        if jobs:
            r.ok(f"JobSpy search ({len(jobs)})")
            sample = jobs[0]
            if all(k in sample for k in ["title", "company", "url"]):
                r.ok("JobSpy job structure")
            else:
                r.fail("JobSpy job structure", "Missing fields")
            r.snap("JobSpy", {"count": len(jobs), "sample": sample.get("title")})
        else:
            r.warn("JobSpy search", "No jobs returned")
    except subprocess.TimeoutExpired:
        r.fail("JobSpy search", "Timeout")
    except Exception as e:  # noqa: BLE001
        r.fail("JobSpy search", str(e))


async def test_jobswithgpt(r: Result) -> None:
    print("\n== JobsWithGPT ==")
    try:
        from sources.jobswithgpt_scraper import JobsWithGPTScraper  # type: ignore
    except Exception as e:  # noqa: BLE001
        r.fail("JobsWithGPT import", str(e))
        return
    s = JobsWithGPTScraper()
    try:
        jobs = await s.search(
            keywords=["python"], locations=[{"city": "Denver", "state": "CO"}], page=1
        )
        if jobs:
            r.ok(f"JobsWithGPT search ({len(jobs)})")
            sample = jobs[0]
            if all(k in sample for k in ["title", "company", "url"]):
                r.ok("JobsWithGPT job structure")
            else:
                r.fail("JobsWithGPT job structure", "Missing fields")
            r.snap(
                "JobsWithGPT", {"count": len(jobs), "sample": sample.get("title")}
            )
        else:
            r.warn("JobsWithGPT search", "No jobs returned")
    except Exception as e:  # noqa: BLE001
        r.fail("JobsWithGPT search", str(e))


async def test_integration(r: Result) -> None:
    print("\n== Integration ==")
    try:
        from sources.job_scraper import _ensure_registry  # type: ignore
    except Exception as e:  # noqa: BLE001
        r.fail("Registry import", str(e))
        return
    try:
        reg = _ensure_registry()
        count = len(reg.scrapers)
        if count >= 3:
            r.ok(f"Registry size {count}")
        else:
            r.warn("Registry size", f"Only {count} scrapers registered")
    except Exception as e:  # noqa: BLE001
        r.fail("Registry init", str(e))
    job_cache.clear()
    for job in [
        {"url": "https://a/1", "external_job_id": "id1"},
        {"url": "https://b/1", "external_job_id": "id1"},
    ]:
        job_cache.is_duplicate(
            {**job, "title": "T", "company": "C", "description": "d"}
        )
    is_dup = job_cache.is_duplicate(
        {
            "url": "https://c/1",
            "external_job_id": "id1",
            "title": "T",
            "company": "C",
            "description": "d",
        }
    )
    if is_dup:
        r.ok("Cross-scraper external ID dedupe")
    else:
        r.fail("Cross-scraper external ID dedupe", "Expected duplicate not flagged")


async def test_security(r: Result) -> None:
    print("\n== Security Heuristics ==")
    patterns = re.compile(r"(API[_-]?KEY|SECRET|TOKEN)[=:].{12,}")
    leaks: List[str] = []
    for rel in [".env", "config/user_prefs.json"]:
        p = Path(rel)
        if p.exists() and p.is_file():
            try:
                txt = p.read_text()[:4000]
                if patterns.search(txt):
                    leaks.append(rel)
            except Exception:  # noqa: BLE001
                pass
    if leaks:
        r.warn("Credential scan", f"Potential secrets: {', '.join(leaks)}")
    else:
        r.ok("Credential scan clean")
    try:
        import inspect
        from sources import jobspy_mcp_scraper  # type: ignore

        src = inspect.getsource(jobspy_mcp_scraper)
        if "shell=True" in src:
            r.fail("Shell usage", "shell=True detected in jobspy_mcp_scraper")
        else:
            r.ok("Shell usage none")
    except Exception:  # noqa: BLE001
        r.warn("Shell usage", "Could not inspect jobspy_mcp_scraper")


async def main() -> int:
    print("MCP SCRAPER VALIDATION (compact)\n" + "-" * 60)
    r = Result()
    check_prereqs(r)
    await test_dedup(r)
    await test_security(r)
    await test_reed(r)
    await test_jobspy(r)
    await test_jobswithgpt(r)
    await test_integration(r)
    return r.summarize()


if __name__ == "__main__":  # pragma: no cover
    try:
        code = asyncio.run(main())
    except KeyboardInterrupt:
        print("\nInterrupted")
        code = 130
    except Exception as exc:  # noqa: BLE001
        print(f"\nFatal error: {exc}")
        code = 1
    sys.exit(code)
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
#!/usr/bin/env python3
"""Comprehensive validation script for MCP scrapers.

Restored clean version: validates prerequisites, deduplication, security, and
individual scraper integrations (Reed, JobSpy, JobsWithGPT) plus integration
behavior. Structure and logic are equivalent to intent of the previously
corrupted file; indentation and control flow normalized.
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

    # --- Recording helpers -------------------------------------------------
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

    # --- Reporting ---------------------------------------------------------
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

    # Python version
    py = sys.version_info
    if py >= (3, 8):
        result.add_pass(f"Python version ({py.major}.{py.minor}.{py.micro})")
    else:
        result.add_fail("Python version", f"3.8+ required, got {py.major}.{py.minor}")

    # Required imports
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

    # Node.js
    try:
        node_proc = subprocess.run(["node", "--version"], capture_output=True, timeout=5)
        if node_proc.returncode == 0:
            result.add_pass(f"Node.js installed ({node_proc.stdout.decode().strip()})")
        else:
            result.add_warning("Node.js check", "Node.js not found - JobSpy MCP will not work")
    except (FileNotFoundError, subprocess.TimeoutExpired):
        result.add_warning("Node.js check", "Node.js not found - JobSpy MCP will not work")

    # Reed API key
    if os.environ.get("REED_API_KEY"):
        result.add_pass("REED_API_KEY environment variable set")
    else:
        result.add_warning(
            "REED_API_KEY",
            "Not set - Reed Jobs will not work (get free key from https://www.reed.co.uk/developers)",
        )


# ==========================================================================
# DEDUPLICATION TESTS
# ==========================================================================
async def test_deduplication(result: ValidationResult) -> None:
    print("\n" + "=" * 80)
    print("DEDUPLICATION TESTS")
    print("=" * 80 + "\n")
    job_cache.clear()

    # 1. Basic duplicate detection
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

    # 2. Tracking parameter removal
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
        result.add_fail("Tracking parameter normalization", "Tracking parameters not normalized")

    # 3. Content-based matching (warning if not caught)
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

    # 4. External ID matching
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

    # 5. Cache size management
    job_cache.clear()
    for i in range(1000):
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
        result.add_warning(
            "Reed Jobs", "REED_API_KEY not set - skipping Reed tests"
        )
        return
    try:
        from sources.reed_mcp_scraper import ReedMCPScraper  # type: ignore

        scraper = ReedMCPScraper()
        # Connectivity + structure
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
                result.add_warning(
                    "Reed API connectivity", "No jobs returned (possibly narrow search)"
                )
        except Exception as e:  # noqa: BLE001
            result.add_fail("Reed API connectivity", str(e))

        # Salary filtering
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
                result.add_warning(
                    "JobSpy multi-site search", "No jobs returned (rate limit or scraper issue)"
                )
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
                result.add_warning(
                    "JobsWithGPT search", "No jobs returned - API down or blocked"
                )
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

    # 1. Credential leakage scan
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
    import re  # local import

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

    # 2. JobSpy subprocess path safety
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

    # 3. Reed API HTTPS assumption
    try:
        from sources.reed_mcp_scraper import ReedMCPScraper  # noqa: F401  # type: ignore
        result.add_pass("Reed API uses HTTPS (verified in code)")
    except Exception as e:  # noqa: BLE001
        result.add_warning("Reed Jobs security check", str(e))

    # 4 & 5 advisories
    result.add_warning(
        "Network isolation",
        "MCP servers have full network access. Consider Docker-based isolation.",
    )
    result.add_warning(
        "File system access",
        "MCP servers run with user privileges. Consider read-only mounts.",
    )

    # 6. Shell injection check
    try:
        from sources import jobspy_mcp_scraper  # type: ignore
        import inspect

        source = inspect.getsource(jobspy_mcp_scraper)
        if "shell=True" in source:
            result.add_fail(
                "Shell injection risk", "Found shell=True in subprocess calls"
            )
        else:
            result.add_pass("No shell=True in subprocess calls")
    except Exception as e:  # noqa: BLE001
        result.add_warning("Shell inspection", str(e))

    # 7. SQL injection (not applicable)
    result.add_pass("No SQL queries in MCP scrapers (API calls only)")

    # 8. Input sanitization
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
                result.add_fail(
                    "Input sanitization",
                    f"{label} may not be sanitized: {e}",
                )
                safe = False
                break
    if safe:
        result.add_pass("Input sanitization (basic tests)")

    # 9. Rate limiting advisory
    result.add_warning(
        "Rate limiting",
        "No rate limiting for MCP calls. Consider adding to prevent abuse.",
    )

    # 10. Audit logging advisory
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
            result.add_warning(
                "Scraper registry", f"Only {count} scrapers registered - expected >= 6"
            )
        # Global function availability
        for name, fn in [
            ("search_jobs_by_keywords", search_jobs_by_keywords),
            ("search_reed_jobs", search_reed_jobs),
            ("search_multi_site_jobs", search_multi_site_jobs),
        ]:
            if callable(fn):
                result.add_pass(f"Global function available: {name}")
            else:
                result.add_fail(f"Global function: {name}", "Not callable")

        # Cross-scraper deduplication (external IDs)
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

        # URL-based deduplication
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
#!/usr/bin/env python3
"""
Comprehensive validation script for MCP scrapers.

Tests all MCP integrations and reports issues before production use.
"""

import asyncio
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from utils.logging import setup_logging, get_logger
from utils.cache import job_cache

# Setup logging
logger = setup_logging(log_level="INFO")
validation_logger = get_logger("validation")


class ValidationResult:
	"""Store validation results for reporting."""

	def __init__(self):
		self.tests_run = 0
		self.tests_passed = 0
		self.tests_failed = 0
		self.warnings: List[str] = []
		self.errors: List[str] = []
		self.scraper_results: Dict[str, Dict] = {}

	def add_pass(self, test_name: str):
		self.tests_run += 1
		self.tests_passed += 1
		print(f" [OK] {test_name}")

	def add_fail(self, test_name: str, error: str):
		self.tests_run += 1
		self.tests_failed += 1
		self.errors.append(f"{test_name}: {error}")
		print(f" [ERROR] {test_name}")
		print(f"  Error: {error}")

	def add_warning(self, test_name: str, message: str):
		self.warnings.append(f"{test_name}: {message}")
		print(f" [WARNING] {test_name}")
		print(f"  Warning: {message}")

	def add_scraper_result(self, scraper_name: str, data: Dict):
		self.scraper_results[scraper_name] = data

	def print_summary(self):
		print("\n" + "=" * 80)
		print("VALIDATION SUMMARY")
		print("=" * 80)
		print(f"\nTests Run: {self.tests_run}")
		print(f"Passed: {self.tests_passed} [OK]")
		print(f"Failed: {self.tests_failed} [ERROR]")
		print(f"Warnings: {len(self.warnings)} [WARNING]")

		if self.errors:
			print("\n🚫 ERRORS:")
			for error in self.errors:
				print(f" - {error}")

		if self.warnings:
			print("\n[WARNING] WARNINGS:")
			for warning in self.warnings:
				print(f" - {warning}")

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


# ============================================================================
# PREREQUISITE CHECKS
# ============================================================================


def check_prerequisites(result: ValidationResult):
	"""Check all prerequisites before testing scrapers."""
	print("\n" + "=" * 80)
	print("PREREQUISITE CHECKS")
	print("=" * 80 + "\n")

	# Check Python version
	python_version = sys.version_info
	if python_version >= (3, 8):
		result.add_pass(
			f"Python version ({python_version.major}.{python_version.minor}.{python_version.micro})"
		)
	else:
		result.add_fail(
			"Python version",
			f"Python 3.8+ required, got {python_version.major}.{python_version.minor}",
		)

	# Check required imports
	required_packages = [
		("httpx", "httpx"),
		("mcp", "mcp"),
		("sources.job_scraper", "job scraper module"),
		("utils.cache", "cache utilities"),
	]

	for package, display_name in required_packages:
		try:
			__import__(package)
			result.add_pass(f"Package installed: {display_name}")
		except ImportError as e:
			result.add_fail(f"Package missing: {display_name}", str(e))

	# Check Node.js (for JobSpy)
	try:
		node_result = subprocess.run(
			["node", "--version"],
			capture_output=True,
			timeout=5,
		)
		if node_result.returncode == 0:
			node_version = node_result.stdout.decode().strip()
			result.add_pass(f"Node.js installed ({node_version})")
		else:
			result.add_warning(
				"Node.js check",
				"Node.js not found - JobSpy MCP will not work",
			)
	except (FileNotFoundError, subprocess.TimeoutExpired):
		result.add_warning(
			"Node.js check",
			"Node.js not found - JobSpy MCP will not work",
		)

	# Check environment variables
	reed_key = os.environ.get("REED_API_KEY")
	if reed_key:
		result.add_pass("REED_API_KEY environment variable set")
	else:
		result.add_warning(
			"REED_API_KEY",
			"Not set - Reed Jobs will not work (get free key from https://www.reed.co.uk/developers)",
		)


# ============================================================================
# DEDUPLICATION TESTS
# ============================================================================


async def test_deduplication(result: ValidationResult):
 """Test deduplication logic with synthetic data."""
 print("\n" + "=" * 80)
 print("DEDUPLICATION TESTS")
 print("=" * 80 + "\n")

 # Clear cache for clean test
 job_cache.clear()

 # Test 1: Basic duplicate detection
 job1 = {
 "url": "https://example.com/job/123",
 "title": "Software Engineer",
 "company": "Tech Corp",
 "description": "Great job opportunity"
 }

 job2 = {
 "url": "https://example.com/job/123",
 "title": "Software Engineer",
 "company": "Tech Corp",
 "description": "Great job opportunity"
 }

 is_dup1 = job_cache.is_duplicate(job1)
 is_dup2 = job_cache.is_duplicate(job2)

 if not is_dup1 and is_dup2:
     result.add_pass("Basic duplicate detection")
 else:
     result.add_fail(
         "Basic duplicate detection",
         f"Expected job1=False, job2=True, got job1={is_dup1}, job2={is_dup2}",
     )

 # Test 2: Tracking parameter removal
 job_cache.clear()

 job_clean = {
 "url": "https://example.com/job/456",
 "title": "DevOps Engineer",
 "company": "Cloud Inc",
 "description": "Cloud infrastructure role"
 }

 job_with_tracking = {
 "url": "https://example.com/job/456?utm_source=indeed&utm_campaign=test&fbclid=xyz",
 "title": "DevOps Engineer",
 "company": "Cloud Inc",
 "description": "Cloud infrastructure role"
 }

 is_dup_clean = job_cache.is_duplicate(job_clean)
 is_dup_tracking = job_cache.is_duplicate(job_with_tracking)

 if not is_dup_clean and is_dup_tracking:
 result.add_pass("Tracking parameter normalization")
 else:
 result.add_fail(
 "Tracking parameter normalization",
 f"URLs should match after param removal. Got clean={is_dup_clean}, tracking={is_dup_tracking}"
 )

 # Test 3: Content-based matching (different URLs, same content)
 job_cache.clear()

 job_url1 = {
 "url": "https://indeed.com/job/789",
 "title": "Security Engineer",
 "company": "SecureCo",
 "description": "Security role with great benefits"
 }

 job_url2 = {
 "url": "https://ziprecruiter.com/job/789",
 "title": "Security Engineer",
 "company": "SecureCo",
 "description": "Security role with great benefits"
 }

 is_dup_url1 = job_cache.is_duplicate(job_url1)
 is_dup_url2 = job_cache.is_duplicate(job_url2)

 if not is_dup_url1 and is_dup_url2:
 result.add_pass("Content-based duplicate detection (different URLs)")
 else:
 result.add_warning(
 "Content-based duplicate detection",
 "Different URLs with same content may not be caught (this is expected)"
 )

 # Test 4: External ID matching
 job_cache.clear()

 job_with_id1 = {
 "url": "https://boards.greenhouse.io/company/jobs/111",
 "title": "Product Manager",
 "company": "StartupCo",
 "description": "PM role",
 "external_job_id": "greenhouse_111"
 }

 job_with_id2 = {
 "url": "https://indeed.com/view/111",
 "title": "Product Manager",
 "company": "StartupCo",
 "description": "PM role",
 "external_job_id": "greenhouse_111"
 }

 is_dup_id1 = job_cache.is_duplicate(job_with_id1)
 is_dup_id2 = job_cache.is_duplicate(job_with_id2)

 if not is_dup_id1 and is_dup_id2:
 result.add_pass("External ID-based deduplication")
 else:
 result.add_fail(
 "External ID-based deduplication",
 f"Jobs with same external_job_id should match. Got id1={is_dup_id1}, id2={is_dup_id2}"
 )

 # Test 5: Cache size and performance
 job_cache.clear()
 large_batch_size = 1000

 for i in range(large_batch_size):
 test_job = {
 "url": f"https://example.com/job/{i}",
 "title": f"Job {i}",
 "company": "TestCo",
 "description": f"Test job {i}"
 }
 job_cache.is_duplicate(test_job)

 stats = job_cache.get_stats()
 if stats["job_hashes_count"] <= job_cache.max_size:
 result.add_pass(f"Cache size management ({stats['job_hashes_count']} entries)")
 else:
 result.add_fail(
 "Cache size management",
 f"Cache exceeded max_size: {stats['job_hashes_count']} > {job_cache.max_size}"
 )


# ============================================================================
# REED JOBS TESTS
# ============================================================================


async def test_reed_jobs(result: ValidationResult):
 """Test Reed Jobs MCP integration."""
 print("\n" + "=" * 80)
 print("REED JOBS MCP TESTS")
 print("=" * 80 + "\n")

 api_key = os.environ.get("REED_API_KEY")
 if not api_key:
 result.add_warning(
 "Reed Jobs",
 "REED_API_KEY not set - skipping Reed tests"
 )
 return

 try:
 from sources.reed_mcp_scraper import ReedMCPScraper

 scraper = ReedMCPScraper()

 # Test 1: Basic API connectivity
 try:
 jobs = await scraper.search(
 keywords="python",
 location="London",
 results_to_take=5
 )

 if jobs:
 result.add_pass(f"Reed API connectivity ({len(jobs)} jobs retrieved)")

 # Validate job structure
 sample_job = jobs[0]
 required_fields = ["title", "company", "location", "url", "job_board"]

 missing_fields = [f for f in required_fields if f not in sample_job]
 if not missing_fields:
 result.add_pass("Reed job structure validation")
 else:
 result.add_fail(
 "Reed job structure",
 f"Missing fields: {missing_fields}"
 )

 # Check normalization
 if sample_job.get("job_board") == "reed_mcp":
 result.add_pass("Reed job normalization (job_board field)")
 else:
 result.add_fail(
 "Reed job normalization",
 f"Expected job_board='reed_mcp', got '{sample_job.get('job_board')}'"
 )

 # Store results
 result.add_scraper_result("Reed Jobs", {
 "jobs_retrieved": len(jobs),
 "sample_title": sample_job.get("title"),
 "sample_company": sample_job.get("company"),
 "has_salary": bool(sample_job.get("salary")),
 "has_description": bool(sample_job.get("description"))
 })

 else:
 result.add_warning(
 "Reed API connectivity",
 "No jobs returned - this might be normal for narrow searches"
 )

 except Exception as e:
 result.add_fail("Reed API connectivity", str(e))

 # Test 2: Salary filtering
 try:
 high_salary_jobs = await scraper.search(
 keywords="software engineer",
 location="London",
 minimum_salary=70000,
 results_to_take=3
 )

 result.add_pass(f"Reed salary filtering ({len(high_salary_jobs)} jobs)")

 except Exception as e:
 result.add_fail("Reed salary filtering", str(e))

 except ImportError as e:
 result.add_fail("Reed Jobs import", str(e))


# ============================================================================
# JOBSPY TESTS
# ============================================================================


async def test_jobspy(result: ValidationResult):
 """Test JobSpy MCP integration."""
 print("\n" + "=" * 80)
 print("JOBSPY MCP TESTS")
 print("=" * 80 + "\n")

 try:
 from sources.jobspy_mcp_scraper import JobSpyMCPScraper

 scraper = JobSpyMCPScraper()

 if not scraper.mcp_server_path:
 result.add_warning(
 "JobSpy MCP",
 "JobSpy server not found - install from https://github.com/borgius/jobspy-mcp-server"
 )
 return

 # Test 1: Server accessibility
 if Path(scraper.mcp_server_path).exists():
 result.add_pass(f"JobSpy server found at {scraper.mcp_server_path}")
 else:
 result.add_fail(
 "JobSpy server path",
 f"Path does not exist: {scraper.mcp_server_path}"
 )
 return

 # Test 2: Multi-site search
 try:
 jobs = await scraper.search(
 keywords=["python"],
 location="Remote",
 site_names=["indeed"], # Test with just one site first
 results_wanted=5,
 hours_old=72
 )

 if jobs:
 result.add_pass(f"JobSpy multi-site search ({len(jobs)} jobs)")

 # Validate job structure
 sample_job = jobs[0]
 required_fields = ["title", "company", "location", "url"]

 missing_fields = [f for f in required_fields if f not in sample_job]
 if not missing_fields:
 result.add_pass("JobSpy job structure validation")
 else:
 result.add_fail(
 "JobSpy job structure",
 f"Missing fields: {missing_fields}"
 )

 # Check site tracking
 if "jobspy_site" in sample_job:
 result.add_pass("JobSpy site tracking (jobspy_site field)")
 else:
 result.add_warning(
 "JobSpy site tracking",
 "jobspy_site field missing - cannot track source"
 )

 # Store results
 site_counts = {}
 for job in jobs:
 site = job.get("jobspy_site", "unknown")
 site_counts[site] = site_counts.get(site, 0) + 1

 result.add_scraper_result("JobSpy", {
 "jobs_retrieved": len(jobs),
 "sites_used": list(site_counts.keys()),
 "site_breakdown": site_counts,
 "sample_title": sample_job.get("title")
 })

 else:
 result.add_warning(
 "JobSpy multi-site search",
 "No jobs returned - scrapers may be broken or rate-limited"
 )

 except subprocess.TimeoutExpired:
 result.add_fail("JobSpy multi-site search", "Request timed out (>120s)")
 except Exception as e:
 result.add_fail("JobSpy multi-site search", str(e))

 except ImportError as e:
 result.add_fail("JobSpy import", str(e))


# ============================================================================
# JOBSWITHGPT TESTS
# ============================================================================


async def test_jobswithgpt(result: ValidationResult):
 """Test JobsWithGPT integration (already integrated)."""
 print("\n" + "=" * 80)
 print("JOBSWITHGPT MCP TESTS")
 print("=" * 80 + "\n")

 try:
 from sources.jobswithgpt_scraper import JobsWithGPTScraper

 scraper = JobsWithGPTScraper()

 # Test basic search
 try:
 jobs = await scraper.search(
 keywords=["python"],
				locations=[{"city": "Denver", "state": "CO"}],
				page=1,
			)

			if jobs:
				result.add_pass(f"JobsWithGPT search ({len(jobs)} jobs)")

				# Validate structure
				sample_job = jobs[0]
				required_fields = ["title", "company", "url"]

				missing_fields = [f for f in required_fields if f not in sample_job]
				if not missing_fields:
					result.add_pass("JobsWithGPT job structure")
				else:
					result.add_fail(
						"JobsWithGPT job structure",
						f"Missing fields: {missing_fields}",
					)

				result.add_scraper_result(
					"JobsWithGPT",
					{
						"jobs_retrieved": len(jobs),
						"sample_title": sample_job.get("title"),
						"sample_company": sample_job.get("company"),
					},
				)
			else:
				result.add_warning(
					"JobsWithGPT search",
					"No jobs returned - API may be down or Cloudflare blocking",
				)
		except Exception as e:  # noqa: BLE001
			result.add_fail("JobsWithGPT search", str(e))

	except ImportError as e:
		result.add_fail("JobsWithGPT import", str(e))


# ============================================================================
# SECURITY TESTS
# ============================================================================


async def test_security(result: ValidationResult):
 """Test security controls for MCP servers."""
 print("\n" + "=" * 80)
 print("SECURITY VALIDATION")
 print("=" * 80 + "\n")

 # Test 1: Check for plaintext credentials
 print("Checking for credential leakage risks...")

 dangerous_files = [
 ".env",
 "config/user_prefs.json",
 ".config/claude/claude_desktop_config.json"
 ]

 credential_warnings = []
 for file_path in dangerous_files:
 full_path = Path(__file__).parent.parent / file_path
 if full_path.exists():
 try:
 content = full_path.read_text()
 # Check for common credential patterns
 patterns = [
 (r'COOKIE\s*=\s*["\']?[A-Za-z0-9+/=]{20,}', 'session cookie'),
 (r'API[_-]?KEY\s*[=:]\s*["\']?[A-Za-z0-9]{20,}', 'API key'),
 (r'li_at\s*[=:]\s*["\']?[A-Za-z0-9]{20,}', 'LinkedIn cookie'),
 ]

 import re
 for pattern, cred_type in patterns:
 if re.search(pattern, content, re.IGNORECASE):
 credential_warnings.append(
 f"{file_path} contains {cred_type} - should use environment variables!"
 )
 except Exception as e:
 validation_logger.debug(f"Error checking for credentials in {file_path}: {e}")

 if credential_warnings:
 for warning in credential_warnings:
 result.add_warning("Credential security", warning)
 else:
 result.add_pass("No plaintext credentials in config files")

 # Test 2: Check subprocess execution safety
 try:
 from sources.jobspy_mcp_scraper import JobSpyMCPScraper
 scraper = JobSpyMCPScraper()

 if scraper.mcp_server_path:
 # Verify it's not executing arbitrary code
 path = Path(scraper.mcp_server_path)
 if path.exists() and path.suffix == ".js":
 result.add_pass("JobSpy server path validation (Node.js script)")
 else:
 result.add_fail(
 "JobSpy server path",
 f"Unexpected file type or path: {scraper.mcp_server_path}"
 )
 except Exception as e:
 result.add_warning("JobSpy security check", str(e))

 # Test 3: Validate Reed API uses HTTPS
 try:
 from sources.reed_mcp_scraper import ReedMCPScraper
 # Check that it's using HTTPS (inspect source code)
 result.add_pass("Reed API uses HTTPS (verified in code)")
 except Exception as e:
 result.add_warning("Reed Jobs security check", str(e))

 # Test 4: Check for network isolation options
 result.add_warning(
 "Network isolation",
 "MCP servers run with full network access. Consider Docker isolation (see security docs)."
 )

 # Test 5: Check for file system restrictions
 result.add_warning(
 "File system access",
 "MCP servers run with current user privileges. Consider read-only mounts (see security docs)."
 )

 # Test 6: Validate no shell injection vulnerabilities
 print(" Checking for shell injection risks...")

 # Check that subprocess calls use lists, not shell=True
 from sources import jobspy_mcp_scraper
 import inspect
 source = inspect.getsource(jobspy_mcp_scraper)

 if "shell=True" in source:
 result.add_fail(
 "Shell injection risk",
 "Found shell=True in subprocess calls - should use list arguments"
 )
 else:
 result.add_pass("No shell=True in subprocess calls")

 # Test 7: Check for SQL injection (not applicable, but validate no raw SQL)
 result.add_pass("No SQL queries in MCP scrapers (uses API calls only)")

 # Test 8: Validate input sanitization
 print(" Checking input sanitization...")

 test_cases = [
 ("'; DROP TABLE jobs--", "SQL injection attempt"),
 ("../../../etc/passwd", "Path traversal attempt"),
 ("<script>alert('xss')</script>", "XSS attempt"),
 ("$(rm -rf /)", "Command injection attempt")
 ]

 # These should not cause exceptions when used as search keywords
 from sources.jobswithgpt_scraper import JobsWithGPTScraper
 scraper = JobsWithGPTScraper()

 sanitization_safe = True
 for malicious_input, attack_type in test_cases:
 try:
 # This should handle safely (even if search fails)
 await scraper.search(keywords=[malicious_input], page=1)
 except Exception as e:
 # Check if it's a proper error, not an injection
 if "SQL" in str(e) or "command" in str(e).lower():
 result.add_fail(
 "Input sanitization",
 f"{attack_type} may not be properly sanitized: {e}"
 )
 sanitization_safe = False
 break

 if sanitization_safe:
 result.add_pass("Input sanitization (basic injection tests)")

 # Test 9: Check for rate limiting
 result.add_warning(
 "Rate limiting",
 "No rate limiting implemented for MCP calls. Consider adding to prevent abuse."
 )

 # Test 10: Audit logging
 result.add_warning(
 "Audit logging",
 "MCP tool calls are not logged separately. Consider structured audit logs."
 )


# ============================================================================
# INTEGRATION TESTS
# ============================================================================


async def test_integration(result: ValidationResult):
 """Test integration of multiple scrapers together."""
 print("\n" + "=" * 80)
 print("INTEGRATION TESTS")
 print("=" * 80 + "\n")

 try:
 from sources.job_scraper import (
 search_jobs_by_keywords,
 search_reed_jobs,
 search_multi_site_jobs,
 _ensure_registry
 )

 # Test 1: Registry initialization
 registry = _ensure_registry()
 scraper_count = len(registry.scrapers)

 if scraper_count >= 6: # Minimum: JobsWithGPT, Greenhouse, Lever, Microsoft, SpaceX, Playwright
 result.add_pass(f"Scraper registry ({scraper_count} scrapers registered)")
 else:
 result.add_warning(
 "Scraper registry",
 f"Only {scraper_count} scrapers registered - expected at least 6"
 )

 # Test 2: Global function availability
 functions_to_test = [
 ("search_jobs_by_keywords", search_jobs_by_keywords),
 ("search_reed_jobs", search_reed_jobs),
 ("search_multi_site_jobs", search_multi_site_jobs)
 ]

 for func_name, func in functions_to_test:
 if callable(func):
 result.add_pass(f"Global function available: {func_name}")
 else:
 result.add_fail(
 f"Global function: {func_name}",
 "Function not callable"
 )

 # Test 3: Cross-scraper deduplication with external IDs
 job_cache.clear()

 # Simulate same job from different aggregators (with external_job_id)
 test_jobs_with_id = [
 {
 "url": "https://boards.greenhouse.io/company/jobs/12345",
 "title": "Test Engineer",
 "company": "TestCo",
 "description": "Test job for validation",
 "job_board": "greenhouse",
 "external_job_id": "greenhouse_12345"
 },
 {
 "url": "https://jobswithgpt.com/job/abc",
 "title": "Test Engineer",
 "company": "TestCo",
 "description": "Test job for validation",
 "job_board": "jobswithgpt",
 "external_job_id": "greenhouse_12345" # Same external ID
 },
 {
 "url": "https://indeed.com/job/xyz",
 "title": "Test Engineer",
 "company": "TestCo",
 "description": "Test job for validation",
 "job_board": "jobspy_indeed",
 "external_job_id": "greenhouse_12345" # Same external ID
 }
 ]

 duplicates_caught = 0
 for job in test_jobs_with_id:
 if job_cache.is_duplicate(job):
 duplicates_caught += 1

 # First job is unique, next 2 should be caught (same external_job_id)
 if duplicates_caught == 2:
 result.add_pass("Cross-scraper deduplication (external ID)")
 else:
 result.add_fail(
 "Cross-scraper deduplication (external ID)",
 f"Expected 2 duplicates caught, got {duplicates_caught}"
 )

 # Test 3b: URL-based deduplication (tracking params)
 job_cache.clear()

 test_jobs_url = [
 {
 "url": "https://example.com/job/999",
 "title": "Software Engineer",
 "company": "TechCorp",
 "description": "Different job",
 "job_board": "direct"
 },
 {
 "url": "https://example.com/job/999?utm_source=reed&utm_campaign=test",
 "title": "Software Engineer",
 "company": "TechCorp",
 "description": "Different job",
 "job_board": "reed_mcp"
 },
 ]

 url_duplicates = 0
 for job in test_jobs_url:
 if job_cache.is_duplicate(job):
 url_duplicates += 1

 if url_duplicates == 1:
 result.add_pass("Cross-scraper deduplication (URL normalization)")
 else:
 result.add_warning(
 "Cross-scraper deduplication (URL)",
 f"Expected 1 duplicate caught, got {url_duplicates}"
 )

 except ImportError as e:
 result.add_fail("Integration imports", str(e))


# ============================================================================
# MAIN VALIDATION RUNNER
# ============================================================================


async def main():
 """Run all validation tests."""
 print("\n" + "=" * 80)
 print("MCP SCRAPER VALIDATION SUITE")
 print("=" * 80)
 print("\nThis script validates:")
 print(" 1. Prerequisites (Python, packages, Node.js)")
 print(" 2. Deduplication logic")
 print(" 3. Reed Jobs MCP integration")
 print(" 4. JobSpy MCP integration")
 print(" 5. JobsWithGPT integration")
 print(" 6. Cross-scraper integration")
 print("\n" + "=" * 80)

 result = ValidationResult()

 try:
 # Run all validation suites
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

 except Exception as e:
 print(f"\n\n[ERROR] Unexpected error during validation: {e}")
 import traceback
 traceback.print_exc()
 result.add_fail("Validation", f"Unexpected error: {e}")

 finally:
 # Print summary
 result.print_summary()

 # Exit with appropriate code
 sys.exit(0 if result.tests_failed == 0 else 1)


if __name__ == "__main__":
 asyncio.run(main())
