"""
Hacker News Who's Hiring scraper.
Scrapes job postings from monthly "Who is hiring?" threads on Hacker News.
"""

import re
from datetime import datetime

from utils.logging import get_logger

from .job_scraper_base import (
    GenericJobExtractor,
    JobBoardScraper,
    create_job_hash,
    fetch_url,
)

logger = get_logger("sources.hackernews_scraper")


class HackerNewsJobsScraper(JobBoardScraper):
    """Scraper for Hacker News 'Who is hiring?' monthly threads."""

    def __init__(self):
        super().__init__(name="HackerNews", base_domains=["news.ycombinator.com"])

    async def scrape(self, board_url: str, fetch_descriptions: bool = True) -> list[dict]:
        """
        Scrape jobs from Hacker News "Who is hiring?" thread.

        Expected URL format:
        - https://news.ycombinator.com/item?id=<thread_id>
        - Or use current month's thread by searching
        """
        logger.info(f"Starting Hacker News scrape for {board_url}")

        try:
            # If no specific thread ID provided, search for current month's thread
            if "item?id=" not in board_url:
                thread_url = await self._find_current_hiring_thread()
                if not thread_url:
                    logger.warning("Could not find current Who is hiring? thread")
                    return []
                board_url = thread_url

            # Fetch the thread page
            response = await fetch_url(board_url)
            if not response or response.get("status_code") != 200:
                logger.error(f"Failed to fetch {board_url}")
                return []

            # Parse HTML content
            from bs4 import BeautifulSoup

            html_content = response.get("content", "")
            soup = BeautifulSoup(html_content, "html.parser")

            jobs = []
            # Find all top-level comments (job postings)
            comment_trees = soup.find_all("tr", class_="athing comtr")

            logger.info(f"Found {len(comment_trees)} comments in thread")

            for comment_elem in comment_trees:
                try:
                    # Get comment text
                    comment_span = comment_elem.find("span", class_="commtext")
                    if not comment_span:
                        continue

                    comment_text = comment_span.get_text(separator="\n", strip=True)

                    # Parse job information from comment
                    job_info = self._parse_job_from_comment(comment_text)
                    if not job_info:
                        continue

                    # Get comment permalink
                    comment_id = comment_elem.get("id", "")
                    comment_url = f"https://news.ycombinator.com/item?id={comment_id}"

                    # Extract additional info
                    extractor = GenericJobExtractor()
                    skills_info = extractor.extract_skills_from_description(comment_text)
                    salary_info = extractor.extract_salary_from_description(comment_text)

                    # Create job hash
                    company = job_info.get("company", "Unknown")
                    title = job_info.get("title", "Position")
                    job_hash = create_job_hash(company, title, comment_text[:250])

                    # Build normalized job data
                    job_data = {
                        "hash": job_hash,
                        "title": title,
                        "company": company,
                        "location": job_info.get("location", "See description"),
                        "url": comment_url,
                        "description": comment_text[:5000],
                        "job_board": self.name,
                        "source": "hackernews",
                        "seniority_level": extractor.extract_seniority_from_title(title),
                        "remote": job_info.get("remote", False),
                    }

                    # Add skills and salary
                    if skills_info.get("required_skills"):
                        job_data["required_skills"] = str(skills_info["required_skills"])
                    if skills_info.get("technologies"):
                        job_data["technologies"] = str(skills_info["technologies"])
                    job_data.update(salary_info)

                    jobs.append(job_data)

                except Exception as e:
                    logger.debug(f"Error parsing comment: {e}")
                    continue

            logger.info(f"Successfully scraped {len(jobs)} jobs from Hacker News")
            return jobs

        except Exception as e:
            logger.error(f"Hacker News scraping failed: {e}")
            return []

    async def _find_current_hiring_thread(self) -> str | None:
        """Find the current month's 'Who is hiring?' thread."""
        try:
            # Search for the thread using HN's Algolia API
            current_month = datetime.now().strftime("%B %Y")
            search_query = f"Ask HN: Who is hiring? ({current_month})"

            # Use HN Algolia search API
            search_url = (
                f"https://hn.algolia.com/api/v1/search?"
                f"query={search_query.replace(' ', '%20')}&tags=story"
            )

            response = await fetch_url(search_url)
            if not response:
                return None

            # Parse response
            import json

            if isinstance(response, dict) and "content" in response:
                data = json.loads(response["content"])
            else:
                data = response

            if "hits" in data and len(data["hits"]) > 0:
                thread_id = data["hits"][0].get("objectID")
                if thread_id:
                    return f"https://news.ycombinator.com/item?id={thread_id}"

        except Exception as e:
            logger.warning(f"Failed to find current hiring thread: {e}")

        return None

    def _parse_job_from_comment(self, comment_text: str) -> dict | None:
        """
        Parse job information from HN comment.

        Common formats:
        - "Company | Role | Location | REMOTE"
        - "Company - Role - Location"
        - First line usually has key info
        """
        if not comment_text:
            return None

        lines = comment_text.split("\n")
        if not lines:
            return None

        first_line = lines[0].strip()

        # Initialize job info
        job_info = {
            "company": "",
            "title": "",
            "location": "",
            "remote": False,
        }

        # Check for REMOTE keyword
        if re.search(r"\bREMOTE\b", comment_text, re.IGNORECASE):
            job_info["remote"] = True

        # Try to parse pipe-separated format: Company | Title | Location
        if "|" in first_line:
            parts = [p.strip() for p in first_line.split("|")]
            if len(parts) >= 2:
                job_info["company"] = parts[0]
                job_info["title"] = parts[1]
                if len(parts) >= 3:
                    job_info["location"] = parts[2]

        # Try to parse dash-separated format: Company - Title - Location
        elif " - " in first_line or " – " in first_line:
            parts = [p.strip() for p in re.split(r"\s+-\s+|\s+–\s+", first_line)]
            if len(parts) >= 2:
                job_info["company"] = parts[0]
                job_info["title"] = parts[1]
                if len(parts) >= 3:
                    job_info["location"] = parts[2]

        # Try to extract company from beginning of comment
        else:
            # Look for company name at start (often in all caps or bold)
            company_match = re.match(
                r"^([A-Z][A-Za-z\s&.,]+?)(?:\s*\(|\s*-|\s*\||looking|seeking|hiring)",
                first_line,
                re.IGNORECASE,
            )
            if company_match:
                job_info["company"] = company_match.group(1).strip()

            # Try to find job title keywords
            title_keywords = ["engineer", "developer", "designer", "manager", "lead", "architect"]
            for keyword in title_keywords:
                if keyword in first_line.lower():
                    # Extract sentence containing the keyword
                    match = re.search(rf"[^.|]+{keyword}[^.|]*", first_line, re.IGNORECASE)
                    if match:
                        job_info["title"] = match.group(0).strip()
                        break

        # Default title if not found
        if not job_info["title"]:
            job_info["title"] = "Software Position"

        # Default company if not found
        if not job_info["company"]:
            job_info["company"] = "See Description"

        # Set location based on REMOTE
        if job_info["remote"] and not job_info["location"]:
            job_info["location"] = "Remote"
        elif not job_info["location"]:
            job_info["location"] = "See description"

        return job_info
