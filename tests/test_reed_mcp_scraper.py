import asyncio
import os
import pytest

from sources.reed_mcp_scraper import ReedMCPScraper

@pytest.mark.asyncio
async def test_reed_missing_api_key(monkeypatch):
    monkeypatch.delenv("REED_API_KEY", raising=False)
    scraper = ReedMCPScraper()
    jobs = await scraper.search(keywords="python")
    assert jobs == []

@pytest.mark.asyncio
async def test_reed_parses_jobs(monkeypatch):
    monkeypatch.setenv("REED_API_KEY", "fake")

    # Build fake response object
    class FakeResponse:
        status_code = 200
        def json(self):
            return {
                "totalResults": 1,
                "results": [
                    {
                        "jobId": 123,
                        "jobTitle": "Python Developer",
                        "employerName": "ReedCo",
                        "locationName": "London",
                        "jobUrl": "https://www.reed.co.uk/jobs/123",
                        "jobDescription": "Great role",
                        "datePosted": "2025-10-01",
                        "minimumSalary": 60000,
                        "maximumSalary": 80000,
                        "fullTime": True,
                        "permanent": True,
                    }
                ]
            }

    class FakeAsyncClient:
        def __init__(self, *a, **k): pass
        async def __aenter__(self): return self
        async def __aexit__(self, exc_type, exc, tb): return False
        async def get(self, url, params=None, auth=None, headers=None):
            return FakeResponse()

    import httpx
    monkeypatch.setattr(httpx, "AsyncClient", FakeAsyncClient)

    scraper = ReedMCPScraper()
    jobs = await scraper.search(keywords="python", location="London")
    assert len(jobs) == 1
    j = jobs[0]
    assert j.get("company") == "ReedCo"
    assert j.get("location") == "London"
