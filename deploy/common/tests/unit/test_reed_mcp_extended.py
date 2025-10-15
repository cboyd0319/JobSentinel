import pytest

from sources.reed_mcp_scraper import ReedMCPScraper


@pytest.mark.asyncio
async def test_reed_non_200(monkeypatch):
    monkeypatch.setenv("REED_API_KEY", "fake")

    class FakeResponse:
        status_code = 500
        text = "internal error"

        def json(self):
            return {"results": []}

    class FakeAsyncClient:
        def __init__(self, *a, **k):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def get(self, url, params=None, auth=None, headers=None):
            return FakeResponse()

    import httpx

    monkeypatch.setattr(httpx, "AsyncClient", FakeAsyncClient)
    scraper = ReedMCPScraper()
    jobs = await scraper.search(keywords="python")
    assert jobs == []


@pytest.mark.asyncio
async def test_reed_malformed_json(monkeypatch):
    monkeypatch.setenv("REED_API_KEY", "fake")

    class FakeResponse:
        status_code = 200

        def json(self):
            raise ValueError("bad json")

    class FakeAsyncClient:
        def __init__(self, *a, **k):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def get(self, url, params=None, auth=None, headers=None):
            return FakeResponse()

    import httpx

    monkeypatch.setattr(httpx, "AsyncClient", FakeAsyncClient)
    scraper = ReedMCPScraper()
    jobs = await scraper.search(keywords="python")
    assert jobs == []
