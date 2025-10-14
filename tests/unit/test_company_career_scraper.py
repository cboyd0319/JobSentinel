"""Tests for Company Career Pages scraper."""

import pytest

from sources.company_career_scraper import CompanyCareerScraper


@pytest.mark.asyncio
async def test_company_career_can_handle():
    """Test that scraper correctly identifies career page URLs."""
    scraper = CompanyCareerScraper()

    # Should handle career URLs
    assert scraper.can_handle("https://example.com/careers")
    assert scraper.can_handle("https://company.com/jobs")
    assert scraper.can_handle("https://startup.io/work-with-us")
    assert scraper.can_handle("https://tech.com/opportunities")

    # Should not handle non-career URLs
    assert not scraper.can_handle("https://example.com/about")
    assert not scraper.can_handle("https://company.com/products")


@pytest.mark.asyncio
async def test_company_career_parses_html_jobs(monkeypatch):
    """Test parsing of HTML job listings."""
    scraper = CompanyCareerScraper()

    mock_html = """
    <html>
        <head>
            <title>TechCorp - Careers</title>
        </head>
        <body>
            <div class="job-listing">
                <h3 class="job-title">Software Engineer</h3>
                <span class="job-location">Seattle, WA</span>
                <p class="job-description">Build distributed systems with Go and Kubernetes</p>
                <a href="/careers/123">Apply Now</a>
            </div>
            <div class="job-opening">
                <h3 class="position-title">Data Analyst</h3>
                <span class="location">Remote</span>
                <p class="description">Analyze customer data and create insights</p>
                <a href="/careers/124">Learn More</a>
            </div>
        </body>
    </html>
    """

    async def mock_fetch(url):
        return {"status_code": 200, "content": mock_html}

    monkeypatch.setattr("sources.company_career_scraper.fetch_url", mock_fetch)

    jobs = await scraper.scrape("https://techcorp.com/careers", fetch_descriptions=False)

    assert len(jobs) >= 1  # At least one job should be found
    # Check first job
    found_engineer = False
    for job in jobs:
        if "Engineer" in job["title"]:
            assert job["company"] == "TechCorp"
            assert "Seattle" in job["location"] or "description" in job["location"].lower()
            assert job["source"] == "company_career"
            found_engineer = True
            break
    assert found_engineer, "Should find Software Engineer position"


@pytest.mark.asyncio
async def test_company_career_extract_company_name(monkeypatch):
    """Test extraction of company name from page."""
    scraper = CompanyCareerScraper()

    # Test with page title
    mock_html_title = """
    <html>
        <head><title>Acme Corp - Careers</title></head>
        <body></body>
    </html>
    """

    from bs4 import BeautifulSoup

    soup = BeautifulSoup(mock_html_title, "html.parser")
    company = scraper._extract_company_name("https://acmecorp.com/careers", soup)
    assert company == "Acme Corp"

    # Test with og:site_name
    mock_html_og = """
    <html>
        <head>
            <meta property="og:site_name" content="BrandCo">
        </head>
        <body></body>
    </html>
    """
    soup = BeautifulSoup(mock_html_og, "html.parser")
    company = scraper._extract_company_name("https://brandco.com/jobs", soup)
    assert company == "BrandCo"

    # Test fallback to domain
    mock_html_empty = "<html><body></body></html>"
    soup = BeautifulSoup(mock_html_empty, "html.parser")
    company = scraper._extract_company_name("https://startupxyz.io/careers", soup)
    assert company == "Startupxyz"


@pytest.mark.asyncio
async def test_company_career_find_job_listings():
    """Test finding job listing elements."""
    scraper = CompanyCareerScraper()

    mock_html = """
    <html>
        <body>
            <div class="job-card">Job 1</div>
            <div class="position-listing">Job 2</div>
            <li class="career-opening">Job 3</li>
            <article class="role-item">Job 4</article>
            <div class="unrelated">Not a job</div>
        </body>
    </html>
    """

    from bs4 import BeautifulSoup

    soup = BeautifulSoup(mock_html, "html.parser")
    job_elements = scraper._find_job_listings(soup)

    # Should find at least some job-related elements
    assert len(job_elements) >= 2


@pytest.mark.asyncio
async def test_company_career_handles_fetch_error(monkeypatch):
    """Test handling of fetch errors."""
    scraper = CompanyCareerScraper()

    async def mock_fetch_error(url):
        return {"status_code": 404, "content": ""}

    monkeypatch.setattr("sources.company_career_scraper.fetch_url", mock_fetch_error)

    jobs = await scraper.scrape("https://example.com/careers")
    assert jobs == []


@pytest.mark.asyncio
async def test_company_career_empty_page(monkeypatch):
    """Test handling of page with no job listings."""
    scraper = CompanyCareerScraper()

    mock_html = """
    <html>
        <head><title>Company - Careers</title></head>
        <body>
            <p>We have no open positions at this time.</p>
        </body>
    </html>
    """

    async def mock_fetch(url):
        return {"status_code": 200, "content": mock_html}

    monkeypatch.setattr("sources.company_career_scraper.fetch_url", mock_fetch)

    jobs = await scraper.scrape("https://company.com/careers")
    assert len(jobs) == 0


@pytest.mark.asyncio
async def test_company_career_extract_job_from_element():
    """Test extracting job data from element."""
    scraper = CompanyCareerScraper()

    mock_html = """
    <div class="job-card">
        <h3 class="job-title">Backend Developer</h3>
        <span class="job-location">Austin, TX</span>
        <p class="job-description">Build APIs with Python and FastAPI</p>
        <a href="/jobs/789">View Job</a>
    </div>
    """

    from bs4 import BeautifulSoup

    soup = BeautifulSoup(mock_html, "html.parser")
    elem = soup.find("div", class_="job-card")

    job = scraper._extract_job_from_element(elem, "TestCorp", "https://testcorp.com/careers", False)

    assert job is not None
    assert job["title"] == "Backend Developer"
    assert job["company"] == "TestCorp"
    assert "Austin" in job["location"]
    assert "https://testcorp.com/jobs/789" in job["url"]
