"""
Resume Parser for Auto-Configuration

Extracts relevant information from resumes (PDF/DOCX) to automatically
populate user preferences for job matching.

Supports:
- PDF files (via pdfplumber)
- DOCX files (via python-docx)
- Extraction of: skills, titles, companies, experience, education
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Dict, List, Optional, Set
import logging

# Optional dependencies - will check at runtime
try:
    import pdfplumber
    HAS_PDF = True
except ImportError:
    HAS_PDF = False

try:
    from docx import Document
    HAS_DOCX = True
except ImportError:
    HAS_DOCX = False


logger = logging.getLogger(__name__)


# Common tech skills/keywords to look for
COMMON_SKILLS = {
    # Programming Languages
    "python", "javascript", "java", "go", "golang", "rust", "c++", "c#", "ruby",
    "typescript", "php", "swift", "kotlin", "scala", "r", "shell", "bash",

    # Cloud & Infrastructure
    "aws", "azure", "gcp", "google cloud", "kubernetes", "k8s", "docker",
    "terraform", "ansible", "jenkins", "circleci", "github actions",
    "cloudformation", "helm", "istio", "prometheus", "grafana",

    # Security
    "security", "infosec", "appsec", "devsecops", "penetration testing",
    "vulnerability", "owasp", "siem", "soc", "iam", "zero trust",
    "encryption", "cryptography", "oauth", "saml", "ssl/tls",

    # Databases
    "postgresql", "postgres", "mysql", "mongodb", "redis", "elasticsearch",
    "dynamodb", "cassandra", "sql", "nosql", "database",

    # Web & API
    "rest", "api", "graphql", "http", "microservices", "grpc",
    "fastapi", "flask", "django", "react", "vue", "angular", "node.js",

    # DevOps & Tools
    "ci/cd", "git", "linux", "unix", "monitoring", "logging",
    "observability", "agile", "scrum", "jira", "confluence",

    # Data & ML
    "machine learning", "ml", "ai", "data science", "pandas", "numpy",
    "pytorch", "tensorflow", "scikit-learn", "spark", "hadoop",
}

# Common job title keywords
TITLE_KEYWORDS = {
    "engineer", "developer", "architect", "lead", "senior", "staff",
    "principal", "manager", "director", "devops", "sre", "security",
    "software", "backend", "frontend", "full stack", "fullstack",
    "data", "ml", "platform", "infrastructure", "cloud", "qa", "test",
}

# Seniority blocklist terms
SENIORITY_BLOCKLIST = {
    "intern", "internship", "junior", "entry level", "contract",
    "contractor", "consultant", "temporary", "temp", "part time",
    "part-time", "freelance",
}


class ResumeParser:
    """Parse resumes and extract structured information."""

    def __init__(self):
        self.text: str = ""
        self.skills: Set[str] = set()
        self.titles: List[str] = []
        self.companies: List[str] = []
        self.education: List[str] = []
        self.years_experience: Optional[int] = None

    def parse_file(self, file_path: str | Path) -> Dict:
        """
        Parse a resume file and extract information.

        Args:
            file_path: Path to PDF or DOCX resume

        Returns:
            Dictionary with extracted information

        Raises:
            ValueError: If file type not supported or dependencies missing
            FileNotFoundError: If file doesn't exist
        """
        file_path = Path(file_path)

        if not file_path.exists():
            raise FileNotFoundError(f"Resume file not found: {file_path}")

        # Extract text based on file type
        if file_path.suffix.lower() == ".pdf":
            if not HAS_PDF:
                raise ValueError(
                    "PDF support requires pdfplumber. Install with: pip install pdfplumber"
                )
            self.text = self._extract_pdf(file_path)
        elif file_path.suffix.lower() in [".docx", ".doc"]:
            if not HAS_DOCX:
                raise ValueError(
                    "DOCX support requires python-docx. Install with: pip install python-docx"
                )
            self.text = self._extract_docx(file_path)
        else:
            raise ValueError(
                f"Unsupported file type: {file_path.suffix}. "
                "Supported types: .pdf, .docx"
            )

        # Extract structured information
        self._extract_skills()
        self._extract_titles()
        self._extract_companies()
        self._extract_education()
        self._extract_experience()

        return self.to_dict()

    def _extract_pdf(self, file_path: Path) -> str:
        """Extract text from PDF file."""
        text_parts = []

        try:
            with pdfplumber.open(file_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text_parts.append(page_text)
        except Exception as e:
            logger.error(f"Failed to parse PDF: {e}")
            raise ValueError(f"Failed to parse PDF: {e}")

        return "\n".join(text_parts)

    def _extract_docx(self, file_path: Path) -> str:
        """Extract text from DOCX file."""
        try:
            doc = Document(file_path)
            paragraphs = [para.text for para in doc.paragraphs if para.text.strip()]
            return "\n".join(paragraphs)
        except Exception as e:
            logger.error(f"Failed to parse DOCX: {e}")
            raise ValueError(f"Failed to parse DOCX: {e}")

    def _extract_skills(self):
        """Extract technical skills from resume text."""
        text_lower = self.text.lower()

        # Find all matching skills
        for skill in COMMON_SKILLS:
            # Use word boundaries to avoid partial matches
            pattern = r'\b' + re.escape(skill.lower()) + r'\b'
            if re.search(pattern, text_lower):
                # Store in original case from COMMON_SKILLS
                self.skills.add(skill.title() if len(skill) > 3 else skill.upper())

    def _extract_titles(self):
        """Extract job titles from resume text."""
        # Look for common title patterns
        # Pattern: (Title) at (Company) or (Title) - (Company)
        title_patterns = [
            r'(?i)(senior|staff|principal|lead)?\s*(software|security|devops|platform|backend|frontend|data|ml)\s*(engineer|developer|architect)',
            r'(?i)(senior|staff|principal|lead)?\s*(site reliability engineer|sre)',
            r'(?i)(technical lead|tech lead|team lead)',
        ]

        for pattern in title_patterns:
            matches = re.findall(pattern, self.text, re.IGNORECASE)
            for match in matches:
                if isinstance(match, tuple):
                    title = " ".join(filter(None, match)).strip()
                else:
                    title = match.strip()

                if title and len(title) > 5:  # Filter out too-short matches
                    self.titles.append(title.title())

        # Deduplicate while preserving order
        seen = set()
        self.titles = [t for t in self.titles if not (t in seen or seen.add(t))]

    def _extract_companies(self):
        """Extract company names from resume text."""
        # Look for patterns like "at Company" or "@ Company"
        company_patterns = [
            r'(?:at|@)\s+([A-Z][A-Za-z0-9\s&]+?)(?:\s+[-•|]|\s*\n|,\s)',
            r'([A-Z][A-Za-z0-9\s&]+?)(?:\s+[-•|]\s+(?:' + '|'.join(TITLE_KEYWORDS) + '))',
        ]

        for pattern in company_patterns:
            matches = re.findall(pattern, self.text)
            for match in matches:
                company = match.strip()
                # Filter out common false positives
                if (len(company) > 2 and len(company) < 50
                    and company.lower() not in TITLE_KEYWORDS):
                    self.companies.append(company)

        # Deduplicate
        seen = set()
        self.companies = [c for c in self.companies if not (c in seen or seen.add(c))]

    def _extract_education(self):
        """Extract education information."""
        # Look for degree keywords
        degree_patterns = [
            r'(?i)(bachelor|b\.s\.|bs|ba|b\.a\.)\s+(?:of\s+)?(?:science\s+)?(?:in\s+)?([A-Za-z\s]+)',
            r'(?i)(master|m\.s\.|ms|ma|m\.a\.|mba)\s+(?:of\s+)?(?:science\s+)?(?:in\s+)?([A-Za-z\s]+)',
            r'(?i)(phd|ph\.d\.|doctorate)\s+(?:in\s+)?([A-Za-z\s]+)',
        ]

        for pattern in degree_patterns:
            matches = re.findall(pattern, self.text)
            for match in matches:
                if isinstance(match, tuple):
                    degree = " ".join(match).strip()
                else:
                    degree = match.strip()

                if degree:
                    self.education.append(degree.title())

        # Deduplicate
        self.education = list(dict.fromkeys(self.education))

    def _extract_experience(self):
        """Estimate years of experience from dates."""
        # Look for date ranges (e.g., "2020 - 2023", "Jan 2020 - Present")
        date_patterns = [
            r'(19|20)\d{2}\s*[-–—]\s*(?:(19|20)\d{2}|present|current)',
        ]

        years = set()
        for pattern in date_patterns:
            matches = re.findall(pattern, self.text, re.IGNORECASE)
            for match in matches:
                start_year = int(match[0] + match[1][:2]) if match[0] else None
                if start_year:
                    years.add(start_year)

        if years:
            # Rough estimate: current year - earliest year
            import datetime
            current_year = datetime.datetime.now().year
            self.years_experience = current_year - min(years)

    def to_dict(self) -> Dict:
        """Convert extracted information to dictionary."""
        return {
            "skills": sorted(list(self.skills)),
            "titles": self.titles[:5],  # Top 5 most relevant
            "companies": self.companies[:10],  # Top 10
            "education": self.education,
            "years_experience": self.years_experience,
            "raw_text_length": len(self.text),
        }

    def to_user_prefs(
        self,
        existing_prefs: Optional[Dict] = None,
        salary_floor: Optional[int] = None,
    ) -> Dict:
        """
        Convert extracted info to user_prefs.json format.

        Args:
            existing_prefs: Existing preferences to merge with
            salary_floor: Override salary floor (calculated from experience if None)

        Returns:
            Dictionary in user_prefs.json format
        """
        # Start with existing prefs or defaults
        prefs = existing_prefs.copy() if existing_prefs else {
            "companies": [],
            "title_allowlist": [],
            "title_blocklist": [],
            "keywords_boost": [],
            "keywords_exclude": [],
            "location_constraints": ["Remote", "US", "United States"],
            "immediate_alert_threshold": 0.9,
            "digest_min_score": 0.7,
            "max_companies_per_run": 15,
            "fetch_descriptions": True,
            "use_llm": False,
            "llm_weight": 0.5,
        }

        # Add extracted titles to allowlist
        if self.titles:
            existing_titles = set(prefs.get("title_allowlist", []))
            for title in self.titles:
                # Skip if contains blocklist terms
                if not any(block in title.lower() for block in SENIORITY_BLOCKLIST):
                    existing_titles.add(title)
            prefs["title_allowlist"] = sorted(list(existing_titles))

        # Add common seniority blocklist
        prefs["title_blocklist"] = sorted(list(set(
            prefs.get("title_blocklist", []) +
            ["Intern", "Junior", "Manager", "Director", "VP", "Contract"]
        )))

        # Add extracted skills to boost keywords
        if self.skills:
            existing_keywords = set(prefs.get("keywords_boost", []))
            existing_keywords.update(self.skills)
            prefs["keywords_boost"] = sorted(list(existing_keywords))

        # Calculate salary floor from experience
        if salary_floor is None and self.years_experience:
            # Rough estimate: $50k base + $20k per year experience
            # Capped at reasonable ranges
            salary_floor = min(
                50000 + (self.years_experience * 20000),
                300000  # Cap at $300k
            )

        if salary_floor:
            prefs["salary_floor_usd"] = salary_floor

        return prefs


def parse_resume(file_path: str | Path) -> Dict:
    """
    Convenience function to parse a resume file.

    Args:
        file_path: Path to resume file (PDF or DOCX)

    Returns:
        Dictionary with extracted information
    """
    parser = ResumeParser()
    return parser.parse_file(file_path)


def check_dependencies() -> tuple[bool, List[str]]:
    """
    Check if required dependencies are installed.

    Returns:
        Tuple of (all_installed, missing_packages)
    """
    missing = []

    if not HAS_PDF:
        missing.append("pdfplumber")

    if not HAS_DOCX:
        missing.append("python-docx")

    return (len(missing) == 0, missing)
