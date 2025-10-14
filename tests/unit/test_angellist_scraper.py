"""Tests for AngelList/Wellfound scraper."""

import pytest

from sources.angellist_scraper import AngelListScraper


@pytest.mark.asyncio
async def test_angellist_can_handle():
    """Test that scraper correctly identifies AngelList URLs."""
    scraper = AngelListScraper()

    # Should handle
    assert scraper.can_handle("https://wellfound.com/jobs")
    assert scraper.can_handle("https://www.wellfound.com/company/stripe")
    assert scraper.can_handle("https://angel.co/jobs")

    # Should not handle
    assert not scraper.can_handle("https://example.com")


@pytest.mark.asyncio
async def test_angellist_parses_jobs(monkeypatch):
    """Test parsing of AngelList job listings."""
    scraper = AngelListScraper()

    mock_html = """
    <html>
        <body>
            <div class="styles_jobListing__abc123">
                <h3 class="styles_title__xyz">Full Stack Engineer</h3>
                <span class="styles_company__def">TechStartup</span>
                <span class="styles_location__ghi">San Francisco / Remote</span>
                <a href="/jobs/123456">View Details</a>
                <div class="styles_description__jkl">
                    Build scalable web applications using React and Node.js
                </div>
            </div>
            <div class="styles_jobListing__abc124">
                <h3 class="styles_title__xyz2">Backend Engineer</h3>
                <span class="styles_company__def2">DataCo</span>
                <span class="styles_location__ghi2">New York</span>
                <a href="/jobs/123457">View Details</a>
            </div>
        </body>
    </html>
    """

    async def mock_fetch(url):
        return {"status_code": 200, "content": mock_html}

    monkeypatch.setattr("sources.angellist_scraper.fetch_url", mock_fetch)

    jobs = await scraper.scrape("https://wellfound.com/jobs", fetch_descriptions=False)

    assert len(jobs) == 2
    assert jobs[0]["title"] == "Full Stack Engineer"
    assert jobs[0]["company"] == "TechStartup"
    assert jobs[0]["location"] == "San Francisco / Remote"
    assert jobs[0]["remote"] is True
    assert jobs[0]["source"] == "angellist"

    assert jobs[1]["title"] == "Backend Engineer"
    assert jobs[1]["company"] == "DataCo"


@pytest.mark.asyncio
async def test_angellist_parses_jsonld(monkeypatch):
    """Test parsing of JSON-LD structured data."""
    scraper = AngelListScraper()

    mock_html = """
    <html>
        <head>
            <script type="application/ld+json">
            {
                "@type": "JobPosting",
                "title": "Software Engineer",
                "hiringOrganization": {
                    "name": "AI Startup"
                },
                "description": "Build cutting-edge AI products",
                "jobLocation": {
                    "address": {
                        "addressLocality": "Remote"
                    }
                },
                "url": "https://wellfound.com/jobs/987654"
            }
            </script>
        </head>
        <body></body>
    </html>
    """

    async def mock_fetch(url):
        return {"status_code": 200, "content": mock_html}

    monkeypatch.setattr("sources.angellist_scraper.fetch_url", mock_fetch)

    jobs = await scraper.scrape("https://wellfound.com/jobs")

    assert len(jobs) == 1
    assert jobs[0]["title"] == "Software Engineer"
    assert jobs[0]["company"] == "AI Startup"
    assert jobs[0]["location"] == "Remote"


@pytest.mark.asyncio
async def test_angellist_handles_fetch_error(monkeypatch):
    """Test handling of fetch errors."""
    scraper = AngelListScraper()

    async def mock_fetch_error(url):
        return {"status_code": 500, "content": ""}

    monkeypatch.setattr("sources.angellist_scraper.fetch_url", mock_fetch_error)

    jobs = await scraper.scrape("https://wellfound.com/jobs")
    assert jobs == []


@pytest.mark.asyncio
async def test_angellist_empty_listings(monkeypatch):
    """Test handling of empty job listings."""
    scraper = AngelListScraper()

    mock_html = "<html><body><div>No jobs found</div></body></html>"

    async def mock_fetch(url):
        return {"status_code": 200, "content": mock_html}

    monkeypatch.setattr("sources.angellist_scraper.fetch_url", mock_fetch)

    jobs = await scraper.scrape("https://wellfound.com/jobs")
    assert len(jobs) == 0


@pytest.mark.asyncio
async def test_angellist_normalize_jsonld():
    """Test normalization of JSON-LD data."""
    scraper = AngelListScraper()

    jsonld_data = {
        "@type": "JobPosting",
        "title": "ML Engineer",
        "hiringOrganization": {"name": "DeepTech"},
        "description": "Train neural networks",
        "jobLocation": {
            "address": {
                "addressLocality": "Boston",
                "addressRegion": "MA",
            }
        },
        "url": "https://wellfound.com/jobs/555",
    }

    job = scraper._normalize_jsonld_job(jsonld_data)

    assert job["title"] == "ML Engineer"
    assert job["company"] == "DeepTech"
    assert job["location"] == "Boston"
    assert job["url"] == "https://wellfound.com/jobs/555"
