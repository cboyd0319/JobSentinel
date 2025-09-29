"""
Generic job scraper base classes and utilities.
Provides a foundation for scraping any job board platform.
"""

import asyncio
import re
import hashlib
from abc import ABC, abstractmethod
from typing import List, Dict, Optional
from urllib.parse import urlparse
from utils.logging import get_logger
from utils.scraping import web_scraper
from utils.errors import ScrapingException

logger = get_logger("sources.job_scraper_base")


# Utility functions (formerly in common.py)
def create_job_hash(company: str, title: str, description: str) -> str:
    """Creates a stable SHA-256 hash for a job based on its content."""
    # Normalize by lowercasing and removing whitespace
    norm_company = "".join(company.lower().split())
    norm_title = "".join(title.lower().split())
    # Use only the first 250 chars of the description for stability
    norm_desc = "".join(description.lower().split())[:250]

    hash_input = f"{norm_company}{norm_title}{norm_desc}".encode("utf-8")
    return hashlib.sha256(hash_input).hexdigest()


def fetch_url(url: str) -> dict:
    """Fetches a URL with retries and rate limiting. Returns response data."""
    try:
        response = web_scraper.fetch_url(url)

        # Try to parse as JSON, fall back to text
        try:
            return response.json()
        except ValueError:
            return {"content": response.text,
                    "status_code": response.status_code}

    except Exception as e:
        logger.error(f"Failed to fetch {url}: {e}")
        raise ScrapingException("", url, str(e), e)


async def fetch_job_description(job_url: str, selector: str = None) -> str:
    """Fetch full job description using Playwright for JS-heavy sites."""
    try:
        async with web_scraper as scraper:
            content = await scraper.fetch_with_playwright(
                job_url, wait_for_selector=selector
            )

            # Extract text content from HTML
            from bs4 import BeautifulSoup

            soup = BeautifulSoup(content, "html.parser")

            # Remove script and style elements
            for script in soup(["script", "style"]):
                script.decompose()

            # Get text content
            text = soup.get_text()

            # Clean up whitespace
            lines = (line.strip() for line in text.splitlines())
            chunks = (phrase.strip()
                      for line in lines for phrase in line.split("  "))
            description = "\n".join(chunk for chunk in chunks if chunk)

            logger.debug(
                f"Fetched job description from {job_url} ({len(description)} chars)"
            )
            return description[:5000]  # Limit to 5000 characters

    except Exception as e:
        logger.warning(f"Failed to fetch job description from {job_url}: {e}")
        return ""


def extract_company_from_url(url: str) -> str:
    """Extract company name from job board URL."""
    parsed = urlparse(url)

    # Secure domain validation using exact domain matching
    # Prevents URL substring sanitization vulnerabilities
    netloc_lower = parsed.netloc.lower()

    # Split domain parts for secure validation
    domain_parts = netloc_lower.split(".")

    # Greenhouse boards - exact domain match
    if len(domain_parts) >= 2 and domain_parts[-2:] == ["greenhouse", "io"]:
        return parsed.path.split("/")[-1] or "unknown"

    # Lever boards - exact domain match
    if len(domain_parts) >= 2 and domain_parts[-2:] == ["lever", "co"]:
        return domain_parts[0] if domain_parts else "unknown"

    # Workday boards - exact domain match
    if len(domain_parts) >= 2 and domain_parts[-2:] == ["workday", "com"]:
        return (
            parsed.path.split(
                "/")[1] if len(parsed.path.split("/")) > 1 else "unknown"
        )

    # Default fallback
    return parsed.netloc.replace("www.", "").split(".")[0]


class JobBoardScraper(ABC):
    """
    Abstract base class for all job board scrapers.
    Provides common interface and utilities.
    """

    def __init__(self, name: str, base_domains: List[str]):
        self.name = name
        self.base_domains = base_domains

    def can_handle(self, url: str) -> bool:
        """Check if this scraper can handle the given URL."""
        parsed = urlparse(url)
        domain = parsed.netloc.lower()
        return any(base_domain in domain for base_domain in self.base_domains)

    @abstractmethod
    def scrape(self, board_url: str,
               fetch_descriptions: bool = True) -> List[Dict]:
        """Scrape jobs from the board URL."""
        pass

    def extract_company_name(self, url: str) -> str:
        """Extract company name from URL."""
        parsed = urlparse(url)
        domain_parts = parsed.netloc.split(".")

        # Handle subdomains (e.g., jobs.company.com -> company)
        if len(domain_parts) >= 2:
            return domain_parts[-2]  # Second to last part
        return domain_parts[0] if domain_parts else "unknown"


class APIDiscoveryMixin:
    """
    Mixin for API discovery capabilities.
    Can be used by any scraper that supports JavaScript-heavy sites.
    """

    async def discover_job_apis(self, page, board_url: str) -> List[Dict]:
        """
        Discover API endpoints by monitoring network traffic.
        Returns potential API URLs that could contain job data.
        """
        discovered_apis = []

        def handle_response(response):
            try:
                url = response.url
                content_type = response.headers.get('content-type', '').lower()

                # Look for JSON APIs related to jobs/careers
                if ('api' in url.lower() or 'graphql' in url.lower()
                    ) and 'json' in content_type:
                    if any(keyword in url.lower()
                           for keyword in ['job', 'career', 'search', 'position']):
                        discovered_apis.append(
                            {
                                'url': url,
                                'status': response.status,
                                'content_type': content_type,
                                'board_url': board_url
                            }
                        )
                        logger.info(f"🔍 Discovered API: {url}")
            except Exception as e:
                logger.debug(f"API discovery error: {e}")

        page.on('response', handle_response)
        await asyncio.sleep(3)  # Wait for APIs to be discovered
        return discovered_apis

    def contains_job_data(self, data) -> bool:
        """Check if API response contains job-related data."""
        if not data:
            return False

        data_str = str(data).lower()
        job_indicators = [
            'title',
            'position',
            'job',
            'career',
            'location',
            'department']

        # Check if response has job-like structure
        if isinstance(data, dict):
            keys = [str(k).lower() for k in data.keys()]
            return any(indicator in ' '.join(keys)
                       for indicator in job_indicators)
        elif isinstance(data, list) and len(data) > 0:
            return self.contains_job_data(data[0])

        return any(indicator in data_str for indicator in job_indicators)


class GenericJobExtractor:
    """
    Generic job data extraction utilities.
    Works with various data formats and structures.
    """

    @staticmethod
    def extract_seniority_from_title(title: str) -> str:
        """Extract seniority level from job title."""
        if not title:
            return 'Mid-level'

        title_lower = title.lower()
        if 'staff' in title_lower:
            return 'Staff'
        elif any(word in title_lower for word in ['principal', 'lead', 'head', 'director', 'vp', 'vice president']):
            return 'Principal'
        elif 'senior' in title_lower or 'sr' in title_lower:
            return 'Senior'
        elif 'manager' in title_lower or 'supervisor' in title_lower:
            return 'Senior'  # Managers are typically senior level
        elif any(word in title_lower for word in ['junior', 'jr', 'associate', 'entry', 'intern']):
            return 'Junior'
        else:
            return 'Mid-level'

    @staticmethod
    def extract_skills_from_description(
            description: str) -> Dict[str, List[str]]:
        """Extract technical skills from job description."""
        if not description:
            return {'required_skills': [],
                    'preferred_skills': [], 'technologies': []}

        # Comprehensive skills taxonomy for all job types
        tech_skills = [
            # Programming Languages
            "Python", "JavaScript", "Java", "Go", "Rust", "C++", "C#", "PHP", "Ruby", "SQL",
            "TypeScript", "Swift", "Kotlin", "Scala", "R", "HTML", "CSS", "jQuery",
            # Cloud & Infrastructure
            "AWS", "Azure", "GCP", "Google Cloud", "Kubernetes", "Docker", "Terraform", "Ansible",
            "Jenkins", "GitLab CI", "GitHub Actions",
            # Web Frameworks & Libraries
            "React", "Vue", "Angular", "Node.js", "Django", "Flask", "Spring", "Rails",
            "Express", "FastAPI", "Next.js", "Svelte",
            # Databases
            "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "Cassandra",
            "DynamoDB", "Snowflake", "BigQuery",
            # Analytics & Business Intelligence
            "Tableau", "PowerBI", "Looker", "Google Analytics", "Adobe Analytics", "Mixpanel",
            "Segment", "Amplitude", "Looker Studio",
            # E-Commerce Platforms
            "Shopify", "Salesforce Commerce Cloud", "BigCommerce", "Magento", "WordPress",
            "WooCommerce", "Webflow", "Squarespace",
            # Marketing & SEO Tools
            "Google Ads", "Google Search Console", "Google Tag Manager", "Google Keyword Planner",
            "Semrush", "Moz", "Ahrefs", "SEMrush", "HubSpot", "Mailchimp", "Klaviyo",
            "Marketo", "Pardot", "Constant Contact", "Meta Ads", "Facebook Ads", "LinkedIn Ads",
            # CRM & Marketing Automation
            "Salesforce", "Salesforce Marketing Cloud", "HubSpot CRM", "Pipedrive", "Zendesk",
            "Intercom", "Drift", "Contentful", "Strapi",
            # Project Management & Collaboration
            "Jira", "Confluence", "Slack", "Microsoft Teams", "Asana", "Trello", "Monday.com",
            "Notion", "Linear", "GitHub", "GitLab", "Bitbucket",
            # Design & Creative
            "Adobe Creative Cloud", "Photoshop", "Illustrator", "Figma", "Sketch", "InVision",
            "Canva", "After Effects", "Premiere Pro",
            # Development Tools
            "Git", "Linux", "Prometheus", "Grafana", "Kafka", "Spark", "Hadoop", "Optimizely",
            # Business & Strategy
            "Project Management", "Agile", "Scrum", "Kanban", "LEAN", "Six Sigma"
        ]

        description_lower = description.lower()
        required_skills = []
        preferred_skills = []

        for skill in tech_skills:
            skill_pattern = rf'\b{re.escape(skill.lower())}\b'
            if re.search(skill_pattern, description_lower):
                # Simple heuristic: if in requirements section, it's required
                req_pattern = rf'(?:require|must|essential|need).*?{skill_pattern}'
                pref_pattern = rf'(?:prefer|nice|bonus|plus).*?{skill_pattern}'

                if re.search(req_pattern, description_lower, re.DOTALL):
                    required_skills.append(skill)
                elif re.search(pref_pattern, description_lower, re.DOTALL):
                    preferred_skills.append(skill)
                else:
                    # Default to required if mentioned
                    required_skills.append(skill)

        return {
            'required_skills': required_skills,
            'preferred_skills': preferred_skills,
            'technologies': list(set(required_skills + preferred_skills))
        }

    @staticmethod
    def extract_salary_from_description(description: str) -> Dict[str, any]:
        """Extract salary information from job description."""
        if not description:
            return {}

        salary_info = {}

        # Common salary patterns
        patterns = [
            r'\$([0-9,]+)(?:\s*[-–]\s*\$([0-9,]+))?\s*(?:per\s+year|annually|yearly)?',
            r'([0-9,]+)k?\s*[-–]\s*([0-9,]+)k?\s*(?:USD|dollars?)',
            r'salary:\s*\$?([0-9,]+)(?:\s*[-–]\s*\$?([0-9,]+))?'
        ]

        for pattern in patterns:
            matches = re.findall(pattern, description, re.IGNORECASE)
            if matches:
                match = matches[0]
                try:
                    if isinstance(match, tuple) and len(match) >= 2:
                        min_sal = int(match[0].replace(",", ""))
                        max_sal = int(
                            match[1].replace(
                                ",", "")) if match[1] else min_sal

                        # Handle k notation (e.g., "150k")
                        if "k" in description.lower():
                            min_sal *= 1000
                            max_sal *= 1000

                        salary_info.update({
                            "salary_min": min_sal,
                            "salary_max": max_sal,
                            "salary_currency": "USD",
                            "salary_frequency": "yearly"
                        })
                        break
                except (ValueError, IndexError):
                    continue

        return salary_info

    @staticmethod
    def create_job_hash(company: str, title: str, description: str) -> str:
        """Create a unique hash for job deduplication."""
        import hashlib
        content = f"{company.lower()}:{title.lower()}:{description[:100].lower()}"
        return hashlib.md5(content.encode()).hexdigest()

    @staticmethod
    def normalize_job_data(raw_job: Dict, company_name: str,
                           job_board: str, board_url: str) -> Dict:
        """
        Normalize job data to standard format.
        Handles various input formats and ensures consistent output.
        """
        # Extract basic fields with fallbacks
        title = str(raw_job.get('title') or raw_job.get('name')
                    or raw_job.get('position') or 'Job Title')
        description = str(raw_job.get('description') or raw_job.get(
            'summary') or raw_job.get('content') or '')
        location = str(raw_job.get('location') or raw_job.get(
            'city') or raw_job.get('office') or 'See Description')

        # Handle nested location objects
        if isinstance(raw_job.get('location'), dict):
            location = raw_job['location'].get('name') or location

        # Create job URL
        job_url = str(raw_job.get('url') or raw_job.get('link')
                      or raw_job.get('absolute_url') or board_url)

        # Extract enhanced fields
        extractor = GenericJobExtractor()
        skills_info = extractor.extract_skills_from_description(description)
        salary_info = extractor.extract_salary_from_description(description)

        # Build normalized job data
        normalized = {
            'hash': extractor.create_job_hash(company_name, title, description[:250]),
            'title': title,
            'url': job_url,
            'company': company_name,
            'location': location,
            'description': description,
            'job_board': job_board,
            'seniority_level': extractor.extract_seniority_from_title(title),

            # Enhanced fields
            'external_job_id': str(raw_job.get('id') or raw_job.get('jobId') or raw_job.get('external_id') or ''),
            'department': str(raw_job.get('department') or raw_job.get('discipline') or raw_job.get('team') or ''),
            'employment_type': str(raw_job.get('employment_type') or raw_job.get('type') or ''),

            # Skills and technologies (as JSON strings for database storage)
            'required_skills': str(skills_info['required_skills']) if skills_info['required_skills'] else '',
            'preferred_skills': str(skills_info['preferred_skills']) if skills_info['preferred_skills'] else '',
            'technologies': str(skills_info['technologies']) if skills_info['technologies'] else '',
        }

        # Add salary information if found
        normalized.update(salary_info)

        # Handle additional fields from specific platforms
        if 'greenhouseId' in raw_job:
            normalized['external_job_id'] = str(raw_job['greenhouseId'])

        if 'requisition_id' in raw_job:
            normalized['requisition_id'] = str(raw_job['requisition_id'])

        # Clean up empty values
        return {k: v for k, v in normalized.items() if v not in [
            '', 'None', None]}


class JobBoardRegistry:
    """
    Registry for all available job board scrapers.
    Automatically routes URLs to the appropriate scraper.
    """

    def __init__(self):
        self.scrapers: List[JobBoardScraper] = []

    def register(self, scraper: JobBoardScraper):
        """Register a new job board scraper."""
        self.scrapers.append(scraper)
        logger.info(f"Registered scraper: {scraper.name}")

    def get_scraper(self, url: str) -> Optional[JobBoardScraper]:
        """Get the appropriate scraper for a URL."""
        for scraper in self.scrapers:
            if scraper.can_handle(url):
                logger.info(f"Using scraper: {scraper.name} for {url}")
                return scraper

        logger.warning(
            f"No specific scraper found for {url}, will use fallback")
        return None

    def list_supported_platforms(self) -> List[str]:
        """List all supported job board platforms."""
        return [scraper.name for scraper in self.scrapers]
