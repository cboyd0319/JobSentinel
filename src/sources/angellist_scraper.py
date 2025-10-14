"""
AngelList (Wellfound) job board scraper.
Scrapes startup job listings from wellfound.com (formerly angel.co)
"""

from utils.logging import get_logger

from .job_scraper_base import (
    GenericJobExtractor,
    JobBoardScraper,
    create_job_hash,
    fetch_url,
)

logger = get_logger("sources.angellist_scraper")


class AngelListScraper(JobBoardScraper):
    """Scraper for AngelList/Wellfound job board."""

    def __init__(self):
        super().__init__(
            name="AngelList",
            base_domains=["wellfound.com", "angel.co", "www.wellfound.com", "www.angel.co"],
        )

    async def scrape(self, board_url: str, fetch_descriptions: bool = True) -> list[dict]:
        """
        Scrape jobs from AngelList/Wellfound.

        Note: AngelList requires authentication for full API access.
        This scraper focuses on publicly available job listings.
        """
        logger.info(f"Starting AngelList scrape for {board_url}")

        try:
            # Fetch the main page
            response = await fetch_url(board_url)
            if not response or response.get("status_code") != 200:
                logger.error(f"Failed to fetch {board_url}")
                return []

            # Parse HTML content
            from bs4 import BeautifulSoup

            html_content = response.get("content", "")
            soup = BeautifulSoup(html_content, "html.parser")

            jobs = []

            # AngelList/Wellfound uses various selectors for job listings
            # Try multiple selectors to handle different page structures
            job_selectors = [
                {"container": "div", "class": "styles_jobListing__"},
                {"container": "div", "class": "job-listing"},
                {"container": "article", "class": "startup-job"},
            ]

            job_listings = []
            for selector in job_selectors:
                # Create closure to avoid B023 linting error
                def make_class_filter(cls_name):
                    return lambda x: x and cls_name in str(x)

                found = soup.find_all(
                    selector["container"], class_=make_class_filter(selector["class"])
                )
                if found:
                    job_listings = found
                    logger.info(f"Found {len(job_listings)} jobs using selector: {selector}")
                    break

            if not job_listings:
                logger.warning("No job listings found with known selectors")
                # Try to find job data in JSON-LD or script tags
                jobs = await self._extract_from_structured_data(soup)
                if jobs:
                    return jobs

            for job_element in job_listings:
                try:
                    # Extract job details (AngelList structure varies)
                    title_elem = job_element.find(
                        ["h2", "h3", "a"], class_=lambda x: x and "title" in str(x).lower()
                    )
                    company_elem = job_element.find(
                        ["span", "div", "a"], class_=lambda x: x and "company" in str(x).lower()
                    )
                    location_elem = job_element.find(
                        ["span", "div"], class_=lambda x: x and "location" in str(x).lower()
                    )
                    link_elem = job_element.find("a", href=True)

                    if not title_elem:
                        # Try alternative structure
                        title_elem = job_element.find("a")

                    if not title_elem:
                        continue

                    title = title_elem.get_text(strip=True)
                    company = company_elem.get_text(strip=True) if company_elem else "Startup"
                    location = (
                        location_elem.get_text(strip=True) if location_elem else "See description"
                    )
                    job_url = ""

                    if link_elem and link_elem.get("href"):
                        href = link_elem.get("href")
                        if href.startswith("http"):
                            job_url = href
                        elif href.startswith("/"):
                            job_url = f"https://wellfound.com{href}"

                    # Extract description if available
                    description = ""
                    desc_elem = job_element.find(
                        ["p", "div"], class_=lambda x: x and "description" in str(x).lower()
                    )
                    if desc_elem:
                        description = desc_elem.get_text(strip=True)

                    # Fetch full job description if URL available
                    if fetch_descriptions and job_url:
                        try:
                            job_response = await fetch_url(job_url)
                            if job_response and job_response.get("status_code") == 200:
                                job_soup = BeautifulSoup(
                                    job_response.get("content", ""), "html.parser"
                                )
                                # Look for main content area
                                main_content = job_soup.find(
                                    ["article", "div"],
                                    class_=lambda x: x
                                    and (
                                        "content" in str(x).lower()
                                        or "description" in str(x).lower()
                                    ),
                                )
                                if main_content:
                                    description = main_content.get_text(separator="\n", strip=True)
                        except Exception as e:
                            logger.debug(f"Failed to fetch description for {job_url}: {e}")

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
                        "source": "angellist",
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

            logger.info(f"Successfully scraped {len(jobs)} jobs from AngelList")
            return jobs

        except Exception as e:
            logger.error(f"AngelList scraping failed: {e}")
            return []

    async def _extract_from_structured_data(self, soup) -> list[dict]:
        """Extract job data from JSON-LD or structured data."""
        jobs = []
        try:
            # Look for JSON-LD structured data
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
            "company": company or "Startup",
            "location": location or "See description",
            "url": job_url,
            "description": description[:5000],
            "job_board": self.name,
            "source": "angellist",
            "seniority_level": extractor.extract_seniority_from_title(title),
            "required_skills": str(skills_info.get("required_skills", [])),
            "technologies": str(skills_info.get("technologies", [])),
            **salary_info,
        }
