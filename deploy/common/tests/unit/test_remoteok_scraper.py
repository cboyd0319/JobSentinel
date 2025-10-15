"""Tests for RemoteOK scraper."""

import pytest

from sources.remoteok_scraper import RemoteOKScraper


@pytest.mark.asyncio
async def test_remoteok_can_handle():
    """Test that scraper correctly identifies RemoteOK URLs."""
    scraper = RemoteOKScraper()

    # Should handle
    assert scraper.can_handle("https://remoteok.com")
    assert scraper.can_handle("https://remoteok.io/remote-dev-jobs")

    # Should not handle
    assert not scraper.can_handle("https://example.com")


@pytest.mark.asyncio
async def test_remoteok_parses_api_response(monkeypatch):
    """Test parsing of RemoteOK API response."""
    scraper = RemoteOKScraper()

    # Mock API response (RemoteOK returns JSON directly)
    mock_data = [
        {"legal": "RemoteOK API"},  # First element is metadata
        {
            "id": "123456",
            "position": "Full Stack Developer",
            "company": "RemoteCo",
            "location": "Worldwide",
            "description": "Build amazing web apps with Python and React",
            "url": "https://remoteok.com/remote-jobs/123456",
            "date": "2025-10-01",
            "tags": ["python", "react", "javascript"],
        },
        {
            "id": "123457",
            "position": "DevOps Engineer",
            "company": "CloudOps",
            "location": "Remote",
            "description": "Manage AWS infrastructure and CI/CD pipelines",
            "url": "https://remoteok.com/remote-jobs/123457",
            "date": "2025-10-02",
            "salary_min": 100000,
            "salary_max": 150000,
        },
    ]

    async def mock_fetch(url):
        return mock_data

    monkeypatch.setattr("sources.remoteok_scraper.fetch_url", mock_fetch)

    jobs = await scraper.scrape("https://remoteok.com")

    assert len(jobs) == 2
    assert jobs[0]["title"] == "Full Stack Developer"
    assert jobs[0]["company"] == "RemoteCo"
    assert jobs[0]["remote"] is True
    assert jobs[0]["external_job_id"] == "123456"
    assert jobs[0]["source"] == "remoteok"

    assert jobs[1]["title"] == "DevOps Engineer"
    assert jobs[1]["salary_min"] == 100000
    assert jobs[1]["salary_max"] == 150000


@pytest.mark.asyncio
async def test_remoteok_handles_invalid_response(monkeypatch):
    """Test handling of invalid API response."""
    scraper = RemoteOKScraper()

    async def mock_fetch_invalid(url):
        return {"status_code": 500, "content": ""}

    monkeypatch.setattr("sources.remoteok_scraper.fetch_url", mock_fetch_invalid)

    jobs = await scraper.scrape("https://remoteok.com")
    assert jobs == []


@pytest.mark.asyncio
async def test_remoteok_skips_invalid_jobs(monkeypatch):
    """Test that invalid job entries are skipped."""
    scraper = RemoteOKScraper()

    mock_data = [
        {"legal": "RemoteOK API"},
        {
            "id": "123",
            "position": "Valid Job",
            "company": "ValidCo",
            "description": "A real job",
        },
        {
            "id": "456",
            # Missing required fields
        },
        {
            "id": "789",
            "position": "",  # Empty title
            "company": "EmptyCo",
        },
    ]

    async def mock_fetch(url):
        return mock_data

    monkeypatch.setattr("sources.remoteok_scraper.fetch_url", mock_fetch)

    jobs = await scraper.scrape("https://remoteok.com")
    assert len(jobs) == 1
    assert jobs[0]["title"] == "Valid Job"
