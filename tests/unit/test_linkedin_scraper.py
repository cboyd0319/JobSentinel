"""Tests for LinkedIn Jobs scraper (No Auth)."""

import pytest

from sources.linkedin_scraper import LinkedInJobsScraper


@pytest.mark.asyncio
async def test_linkedin_can_handle():
    """Test that scraper correctly identifies LinkedIn URLs."""
    scraper = LinkedInJobsScraper()

    # Should handle
    assert scraper.can_handle("https://linkedin.com/jobs")
    assert scraper.can_handle("https://www.linkedin.com/jobs/search")

    # Should not handle
    assert not scraper.can_handle("https://example.com")


@pytest.mark.asyncio
async def test_linkedin_parses_jobs(monkeypatch):
    """Test parsing of LinkedIn job listings."""
    scraper = LinkedInJobsScraper()

    mock_html = """
    <html>
        <body>
            <div class="base-card">
                <h3 class="base-search-card__title">Senior DevOps Engineer</h3>
                <h4 class="base-search-card__subtitle">Microsoft</h4>
                <span class="job-search-card__location">Redmond, WA</span>
                <a href="/jobs/view/123456">View job</a>
                <div class="base-search-card__metadata">
                    Manage Azure infrastructure and deployment pipelines
                </div>
            </div>
            <div class="base-card">
                <h3 class="base-search-card__title">Frontend Developer</h3>
                <h4 class="base-search-card__subtitle">Meta</h4>
                <span class="job-search-card__location">Remote</span>
                <a href="/jobs/view/123457">View job</a>
            </div>
        </body>
    </html>
    """

    async def mock_fetch(url):
        return {"status_code": 200, "content": mock_html}

    monkeypatch.setattr("sources.linkedin_scraper.fetch_url", mock_fetch)

    jobs = await scraper.scrape("https://www.linkedin.com/jobs/search")

    assert len(jobs) == 2
    assert jobs[0]["title"] == "Senior DevOps Engineer"
    assert jobs[0]["company"] == "Microsoft"
    assert jobs[0]["location"] == "Redmond, WA"
    assert jobs[0]["source"] == "linkedin"

    assert jobs[1]["title"] == "Frontend Developer"
    assert jobs[1]["company"] == "Meta"
    assert jobs[1]["remote"] is True


@pytest.mark.asyncio
async def test_linkedin_parses_jsonld(monkeypatch):
    """Test parsing of JSON-LD structured data."""
    scraper = LinkedInJobsScraper()

    mock_html = """
    <html>
        <head>
            <script type="application/ld+json">
            {
                "@type": "JobPosting",
                "title": "Data Scientist",
                "hiringOrganization": {
                    "name": "Amazon"
                },
                "description": "Apply ML to customer insights",
                "jobLocation": {
                    "address": {
                        "addressLocality": "Seattle",
                        "addressRegion": "WA"
                    }
                },
                "url": "https://www.linkedin.com/jobs/view/98765"
            }
            </script>
        </head>
        <body></body>
    </html>
    """

    async def mock_fetch(url):
        return {"status_code": 200, "content": mock_html}

    monkeypatch.setattr("sources.linkedin_scraper.fetch_url", mock_fetch)

    jobs = await scraper.scrape("https://www.linkedin.com/jobs/search")

    assert len(jobs) == 1
    assert jobs[0]["title"] == "Data Scientist"
    assert jobs[0]["company"] == "Amazon"
    assert jobs[0]["location"] == "Seattle"


@pytest.mark.asyncio
async def test_linkedin_handles_fetch_error(monkeypatch):
    """Test handling of fetch errors."""
    scraper = LinkedInJobsScraper()

    async def mock_fetch_error(url):
        return {"status_code": 403, "content": ""}

    monkeypatch.setattr("sources.linkedin_scraper.fetch_url", mock_fetch_error)

    jobs = await scraper.scrape("https://www.linkedin.com/jobs/search")
    assert jobs == []


@pytest.mark.asyncio
async def test_linkedin_empty_listings(monkeypatch):
    """Test handling of empty job listings."""
    scraper = LinkedInJobsScraper()

    mock_html = "<html><body><div>No results found</div></body></html>"

    async def mock_fetch(url):
        return {"status_code": 200, "content": mock_html}

    monkeypatch.setattr("sources.linkedin_scraper.fetch_url", mock_fetch)

    jobs = await scraper.scrape("https://www.linkedin.com/jobs/search")
    assert len(jobs) == 0


@pytest.mark.asyncio
async def test_linkedin_normalize_jsonld():
    """Test normalization of JSON-LD data."""
    scraper = LinkedInJobsScraper()

    jsonld_data = {
        "@type": "JobPosting",
        "title": "Product Manager",
        "hiringOrganization": {"name": "Google"},
        "description": "Lead product strategy",
        "jobLocation": {
            "address": {
                "addressLocality": "Mountain View",
                "addressRegion": "CA",
            }
        },
        "url": "https://www.linkedin.com/jobs/view/777",
    }

    job = scraper._normalize_jsonld_job(jsonld_data)

    assert job["title"] == "Product Manager"
    assert job["company"] == "Google"
    assert job["location"] == "Mountain View"
    assert job["url"] == "https://www.linkedin.com/jobs/view/777"
