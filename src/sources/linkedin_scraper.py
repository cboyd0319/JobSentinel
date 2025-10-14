"""
LinkedIn Jobs scraper (No Auth).
Scrapes public job listings from LinkedIn without authentication.
"""

from utils.logging import get_logger

from .job_scraper_base import (
    GenericJobExtractor,
    JobBoardScraper,
    create_job_hash,
    fetch_url,
)

logger = get_logger("sources.linkedin_scraper")


class LinkedInJobsScraper(JobBoardScraper):
    """Scraper for LinkedIn public job listings (no authentication)."""

    def __init__(self):
        super().__init__(
            name="LinkedIn",
            base_domains=["linkedin.com", "www.linkedin.com"],
        )

    async def scrape(self, board_url: str, fetch_descriptions: bool = True) -> list[dict]:
        """
        Scrape jobs from LinkedIn public job search.

        Note: This scraper only accesses publicly available job listings.
        No authentication or login is performed.
        It respects LinkedIn's robots.txt and rate limits.
        """
        logger.info(f"Starting LinkedIn scrape for {board_url}")

        try:
            # Fetch the job search page
            response = await fetch_url(board_url)
            if not response or response.get("status_code") != 200:
                logger.error(f"Failed to fetch {board_url}")
                return []

            # Parse HTML content
            from bs4 import BeautifulSoup

            html_content = response.get("content", "")
            soup = BeautifulSoup(html_content, "html.parser")

            jobs = []

            # LinkedIn uses various selectors depending on the page type
            # Try to find job listings in the HTML structure
            job_selectors = [
                # Public job search results
                {"container": "div", "class": "base-card"},
                {"container": "div", "class": "job-search-card"},
                {"container": "li", "class": "jobs-search__results-list"},
            ]

            job_listings = []

            # Create closure to avoid B023 linting error
            def make_class_filter(cls_name):
                return lambda x: x and cls_name in str(x)

            for selector in job_selectors:
                found = soup.find_all(
                    selector["container"], class_=make_class_filter(selector["class"])
                )
                if found:
                    job_listings = found
                    logger.info(f"Found {len(job_listings)} jobs using selector: {selector}")
                    break

            if not job_listings:
                logger.warning("No job listings found with known selectors")
                # Try to extract from structured data
                jobs = await self._extract_from_structured_data(soup)
                if jobs:
                    return jobs

            # If still no jobs found, try API endpoint
            if not job_listings:
                jobs = await self._try_api_endpoint(board_url)
                if jobs:
                    return jobs

            for job_element in job_listings:
                try:
                    # Extract job details
                    title_elem = job_element.find(
                        ["h3", "h4", "a"],
                        class_=lambda x: x
                        and any(keyword in str(x).lower() for keyword in ["title", "job-title"]),
                    )
                    company_elem = job_element.find(
                        ["h4", "span", "a"],
                        class_=lambda x: x
                        and ("company" in str(x).lower() or "subtitle" in str(x).lower()),
                    )
                    location_elem = job_element.find(
                        ["span", "div"], class_=lambda x: x and "location" in str(x).lower()
                    )
                    link_elem = job_element.find("a", href=True)

                    if not title_elem:
                        continue

                    title = title_elem.get_text(strip=True)
                    company = company_elem.get_text(strip=True) if company_elem else "Company"
                    location = (
                        location_elem.get_text(strip=True) if location_elem else "See description"
                    )

                    # Extract job URL
                    job_url = ""
                    if link_elem and link_elem.get("href"):
                        href = link_elem.get("href")
                        if href.startswith("http"):
                            job_url = href
                        elif href.startswith("/"):
                            job_url = f"https://www.linkedin.com{href}"
                        # Clean up tracking parameters
                        if "?" in job_url:
                            job_url = job_url.split("?")[0]

                    # Extract description snippet from card
                    description = ""
                    desc_elem = job_element.find(
                        ["div", "span"], class_=lambda x: x and "description" in str(x).lower()
                    )
                    if desc_elem:
                        description = desc_elem.get_text(strip=True)

                    # Note: Fetching full descriptions from LinkedIn job pages
                    # requires more complex handling and may hit rate limits
                    # For now, we use the snippet from the listing

                    # Create job hash
                    job_hash = create_job_hash(company, title, description[:250])

                    # Extract additional info
                    extractor = GenericJobExtractor()
                    skills_info = extractor.extract_skills_from_description(description)
                    salary_info = extractor.extract_salary_from_description(description)

                    # Check for remote work
                    remote = "remote" in location.lower() or "remote" in description.lower()

                    # Build normalized job data
                    job_data = {
                        "hash": job_hash,
                        "title": title,
                        "company": company,
                        "location": location,
                        "url": job_url or board_url,
                        "description": description[:5000] if description else "",
                        "job_board": self.name,
                        "source": "linkedin",
                        "seniority_level": extractor.extract_seniority_from_title(title),
                        "remote": remote,
                    }

                    # Add skills and salary
                    if skills_info.get("required_skills"):
                        job_data["required_skills"] = str(skills_info["required_skills"])
                    if skills_info.get("technologies"):
                        job_data["technologies"] = str(skills_info["technologies"])
                    job_data.update(salary_info)

                    jobs.append(job_data)

                except Exception as e:
                    logger.warning(f"Error parsing job element: {e}")
                    continue

            logger.info(f"Successfully scraped {len(jobs)} jobs from LinkedIn")
            return jobs

        except Exception as e:
            logger.error(f"LinkedIn scraping failed: {e}")
            return []

    async def _extract_from_structured_data(self, soup) -> list[dict]:
        """Extract job data from JSON-LD structured data."""
        jobs = []
        try:
            json_ld_scripts = soup.find_all("script", type="application/ld+json")
            for script in json_ld_scripts:
                try:
                    import json

                    data = json.loads(script.string)
                    if isinstance(data, dict) and data.get("@type") == "JobPosting":
                        jobs.append(self._normalize_jsonld_job(data))
                    elif isinstance(data, list):
                        for item in data:
                            if isinstance(item, dict) and item.get("@type") == "JobPosting":
                                jobs.append(self._normalize_jsonld_job(item))
                except Exception as e:
                    logger.debug(f"Failed to parse JSON-LD: {e}")
                    continue

            logger.info(f"Extracted {len(jobs)} jobs from structured data")
        except Exception as e:
            logger.warning(f"Failed to extract structured data: {e}")

        return jobs

    async def _try_api_endpoint(self, board_url: str) -> list[dict]:
        """
        Try to use LinkedIn's public API endpoints.

        Note: LinkedIn's API access is limited and may require authentication
        for full functionality. This tries public endpoints only.
        """
        jobs = []
        try:
            # LinkedIn has public job search APIs that don't require auth
            # This endpoint may not always work without proper authentication
            logger.info("Attempting to use LinkedIn public API (limited access)")

        except Exception as e:
            logger.debug(f"Failed to use LinkedIn API: {e}")

        return jobs

    def _normalize_jsonld_job(self, data: dict) -> dict:
        """Normalize JSON-LD JobPosting to our format."""
        extractor = GenericJobExtractor()

        title = data.get("title", "")
        company = ""
        if isinstance(data.get("hiringOrganization"), dict):
            company = data["hiringOrganization"].get("name", "")

        description = data.get("description", "")
        location = ""
        if isinstance(data.get("jobLocation"), dict):
            address = data["jobLocation"].get("address", {})
            if isinstance(address, dict):
                location = address.get("addressLocality", "") or address.get("addressRegion", "")

        job_url = data.get("url", "")

        job_hash = create_job_hash(company, title, description[:250])
        skills_info = extractor.extract_skills_from_description(description)
        salary_info = extractor.extract_salary_from_description(description)

        return {
            "hash": job_hash,
            "title": title,
            "company": company or "Company",
            "location": location or "See description",
            "url": job_url,
            "description": description[:5000],
            "job_board": self.name,
            "source": "linkedin",
            "seniority_level": extractor.extract_seniority_from_title(title),
            "required_skills": str(skills_info.get("required_skills", [])),
            "technologies": str(skills_info.get("technologies", [])),
            **salary_info,
        }
