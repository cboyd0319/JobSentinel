"""
We Work Remotely job board scraper.
Scrapes remote job listings from weworkremotely.com
"""

from utils.logging import get_logger

from .job_scraper_base import (
    GenericJobExtractor,
    JobBoardScraper,
    create_job_hash,
    fetch_url,
)

logger = get_logger("sources.weworkremotely_scraper")


class WeWorkRemotelyScraper(JobBoardScraper):
    """Scraper for We Work Remotely job board."""

    def __init__(self):
        super().__init__(
            name="WeWorkRemotely", base_domains=["weworkremotely.com", "www.weworkremotely.com"]
        )

    async def scrape(self, board_url: str, fetch_descriptions: bool = True) -> list[dict]:
        """
        Scrape jobs from We Work Remotely.

        The site has a simple HTML structure with job listings.
        No authentication required.
        """
        logger.info(f"Starting We Work Remotely scrape for {board_url}")

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
            # We Work Remotely uses <li> elements with class 'feature' for job listings
            job_listings = soup.find_all("li", class_="feature")

            logger.info(f"Found {len(job_listings)} job listings")

            for job_element in job_listings:
                try:
                    # Extract job details
                    title_elem = job_element.find("span", class_="title")
                    company_elem = job_element.find("span", class_="company")
                    location_elem = job_element.find("span", class_="region")
                    link_elem = job_element.find("a")

                    if not title_elem or not company_elem or not link_elem:
                        continue

                    title = title_elem.get_text(strip=True)
                    company = company_elem.get_text(strip=True)
                    location = location_elem.get_text(strip=True) if location_elem else "Remote"
                    job_url = "https://weworkremotely.com" + link_elem.get("href", "")

                    # Extract job description if enabled
                    description = ""
                    if fetch_descriptions and job_url:
                        try:
                            job_response = await fetch_url(job_url)
                            if job_response and job_response.get("status_code") == 200:
                                job_soup = BeautifulSoup(
                                    job_response.get("content", ""), "html.parser"
                                )
                                desc_elem = job_soup.find("div", class_="listing-container")
                                if desc_elem:
                                    description = desc_elem.get_text(strip=True)
                        except Exception as e:
                            logger.debug(f"Failed to fetch description for {job_url}: {e}")

                    # Create job hash for deduplication
                    job_hash = create_job_hash(company, title, description[:250])

                    # Extract skills and salary info
                    extractor = GenericJobExtractor()
                    skills_info = extractor.extract_skills_from_description(description)
                    salary_info = extractor.extract_salary_from_description(description)

                    # Build normalized job data
                    job_data = {
                        "hash": job_hash,
                        "title": title,
                        "company": company,
                        "location": location,
                        "url": job_url,
                        "description": description[:5000] if description else "",
                        "job_board": self.name,
                        "source": "weworkremotely",
                        "seniority_level": extractor.extract_seniority_from_title(title),
                        "remote": True,  # All jobs on this site are remote
                    }

                    # Add skills and salary if found
                    if skills_info.get("required_skills"):
                        job_data["required_skills"] = str(skills_info["required_skills"])
                    if skills_info.get("technologies"):
                        job_data["technologies"] = str(skills_info["technologies"])
                    job_data.update(salary_info)

                    jobs.append(job_data)

                except Exception as e:
                    logger.warning(f"Error parsing job element: {e}")
                    continue

            logger.info(f"Successfully scraped {len(jobs)} jobs from We Work Remotely")
            return jobs

        except Exception as e:
            logger.error(f"We Work Remotely scraping failed: {e}")
            return []
