import pytest

from sources.jobswithgpt_scraper import JobsWithGPTScraper


@pytest.mark.asyncio
async def test_jobswithgpt_search_normalization(monkeypatch):
    scraper = JobsWithGPTScraper()
    # Force availability
    scraper.mcp_server_available = True

    class FakeResponse:
        status_code = 200

        def json(self):
            return {
                "jobs": [
                    {
                        "title": "Senior Python Engineer",
                        "company": "ExampleCorp",
                        "location": "Remote",
                        "url": "https://example.com/job/123",
                        "description": "Design systems",
                        "id": "abc123",
                        "posted_date": "2025-10-04",
                        "employment_type": "Full-time",
                        "remote": True,
                        "source": "custom_source",
                    }
                ],
                "total": 1,
                "page": 1,
                "has_more": False,
            }

    class FakeAsyncClient:
        def __init__(self, *a, **k):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def post(self, url, json=None, headers=None):
            return FakeResponse()

    import httpx

    monkeypatch.setattr(httpx, "AsyncClient", FakeAsyncClient)

    jobs = await scraper.search(keywords=["python"], page=1)
    assert len(jobs) == 1
    job = jobs[0]
    assert job["company"] == "ExampleCorp"
    assert job["source"] == "jobswithgpt"  # normalized value override
    assert job.get("job_board") == "jobswithgpt"
