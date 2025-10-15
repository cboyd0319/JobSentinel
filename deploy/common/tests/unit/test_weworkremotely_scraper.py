"""Tests for We Work Remotely scraper."""

import pytest

from sources.weworkremotely_scraper import WeWorkRemotelyScraper


@pytest.mark.asyncio
async def test_weworkremotely_can_handle():
    """Test that scraper correctly identifies We Work Remotely URLs."""
    scraper = WeWorkRemotelyScraper()

    # Should handle
    assert scraper.can_handle("https://weworkremotely.com/categories/remote-programming-jobs")
    assert scraper.can_handle("https://www.weworkremotely.com/remote-jobs")

    # Should not handle
    assert not scraper.can_handle("https://example.com")
    assert not scraper.can_handle("https://linkedin.com/jobs")


@pytest.mark.asyncio
async def test_weworkremotely_parses_jobs(monkeypatch):
    """Test parsing of We Work Remotely job listings."""
    scraper = WeWorkRemotelyScraper()

    # Mock HTML response
    mock_html = """
    <html>
        <body>
            <ul>
                <li class="feature">
                    <span class="title">Senior Python Developer</span>
                    <span class="company">TechCorp</span>
                    <span class="region">Anywhere</span>
                    <a href="/remote-jobs/123/senior-python-developer">View job</a>
                </li>
                <li class="feature">
                    <span class="title">Backend Engineer</span>
                    <span class="company">StartupXYZ</span>
                    <span class="region">Remote</span>
                    <a href="/remote-jobs/124/backend-engineer">View job</a>
                </li>
            </ul>
        </body>
    </html>
    """

    async def mock_fetch(url):
        return {"status_code": 200, "content": mock_html}

    monkeypatch.setattr("sources.weworkremotely_scraper.fetch_url", mock_fetch)

    jobs = await scraper.scrape(
        "https://weworkremotely.com/categories/remote-programming-jobs", fetch_descriptions=False
    )

    assert len(jobs) == 2
    assert jobs[0]["title"] == "Senior Python Developer"
    assert jobs[0]["company"] == "TechCorp"
    assert jobs[0]["location"] == "Anywhere"
    assert jobs[0]["remote"] is True
    assert jobs[0]["source"] == "weworkremotely"

    assert jobs[1]["title"] == "Backend Engineer"
    assert jobs[1]["company"] == "StartupXYZ"


@pytest.mark.asyncio
async def test_weworkremotely_handles_fetch_error(monkeypatch):
    """Test handling of fetch errors."""
    scraper = WeWorkRemotelyScraper()

    async def mock_fetch_error(url):
        return {"status_code": 404, "content": ""}

    monkeypatch.setattr("sources.weworkremotely_scraper.fetch_url", mock_fetch_error)

    jobs = await scraper.scrape("https://weworkremotely.com/categories/remote-programming-jobs")
    assert jobs == []


@pytest.mark.asyncio
async def test_weworkremotely_empty_listings(monkeypatch):
    """Test handling of empty job listings."""
    scraper = WeWorkRemotelyScraper()

    mock_html = "<html><body><ul></ul></body></html>"

    async def mock_fetch(url):
        return {"status_code": 200, "content": mock_html}

    monkeypatch.setattr("sources.weworkremotely_scraper.fetch_url", mock_fetch)

    jobs = await scraper.scrape("https://weworkremotely.com/categories/remote-programming-jobs")
    assert len(jobs) == 0
