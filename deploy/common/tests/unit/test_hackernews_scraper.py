"""Tests for Hacker News Who's Hiring scraper."""

import pytest

from sources.hackernews_scraper import HackerNewsJobsScraper


@pytest.mark.asyncio
async def test_hackernews_can_handle():
    """Test that scraper correctly identifies Hacker News URLs."""
    scraper = HackerNewsJobsScraper()

    # Should handle
    assert scraper.can_handle("https://news.ycombinator.com/item?id=12345")
    assert scraper.can_handle("https://news.ycombinator.com")

    # Should not handle
    assert not scraper.can_handle("https://example.com")


@pytest.mark.asyncio
async def test_hackernews_parses_jobs(monkeypatch):
    """Test parsing of Hacker News job comments."""
    scraper = HackerNewsJobsScraper()

    mock_html = """
    <html>
        <body>
            <tr class="athing comtr" id="12345">
                <td>
                    <span class="commtext">
                        OpenAI | Software Engineer | San Francisco, CA | REMOTE OK
                        
                        We're looking for experienced engineers to help build GPT-5.
                        Requirements: Python, TensorFlow, distributed systems.
                        
                        Apply: jobs@openai.com
                    </span>
                </td>
            </tr>
            <tr class="athing comtr" id="12346">
                <td>
                    <span class="commtext">
                        Stripe | Backend Engineer | Remote
                        
                        Join our payments infrastructure team. We use Ruby, Go, and PostgreSQL.
                        $150k-$200k + equity.
                    </span>
                </td>
            </tr>
        </body>
    </html>
    """

    async def mock_fetch(url):
        return {"status_code": 200, "content": mock_html}

    monkeypatch.setattr("sources.hackernews_scraper.fetch_url", mock_fetch)

    jobs = await scraper.scrape("https://news.ycombinator.com/item?id=99999")

    assert len(jobs) == 2

    assert jobs[0]["title"] == "Software Engineer"
    assert jobs[0]["company"] == "OpenAI"
    assert jobs[0]["location"] == "San Francisco, CA"
    assert jobs[0]["remote"] is True
    assert jobs[0]["source"] == "hackernews"
    assert "https://news.ycombinator.com/item?id=12345" in jobs[0]["url"]

    assert jobs[1]["title"] == "Backend Engineer"
    assert jobs[1]["company"] == "Stripe"
    assert jobs[1]["remote"] is True


@pytest.mark.asyncio
async def test_hackernews_parse_job_formats(monkeypatch):
    """Test parsing different comment formats."""
    scraper = HackerNewsJobsScraper()

    # Test pipe-separated format
    job = scraper._parse_job_from_comment("Anthropic | Research Engineer | San Francisco | REMOTE")
    assert job["company"] == "Anthropic"
    assert job["title"] == "Research Engineer"
    assert job["location"] == "San Francisco"
    assert job["remote"] is True

    # Test dash-separated format
    job = scraper._parse_job_from_comment("DeepMind - ML Engineer - London - Remote OK")
    assert job["company"] == "DeepMind"
    assert job["title"] == "ML Engineer"
    assert job["location"] == "London"
    assert job["remote"] is True

    # Test minimal format
    job = scraper._parse_job_from_comment("NVIDIA looking for Senior Software Engineer")
    assert job["company"] == "NVIDIA"
    assert "engineer" in job["title"].lower()


@pytest.mark.asyncio
async def test_hackernews_handles_fetch_error(monkeypatch):
    """Test handling of fetch errors."""
    scraper = HackerNewsJobsScraper()

    async def mock_fetch_error(url):
        return {"status_code": 404, "content": ""}

    monkeypatch.setattr("sources.hackernews_scraper.fetch_url", mock_fetch_error)

    jobs = await scraper.scrape("https://news.ycombinator.com/item?id=99999")
    assert jobs == []


@pytest.mark.asyncio
async def test_hackernews_find_current_thread(monkeypatch):
    """Test finding current month's hiring thread."""
    scraper = HackerNewsJobsScraper()

    mock_search_result = {
        "hits": [
            {
                "objectID": "42424242",
                "title": "Ask HN: Who is hiring? (October 2025)",
            }
        ]
    }

    async def mock_fetch(url):
        if "algolia" in url:
            return mock_search_result
        return {"status_code": 200, "content": "<html></html>"}

    monkeypatch.setattr("sources.hackernews_scraper.fetch_url", mock_fetch)

    thread_url = await scraper._find_current_hiring_thread()
    assert thread_url == "https://news.ycombinator.com/item?id=42424242"


@pytest.mark.asyncio
async def test_hackernews_empty_comments(monkeypatch):
    """Test handling of thread with no job comments."""
    scraper = HackerNewsJobsScraper()

    mock_html = "<html><body></body></html>"

    async def mock_fetch(url):
        return {"status_code": 200, "content": mock_html}

    monkeypatch.setattr("sources.hackernews_scraper.fetch_url", mock_fetch)

    jobs = await scraper.scrape("https://news.ycombinator.com/item?id=99999")
    assert len(jobs) == 0
