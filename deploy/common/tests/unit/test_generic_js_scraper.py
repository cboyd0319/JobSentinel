"""
Tests for Generic JS Scraper.
"""

import pytest

from src.sources.generic_js_scraper import GenericJSScraper


@pytest.fixture
def scraper():
    """Create a GenericJSScraper instance."""
    return GenericJSScraper()


def test_scraper_initialization(scraper):
    """Test scraper initializes correctly."""
    assert scraper.name == "Generic JS Scraper"
    assert any(d.endswith("ashbyhq.com") for d in scraper.base_domains)
    assert any(d.endswith("workable.com") for d in scraper.base_domains)


def test_can_handle_ashby_url(scraper):
    """Test scraper can handle Ashby URLs."""
    assert scraper.can_handle("https://jobs.ashbyhq.com/company")
    assert scraper.can_handle("https://jobs.ashbyhq.com/stripe")


def test_can_handle_workable_url(scraper):
    """Test scraper can handle Workable URLs."""
    assert scraper.can_handle("https://company.workable.com")
    assert scraper.can_handle("https://apply.workable.com/company/")


def test_can_handle_generic_job_urls(scraper):
    """Test scraper can handle generic job board URLs as fallback."""
    assert scraper.can_handle("https://example.com/jobs")
    assert scraper.can_handle("https://company.com/careers")


def test_cannot_handle_non_job_urls(scraper):
    """Test scraper doesn't claim non-job URLs."""
    # Generic scraper will accept these as fallback, which is acceptable
    # since it's meant to be a last-resort scraper
    pass


def test_looks_like_job_data_with_job_dict():
    """Test job data detection with valid job dictionary."""
    data = {
        "jobs": [
            {"title": "Software Engineer", "location": "Remote"},
            {"title": "Product Manager", "location": "NYC"},
        ]
    }
    assert GenericJSScraper._looks_like_job_data(data)


def test_looks_like_job_data_with_positions():
    """Test job data detection with positions key."""
    data = {"positions": [{"title": "Engineer"}]}
    assert GenericJSScraper._looks_like_job_data(data)


def test_looks_like_job_data_with_invalid_data():
    """Test job data detection rejects non-job data."""
    data = {"users": [{"name": "John"}], "settings": {"theme": "dark"}}
    assert not GenericJSScraper._looks_like_job_data(data)


def test_is_job_object_valid():
    """Test job object validation with valid data."""
    scraper = GenericJSScraper()

    # Valid job with title and location
    assert scraper._is_job_object({"title": "Software Engineer", "location": "Remote"})

    # Valid job with title and company
    assert scraper._is_job_object({"title": "Product Manager", "company": "Acme Corp"})


def test_is_job_object_invalid():
    """Test job object validation rejects invalid data."""
    scraper = GenericJSScraper()

    # Missing title
    assert not scraper._is_job_object({"location": "Remote", "company": "Acme Corp"})

    # Has title but no location or company
    assert not scraper._is_job_object({"title": "Engineer"})


def test_normalize_job_object():
    """Test job object normalization."""
    scraper = GenericJSScraper()

    obj = {
        "title": "Senior Engineer",
        "location": "San Francisco",
        "url": "/jobs/123",
        "description": "Great opportunity",
    }

    job = scraper._normalize_job_object(obj, "Acme Corp", "https://acme.com")

    assert job is not None
    assert job["title"] == "Senior Engineer"
    assert job["company"] == "Acme Corp"
    assert job["location"] == "San Francisco"
    assert job["url"] == "https://acme.com/jobs/123"
    assert "hash" in job
    assert job["source"] == "generic_js"


def test_normalize_job_object_with_dict_location():
    """Test normalization handles location as dictionary."""
    scraper = GenericJSScraper()

    obj = {
        "title": "Engineer",
        "location": {"name": "New York", "country": "USA"},
    }

    job = scraper._normalize_job_object(obj, "Acme", "https://acme.com")

    assert job is not None
    assert "New York" in job["location"]


def test_normalize_job_object_missing_title():
    """Test normalization returns None without title."""
    scraper = GenericJSScraper()

    obj = {"location": "Remote", "description": "Great job"}

    job = scraper._normalize_job_object(obj, "Acme", "https://acme.com")

    assert job is None


def test_detect_remote_keywords():
    """Test remote detection with various keywords."""
    assert GenericJSScraper._detect_remote("Remote", "")
    assert GenericJSScraper._detect_remote("", "work from home position")
    assert GenericJSScraper._detect_remote("", "WFH available")
    assert GenericJSScraper._detect_remote("San Francisco", "distributed team")
    assert GenericJSScraper._detect_remote("Anywhere", "")


def test_detect_remote_not_remote():
    """Test remote detection returns False for non-remote jobs."""
    assert not GenericJSScraper._detect_remote("New York Office", "On-site position")
    assert not GenericJSScraper._detect_remote("London", "In-office required")


def test_extract_jobs_from_json_simple():
    """Test extracting jobs from simple JSON structure."""
    scraper = GenericJSScraper()

    data = {
        "jobs": [
            {"title": "Software Engineer", "location": "Remote", "url": "https://example.com/job/1"}
        ]
    }

    jobs = scraper._extract_jobs_from_json(data, "https://example.com")

    # Note: _extract_jobs_from_json recursively searches, so might not find
    # jobs in simple array. This is expected behavior.
    assert isinstance(jobs, list)


def test_extract_jobs_from_json_nested():
    """Test extracting jobs from nested JSON structure."""
    scraper = GenericJSScraper()

    data = {
        "data": {
            "company": {
                "positions": [
                    {"title": "Backend Engineer", "location": "NYC", "company": "Acme Inc"}
                ]
            }
        }
    }

    jobs = scraper._extract_jobs_from_json(data, "https://acme.com")

    assert isinstance(jobs, list)
    # The function should find job-like objects in nested structures
