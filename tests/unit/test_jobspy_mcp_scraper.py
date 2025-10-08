import json

import pytest

from sources.jobspy_mcp_scraper import JobSpyMCPScraper


class DummyCompleted:
    def __init__(self, returncode=0, stdout=b"", stderr=b""):
        self.returncode = returncode
        self.stdout = stdout
        self.stderr = stderr


@pytest.mark.asyncio
async def test_jobspy_missing_server(monkeypatch):
    scraper = JobSpyMCPScraper(mcp_server_path=None)
    # Force missing path
    scraper.mcp_server_path = None
    jobs = await scraper.search(keywords=["python"], location="Remote")
    assert jobs == []


@pytest.mark.asyncio
async def test_jobspy_parses_jobs(monkeypatch):
    scraper = JobSpyMCPScraper(mcp_server_path="/tmp/fake.js")

    fake_jobs = [
        {
            "title": "Python Engineer",
            "company": "ExampleCo",
            "location": "Remote",
            "job_url": "https://example.com/job/1",
            "description": "Build things",
            "id": "abc123",
            "date_posted": "2025-10-01",
            "job_type": "fulltime",
            "site": "indeed",
        }
    ]
    payload = {"result": {"jobs": fake_jobs}}

    def fake_run(cmd, input, capture_output, timeout):  # noqa: D401
        return DummyCompleted(0, stdout=json.dumps(payload).encode())

    monkeypatch.setattr("subprocess.run", fake_run)

    jobs = await scraper.search(keywords=["python"], location="Remote")
    assert len(jobs) == 1
    j = jobs[0]
    assert j.get("company") == "ExampleCo"
    assert j.get("source", "").startswith("jobspy_")


@pytest.mark.asyncio
async def test_jobspy_subprocess_error(monkeypatch):
    scraper = JobSpyMCPScraper(mcp_server_path="/tmp/fake.js")

    def fake_run_fail(cmd, input, capture_output, timeout):
        return DummyCompleted(1, stdout=b"", stderr=b"boom")

    monkeypatch.setattr("subprocess.run", fake_run_fail)
    jobs = await scraper.search(keywords=["python"])
    assert jobs == []
