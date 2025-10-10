import json

import pytest

from sources.jobspy_mcp_scraper import JobSpyMCPScraper


class DummyCompleted:
    def __init__(self, returncode=0, stdout=b"", stderr=b""):
        self.returncode = returncode
        self.stdout = stdout
        self.stderr = stderr


@pytest.mark.asyncio
async def test_jobspy_empty_keywords():
    scraper = JobSpyMCPScraper(mcp_server_path="/tmp/fake.js")  # noqa: S108 - test fixture
    jobs = await scraper.search(keywords=[], location="Remote")
    assert jobs == []


@pytest.mark.asyncio
async def test_jobspy_filters_is_remote_and_job_type(monkeypatch):
    scraper = JobSpyMCPScraper(mcp_server_path="/tmp/fake.js")  # noqa: S108 - test fixture
    captured_request = {}

    def fake_run(cmd, input, capture_output, timeout):  # noqa: D401
        nonlocal captured_request
        captured_request = json.loads(input.decode())
        payload = {"result": {"jobs": []}}
        return DummyCompleted(0, stdout=json.dumps(payload).encode())

    monkeypatch.setattr("subprocess.run", fake_run)
    await scraper.search(
        keywords=["python"], location="Remote", is_remote=True, job_type="fulltime"
    )
    args = captured_request.get("params", {}).get("arguments", {})
    assert args.get("is_remote") is True
    assert args.get("job_type") == "fulltime"


@pytest.mark.asyncio
async def test_jobspy_timeout(monkeypatch):
    scraper = JobSpyMCPScraper(mcp_server_path="/tmp/fake.js")  # noqa: S108 - test fixture

    def fake_run_timeout(cmd, input, capture_output, timeout):  # noqa: D401
        raise subprocess.TimeoutExpired(cmd="node", timeout=timeout)

    import subprocess

    monkeypatch.setattr("subprocess.run", fake_run_timeout)
    jobs = await scraper.search(keywords=["python"], location="Remote")
    assert jobs == []


@pytest.mark.asyncio
async def test_jobspy_node_not_found(monkeypatch):
    scraper = JobSpyMCPScraper(mcp_server_path="/tmp/fake.js")  # noqa: S108 - test fixture

    def fake_run_not_found(cmd, input, capture_output, timeout):  # noqa: D401
        raise FileNotFoundError("node")

    monkeypatch.setattr("subprocess.run", fake_run_not_found)
    jobs = await scraper.search(keywords=["python"], location="Remote")
    assert jobs == []
